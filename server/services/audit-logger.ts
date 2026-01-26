import { db } from "../db";
import { adminAuditLogs } from "@shared/schema";

/**
 * Admin Audit Logger Service
 *
 * Logs all admin actions to the database for security, compliance, and accountability.
 * Tracks: login/logout, CRUD operations, approvals, suspensions, and all admin modifications.
 */

export interface AuditLogEntry {
  adminUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an admin action to the audit trail
 *
 * @param adminUserId - UUID of the admin performing the action
 * @param action - Action type (e.g., "login", "create", "update", "delete", "approve", "suspend")
 * @param resource - Resource type (e.g., "users", "orders", "restaurants", "riders", "menu_items")
 * @param details - Additional context including changes made, old/new values, reason, etc.
 * @param ipAddress - Optional IP address of the admin
 * @param userAgent - Optional user agent string
 */
export async function logAdminAction(
  adminUserId: string,
  action: string,
  resource: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await db.insert(adminAuditLogs).values({
      adminUserId,
      action,
      resource,
      resourceId: details?.resourceId?.toString() || details?.id?.toString(),
      details,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw - audit logging should never break the main operation
  }
}

/**
 * Log admin login
 */
export async function logAdminLogin(
  adminUserId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    "login",
    "auth",
    { event: "admin_login" },
    ipAddress,
    userAgent
  );
}

/**
 * Log admin logout
 */
export async function logAdminLogout(
  adminUserId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    "logout",
    "auth",
    { event: "admin_logout" },
    ipAddress,
    userAgent
  );
}

/**
 * Log admin CRUD operation with before/after values
 */
export async function logAdminCRUD(
  adminUserId: string,
  operation: "create" | "update" | "delete",
  resource: string,
  resourceId: string,
  changes?: {
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
  },
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    operation,
    resource,
    {
      resourceId,
      ...changes,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log restaurant approval/rejection
 */
export async function logRestaurantApproval(
  adminUserId: string,
  restaurantId: string,
  approved: boolean,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    approved ? "approve" : "reject",
    "restaurants",
    {
      resourceId: restaurantId,
      approved,
      reason,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log rider verification/approval
 */
export async function logRiderVerification(
  adminUserId: string,
  riderId: string,
  verified: boolean,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    verified ? "verify" : "reject",
    "riders",
    {
      resourceId: riderId,
      verified,
      reason,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log user suspension/unsuspension
 */
export async function logUserSuspension(
  adminUserId: string,
  userId: string,
  suspended: boolean,
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    suspended ? "suspend" : "unsuspend",
    "users",
    {
      resourceId: userId,
      suspended,
      reason,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log order assignment to rider
 */
export async function logOrderAssignment(
  adminUserId: string,
  orderId: string,
  riderId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    "assign",
    "orders",
    {
      resourceId: orderId,
      riderId,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log refund processing
 */
export async function logRefundProcessing(
  adminUserId: string,
  orderId: string,
  amount: number,
  reason: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    "refund",
    "orders",
    {
      resourceId: orderId,
      amount,
      reason,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log promo code creation/modification
 */
export async function logPromoCodeAction(
  adminUserId: string,
  action: "create" | "update" | "delete" | "activate" | "deactivate",
  promoCodeId: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    action,
    "promo_codes",
    {
      resourceId: promoCodeId,
      ...details,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Log settings/configuration changes
 */
export async function logConfigurationChange(
  adminUserId: string,
  setting: string,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAdminAction(
    adminUserId,
    "update",
    "configuration",
    {
      setting,
      oldValue,
      newValue,
    },
    ipAddress,
    userAgent
  );
}

/**
 * Extract IP address from request
 */
export function getIpAddress(req: any): string | undefined {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress
  );
}

/**
 * Extract user agent from request
 */
export function getUserAgent(req: any): string | undefined {
  return req.headers["user-agent"];
}
