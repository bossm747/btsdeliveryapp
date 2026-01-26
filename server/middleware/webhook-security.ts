/**
 * Webhook Security Middleware
 * 
 * This middleware ensures ALL webhooks are properly verified before processing.
 * No webhook should be processed without signature verification in production.
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from './logging';

/**
 * HMAC-SHA256 signature verification with constant-time comparison
 */
function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    logger.error('Webhook signature verification error', { error });
    return false;
  }
}

/**
 * NexusPay Webhook Verification Middleware
 * 
 * SECURITY: In production, this REQUIRES signature verification.
 * Unverified webhooks will be rejected with 401.
 */
export const requireNexusPayWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signature = req.headers['x-nexuspay-signature'] as string;
  const webhookSecret = process.env.NEXUSPAY_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log all webhook attempts for security auditing
  logger.info('Webhook received', {
    path: req.path,
    hasSignature: !!signature,
    hasSecret: !!webhookSecret,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    requestId: (req as any).requestId
  });

  // In production, REQUIRE both signature and secret
  if (isProduction) {
    if (!webhookSecret) {
      logger.error('SECURITY: NEXUSPAY_WEBHOOK_SECRET not configured in production!');
      return res.status(500).json({ 
        error: 'Webhook processing unavailable',
        code: 'WEBHOOK_CONFIG_ERROR'
      });
    }

    if (!signature) {
      logger.warn('Webhook rejected: Missing signature header', {
        ip: req.ip,
        requestId: (req as any).requestId
      });
      return res.status(401).json({ 
        error: 'Missing webhook signature',
        code: 'MISSING_SIGNATURE'
      });
    }

    const payload = JSON.stringify(req.body);
    const isValid = verifyHmacSignature(payload, signature, webhookSecret);

    if (!isValid) {
      logger.warn('Webhook rejected: Invalid signature', {
        ip: req.ip,
        requestId: (req as any).requestId
      });
      return res.status(401).json({ 
        error: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE'
      });
    }

    logger.info('Webhook signature verified successfully');
  } else {
    // Development mode - verify if possible, warn if not
    if (signature && webhookSecret) {
      const payload = JSON.stringify(req.body);
      const isValid = verifyHmacSignature(payload, signature, webhookSecret);
      
      if (!isValid) {
        logger.warn('DEV: Webhook signature invalid, but allowing in dev mode');
      }
    } else {
      logger.warn('DEV: Processing webhook without signature verification');
    }
  }

  // Mark request as verified for downstream handlers
  (req as any).webhookVerified = true;
  (req as any).webhookProvider = 'nexuspay';

  next();
};

/**
 * Generic Webhook Security Middleware Factory
 * 
 * Creates signature verification middleware for any provider
 */
export const createWebhookVerifier = (options: {
  provider: string;
  signatureHeader: string;
  secretEnvVar: string;
  algorithm?: 'sha256' | 'sha512';
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { provider, signatureHeader, secretEnvVar, algorithm = 'sha256' } = options;
    const signature = req.headers[signatureHeader.toLowerCase()] as string;
    const secret = process.env[secretEnvVar];
    const isProduction = process.env.NODE_ENV === 'production';

    logger.info(`${provider} webhook received`, {
      path: req.path,
      hasSignature: !!signature,
      ip: req.ip
    });

    if (isProduction) {
      if (!secret) {
        logger.error(`SECURITY: ${secretEnvVar} not configured in production!`);
        return res.status(500).json({ error: 'Webhook configuration error' });
      }

      if (!signature) {
        logger.warn(`${provider} webhook rejected: Missing signature`);
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payload, 'utf8')
        .digest('hex');

      try {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(signature, 'hex'),
          Buffer.from(expectedSignature, 'hex')
        );

        if (!isValid) {
          logger.warn(`${provider} webhook rejected: Invalid signature`);
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      } catch {
        logger.warn(`${provider} webhook rejected: Signature format error`);
        return res.status(401).json({ error: 'Invalid signature format' });
      }
    }

    (req as any).webhookVerified = true;
    (req as any).webhookProvider = provider;
    next();
  };
};

/**
 * Webhook Idempotency Middleware
 * 
 * Prevents duplicate processing of the same webhook
 */
const processedWebhooks = new Map<string, number>();
const WEBHOOK_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of processedWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_TTL) {
      processedWebhooks.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

export const webhookIdempotency = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Generate idempotency key from webhook payload
  const transactionId = req.body.transactionId || 
                        req.body.transaction_id ||
                        req.headers['x-webhook-id'];
  
  if (!transactionId) {
    // No transaction ID, can't check idempotency
    return next();
  }

  const idempotencyKey = `${(req as any).webhookProvider || 'unknown'}_${transactionId}`;

  if (processedWebhooks.has(idempotencyKey)) {
    logger.info('Duplicate webhook detected, skipping', {
      transactionId,
      provider: (req as any).webhookProvider
    });
    return res.json({ 
      received: true, 
      status: 'ok', 
      note: 'duplicate_ignored' 
    });
  }

  // Mark as processed
  processedWebhooks.set(idempotencyKey, Date.now());
  
  next();
};

export default {
  requireNexusPayWebhookSignature,
  createWebhookVerifier,
  webhookIdempotency
};
