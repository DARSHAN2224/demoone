// Frontend Input Validation & Sanitization (Industry Standard)

/**
 * Sanitize input to prevent XSS attacks
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
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
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
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const validatePhone = (phone) => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate name (no special characters, minimum length)
 * @param {string} name - Name to validate
 * @returns {Object} Validation result
 */
export const validateName = (name) => {
  const minLength = 2;
  const maxLength = 50;
  const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(name);
  const hasNumbers = /\d/.test(name);
  
  const errors = [];
  
  if (name.length < minLength) {
    errors.push(`Name must be at least ${minLength} characters long`);
  }
  
  if (name.length > maxLength) {
    errors.push(`Name cannot exceed ${maxLength} characters`);
  }
  
  if (hasSpecialChars) {
    errors.push('Name cannot contain special characters');
  }
  
  if (hasNumbers) {
    errors.push('Name cannot contain numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate address
 * @param {string} address - Address to validate
 * @returns {Object} Validation result
 */
export const validateAddress = (address) => {
  const minLength = 10;
  const maxLength = 200;
  
  const errors = [];
  
  if (address.length < minLength) {
    errors.push(`Address must be at least ${minLength} characters long`);
  }
  
  if (address.length > maxLength) {
    errors.push(`Address cannot exceed ${maxLength} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate price (positive number with max 2 decimal places)
 * @param {number|string} price - Price to validate
 * @returns {Object} Validation result
 */
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  const hasValidDecimals = /^\d+(\.\d{1,2})?$/.test(price);
  
  const errors = [];
  
  if (isNaN(numPrice)) {
    errors.push('Price must be a valid number');
  }
  
  if (numPrice <= 0) {
    errors.push('Price must be greater than 0');
  }
  
  if (!hasValidDecimals) {
    errors.push('Price can have maximum 2 decimal places');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value: numPrice
  };
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    maxFileNameLength = 100
  } = options;
  
  const errors = [];
  
  if (!file) {
    errors.push('File is required');
    return { isValid: false, errors };
  }
  
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
  }
  
  if (file.name.length > maxFileNameLength) {
    errors.push(`File name cannot exceed ${maxFileNameLength} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate form data with multiple fields
 * @param {Object} formData - Form data to validate
 * @param {Object} validationRules - Validation rules for each field
 * @returns {Object} Validation result
 */
export const validateForm = (formData, validationRules) => {
  const errors = {};
  let isValid = true;
  
  Object.keys(validationRules).forEach(field => {
    const value = formData[field];
    const rules = validationRules[field];
    
    if (rules.required && (!value || value.trim() === '')) {
      errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      isValid = false;
    } else if (value && rules.validator) {
      const validationResult = rules.validator(value);
      if (!validationResult.isValid) {
        errors[field] = validationResult.errors[0];
        isValid = false;
      }
    }
  });
  
  return {
    isValid,
    errors
  };
};

/**
 * Sanitize form data
 * @param {Object} formData - Form data to sanitize
 * @returns {Object} Sanitized form data
 */
export const sanitizeFormData = (formData) => {
  const sanitized = {};
  
  Object.keys(formData).forEach(key => {
    if (typeof formData[key] === 'string') {
      sanitized[key] = sanitizeInput(formData[key]);
    } else {
      sanitized[key] = formData[key];
    }
  });
  
  return sanitized;
};
