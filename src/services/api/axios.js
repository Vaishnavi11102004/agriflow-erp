import axios from 'axios';
import { executeWithRateLimit, getRateLimitErrorMessage } from '../../utils/rateLimiter';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('agro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      sessionStorage.removeItem('agro_token');
      sessionStorage.removeItem('agro_user');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Handle 429 Rate Limit Exceeded
    if (error.response?.status === 429) {
      const rateLimitInfo = getRateLimitErrorMessage(error, error.config.url, error.config.method);
      
      // Log for debugging
      console.warn('Rate limit exceeded:', rateLimitInfo);
      
      // Add retry information to error
      error.rateLimitInfo = rateLimitInfo;
      error.retryAfter = error.response.headers['retry-after'] || rateLimitInfo?.retryAfter || 60;
    }

    return Promise.reject(error);
  }
);

/**
 * Wrapper for API requests with rate limiting
 * @param {Function} requestFn - Function that returns a promise (the actual API call)
 * @param {string} url - The request URL
 * @param {string} method - HTTP method
 * @returns {Promise} The response data
 */
export async function requestWithRateLimit(requestFn, url, method = 'GET') {
  try {
    return await executeWithRateLimit(requestFn, url, method);
  } catch (error) {
    // If it's a rate limit error, enhance it with user-friendly message
    if (error.status === 429 || error.response?.status === 429) {
      const rateLimitInfo = getRateLimitErrorMessage(error, url, method);
      const enhancedError = new Error(rateLimitInfo?.message || 'Too many requests. Please try again later.');
      enhancedError.status = 429;
      enhancedError.retryAfter = error.retryAfter || rateLimitInfo?.retryAfter || 60;
      enhancedError.rateLimitInfo = rateLimitInfo;
      throw enhancedError;
    }
    throw error;
  }
}

// Export enhanced API instance
export default api;
