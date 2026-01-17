import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';
import { nexusPayService, NEXUSPAY_CODES, PAYOUT_PROVIDER_CODES } from '../services/nexuspay';

// JWT verification middleware (local to avoid circular imports)
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * NexusPay Routes for BTS Delivery App
 *
 * Endpoints for handling Philippine payment methods:
 * - Cash-in (receive payments via GCash, Maya, etc.)
 * - Cash-out (send payouts to riders/vendors)
 * - Status checking
 * - Admin management
 */

export function registerNexusPayRoutes(app: Express) {
  // ============================================================================
  // Status & Configuration
  // ============================================================================

  /**
   * Check NexusPay configuration status
   * GET /api/nexuspay/status
   */
  app.get('/api/nexuspay/status', authenticateToken, async (req: Request, res: Response) => {
    try {
      const status = await nexusPayService.getStatus();
      return res.json(status);
    } catch (error: any) {
      return res.json({
        configured: false,
        authenticated: false,
        message: `Error: ${error.message}`
      });
    }
  });

  /**
   * Get available payment methods
   * GET /api/nexuspay/methods
   */
  app.get('/api/nexuspay/methods', async (req: Request, res: Response) => {
    try {
      const methods = nexusPayService.getAvailablePaymentMethods();
      return res.json({
        success: true,
        methods,
        total: methods.length
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // ============================================================================
  // Cash-In (Receive Payments)
  // ============================================================================

  /**
   * Create cash-in payment request
   * POST /api/nexuspay/cashin
   *
   * Creates a payment link for customer to pay via GCash/Maya/etc
   */
  app.post('/api/nexuspay/cashin', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { amount, orderId, paymentMethod, metadata } = req.body;
      const user = (req as any).user;

      // NexusPay requires minimum ₱100 for cash-in
      if (!amount || parseFloat(amount) < 100) {
        return res.status(400).json({
          success: false,
          message: 'Minimum amount is ₱100'
        });
      }

      console.log(`[NexusPay] === Starting Cash-In Request for ₱${amount} ===`);

      // Build URLs
      const baseUrl = process.env.PUBLIC_APP_URL
        || (process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : null)
        || `https://${req.get('host')}`;

      const webhookUrl = `${baseUrl}/api/nexuspay/webhook`;
      const redirectUrl = orderId
        ? `${baseUrl}/order/${orderId}?status=payment_complete`
        : `${baseUrl}/payment-result?status=success`;

      console.log(`[NexusPay] Webhook URL: ${webhookUrl}`);
      console.log(`[NexusPay] Redirect URL: ${redirectUrl}`);

      // Determine payment method code
      let paymentMethodCode: string | undefined;
      if (paymentMethod && paymentMethod in NEXUSPAY_CODES) {
        paymentMethodCode = NEXUSPAY_CODES[paymentMethod as keyof typeof NEXUSPAY_CODES];
      }

      // Create payment with enhanced metadata
      const enhancedMetadata = {
        userId: user?.id,
        userEmail: user?.email,
        orderId,
        ...metadata
      };

      const paymentResult = await nexusPayService.createCashInPayment(
        parseFloat(amount),
        webhookUrl,
        redirectUrl,
        paymentMethodCode,
        enhancedMetadata
      );

      // If orderId provided, update the order
      if (orderId) {
        await storage.updateOrder(orderId, {
          paymentTransactionId: paymentResult.transactionId,
          paymentStatus: 'pending',
          paymentProvider: 'nexuspay'
        });
      }

      console.log(`[NexusPay] Cash-in created successfully: ${paymentResult.transactionId}`);

      return res.json({
        success: true,
        paymentUrl: paymentResult.link,
        transactionId: paymentResult.transactionId,
        qrphraw: paymentResult.qrphraw || null,
        amount: parseFloat(amount),
        message: 'Scan QR code with your GCash/Maya app to complete payment'
      });
    } catch (error: any) {
      console.error('[NexusPay] Cash-in error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Payment processing failed'
      });
    }
  });

  /**
   * Check cash-in transaction status
   * GET /api/nexuspay/cashin-status/:transactionId
   */
  app.get('/api/nexuspay/cashin-status/:transactionId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      console.log(`[NexusPay] Checking cash-in status for: ${transactionId}`);

      const status = await nexusPayService.getCashInStatus(transactionId);

      // If payment is successful, find and update the associated order
      if (status.success) {
        const orders = await storage.getOrders();
        const order = orders.find(o => o.paymentTransactionId === transactionId);

        if (order && order.paymentStatus !== 'paid') {
          await storage.updateOrder(order.id, {
            paymentStatus: 'paid',
            paidAt: new Date().toISOString()
          });
          console.log(`[NexusPay] Order ${order.id} marked as paid`);
        }
      }

      return res.json({
        success: status.success,
        status: status.status,
        referenceNumber: status.referenceNumber,
        amount: status.amount,
        message: status.message
      });
    } catch (error: any) {
      console.error('[NexusPay] Status check error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // ============================================================================
  // Cash-Out (Payouts to E-Wallets)
  // ============================================================================

  /**
   * Create cash-out (payout) to e-wallet
   * POST /api/nexuspay/cashout
   *
   * Sends money to rider's/vendor's GCash/Maya account
   */
  app.post('/api/nexuspay/cashout', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { amount, accountNumber, accountName, provider = 'gcash' } = req.body;
      const user = (req as any).user;
      const payoutAmount = parseFloat(amount);

      if (!amount || payoutAmount < 1) {
        return res.status(400).json({
          success: false,
          message: 'Minimum payout is ₱1'
        });
      }

      if (!accountNumber) {
        return res.status(400).json({
          success: false,
          message: 'Account number is required'
        });
      }

      console.log(`[NexusPay Payout] === Starting for user ${user?.id}: ₱${payoutAmount} to ${accountNumber} via ${provider} ===`);

      // Get provider code
      const xCode = PAYOUT_PROVIDER_CODES[provider.toLowerCase()] || PAYOUT_PROVIDER_CODES.gcash;

      // Create payout
      const result = await nexusPayService.createPayout(
        xCode,
        accountNumber,
        accountName || user?.fullName || 'BTS User',
        payoutAmount
      );

      if (result.status === 'success' || result.status === 'processing') {
        console.log(`[NexusPay Payout] SUCCESS: ${result.transactionId}`);

        return res.json({
          success: true,
          transactionId: result.transactionId,
          amount: payoutAmount,
          status: result.status,
          message: result.message || `₱${payoutAmount.toFixed(2)} sent to your ${provider.toUpperCase()} account!`
        });
      }

      throw new Error(result.message || 'Payout failed');
    } catch (error: any) {
      console.error('[NexusPay Payout] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Payout processing failed'
      });
    }
  });

  /**
   * Check payout status
   * GET /api/nexuspay/payout-status/:transactionId
   */
  app.get('/api/nexuspay/payout-status/:transactionId', authenticateToken, async (req: Request, res: Response) => {
    try {
      const { transactionId } = req.params;
      console.log(`[NexusPay] Checking payout status for: ${transactionId}`);

      const status = await nexusPayService.getPayoutStatus(transactionId);

      return res.json({
        success: status.success,
        transactionId: status.transactionId,
        gateway: status.gateway,
        message: status.message
      });
    } catch (error: any) {
      console.error('[NexusPay] Payout status error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  // ============================================================================
  // Webhook Handling
  // ============================================================================

  /**
   * NexusPay Webhook Endpoint
   * POST /api/nexuspay/webhook
   *
   * Handles payment confirmations from NexusPay
   */
  app.post('/api/nexuspay/webhook', async (req: Request, res: Response) => {
    try {
      console.log('[NexusPay] Webhook received:', JSON.stringify(req.body));
      console.log('[NexusPay] Webhook headers:', JSON.stringify(req.headers));

      // Parse webhook payload using the service
      const parsed = nexusPayService.parseWebhookPayload(req.body);

      // Verify signature if secret is configured
      const webhookSignature = req.headers['x-nexuspay-signature'] as string;
      const webhookSecret = process.env.NEXUSPAY_WEBHOOK_SECRET;

      if (webhookSignature && webhookSecret) {
        const isValid = nexusPayService.verifyWebhookSignature(
          JSON.stringify(req.body),
          webhookSignature,
          webhookSecret
        );

        if (!isValid) {
          console.error('[NexusPay] Invalid webhook signature');
          return res.status(400).json({ error: 'Invalid signature' });
        }
      }

      // Only process successful payments
      if (parsed.isSuccessful && parsed.transactionId) {
        console.log(`[NexusPay] Payment confirmed: ${parsed.transactionId} for ₱${parsed.amount}`);

        // Find and update the associated order
        const orders = await storage.getOrders();
        const order = orders.find(o => o.paymentTransactionId === parsed.transactionId);

        if (order) {
          // Check if already processed
          if (order.paymentStatus === 'paid') {
            console.log(`[NexusPay] Order ${order.id} already paid`);
            return res.json({ received: true, status: 'ok', note: 'already processed' });
          }

          // Update order payment status
          await storage.updateOrder(order.id, {
            paymentStatus: 'paid',
            paidAt: new Date().toISOString()
          });

          console.log(`[NexusPay] Order ${order.id} marked as paid via webhook`);
        } else {
          console.log(`[NexusPay] No order found for transaction ${parsed.transactionId}`);
        }
      } else {
        console.log(`[NexusPay] Webhook status: ${parsed.status}, txId: ${parsed.transactionId}, amount: ${parsed.amount}`);
      }

      return res.json({ received: true, status: 'ok' });
    } catch (error) {
      console.error('[NexusPay] Webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ============================================================================
  // Admin Endpoints
  // ============================================================================

  /**
   * Get NexusPay merchant wallet balance (Admin only)
   * GET /api/admin/nexuspay/balance
   */
  app.get('/api/admin/nexuspay/balance', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const balanceResult = await nexusPayService.getMerchantBalance();

      if (balanceResult.success) {
        return res.json({
          success: true,
          walletBalance: balanceResult.walletBalance,
          walletBalanceFormatted: balanceResult.walletBalanceFormatted,
          message: 'Balance retrieved successfully'
        });
      }

      return res.json({
        success: false,
        message: balanceResult.message
      });
    } catch (error: any) {
      console.error('[NexusPay] Balance check error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check balance'
      });
    }
  });

  /**
   * Process batch payouts for riders/vendors (Admin only)
   * POST /api/admin/nexuspay/batch-payout
   */
  app.post('/api/admin/nexuspay/batch-payout', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const { payouts } = req.body;

      if (!payouts || !Array.isArray(payouts) || payouts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Payouts array is required'
        });
      }

      console.log(`[NexusPay Admin] Processing batch payout of ${payouts.length} items`);

      const results = await nexusPayService.processBatchPayouts(payouts);

      const successCount = results.filter(r => r.status === 'success' || r.status === 'processing').length;

      return res.json({
        success: true,
        message: `Processed ${successCount}/${payouts.length} payouts`,
        processed: successCount,
        total: payouts.length,
        results
      });
    } catch (error: any) {
      console.error('[NexusPay Admin] Batch payout error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Get pending orders with unpaid payments (Admin only)
   * GET /api/admin/nexuspay/pending-payments
   */
  app.get('/api/admin/nexuspay/pending-payments', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const orders = await storage.getOrders();
      const pendingOrders = orders.filter(o =>
        o.paymentProvider === 'nexuspay' &&
        o.paymentStatus === 'pending' &&
        o.paymentTransactionId
      );

      return res.json({
        success: true,
        pendingOrders: pendingOrders.map(o => ({
          id: o.id,
          transactionId: o.paymentTransactionId,
          amount: o.totalAmount,
          createdAt: o.createdAt,
          status: o.paymentStatus
        })),
        total: pendingOrders.length
      });
    } catch (error: any) {
      console.error('[NexusPay Admin] Error getting pending payments:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Manually check and update payment status (Admin only)
   * POST /api/admin/nexuspay/check-payment/:transactionId
   */
  app.post('/api/admin/nexuspay/check-payment/:transactionId', authenticateToken, async (req: Request, res: Response) => {
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    try {
      const { transactionId } = req.params;
      console.log(`[NexusPay Admin] Manually checking payment: ${transactionId}`);

      // Get status from NexusPay
      const status = await nexusPayService.getCashInStatus(transactionId);

      // Find the order
      const orders = await storage.getOrders();
      const order = orders.find(o => o.paymentTransactionId === transactionId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found for this transaction'
        });
      }

      // Update order if payment was successful
      if (status.success && order.paymentStatus !== 'paid') {
        await storage.updateOrder(order.id, {
          paymentStatus: 'paid',
          paidAt: new Date().toISOString()
        });

        console.log(`[NexusPay Admin] Manually marked order ${order.id} as paid`);

        return res.json({
          success: true,
          message: 'Payment verified and order updated',
          orderId: order.id,
          paymentStatus: 'paid'
        });
      }

      return res.json({
        success: status.success,
        message: status.success ? 'Payment already processed' : 'Payment not yet confirmed',
        orderId: order.id,
        paymentStatus: order.paymentStatus,
        nexusPayStatus: status.status
      });
    } catch (error: any) {
      console.error('[NexusPay Admin] Manual check error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  });

  console.log('[NexusPay] Routes registered successfully');
}
