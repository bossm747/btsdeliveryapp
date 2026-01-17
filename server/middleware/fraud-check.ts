/**
 * Fraud Check Middleware
 *
 * Automatically performs fraud checks on orders during creation.
 * Flags high-risk orders for manual review and auto-blocks very high risk transactions.
 */

import { Request, Response, NextFunction } from 'express';
import { fraudDetectionService, FraudCheckInput, FraudCheckResult, generateFingerprintHash } from '../services/fraud-detection';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { userRiskScores, users } from '@shared/schema';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      fraudCheck?: FraudCheckResult;
      deviceFingerprint?: string;
      clientIp?: string;
    }
  }
}

// Risk thresholds for automatic actions
const AUTO_BLOCK_THRESHOLD = 90;
const MANUAL_REVIEW_THRESHOLD = 60;

/**
 * Extract client IP from request
 */
export function getClientIp(req: Request): string {
  // Check various headers for proxied requests
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return req.ip || req.socket.remoteAddress || '0.0.0.0';
}

/**
 * Extract device fingerprint from request headers or body
 */
export function getDeviceFingerprint(req: Request): {
  fingerprint: string;
  deviceInfo: Record<string, unknown>;
} {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Check for client-provided fingerprint
  const clientFingerprint = req.headers['x-device-fingerprint'] as string ||
    req.body?.deviceFingerprint;

  // Build device info from available data
  const deviceInfo: Record<string, unknown> = {
    userAgent,
    acceptLanguage,
    acceptEncoding,
    platform: req.headers['sec-ch-ua-platform'],
    mobile: req.headers['sec-ch-ua-mobile'],
    screenResolution: req.body?.screenResolution,
    timezone: req.body?.timezone,
    colorDepth: req.body?.colorDepth,
    deviceMemory: req.body?.deviceMemory,
    hardwareConcurrency: req.body?.hardwareConcurrency,
  };

  // Use client fingerprint if provided, otherwise generate from available data
  const fingerprint = clientFingerprint || generateFingerprintHash(deviceInfo);

  return { fingerprint, deviceInfo };
}

/**
 * Middleware to perform fraud check on order creation
 */
export function fraudCheckMiddleware(options?: {
  checkType?: 'order_creation' | 'payment' | 'login' | 'account_update';
  blockOnHighRisk?: boolean;
  requireReviewThreshold?: number;
}) {
  const checkType = options?.checkType || 'order_creation';
  const blockOnHighRisk = options?.blockOnHighRisk !== false;
  const reviewThreshold = options?.requireReviewThreshold || MANUAL_REVIEW_THRESHOLD;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract user from authenticated request
      const userId = (req as any).user?.id;

      if (!userId) {
        // No authenticated user, skip fraud check
        return next();
      }

      // Check if user is already blocked
      const userRisk = await db
        .select()
        .from(userRiskScores)
        .where(eq(userRiskScores.userId, userId))
        .limit(1);

      if (userRisk.length > 0 && userRisk[0].isBlocked) {
        // Check if block has expired
        if (userRisk[0].unblockAt && new Date(userRisk[0].unblockAt) < new Date()) {
          // Block has expired, unblock user
          await fraudDetectionService.unblockUser(userId);
        } else {
          return res.status(403).json({
            success: false,
            error: 'Account temporarily suspended',
            message: 'Your account has been temporarily suspended due to suspicious activity. Please contact support.',
            code: 'ACCOUNT_BLOCKED',
          });
        }
      }

      // Extract device information
      const clientIp = getClientIp(req);
      const { fingerprint, deviceInfo } = getDeviceFingerprint(req);

      // Store for later use
      req.clientIp = clientIp;
      req.deviceFingerprint = fingerprint;

      // Build fraud check input
      const fraudCheckInput: FraudCheckInput = {
        userId,
        checkType,
        device: {
          fingerprint,
          userAgent: req.headers['user-agent'] || '',
          ip: clientIp,
          deviceInfo,
        },
      };

      // Add order details if this is an order creation check
      if (checkType === 'order_creation' && req.body) {
        fraudCheckInput.orderDetails = {
          totalAmount: req.body.totalAmount || 0,
          orderType: req.body.orderType || 'food',
          deliveryAddress: req.body.deliveryAddress?.coordinates,
          pickupAddress: req.body.pickupAddress?.coordinates || req.body.restaurantLocation,
        };
      }

      // Add payment details if this is a payment check
      if (checkType === 'payment' && req.body) {
        fraudCheckInput.payment = {
          method: req.body.paymentMethod,
          amount: req.body.amount || req.body.totalAmount,
          cardLastFour: req.body.cardLastFour,
        };
      }

      // Perform fraud check
      const result = await fraudDetectionService.checkFraud(fraudCheckInput);

      // Store result on request for downstream use
      req.fraudCheck = result;

      // Handle based on risk score
      if (blockOnHighRisk && result.riskScore >= AUTO_BLOCK_THRESHOLD) {
        // Auto-block very high risk transactions
        return res.status(403).json({
          success: false,
          error: 'Transaction blocked',
          message: 'This transaction has been blocked for security reasons. Please contact support if you believe this is an error.',
          code: 'FRAUD_BLOCKED',
          riskLevel: result.riskLevel,
        });
      }

      if (result.riskScore >= reviewThreshold) {
        // Flag for manual review but allow to continue
        // The order will be created but flagged
        console.log(`[Fraud] Order flagged for review - User: ${userId}, Score: ${result.riskScore}, Level: ${result.riskLevel}`);
      }

      next();
    } catch (error) {
      console.error('Fraud check middleware error:', error);
      // On error, allow the request but log it
      next();
    }
  };
}

/**
 * Middleware to perform fraud check on login attempts
 */
export function loginFraudCheckMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user email/phone from login request
      const { email, phone } = req.body;

      if (!email && !phone) {
        return next();
      }

      // Find user
      const user = await db
        .select()
        .from(users)
        .where(email ? eq(users.email, email) : eq(users.phone, phone))
        .limit(1);

      if (user.length === 0) {
        // User not found, let auth handle it
        return next();
      }

      const userId = user[0].id;

      // Check if user is blocked
      const userRisk = await db
        .select()
        .from(userRiskScores)
        .where(eq(userRiskScores.userId, userId))
        .limit(1);

      if (userRisk.length > 0 && userRisk[0].isBlocked) {
        // Check if block has expired
        if (userRisk[0].unblockAt && new Date(userRisk[0].unblockAt) < new Date()) {
          // Block has expired, unblock user
          await fraudDetectionService.unblockUser(userId);
        } else {
          return res.status(403).json({
            success: false,
            error: 'Account temporarily suspended',
            message: 'Your account has been temporarily suspended. Please contact support.',
            code: 'ACCOUNT_BLOCKED',
          });
        }
      }

      // Extract device information
      const clientIp = getClientIp(req);
      const { fingerprint, deviceInfo } = getDeviceFingerprint(req);

      // Perform fraud check
      const result = await fraudDetectionService.checkFraud({
        userId,
        checkType: 'login',
        device: {
          fingerprint,
          userAgent: req.headers['user-agent'] || '',
          ip: clientIp,
          deviceInfo,
        },
      });

      // Store result
      req.fraudCheck = result;
      req.clientIp = clientIp;
      req.deviceFingerprint = fingerprint;

      // Only block login if extremely high risk
      if (result.riskScore >= AUTO_BLOCK_THRESHOLD) {
        return res.status(403).json({
          success: false,
          error: 'Login blocked',
          message: 'This login attempt has been blocked for security reasons. Please verify your identity.',
          code: 'LOGIN_BLOCKED',
        });
      }

      next();
    } catch (error) {
      console.error('Login fraud check error:', error);
      // On error, allow login
      next();
    }
  };
}

/**
 * Middleware to add fraud context to response
 */
export function addFraudContext() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any) {
      // Add fraud information to successful responses if available
      if (req.fraudCheck && body && typeof body === 'object') {
        body._fraudCheck = {
          riskScore: req.fraudCheck.riskScore,
          riskLevel: req.fraudCheck.riskLevel,
          flagsCount: req.fraudCheck.flags.length,
          requiresReview: req.fraudCheck.recommendation === 'review',
        };
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Middleware to check if order needs manual review
 */
export function requireFraudReview() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.fraudCheck && req.fraudCheck.recommendation !== 'allow') {
      // Modify the request to indicate review needed
      (req as any).requiresFraudReview = true;
      (req as any).fraudReviewReason = `Risk Score: ${req.fraudCheck.riskScore}, Level: ${req.fraudCheck.riskLevel}`;
    }
    next();
  };
}

/**
 * Get fraud check result from request
 */
export function getFraudCheckResult(req: Request): FraudCheckResult | undefined {
  return req.fraudCheck;
}

/**
 * Check if request requires fraud review
 */
export function requiresFraudReview(req: Request): boolean {
  return (req as any).requiresFraudReview === true;
}

export default {
  fraudCheckMiddleware,
  loginFraudCheckMiddleware,
  addFraudContext,
  requireFraudReview,
  getClientIp,
  getDeviceFingerprint,
  getFraudCheckResult,
  requiresFraudReview,
};
