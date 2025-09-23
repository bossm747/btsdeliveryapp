import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { ValidationUtils } from '../utils/validation';
import { SecurityUtils } from '../utils/security';
import { logger } from './logging';
import { createErrors } from './errorHandler';

// File upload configuration
const ALLOWED_FILE_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  spreadsheets: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  all: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
};

const ALLOWED_EXTENSIONS = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  documents: ['pdf', 'doc', 'docx'],
  spreadsheets: ['xls', 'xlsx'],
  all: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']
};

const MAX_FILE_SIZES = {
  profile: 5 * 1024 * 1024, // 5MB
  restaurant: 10 * 1024 * 1024, // 10MB
  menu: 5 * 1024 * 1024, // 5MB
  document: 20 * 1024 * 1024, // 20MB
  default: 10 * 1024 * 1024 // 10MB
};

// Multer configuration
const storage = multer.memoryStorage(); // Store files in memory for security scanning

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  try {
    // Get upload type from request
    const uploadType = req.body.type || req.query.type || 'default';
    const allowedTypes = ALLOWED_FILE_TYPES[uploadType as keyof typeof ALLOWED_FILE_TYPES] || ALLOWED_FILE_TYPES.all;
    const allowedExtensions = ALLOWED_EXTENSIONS[uploadType as keyof typeof ALLOWED_EXTENSIONS] || ALLOWED_EXTENSIONS.all;
    
    // Check MIME type
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error(`File type ${file.mimetype} not allowed for ${uploadType} uploads`));
    }
    
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (!allowedExtensions.includes(extension)) {
      return callback(new Error(`File extension .${extension} not allowed for ${uploadType} uploads`));
    }
    
    // Check filename for security
    if (!/^[a-zA-Z0-9._-]+$/.test(file.originalname)) {
      return callback(new Error('Filename contains invalid characters'));
    }
    
    // Check for double extensions (potential security risk)
    const doubleExtension = /\.[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
    if (doubleExtension.test(file.originalname)) {
      return callback(new Error('Double file extensions not allowed'));
    }
    
    callback(null, true);
  } catch (error) {
    callback(error as Error);
  }
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZES.default,
    files: 5, // Maximum 5 files per request
    fields: 20, // Maximum 20 non-file fields
    fieldNameSize: 50, // Maximum field name size
    fieldSize: 1024 * 1024 // Maximum field value size (1MB)
  }
});

// File upload middleware factory
export const fileUploadMiddleware = (options: {
  field: string;
  maxCount?: number;
  uploadType?: keyof typeof MAX_FILE_SIZES;
  required?: boolean;
} = { field: 'file' }) => {
  const { field, maxCount = 1, uploadType = 'default', required = false } = options;
  
  return [
    // Set dynamic file size limit
    (req: Request, res: Response, next: NextFunction) => {
      upload.array(field, maxCount).bind(upload)(req, res, (err) => {
        if (err) {
          if (err instanceof multer.MulterError) {
            switch (err.code) {
              case 'LIMIT_FILE_SIZE':
                return next(createErrors.validation(`File size exceeds limit of ${MAX_FILE_SIZES[uploadType] / 1024 / 1024}MB`));
              case 'LIMIT_FILE_COUNT':
                return next(createErrors.validation(`Too many files. Maximum ${maxCount} files allowed`));
              case 'LIMIT_UNEXPECTED_FILE':
                return next(createErrors.validation(`Unexpected file field: ${err.field}`));
              default:
                return next(createErrors.validation(`File upload error: ${err.message}`));
            }
          }
          return next(createErrors.validation(err.message));
        }
        next();
      });
    },
    
    // Security validation
    securityValidation(uploadType, required),
    
    // Virus scanning preparation
    virusScanningPrep,
    
    // Generate secure file names
    generateSecureFileNames
  ];
};

// Security validation middleware
const securityValidation = (uploadType: keyof typeof MAX_FILE_SIZES, required: boolean) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      // Check if files are required
      if (required && (!files || files.length === 0)) {
        return next(createErrors.validation('File upload is required'));
      }
      
      if (!files || files.length === 0) {
        return next(); // No files to validate
      }
      
      // Validate each file
      for (const file of files) {
        // Check file size against specific upload type limit
        const maxSize = MAX_FILE_SIZES[uploadType];
        if (file.size > maxSize) {
          return next(createErrors.validation(
            `File ${file.originalname} exceeds size limit of ${maxSize / 1024 / 1024}MB`
          ));
        }
        
        // Check file content for malicious patterns
        const isSuspicious = await checkFileContent(file);
        if (isSuspicious) {
          logger.warn('Suspicious file upload detected', {
            filename: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            ip: req.ip,
            userId: req.user?.id || 'anonymous'
          });
          
          return next(createErrors.validation(
            'File content appears suspicious and has been rejected'
          ));
        }
        
        // Validate image dimensions for image uploads
        if (file.mimetype.startsWith('image/')) {
          const dimensionCheck = await validateImageDimensions(file);
          if (!dimensionCheck.isValid) {
            return next(createErrors.validation(dimensionCheck.error || 'Invalid image dimensions'));
          }
        }
      }
      
      next();
    } catch (error) {
      logger.error('File security validation error', { error, requestId: req.requestId });
      next(createErrors.internal('File validation failed'));
    }
  };
};

// Virus scanning preparation middleware
const virusScanningPrep = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return next();
    }
    
    // Calculate file hashes for tracking
    for (const file of files) {
      const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');
      (file as any).hash = hash;
      
      // Log file upload for audit trail
      logger.info('File uploaded for processing', {
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        hash,
        ip: req.ip,
        userId: req.user?.id || 'anonymous',
        requestId: req.requestId
      });
      
      // TODO: Integrate with virus scanning service
      // This is where you would call your virus scanning service
      // For now, we'll just prepare the infrastructure
      const scanResult = await prepareForVirusScanning(file);
      (file as any).scanStatus = scanResult.status;
      (file as any).scanId = scanResult.scanId;
    }
    
    next();
  } catch (error) {
    logger.error('Virus scanning preparation error', { error, requestId: req.requestId });
    next(createErrors.internal('File scanning preparation failed'));
  }
};

// Generate secure file names
const generateSecureFileNames = (req: Request, res: Response, next: NextFunction) => {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    return next();
  }
  
  for (const file of files) {
    // Generate secure filename
    const extension = path.extname(file.originalname);
    const secureFilename = SecurityUtils.generateSecureFileName(file.originalname);
    
    (file as any).secureFilename = secureFilename;
    (file as any).originalFilename = file.originalname;
  }
  
  next();
};

// Check file content for malicious patterns
async function checkFileContent(file: Express.Multer.File): Promise<boolean> {
  const content = file.buffer.toString('utf8', 0, Math.min(file.size, 1024)); // Check first 1KB
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<%[\s\S]*?%>/g, // PHP/ASP tags
    /<script[\s\S]*?<\/script>/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /eval\s*\(/gi, // Eval functions
    /exec\s*\(/gi, // Exec functions
    /system\s*\(/gi, // System calls
    /shell_exec/gi, // Shell execution
    /base64_decode/gi, // Base64 decode (potential obfuscation)
    /__HALT_COMPILER\(\)/gi, // PHP halt compiler
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(content));
}

// Validate image dimensions
async function validateImageDimensions(file: Express.Multer.File): Promise<{
  isValid: boolean;
  error?: string;
}> {
  // This is a basic implementation
  // In production, you would use a proper image processing library like Sharp
  
  const MAX_DIMENSIONS = {
    width: 4000,
    height: 4000
  };
  
  const MIN_DIMENSIONS = {
    width: 10,
    height: 10
  };
  
  // For now, we'll just check file size as a proxy for dimensions
  // TODO: Implement proper image dimension checking with Sharp
  
  if (file.size < 100) { // Too small to be a valid image
    return { isValid: false, error: 'Image file appears to be corrupted or too small' };
  }
  
  if (file.size > 50 * 1024 * 1024) { // 50MB limit for images
    return { isValid: false, error: 'Image file is too large' };
  }
  
  return { isValid: true };
}

// Prepare for virus scanning (placeholder for external service integration)
async function prepareForVirusScanning(file: Express.Multer.File): Promise<{
  status: 'pending' | 'clean' | 'suspicious';
  scanId: string;
}> {
  // Generate a scan ID for tracking
  const scanId = SecurityUtils.generateSecureToken(16);
  
  // TODO: Integrate with actual virus scanning service
  // For now, we'll just return a pending status
  
  return {
    status: 'pending',
    scanId
  };
}

// File type-specific middleware
export const uploadProfileImage = fileUploadMiddleware({
  field: 'profileImage',
  maxCount: 1,
  uploadType: 'profile',
  required: false
});

export const uploadRestaurantImages = fileUploadMiddleware({
  field: 'images',
  maxCount: 5,
  uploadType: 'restaurant',
  required: false
});

export const uploadMenuItemImage = fileUploadMiddleware({
  field: 'menuImage',
  maxCount: 1,
  uploadType: 'menu',
  required: false
});

export const uploadDocuments = fileUploadMiddleware({
  field: 'documents',
  maxCount: 3,
  uploadType: 'document',
  required: false
});

// File cleanup middleware (for failed uploads)
export const cleanupFiles = (req: Request, res: Response, next: NextFunction) => {
  res.on('finish', () => {
    // Clean up temporary files if the response was an error
    if (res.statusCode >= 400) {
      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        logger.info('Cleaning up files after failed request', {
          fileCount: files.length,
          statusCode: res.statusCode,
          requestId: req.requestId
        });
        // Files are in memory, so they'll be garbage collected
        // If using disk storage, you would delete files here
      }
    }
  });
  
  next();
};

// Export upload instance for direct use if needed
export { upload };