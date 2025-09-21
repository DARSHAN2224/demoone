import csurf from 'csurf';

// Initialize CSRF middleware (Industry Standard)
export const csrfProtection = csurf({ 
  cookie: { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production', 
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax' 
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'] // Don't require CSRF for these methods
});

// CSRF error handler (Industry Standard)
export const handleCsrfErrors = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.log('🔒 CSRF token validation failed:', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed',
      error: 'Invalid CSRF token',
      timestamp: new Date().toISOString()
    });
  }
  next(err);
};

// CSRF token generator for frontend
export const generateCsrfToken = (req, res) => {
  try {
    // Check if csrfToken function is available
    if (typeof req.csrfToken !== 'function') {
      console.error('🔒 CSRF token function not available');
      return res.status(500).json({
        success: false,
        message: 'CSRF protection not properly configured',
        error: 'CSRF middleware not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const token = req.csrfToken();
    res.status(200).json({
      success: true,
      csrfToken: token,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🔒 Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
