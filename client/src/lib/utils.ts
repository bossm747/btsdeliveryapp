import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Order } from "@shared/schema"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============= ORDER MODIFICATION UTILITIES =============

/**
 * Modification window duration in milliseconds (2 minutes)
 */
export const MODIFICATION_WINDOW_MS = 2 * 60 * 1000;

/**
 * Order statuses that allow modification
 */
export const MODIFIABLE_ORDER_STATUSES = ['pending', 'confirmed'] as const;

/**
 * Result of checking if an order can be modified
 */
export interface ModificationStatus {
  canModify: boolean;
  remainingSeconds: number;
  expiresAt: Date;
  reason?: string;
}

/**
 * Check if an order can be modified within the 2-minute modification window
 *
 * @param order - The order to check
 * @returns ModificationStatus object with canModify boolean, remaining time, and optional reason
 *
 * @example
 * ```typescript
 * const status = canModifyOrder(order);
 * if (status.canModify) {
 *   console.log(`You have ${status.remainingSeconds} seconds to modify`);
 * } else {
 *   console.log(`Cannot modify: ${status.reason}`);
 * }
 * ```
 */
export function canModifyOrder(order: Order): ModificationStatus {
  const orderCreatedAt = new Date(order.createdAt!).getTime();
  const elapsed = Date.now() - orderCreatedAt;
  const remaining = Math.max(0, MODIFICATION_WINDOW_MS - elapsed);
  const expiresAt = new Date(orderCreatedAt + MODIFICATION_WINDOW_MS);

  const isWithinWindow = remaining > 0;
  const hasModifiableStatus = MODIFIABLE_ORDER_STATUSES.includes(order.status as any);
  const canModify = isWithinWindow && hasModifiableStatus;

  let reason: string | undefined;
  if (!canModify) {
    if (!isWithinWindow) {
      reason = 'Modification window expired';
    } else if (!hasModifiableStatus) {
      reason = `Order cannot be modified while ${order.status}`;
    }
  }

  return {
    canModify,
    remainingSeconds: Math.floor(remaining / 1000),
    expiresAt,
    reason
  };
}

/**
 * Format seconds into MM:SS display format
 *
 * @param seconds - Number of seconds to format
 * @returns Formatted string in "M:SS" or "MM:SS" format
 *
 * @example
 * ```typescript
 * formatTime(90) // "1:30"
 * formatTime(5)  // "0:05"
 * ```
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
