/**
 * Frontend Rate Limiter
 * Prevents excessive API calls and handles 429 responses gracefully
 */

// Rate limit configuration (mirrors backend config)
const RATE_LIMITS = {
  global: { windowMs: 15 * 60 * 1000, max: 200 }, // 15 min, 200 requests
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 15 min, 5 requests (strict)
  login: { windowMs: 5 * 60 * 1000, max: 3 }, // 5 min, 3 requests (very strict)
  otp: { windowMs: 60 * 1000, max: 3 }, // 1 min, 3 requests
  write: { windowMs: 5 * 60 * 1000, max: 30 }, // 5 min, 30 requests
  upload: { windowMs: 15 * 60 * 1000, max: 10 }, // 15 min, 10 requests
  admin: { windowMs: 5 * 60 * 1000, max: 100 }, // 5 min, 100 requests
};

// Track requests per category
const requestTracker = {
  global: [],
  auth: [],
  login: [],
  otp: [],
  write: [],
  upload: [],
  admin: [],
};

// Request queue for pending requests
const requestQueue = [];
let isProcessingQueue = false;

// Determine rate limit category based on URL and method
function getCategory(url, method) {
  // Login-specific (very strict)
  if (url.includes('/auth/login') && method === 'POST') {
    return 'login';
  }
  // OTP endpoints (very strict)
  if (url.includes('/auth/send-otp') || url.includes('/auth/forgot-password/send-otp')) {
    return 'otp';
  }
  // All other auth endpoints
  if (url.includes('/auth/')) {
    return 'auth';
  }
  // Upload endpoints
  if (url.includes('/upload')) {
    return 'upload';
  }
  // Admin endpoints
  if (url.includes('/admin')) {
    return 'admin';
  }
  // Write operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return 'write';
  }
  // Everything else
  return 'global';
}

// Check if request is within rate limit
function isWithinRateLimit(category) {
  const now = Date.now();
  const limit = RATE_LIMITS[category];
  
  // Remove old requests outside the window
  requestTracker[category] = requestTracker[category].filter(
    timestamp => now - timestamp < limit.windowMs
  );
  
  // Check if under limit
  return requestTracker[category].length < limit.max;
}

// Get time until reset (in seconds)
function getRetryAfter(category) {
  const now = Date.now();
  const limit = RATE_LIMITS[category];
  
  if (requestTracker[category].length === 0) return 0;
  
  const oldestRequest = Math.min(...requestTracker[category]);
  const resetTime = oldestRequest + limit.windowMs;
  const retryAfter = Math.ceil((resetTime - now) / 1000);
  
  return Math.max(0, retryAfter);
}

// Record a request
function recordRequest(category) {
  requestTracker[category].push(Date.now());
}

// Process queued requests
async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    const { request, resolve, reject, category } = requestQueue[0];
    
    if (isWithinRateLimit(category)) {
      requestQueue.shift();
      try {
        const response = await request();
        recordRequest(category);
        resolve(response);
      } catch (error) {
        reject(error);
      }
    } else {
      // Wait before retrying
      const retryAfter = getRetryAfter(category);
      await new Promise(resolve => setTimeout(resolve, Math.min(retryAfter * 1000, 5000)));
    }
  }
  
  isProcessingQueue = false;
}

// Queue a request
function queueRequest(request, category) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ request, resolve, reject, category });
    processQueue();
  });
}

// Format retry time for display
function formatRetryTime(seconds) {
  if (seconds <= 0) return 'a moment';
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// Get user-friendly error message
export function getRateLimitErrorMessage(error, url, method) {
  const category = getCategory(url, method);
  const retryAfter = getRetryAfter(category);
  
  if (error.response?.status === 429) {
    const backendRetryAfter = error.response.headers['retry-after'];
    const seconds = backendRetryAfter ? parseInt(backendRetryAfter) : retryAfter;
    
    return {
      title: 'Rate Limit Exceeded',
      message: `Too many requests. Please try again in ${formatRetryTime(seconds)}.`,
      retryAfter: seconds,
      category,
    };
  }
  
  return null;
}

// Check if request should be blocked client-side
export function shouldBlockRequest(url, method) {
  const category = getCategory(url, method);
  return !isWithinRateLimit(category);
}

// Execute request with rate limiting
export async function executeWithRateLimit(requestFn, url, method) {
  const category = getCategory(url, method);
  
  // Check if we should queue or block
  if (!isWithinRateLimit(category)) {
    const retryAfter = getRetryAfter(category);
    
  // For critical operations (OTP, auth, login), queue the request
  if (['otp', 'auth', 'login'].includes(category)) {
    console.warn(`Rate limit reached for ${category}. Queuing request...`);
    return queueRequest(requestFn, category);
  }
    
    // For other requests, throw error immediately
    const error = new Error('Rate limit exceeded');
    error.status = 429;
    error.retryAfter = retryAfter;
    error.category = category;
    throw error;
  }
  
  // Execute request
  try {
    const response = await requestFn();
    recordRequest(category);
    return response;
  } catch (error) {
    // If rate limited by backend, queue for retry
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || getRetryAfter(category);
      console.warn(`Backend rate limited. Retrying after ${retryAfter} seconds...`);
      
      if (['otp', 'auth', 'login'].includes(category)) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return executeWithRateLimit(requestFn, url, method);
      }
    }
    throw error;
  }
}

// Get rate limit status for debugging
export function getRateLimitStatus() {
  const now = Date.now();
  const status = {};
  
  for (const [category, limit] of Object.entries(RATE_LIMITS)) {
    const requests = requestTracker[category].filter(
      timestamp => now - timestamp < limit.windowMs
    );
    status[category] = {
      used: requests.length,
      max: limit.max,
      remaining: limit.max - requests.length,
      resetIn: requests.length > 0 
        ? Math.ceil((Math.min(...requests) + limit.windowMs - now) / 1000)
        : 0,
    };
  }
  
  return status;
}

// Clear rate limit tracker (for testing)
export function clearRateLimits() {
  for (const category of Object.keys(requestTracker)) {
    requestTracker[category] = [];
  }
  requestQueue.length = 0;
}

export default {
  executeWithRateLimit,
  shouldBlockRequest,
  getRateLimitErrorMessage,
  getRateLimitStatus,
  clearRateLimits,
  RATE_LIMITS,
};