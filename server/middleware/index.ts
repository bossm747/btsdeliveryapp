/**
 * Centralized security middleware exports
 * This file provides a single point of import for all security middleware
 */

// Import all middleware functions
import {
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrVendor,
  requireAdminOrRider,
  auditLog
} from './auth';

import {
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  orderRateLimit,
  uploadRateLimit,
  speedLimiter,
  accountLockoutMiddleware,
  recordFailedLogin,
  recordSuccessfulLogin
} from './rateLimiting';

import {
  securityHeaders,
  corsConfig,
  sanitizeRequest,
  securityResponseHeaders,
  validateIP,
  requestSizeLimit,
  securityAudit
} from './security';

import {
  logger,
  requestLogger,
  securityLogger,
  errorLogger
} from './logging';

import {
  validateRequest,
  sanitizeInput,
  commonSchemas,
  authSchemas,
  userSchemas,
  orderSchemas,
  restaurantSchemas,
  paymentSchemas,
  fileSchemas
} from './validation';

import {
  errorHandler,
  AppError,
  ErrorType,
  asyncHandler,
  notFoundHandler,
  createErrors
} from './errorHandler';

import {
  fileUploadMiddleware,
  uploadProfileImage,
  uploadRestaurantImages,
  uploadMenuItemImage,
  uploadDocuments,
  cleanupFiles,
  upload
} from './fileUpload';

import {
  pciComplianceMiddleware,
  validatePaymentAmount,
  validatePaymentMethod,
  verifyWebhookSignature,
  fraudDetection,
  encryptPaymentData,
  auditPaymentTransaction,
  gdprPaymentCompliance,
  enhancedPaymentSecurity
} from './paymentSecurity';

import {
  requireNexusPayWebhookSignature,
  createWebhookVerifier,
  webhookIdempotency
} from './webhook-security';

import {
  globalRouteGuard,
  routeAuditLogger,
  addPublicRoute,
  isPublicRoute
} from './route-guard';

import {
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  checkTokenRevocation,
  getBlacklistStats
} from './token-revocation';

// Re-export all middleware functions
export {
  // Authentication and Authorization
  authenticateToken,
  optionalAuthenticateToken,
  requireRole,
  requireAdmin,
  requireAdminOrVendor,
  requireAdminOrRider,
  auditLog,
  // Rate Limiting
  generalRateLimit,
  authRateLimit,
  passwordResetRateLimit,
  orderRateLimit,
  uploadRateLimit,
  speedLimiter,
  accountLockoutMiddleware,
  recordFailedLogin,
  recordSuccessfulLogin,
  // Security Headers and CORS
  securityHeaders,
  corsConfig,
  sanitizeRequest,
  securityResponseHeaders,
  validateIP,
  requestSizeLimit,
  securityAudit,
  // Logging and Monitoring
  logger,
  requestLogger,
  securityLogger,
  errorLogger,
  // Validation and Sanitization
  validateRequest,
  sanitizeInput,
  commonSchemas,
  authSchemas,
  userSchemas,
  orderSchemas,
  restaurantSchemas,
  paymentSchemas,
  fileSchemas,
  // Error Handling
  errorHandler,
  AppError,
  ErrorType,
  asyncHandler,
  notFoundHandler,
  createErrors,
  // File Upload Security
  fileUploadMiddleware,
  uploadProfileImage,
  uploadRestaurantImages,
  uploadMenuItemImage,
  uploadDocuments,
  cleanupFiles,
  upload,
  // Payment Security
  pciComplianceMiddleware,
  validatePaymentAmount,
  validatePaymentMethod,
  verifyWebhookSignature,
  fraudDetection,
  encryptPaymentData,
  auditPaymentTransaction,
  gdprPaymentCompliance,
  enhancedPaymentSecurity,
  // Webhook Security
  requireNexusPayWebhookSignature,
  createWebhookVerifier,
  webhookIdempotency,
  // Route Guard (Global Auth Enforcement)
  globalRouteGuard,
  routeAuditLogger,
  addPublicRoute,
  isPublicRoute,
  // Token Revocation
  revokeToken,
  revokeAllUserTokens,
  isTokenRevoked,
  checkTokenRevocation,
  getBlacklistStats
};


// Middleware configurations for different route types
export const securityMiddlewareConfig = {
  // Basic security for all routes
  basic: [
    requestLogger,
    securityHeaders,
    corsConfig,
    generalRateLimit,
    speedLimiter,
    sanitizeRequest,
    securityResponseHeaders,
    validateIP,
    securityAudit
  ],
  
  // Authentication routes
  auth: [
    requestLogger,
    securityHeaders,
    corsConfig,
    authRateLimit,
    accountLockoutMiddleware,
    sanitizeInput,
    securityResponseHeaders,
    validateIP
  ],
  
  // Password reset routes
  passwordReset: [
    requestLogger,
    securityHeaders,
    corsConfig,
    passwordResetRateLimit,
    sanitizeInput,
    securityResponseHeaders,
    validateIP
  ],
  
  // Protected routes (requires authentication)
  protected: [
    requestLogger,
    securityHeaders,
    corsConfig,
    generalRateLimit,
    speedLimiter,
    sanitizeRequest,
    securityResponseHeaders,
    validateIP,
    securityAudit
  ],
  
  // Admin routes
  admin: [
    requestLogger,
    securityHeaders,
    corsConfig,
    generalRateLimit,
    sanitizeRequest,
    securityResponseHeaders,
    validateIP,
    securityAudit
  ],
  
  // Payment routes
  payment: [
    requestLogger,
    securityHeaders,
    corsConfig,
    generalRateLimit,
    pciComplianceMiddleware,
    sanitizeInput,
    validatePaymentAmount,
    validatePaymentMethod,
    fraudDetection,
    encryptPaymentData,
    auditPaymentTransaction,
    gdprPaymentCompliance,
    securityResponseHeaders,
    validateIP
  ],
  
  // File upload routes
  upload: [
    requestLogger,
    securityHeaders,
    corsConfig,
    uploadRateLimit,
    requestSizeLimit(50 * 1024 * 1024), // 50MB for file uploads
    sanitizeInput,
    securityResponseHeaders,
    validateIP
  ],
  
  // Webhook routes (NexusPay)
  nexusPayWebhook: [
    requestLogger,
    securityHeaders,
    corsConfig,
    requestSizeLimit(1024 * 1024), // 1MB for webhooks
    validateIP,
    requireNexusPayWebhookSignature,
    webhookIdempotency,
    securityResponseHeaders
  ],
  
  // Generic webhook routes (legacy)
  webhook: [
    requestLogger,
    securityHeaders,
    corsConfig,
    requestSizeLimit(1024 * 1024), // 1MB for webhooks
    validateIP,
    securityResponseHeaders
  ],
  
  // Public API routes
  public: [
    requestLogger,
    securityHeaders,
    corsConfig,
    generalRateLimit,
    speedLimiter,
    sanitizeRequest,
    securityResponseHeaders,
    validateIP
  ]
};

// Helper function to apply middleware stack
export const applyMiddleware = (app: any, routes: any[]) => {
  routes.forEach(route => {
    const { path, method, middleware, handler } = route;
    const middlewareStack = Array.isArray(middleware) ? middleware : [middleware];
    
    switch (method.toLowerCase()) {
      case 'get':
        app.get(path, ...middlewareStack, asyncHandler(handler));
        break;
      case 'post':
        app.post(path, ...middlewareStack, asyncHandler(handler));
        break;
      case 'put':
        app.put(path, ...middlewareStack, asyncHandler(handler));
        break;
      case 'patch':
        app.patch(path, ...middlewareStack, asyncHandler(handler));
        break;
      case 'delete':
        app.delete(path, ...middlewareStack, asyncHandler(handler));
        break;
    }
  });
};