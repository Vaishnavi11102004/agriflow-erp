import { useCallback, useState, useEffect } from 'react';
import { getRateLimitErrorMessage, getRateLimitStatus, clearRateLimits } from '../utils/rateLimiter';
import toast from 'react-hot-toast';

/**
 * React hook for handling rate limiting in components
 * @param {Object} options - Configuration options
 * @param {boolean} options.showToast - Whether to show toast notifications (default: true)
 * @param {boolean} options.autoRetry - Whether to auto-retry after rate limit (default: false)
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 */
export function useRateLimit(options = {}) {
  const { showToast = true, autoRetry = false, maxRetries = 3 } = options;
  const [retryCount, setRetryCount] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  // Reset rate limit state after cooldown
  useEffect(() => {
    if (isRateLimited && rateLimitInfo?.retryAfter) {
      const timer = setTimeout(() => {
        setIsRateLimited(false);
        setRateLimitInfo(null);
        setRetryCount(0);
      }, rateLimitInfo.retryAfter * 1000);

      return () => clearTimeout(timer);
    }
  }, [isRateLimited, rateLimitInfo]);

  /**
   * Handle rate limit error
   */
  const handleRateLimitError = useCallback((error, url, method) => {
    const rateLimitError = getRateLimitErrorMessage(error, url, method);
    
    if (rateLimitError) {
      setIsRateLimited(true);
      setRateLimitInfo(rateLimitError);
      setRetryCount(prev => prev + 1);

      if (showToast) {
        toast.error(
          <div>
            <strong>{rateLimitError.title}</strong>
            <p>{rateLimitError.message}</p>
          </div>,
          {
            duration: rateLimitError.retryAfter * 1000,
            icon: '⚠️',
          }
        );
      }

      return rateLimitError;
    }

    return null;
  }, [showToast]);

  /**
   * Execute a function with rate limit handling
   */
  const executeWithRateLimitHandling = useCallback(async (fn, url, method = 'GET') => {
    try {
      const result = await fn();
      setRetryCount(0); // Reset retry count on success
      return result;
    } catch (error) {
      const rateLimitError = handleRateLimitError(error, url, method);
      
      // Auto-retry if enabled and under max retries
      if (autoRetry && retryCount < maxRetries && rateLimitError) {
        await new Promise(resolve => setTimeout(resolve, rateLimitError.retryAfter * 1000));
        return executeWithRateLimitHandling(fn, url, method);
      }

      throw error;
    }
  }, [handleRateLimitError, autoRetry, maxRetries, retryCount]);

  /**
   * Clear rate limit state
   */
  const resetRateLimit = useCallback(() => {
    setIsRateLimited(false);
    setRateLimitInfo(null);
    setRetryCount(0);
    clearRateLimits();
  }, []);

  /**
   * Get current rate limit status
   */
  const status = getRateLimitStatus();

  return {
    isRateLimited,
    rateLimitInfo,
    retryCount,
    maxRetries,
    status,
    handleRateLimitError,
    executeWithRateLimitHandling,
    resetRateLimit,
  };
}

/**
 * Higher-order component to wrap components with rate limit handling
 */
export function withRateLimit(WrappedComponent, options = {}) {
  return function RateLimitWrapper(props) {
    const rateLimit = useRateLimit(options);
    return <WrappedComponent {...props} rateLimit={rateLimit} />;
  };
}

export default useRateLimit;