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
      
      // Perform comprehensive file content scanning
      const scanResult = await scanFileForThreats(file);
      (file as any).scanStatus = scanResult.status;
      (file as any).scanId = scanResult.scanId;
      (file as any).threats = scanResult.threats;
      
      // Block files with confirmed threats
      if (scanResult.status === 'malicious') {
        logger.warn('Malicious file blocked', {
          filename: file.originalname,
          threats: scanResult.threats,
          scanId: scanResult.scanId,
          userId: req.user?.id || 'anonymous',
          requestId: req.requestId
        });
        return next(createErrors.authorization('File contains potentially malicious content'));
      }
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
  
  // Parse image dimensions from buffer headers
  const buffer = file.buffer;
  
  if (buffer.length < 100) {
    return { isValid: false, error: 'Image file appears to be corrupted or too small' };
  }
  
  if (file.size > 50 * 1024 * 1024) {
    return { isValid: false, error: 'Image file is too large' };
  }
  
  try {
    const dimensions = parseImageDimensions(buffer, file.mimetype);
    
    if (!dimensions) {
      // Couldn't parse dimensions, but file passed other checks
      return { isValid: true };
    }
    
    const { width, height } = dimensions;
    
    if (width < MIN_DIMENSIONS.width || height < MIN_DIMENSIONS.height) {
      return { isValid: false, error: `Image dimensions too small. Minimum: ${MIN_DIMENSIONS.width}x${MIN_DIMENSIONS.height}` };
    }
    
    if (width > MAX_DIMENSIONS.width || height > MAX_DIMENSIONS.height) {
      return { isValid: false, error: `Image dimensions too large. Maximum: ${MAX_DIMENSIONS.width}x${MAX_DIMENSIONS.height}` };
    }
    
    return { isValid: true };
  } catch (error) {
    logger.error('Image dimension validation error', { error, filename: file.originalname });
    // Allow file through if dimension parsing fails but other checks pass
    return { isValid: true };
  }
}

/**
 * Parse image dimensions from buffer headers without external dependencies
 * Supports PNG, JPEG, GIF, and WebP formats
 */
function parseImageDimensions(buffer: Buffer, mimetype: string): { width: number; height: number } | null {
  try {
    // PNG: dimensions at bytes 16-24 (width: 16-19, height: 20-23)
    if (mimetype === 'image/png' || (buffer[0] === 0x89 && buffer[1] === 0x50)) {
      if (buffer.length < 24) return null;
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
    
    // JPEG: dimensions in SOF0/SOF2 markers
    if (mimetype === 'image/jpeg' || (buffer[0] === 0xFF && buffer[1] === 0xD8)) {
      let offset = 2;
      while (offset < buffer.length - 8) {
        if (buffer[offset] !== 0xFF) {
          offset++;
          continue;
        }
        const marker = buffer[offset + 1];
        // SOF0 (0xC0) or SOF2 (0xC2) contain dimensions
        if (marker === 0xC0 || marker === 0xC2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        // Skip to next marker
        if (marker >= 0xC0 && marker <= 0xFE) {
          const length = buffer.readUInt16BE(offset + 2);
          offset += 2 + length;
        } else {
          offset += 2;
        }
      }
      return null;
    }
    
    // GIF: dimensions at bytes 6-9 (width: 6-7, height: 8-9, little-endian)
    if (mimetype === 'image/gif' || (buffer[0] === 0x47 && buffer[1] === 0x49)) {
      if (buffer.length < 10) return null;
      const width = buffer.readUInt16LE(6);
      const height = buffer.readUInt16LE(8);
      return { width, height };
    }
    
    // WebP: RIFF header, then VP8/VP8L/VP8X chunk
    if (mimetype === 'image/webp' || (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')) {
      if (buffer.length < 30) return null;
      const chunkType = buffer.toString('ascii', 12, 16);
      
      if (chunkType === 'VP8 ') {
        // Lossy WebP: dimensions at offset 26-29
        if (buffer.length < 30) return null;
        const width = buffer.readUInt16LE(26) & 0x3FFF;
        const height = buffer.readUInt16LE(28) & 0x3FFF;
        return { width, height };
      } else if (chunkType === 'VP8L') {
        // Lossless WebP: dimensions packed in 4 bytes at offset 21
        if (buffer.length < 25) return null;
        const bits = buffer.readUInt32LE(21);
        const width = (bits & 0x3FFF) + 1;
        const height = ((bits >> 14) & 0x3FFF) + 1;
        return { width, height };
      } else if (chunkType === 'VP8X') {
        // Extended WebP: dimensions at offset 24-29 (3 bytes each)
        if (buffer.length < 30) return null;
        const width = (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16)) + 1;
        const height = (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16)) + 1;
        return { width, height };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Comprehensive file threat scanning
 * Performs multiple security checks without external API dependencies
 */
async function scanFileForThreats(file: Express.Multer.File): Promise<{
  status: 'clean' | 'suspicious' | 'malicious';
  scanId: string;
  threats: string[];
}> {
  const scanId = SecurityUtils.generateSecureToken(16);
  const threats: string[] = [];
  const buffer = file.buffer;
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 8192)); // Check first 8KB as text
  const hexHeader = buffer.slice(0, 32).toString('hex');

  // 1. Check for executable file signatures disguised as other types
  const executableSignatures: { [key: string]: string } = {
    '4d5a': 'Windows executable (MZ)',
    '7f454c46': 'Linux executable (ELF)',
    'cafebabe': 'Java class file',
    '504b0304': 'ZIP archive (potential JAR/APK)',
    'd0cf11e0': 'Microsoft OLE (potential macro document)',
  };

  for (const [sig, desc] of Object.entries(executableSignatures)) {
    if (hexHeader.toLowerCase().startsWith(sig)) {
      // Check if file extension matches expected type
      const ext = file.originalname.split('.').pop()?.toLowerCase();
      const allowedForSig: { [key: string]: string[] } = {
        '504b0304': ['zip', 'xlsx', 'docx', 'pptx'], // ZIP is okay for Office docs
        'd0cf11e0': ['doc', 'xls', 'ppt'], // OLE is okay for old Office
      };
      if (!allowedForSig[sig]?.includes(ext || '')) {
        threats.push(`Executable signature detected: ${desc}`);
      }
    }
  }

  // 2. Check for malicious patterns in content
  const maliciousPatterns: { pattern: RegExp; description: string; severity: 'high' | 'medium' }[] = [
    { pattern: /<%[\s\S]*?%>/g, description: 'Server-side script tags (ASP/PHP)', severity: 'high' },
    { pattern: /<\?php[\s\S]*?\?>/gi, description: 'PHP script tags', severity: 'high' },
    { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, description: 'JavaScript script tags', severity: 'high' },
    { pattern: /javascript\s*:/gi, description: 'JavaScript protocol handler', severity: 'high' },
    { pattern: /vbscript\s*:/gi, description: 'VBScript protocol handler', severity: 'high' },
    { pattern: /data\s*:\s*text\/html/gi, description: 'Data URI HTML injection', severity: 'high' },
    { pattern: /on(load|error|click|mouseover|submit|focus|blur)\s*=/gi, description: 'Event handler injection', severity: 'medium' },
    { pattern: /eval\s*\([^)]*\)/gi, description: 'Eval function call', severity: 'high' },
    { pattern: /exec\s*\([^)]*\)/gi, description: 'Exec function call', severity: 'high' },
    { pattern: /system\s*\([^)]*\)/gi, description: 'System function call', severity: 'high' },
    { pattern: /shell_exec\s*\(/gi, description: 'Shell execution function', severity: 'high' },
    { pattern: /passthru\s*\(/gi, description: 'Passthru function', severity: 'high' },
    { pattern: /base64_decode\s*\([^)]*\)/gi, description: 'Base64 decode (obfuscation)', severity: 'medium' },
    { pattern: /\x00/g, description: 'Null byte injection', severity: 'high' },
    { pattern: /__HALT_COMPILER\s*\(\)/gi, description: 'PHP halt compiler', severity: 'high' },
    { pattern: /powershell\s+-/gi, description: 'PowerShell command', severity: 'high' },
    { pattern: /cmd\s*\/c/gi, description: 'CMD execution', severity: 'high' },
    { pattern: /\/bin\/(ba)?sh/gi, description: 'Shell path reference', severity: 'medium' },
    { pattern: /document\s*\.\s*(cookie|write|location)/gi, description: 'DOM manipulation', severity: 'medium' },
    { pattern: /window\s*\.\s*location/gi, description: 'Window location manipulation', severity: 'medium' },
    { pattern: /\$_(GET|POST|REQUEST|COOKIE|SERVER)\s*\[/gi, description: 'PHP superglobal access', severity: 'high' },
    { pattern: /union\s+(all\s+)?select/gi, description: 'SQL injection pattern', severity: 'high' },
    { pattern: /;\s*drop\s+table/gi, description: 'SQL drop table', severity: 'high' },
  ];

  for (const { pattern, description, severity } of maliciousPatterns) {
    if (pattern.test(content)) {
      threats.push(`${severity === 'high' ? '⚠️ ' : ''}${description}`);
    }
  }

  // 3. Check for polyglot files (files valid as multiple formats)
  const isImage = file.mimetype.startsWith('image/');
  if (isImage) {
    // Check for HTML/JS hidden in image comment sections
    if (/<html|<script|<body|<head/i.test(content)) {
      threats.push('HTML content hidden in image file');
    }
  }

  // 4. Check for suspicious file name patterns
  const filename = file.originalname.toLowerCase();
  const suspiciousNames = [
    /\.php\d*$/i, // .php, .php5, .php7
    /\.asp(x)?$/i, // .asp, .aspx
    /\.jsp$/i, // Java Server Pages
    /\.cgi$/i, // CGI scripts
    /\.exe$/i, // Executables
    /\.bat$/i, // Batch files
    /\.cmd$/i, // Command files
    /\.ps1$/i, // PowerShell
    /\.sh$/i, // Shell scripts
    /\.(phtml|phar)$/i, // PHP alternatives
  ];

  for (const pattern of suspiciousNames) {
    if (pattern.test(filename)) {
      threats.push(`Suspicious file extension: ${filename}`);
      break;
    }
  }

  // 5. Check for EICAR test signature (standard AV test pattern)
  const eicarPattern = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
  if (content.includes(eicarPattern)) {
    threats.push('EICAR test signature detected');
  }

  // 6. Determine final status
  let status: 'clean' | 'suspicious' | 'malicious' = 'clean';
  
  if (threats.length > 0) {
    // High severity threats = malicious
    const hasHighSeverity = threats.some(t => 
      t.includes('⚠️') || 
      t.includes('Executable signature') || 
      t.includes('PHP script') ||
      t.includes('Shell execution') ||
      t.includes('EICAR')
    );
    status = hasHighSeverity ? 'malicious' : 'suspicious';
  }

  return { status, scanId, threats };
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