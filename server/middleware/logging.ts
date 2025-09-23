import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Winston logger configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.prettyPrint()
  ),
  defaultMeta: {
    service: 'bts-delivery-platform',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Write security events to security.log
    new winston.transports.File({ 
      filename: 'logs/security.log',
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] || generateRequestId();
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  // Log request start
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'][0] : req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  // Capture response data
  const originalSend = res.send;
  res.send = function(body) {
    const duration = Date.now() - startTime;
    
    // Log request completion
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      responseSize: Buffer.byteLength(body),
      timestamp: new Date().toISOString()
    });
    
    // Log errors separately
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        error: body,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, body);
  };
  
  next();
};

// Security event logger
export const securityLogger = {
  logFailedLogin: (req: Request, email: string, reason: string) => {
    logger.warn('Failed login attempt', {
      event: 'failed_login',
      email,
      reason,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logSuccessfulLogin: (req: Request, userId: string, email: string) => {
    logger.info('Successful login', {
      event: 'successful_login',
      userId,
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logAccountLockout: (req: Request, identifier: string) => {
    logger.warn('Account locked due to failed attempts', {
      event: 'account_lockout',
      identifier,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logPasswordReset: (req: Request, email: string) => {
    logger.info('Password reset requested', {
      event: 'password_reset_request',
      email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logSuspiciousActivity: (req: Request, activity: string, details: any) => {
    logger.warn('Suspicious activity detected', {
      event: 'suspicious_activity',
      activity,
      details,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logDataAccess: (req: Request, userId: string, resource: string, action: string) => {
    logger.info('Data access', {
      event: 'data_access',
      userId,
      resource,
      action,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  },
  
  logPermissionDenied: (req: Request, userId: string, requiredPermission: string) => {
    logger.warn('Permission denied', {
      event: 'permission_denied',
      userId,
      requiredPermission,
      ip: req.ip,
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    });
  }
};

// Error logging middleware
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error('Unhandled error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

// Generate unique request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

// Create logs directory if it doesn't exist
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
  mkdirSync('logs');
}

export default logger;