const rateLimit = require('express-rate-limit');

/**
 * Rate limiting configuration for different endpoint categories
 * Limits are configurable via environment variables
 */
const RATE_LIMIT_CONFIG = {
  // Global API limit - applies to all /api routes
  global: {
    windowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX) || 200, // requests per window
    message: { 
      error: 'Too many requests', 
      retryAfter: 'Please try again later',
      limitType: 'global'
    },
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
  },

  // Auth endpoints - stricter limits to prevent brute force
  auth: {
    windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 5, // requests per window
    message: { 
      error: 'Too many authentication attempts', 
      retryAfter: 'Please try again later',
      limitType: 'auth'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Login-specific - very strict to prevent brute force
  login: {
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 3, // requests per window
    message: { 
      error: 'Too many login attempts', 
      retryAfter: 'Please wait 5 minutes before trying again',
      limitType: 'login'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // OTP endpoints - very strict to prevent SMS abuse
  otp: {
    windowMs: parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS) || 60 * 1000, // 1 minute
    max: parseInt(process.env.RATE_LIMIT_OTP_MAX) || 3, // requests per window
    message: { 
      error: 'Too many OTP requests', 
      retryAfter: 'Please wait 1 minute before requesting another OTP',
      limitType: 'otp'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Write operations - moderate limits
  write: {
    windowMs: parseInt(process.env.RATE_LIMIT_WRITE_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_WRITE_MAX) || 30, // requests per window
    message: { 
      error: 'Too many write operations', 
      retryAfter: 'Please slow down your requests',
      limitType: 'write'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Upload endpoint - strict due to resource intensity
  upload: {
    windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX) || 10, // requests per window
    message: { 
      error: 'Too many upload attempts', 
      retryAfter: 'Please try again later',
      limitType: 'upload'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Admin operations - higher limits for managers
  admin: {
    windowMs: parseInt(process.env.RATE_LIMIT_ADMIN_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
    max: parseInt(process.env.RATE_LIMIT_ADMIN_MAX) || 100, // requests per window
    message: { 
      error: 'Too many admin requests', 
      retryAfter: 'Please try again later',
      limitType: 'admin'
    },
    standardHeaders: true,
    legacyHeaders: false,
  },
};

/**
 * Create rate limiter instances
 */
const limiters = {
  global: rateLimit(RATE_LIMIT_CONFIG.global),
  auth: rateLimit(RATE_LIMIT_CONFIG.auth),
  login: rateLimit(RATE_LIMIT_CONFIG.login),
  otp: rateLimit(RATE_LIMIT_CONFIG.otp),
  write: rateLimit(RATE_LIMIT_CONFIG.write),
  upload: rateLimit(RATE_LIMIT_CONFIG.upload),
  admin: rateLimit(RATE_LIMIT_CONFIG.admin),
};

/**
 * Middleware factory to apply rate limiting based on HTTP method
 */
function createMethodBasedLimiter(writeLimiter, readLimiter) {
  return (req, res, next) => {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethods.includes(req.method)) {
      return writeLimiter(req, res, next);
    }
    return readLimiter(req, res, next);
  };
}

/**
 * Custom rate limiter that considers user role for dynamic limits
 * Admins get higher limits than regular users
 */
function createRoleBasedLimiter(baseLimiter, roleMultipliers = {}) {
  const defaultMultipliers = {
    'super_admin': 3,
    'manager': 2,
    'farmer': 1,
  };
  
  const multipliers = { ...defaultMultipliers, ...roleMultipliers };
  
  return (req, res, next) => {
    // Get user role from auth middleware (if available)
    const userRole = req.user?.role;
    
    if (userRole && multipliers[userRole]) {
      // Clone the limiter config with adjusted max
      const adjustedLimiter = rateLimit({
        ...RATE_LIMIT_CONFIG.global,
        max: RATE_LIMIT_CONFIG.global.max * multipliers[userRole],
        message: {
          ...RATE_LIMIT_CONFIG.global.message,
          role: userRole,
          limitMultiplier: multipliers[userRole],
        },
      });
      return adjustedLimiter(req, res, next);
    }
    
    return baseLimiter(req, res, next);
  };
}

/**
 * Skip rate limiting for health checks and specific IPs
 */
function createSkipCheck(skipPaths = ['/api/health'], skipIps = []) {
  return (req, res, next) => {
    // Skip for health check
    if (skipPaths.some(path => req.path === path || req.path.startsWith(path))) {
      return next();
    }
    
    // Skip for whitelisted IPs
    const clientIp = req.ip || req.connection.remoteAddress;
    if (skipIps.includes(clientIp)) {
      return next();
    }
    
    next();
  };
}

module.exports = {
  limiters,
  RATE_LIMIT_CONFIG,
  createMethodBasedLimiter,
  createRoleBasedLimiter,
  createSkipCheck,
};