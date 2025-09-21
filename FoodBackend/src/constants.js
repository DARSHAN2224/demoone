export const DB_NAME = 'food-backend';

// CORS configuration for development
export const CORS_ORIGIN = process.env.NODE_ENV === 'production' 
  ? process.env.FRONTEND_URL || 'https://yourdomain.com'
  : 'http://localhost:5173';

