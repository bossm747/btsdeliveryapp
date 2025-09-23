import { z } from 'zod';

/**
 * Client-side validation utilities that mirror server-side validation
 * These should be kept in sync with server/utils/validation.ts
 */

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  philippinePhone: /^(\+63|63|0)?9\d{9}$/,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
  numbersOnly: /^\d+$/,
  lettersOnly: /^[a-zA-Z\s]+$/,
  zipCode: /^\d{4}$/,
  time24Hour: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
};

// Client-side Zod schemas for form validation
export const clientSchemas = {
  // Authentication schemas
  login: z.object({
    email: z.string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .max(255, 'Email too long'),
    password: z.string()
      .min(1, 'Password is required')
  }),
  
  register: z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
    email: z.string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .max(255, 'Email too long'),
    phone: z.string()
      .optional()
      .refine(
        (phone) => !phone || ValidationPatterns.philippinePhone.test(phone.replace(/[^\d+]/g, '')),
        'Invalid Philippine mobile number'
      ),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password too long')
      .regex(
        /(?=.*[a-z])/,
        'Password must contain at least one lowercase letter'
      )
      .regex(
        /(?=.*[A-Z])/,
        'Password must contain at least one uppercase letter'
      )
      .regex(
        /(?=.*\d)/,
        'Password must contain at least one number'
      ),
    confirmPassword: z.string(),
    role: z.enum(['customer', 'vendor', 'rider'], {
      errorMap: () => ({ message: 'Please select a valid role' })
    })
  }).refine(
    (data) => data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword']
    }
  ),
  
  // Profile update schema
  profileUpdate: z.object({
    firstName: z.string()
      .min(1, 'First name is required')
      .max(50, 'First name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'First name contains invalid characters'),
    lastName: z.string()
      .min(1, 'Last name is required')
      .max(50, 'Last name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Last name contains invalid characters'),
    phone: z.string()
      .optional()
      .refine(
        (phone) => !phone || ValidationPatterns.philippinePhone.test(phone.replace(/[^\d+]/g, '')),
        'Invalid Philippine mobile number'
      ),
    dateOfBirth: z.string()
      .optional()
      .refine(
        (date) => !date || new Date(date) < new Date(),
        'Date of birth must be in the past'
      ),
    gender: z.enum(['male', 'female', 'other']).optional()
  }),
  
  // Address schema
  address: z.object({
    title: z.string()
      .min(1, 'Address title is required')
      .max(100, 'Address title too long'),
    streetAddress: z.string()
      .min(1, 'Street address is required')
      .max(255, 'Street address too long'),
    barangay: z.string()
      .max(100, 'Barangay name too long')
      .optional(),
    city: z.string()
      .min(1, 'City is required')
      .max(100, 'City name too long'),
    province: z.string()
      .min(1, 'Province is required')
      .max(100, 'Province name too long'),
    zipCode: z.string()
      .regex(ValidationPatterns.zipCode, 'Invalid ZIP code format')
      .optional(),
    landmark: z.string()
      .max(255, 'Landmark description too long')
      .optional(),
    deliveryInstructions: z.string()
      .max(500, 'Delivery instructions too long')
      .optional(),
    isDefault: z.boolean().optional()
  }),
  
  // Restaurant creation schema
  restaurant: z.object({
    name: z.string()
      .min(1, 'Restaurant name is required')
      .max(255, 'Restaurant name too long'),
    description: z.string()
      .max(1000, 'Description too long')
      .optional(),
    category: z.string()
      .min(1, 'Category is required')
      .max(100, 'Category name too long'),
    phone: z.string()
      .refine(
        (phone) => ValidationPatterns.philippinePhone.test(phone.replace(/[^\d+]/g, '')),
        'Invalid Philippine mobile number'
      ),
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email too long')
      .optional(),
    deliveryFee: z.number()
      .min(0, 'Delivery fee cannot be negative')
      .max(1000, 'Delivery fee too high')
      .optional(),
    minimumOrder: z.number()
      .min(0, 'Minimum order cannot be negative')
      .max(10000, 'Minimum order too high')
      .optional(),
    estimatedDeliveryTime: z.number()
      .min(5, 'Delivery time must be at least 5 minutes')
      .max(180, 'Delivery time cannot exceed 3 hours')
      .optional()
  }),
  
  // Menu item schema
  menuItem: z.object({
    name: z.string()
      .min(1, 'Item name is required')
      .max(255, 'Item name too long'),
    description: z.string()
      .max(1000, 'Description too long')
      .optional(),
    price: z.number()
      .min(0, 'Price cannot be negative')
      .max(10000, 'Price too high'),
    category: z.string()
      .min(1, 'Category is required')
      .max(100, 'Category name too long'),
    preparationTime: z.number()
      .min(1, 'Preparation time must be at least 1 minute')
      .max(120, 'Preparation time cannot exceed 2 hours')
      .optional(),
    isAvailable: z.boolean().optional()
  }),
  
  // Order creation schema
  orderCreate: z.object({
    type: z.enum(['food', 'pabili', 'pabayad', 'parcel']),
    restaurantId: z.string().uuid().optional(),
    items: z.array(z.object({
      menuItemId: z.string().uuid().optional(),
      quantity: z.number()
        .min(1, 'Quantity must be at least 1')
        .max(50, 'Quantity cannot exceed 50'),
      specialInstructions: z.string()
        .max(500, 'Special instructions too long')
        .optional()
    })).min(1, 'At least one item is required'),
    paymentMethod: z.enum(['cash', 'card', 'gcash', 'paymaya', 'nexuspay']),
    specialInstructions: z.string()
      .max(500, 'Special instructions too long')
      .optional(),
    scheduledDelivery: z.string()
      .refine(
        (date) => !date || new Date(date) > new Date(),
        'Scheduled delivery must be in the future'
      )
      .optional()
  }),
  
  // Contact form schema
  contactForm: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters'),
    email: z.string()
      .min(1, 'Email is required')
      .email('Invalid email format')
      .max(255, 'Email too long'),
    subject: z.string()
      .min(1, 'Subject is required')
      .max(200, 'Subject too long'),
    message: z.string()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message too long')
  }),
  
  // Search schema
  search: z.object({
    query: z.string()
      .min(1, 'Search query is required')
      .max(100, 'Search query too long'),
    category: z.string().optional(),
    location: z.string().optional(),
    priceRange: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional()
    }).optional()
  }),
  
  // Review schema
  review: z.object({
    rating: z.number()
      .min(1, 'Rating must be at least 1 star')
      .max(5, 'Rating cannot exceed 5 stars'),
    comment: z.string()
      .max(1000, 'Review comment too long')
      .optional(),
    orderId: z.string().uuid()
  })
};

// Validation utility functions
export class ClientValidationUtils {
  // Validate Philippine mobile number
  static validatePhilippinePhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[^\d+]/g, '');
    return ValidationPatterns.philippinePhone.test(cleaned);
  }
  
  // Validate email format
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    return ValidationPatterns.email.test(email) && email.length <= 255;
  }
  
  // Validate password strength
  static validatePasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;
    
    if (!password || typeof password !== 'string') {
      return { score: 0, feedback: ['Password is required'], isStrong: false };
    }
    
    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password must be at least 8 characters');
    
    if (password.length >= 12) score += 1;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Add lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Add uppercase letters');
    
    if (/\d/.test(password)) score += 1;
    else feedback.push('Add numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    else feedback.push('Add special characters');
    
    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeating characters');
      score -= 1;
    }
    
    if (/123|abc|password/i.test(password)) {
      feedback.push('Avoid common patterns');
      score -= 1;
    }
    
    return {
      score: Math.max(0, score),
      feedback,
      isStrong: score >= 4 && feedback.length === 0
    };
  }
  
  // Validate file upload
  static validateFileUpload(
    file: File,
    options: {
      maxSize?: number;
      allowedTypes?: string[];
      allowedExtensions?: string[];
    } = {}
  ): { isValid: boolean; errors: string[] } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf']
    } = options;
    
    const errors: string[] = [];
    
    // Size check
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${maxSize / 1024 / 1024}MB`);
    }
    
    // Type check
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} not allowed`);
    }
    
    // Extension check
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
    }
    
    // Filename check
    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('Filename contains invalid characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  // Validate coordinates
  static validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
  
  // Validate Philippine coordinates specifically
  static validatePhilippineCoordinates(lat: number, lng: number): boolean {
    return lat >= 4.5 && lat <= 21.5 && lng >= 116 && lng <= 127;
  }
  
  // Validate amount (Philippine Peso)
  static validateAmount(amount: number): { isValid: boolean; error?: string } {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }
    
    if (amount < 0) {
      return { isValid: false, error: 'Amount cannot be negative' };
    }
    
    if (amount > 50000) {
      return { isValid: false, error: 'Amount cannot exceed ₱50,000' };
    }
    
    // Check decimal places
    if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
      return { isValid: false, error: 'Amount can have at most 2 decimal places' };
    }
    
    return { isValid: true };
  }
  
  // Validate time string
  static validateTime(time: string): boolean {
    return ValidationPatterns.time24Hour.test(time);
  }
  
  // Validate business hours
  static validateBusinessHours(hours: { open: string; close: string }): {
    isValid: boolean;
    error?: string;
  } {
    if (!this.validateTime(hours.open)) {
      return { isValid: false, error: 'Invalid opening time format' };
    }
    
    if (!this.validateTime(hours.close)) {
      return { isValid: false, error: 'Invalid closing time format' };
    }
    
    const openTime = new Date(`2000-01-01 ${hours.open}`);
    const closeTime = new Date(`2000-01-01 ${hours.close}`);
    
    if (closeTime <= openTime) {
      return { isValid: false, error: 'Closing time must be after opening time' };
    }
    
    return { isValid: true };
  }
}

// Form field validation helpers
export const fieldValidators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return null;
  },
  
  email: (value: string) => {
    if (!ClientValidationUtils.validateEmail(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  phone: (value: string) => {
    if (!ClientValidationUtils.validatePhilippinePhone(value)) {
      return 'Please enter a valid Philippine mobile number';
    }
    return null;
  },
  
  password: (value: string) => {
    const validation = ClientValidationUtils.validatePasswordStrength(value);
    if (!validation.isStrong) {
      return validation.feedback[0] || 'Password is not strong enough';
    }
    return null;
  },
  
  amount: (value: number) => {
    const validation = ClientValidationUtils.validateAmount(value);
    if (!validation.isValid) {
      return validation.error;
    }
    return null;
  },
  
  minLength: (min: number) => (value: string) => {
    if (value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return null;
  },
  
  maxLength: (max: number) => (value: string) => {
    if (value.length > max) {
      return `Must not exceed ${max} characters`;
    }
    return null;
  }
};