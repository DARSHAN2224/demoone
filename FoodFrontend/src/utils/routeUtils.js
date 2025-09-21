// Route protection utilities (Industry Standard)

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

/**
 * Check if user has valid authentication cookies
 * @returns {boolean} True if user has valid cookies
 */
export const hasValidAuthCookies = () => {
  const userRole = getCookie('userRole');
  const deviceId = getCookie('deviceId');
  
  // We don't check accessToken/refreshToken as they're httpOnly
  // We only check the role and deviceId that frontend sets
  return !!(userRole && deviceId);
};

/**
 * Get user role from cookies
 * @returns {string|null} User role or null
 */
export const getUserRoleFromCookies = () => {
  return getCookie('userRole');
};

/**
 * Get appropriate redirect path based on user role
 * @param {string} role - User role
 * @returns {string} Redirect path
 */
export const getRedirectPathForRole = (role) => {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'seller':
      return '/seller';
    case 'user':
    default:
      return '/';
  }
};

/**
 * Check if current path matches user role
 * @param {string} currentPath - Current URL path
 * @param {string} userRole - User role
 * @returns {boolean} True if path matches role
 */
export const isPathMatchingRole = (currentPath, userRole) => {
  if (!userRole) return false;
  
  const rolePaths = {
    admin: '/admin',
    seller: '/seller',
    user: '/'
  };
  
  const expectedPath = rolePaths[userRole];
  return currentPath === expectedPath || currentPath.startsWith(expectedPath + '/');
};

/**
 * Clear all authentication cookies
 */
export const clearAuthCookies = () => {
  const cookies = ['accessToken', 'refreshToken', 'userRole', 'deviceId'];
  cookies.forEach(cookie => {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
  });
};

/**
 * Validate authentication state and redirect if needed
 * @param {Object} authState - Current authentication state
 * @param {string} currentPath - Current URL path
 * @returns {Object} Validation result with redirect info
 */
export const validateAuthAndRedirect = (authState, currentPath) => {
  const { isAuthenticated, user, isLoading } = authState;
  
  // If still loading, don't redirect
  if (isLoading) {
    return { shouldRedirect: false, reason: 'loading' };
  }
  
  // If not authenticated but has cookies, might need to refresh auth
  if (!isAuthenticated && hasValidAuthCookies()) {
    return { shouldRedirect: false, reason: 'needs_auth_refresh' };
  }
  
  // If authenticated but on wrong path, redirect
  if (isAuthenticated && user?.role) {
    const expectedPath = getRedirectPathForRole(user.role);
    
    // Don't redirect if already on correct path
    if (currentPath === expectedPath || currentPath.startsWith(expectedPath + '/')) {
      return { shouldRedirect: false, reason: 'correct_path' };
    }
    
    return { 
      shouldRedirect: true, 
      redirectTo: expectedPath, 
      reason: 'role_mismatch' 
    };
  }
  
  // If authenticated but no role, redirect to home
  if (isAuthenticated && !user?.role) {
    return { 
      shouldRedirect: true, 
      redirectTo: '/', 
      reason: 'no_role' 
    };
  }
  
  return { shouldRedirect: false, reason: 'no_auth' };
};
