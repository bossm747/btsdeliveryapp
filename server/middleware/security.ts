import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Allowed origins for CORS (configure via environment)
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  
  // Default allowed origins
  if (process.env.NODE_ENV === 'production') {
    return [
      process.env.PUBLIC_APP_URL || 'https://bts.delivery',
      'https://app.bts.delivery',
      'https://admin.bts.delivery'
    ].filter(Boolean);
  }
  
  // Development - allow localhost
  return [
    'http://localhost:5173',
    'http://localhost:5001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5001'
  ];
};

// Security headers configuration
export const securityHeaders = helmet({
  // Content Security Policy - properly configured for production
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in dev, should be removed with proper nonce in prod
        "'unsafe-eval'", // Required for some React dev tools, remove in production
        "https://maps.googleapis.com",
        "https://www.googletagmanager.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline styles
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "https://maps.googleapis.com",
        "https://maps.gstatic.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://maps.googleapis.com",
        "https://nexuspay.cloud",
        "wss:", // WebSocket connections
        "ws:"  // WebSocket connections (dev)
      ],
      frameSrc: [
        "'self'",
        "https://nexuspay.cloud" // For payment iframes if needed
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"], // Prevent clickjacking
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : undefined
    }
  },
  
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

// CORS configuration - properly restricted
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    // In production, you may want to restrict this further
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Log blocked CORS attempt
    console.warn(`CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
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