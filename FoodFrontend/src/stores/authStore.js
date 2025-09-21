// src/stores/authStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from './api.js';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isLoggingIn: false,

      mapRole: (roleInput) => {
        console.log('🔍 mapRole: Input:', roleInput, 'Type:', typeof roleInput);
        
        // Handle both numeric and string roles
        if (typeof roleInput === 'number') {
          switch (roleInput) {
            case 0: return "user";
            case 1: return "admin";
            case 2: return "seller";
            default: return "user";
          }
        } else if (typeof roleInput === 'string') {
          // Handle string roles directly
          const role = roleInput.toLowerCase();
          if (role === 'user' || role === 'admin' || role === 'seller') {
            console.log('🔍 mapRole: Returning string role:', role);
            return role;
          }
          // Fallback for unknown string roles
          console.log('🔍 mapRole: Unknown string role, defaulting to user');
          return "user";
        }
        // Default fallback
        console.log('🔍 mapRole: Default fallback to user');
        return "user";
      },

      normalizeUserRole: (userData) => {
        console.log('🔍 normalizeUserRole: Input userData:', userData);
        console.log('🔍 normalizeUserRole: Role type:', typeof userData.role, 'Value:', userData.role);
        
        // If userData already has a valid string role, preserve it
        if (userData.role && typeof userData.role === 'string' && 
            ['user', 'admin', 'seller'].includes(userData.role.toLowerCase())) {
          const result = {
            ...userData,
            role: userData.role.toLowerCase()
          };
          console.log('🔍 normalizeUserRole: Preserved existing role:', result.role);
          return result;
        }
        
        // Otherwise, map the role using the mapRole function
        const mappedRole = get().mapRole(userData.role);
        const result = {
          ...userData,
          role: mappedRole,
        };
        console.log('🔍 normalizeUserRole: Mapped role from', userData.role, 'to:', mappedRole);
        return result;
      },

      // Safeguard function to ensure role consistency
      ensureStringRole: (role) => {
        console.log('🔍 ensureStringRole: Input role:', role, 'Type:', typeof role);
        
        if (typeof role === 'string' && ['user', 'admin', 'seller'].includes(role.toLowerCase())) {
          const result = role.toLowerCase();
          console.log('🔍 ensureStringRole: Valid string role, returning:', result);
          return result;
        }
        
        const mappedRole = get().mapRole(role);
        console.log('🔍 ensureStringRole: Mapped role to:', mappedRole);
        return mappedRole;
      },

      // Validate role consistency across all functions
      validateRoleConsistency: (expectedRole, actualRole) => {
        const expected = get().ensureStringRole(expectedRole);
        const actual = get().ensureStringRole(actualRole);
        
        if (expected !== actual) {
          console.warn('⚠️ Role inconsistency detected:', {
            expected: expected,
            actual: actual,
            expectedType: typeof expectedRole,
            actualType: typeof actualRole
          });
        }
        
        return expected === actual;
      },

      getCookie: (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      },

      getDeviceId: () => {
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem("deviceId", deviceId);
        }
        return deviceId;
      },

      checkAuth: async () => {
        try {
          if (get().isLoggingIn) return;
          
          // Check if we have a user role (this is set by frontend)
          const userRole = get().getCookie("userRole");
          
          console.log('🔍 checkAuth: User role from cookie:', userRole);
          
          if (!userRole) {
            console.log('🔍 checkAuth: No user role found - user not authenticated');
            set({ isAuthenticated: false, isLoading: false, user: null });
            return;
          }
          
          // Try to fetch user profile to validate authentication
          try {
            let profileData;
            const profileEndpoint = userRole === 'admin' ? '/admin/profile' : 
                                  userRole === 'seller' ? '/seller/profile' : 
                                  '/users/profile';
            
            profileData = await api.get(profileEndpoint);
            
            // Normalize the user data to ensure consistent role format
            const normalizedUserData = get().normalizeUserRole(profileData.data.data);
            
            // IMPORTANT: Preserve the userRole from cookie (frontend source of truth)
            // Don't let backend response override the role
            const finalUserData = {
              ...normalizedUserData,
              role: get().ensureStringRole(userRole) // Ensure it's always a string
            };
            
            // Validate role consistency between cookie and final user data
            get().validateRoleConsistency(userRole, finalUserData.role);
            
            set({ 
              user: finalUserData, 
              isAuthenticated: true, 
              isLoading: false,
              userRole: get().ensureStringRole(userRole) // This should always be the string role from cookie
            });
            
            console.log('🔍 checkAuth: Successfully authenticated as:', userRole);
            console.log('🔍 checkAuth: Final user data role:', finalUserData.role);
            console.log('🔍 checkAuth: Role consistency validated');
          } catch (error) {
            console.error('🔍 checkAuth: Failed to fetch profile:', error);
            if (error.response?.status === 401) {
              console.log('🔍 checkAuth: 401 error - clearing authentication');
              get().forceLogout();
            } else {
              set({ isAuthenticated: false, isLoading: false, user: null, error: "Authentication check failed" });
            }
          }
        } catch (error) {
          console.error('🔍 checkAuth: Error during authentication check:', error);
          set({ isAuthenticated: false, isLoading: false, user: null, error: "Authentication check failed" });
        }
      },

      login: async (email, password, role = "user") => {
        set({ isLoading: true, error: null, isLoggingIn: true });
        try {
          // Clear any existing authentication data before login to prevent "Already authenticated" error
          console.log('🔍 login: Clearing existing auth data before login');
          
          // Clear any existing cookies
          const cookieOptions = [
            "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/",
            "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/",
            "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/",
            "deviceId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/"
          ];
          
          cookieOptions.forEach(cookie => {
            document.cookie = cookie;
            // Also try with domain-specific clearing
            document.cookie = cookie + "; domain=" + window.location.hostname;
          });
          
          console.log('🔍 login: All authentication data cleared');
          
          const deviceId = get().getDeviceId();
          let endpoint = "/users/login";
          if (role === "seller") endpoint = "/seller/login";
          if (role === "admin") endpoint = "/admin/login";
          
          // Store login attempt info in cookie for debugging
          try { 
            document.cookie = `lastLoginAttempt=${JSON.stringify({ email, role })}; path=/; max-age=3600; SameSite=Lax`;
            console.log('🔍 Stored lastLoginAttempt in cookie:', { email, role });
          } catch (error) {
            console.error('🔍 Failed to store lastLoginAttempt:', error);
          }
          
          const response = await api.post(endpoint, { email, password, deviceId });
          const loginData = response?.data?.data || {};
          
          // Backend now sets all cookies (accessToken, refreshToken, userRole, deviceId)
          // No need to manually set them here
          console.log('🔍 Login response received, backend cookies should be set');
          
          // Use the data directly from login response instead of making another API call
          let userData;
          if (role === "seller" && loginData.seller) {
            userData = get().normalizeUserRole(loginData.seller);
          } else if (role === "admin" && loginData.admin) {
            userData = get().normalizeUserRole(loginData.admin);
          } else if (role === "user" && loginData.user) {
            userData = get().normalizeUserRole(loginData.user);
          } else {
            // Fallback: try to get profile if direct data not available
            const profileHeaders = loginData.accessToken ? { Authorization: `Bearer ${loginData.accessToken}` } : undefined;
            const profile = await api.get(endpoint.replace("/login", "/profile"), profileHeaders ? { headers: profileHeaders } : undefined);
            userData = get().normalizeUserRole(profile.data.data);
          }
          
          // Ensure the role is properly set and validate consistency
          if (userData && !userData.role) {
            userData.role = role;
          }
          
          // Validate role consistency between cookie and user data
          const cookieRole = role;
          const userDataRole = userData?.role;
          get().validateRoleConsistency(cookieRole, userDataRole);
          
          // Force the role to be the cookie role (frontend source of truth)
          userData.role = get().ensureStringRole(cookieRole);
          
          console.log('🔍 Login successful, user data:', userData);
          console.log('🔍 Login: Final role after validation:', userData.role);
          
          set({ user: userData, isAuthenticated: true, isLoading: false, error: null, isLoggingIn: false });
          
          // Immediately check if cookies were set by backend
          console.log('🔍 Login: Immediately checking if backend cookies were set...');
          get().debugAuth();
          
          // Wait a moment for cookies to be fully set before setting up validation
          setTimeout(() => {
            // Debug: Check if cookies are set after delay
            console.log('🔍 Login: Checking cookies after delay...');
            get().debugAuth();
            
            // Setup authentication validation on page focus (industry standard)
            const cleanupAuthValidation = get().setupAuthValidation();
            window.authValidationCleanup = cleanupAuthValidation; // Store globally for cleanup
            console.log('🔍 Login: Started authentication validation on page focus');
          }, 1000);
          
          return { success: true, role: userData.role };
        } catch (error) {
          const status = error.response?.status;
          const data = error.response?.data || {};
          const rawMessage = data.message || "Login failed";
          const rawErrors = data.errors;
          const message = typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage);
          let errorsText = '';
          if (typeof rawErrors === 'string') errorsText = rawErrors;
          else if (Array.isArray(rawErrors)) errorsText = rawErrors.map((e) => (typeof e === 'string' ? e : e?.msg || '')).join(' ');
          else if (rawErrors && typeof rawErrors === 'object') errorsText = JSON.stringify(rawErrors);
          const combined = `${message} ${errorsText}`.trim();
          set({ isLoading: false, error: combined, isLoggingIn: false });
          const notVerified = /not\s*verified/i.test(combined);
          if (status === 400 && notVerified) return { success: false, error: combined, needVerification: true };
          return { success: false, error: combined };
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const { name, email, mobile, password, acceptTerms, role = "user" } = userData;
          let endpoint = "/users/register";
          if (role === "seller") endpoint = "/seller/register";
          if (role === "admin") endpoint = "/admin/register";
          const requestPayload = { name, email, mobile, password, acceptTerms };
          const response = await api.post(endpoint, requestPayload);
          set({ isLoading: false, error: null });
          const verificationUrl = `/verify-email?email=${encodeURIComponent(email)}&role=${role}`;
          return { success: true, data: response.data, redirectTo: verificationUrl };
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Registration failed";
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      verifyEmail: async (email, code, role = "user") => {
        try {
          let endpoint = "/users/verify-email";
          if (role === "seller") endpoint = "/seller/verify-email";
          if (role === "admin") endpoint = "/admin/verify-email";
          const response = await api.post(endpoint, { code });
          return { success: true, data: response.data.data };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || "Email verification failed" };
        }
      },

      resendVerificationCode: async (email, role = "user") => {
        try {
          let endpoint = "/users/resend-verification";
          if (role === "seller") endpoint = "/seller/resend-verification";
          if (role === "admin") endpoint = "/admin/resend-verification";
          const response = await api.post(endpoint, { email });
          return { success: true, data: response.data.data };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || "Failed to resend verification code" };
        }
      },

      forgotPassword: async (email, role = "user") => {
        try {
          let endpoint = "/users/forgot-password";
          if (role === "seller") endpoint = "/seller/forgot-password";
          if (role === "admin") endpoint = "/admin/forgot-password";
          const response = await api.post(endpoint, { email });
          return { success: true, data: response.data.data };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || "Failed to send password reset instructions" };
        }
      },

      resetPassword: async (token, password, confirmPassword) => {
        try {
          const response = await api.post(`/users/reset-password/${encodeURIComponent(token)}`, { password, confirmPassword });
          return { success: true, data: response.data.data };
        } catch (error) {
          return { success: false, error: error.response?.data?.message || "Failed to reset password" };
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const formData = new FormData();
          if (data.name) formData.append("name", data.name);
          if (data.email) formData.append("email", data.email);
          if (data.mobile) formData.append("mobile", data.mobile);
          if (data.image) formData.append("image", data.image);
          await api.post("/users/update-profile", formData, { headers: { "Content-Type": "multipart/form-data" } });
          const profile = await api.get("/users/profile");
          const userData = get().normalizeUserRole(profile.data.data);
          set({ user: userData, isLoading: false, error: null });
          return true;
        } catch (error) {
          const errorMessage = error.response?.data?.message || "Profile update failed";
          set({ isLoading: false, error: errorMessage });
          return false;
        }
      },

      logout: async () => {
        try {
          const deviceId = get().getDeviceId();
          let role = get().user?.role;
          if (!role) {
            try {
              const stored = JSON.parse(localStorage.getItem("auth-storage") || "{}");
              role = stored.user?.role;
            } catch {}
          }
          let endpoint = "/users/logout";
          if (role === "seller") endpoint = "/seller/logout";
          if (role === "admin") endpoint = "/admin/logout";
          await api.post(endpoint, { deviceId });
        } catch (error) {
          console.error("Logout error:", error);
        } finally {
          // Clear all authentication data
          console.log('🔍 logout: Clearing all authentication data');
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("deviceId");
          localStorage.removeItem("lastLoginAttempt");
          localStorage.removeItem("auth-storage");
          
          // Clear cookies with proper domain and path clearing
          const cookiesToClear = ['accessToken', 'refreshToken', 'userRole', 'deviceId'];
          cookiesToClear.forEach(cookieName => {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
          });
          
          set({ user: null, isAuthenticated: false, isLoading: false, error: null, isLoggingIn: false });
          console.log('🔍 logout: Successfully cleared all data');
          
          // Cleanup authentication validation listeners
          if (window.authValidationCleanup) {
            window.authValidationCleanup();
            window.authValidationCleanup = null;
          }
        }
      },

      // Check if access token is expired
      isTokenExpired: (token) => {
        if (!token) return true;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          return payload.exp < currentTime;
        } catch (error) {
          console.error('🔍 Error checking token expiration:', error);
          return true;
        }
      },

      // Refresh access token using refresh token (cookies only - industry standard)
      refreshAccessToken: async () => {
        try {
          const refreshToken = get().getCookie("refreshToken");
          const deviceId = get().getCookie("deviceId");
          
          if (!refreshToken || !deviceId) {
            throw new Error('Missing refresh token or device ID');
          }
          
          // Determine role from cookie for correct endpoint
          const role = get().getCookie("userRole");
          const refreshEndpoint = role === 'admin' ? '/admin/refresh-token' : 
                                role === 'seller' ? '/seller/refresh-token' : 
                                '/users/refresh-token';
          
          const response = await api.post(refreshEndpoint, { refreshToken, deviceId });
          const { accessToken } = response.data.data;
          
          // Update only cookies (no localStorage) - industry standard
          document.cookie = `accessToken=${accessToken}; path=/; max-age=3600; SameSite=Lax; Secure`;
          
          console.log('🔍 Access token refreshed successfully');
          return accessToken;
        } catch (error) {
          console.error('🔍 Failed to refresh access token:', error);
          get().forceLogout();
          throw error;
        }
      },

      // Force logout when cookies are missing (for security)
      forceLogout: async () => {
        try {
          console.log('🔍 forceLogout: Critical cookies missing - forcing logout');
          
          // Get current user info before clearing
          const currentUser = get().user;
          const currentRole = currentUser?.role || get().getCookie("userRole");
          const deviceId = get().getCookie("deviceId");
          
          // Clear frontend data immediately
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("deviceId");
          localStorage.removeItem("lastLoginAttempt");
          localStorage.removeItem("auth-storage");
          
          // Clear cookies
          document.cookie = "accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          document.cookie = "deviceId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          // Clear frontend state
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
          
          // If we have user info, notify backend to clear database tokens
          if (currentUser && deviceId) {
            try {
              console.log('🔍 forceLogout: Notifying backend to clear database tokens');
              let endpoint = "/users/logout";
              if (currentRole === "seller") endpoint = "/seller/logout";
              if (currentRole === "admin") endpoint = "/admin/logout";
              
              // Send logout request to backend to clear database tokens
              await api.post(endpoint, { deviceId });
              console.log('🔍 forceLogout: Backend tokens cleared successfully');
            } catch (backendError) {
              console.error('🔍 forceLogout: Failed to clear backend tokens:', backendError);
              // Continue anyway - frontend is already cleared
            }
          }
          
          console.log('🔍 forceLogout: Complete logout completed');
        } catch (error) {
          console.error('🔍 forceLogout error:', error);
          // Ensure frontend is cleared even if there's an error
          set({ user: null, isAuthenticated: false, isLoading: false, error: null });
        }
      },

      clearError: () => set({ error: null }),
      
      // Manual role restoration for debugging
      restoreRole: () => {
        try {
          const lastLoginAttempt = localStorage.getItem("lastLoginAttempt");
          if (lastLoginAttempt) {
            const { role } = JSON.parse(lastLoginAttempt);
            console.log('🔍 restoreRole: Found last login role:', role);
            return role;
          }
          return null;
        } catch (error) {
          console.error('🔍 restoreRole error:', error);
          return null;
        }
      },
      
      // Debug function to check all available authentication data
      debugAuth: () => {
        console.log('🔍 === AUTHENTICATION DEBUG INFO ===');
        console.log('🔍 localStorage accessToken:', localStorage.getItem("accessToken"));
        console.log('🔍 localStorage refreshToken:', localStorage.getItem("refreshToken"));
        console.log('🔍 localStorage lastLoginAttempt:', localStorage.getItem("lastLoginAttempt"));
        console.log('🔍 localStorage auth-storage:', localStorage.getItem("auth-storage"));
        console.log('🔍 Cookie accessToken:', get().getCookie("accessToken"));
        console.log('🔍 Cookie refreshToken:', get().getCookie("refreshToken"));
        console.log('🔍 Cookie userRole:', get().getCookie("userRole"));
        console.log('🔍 Cookie deviceId:', get().getCookie("deviceId"));
        console.log('🔍 All cookies:', document.cookie);
        console.log('🔍 Current pathname:', window.location.pathname);
        console.log('🔍 Current hostname:', window.location.hostname);
        console.log('🔍 Current protocol:', window.location.protocol);
        
        // Test if we can set and read a test cookie
        console.log('🔍 Testing cookie functionality...');
        document.cookie = 'testCookie=testValue; path=/; max-age=60';
        console.log('🔍 Test cookie set, now reading:', get().getCookie("testCookie"));
        
        console.log('🔍 === END DEBUG INFO ===');
      },
      
      // Comprehensive role testing for all three roles
      testAllRoles: () => {
        console.log('🧪 Testing all role mappings...');
        
        // Test numeric roles
        const numericTests = [
          { input: 0, expected: 'user' },
          { input: 1, expected: 'admin' },
          { input: 2, expected: 'seller' }
        ];
        
        numericTests.forEach(test => {
          const result = get().mapRole(test.input);
          const success = result === test.expected;
          console.log(`🧪 Numeric role test: ${test.input} → ${result} ${success ? '✅' : '❌'}`);
        });
        
        // Test string roles
        const stringTests = [
          { input: 'user', expected: 'user' },
          { input: 'admin', expected: 'admin' },
          { input: 'seller', expected: 'seller' },
          { input: 'USER', expected: 'user' },
          { input: 'ADMIN', expected: 'admin' },
          { input: 'SELLER', expected: 'seller' }
        ];
        
        stringTests.forEach(test => {
          const result = get().mapRole(test.input);
          const success = result === test.expected;
          console.log(`🧪 String role test: ${test.input} → ${result} ${success ? '✅' : '❌'}`);
        });
        
        // Test ensureStringRole
        const ensureTests = [
          { input: 0, expected: 'user' },
          { input: 1, expected: 'admin' },
          { input: 2, expected: 'seller' },
          { input: 'user', expected: 'user' },
          { input: 'admin', expected: 'admin' },
          { input: 'seller', expected: 'seller' }
        ];
        
        ensureTests.forEach(test => {
          const result = get().ensureStringRole(test.input);
          const success = result === test.expected;
          console.log(`🧪 Ensure string role test: ${test.input} → ${result} ${success ? '✅' : '❌'}`);
        });
        
        console.log('🧪 Role testing completed');
      },

      // Check authentication state on page focus (industry standard)
      setupAuthValidation: () => {
        console.log('🔍 setupAuthValidation: Setting up authentication validation on page focus');
        
        const validateAuth = async () => {
          try {
            // Skip validation if we're currently logging in
            if (get().isLoggingIn) {
              console.log('🔍 Auth validation: Skipping - currently logging in');
              return;
            }
            
            // Check if we have valid authentication by making a profile request
            const userRole = get().getCookie("userRole");
            if (!userRole) {
              console.log('🔍 Auth validation: No user role found - forcing logout');
              get().forceLogout();
              return;
            }
            
            // Try to fetch profile to validate authentication
            const profileEndpoint = userRole === 'admin' ? '/admin/profile' : 
                                  userRole === 'seller' ? '/seller/profile' : 
                                  '/users/profile';
            
            await api.get(profileEndpoint);
            console.log('🔍 Auth validation: Authentication still valid');
          } catch (error) {
            console.log('🔍 Auth validation: Authentication failed - forcing logout');
            get().forceLogout();
          }
        };
        
        // Check on page focus (user returns to tab) - but with a delay to avoid immediate validation
        const delayedValidateAuth = () => {
          // Add a small delay to ensure cookies are set after login
          setTimeout(validateAuth, 1000);
        };
        
        document.addEventListener('visibilitychange', delayedValidateAuth);
        window.addEventListener('focus', delayedValidateAuth);
        
        return () => {
          document.removeEventListener('visibilitychange', delayedValidateAuth);
          window.removeEventListener('focus', delayedValidateAuth);
        };
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);