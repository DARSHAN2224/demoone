import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
  timeout: 10000,
});

// Request interceptor - add auth headers
api.interceptors.request.use(
  (config) => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('refreshToken='))
          ?.split('=')[1];
        
        if (refreshToken) {
          const response = await axios.post('/api/v1/users/refresh-token', {
            refreshToken,
            deviceId: localStorage.getItem('deviceId')
          }, { withCredentials: true });
          
          if (response.data.success) {
            // Update cookies
            document.cookie = `accessToken=${response.data.data.accessToken}; path=/`;
            document.cookie = `refreshToken=${response.data.data.refreshToken}; path=/`;
            
            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        // Clear cookies and redirect to login
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    }
    
    // Handle other errors
    if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else if (error.message) {
      toast.error(error.message);
    }
    
    return Promise.reject(error);
  }
);

export { api };
