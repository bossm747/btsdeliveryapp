// ============================================================
// ORDER REFUND WORKFLOW ENDPOINTS
// This file contains the refund workflow endpoints to be integrated into routes.ts
// ============================================================

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { storage } from "./storage";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  refunds,
  payments,
  orders,
  users,
  orderStatusHistory,
  type Refund,
  type InsertRefund
} from "@shared/schema";

// Refund calculation constants based on order status
export const REFUND_PERCENTAGES = {
  pending: 100,       // Before vendor accepts -> 100% refund
  confirmed: 80,      // After vendor accepts -> 80% refund
  preparing: 80,      // After vendor accepts -> 80% refund
  ready: 50,          // After pickup-ready -> 50% refund
  picked_up: 50,      // After pickup -> 50% refund
  in_transit: 0,      // After delivery started -> Dispute required
  delivered: 0,       // After delivery -> Dispute required
  completed: 0,       // After completion -> Dispute required
  cancelled: 0        // Already cancelled
} as const;

// Zod schema for order cancellation
export const cancelOrderSchema = z.object({
  reason: z.string().min(1, "Cancellation reason is required").max(500),
  requestRefund: z.boolean().default(true)
});

// Zod schema for admin refund processing
export const processRefundSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().optional(),
  adjustedAmount: z.number().positive().optional()
});

// Type for the refund percentage keys
export type RefundStatus = keyof typeof REFUND_PERCENTAGES;

// Cancellation stages for tracking
export const CANCELLATION_STAGES = {
  BEFORE_VENDOR_ACCEPT: 'before_vendor_accept',   // pending status
  AFTER_VENDOR_ACCEPT: 'after_vendor_accept',     // confirmed, preparing
  AFTER_PICKUP: 'after_pickup',                   // ready, picked_up
  AFTER_DELIVERY: 'after_delivery'                // in_transit, delivered, completed
} as const;

/**
 * Calculate refund amount based on order status
 */
export function calculateRefundAmount(totalAmount: number, status: string): { percentage: number; amount: number; stage: string } {
  const percentage = REFUND_PERCENTAGES[status as RefundStatus] ?? 0;
  const amount = (totalAmount * percentage) / 100;
  const stage = getCancellationStage(status);
  return { percentage, amount, stage };
}

/**
 * Get the cancellation stage based on order status
 */
export function getCancellationStage(status: string): string {
  switch (status) {
    case 'pending':
    case 'payment_pending':
      return CANCELLATION_STAGES.BEFORE_VENDOR_ACCEPT;
    case 'confirmed':
    case 'preparing':
      return CANCELLATION_STAGES.AFTER_VENDOR_ACCEPT;
    case 'ready':
    case 'picked_up':
      return CANCELLATION_STAGES.AFTER_PICKUP;
    case 'in_transit':
    case 'delivered':
    case 'completed':
      return CANCELLATION_STAGES.AFTER_DELIVERY;
    default:
      return 'unknown';
  }
}

/**
 * Get human-readable refund status message
 */
export function getRefundStatusMessage(status: string): string {
  switch (status) {
    case 'pending':
      return 'Your refund request is being reviewed';
    case 'processing':
      return 'Your refund is being processed';
    case 'completed':
      return 'Refund has been completed and credited to your account';
    case 'failed':
      return 'Refund could not be processed. Please contact support.';
    case 'rejected':
      return 'Refund request was not approved. Please contact support for more details.';
    default:
      return 'Unknown status';
  }
}

/**
 * Build a timeline of refund events
 */
export function buildRefundTimeline(refund: any): Array<{ event: string; timestamp: Date | null; details?: string }> {
  const timeline = [];
  
  timeline.push({
    event: 'Refund Requested',
    timestamp: refund.createdAt,
    details: `Refund of PHP ${parseFloat(refund.amount).toFixed(2)} requested`
  });
  
  if (refund.approvedAt) {
    timeline.push({
      event: 'Refund Approved',
      timestamp: refund.approvedAt,
      details: 'Refund approved by administrator'
    });
  }
  
  if (refund.rejectedAt) {
    timeline.push({
      event: 'Refund Rejected',
      timestamp: refund.rejectedAt,
      details: refund.failureReason || 'Refund request was rejected'
    });
  }
  
  if (refund.processedAt) {
    timeline.push({
      event: refund.status === 'completed' ? 'Refund Completed' : 'Refund Processed',
      timestamp: refund.processedAt,
      details: refund.status === 'completed' 
        ? 'Refund has been credited to your account' 
        : 'Refund processing completed'
    });
  }
  
  return timeline.sort((a, b) => 
    new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );
}

/**
 * Check if order status requires dispute for refund
 */
export function requiresDispute(status: string): boolean {
  return ['in_transit', 'delivered', 'completed'].includes(status);
}

/**
 * Reusable handler for processing refunds (approve/reject)
 */
async function processRefundHandler(
  req: Request,
  res: Response,
  broadcastToSubscribers: (event: string, data: any) => void
) {
  try {
    const { id: refundId } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Validate request body
    const validationResult = processRefundSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: validationResult.error.errors
      });
    }

    const { action, notes, adjustedAmount } = validationResult.data;

    // Get the refund record
    const [refundRecord] = await db.select()
      .from(refunds)
      .where(eq(refunds.id, refundId));

    if (!refundRecord) {
      return res.status(404).json({ message: "Refund not found" });
    }

    // Check if refund is in a processable state
    if (refundRecord.status !== 'pending' && refundRecord.status !== 'processing') {
      return res.status(400).json({
        message: `Refund cannot be processed. Current status: ${refundRecord.status}`,
        currentStatus: refundRecord.status
      });
    }

    // Get associated order
    const order = await storage.getOrder(refundRecord.orderId);
    if (!order) {
      return res.status(404).json({ message: "Associated order not found" });
    }

    const finalAmount = adjustedAmount || parseFloat(refundRecord.amount);
    const now = new Date();

    if (action === 'approve') {
      // Process the refund approval
      const [updatedRefund] = await db.update(refunds)
        .set({
          status: 'completed',
          approvedBy: req.user.id,
          approvedAt: now,
          processedAt: now,
          amount: finalAmount.toString(),
          adminNotes: notes,
          metadata: {
            ...(refundRecord.metadata as object || {}),
            adminNotes: notes,
            originalAmount: refundRecord.amount,
            adjustedAmount: adjustedAmount ? finalAmount : null,
            processedBy: req.user.id,
            processedAt: now.toISOString()
          },
          updatedAt: now
        })
        .where(eq(refunds.id, refundId))
        .returning();

      // Update order payment status
      await storage.updateOrder(refundRecord.orderId, {
        paymentStatus: 'refunded'
      });

      // Update the associated payment record if it exists
      const [existingPayment] = await db.select()
        .from(payments)
        .where(eq(payments.orderId, refundRecord.orderId));

      if (existingPayment) {
        await db.update(payments)
          .set({
            status: 'refunded',
            refundedAt: now,
            refundAmount: finalAmount.toString(),
            updatedAt: now
          })
          .where(eq(payments.id, existingPayment.id));
      }

      // Record in order status history
      await db.insert(orderStatusHistory).values({
        orderId: refundRecord.orderId,
        fromStatus: 'cancelled',
        toStatus: 'cancelled',
        changedBy: req.user.id,
        changedByRole: 'admin',
        reason: 'Refund approved and processed',
        notes: `Refund of PHP ${finalAmount.toFixed(2)} approved by admin. ${notes || ''}`,
        metadata: {
          refundId,
          refundAmount: finalAmount,
          action: 'refund_approved'
        }
      });

      // Broadcast refund completion
      broadcastToSubscribers('refund_processed', {
        refundId,
        orderId: refundRecord.orderId,
        orderNumber: order.orderNumber,
        amount: finalAmount,
        status: 'completed',
        customerId: order.customerId
      });

      return res.json({
        success: true,
        message: "Refund approved and processed successfully",
        refund: {
          id: updatedRefund.id,
          orderId: updatedRefund.orderId,
          amount: finalAmount,
          status: updatedRefund.status,
          processedAt: updatedRefund.processedAt,
          approvedBy: updatedRefund.approvedBy
        }
      });
    } else if (action === 'reject') {
      // Process the refund rejection
      const [updatedRefund] = await db.update(refunds)
        .set({
          status: 'rejected',
          rejectedBy: req.user.id,
          rejectedAt: now,
          processedAt: now,
          failureReason: notes || 'Refund request rejected by administrator',
          adminNotes: notes,
          metadata: {
            ...(refundRecord.metadata as object || {}),
            rejectionReason: notes,
            rejectedBy: req.user.id,
            rejectedAt: now.toISOString()
          },
          updatedAt: now
        })
        .where(eq(refunds.id, refundId))
        .returning();

      // Update order payment status back to paid
      await storage.updateOrder(refundRecord.orderId, {
        paymentStatus: 'paid'
      });

      // Record in order status history
      await db.insert(orderStatusHistory).values({
        orderId: refundRecord.orderId,
        fromStatus: 'cancelled',
        toStatus: 'cancelled',
        changedBy: req.user.id,
        changedByRole: 'admin',
        reason: 'Refund rejected',
        notes: `Refund request rejected. Reason: ${notes || 'Not provided'}`,
        metadata: {
          refundId,
          requestedAmount: refundRecord.amount,
          action: 'refund_rejected'
        }
      });

      // Broadcast refund rejection
      broadcastToSubscribers('refund_rejected', {
        refundId,
        orderId: refundRecord.orderId,
        orderNumber: order.orderNumber,
        reason: notes || 'Refund request rejected',
        customerId: order.customerId
      });

      return res.json({
        success: true,
        message: "Refund request rejected",
        refund: {
          id: updatedRefund.id,
          orderId: updatedRefund.orderId,
          amount: refundRecord.amount,
          status: updatedRefund.status,
          processedAt: updatedRefund.processedAt,
          failureReason: updatedRefund.failureReason
        }
      });
    }
  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(500).json({ message: "Failed to process refund" });
  }
}

/**
 * Register refund workflow endpoints
 */
export function registerRefundEndpoints(
  app: Express,
  authenticateToken: any,
  requireAdmin: any,
  auditLog: (action: string, resource: string) => any,
  broadcastToSubscribers: (event: string, data: any) => void
) {
  /**
   * GET /api/orders/:id/refund-eligibility
   * Check refund amount and eligibility based on current order status
   */
  app.get("/api/orders/:id/refund-eligibility", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id: orderId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check authorization - only customer who placed the order or admin can check
      const isOwner = order.customerId === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }

      const totalAmount = parseFloat(order.totalAmount);
      const { percentage: refundPercentage, amount: refundAmount } = calculateRefundAmount(totalAmount, order.status);
      const isEligibleForRefund = refundPercentage > 0;
      const needsDispute = requiresDispute(order.status);
      const alreadyCancelled = order.status === 'cancelled';

      // Determine reason for refund eligibility status
      let eligibilityReason = '';
      if (alreadyCancelled) {
        eligibilityReason = 'Order has already been cancelled';
      } else if (needsDispute) {
        eligibilityReason = 'Order is in progress or completed. Please submit a dispute for refund consideration.';
      } else if (refundPercentage === 100) {
        eligibilityReason = 'Full refund available - order has not been accepted by vendor yet';
      } else if (refundPercentage === 80) {
        eligibilityReason = 'Partial refund (80%) - vendor has already started processing the order';
      } else if (refundPercentage === 50) {
        eligibilityReason = 'Partial refund (50%) - order is ready or has been picked up';
      }

      // Check if there's already a pending refund for this order
      const existingRefunds = await db.select()
        .from(refunds)
        .where(eq(refunds.orderId, orderId));

      const hasPendingRefund = existingRefunds.some(r => r.status === 'pending' || r.status === 'processing');
      const hasCompletedRefund = existingRefunds.some(r => r.status === 'completed');

      res.json({
        orderId,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        totalAmount,
        refundPercentage,
        refundAmount,
        isEligibleForRefund: isEligibleForRefund && !hasPendingRefund && !hasCompletedRefund && !alreadyCancelled,
        requiresDispute: needsDispute,
        alreadyCancelled,
        hasPendingRefund,
        hasCompletedRefund,
        eligibilityReason,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        // Breakdown of the refund calculation
        breakdown: {
          subtotal: order.subtotal,
          deliveryFee: order.deliveryFee,
          serviceFee: order.serviceFee,
          tax: order.tax,
          discount: order.discount,
          totalAmount: order.totalAmount,
          refundPercentage: `${refundPercentage}%`,
          calculatedRefund: refundAmount.toFixed(2)
        }
      });
    } catch (error) {
      console.error("Error checking refund eligibility:", error);
      res.status(500).json({ message: "Failed to check refund eligibility" });
    }
  });

  /**
   * POST /api/orders/:id/cancel
   * Customer cancellation with automatic refund calculation
   */
  app.post("/api/orders/:id/cancel", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id: orderId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Validate request body
      const validationResult = cancelOrderSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: validationResult.error.errors
        });
      }

      const { reason, requestRefund } = validationResult.data;

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Check authorization
      const isOwner = order.customerId === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isVendor = req.user.role === 'vendor';

      if (!isOwner && !isAdmin && !isVendor) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if order can be cancelled
      const nonCancellableStatuses = ['delivered', 'completed', 'cancelled'];
      if (nonCancellableStatuses.includes(order.status)) {
        return res.status(400).json({
          message: `Order cannot be cancelled. Current status: ${order.status}`,
          currentStatus: order.status,
          suggestion: order.status === 'cancelled'
            ? 'Order is already cancelled'
            : 'Please submit a dispute for orders that have been delivered or completed'
        });
      }

      // For orders in transit, only admins can cancel
      if (order.status === 'in_transit' && !isAdmin) {
        return res.status(400).json({
          message: "Orders in transit can only be cancelled by an administrator",
          currentStatus: order.status,
          suggestion: "Please contact customer support for assistance"
        });
      }

      // Calculate refund amount with cancellation stage
      const totalAmount = parseFloat(order.totalAmount);
      const { percentage: refundPercentage, amount: refundAmount, stage: cancellationStage } = calculateRefundAmount(totalAmount, order.status);

      // Cancel the order
      const cancelledOrder = await storage.cancelOrder(orderId, reason, req.user.id);

      if (!cancelledOrder) {
        return res.status(500).json({ message: "Failed to cancel order" });
      }

      // Process refund if requested and payment was made
      let refundResult: any = null;
      if (requestRefund && order.paymentStatus === 'paid' && refundAmount > 0) {
        try {
          // Check for existing payment record
          const [existingPayment] = await db.select()
            .from(payments)
            .where(eq(payments.orderId, orderId));

          // Create refund record with enhanced fields
          const [newRefund] = await db.insert(refunds).values({
            paymentId: existingPayment?.id,
            orderId: orderId,
            customerId: order.customerId,
            originalOrderAmount: totalAmount.toString(),
            amount: refundAmount.toString(),
            refundPercentage: refundPercentage.toString(),
            orderStatusAtCancellation: order.status,
            cancellationStage: cancellationStage,
            reason: 'customer_cancelled',
            description: `Order cancellation refund - ${refundPercentage}% of total. Reason: ${reason}`,
            status: 'pending',
            provider: order.paymentProvider || 'manual',
            initiatedBy: req.user.id,
            initiatedByRole: req.user.role,
            metadata: {
              orderNumber: order.orderNumber,
              originalAmount: totalAmount,
              refundPercentage,
              orderStatusAtCancellation: order.status,
              cancellationStage,
              cancelledBy: req.user.role,
              cancellationReason: reason,
              requestedAt: new Date().toISOString()
            }
          }).returning();

          // Update order with refund information
          await storage.updateOrder(orderId, {
            paymentStatus: 'refund_pending'
          });

          // Record in order status history
          await db.insert(orderStatusHistory).values({
            orderId: orderId,
            fromStatus: order.status,
            toStatus: 'cancelled',
            changedBy: req.user.id,
            changedByRole: req.user.role,
            reason: `Cancelled with refund request: ${reason}`,
            notes: `Refund amount: PHP ${refundAmount.toFixed(2)} (${refundPercentage}%)`,
            metadata: {
              refundId: newRefund.id,
              refundAmount,
              refundPercentage
            }
          });

          refundResult = {
            refundId: newRefund.id,
            amount: refundAmount,
            percentage: refundPercentage,
            status: 'pending',
            message: 'Refund request submitted for processing'
          };
        } catch (refundError) {
          console.error("Error creating refund record:", refundError);
          // Continue with cancellation even if refund record creation fails
          refundResult = {
            error: 'Failed to create refund record',
            message: 'Order was cancelled but refund processing encountered an error. Please contact support.'
          };
        }
      } else if (requestRefund && order.paymentStatus !== 'paid') {
        refundResult = {
          amount: 0,
          percentage: 0,
          status: 'not_applicable',
          message: 'No refund needed - payment was not completed'
        };
      } else if (requestRefund && refundAmount === 0) {
        refundResult = {
          amount: 0,
          percentage: 0,
          status: 'not_eligible',
          message: 'Order status does not qualify for automatic refund. Please submit a dispute if you believe this is incorrect.'
        };
      }

      // Broadcast order cancellation to relevant parties
      broadcastToSubscribers('order_cancelled', {
        orderId,
        orderNumber: order.orderNumber,
        reason,
        cancelledBy: req.user.role,
        refund: refundResult
      });

      res.json({
        success: true,
        message: "Order cancelled successfully",
        order: {
          id: cancelledOrder.id,
          orderNumber: cancelledOrder.orderNumber,
          status: cancelledOrder.status,
          previousStatus: order.status
        },
        refund: refundResult
      });
    } catch (error) {
      console.error("Error cancelling order:", error);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  /**
   * POST /api/admin/refunds/:id/process
   * Admin processes (approves/rejects) a pending refund
   */
  app.post("/api/admin/refunds/:id/process", authenticateToken, requireAdmin, auditLog('process_refund', 'refunds'), async (req: Request, res: Response) => {
    return processRefundHandler(req, res, broadcastToSubscribers);
  });

  /**
   * GET /api/admin/refunds
   * Admin endpoint to list all refunds with filtering
   */
  app.get("/api/admin/refunds", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { status, orderId, customerId, page = '1', limit = '20' } = req.query;

      let query = db.select({
        refund: refunds,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          status: orders.status
        }
      })
        .from(refunds)
        .leftJoin(orders, eq(refunds.orderId, orders.id))
        .orderBy(desc(refunds.createdAt));

      // Apply filters
      const conditions = [];
      if (status && typeof status === 'string') {
        conditions.push(eq(refunds.status, status));
      }
      if (orderId && typeof orderId === 'string') {
        conditions.push(eq(refunds.orderId, orderId));
      }
      if (customerId && typeof customerId === 'string') {
        conditions.push(eq(refunds.customerId, customerId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const results = await query.limit(limitNum).offset(offset);

      // Get total count for pagination
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(refunds);

      res.json({
        refunds: results.map(r => ({
          ...r.refund,
          order: r.order
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limitNum)
        }
      });
    } catch (error) {
      console.error("Error fetching refunds:", error);
      res.status(500).json({ message: "Failed to fetch refunds" });
    }
  });

  /**
   * GET /api/customer/refunds
   * Customer endpoint to list their own refunds
   */
  app.get("/api/customer/refunds", authenticateToken, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { status, page = '1', limit = '20' } = req.query;

      let query = db.select({
        refund: refunds,
        order: {
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          status: orders.status,
          items: orders.items,
          createdAt: orders.createdAt
        }
      })
        .from(refunds)
        .leftJoin(orders, eq(refunds.orderId, orders.id))
        .where(eq(refunds.customerId, req.user.id))
        .orderBy(desc(refunds.createdAt));

      // Apply status filter if provided
      if (status && typeof status === 'string') {
        query = db.select({
          refund: refunds,
          order: {
            id: orders.id,
            orderNumber: orders.orderNumber,
            totalAmount: orders.totalAmount,
            status: orders.status,
            items: orders.items,
            createdAt: orders.createdAt
          }
        })
          .from(refunds)
          .leftJoin(orders, eq(refunds.orderId, orders.id))
          .where(and(
            eq(refunds.customerId, req.user.id),
            eq(refunds.status, status)
          ))
          .orderBy(desc(refunds.createdAt)) as typeof query;
      }

      // Pagination
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const results = await query.limit(limitNum).offset(offset);

      // Get total count for pagination
      const [{ count }] = await db.select({ count: sql<number>`count(*)` })
        .from(refunds)
        .where(eq(refunds.customerId, req.user.id));

      // Format response with status messages
      const formattedRefunds = results.map(r => ({
        id: r.refund.id,
        orderId: r.refund.orderId,
        orderNumber: r.order?.orderNumber,
        amount: parseFloat(r.refund.amount),
        refundPercentage: r.refund.refundPercentage ? parseFloat(r.refund.refundPercentage) : null,
        originalOrderAmount: r.refund.originalOrderAmount ? parseFloat(r.refund.originalOrderAmount) : null,
        reason: r.refund.reason,
        description: r.refund.description,
        status: r.refund.status,
        statusMessage: getRefundStatusMessage(r.refund.status),
        orderStatusAtCancellation: r.refund.orderStatusAtCancellation,
        cancellationStage: r.refund.cancellationStage,
        processedAt: r.refund.processedAt,
        createdAt: r.refund.createdAt,
        order: r.order ? {
          id: r.order.id,
          orderNumber: r.order.orderNumber,
          totalAmount: parseFloat(r.order.totalAmount),
          status: r.order.status,
          itemCount: Array.isArray(r.order.items) ? r.order.items.length : 0,
          createdAt: r.order.createdAt
        } : null
      }));

      res.json({
        refunds: formattedRefunds,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: Number(count),
          totalPages: Math.ceil(Number(count) / limitNum)
        },
        summary: {
          totalRefunds: Number(count),
          pendingCount: results.filter(r => r.refund.status === 'pending').length,
          completedCount: results.filter(r => r.refund.status === 'completed').length,
          totalRefundedAmount: results
            .filter(r => r.refund.status === 'completed')
            .reduce((sum, r) => sum + parseFloat(r.refund.amount), 0)
        }
      });
    } catch (error) {
      console.error("Error fetching customer refunds:", error);
      res.status(500).json({ message: "Failed to fetch refunds" });
    }
  });

  /**
   * GET /api/customer/refunds/:id
   * Customer endpoint to get details of a specific refund
   */
  app.get("/api/customer/refunds/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { id: refundId } = req.params;

      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const [result] = await db.select({
        refund: refunds,
        order: orders
      })
        .from(refunds)
        .leftJoin(orders, eq(refunds.orderId, orders.id))
        .where(and(
          eq(refunds.id, refundId),
          eq(refunds.customerId, req.user.id)
        ));

      if (!result) {
        return res.status(404).json({ message: "Refund not found" });
      }

      res.json({
        id: result.refund.id,
        orderId: result.refund.orderId,
        orderNumber: result.order?.orderNumber,
        amount: parseFloat(result.refund.amount),
        refundPercentage: result.refund.refundPercentage ? parseFloat(result.refund.refundPercentage) : null,
        originalOrderAmount: result.refund.originalOrderAmount ? parseFloat(result.refund.originalOrderAmount) : null,
        reason: result.refund.reason,
        description: result.refund.description,
        status: result.refund.status,
        statusMessage: getRefundStatusMessage(result.refund.status),
        orderStatusAtCancellation: result.refund.orderStatusAtCancellation,
        cancellationStage: result.refund.cancellationStage,
        processedAt: result.refund.processedAt,
        failureReason: result.refund.failureReason,
        createdAt: result.refund.createdAt,
        updatedAt: result.refund.updatedAt,
        order: result.order ? {
          id: result.order.id,
          orderNumber: result.order.orderNumber,
          orderType: result.order.orderType,
          totalAmount: parseFloat(result.order.totalAmount),
          subtotal: parseFloat(result.order.subtotal),
          deliveryFee: parseFloat(result.order.deliveryFee),
          status: result.order.status,
          paymentMethod: result.order.paymentMethod,
          paymentStatus: result.order.paymentStatus,
          createdAt: result.order.createdAt
        } : null,
        timeline: buildRefundTimeline(result.refund)
      });
    } catch (error) {
      console.error("Error fetching refund details:", error);
      res.status(500).json({ message: "Failed to fetch refund details" });
    }
  });

  /**
   * PATCH /api/admin/refunds/:id/process
   * Admin processes (approves/rejects) a pending refund (PATCH version)
   */
  app.patch("/api/admin/refunds/:id/process", authenticateToken, requireAdmin, auditLog('process_refund', 'refunds'), async (req: Request, res: Response) => {
    // Reuse the POST handler logic
    return processRefundHandler(req, res, broadcastToSubscribers);
  });

  /**
   * GET /api/admin/refunds/:id
   * Admin endpoint to get detailed refund information
   */
  app.get("/api/admin/refunds/:id", authenticateToken, requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id: refundId } = req.params;

      const [result] = await db.select({
        refund: refunds,
        order: orders
      })
        .from(refunds)
        .leftJoin(orders, eq(refunds.orderId, orders.id))
        .where(eq(refunds.id, refundId));

      if (!result) {
        return res.status(404).json({ message: "Refund not found" });
      }

      // Get customer information
      const [customer] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone
      })
        .from(users)
        .where(eq(users.id, result.refund.customerId));

      // Get initiator information if available
      let initiator = null;
      if (result.refund.initiatedBy) {
        const [initiatorUser] = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role
        })
          .from(users)
          .where(eq(users.id, result.refund.initiatedBy));
        initiator = initiatorUser;
      }

      // Get approver information if available
      let approver = null;
      if (result.refund.approvedBy) {
        const [approverUser] = await db.select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role
        })
          .from(users)
          .where(eq(users.id, result.refund.approvedBy));
        approver = approverUser;
      }

      res.json({
        ...result.refund,
        order: result.order,
        customer,
        initiator,
        approver
      });
    } catch (error) {
      console.error("Error fetching refund details:", error);
      res.status(500).json({ message: "Failed to fetch refund details" });
    }
  });
}
