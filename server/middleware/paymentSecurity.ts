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

// In-memory velocity tracking (in production, use Redis)
const velocityStore = new Map<string, { count: number; amounts: number[]; timestamps: number[]; ips: Set<string> }>();
const VELOCITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const MAX_TRANSACTIONS_PER_HOUR = 10;
const MAX_DAILY_AMOUNT = 50000;

// Device fingerprint tracking
const deviceStore = new Map<string, { userId: string; lastSeen: number; transactions: number }>();

// Calculate fraud score based on various factors
async function calculateFraudScore(data: {
  userId?: string;
  amount: number;
  paymentMethod: string;
  ip: string;
  orderId?: string;
  deviceFingerprint?: string;
  userAgent?: string;
}): Promise<number> {
  let score = 0;
  const factors: string[] = [];
  const now = Date.now();
  
  // === 1. AMOUNT-BASED SCORING ===
  if (data.amount > 10000) {
    score += 15;
    factors.push('high_amount_10k');
  }
  if (data.amount > 25000) {
    score += 20;
    factors.push('high_amount_25k');
  }
  // Unusual amounts (round numbers are suspicious for fraud)
  if (data.amount > 1000 && data.amount % 1000 === 0) {
    score += 5;
    factors.push('round_amount');
  }
  
  // === 2. PAYMENT METHOD SCORING ===
  if (data.paymentMethod === 'card') {
    score += 10;
    factors.push('card_payment');
  }
  // Cash on delivery is lower risk
  if (data.paymentMethod === 'cash') {
    score -= 5;
    factors.push('cod_payment');
  }
  
  // === 3. IP-BASED ANALYSIS ===
  const ipAnalysis = analyzeIpAddress(data.ip);
  score += ipAnalysis.score;
  factors.push(...ipAnalysis.factors);
  
  // === 4. VELOCITY CHECKS ===
  if (data.userId) {
    const velocityScore = checkVelocity(data.userId, data.amount, data.ip, now);
    score += velocityScore.score;
    factors.push(...velocityScore.factors);
  }
  
  // === 5. DEVICE FINGERPRINT ANALYSIS ===
  if (data.deviceFingerprint) {
    const deviceScore = analyzeDeviceFingerprint(data.deviceFingerprint, data.userId);
    score += deviceScore.score;
    factors.push(...deviceScore.factors);
  }
  
  // === 6. USER AGENT ANALYSIS ===
  if (data.userAgent) {
    const uaScore = analyzeUserAgent(data.userAgent);
    score += uaScore.score;
    factors.push(...uaScore.factors);
  }
  
  // === 7. TIME-BASED PATTERNS ===
  const hour = new Date().getHours();
  // Transactions between 2 AM and 5 AM are riskier
  if (hour >= 2 && hour <= 5) {
    score += 10;
    factors.push('late_night_transaction');
  }
  
  // Log factors for analysis
  if (factors.length > 0) {
    logger.debug('Fraud score factors', { 
      userId: data.userId, 
      amount: data.amount, 
      score, 
      factors 
    });
  }
  
  return Math.min(100, Math.max(0, score));
}

// IP address analysis
function analyzeIpAddress(ip: string): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // Private/local IPs are trusted (lower risk)
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip === '127.0.0.1') {
    score -= 10;
    factors.push('private_ip');
    return { score, factors };
  }
  
  // Parse IP for analysis
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) {
    // IPv6 or invalid - moderate risk due to uncertainty
    score += 15;
    factors.push('non_ipv4');
    return { score, factors };
  }
  
  // Known high-risk datacenter ranges
  const datacenterPrefixes = [
    [3], [13, 52], [18], [52], [54], // AWS
    [35, 190], [35, 200], [104, 196], // Google Cloud
    [104, 131], [159, 65], [165, 22], // DigitalOcean
    [40, 74], [45, 33], [45, 56], // Azure/Linode
  ];
  
  for (const prefix of datacenterPrefixes) {
    let match = true;
    for (let i = 0; i < prefix.length; i++) {
      if (parts[i] !== prefix[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      score += 20;
      factors.push('datacenter_ip');
      break;
    }
  }
  
  // Philippine ISP ranges (trusted for local service)
  const phPrefixes = [
    [112, 198], [112, 196], [119, 92], [120, 28], // PLDT/Globe
    [203, 82], [122, 54], // Smart/Converge
  ];
  
  for (const prefix of phPrefixes) {
    if (parts[0] === prefix[0] && (prefix.length === 1 || parts[1] >= prefix[1] && parts[1] <= prefix[1] + 10)) {
      score -= 5;
      factors.push('philippine_isp');
      break;
    }
  }
  
  return { score, factors };
}

// Velocity checking
function checkVelocity(userId: string, amount: number, ip: string, now: number): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  // Get or create velocity record
  let record = velocityStore.get(userId);
  if (!record) {
    record = { count: 0, amounts: [], timestamps: [], ips: new Set() };
    velocityStore.set(userId, record);
  }
  
  // Clean old entries outside the window
  const windowStart = now - VELOCITY_WINDOW_MS;
  while (record.timestamps.length > 0 && record.timestamps[0] < windowStart) {
    record.timestamps.shift();
    record.amounts.shift();
    record.count = Math.max(0, record.count - 1);
  }
  
  // Check transaction count velocity
  if (record.count >= MAX_TRANSACTIONS_PER_HOUR) {
    score += 30;
    factors.push('velocity_count_exceeded');
  } else if (record.count >= MAX_TRANSACTIONS_PER_HOUR * 0.7) {
    score += 15;
    factors.push('velocity_count_high');
  }
  
  // Check amount velocity
  const totalAmount = record.amounts.reduce((sum, a) => sum + a, 0) + amount;
  if (totalAmount > MAX_DAILY_AMOUNT) {
    score += 25;
    factors.push('velocity_amount_exceeded');
  }
  
  // Check for multiple IPs (potential account takeover)
  record.ips.add(ip);
  if (record.ips.size > 3) {
    score += 20;
    factors.push('multiple_ips');
  }
  
  // Check for rapid succession (transactions within 30 seconds)
  const lastTimestamp = record.timestamps[record.timestamps.length - 1];
  if (lastTimestamp && (now - lastTimestamp) < 30000) {
    score += 15;
    factors.push('rapid_succession');
  }
  
  // Update record
  record.count++;
  record.amounts.push(amount);
  record.timestamps.push(now);
  
  return { score, factors };
}

// Device fingerprint analysis
function analyzeDeviceFingerprint(fingerprint: string, userId?: string): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  
  const existing = deviceStore.get(fingerprint);
  
  if (existing) {
    // Device seen before
    if (userId && existing.userId !== userId) {
      // Different user on same device - potential fraud
      score += 25;
      factors.push('device_user_mismatch');
    }
    
    // High transaction count from single device
    if (existing.transactions > 20) {
      score += 10;
      factors.push('device_high_volume');
    }
    
    existing.transactions++;
    existing.lastSeen = Date.now();
  } else if (userId) {
    // New device for this user
    deviceStore.set(fingerprint, {
      userId,
      lastSeen: Date.now(),
      transactions: 1
    });
    // First transaction from new device - slightly elevated risk
    score += 5;
    factors.push('new_device');
  }
  
  return { score, factors };
}

// User agent analysis
function analyzeUserAgent(userAgent: string): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];
  const ua = userAgent.toLowerCase();
  
  // Missing or empty user agent is suspicious
  if (!ua || ua.length < 10) {
    score += 20;
    factors.push('missing_user_agent');
    return { score, factors };
  }
  
  // Bot/crawler signatures
  const botPatterns = ['bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests', 'axios', 'node-fetch'];
  for (const pattern of botPatterns) {
    if (ua.includes(pattern)) {
      score += 25;
      factors.push('bot_user_agent');
      break;
    }
  }
  
  // Headless browser detection
  const headlessPatterns = ['headless', 'phantom', 'puppeteer', 'playwright', 'selenium'];
  for (const pattern of headlessPatterns) {
    if (ua.includes(pattern)) {
      score += 30;
      factors.push('headless_browser');
      break;
    }
  }
  
  // Very old browser versions (potential spoofing)
  if (ua.includes('msie 6') || ua.includes('msie 7') || ua.includes('msie 8')) {
    score += 20;
    factors.push('legacy_browser');
  }
  
  return { score, factors };
}

// Cleanup old velocity/device data periodically
setInterval(() => {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  
  // Clean velocity store
  for (const [key, record] of velocityStore.entries()) {
    const recent = record.timestamps.filter(t => t > dayAgo);
    if (recent.length === 0) {
      velocityStore.delete(key);
    }
  }
  
  // Clean device store
  for (const [key, record] of deviceStore.entries()) {
    if (record.lastSeen < dayAgo) {
      deviceStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run every hour

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