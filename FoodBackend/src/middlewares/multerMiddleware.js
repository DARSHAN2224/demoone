import multer from "multer";
import path from "path";
import { ApiError } from "../utils/ApiError.js";

// Enhanced storage configuration with security
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './FoodBackend/public/images');
  },
  filename: (req, file, cb) => {
    // Generate secure filename with timestamp and random string
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const name = `${timestamp}-${randomString}${extension}`;
    cb(null, name);
  }
});

// Enhanced file filter with better security
const fileFilter = (req, file, cb) => {
  // Check file type
  if (!file.mimetype.startsWith('image/')) {
    return cb(new ApiError('Only images are allowed!', 400, 'Invalid file type'), false);
  }
  
  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new ApiError('Invalid file extension!', 400, 'Only .jpg, .jpeg, .png, .webp, .gif files are allowed'), false);
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return cb(new ApiError('File too large!', 400, 'File size must be less than 10MB'), false);
  }
  
  // Check filename length
  if (file.originalname.length > 100) {
    return cb(new ApiError('Filename too long!', 400, 'Filename cannot exceed 100 characters'), false);
  }
  
  // Check for suspicious patterns in filename
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar|msi|dll|sys|ini|log|tmp|temp)$/i // Executable extensions
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.originalname)) {
      return cb(new ApiError('Invalid filename!', 400, 'Filename contains invalid characters or patterns'), false);
    }
  }
  
  cb(null, true);
};

// Enhanced multer configuration with security
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1, // Only allow 1 file per request
    fieldSize: 1024 * 1024 // 1MB for text fields
  }
});

// Multiple file upload with security
export const uploadMultiple = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Allow up to 5 files
    fieldSize: 1024 * 1024 // 1MB for text fields
  }
});

// Profile picture upload with stricter limits
export const uploadProfile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow specific image types for profile pictures
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new ApiError('Only JPEG, PNG, and WebP images are allowed for profile pictures!', 400, 'Invalid file type'), false);
    }
    
    // Smaller size limit for profile pictures
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return cb(new ApiError('Profile picture too large!', 400, 'Profile picture must be less than 5MB'), false);
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

// Product image upload with medium limits
export const uploadProduct = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
    files: 3 // Allow up to 3 product images
  }
});

// Shop image upload with medium limits
export const uploadShop = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
    files: 2 // Allow up to 2 shop images
  }
});

// Error handling middleware for multer
export const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large',
        error: 'File size exceeds the limit'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
        error: 'File count exceeds the limit'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
        error: 'File field name not expected'
      });
    }
  }
  
  next(error);
};