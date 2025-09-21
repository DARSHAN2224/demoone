// Security utilities (Industry Standard)

import crypto from 'crypto';

/**
 * Generate a secure random string
 * @param {number} length - Length of the string
 * @returns {string} Random string
 */
export const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a string using SHA-256
 * @param {string} input - String to hash
 * @returns {string} Hashed string
 */
export const hashString = (input) => {
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * Validate email format (Industry Standard)
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength (Industry Standard)
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNoSpaces = !/\s/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (!hasNumber) {
    errors.push('Password must contain at least one number');
  }
  
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!hasNoSpaces) {
    errors.push('Password cannot contain spaces');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    score: Math.min(5, 5 - errors.length)
  };
};

/**
 * Sanitize input to prevent XSS (Industry Standard)
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/expression\(/gi, '') // Remove CSS expressions
    .replace(/url\(/gi, '') // Remove CSS url()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, ''); // Remove iframe tags
};

/**
 * Validate file type (Industry Standard)
 * @param {string} mimetype - File MIME type
 * @param {string[]} allowedTypes - Allowed MIME types
 * @returns {boolean} True if valid
 */
export const validateFileType = (mimetype, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Validate file size (Industry Standard)
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum size in bytes
 * @returns {boolean} True if valid
 */
export const validateFileSize = (size, maxSize = 10 * 1024 * 1024) => { // 10MB default
  return size <= maxSize;
};

/**
 * Generate secure token (Industry Standard)
 * @param {number} length - Token length
 * @returns {string} Secure token
 */
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('base64url');
};

/**
 * Validate phone number format (Industry Standard)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
  return phoneRegex.test(phone);
};

/**
 * Rate limiting helper (Industry Standard)
 * @param {Object} req - Express request object
 * @returns {string} Unique identifier for rate limiting
 */
export const getRateLimitKey = (req) => {
  return `${req.ip}:${req.path}`;
};

/**
 * Log security event (Industry Standard)
 * @param {string} event - Event type
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 */
export const logSecurityEvent = (event, details, req) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method,
    userId: req.user?._id || 'anonymous'
  };
  
  console.log('🔒 Security Event:', logEntry);
  
  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to security monitoring service
  }
};
