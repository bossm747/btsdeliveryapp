import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';

// General API rate limiting
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime) / 1000) || 900
    });
  }
});

// Authentication rate limiting (more restrictive)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many failed login attempts. Please try again after 15 minutes.',
      retryAfter: Math.round(((req as any).rateLimit?.resetTime) / 1000) || 900
    });
  }
});

// Password reset rate limiting
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset attempts per hour
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again after 1 hour',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Order creation rate limiting
export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 orders per minute
  message: {
    error: 'Order creation rate limit exceeded',
    message: 'Please wait before creating another order',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Upload rate limiting
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per 15 minutes
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Slow down middleware for progressive delays
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Max delay of 20 seconds
});

// Account lockout tracking
interface LoginAttempt {
  attempts: number;
  lastAttempt: Date;
  lockoutUntil?: Date;
}

const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes

export const accountLockoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.body.email || req.ip;
  const now = new Date();
  
  if (!identifier) {
    return next();
  }

  const attempt = loginAttempts.get(identifier);
  
  // Check if account is currently locked
  if (attempt?.lockoutUntil && now < attempt.lockoutUntil) {
    const remainingTime = Math.ceil((attempt.lockoutUntil.getTime() - now.getTime()) / 60000);
    return res.status(423).json({
      error: 'Account temporarily locked',
      message: `Account is locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
      lockoutRemaining: remainingTime
    });
  }

  // Reset attempts if window has passed
  if (attempt && (now.getTime() - attempt.lastAttempt.getTime()) > ATTEMPT_WINDOW) {
    loginAttempts.delete(identifier);
  }

  // Add middleware flag to track this attempt
  req.accountLockoutIdentifier = identifier;
  next();
};

export const recordFailedLogin = (identifier: string) => {
  const now = new Date();
  const attempt = loginAttempts.get(identifier) || { attempts: 0, lastAttempt: now };
  
  attempt.attempts += 1;
  attempt.lastAttempt = now;
  
  // Lock account if max attempts reached
  if (attempt.attempts >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockoutUntil = new Date(now.getTime() + LOCKOUT_DURATION);
  }
  
  loginAttempts.set(identifier, attempt);
};

export const recordSuccessfulLogin = (identifier: string) => {
  // Clear failed attempts on successful login
  loginAttempts.delete(identifier);
};

// Clean up old entries periodically
setInterval(() => {
  const now = new Date();
  for (const [key, attempt] of Array.from(loginAttempts.entries())) {
    // Remove entries older than 24 hours
    if (now.getTime() - attempt.lastAttempt.getTime() > 24 * 60 * 60 * 1000) {
      loginAttempts.delete(key);
    }
  }
}, 60 * 60 * 1000); // Run cleanup every hour

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      accountLockoutIdentifier?: string;
    }
  }
}