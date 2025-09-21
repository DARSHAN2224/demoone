import { api } from './api.js';

class AuthService {
  constructor() {
    this.baseURL = '/api/v1/users';
    this.deviceId = this.getOrCreateDeviceId();
  }

  // Generate or retrieve device ID
  getOrCreateDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  // Set cookies with proper security flags
  setCookies(accessToken, refreshToken) {
    const cookieOptions = {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    // Set access token (short-lived)
    document.cookie = `accessToken=${accessToken}; path=${cookieOptions.path}; max-age=${cookieOptions.maxAge}; ${cookieOptions.secure ? 'secure;' : ''} samesite=${cookieOptions.sameSite}`;
    
    // Set refresh token (longer-lived)
    document.cookie = `refreshToken=${refreshToken}; path=${cookieOptions.path}; max-age=${cookieOptions.maxAge}; ${cookieOptions.secure ? 'secure;' : ''} samesite=${cookieOptions.sameSite}`;
    
    // Set device ID
    document.cookie = `deviceId=${this.deviceId}; path=${cookieOptions.path}; max-age=${cookieOptions.maxAge}; ${cookieOptions.secure ? 'secure;' : ''} samesite=${cookieOptions.sameSite}`;
  }

  // Get cookie value
  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Clear all cookies
  clearCookies() {
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'deviceId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }

  // User registration
  async register(userData) {
    try {
      const response = await api.post(`${this.baseURL}/register`, {
        ...userData,
        deviceId: this.deviceId
      });
      
      if (response.data.success) {
        // Set cookies after successful registration
        this.setCookies(response.data.data.accessToken, response.data.data.refreshToken);
        return response.data;
      }
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      throw error;
    }
  }

  // User login
  async login(credentials) {
    try {
      const response = await api.post(`${this.baseURL}/login`, {
        ...credentials,
        deviceId: this.deviceId
      });
      
      if (response.data.success) {
        // Set cookies after successful login
        this.setCookies(response.data.data.accessToken, response.data.data.refreshToken);
        return response.data;
      }
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      const response = await api.post(`${this.baseURL}/logout`);
      this.clearCookies();
      return response.data;
    } catch (error) {
      // Clear cookies even if logout fails
      this.clearCookies();
      throw error;
    }
  }

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = this.getCookie('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post(`${this.baseURL}/refresh-token`, {
        refreshToken,
        deviceId: this.deviceId
      });

      if (response.data.success) {
        // Update cookies with new tokens
        this.setCookies(response.data.data.accessToken, response.data.data.refreshToken);
        return response.data;
      }
      throw new Error(response.data.message || 'Token refresh failed');
    } catch (error) {
      // If refresh fails, clear cookies and force re-login
      this.clearCookies();
      throw error;
    }
  }

  // Verify email
  async verifyEmail(token) {
    try {
      const response = await api.post(`${this.baseURL}/verify-email`, { token });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Resend verification code
  async resendVerification(email) {
    try {
      const response = await api.post(`${this.baseURL}/resend-verification`, { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post(`${this.baseURL}/forgot-password`, { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post(`${this.baseURL}/reset-password/${token}`, {
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get device details
  async getDeviceDetails() {
    try {
      const response = await api.get(`${this.baseURL}/device-info`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const accessToken = this.getCookie('accessToken');
    return !!accessToken;
  }

  // Get current user info from token
  getCurrentUser() {
    const accessToken = this.getCookie('accessToken');
    if (!accessToken) return null;

    try {
      // Decode JWT token (client-side decoding for basic info)
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      return {
        _id: payload._id,
        email: payload.email,
        name: payload.name,
        role: payload.role
      };
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      const formData = new FormData();
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== null && profileData[key] !== undefined) {
          formData.append(key, profileData[key]);
        }
      });

      const response = await api.post(`${this.baseURL}/update-profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get user profile
  async getProfile() {
    try {
      const response = await api.get(`${this.baseURL}/profile`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Delete account
  async deleteAccount() {
    try {
      const response = await api.delete(`${this.baseURL}/delete-account`);
      this.clearCookies();
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export default new AuthService();
