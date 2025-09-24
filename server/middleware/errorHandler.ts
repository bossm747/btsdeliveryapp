import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from './logging';

// Error types for classification
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  DATABASE = 'DATABASE_ERROR',
  INTERNAL = 'INTERNAL_ERROR'
}

// Custom error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  type?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
  statusCode: number;
}

// Main error handling middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;
  
  // Convert known errors to AppError
  if (!(error instanceof AppError)) {
    error = convertToAppError(err);
  }
  
  const appError = error as AppError;
  
  // Log error details
  logError(appError, req);
  
  // Send error response
  const errorResponse = createErrorResponse(appError, req);
  
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !appError.isOperational) {
    errorResponse.message = 'Internal server error';
    errorResponse.details = undefined;
  }
  
  res.status(appError.statusCode).json(errorResponse);
};

// Convert different error types to AppError
function convertToAppError(err: Error): AppError {
  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }));
    
    return new AppError(
      'Validation failed',
      ErrorType.VALIDATION,
      400,
      true,
      details
    );
  }
  
  // Database errors (PostgreSQL)
  if (err.message.includes('duplicate key value')) {
    return new AppError(
      'Resource already exists',
      ErrorType.CONFLICT,
      409,
      true
    );
  }
  
  if (err.message.includes('foreign key constraint')) {
    return new AppError(
      'Referenced resource not found',
      ErrorType.NOT_FOUND,
      404,
      true
    );
  }
  
  if (err.message.includes('violates check constraint')) {
    return new AppError(
      'Invalid data provided',
      ErrorType.VALIDATION,
      400,
      true
    );
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new AppError(
      'Invalid authentication token',
      ErrorType.AUTHENTICATION,
      401,
      true
    );
  }
  
  if (err.name === 'TokenExpiredError') {
    return new AppError(
      'Authentication token expired',
      ErrorType.AUTHENTICATION,
      401,
      true
    );
  }
  
  // Default to internal server error
  return new AppError(
    err.message || 'Internal server error',
    ErrorType.INTERNAL,
    500,
    false
  );
}

// Log error details
function logError(error: AppError, req: Request) {
  const logData = {
    error: {
      type: error.type,
      message: error.message,
      stack: error.stack,
      details: error.details
    },
    request: {
      id: req.requestId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      user: req.user?.id || 'anonymous'
    },
    timestamp: new Date().toISOString()
  };
  
  if (error.statusCode >= 500) {
    logger.error('Server error occurred', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error occurred', logData);
  } else {
    logger.info('Error handled', logData);
  }
}

// Create standardized error response
function createErrorResponse(error: AppError, req: Request): ErrorResponse {
  return {
    error: getErrorTitle(error.type),
    message: error.message,
    type: error.type,
    details: error.details,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
    statusCode: error.statusCode
  };
}

// Get user-friendly error titles
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.VALIDATION:
      return 'Validation Error';
    case ErrorType.AUTHENTICATION:
      return 'Authentication Error';
    case ErrorType.AUTHORIZATION:
      return 'Authorization Error';
    case ErrorType.NOT_FOUND:
      return 'Resource Not Found';
    case ErrorType.CONFLICT:
      return 'Resource Conflict';
    case ErrorType.RATE_LIMIT:
      return 'Rate Limit Exceeded';
    case ErrorType.BUSINESS_LOGIC:
      return 'Business Logic Error';
    case ErrorType.EXTERNAL_SERVICE:
      return 'External Service Error';
    case ErrorType.DATABASE:
      return 'Database Error';
    default:
      return 'Internal Server Error';
  }
}

// Async error wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `Route ${req.method} ${req.originalUrl} not found`,
    ErrorType.NOT_FOUND,
    404
  );
  next(error);
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled promise rejection', {
    reason,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
  
  // Optionally shut down gracefully
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Uncaught exception handler
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date().toISOString()
  });
  
  // Shut down gracefully
  process.exit(1);
});

// Common error creators for reuse
export const createErrors = {
  validation: (message: string, details?: any) => 
    new AppError(message, ErrorType.VALIDATION, 400, true, details),
  
  authentication: (message: string = 'Authentication required') => 
    new AppError(message, ErrorType.AUTHENTICATION, 401),
  
  authorization: (message: string = 'Insufficient permissions') => 
    new AppError(message, ErrorType.AUTHORIZATION, 403),
  
  notFound: (resource: string = 'Resource') => 
    new AppError(`${resource} not found`, ErrorType.NOT_FOUND, 404),
  
  conflict: (message: string) => 
    new AppError(message, ErrorType.CONFLICT, 409),
  
  businessLogic: (message: string) => 
    new AppError(message, ErrorType.BUSINESS_LOGIC, 422),
  
  externalService: (service: string, message: string) => 
    new AppError(`${service}: ${message}`, ErrorType.EXTERNAL_SERVICE, 502),
  
  database: (message: string) => 
    new AppError(message, ErrorType.DATABASE, 500),
  
  internal: (message: string = 'Internal server error') => 
    new AppError(message, ErrorType.INTERNAL, 500, false)
};