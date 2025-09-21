// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// App Configuration
export const APP_CONFIG = {
  name: 'FoodApp',
  version: '1.0.0',
  environment: import.meta.env.MODE || 'development'
};

// Feature Flags
export const FEATURES = {
  droneDelivery: true,
  realTimeTracking: true,
  qrCodeScanning: true
};
