import { Router } from "express";
import { db } from "../db";
import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import {
  customerWallets,
  walletTransactions,
  walletTopupRequests,
  cashbackRules,
  orders,
  users,
  insertCustomerWalletSchema,
  insertWalletTransactionSchema,
  insertWalletTopupRequestSchema,
  WALLET_TRANSACTION_TYPES,
  WALLET_REFERENCE_TYPES,
  WALLET_TRANSACTION_STATUSES
} from "@shared/schema";
import { nexusPayService, NEXUSPAY_CODES } from "../services/nexuspay";

const router = Router();

// ============= WALLET API ENDPOINTS =============

/**
 * GET /api/customer/wallet
 * Get wallet info for authenticated user
 */
router.get("/customer/wallet", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      return res.json({
        wallet: null,
        hasWallet: false,
        message: "Wallet not created yet"
      });
    }

    // Get recent transactions
    const recentTransactions = await db.select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(5);

    res.json({
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency,
        isActive: wallet.isActive,
        autoUseWallet: wallet.autoUseWallet,
        lowBalanceAlert: parseFloat(wallet.lowBalanceAlert || "100"),
        totalTopups: parseFloat(wallet.totalTopups || "0"),
        totalSpent: parseFloat(wallet.totalSpent || "0"),
        totalCashback: parseFloat(wallet.totalCashback || "0"),
        totalRefunds: parseFloat(wallet.totalRefunds || "0"),
        lastTopupAt: wallet.lastTopupAt,
        lastTransactionAt: wallet.lastTransactionAt,
        createdAt: wallet.createdAt
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        balanceBefore: parseFloat(t.balanceBefore),
        balanceAfter: parseFloat(t.balanceAfter),
        description: t.description,
        status: t.status,
        createdAt: t.createdAt
      })),
      hasWallet: true
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
});

/**
 * POST /api/customer/wallet/create
 * Create wallet for user (if not exists)
 */
router.post("/customer/wallet/create", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if wallet already exists
    const [existingWallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (existingWallet) {
      return res.json({
        message: "Wallet already exists",
        wallet: {
          id: existingWallet.id,
          balance: parseFloat(existingWallet.balance),
          currency: existingWallet.currency,
          isActive: existingWallet.isActive
        }
      });
    }

    // Create new wallet
    const [newWallet] = await db.insert(customerWallets)
      .values({
        customerId: req.user.id,
        balance: "0",
        currency: "PHP",
        isActive: true,
        autoUseWallet: true
      })
      .returning();

    res.status(201).json({
      message: "Wallet created successfully",
      wallet: {
        id: newWallet.id,
        balance: parseFloat(newWallet.balance),
        currency: newWallet.currency,
        isActive: newWallet.isActive
      }
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    res.status(500).json({ message: "Failed to create wallet" });
  }
});

/**
 * POST /api/customer/wallet/topup
 * Top up wallet - creates payment request
 */
router.post("/customer/wallet/topup", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { amount, paymentMethod } = req.body;

    // Validate amount
    const topupSchema = z.object({
      amount: z.number().min(50, "Minimum top-up amount is PHP 50").max(50000, "Maximum top-up amount is PHP 50,000"),
      paymentMethod: z.enum(['gcash', 'maya', 'card', 'bank']).default('gcash')
    });

    const validatedData = topupSchema.parse({ amount, paymentMethod });

    // Get or create wallet
    let [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      [wallet] = await db.insert(customerWallets)
        .values({
          customerId: req.user.id,
          balance: "0",
          currency: "PHP",
          isActive: true
        })
        .returning();
    }

    if (!wallet.isActive) {
      return res.status(400).json({ message: "Wallet is inactive. Please contact support." });
    }

    // Create pending transaction
    const [transaction] = await db.insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: WALLET_TRANSACTION_TYPES.TOPUP,
        amount: validatedData.amount.toString(),
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance, // Will be updated on completion
        referenceType: WALLET_REFERENCE_TYPES.TOPUP,
        description: `Wallet top-up via ${validatedData.paymentMethod}`,
        status: WALLET_TRANSACTION_STATUSES.PENDING,
        paymentProvider: 'nexuspay',
        paymentMethod: validatedData.paymentMethod
      })
      .returning();

    // Create topup request
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

    const [topupRequest] = await db.insert(walletTopupRequests)
      .values({
        walletId: wallet.id,
        transactionId: transaction.id,
        amount: validatedData.amount.toString(),
        currency: "PHP",
        paymentProvider: 'nexuspay',
        paymentMethod: validatedData.paymentMethod,
        status: 'pending',
        expiresAt
      })
      .returning();

    // Create payment with NexusPay
    try {
      // Map payment method to NexusPay codes
      const paymentMethodKey = validatedData.paymentMethod === 'gcash' ? 'GCASH' :
                               validatedData.paymentMethod === 'maya' ? 'MAYA' :
                               validatedData.paymentMethod === 'card' ? 'CREDIT_CARD' : 'BANK_TRANSFER';

      const webhookUrl = `${process.env.API_URL || ''}/api/customer/wallet/topup/callback`;
      const redirectUrl = `${process.env.FRONTEND_URL || ''}/wallet?topup=success`;

      const paymentResult = await nexusPayService.createCashInPayment(
        validatedData.amount,
        webhookUrl,
        redirectUrl,
        paymentMethodKey,
        {
          type: 'wallet_topup',
          walletId: wallet.id,
          transactionId: transaction.id,
          topupRequestId: topupRequest.id,
          userId: req.user.id,
          customerName: req.user.firstName ? `${req.user.firstName} ${req.user.lastName || ''}`.trim() : undefined,
          customerEmail: req.user.email
        }
      );

      // Update topup request with payment details
      await db.update(walletTopupRequests)
        .set({
          externalTransactionId: paymentResult.transactionId,
          paymentLink: paymentResult.link,
          status: 'processing'
        })
        .where(eq(walletTopupRequests.id, topupRequest.id));

      // Update transaction with external reference
      await db.update(walletTransactions)
        .set({
          externalTransactionId: paymentResult.transactionId
        })
        .where(eq(walletTransactions.id, transaction.id));

      res.json({
        success: true,
        message: "Top-up request created",
        topupRequest: {
          id: topupRequest.id,
          amount: validatedData.amount,
          paymentLink: paymentResult.link,
          expiresAt
        }
      });
    } catch (paymentError: any) {
      // Mark transaction as failed
      await db.update(walletTransactions)
        .set({
          status: WALLET_TRANSACTION_STATUSES.FAILED,
          failureReason: paymentError.message
        })
        .where(eq(walletTransactions.id, transaction.id));

      await db.update(walletTopupRequests)
        .set({
          status: 'failed',
          failureReason: paymentError.message
        })
        .where(eq(walletTopupRequests.id, topupRequest.id));

      throw paymentError;
    }
  } catch (error: any) {
    console.error("Error creating wallet top-up:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    res.status(500).json({ message: error.message || "Failed to create top-up request" });
  }
});

/**
 * POST /api/customer/wallet/topup/callback
 * Payment callback from payment gateway
 */
router.post("/customer/wallet/topup/callback", async (req, res) => {
  try {
    const { transactionId, status, referenceNumber, metadata } = req.body;

    console.log("Wallet topup callback received:", { transactionId, status, referenceNumber });

    // Find the topup request
    const [topupRequest] = await db.select()
      .from(walletTopupRequests)
      .where(eq(walletTopupRequests.externalTransactionId, transactionId));

    if (!topupRequest) {
      console.error("Topup request not found for transaction:", transactionId);
      return res.status(404).json({ message: "Topup request not found" });
    }

    // Check if already processed
    if (topupRequest.callbackReceived && topupRequest.status === 'completed') {
      return res.json({ message: "Already processed", success: true });
    }

    // Get wallet
    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.id, topupRequest.walletId));

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (status === 'success' || status === 'completed' || status === 'paid') {
      // Calculate new balance
      const currentBalance = parseFloat(wallet.balance);
      const topupAmount = parseFloat(topupRequest.amount);
      const newBalance = currentBalance + topupAmount;

      // Update wallet balance
      await db.update(customerWallets)
        .set({
          balance: newBalance.toString(),
          totalTopups: (parseFloat(wallet.totalTopups || "0") + topupAmount).toString(),
          lastTopupAt: new Date(),
          lastTransactionAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(customerWallets.id, wallet.id));

      // Update transaction
      await db.update(walletTransactions)
        .set({
          balanceAfter: newBalance.toString(),
          status: WALLET_TRANSACTION_STATUSES.COMPLETED,
          completedAt: new Date()
        })
        .where(eq(walletTransactions.id, topupRequest.transactionId!));

      // Update topup request
      await db.update(walletTopupRequests)
        .set({
          status: 'completed',
          callbackReceived: true,
          callbackData: req.body,
          completedAt: new Date()
        })
        .where(eq(walletTopupRequests.id, topupRequest.id));

      console.log(`Wallet ${wallet.id} credited with ${topupAmount} PHP. New balance: ${newBalance}`);
    } else {
      // Payment failed
      await db.update(walletTransactions)
        .set({
          status: WALLET_TRANSACTION_STATUSES.FAILED,
          failureReason: `Payment ${status}`
        })
        .where(eq(walletTransactions.id, topupRequest.transactionId!));

      await db.update(walletTopupRequests)
        .set({
          status: 'failed',
          callbackReceived: true,
          callbackData: req.body,
          failureReason: `Payment ${status}`
        })
        .where(eq(walletTopupRequests.id, topupRequest.id));
    }

    res.json({ success: true, message: "Callback processed" });
  } catch (error) {
    console.error("Error processing wallet topup callback:", error);
    res.status(500).json({ message: "Failed to process callback" });
  }
});

/**
 * GET /api/customer/wallet/transactions
 * Transaction history with filters
 */
router.get("/customer/wallet/transactions", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    // Get wallet
    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      return res.json({
        transactions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Build query conditions
    const conditions = [eq(walletTransactions.walletId, wallet.id)];

    if (type && type !== 'all') {
      conditions.push(eq(walletTransactions.type, type as string));
    }

    if (startDate) {
      conditions.push(gte(walletTransactions.createdAt, new Date(startDate as string)));
    }

    if (endDate) {
      conditions.push(lte(walletTransactions.createdAt, new Date(endDate as string)));
    }

    // Count total
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
      .from(walletTransactions)
      .where(and(...conditions));

    const total = count || 0;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get transactions
    const transactions = await db.select()
      .from(walletTransactions)
      .where(and(...conditions))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        balanceBefore: parseFloat(t.balanceBefore),
        balanceAfter: parseFloat(t.balanceAfter),
        referenceId: t.referenceId,
        referenceType: t.referenceType,
        description: t.description,
        status: t.status,
        paymentMethod: t.paymentMethod,
        createdAt: t.createdAt,
        completedAt: t.completedAt
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

/**
 * POST /api/customer/wallet/pay
 * Pay with wallet (internal use for orders)
 */
router.post("/customer/wallet/pay", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { amount, orderId, description } = req.body;

    // Validate
    const paymentSchema = z.object({
      amount: z.number().positive("Amount must be positive"),
      orderId: z.string().uuid("Invalid order ID"),
      description: z.string().optional()
    });

    const validatedData = paymentSchema.parse({ amount, orderId, description });

    // Get wallet
    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet not found. Please create a wallet first."
      });
    }

    if (!wallet.isActive) {
      return res.status(400).json({
        success: false,
        message: "Wallet is inactive"
      });
    }

    const currentBalance = parseFloat(wallet.balance);
    if (currentBalance < validatedData.amount) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
        balance: currentBalance,
        required: validatedData.amount
      });
    }

    // Calculate new balance
    const newBalance = currentBalance - validatedData.amount;

    // Create transaction
    const [transaction] = await db.insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: WALLET_TRANSACTION_TYPES.PAYMENT,
        amount: validatedData.amount.toString(),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance.toString(),
        referenceId: validatedData.orderId,
        referenceType: WALLET_REFERENCE_TYPES.ORDER,
        description: validatedData.description || `Payment for order`,
        status: WALLET_TRANSACTION_STATUSES.COMPLETED,
        completedAt: new Date()
      })
      .returning();

    // Update wallet balance
    await db.update(customerWallets)
      .set({
        balance: newBalance.toString(),
        totalSpent: (parseFloat(wallet.totalSpent || "0") + validatedData.amount).toString(),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    res.json({
      success: true,
      message: "Payment successful",
      transaction: {
        id: transaction.id,
        amount: validatedData.amount,
        remainingBalance: newBalance
      }
    });
  } catch (error: any) {
    console.error("Error processing wallet payment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to process payment"
    });
  }
});

/**
 * POST /api/customer/wallet/refund
 * Refund to wallet (internal use)
 */
router.post("/customer/wallet/refund", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { amount, orderId, description } = req.body;

    // Validate
    const refundSchema = z.object({
      amount: z.number().positive("Amount must be positive"),
      orderId: z.string().uuid("Invalid order ID"),
      description: z.string().optional()
    });

    const validatedData = refundSchema.parse({ amount, orderId, description });

    // Get or create wallet
    let [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      [wallet] = await db.insert(customerWallets)
        .values({
          customerId: req.user.id,
          balance: "0",
          currency: "PHP",
          isActive: true
        })
        .returning();
    }

    // Calculate new balance
    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + validatedData.amount;

    // Create transaction
    const [transaction] = await db.insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: WALLET_TRANSACTION_TYPES.REFUND,
        amount: validatedData.amount.toString(),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance.toString(),
        referenceId: validatedData.orderId,
        referenceType: WALLET_REFERENCE_TYPES.REFUND,
        description: validatedData.description || `Refund for order`,
        status: WALLET_TRANSACTION_STATUSES.COMPLETED,
        completedAt: new Date()
      })
      .returning();

    // Update wallet balance
    await db.update(customerWallets)
      .set({
        balance: newBalance.toString(),
        totalRefunds: (parseFloat(wallet.totalRefunds || "0") + validatedData.amount).toString(),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    res.json({
      success: true,
      message: "Refund credited to wallet",
      transaction: {
        id: transaction.id,
        amount: validatedData.amount,
        newBalance: newBalance
      }
    });
  } catch (error: any) {
    console.error("Error processing wallet refund:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: error.errors
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to process refund"
    });
  }
});

/**
 * PUT /api/customer/wallet/settings
 * Update wallet settings
 */
router.put("/customer/wallet/settings", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { autoUseWallet, lowBalanceAlert } = req.body;

    const settingsSchema = z.object({
      autoUseWallet: z.boolean().optional(),
      lowBalanceAlert: z.number().min(0).max(10000).optional()
    });

    const validatedData = settingsSchema.parse({ autoUseWallet, lowBalanceAlert });

    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const updateData: any = { updatedAt: new Date() };
    if (validatedData.autoUseWallet !== undefined) {
      updateData.autoUseWallet = validatedData.autoUseWallet;
    }
    if (validatedData.lowBalanceAlert !== undefined) {
      updateData.lowBalanceAlert = validatedData.lowBalanceAlert.toString();
    }

    await db.update(customerWallets)
      .set(updateData)
      .where(eq(customerWallets.id, wallet.id));

    res.json({
      success: true,
      message: "Wallet settings updated"
    });
  } catch (error: any) {
    console.error("Error updating wallet settings:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Failed to update settings" });
  }
});

/**
 * GET /api/customer/wallet/summary
 * Get monthly wallet summary
 */
router.get("/customer/wallet/summary", async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, req.user.id));

    if (!wallet) {
      return res.json({
        hasWallet: false,
        summary: null
      });
    }

    // Get current month's transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await db.select()
      .from(walletTransactions)
      .where(and(
        eq(walletTransactions.walletId, wallet.id),
        gte(walletTransactions.createdAt, startOfMonth),
        eq(walletTransactions.status, 'completed')
      ));

    // Calculate summaries by type
    const summary = {
      totalTopups: 0,
      totalPayments: 0,
      totalRefunds: 0,
      totalCashback: 0,
      transactionCount: transactions.length
    };

    transactions.forEach(t => {
      const amount = parseFloat(t.amount);
      switch (t.type) {
        case 'topup':
          summary.totalTopups += amount;
          break;
        case 'payment':
          summary.totalPayments += amount;
          break;
        case 'refund':
          summary.totalRefunds += amount;
          break;
        case 'cashback':
          summary.totalCashback += amount;
          break;
      }
    });

    res.json({
      hasWallet: true,
      currentBalance: parseFloat(wallet.balance),
      summary,
      month: startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
    });
  } catch (error) {
    console.error("Error fetching wallet summary:", error);
    res.status(500).json({ message: "Failed to fetch summary" });
  }
});

// ============= ADMIN WALLET ENDPOINTS =============

/**
 * POST /api/admin/wallet/:userId/adjust
 * Admin adjustment - add/deduct for corrections
 */
router.post("/admin/wallet/:userId/adjust", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { userId } = req.params;
    const { amount, type, reason } = req.body;

    // Validate
    const adjustmentSchema = z.object({
      amount: z.number().positive("Amount must be positive"),
      type: z.enum(['credit', 'debit']),
      reason: z.string().min(10, "Reason must be at least 10 characters")
    });

    const validatedData = adjustmentSchema.parse({ amount, type, reason });

    // Get user's wallet
    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, userId));

    if (!wallet) {
      return res.status(404).json({ message: "User wallet not found" });
    }

    const currentBalance = parseFloat(wallet.balance);
    let newBalance: number;

    if (validatedData.type === 'credit') {
      newBalance = currentBalance + validatedData.amount;
    } else {
      if (currentBalance < validatedData.amount) {
        return res.status(400).json({
          message: "Insufficient balance for debit adjustment",
          currentBalance
        });
      }
      newBalance = currentBalance - validatedData.amount;
    }

    // Create adjustment transaction
    const [transaction] = await db.insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: WALLET_TRANSACTION_TYPES.ADJUSTMENT,
        amount: validatedData.amount.toString(),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance.toString(),
        referenceType: WALLET_REFERENCE_TYPES.ADMIN,
        description: `Admin ${validatedData.type}: ${validatedData.reason}`,
        status: WALLET_TRANSACTION_STATUSES.COMPLETED,
        adjustedBy: req.user.id,
        adjustmentReason: validatedData.reason,
        completedAt: new Date()
      })
      .returning();

    // Update wallet balance
    await db.update(customerWallets)
      .set({
        balance: newBalance.toString(),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    // Log the admin action (if audit logging is available)
    console.log(`Admin wallet adjustment: User ${userId}, ${validatedData.type} ${validatedData.amount} PHP, by admin ${req.user.id}, reason: ${validatedData.reason}`);

    res.json({
      success: true,
      message: `Wallet ${validatedData.type} adjustment successful`,
      transaction: {
        id: transaction.id,
        type: validatedData.type,
        amount: validatedData.amount,
        previousBalance: currentBalance,
        newBalance: newBalance,
        reason: validatedData.reason
      }
    });
  } catch (error: any) {
    console.error("Error processing admin wallet adjustment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.errors
      });
    }
    res.status(500).json({ message: "Failed to process adjustment" });
  }
});

/**
 * GET /api/admin/wallet/:userId
 * Admin view user's wallet
 */
router.get("/admin/wallet/:userId", async (req: any, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { userId } = req.params;

    // Get user
    const [user] = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName
    })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get wallet
    const [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, userId));

    if (!wallet) {
      return res.json({
        user,
        wallet: null,
        hasWallet: false
      });
    }

    // Get recent transactions
    const recentTransactions = await db.select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    res.json({
      user,
      wallet: {
        id: wallet.id,
        balance: parseFloat(wallet.balance),
        currency: wallet.currency,
        isActive: wallet.isActive,
        totalTopups: parseFloat(wallet.totalTopups || "0"),
        totalSpent: parseFloat(wallet.totalSpent || "0"),
        totalCashback: parseFloat(wallet.totalCashback || "0"),
        totalRefunds: parseFloat(wallet.totalRefunds || "0"),
        createdAt: wallet.createdAt,
        lastTransactionAt: wallet.lastTransactionAt
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: parseFloat(t.amount),
        description: t.description,
        status: t.status,
        adjustedBy: t.adjustedBy,
        adjustmentReason: t.adjustmentReason,
        createdAt: t.createdAt
      })),
      hasWallet: true
    });
  } catch (error) {
    console.error("Error fetching user wallet:", error);
    res.status(500).json({ message: "Failed to fetch user wallet" });
  }
});

// ============= CASHBACK SERVICE =============

/**
 * Calculate and credit cashback for an order
 * This should be called when an order is completed
 */
export async function processCashback(orderId: string, customerId: string, orderTotal: number, orderType: string) {
  try {
    // Get active cashback rules
    const now = new Date();
    const rules = await db.select()
      .from(cashbackRules)
      .where(and(
        eq(cashbackRules.isActive, true),
        lte(cashbackRules.validFrom, now)
      ))
      .orderBy(desc(cashbackRules.priority));

    // Find applicable rule
    let applicableRule = null;
    for (const rule of rules) {
      // Check validity
      if (rule.validUntil && new Date(rule.validUntil) < now) continue;

      // Check minimum order value
      if (rule.minimumOrderValue && orderTotal < parseFloat(rule.minimumOrderValue)) continue;

      // Check service types
      if (rule.serviceTypes) {
        const serviceTypes = rule.serviceTypes as string[];
        if (!serviceTypes.includes(orderType)) continue;
      }

      // Check budget
      if (rule.budgetLimit) {
        const currentSpend = parseFloat(rule.currentSpend || "0");
        if (currentSpend >= parseFloat(rule.budgetLimit)) continue;
      }

      // Check total usage
      if (rule.totalUsageLimit && (rule.currentUsageCount || 0) >= rule.totalUsageLimit) continue;

      applicableRule = rule;
      break;
    }

    if (!applicableRule) {
      return { cashbackAmount: 0, ruleId: null };
    }

    // Calculate cashback amount
    let cashbackAmount: number;
    if (applicableRule.cashbackType === 'percentage') {
      cashbackAmount = orderTotal * parseFloat(applicableRule.cashbackValue);
    } else {
      cashbackAmount = parseFloat(applicableRule.cashbackValue);
    }

    // Apply maximum cap
    if (applicableRule.maximumCashback) {
      cashbackAmount = Math.min(cashbackAmount, parseFloat(applicableRule.maximumCashback));
    }

    // Round to 2 decimal places
    cashbackAmount = Math.round(cashbackAmount * 100) / 100;

    if (cashbackAmount <= 0) {
      return { cashbackAmount: 0, ruleId: null };
    }

    // Get or create wallet
    let [wallet] = await db.select()
      .from(customerWallets)
      .where(eq(customerWallets.customerId, customerId));

    if (!wallet) {
      [wallet] = await db.insert(customerWallets)
        .values({
          customerId,
          balance: "0",
          currency: "PHP",
          isActive: true
        })
        .returning();
    }

    // Credit cashback
    const currentBalance = parseFloat(wallet.balance);
    const newBalance = currentBalance + cashbackAmount;

    await db.insert(walletTransactions)
      .values({
        walletId: wallet.id,
        type: WALLET_TRANSACTION_TYPES.CASHBACK,
        amount: cashbackAmount.toString(),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance.toString(),
        referenceId: orderId,
        referenceType: WALLET_REFERENCE_TYPES.ORDER,
        description: `Cashback for order - ${applicableRule.name}`,
        status: WALLET_TRANSACTION_STATUSES.COMPLETED,
        metadata: { ruleId: applicableRule.id, ruleName: applicableRule.name },
        completedAt: new Date()
      });

    await db.update(customerWallets)
      .set({
        balance: newBalance.toString(),
        totalCashback: (parseFloat(wallet.totalCashback || "0") + cashbackAmount).toString(),
        lastTransactionAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(customerWallets.id, wallet.id));

    // Update rule usage
    await db.update(cashbackRules)
      .set({
        currentUsageCount: (applicableRule.currentUsageCount || 0) + 1,
        currentSpend: (parseFloat(applicableRule.currentSpend || "0") + cashbackAmount).toString(),
        updatedAt: new Date()
      })
      .where(eq(cashbackRules.id, applicableRule.id));

    console.log(`Cashback credited: ${cashbackAmount} PHP to wallet ${wallet.id} for order ${orderId}`);

    return { cashbackAmount, ruleId: applicableRule.id };
  } catch (error) {
    console.error("Error processing cashback:", error);
    return { cashbackAmount: 0, ruleId: null, error };
  }
}

export default router;
