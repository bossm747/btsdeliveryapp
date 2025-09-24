import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ValidationUtils } from './validation';

// Security utility functions
export class SecurityUtils {
  // Generate cryptographically secure random tokens
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  // Generate secure random numbers
  static generateSecureNumber(min: number = 100000, max: number = 999999): number {
    const range = max - min + 1;
    const bytesNeeded = Math.ceil(Math.log2(range) / 8);
    const maxValue = Math.pow(256, bytesNeeded);
    const randomValue = crypto.randomBytes(bytesNeeded).readUIntBE(0, bytesNeeded);
    
    return min + (randomValue % range);
  }
  
  // Hash passwords with bcrypt
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Increased for better security
    return bcrypt.hash(password, saltRounds);
  }
  
  // Verify password against hash
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  // Generate JWT tokens with proper claims
  static generateJWT(payload: any, options: {
    expiresIn?: string;
    issuer?: string;
    audience?: string;
  } = {}): string {
    const {
      expiresIn = '7d',
      issuer = 'bts-delivery',
      audience = 'bts-users'
    } = options;
    
    const secret = process.env.JWT_SECRET!;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.sign(payload, secret, {
      expiresIn: expiresIn as string | number,
      issuer,
      audience,
      subject: payload.userId?.toString(),
      jwtid: this.generateSecureToken(16)
    } as jwt.SignOptions);
  }
  
  // Verify JWT tokens
  static verifyJWT(token: string): any {
    const secret = process.env.JWT_SECRET!;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    return jwt.verify(token, secret, {
      issuer: 'bts-delivery',
      audience: 'bts-users'
    });
  }
  
  // Encrypt sensitive data with proper AES-256-GCM implementation
  static encryptData(data: string, key?: string): string {
    // Use fixed key from environment, never generate random keys
    const encryptionKey = key || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not configured - set ENCRYPTION_KEY environment variable');
    }
    
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = encryptionKey.length === 32 
      ? Buffer.from(encryptionKey, 'utf8')
      : crypto.createHash('sha256').update(encryptionKey).digest();
    
    const iv = crypto.randomBytes(16); // 16 bytes IV for AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  // Decrypt sensitive data with proper AES-256-GCM implementation
  static decryptData(encryptedData: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('Encryption key not configured - set ENCRYPTION_KEY environment variable');
    }
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format - expected iv:authTag:encrypted');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = encryptionKey.length === 32 
      ? Buffer.from(encryptionKey, 'utf8')
      : crypto.createHash('sha256').update(encryptionKey).digest();
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Hash sensitive data (one-way)
  static hashData(data: string, salt?: string): string {
    const hashSalt = salt || this.generateSecureToken(16);
    return crypto.pbkdf2Sync(data, hashSalt, 100000, 32, 'sha256').toString('hex');
  }
  
  // Generate HMAC signatures
  static generateHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }
  
  // Verify HMAC signatures
  static verifyHMAC(data: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateHMAC(data, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
  
  // Mask sensitive data for logging
  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'secret',
      'apiKey',
      'privateKey',
      'creditCard',
      'ssn',
      'sin'
    ];
    
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        if (typeof masked[field] === 'string') {
          const value = masked[field] as string;
          masked[field] = value.length > 4 
            ? '*'.repeat(value.length - 4) + value.slice(-4)
            : '****';
        } else {
          masked[field] = '[MASKED]';
        }
      }
    }
    
    return masked;
  }
  
  // Generate secure session IDs
  static generateSessionId(): string {
    return this.generateSecureToken(32);
  }
  
  // PCI DSS compliant credit card masking
  static maskCreditCard(cardNumber: string): string {
    if (!cardNumber || typeof cardNumber !== 'string') return '';
    
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return '[INVALID]';
    
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
  
  // Generate secure encryption key for production deployment
  static generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // Validate encryption key format
  static validateEncryptionKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    
    // Key should be either 32 bytes as hex (64 chars) or 32 bytes as string
    if (key.length === 64 && /^[a-fA-F0-9]+$/.test(key)) return true;
    if (key.length === 32) return true;
    
    return false;
  }
  
  // Generate secure file names
  static generateSecureFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = this.generateSecureToken(8);
    const extension = originalName.split('.').pop() || '';
    
    return `${timestamp}-${random}.${extension}`;
  }
  
  // Rate limiting helpers
  static generateRateLimitId(ip: string, endpoint: string): string {
    return crypto.createHash('sha256').update(`${ip}:${endpoint}`).digest('hex');
  }
  
  // Security headers generation
  static generateSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this.generateCSP(),
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Request-ID': this.generateSecureToken(16)
    };
  }
  
  // Generate Content Security Policy
  private static generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://maps.googleapis.com wss: ws:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ];
    
    return directives.join('; ');
  }
  
  // Validate API keys
  static isValidApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    // API key should be at least 32 characters and alphanumeric
    return /^[a-zA-Z0-9]{32,}$/.test(apiKey);
  }
  
  // Generate API keys
  static generateApiKey(): string {
    const prefix = 'bts';
    const keyPart = this.generateSecureToken(32);
    const checksum = crypto.createHash('sha256').update(keyPart).digest('hex').slice(0, 8);
    
    return `${prefix}_${keyPart}_${checksum}`;
  }
  
  // Verify API key checksum
  static verifyApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    const parts = apiKey.split('_');
    if (parts.length !== 3 || parts[0] !== 'bts') return false;
    
    const [, keyPart, providedChecksum] = parts;
    const calculatedChecksum = crypto.createHash('sha256').update(keyPart).digest('hex').slice(0, 8);
    
    return providedChecksum === calculatedChecksum;
  }
  
  // GDPR compliance helpers
  static anonymizePersonalData(data: any): any {
    const personalFields = [
      'email',
      'firstName',
      'lastName',
      'phone',
      'address',
      'dateOfBirth'
    ];
    
    const anonymized = { ...data };
    
    for (const field of personalFields) {
      if (anonymized[field]) {
        anonymized[field] = '[ANONYMIZED]';
      }
    }
    
    return anonymized;
  }
  
  // Input sanitization for SQL injection prevention
  static sanitizeForDatabase(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Remove potential SQL injection patterns
    return input
      .replace(/['";\\]/g, '') // Remove quotes and escapes
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b/gi, '') // Remove SQL keywords
      .trim();
  }
  
  // Check for suspicious patterns
  static detectSuspiciousActivity(request: any): {
    isSuspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    
    // Check for SQL injection patterns
    const requestString = JSON.stringify(request);
    if (ValidationUtils.detectSqlInjection(requestString)) {
      reasons.push('SQL injection pattern detected');
    }
    
    // Check for XSS patterns
    if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(requestString)) {
      reasons.push('XSS pattern detected');
    }
    
    // Check for path traversal
    if (/\.\.[\/\\]/.test(requestString)) {
      reasons.push('Path traversal pattern detected');
    }
    
    // Check for command injection
    if (/[;&|`$(){}[\]\\]/.test(requestString)) {
      reasons.push('Command injection pattern detected');
    }
    
    return {
      isSuspicious: reasons.length > 0,
      reasons
    };
  }
}

// Encryption helpers for specific use cases with proper AES-256-GCM implementation
export class EncryptionHelper {
  private static readonly algorithm = 'aes-256-gcm';
  
  static encryptPII(data: string): string {
    const key = process.env.PII_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('PII encryption key not configured - set PII_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable');
    
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = key.length === 32 
      ? Buffer.from(key, 'utf8')
      : crypto.createHash('sha256').update(key).digest();
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, keyBuffer, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  static decryptPII(encryptedData: string): string {
    const key = process.env.PII_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('PII encryption key not configured - set PII_ENCRYPTION_KEY or ENCRYPTION_KEY environment variable');
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid PII encrypted data format - expected iv:authTag:encrypted');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Ensure key is exactly 32 bytes for AES-256
    const keyBuffer = key.length === 32 
      ? Buffer.from(key, 'utf8')
      : crypto.createHash('sha256').update(key).digest();
    
    const decipher = crypto.createDecipheriv(this.algorithm, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}