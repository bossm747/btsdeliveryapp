import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';

// Security headers configuration
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for Vite in development
        "https://js.stripe.com",
        "https://maps.googleapis.com",
        "https://www.google.com",
        "https://www.gstatic.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:",
        "http:", // For development
        "*.googleapis.com",
        "*.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://maps.googleapis.com",
        "wss://localhost:*", // For WebSocket in development
        "ws://localhost:*"   // For WebSocket in development
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    },
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

// CORS configuration
export const corsConfig = cors({
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL
    ].filter(Boolean);
    
    // Allow all Replit domains in development
    const isReplitDomain = origin.includes('.replit.dev') || 
                          origin.includes('.replit.app') ||
                          origin.includes('.repl.co');
    
    if (allowedOrigins.includes(origin) || (process.env.NODE_ENV === 'development' && isReplitDomain)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Origin ${origin} not allowed`);
      callback(new Error('Not allowed by CORS'));
    }
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