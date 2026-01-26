// Authentication and Authorization Middleware
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { users, userSessions, adminAuditLogs } from '@shared/schema';
import { eq } from 'drizzle-orm';

// JWT_SECRET must be set in production - no fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required. Please set it in your .env file.");
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        displayName?: string;
        role: string;
        profileImageUrl?: string;
        status: string;
        permissions?: any;
        preferences?: any;
        createdAt?: Date;
        updatedAt?: Date;
      };
      sessionId?: string;
    }
  }
}

// Authentication middleware
export const authenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if session is still valid
    const [session] = await db.select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, token));

    if (!session || new Date() > session.expiresAt) {
      return res.status(401).json({ message: "Token expired" });
    }

    // Get user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has verified their email (except for certain endpoints)
    const allowUnverifiedPaths = [
      '/api/auth/verify-email',
      '/api/auth/resend-verification',
      '/api/auth/me',
      // Allow pending users to complete onboarding steps
      '/api/user/address',
      '/api/user/dietary-preferences',
      '/api/user/notification-preferences',
      '/api/user/onboarding-status'
    ];
    const isAllowedPath = allowUnverifiedPaths.some(path => req.path.startsWith(path));

    if (!isAllowedPath && user.status === "pending" && !user.emailVerifiedAt) {
      return res.status(403).json({
        message: "Email verification required. Please verify your email address to access this feature.",
        requiresEmailVerification: true
      });
    }

    req.user = user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Invalid token" });
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't require it
 * - If token is valid: populates req.user and req.sessionId
 * - If no token or invalid: continues without authentication (req.user will be undefined)
 */
export const optionalAuthenticateToken = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided - continue as unauthenticated user
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Check if session is still valid
    const [session] = await db.select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, token));

    if (!session || new Date() > session.expiresAt) {
      // Token expired - continue as unauthenticated (don't block)
      return next();
    }

    // Get user data
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, decoded.userId));

    if (user) {
      req.user = user;
      req.sessionId = session.id;
    }

    next();
  } catch (error) {
    // Invalid token - continue as unauthenticated (don't block)
    next();
  }
};

// Role-based access control middleware
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    if (!roles.includes(req.user.role)) {
      console.warn(`[RBAC] Access denied for user ${req.user.id} (${req.user.role}) to ${req.method} ${req.path}. Required: ${roles.join(', ')}`);
      return res.status(403).json({
        message: "Access denied. You don't have permission to access this resource.",
        code: "INSUFFICIENT_PERMISSIONS",
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Convenience function for requiring any of multiple roles
export const requireAnyRole = (allowedRoles: string[]) => requireRole(allowedRoles);

// Admin-only middleware
export const requireAdmin = requireRole('admin');

// Vendor-only middleware
export const requireVendor = requireRole('vendor');

// Rider-only middleware  
export const requireRider = requireRole('rider');

// Customer-only middleware
export const requireCustomer = requireRole('customer');

// Admin or vendor middleware
export const requireAdminOrVendor = requireRole(['admin', 'vendor']);

// Admin or rider middleware
export const requireAdminOrRider = requireRole(['admin', 'rider']);

// Admin or customer middleware
export const requireAdminOrCustomer = requireRole(['admin', 'customer']);

// Admin, vendor or rider middleware (for delivery-related operations)
export const requireDeliveryAccess = requireRole(['admin', 'vendor', 'rider']);

// Resource owner middleware - allows access if user owns the resource or is admin
export const requireOwnerOrAdmin = (getOwnerId: (req: any) => string | Promise<string>) => {
  return async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: "Authentication required",
        code: "AUTH_REQUIRED"
      });
    }

    // Admin always has access
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);
      if (req.user.id === ownerId) {
        return next();
      }

      console.warn(`[RBAC] Owner check failed for user ${req.user.id} on ${req.method} ${req.path}. Owner: ${ownerId}`);
      return res.status(403).json({
        message: "Access denied. You can only access your own resources.",
        code: "NOT_RESOURCE_OWNER"
      });
    } catch (error) {
      console.error('[RBAC] Error checking resource ownership:', error);
      return res.status(500).json({
        message: "Error verifying access permissions",
        code: "PERMISSION_CHECK_ERROR"
      });
    }
  };
};

// Audit logging middleware for admin actions
export const auditLog = (action: string, resource: string) => {
  return async (req: any, res: any, next: any) => {
    const originalSend = res.send;

    res.send = function(body: any) {
      // Log the admin action if it was successful (200-299 status)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.role === 'admin') {
        db.insert(adminAuditLogs).values({
          adminUserId: req.user.id,
          action,
          resource,
          resourceId: req.params.id || req.body?.id || 'unknown',
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            query: req.query,
            params: req.params
          },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.get('User-Agent')
        }).catch((err: any) => {
          console.error('Failed to log admin action:', err);
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };
};
