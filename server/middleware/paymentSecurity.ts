import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { SecurityUtils } from '../utils/security';
import { logger, securityLogger } from './logging';
import { createErrors } from './errorHandler';

// PCI DSS compliance middleware
export const pciComplianceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Ensure sensitive payment data is not logged
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Override console methods to prevent logging sensitive data
  console.log = (...args) => {
    const safe = args.map(arg => SecurityUtils.maskSensitiveData(arg));
    originalLog(...safe);
  };
  
  console.error = (...args) => {
    const safe = args.map(arg => SecurityUtils.maskSensitiveData(arg));
    originalError(...safe);
  };
  
  console.warn = (...args) => {
    const safe = args.map(arg => SecurityUtils.maskSensitiveData(arg));
    originalWarn(...safe);
  };
  
  // Restore original console methods after request
  res.on('finish', () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
  
  next();
};

// Payment amount validation middleware
export const validatePaymentAmount = (req: Request, res: Response, next: NextFunction) => {
  const { amount } = req.body;
  
  if (amount === undefined || amount === null) {
    return next(createErrors.validation('Payment amount is required'));
  }
  
  // Convert to number if string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return next(createErrors.validation('Payment amount must be a valid number'));
  }
  
  // Validate amount range
  if (numAmount <= 0) {
    return next(createErrors.validation('Payment amount must be greater than zero'));
  }
  
  if (numAmount > 50000) {
    return next(createErrors.validation('Payment amount exceeds maximum limit of ₱50,000'));
  }
  
  // Check for reasonable decimal places (max 2)
  if (!/^\d+(\.\d{1,2})?$/.test(numAmount.toString())) {
    return next(createErrors.validation('Payment amount can have at most 2 decimal places'));
  }
  
  // Store validated amount
  req.body.amount = numAmount;
  next();
};

// Payment method validation middleware
export const validatePaymentMethod = (req: Request, res: Response, next: NextFunction) => {
  const { paymentMethod } = req.body;
  
  if (!paymentMethod) {
    return next(createErrors.validation('Payment method is required'));
  }
  
  const allowedMethods = ['nexuspay', 'gcash', 'paymaya', 'cash'];
  
  if (!allowedMethods.includes(paymentMethod)) {
    return next(createErrors.validation(`Invalid payment method. Allowed: ${allowedMethods.join(', ')}`));
  }
  
  next();
};

// Webhook signature verification middleware
export const verifyWebhookSignature = (provider: 'nexuspay') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers['x-webhook-signature'];
      
      if (!signature) {
        securityLogger.logSuspiciousActivity(req, 'webhook_no_signature', {
          provider,
          headers: req.headers
        });
        return next(createErrors.authentication('Webhook signature missing'));
      }
      
      // Get the appropriate secret
      const secret = process.env.NEXUSPAY_WEBHOOK_SECRET;
      
      if (!secret) {
        logger.error(`${provider} webhook secret not configured`);
        return next(createErrors.internal('Webhook verification failed'));
      }
      
      // Verify signature based on provider
      let isValid = false;
      
      if (provider === 'nexuspay') {
        isValid = verifyNexusPaySignature(req.body, signature as string, secret);
      }
      
      if (!isValid) {
        securityLogger.logSuspiciousActivity(req, 'webhook_invalid_signature', {
          provider,
          signature: SecurityUtils.maskSensitiveData(signature)
        });
        return next(createErrors.authentication('Invalid webhook signature'));
      }
      
      // Log successful webhook verification
      logger.info('Webhook signature verified', {
        provider,
        ip: req.ip,
        requestId: req.requestId
      });
      
      next();
    } catch (error) {
      logger.error('Webhook signature verification error', { error, provider });
      next(createErrors.authentication('Webhook verification failed'));
    }
  };
};

// NexusPay signature verification
function verifyNexusPaySignature(payload: any, signature: string, secret: string): boolean {
  try {
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}

// Payment fraud detection middleware
export const fraudDetection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, paymentMethod, orderId } = req.body;
    const userId = req.user?.id;
    const ip = req.ip || '0.0.0.0';
    
    const fraudScore = await calculateFraudScore({
      userId,
      amount,
      paymentMethod,
      ip,
      orderId
    });
    
    // Log fraud score for monitoring
    logger.info('Payment fraud score calculated', {
      userId,
      orderId,
      fraudScore,
      amount,
      paymentMethod,
      ip,
      requestId: req.requestId
    });
    
    // Block high-risk transactions
    if (fraudScore >= 80) {
      securityLogger.logSuspiciousActivity(req, 'high_fraud_score', {
        fraudScore,
        amount,
        paymentMethod,
        userId
      });
      
      return next(createErrors.businessLogic(
        'Transaction blocked due to security concerns. Please contact support.'
      ));
    }
    
    // Flag medium-risk transactions for review
    if (fraudScore >= 50) {
      req.body.requiresReview = true;
      
      logger.warn('Payment flagged for review', {
        userId,
        orderId,
        fraudScore,
        amount,
        requestId: req.requestId
      });
    }
    
    req.body.fraudScore = fraudScore;
    next();
  } catch (error) {
    logger.error('Fraud detection error', { error, requestId: req.requestId });
    // Don't block payments due to fraud detection errors
    next();
  }
};

// Calculate fraud score based on various factors
async function calculateFraudScore(data: {
  userId?: string;
  amount: number;
  paymentMethod: string;
  ip: string;
  orderId?: string;
}): Promise<number> {
  let score = 0;
  
  // Amount-based scoring
  if (data.amount > 10000) score += 20; // High amounts are riskier
  if (data.amount > 25000) score += 30;
  
  // Payment method scoring
  if (data.paymentMethod === 'card') score += 10; // Cards have higher fraud risk
  
  // IP-based scoring (simplified)
  if (data.ip.startsWith('192.168.') || data.ip.startsWith('10.')) {
    score -= 10; // Local IPs are less risky
  }
  
  // TODO: Add more sophisticated fraud detection:
  // - Velocity checks (multiple transactions in short time)
  // - Geolocation mismatches
  // - Device fingerprinting
  // - Historical fraud patterns
  // - Machine learning models
  
  return Math.min(100, Math.max(0, score));
}

// Payment data encryption middleware
export const encryptPaymentData = (req: Request, res: Response, next: NextFunction) => {
  const sensitiveFields = ['cardNumber', 'cvv', 'accountNumber', 'routingNumber'];
  
  if (req.body && typeof req.body === 'object') {
    for (const field of sensitiveFields) {
      if (req.body[field]) {
        try {
          req.body[field] = SecurityUtils.encryptData(req.body[field]);
        } catch (error) {
          logger.error('Payment data encryption error', { field, error });
          return next(createErrors.internal('Payment processing failed'));
        }
      }
    }
  }
  
  next();
};

// Payment audit logging middleware
export const auditPaymentTransaction = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Log payment transaction after response
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logger.info('Payment transaction completed', {
        userId: req.user?.id,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        orderId: req.body.orderId,
        fraudScore: req.body.fraudScore,
        requiresReview: req.body.requiresReview,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    } else {
      logger.error('Payment transaction failed', {
        userId: req.user?.id,
        amount: req.body.amount,
        paymentMethod: req.body.paymentMethod,
        statusCode: res.statusCode,
        error: body,
        ip: req.ip,
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// GDPR compliance for payment data
export const gdprPaymentCompliance = (req: Request, res: Response, next: NextFunction) => {
  // Add GDPR headers
  res.setHeader('X-Data-Processing-Lawful-Basis', 'contract');
  res.setHeader('X-Data-Retention-Period', '7-years');
  res.setHeader('X-Data-Subject-Rights', 'access,rectification,erasure,portability');
  
  // Log data processing activity
  logger.info('Payment data processing', {
    userId: req.user?.id,
    purpose: 'payment_processing',
    lawfulBasis: 'contract',
    dataTypes: ['financial', 'transactional'],
    ip: req.ip,
    timestamp: new Date().toISOString(),
    requestId: req.requestId
  });
  
  next();
};

// Payment method specific security
export const enhancedPaymentSecurity = (method: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    switch (method) {
      case 'nexuspay':
        // Additional NexusPay-specific security
        if (req.body.accountNumber) {
          // Validate account number format
          if (!/^\d{10,12}$/.test(req.body.accountNumber)) {
            return next(createErrors.validation('Invalid account number format'));
          }
        }
        break;
        
      case 'gcash':
      case 'paymaya':
        // Validate mobile wallet phone numbers
        if (req.body.phoneNumber) {
          if (!/^(\+63|63|0)?9\d{9}$/.test(req.body.phoneNumber.replace(/[^\d+]/g, ''))) {
            return next(createErrors.validation('Invalid mobile number for wallet'));
          }
        }
        break;
    }
    
    next();
  };
};

// Basic Luhn algorithm for credit card validation
function isValidCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}