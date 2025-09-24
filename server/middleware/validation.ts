import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';
import xss from 'xss';
import validator from 'validator';

// Validation middleware factory
export const validateRequest = (schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      
      // Validate query parameters
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      
      // Validate URL parameters
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid request data',
          details: validationError.details,
          fields: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Validation processing failed'
      });
    }
  };
};

// XSS sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Recursive object sanitization
function sanitizeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return sanitizeValue(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip certain fields that shouldn't be sanitized (like passwords)
    const skipSanitization = [
      'password',
      'passwordHash',
      'token',
      'signature',
      'hash'
    ].includes(key);
    
    if (skipSanitization && typeof value === 'string') {
      sanitized[key] = value;
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }
  
  return sanitized;
}

function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Use XSS library to sanitize HTML/JavaScript
    return xss(value, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    });
  }
  return value;
}

// Common validation schemas
export const commonSchemas = {
  // Email validation
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .refine(
      (email) => validator.isEmail(email),
      'Invalid email format'
    ),
  
  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine(
      (password) => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password),
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  
  // Phone validation
  phone: z.string()
    .optional()
    .refine(
      (phone) => !phone || validator.isMobilePhone(phone, 'any'),
      'Invalid phone number format'
    ),
  
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Positive integer
  positiveInteger: z.number().int().positive('Must be a positive integer'),
  
  // Non-negative number
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  
  // Safe string (no HTML/script tags)
  safeString: z.string()
    .max(1000, 'Text too long')
    .refine(
      (str) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(str),
      'Script tags not allowed'
    ),
  
  // URL validation
  url: z.string().url('Invalid URL format').optional(),
  
  // Date validation
  dateString: z.string().refine(
    (date) => validator.isISO8601(date),
    'Invalid date format. Use ISO 8601 format'
  ),
  
  // Coordinates validation
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  
  // File validation
  fileUpload: z.object({
    filename: z.string().min(1, 'Filename required'),
    mimetype: z.string().min(1, 'MIME type required'),
    size: z.number().positive('File size must be positive')
  })
};

// Authentication schemas
export const authSchemas = {
  register: z.object({
    firstName: z.string().min(1, 'First name required').max(1000, 'Text too long'),
    lastName: z.string().min(1, 'Last name required').max(1000, 'Text too long'),
    email: commonSchemas.email,
    phone: commonSchemas.phone,
    password: commonSchemas.password,
    role: z.enum(['customer', 'vendor', 'rider'], {
      errorMap: () => ({ message: 'Invalid role' })
    }),
    dateOfBirth: commonSchemas.dateString.optional(),
    gender: z.enum(['male', 'female', 'other']).optional()
  }),
  
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password required')
  }),
  
  resetPassword: z.object({
    token: z.string().min(1, 'Reset token required'),
    password: commonSchemas.password
  }),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: commonSchemas.password
  })
};

// User schemas
export const userSchemas = {
  updateProfile: z.object({
    firstName: z.string().min(1).max(1000, 'Text too long').optional(),
    lastName: z.string().min(1).max(1000, 'Text too long').optional(),
    phone: commonSchemas.phone,
    dateOfBirth: commonSchemas.dateString.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    emergencyContact: commonSchemas.safeString.optional(),
    emergencyPhone: commonSchemas.phone
  }),
  
  address: z.object({
    title: z.string().min(1, 'Address title required').max(1000, 'Text too long'),
    streetAddress: z.string().min(1, 'Street address required').max(1000, 'Text too long'),
    barangay: z.string().max(1000, 'Text too long').optional(),
    city: z.string().min(1, 'City required').max(1000, 'Text too long'),
    province: z.string().min(1, 'Province required').max(1000, 'Text too long'),
    zipCode: z.string().regex(/^\d{4}$/, 'Invalid ZIP code format').optional(),
    landmark: z.string().max(1000, 'Text too long').optional(),
    deliveryInstructions: z.string().max(1000, 'Text too long').optional(),
    coordinates: z.object({
      lat: commonSchemas.latitude,
      lng: commonSchemas.longitude
    }).optional(),
    isDefault: z.boolean().optional()
  })
};

// Order schemas
export const orderSchemas = {
  create: z.object({
    type: z.enum(['food', 'pabili', 'pabayad', 'parcel']),
    restaurantId: commonSchemas.uuid.optional(),
    items: z.array(z.object({
      menuItemId: commonSchemas.uuid.optional(),
      quantity: commonSchemas.positiveInteger,
      modifiers: z.array(z.object({
        modifierId: commonSchemas.uuid,
        optionId: commonSchemas.uuid
      })).optional(),
      specialInstructions: commonSchemas.safeString.optional(),
      customItem: z.object({
        name: commonSchemas.safeString,
        price: commonSchemas.nonNegativeNumber,
        description: commonSchemas.safeString.optional()
      }).optional()
    })),
    deliveryAddress: userSchemas.address,
    paymentMethod: z.enum(['cash', 'card', 'gcash', 'paymaya', 'nexuspay']),
    specialInstructions: commonSchemas.safeString.optional(),
    scheduledDelivery: commonSchemas.dateString.optional()
  }),
  
  update: z.object({
    status: z.enum([
      'pending', 'confirmed', 'preparing', 'ready', 
      'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'
    ]).optional(),
    estimatedDeliveryTime: commonSchemas.dateString.optional(),
    actualDeliveryTime: commonSchemas.dateString.optional(),
    cancellationReason: commonSchemas.safeString.optional()
  })
};

// Restaurant schemas
export const restaurantSchemas = {
  create: z.object({
    name: z.string().min(1, 'Restaurant name required').max(1000, 'Text too long'),
    description: z.string().max(1000, 'Text too long').optional(),
    category: z.string().min(1, 'Category required').max(1000, 'Text too long'),
    address: z.object({
      street: z.string().min(1, 'Street address required').max(1000, 'Text too long'),
      barangay: z.string().max(1000, 'Text too long').optional(),
      city: z.string().min(1, 'City required').max(1000, 'Text too long'),
      province: z.string().min(1, 'Province required').max(1000, 'Text too long'),
      zipCode: z.string().regex(/^\d{4}$/, 'Invalid ZIP code').optional()
    }),
    phone: commonSchemas.phone,
    email: commonSchemas.email.optional(),
    operatingHours: z.record(z.object({
      open: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      close: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      isClosed: z.boolean().optional()
    })).optional(),
    deliveryFee: commonSchemas.nonNegativeNumber.optional(),
    minimumOrder: commonSchemas.nonNegativeNumber.optional(),
    estimatedDeliveryTime: commonSchemas.positiveInteger.optional()
  }),
  
  menuItem: z.object({
    name: z.string().min(1, 'Item name required').max(1000, 'Text too long'),
    description: z.string().max(1000, 'Text too long').optional(),
    price: commonSchemas.nonNegativeNumber,
    category: z.string().min(1, 'Category required').max(1000, 'Text too long'),
    isAvailable: z.boolean().optional(),
    preparationTime: commonSchemas.positiveInteger.optional(),
    allergens: z.array(commonSchemas.safeString).optional(),
    nutritionalInfo: z.object({
      calories: commonSchemas.positiveInteger.optional(),
      protein: commonSchemas.nonNegativeNumber.optional(),
      carbs: commonSchemas.nonNegativeNumber.optional(),
      fat: commonSchemas.nonNegativeNumber.optional()
    }).optional()
  })
};

// Payment schemas
export const paymentSchemas = {
  create: z.object({
    orderId: commonSchemas.uuid,
    amount: commonSchemas.nonNegativeNumber,
    currency: z.string().length(3, 'Invalid currency code').default('PHP'),
    paymentMethod: z.enum(['nexuspay', 'gcash', 'paymaya']),
    metadata: z.record(z.any()).optional()
  }),
  
  webhook: z.object({
    signature: z.string().min(1, 'Webhook signature required'),
    payload: z.any()
  })
};

// File upload schemas
export const fileSchemas = {
  upload: z.object({
    file: commonSchemas.fileUpload,
    type: z.enum(['profile', 'restaurant', 'menu', 'proof', 'document']),
    entityId: commonSchemas.uuid.optional()
  })
};