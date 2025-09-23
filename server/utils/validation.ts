import { z } from 'zod';
import validator from 'validator';
import xss from 'xss';

// Validation utility functions
export class ValidationUtils {
  // Email validation with multiple checks
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    // Basic format check
    if (!validator.isEmail(email)) return false;
    
    // Length check
    if (email.length > 255) return false;
    
    // Disposable email check (basic)
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) return false;
    
    return true;
  }
  
  // Password strength validation
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    
    if (!password || typeof password !== 'string') {
      return { isValid: false, score: 0, feedback: ['Password is required'] };
    }
    
    // Length check
    if (password.length < 8) {
      feedback.push('Password must be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 2;
    } else {
      score += 1;
    }
    
    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password must contain lowercase letters');
    
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password must contain uppercase letters');
    
    if (/[0-9]/.test(password)) score += 1;
    else feedback.push('Password must contain numbers');
    
    if (/[^a-zA-Z0-9]/.test(password)) score += 2;
    else feedback.push('Password should contain special characters');
    
    // Common patterns check
    if (/(.)\1{2,}/.test(password)) {
      feedback.push('Avoid repeating characters');
      score -= 1;
    }
    
    if (/123|abc|qwe|password/i.test(password)) {
      feedback.push('Avoid common patterns');
      score -= 2;
    }
    
    const isValid = score >= 4 && feedback.length === 0;
    
    return { isValid, score: Math.max(0, score), feedback };
  }
  
  // Phone number validation for Philippines
  static validatePhoneNumber(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Philippine mobile number patterns
    const patterns = [
      /^09\d{9}$/, // 09XXXXXXXXX
      /^639\d{9}$/, // 639XXXXXXXXX
      /^\+639\d{9}$/ // +639XXXXXXXXX
    ];
    
    return patterns.some(pattern => pattern.test(phone)) || 
           validator.isMobilePhone(phone, 'en-PH');
  }
  
  // Safe string sanitization
  static sanitizeString(input: string, options: {
    maxLength?: number;
    allowHtml?: boolean;
    allowNewlines?: boolean;
  } = {}): string {
    if (!input || typeof input !== 'string') return '';
    
    const { maxLength = 1000, allowHtml = false, allowNewlines = true } = options;
    
    let sanitized = input;
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // XSS protection
    if (!allowHtml) {
      sanitized = xss(sanitized, {
        whiteList: {},
        stripIgnoreTag: true,
        stripIgnoreTagBody: ['script', 'style']
      });
    }
    
    // Remove newlines if not allowed
    if (!allowNewlines) {
      sanitized = sanitized.replace(/[\r\n]/g, ' ');
    }
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }
  
  // File validation
  static validateFile(file: {
    filename: string;
    mimetype: string;
    size: number;
  }, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;
    
    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
    }
    
    // MIME type validation
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }
    
    // Extension validation
    if (allowedExtensions.length > 0) {
      const extension = file.filename.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        errors.push(`File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`);
      }
    }
    
    // Filename validation
    if (!/^[a-zA-Z0-9._-]+$/.test(file.filename)) {
      errors.push('Filename contains invalid characters');
    }
    
    return { isValid: errors.length === 0, errors };
  }
  
  // Coordinate validation
  static validateCoordinates(lat: number, lng: number): boolean {
    return validator.isLatLong(`${lat},${lng}`);
  }
  
  // URL validation
  static validateUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
  
  // Business-specific validations
  static validateOrderAmount(amount: number): { isValid: boolean; error?: string } {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }
    
    if (amount < 0) {
      return { isValid: false, error: 'Amount cannot be negative' };
    }
    
    if (amount > 50000) {
      return { isValid: false, error: 'Amount exceeds maximum limit of ₱50,000' };
    }
    
    // Check for reasonable decimal places (max 2)
    if (!/^\d+(\.\d{1,2})?$/.test(amount.toString())) {
      return { isValid: false, error: 'Amount can have at most 2 decimal places' };
    }
    
    return { isValid: true };
  }
  
  // Time validation
  static validateTimeString(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }
  
  // Date validation
  static validateDate(date: string): { isValid: boolean; error?: string } {
    if (!validator.isISO8601(date)) {
      return { isValid: false, error: 'Invalid date format. Use ISO 8601 format' };
    }
    
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      return { isValid: false, error: 'Invalid date' };
    }
    
    // Check if date is not too far in the past or future
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    
    if (parsed < oneYearAgo || parsed > twoYearsFromNow) {
      return { isValid: false, error: 'Date must be within reasonable range' };
    }
    
    return { isValid: true };
  }
  
  // SQL injection detection
  static detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|#|\/\*|\*\/)/,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT|ONLOAD|ONERROR|ONCLICK)\b)/i,
      /(\<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>)/gi
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }
  
  // Rate limiting key generation
  static generateRateLimitKey(req: any, type: string): string {
    const ip = req.ip || req.connection.remoteAddress;
    const userId = req.user?.id || 'anonymous';
    return `${type}:${ip}:${userId}`;
  }
}

// Zod schema builders with common patterns
export const schemaBuilders = {
  // Philippines-specific schemas
  philippinePhone: () => z.string()
    .refine(ValidationUtils.validatePhoneNumber, 'Invalid Philippine phone number'),
  
  strongPassword: () => z.string()
    .refine(
      (password) => ValidationUtils.validatePasswordStrength(password).isValid,
      (password) => ({
        message: ValidationUtils.validatePasswordStrength(password).feedback.join(', ')
      })
    ),
  
  safeText: (maxLength: number = 1000) => z.string()
    .max(maxLength)
    .transform((val) => ValidationUtils.sanitizeString(val, { maxLength })),
  
  philippineCoordinates: () => z.object({
    lat: z.number().min(4.5).max(21.5, 'Latitude outside Philippines'),
    lng: z.number().min(116).max(127, 'Longitude outside Philippines')
  }),
  
  businessHours: () => z.object({
    open: z.string().refine(ValidationUtils.validateTimeString, 'Invalid time format'),
    close: z.string().refine(ValidationUtils.validateTimeString, 'Invalid time format'),
    isClosed: z.boolean().optional()
  }),
  
  orderAmount: () => z.number()
    .refine(
      (amount) => ValidationUtils.validateOrderAmount(amount).isValid,
      (amount) => ({ message: ValidationUtils.validateOrderAmount(amount).error })
    )
};