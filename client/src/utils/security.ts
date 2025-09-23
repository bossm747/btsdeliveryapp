import xss from 'xss';

/**
 * Client-side security utilities for the BTS Delivery Platform
 * These utilities help prevent XSS attacks and provide secure data handling on the frontend
 */

export class ClientSecurityUtils {
  // XSS prevention for user-generated content
  static sanitizeHTML(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return xss(input, {
      whiteList: {
        // Allow only safe HTML tags
        p: [],
        br: [],
        strong: [],
        em: [],
        u: [],
        span: ['class'],
        div: ['class']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    });
  }
  
  // Safe text content (no HTML allowed)
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    return xss(input, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
  }
  
  // Validate and sanitize URLs
  static sanitizeURL(url: string): string | null {
    if (!url || typeof url !== 'string') return null;
    
    try {
      const parsed = new URL(url);
      
      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      
      // Block potentially dangerous domains
      const blockedDomains = [
        'javascript',
        'data',
        'vbscript',
        'file',
        'ftp'
      ];
      
      if (blockedDomains.some(domain => parsed.hostname.includes(domain))) {
        return null;
      }
      
      return parsed.toString();
    } catch {
      return null;
    }
  }
  
  // Content Security Policy helpers
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Input validation helpers
  static validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }
  
  static validatePhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    // Philippine mobile number patterns
    const phoneRegex = /^(\+63|63|0)?9\d{9}$/;
    return phoneRegex.test(phone.replace(/[^\d+]/g, ''));
  }
  
  static validatePassword(password: string): {
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
}

/**
 * Secure local storage management
 */
export class SecureStorage {
  private static readonly prefix = 'bts_';
  private static readonly encryptionKey = 'bts-delivery-key'; // In production, use a proper key
  
  // Encrypt data before storing
  private static encrypt(data: string): string {
    // Simple XOR encryption for client-side (not cryptographically secure)
    // In production, consider using Web Crypto API for better security
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
      );
    }
    return btoa(encrypted);
  }
  
  // Decrypt data after retrieving
  private static decrypt(encryptedData: string): string {
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        decrypted += String.fromCharCode(
          data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length)
        );
      }
      return decrypted;
    } catch {
      return '';
    }
  }
  
  // Store data securely
  static setItem(key: string, value: any): void {
    try {
      const prefixedKey = this.prefix + key;
      const stringValue = JSON.stringify(value);
      const encryptedValue = this.encrypt(stringValue);
      localStorage.setItem(prefixedKey, encryptedValue);
    } catch (error) {
      console.error('SecureStorage: Failed to store item', error);
    }
  }
  
  // Retrieve data securely
  static getItem<T>(key: string, defaultValue: T | null = null): T | null {
    try {
      const prefixedKey = this.prefix + key;
      const encryptedValue = localStorage.getItem(prefixedKey);
      
      if (!encryptedValue) return defaultValue;
      
      const decryptedValue = this.decrypt(encryptedValue);
      return JSON.parse(decryptedValue);
    } catch (error) {
      console.error('SecureStorage: Failed to retrieve item', error);
      return defaultValue;
    }
  }
  
  // Remove data
  static removeItem(key: string): void {
    const prefixedKey = this.prefix + key;
    localStorage.removeItem(prefixedKey);
  }
  
  // Clear all BTS data
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
  
  // Check if item exists
  static hasItem(key: string): boolean {
    const prefixedKey = this.prefix + key;
    return localStorage.getItem(prefixedKey) !== null;
  }
}

/**
 * API error handling utilities
 */

// Standardized error response interface
interface APIError {
  error: string;
  message: string;
  type?: string;
  details?: any;
  timestamp: string;
  statusCode: number;
}

export class APIErrorHandler {
  
  // Handle API errors consistently
  static handleError(error: any): {
    message: string;
    type: string;
    statusCode: number;
    details?: any;
  } {
    // Network errors
    if (!error.response) {
      return {
        message: 'Network error. Please check your connection and try again.',
        type: 'NETWORK_ERROR',
        statusCode: 0
      };
    }
    
    const { status, data } = error.response;
    
    // API error responses
    if (data && typeof data === 'object') {
      return {
        message: data.message || 'An error occurred',
        type: data.type || 'API_ERROR',
        statusCode: status,
        details: data.details
      };
    }
    
    // HTTP status code based messages
    switch (status) {
      case 400:
        return {
          message: 'Invalid request. Please check your input and try again.',
          type: 'VALIDATION_ERROR',
          statusCode: status
        };
      case 401:
        return {
          message: 'Authentication required. Please log in and try again.',
          type: 'AUTHENTICATION_ERROR',
          statusCode: status
        };
      case 403:
        return {
          message: 'You do not have permission to perform this action.',
          type: 'AUTHORIZATION_ERROR',
          statusCode: status
        };
      case 404:
        return {
          message: 'The requested resource was not found.',
          type: 'NOT_FOUND_ERROR',
          statusCode: status
        };
      case 429:
        return {
          message: 'Too many requests. Please wait and try again.',
          type: 'RATE_LIMIT_ERROR',
          statusCode: status
        };
      case 500:
        return {
          message: 'Server error. Please try again later.',
          type: 'INTERNAL_ERROR',
          statusCode: status
        };
      default:
        return {
          message: 'An unexpected error occurred. Please try again.',
          type: 'UNKNOWN_ERROR',
          statusCode: status
        };
    }
  }
  
  // Check if error requires user re-authentication
  static requiresReauth(error: any): boolean {
    return error.response?.status === 401 || 
           error.response?.data?.type === 'AUTHENTICATION_ERROR';
  }
  
  // Check if error is due to rate limiting
  static isRateLimited(error: any): boolean {
    return error.response?.status === 429 ||
           error.response?.data?.type === 'RATE_LIMIT_ERROR';
  }
}

/**
 * Form validation hooks and utilities
 */
export class FormValidation {
  // Real-time validation for inputs
  static validateField(fieldType: string, value: string): {
    isValid: boolean;
    error?: string;
  } {
    switch (fieldType) {
      case 'email':
        if (!ClientSecurityUtils.validateEmail(value)) {
          return { isValid: false, error: 'Please enter a valid email address' };
        }
        break;
        
      case 'phone':
        if (!ClientSecurityUtils.validatePhone(value)) {
          return { isValid: false, error: 'Please enter a valid Philippine mobile number' };
        }
        break;
        
      case 'password':
        const passwordCheck = ClientSecurityUtils.validatePassword(value);
        if (!passwordCheck.isValid) {
          return { isValid: false, error: passwordCheck.feedback[0] };
        }
        break;
        
      case 'required':
        if (!value || value.trim().length === 0) {
          return { isValid: false, error: 'This field is required' };
        }
        break;
        
      case 'name':
        if (!value || value.trim().length < 2) {
          return { isValid: false, error: 'Name must be at least 2 characters long' };
        }
        if (!/^[a-zA-Z\s'-]+$/.test(value)) {
          return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
        }
        break;
        
      case 'amount':
        const numericValue = parseFloat(value);
        if (isNaN(numericValue) || numericValue < 0) {
          return { isValid: false, error: 'Please enter a valid amount' };
        }
        if (numericValue > 50000) {
          return { isValid: false, error: 'Amount cannot exceed ₱50,000' };
        }
        break;
    }
    
    return { isValid: true };
  }
  
  // Sanitize form data before submission
  static sanitizeFormData(formData: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(formData)) {
      if (typeof value === 'string') {
        // Sanitize string fields based on their purpose
        if (key.includes('email')) {
          sanitized[key] = value.trim().toLowerCase();
        } else if (key.includes('phone')) {
          sanitized[key] = value.replace(/[^\d+]/g, '');
        } else if (key.includes('name') || key.includes('address')) {
          sanitized[key] = ClientSecurityUtils.sanitizeText(value.trim());
        } else {
          sanitized[key] = ClientSecurityUtils.sanitizeText(value);
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}

/**
 * Security-focused React hooks
 */
export const useSecureForm = () => {
  const validateAndSanitize = (formData: Record<string, any>) => {
    return FormValidation.sanitizeFormData(formData);
  };
  
  const validateField = (fieldType: string, value: string) => {
    return FormValidation.validateField(fieldType, value);
  };
  
  return { validateAndSanitize, validateField };
};

export const useSecureStorage = () => {
  return {
    setItem: SecureStorage.setItem,
    getItem: SecureStorage.getItem,
    removeItem: SecureStorage.removeItem,
    clear: SecureStorage.clear,
    hasItem: SecureStorage.hasItem
  };
};

export const useAPIErrorHandler = () => {
  return {
    handleError: APIErrorHandler.handleError,
    requiresReauth: APIErrorHandler.requiresReauth,
    isRateLimited: APIErrorHandler.isRateLimited
  };
};