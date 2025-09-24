/**
 * Centralized security configuration for the BTS Delivery Platform
 * This file contains all security-related configurations and constants
 */

export const SecurityConfig = {
  // Rate limiting configurations
  rateLimiting: {
    general: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
    },
    authentication: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // login attempts per window
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // reset attempts per window
    },
    orders: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // orders per minute
    },
    uploads: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 20, // uploads per window
    }
  },

  // File upload configurations
  fileUpload: {
    maxSizes: {
      profile: 5 * 1024 * 1024, // 5MB
      restaurant: 10 * 1024 * 1024, // 10MB
      menu: 5 * 1024 * 1024, // 5MB
      document: 20 * 1024 * 1024, // 20MB
      default: 10 * 1024 * 1024 // 10MB
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
    },
    allowedExtensions: {
      images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      documents: ['pdf', 'doc', 'docx'],
      all: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
    }
  },

  // Payment security configurations
  payment: {
    maxAmount: 50000, // PHP 50,000
    allowedMethods: ['nexuspay', 'gcash', 'paymaya', 'cash'],
    fraudDetection: {
      highRiskThreshold: 80,
      mediumRiskThreshold: 50,
      maxAmountWithoutReview: 10000
    }
  },

  // Authentication configurations
  authentication: {
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    attemptWindow: 15 * 60 * 1000, // 15 minutes
    passwordRequirements: {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    },
    session: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      renewThreshold: 24 * 60 * 60 * 1000 // 24 hours
    }
  },

  // CORS configurations
  cors: {
    allowedOrigins: [
      'http://localhost:5000',
      'http://localhost:3000',
      'https://localhost:5000',
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL
    ].filter(Boolean),
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
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
    ]
  },

  // Content Security Policy
  csp: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        "'unsafe-eval'", // Required for Vite in development
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
        "https://maps.googleapis.com",
        "wss://localhost:*", // For WebSocket in development
        "ws://localhost:*"   // For WebSocket in development
      ],
      frameSrc: [
        "'self'"
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"]
    }
  },

  // Logging configurations
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    securityLogRetention: 10, // 10 files for security logs
    sensitiveFields: [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'privateKey',
      'creditCard',
      'cardNumber',
      'cvv',
      'ssn',
      'sin'
    ]
  },

  // Validation configurations
  validation: {
    maxStringLength: 1000,
    maxFileNameLength: 255,
    maxEmailLength: 255,
    maxPhoneLength: 20,
    philippinePhoneRegex: /^(\+63|63|0)?9\d{9}$/,
    strongPasswordRegex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/,
    zipCodeRegex: /^\d{4}$/,
    timeRegex: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  },

  // Security monitoring
  monitoring: {
    suspiciousPatterns: [
      /(\<script\>)/i,
      /(union.*select)/i,
      /(drop.*table)/i,
      /(insert.*into)/i,
      /(update.*set)/i,
      /(delete.*from)/i,
      /(\.\.\/)/,
      /(etc\/passwd)/i,
      /(cmd\.exe)/i,
      /(\/bin\/)/i
    ],
    blockedIPs: process.env.BLOCKED_IPS?.split(',') || [],
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxUploadSize: 50 * 1024 * 1024 // 50MB
  },

  // GDPR and compliance
  gdpr: {
    dataRetentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years for financial data
    userDataRetentionPeriod: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years for user data
    consentRequired: ['marketing', 'analytics', 'profiling'],
    lawfulBasis: {
      payment: 'contract',
      userAccount: 'consent',
      orderProcessing: 'contract',
      marketing: 'consent'
    }
  },

  // Environment-specific settings
  production: {
    enableDetailedErrors: false,
    enableDebugLogging: false,
    requireHttps: true,
    enableStrictCSP: true,
    maxConcurrentConnections: 1000
  },

  development: {
    enableDetailedErrors: true,
    enableDebugLogging: true,
    requireHttps: false,
    enableStrictCSP: false,
    maxConcurrentConnections: 100
  }
};

// Environment-specific configuration getter
export const getSecurityConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const baseConfig = SecurityConfig;
  const envConfig = env === 'production' ? SecurityConfig.production : SecurityConfig.development;
  
  return {
    ...baseConfig,
    environment: envConfig
  };
};

// Security headers configuration
export const getSecurityHeaders = () => {
  const config = getSecurityConfig();
  
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'X-Content-Security-Policy': generateCSPHeader(config.csp.directives)
  };
};

// Generate CSP header string
function generateCSPHeader(directives: Record<string, string[]>): string {
  const directiveStrings = Object.entries(directives).map(
    ([directive, sources]) => `${directive} ${sources.join(' ')}`
  );
  
  return directiveStrings.join('; ');
}

export default SecurityConfig;