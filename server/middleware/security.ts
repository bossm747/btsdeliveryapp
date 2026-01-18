import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Security headers configuration
export const securityHeaders = helmet({
  // Content Security Policy - disabled for now to debug blank page issue
  contentSecurityPolicy: false,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Frame-Options
  frameguard: { action: 'deny' },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // Expect-CT is deprecated and removed from helmet
  // expectCt: {
  //   maxAge: 30,
  //   enforce: true
  // }
});

// CORS configuration - allow all origins for now during VPS setup
export const corsConfig = cors({
  origin: true, // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-File-Name',
    'X-File-Size',
    'X-File-Type'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Response-Time'
  ],
  maxAge: 86400 // 24 hours
});

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize URL parameters
  if (req.params) {
    for (const [key, value] of Object.entries(req.params)) {
      if (typeof value === 'string') {
        req.params[key] = sanitizeString(value);
      }
    }
  }
  
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = sanitizeString(value);
      }
    }
  }
  
  // Sanitize request body (be careful with file uploads)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// String sanitization function
function sanitizeString(str: string): string {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes
  str = str.replace(/\0/g, '');
  
  // Trim whitespace
  str = str.trim();
  
  // Limit length to prevent buffer overflow attacks
  if (str.length > 10000) {
    str = str.substring(0, 10000);
  }
  
  return str;
}

// Object sanitization function
function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    
    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeString(value);
    } else if (typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeObject(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }
  
  return sanitized;
}

// Generate unique request ID
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Security response headers middleware
export const securityResponseHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Add custom security headers
  res.setHeader('X-Request-ID', (req.headers['x-request-id'] as string) || generateRequestId());
  res.setHeader('X-Response-Time', Date.now().toString());
  
  // Remove sensitive headers in production
  if (process.env.NODE_ENV === 'production') {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
  }
  
  next();
};

// IP validation middleware
export const validateIP = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress;
  
  // Block known malicious IPs (this would typically come from a threat intelligence feed)
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  
  if (clientIP && blockedIPs.includes(clientIP)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Your IP address has been blocked'
    });
  }
  
  // Rate limit by IP ranges if needed
  // This is a placeholder for more sophisticated IP-based blocking
  
  next();
};

// Request size limiting middleware
export const requestSizeLimit = (maxSize: number = 10 * 1024 * 1024) => { // Default 10MB
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Request too large',
        message: `Request size exceeds limit of ${maxSize / 1024 / 1024}MB`,
        maxSize: maxSize
      });
    }
    
    next();
  };
};

// Security audit middleware
export const securityAudit = (req: Request, res: Response, next: NextFunction) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /(\<script\>)/i,
    /(union.*select)/i,
    /(drop.*table)/i,
    /(insert.*into)/i,
    /(update.*set)/i,
    /(delete.*from)/i,
    /\.\.\//i,
    /(etc\/passwd)/i,
    /(cmd\.exe)/i,
    /(\/bin\/)/i
  ];
  
  const requestString = JSON.stringify({
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern && pattern.test(requestString)) {
      console.warn(`SECURITY WARNING: Suspicious request detected from IP ${req.ip}:`, {
        pattern: pattern.toString(),
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
      // You might want to block the request or just log it
      // For now, we'll just log and continue
      break;
    }
  }
  
  next();
};