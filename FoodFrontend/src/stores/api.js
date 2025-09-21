// src/stores/api.js
import axios from 'axios';

// =========================
// Axios instance (Industry Standard)
// =========================
export const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// =========================
// Request Interceptor for Auth Token & CSRF (Industry Standard)
// =========================
api.interceptors.request.use(
  async (config) => {
    // Get access token from cookie (no localStorage)
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    // Add CSRF token for non-GET requests (Industry Standard)
    // Exclude authentication endpoints from CSRF requirement
    if (config.method !== 'get' && config.method !== 'GET' && 
        !config.url?.includes('/login') && 
        !config.url?.includes('/register') && 
        !config.url?.includes('/refresh-token') &&
        !config.url?.includes('/logout')) {
      try {
        const csrfResponse = await axios.get('http://localhost:8000/api/v1/csrf-token', {
          withCredentials: true
        });
        if (csrfResponse.data.csrfToken) {
          config.headers['X-CSRF-Token'] = csrfResponse.data.csrfToken;
        }
      } catch (error) {
        console.warn('🔒 Failed to get CSRF token:', error.message);
      }
    }
    
    const accessToken = getCookie('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================
// Response Interceptor for Token Refresh (Cookies only - industry standard)
// =========================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    const isRefreshCall = (originalRequest.url || '').includes('/refresh-token');
    if (isRefreshCall) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get tokens from cookies only
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        const refreshToken = getCookie('refreshToken');
        const deviceId = getCookie('deviceId');
        const userRole = getCookie('userRole');

        if (!refreshToken || !deviceId || !userRole) {
          throw new Error('Missing required authentication data');
        }
        
        const refreshPath = userRole === 'admin' ? '/admin/refresh-token' : 
                           userRole === 'seller' ? '/seller/refresh-token' : 
                           '/users/refresh-token';

        const refreshResponse = await api.post(refreshPath, { deviceId, refreshToken });
        const { accessToken } = refreshResponse.data.data || {};
        
        if (!accessToken) {
          throw new Error('No access token in refresh response');
        }

        // Backend should handle setting the new access token cookie
        // Retry original request with new token
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear all cookies and redirect to login
        document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        document.cookie = 'deviceId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;