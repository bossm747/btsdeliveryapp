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
export const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Insufficient permissions",
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

// Admin-only middleware
export const requireAdmin = requireRole(['admin']);

// Admin or vendor middleware
export const requireAdminOrVendor = requireRole(['admin', 'vendor']);

// Admin or rider middleware
export const requireAdminOrRider = requireRole(['admin', 'rider']);

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
