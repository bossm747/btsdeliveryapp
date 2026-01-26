/**
 * Refund Service - Centralized refund calculation and processing logic
 * 
 * Refund Calculation Rules:
 * - Before vendor accepts (pending) → 100% refund
 * - After vendor accepts (confirmed, preparing) → 80% refund
 * - After pickup (ready, picked_up) → 50% refund
 * - After delivery started (in_transit, delivered, completed) → Dispute required (0%)
 */

import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  refunds,
  orders,
  payments,
  orderStatusHistory,
  type Order,
  type Refund
} from "@shared/schema";

// Refund percentage constants based on order status
export const REFUND_PERCENTAGES: Record<string, number> = {
  payment_pending: 100,   // Payment not yet made -> full refund
  pending: 100,           // Before vendor accepts -> 100% refund
  confirmed: 80,          // After vendor accepts -> 80% refund
  preparing: 80,          // After vendor accepts -> 80% refund
  ready: 50,              // After pickup-ready -> 50% refund
  picked_up: 50,          // After pickup -> 50% refund
  in_transit: 0,          // After delivery started -> Dispute required
  delivered: 0,           // After delivery -> Dispute required
  completed: 0,           // After completion -> Dispute required
  cancelled: 0            // Already cancelled
};

// Cancellation stages for tracking
export const CANCELLATION_STAGES = {
  BEFORE_VENDOR_ACCEPT: 'before_vendor_accept',   // pending status
  AFTER_VENDOR_ACCEPT: 'after_vendor_accept',     // confirmed, preparing
  AFTER_PICKUP: 'after_pickup',                   // ready, picked_up
  AFTER_DELIVERY: 'after_delivery'                // in_transit, delivered, completed
} as const;

// Refund status constants
export const REFUND_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REJECTED: 'rejected'
} as const;

// Refund reason constants
export const REFUND_REASONS = {
  CUSTOMER_CANCELLED: 'customer_cancelled',
  VENDOR_CANCELLED: 'vendor_cancelled',
  ADMIN_CANCELLED: 'admin_cancelled',
  PAYMENT_FAILED: 'payment_failed',
  ORDER_NOT_FULFILLED: 'order_not_fulfilled',
  QUALITY_ISSUE: 'quality_issue',
  DISPUTE_RESOLUTION: 'dispute_resolution',
  DUPLICATE_PAYMENT: 'duplicate_payment',
  FRAUDULENT: 'fraudulent',
  OTHER: 'other'
} as const;

export interface RefundCalculation {
  percentage: number;
  amount: number;
  stage: string;
  isEligible: boolean;
  requiresDispute: boolean;
}

export interface RefundEligibility {
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  totalAmount: number;
  refundPercentage: number;
  refundAmount: number;
  isEligibleForRefund: boolean;
  requiresDispute: boolean;
  alreadyCancelled: boolean;
  hasPendingRefund: boolean;
  hasCompletedRefund: boolean;
  eligibilityReason: string;
  paymentMethod: string;
  paymentStatus: string;
  breakdown: {
    subtotal: string;
    deliveryFee: string;
    serviceFee: string;
    tax: string;
    discount: string;
    totalAmount: string;
    refundPercentage: string;
    calculatedRefund: string;
  };
}

/**
 * Calculate refund amount based on order status
 */
export function calculateRefundAmount(totalAmount: number, status: string): RefundCalculation {
  const percentage = REFUND_PERCENTAGES[status] ?? 0;
  const amount = (totalAmount * percentage) / 100;
  const stage = getCancellationStage(status);
  const isEligible = percentage > 0;
  const requiresDispute = ['in_transit', 'delivered', 'completed'].includes(status);
  
  return { percentage, amount, stage, isEligible, requiresDispute };
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
 * Check if order status requires dispute for refund
 */
export function requiresDispute(status: string): boolean {
  return ['in_transit', 'delivered', 'completed'].includes(status);
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
 * Get eligibility reason based on order status and refund percentage
 */
export function getEligibilityReason(status: string, refundPercentage: number): string {
  if (status === 'cancelled') {
    return 'Order has already been cancelled';
  }
  
  if (requiresDispute(status)) {
    return 'Order is in progress or completed. Please submit a dispute for refund consideration.';
  }
  
  if (refundPercentage === 100) {
    return 'Full refund available - order has not been accepted by vendor yet';
  }
  
  if (refundPercentage === 80) {
    return 'Partial refund (80%) - vendor has already started processing the order';
  }
  
  if (refundPercentage === 50) {
    return 'Partial refund (50%) - order is ready or has been picked up';
  }
  
  return 'Order status does not qualify for automatic refund';
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
 * Check refund eligibility for an order
 */
export async function checkRefundEligibility(orderId: string, order: Order): Promise<RefundEligibility> {
  const totalAmount = parseFloat(order.totalAmount);
  const { percentage: refundPercentage, amount: refundAmount, requiresDispute: needsDispute } = calculateRefundAmount(totalAmount, order.status);
  const isEligibleForRefund = refundPercentage > 0;
  const alreadyCancelled = order.status === 'cancelled';
  
  // Check if there's already a pending refund for this order
  const existingRefunds = await db.select()
    .from(refunds)
    .where(eq(refunds.orderId, orderId));
  
  const hasPendingRefund = existingRefunds.some(r => r.status === 'pending' || r.status === 'processing');
  const hasCompletedRefund = existingRefunds.some(r => r.status === 'completed');
  
  return {
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
    eligibilityReason: getEligibilityReason(order.status, refundPercentage),
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    breakdown: {
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      serviceFee: order.serviceFee || '0',
      tax: order.tax || '0',
      discount: order.discount || '0',
      totalAmount: order.totalAmount,
      refundPercentage: `${refundPercentage}%`,
      calculatedRefund: refundAmount.toFixed(2)
    }
  };
}

/**
 * Create a refund record for a cancelled order
 */
export async function createRefundRecord(params: {
  orderId: string;
  paymentId?: string;
  customerId: string;
  originalOrderAmount: number;
  refundAmount: number;
  refundPercentage: number;
  orderStatusAtCancellation: string;
  cancellationStage: string;
  reason: string;
  description: string;
  provider: string;
  initiatedBy: string;
  initiatedByRole: string;
  metadata?: Record<string, any>;
}): Promise<Refund | null> {
  try {
    const [newRefund] = await db.insert(refunds).values({
      paymentId: params.paymentId,
      orderId: params.orderId,
      customerId: params.customerId,
      originalOrderAmount: params.originalOrderAmount.toString(),
      amount: params.refundAmount.toString(),
      refundPercentage: params.refundPercentage.toString(),
      orderStatusAtCancellation: params.orderStatusAtCancellation,
      cancellationStage: params.cancellationStage,
      reason: params.reason,
      description: params.description,
      status: 'pending',
      provider: params.provider,
      initiatedBy: params.initiatedBy,
      initiatedByRole: params.initiatedByRole,
      metadata: params.metadata || {}
    }).returning();
    
    return newRefund;
  } catch (error) {
    console.error("Error creating refund record:", error);
    return null;
  }
}

/**
 * Get refund statistics for a customer
 */
export async function getCustomerRefundStats(customerId: string): Promise<{
  totalRefunds: number;
  pendingCount: number;
  completedCount: number;
  rejectedCount: number;
  totalRefundedAmount: number;
}> {
  const customerRefunds = await db.select()
    .from(refunds)
    .where(eq(refunds.customerId, customerId));
  
  return {
    totalRefunds: customerRefunds.length,
    pendingCount: customerRefunds.filter(r => r.status === 'pending').length,
    completedCount: customerRefunds.filter(r => r.status === 'completed').length,
    rejectedCount: customerRefunds.filter(r => r.status === 'rejected' || r.status === 'failed').length,
    totalRefundedAmount: customerRefunds
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + parseFloat(r.amount), 0)
  };
}

export const refundService = {
  calculateRefundAmount,
  getCancellationStage,
  requiresDispute,
  getRefundStatusMessage,
  getEligibilityReason,
  buildRefundTimeline,
  checkRefundEligibility,
  createRefundRecord,
  getCustomerRefundStats,
  REFUND_PERCENTAGES,
  CANCELLATION_STAGES,
  REFUND_STATUSES,
  REFUND_REASONS
};

export default refundService;
