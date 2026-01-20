import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';

// Rate limiting disabled - set to very high limits
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Effectively disabled
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.round((resetTime - Date.now()) / 1000) : 900;
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.max(retryAfter, 1)
    });
  }
});

// Authentication rate limiting - disabled
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Effectively disabled
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const resetTime = (req as any).rateLimit?.resetTime;
    const retryAfter = resetTime ? Math.round((resetTime - Date.now()) / 1000) : 900;
    res.status(429).json({
      error: 'Authentication rate limit exceeded',
      message: 'Too many failed login attempts. Please try again after 15 minutes.',
      retryAfter: Math.max(retryAfter, 1)
    });
  }
});

// Password reset rate limiting - disabled
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100000, // Effectively disabled
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again after 1 hour',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Order creation rate limiting - disabled
export const orderRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100000, // Effectively disabled
  message: {
    error: 'Order creation rate limit exceeded',
    message: 'Please wait before creating another order',
    retryAfter: '1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Upload rate limiting - disabled
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100000, // Effectively disabled
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Slow down middleware - disabled
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100000, // Effectively disabled
  delayMs: () => 0, // No delay
  maxDelayMs: 0, // No delay
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

// Account lockout middleware - disabled
export const accountLockoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Disabled - just pass through
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