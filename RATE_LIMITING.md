# Rate Limiting Implementation

This document describes the comprehensive rate limiting strategy implemented across the AgriFlow ERP project to protect against abuse, ensure fair usage, and maintain system stability.

## Table of Contents

1. [Overview](#overview)
2. [Backend Rate Limiting](#backend-rate-limiting)
3. [Frontend Rate Limiting](#frontend-rate-limiting)
4. [Configuration](#configuration)
5. [Usage Examples](#usage-examples)
6. [Monitoring & Debugging](#monitoring--debugging)
7. [Best Practices](#best-practices)

---

## Overview

The rate limiting system operates at two levels:

1. **Backend (Server-side)**: Express.js middleware using `express-rate-limit` that enforces strict limits on API endpoints
2. **Frontend (Client-side)**: Request tracking and queuing to prevent unnecessary requests and provide better UX

### Key Features

- **Per-category rate limits**: Different limits for auth, OTP, write operations, uploads, and admin functions
- **Role-based limits**: Admins get higher limits (3x for super_admin, 2x for manager)
- **Configurable via environment variables**: Easy to adjust without code changes
- **Standard rate limit headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Graceful error handling**: User-friendly messages with retry information
- **Request queuing**: Critical operations (OTP, auth) are queued instead of rejected
- **Health check exemption**: `/api/health` is excluded from rate limiting

---

## Backend Rate Limiting

### Architecture

```
Request → Skip Check → Category-specific Limiter → Route Handler
```

### Rate Limit Categories

| Category | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| **Global** | 15 min | 200 | Default for all API routes |
| **Auth** | 15 min | 20 | Login, registration, password change |
| **OTP** | 1 min | 3 | Send OTP, forgot password OTP |
| **Write** | 5 min | 30 | POST, PUT, PATCH, DELETE operations |
| **Upload** | 15 min | 10 | File uploads (resource-intensive) |
| **Admin** | 5 min | 100 | Manager and super_admin operations |

### Implementation

**File**: `server/middleware/rateLimiter.js`

```javascript
const { limiters, createSkipCheck } = require('./middleware/rateLimiter');
const skipCheck = createSkipCheck(['/api/health']);

// Apply rate limiters
app.use('/api/', skipCheck, limiters.global);
app.use('/api/auth/', skipCheck, limiters.auth);
app.use('/api/auth/send-otp', skipCheck, limiters.otp);
app.use('/api/auth/forgot-password/send-otp', skipCheck, limiters.otp);
app.use('/api/upload', skipCheck, limiters.upload);
app.use('/api/admin', skipCheck, limiters.admin);
```

### Response Headers

When rate limiting is active, responses include:

```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 149
X-RateLimit-Reset: 1699123456
```

### Error Response

When limit is exceeded (HTTP 429):

```json
{
  "error": "Too many requests",
  "retryAfter": "Please try again later",
  "limitType": "global"
}
```

---

## Frontend Rate Limiting

### Architecture

```
API Request → Client-side Check → Queue (if needed) → Backend → Response
```

### Features

1. **Request Tracking**: Tracks requests per category in memory
2. **Automatic Queuing**: Critical operations (OTP, auth) are queued automatically
3. **Error Enhancement**: Adds user-friendly messages to 429 errors
4. **Toast Notifications**: Shows rate limit warnings via react-hot-toast
5. **Status Monitoring**: Real-time rate limit status display

### Implementation

**File**: `src/utils/rateLimiter.js`

```javascript
import { executeWithRateLimit, getRateLimitErrorMessage } from '../utils/rateLimiter';

// Wrap API calls with rate limiting
const response = await executeWithRateLimit(
  () => api.post('/auth/login', credentials),
  '/auth/login',
  'POST'
);
```

### React Hook

**File**: `src/hooks/useRateLimit.js`

```javascript
import { useRateLimit } from '../hooks/useRateLimit';

function LoginComponent() {
  const { executeWithRateLimitHandling, isRateLimited, rateLimitInfo } = useRateLimit({
    showToast: true,
    autoRetry: false,
    maxRetries: 3
  });

  const handleLogin = async (credentials) => {
    try {
      await executeWithRateLimitHandling(
        () => api.post('/auth/login', credentials),
        '/auth/login',
        'POST'
      );
    } catch (error) {
      // Error already handled with toast notification
      console.error('Login failed:', error);
    }
  };

  if (isRateLimited) {
    return <div>Please wait {rateLimitInfo.retryAfter} seconds...</div>;
  }

  return <LoginForm onSubmit={handleLogin} />;
}
```

---

## Configuration

### Environment Variables

All rate limits are configurable via `.env` file:

```env
# Global API limit (requests per 15 minutes)
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_GLOBAL_WINDOW_MS=900000

# Auth endpoints limit (requests per 15 minutes)
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_AUTH_WINDOW_MS=900000

# OTP endpoints limit (requests per 1 minute)
RATE_LIMIT_OTP_MAX=3
RATE_LIMIT_OTP_WINDOW_MS=60000

# Write operations limit (requests per 5 minutes)
RATE_LIMIT_WRITE_MAX=30
RATE_LIMIT_WRITE_WINDOW_MS=300000

# Upload limit (requests per 15 minutes)
RATE_LIMIT_UPLOAD_MAX=10
RATE_LIMIT_UPLOAD_WINDOW_MS=900000

# Admin operations limit (requests per 5 minutes)
RATE_LIMIT_ADMIN_MAX=100
RATE_LIMIT_ADMIN_WINDOW_MS=300000
```

### Production Recommendations

For production deployments, consider:

1. **Redis Store**: Replace memory store with Redis for multi-server deployments
2. **Stricter Limits**: Reduce limits for public endpoints
3. **IP Whitelisting**: Add trusted IPs to skip list
4. **Dynamic Limits**: Adjust based on user behavior/trust score

```javascript
// Example: Redis store for production
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL
});

const limiters = {
  global: rateLimit({
    ...RATE_LIMIT_CONFIG.global,
    store: new RedisStore({ client: redisClient })
  })
};
```

---

## Usage Examples

### Backend: Custom Route Protection

```javascript
const router = express.Router();
const { limiters, createMethodBasedLimiter } = require('../middleware/rateLimiter');

// Apply write limiter to POST/PUT/PATCH/DELETE
const cropsLimiter = createMethodBasedLimiter(limiters.write, limiters.global);

router.post('/crops', ...isFarmer, cropsLimiter, async (req, res) => {
  // Your handler
});
```

### Backend: Role-Based Limits

```javascript
const { createRoleBasedLimiter } = require('../middleware/rateLimiter');

// Admins get 3x limits, managers 2x, farmers 1x
const dynamicLimiter = createRoleBasedLimiter(limiters.global);

router.get('/dashboard', ...isFarmer, dynamicLimiter, async (req, res) => {
  // Your handler
});
```

### Frontend: Direct API Call

```javascript
import api, { requestWithRateLimit } from '../services/api/axios';

// Method 1: Using requestWithRateLimit wrapper
const fetchData = async () => {
  try {
    const response = await requestWithRateLimit(
      () => api.get('/farmer/crops'),
      '/farmer/crops',
      'GET'
    );
    return response.data;
  } catch (error) {
    if (error.status === 429) {
      console.log(`Retry after ${error.retryAfter} seconds`);
    }
    throw error;
  }
};

// Method 2: Using enhanced axios interceptor (automatic)
const fetchDataAuto = async () => {
  const response = await api.get('/farmer/crops');
  return response.data;
  // 429 errors are automatically enhanced with retry info
};
```

### Frontend: React Query Integration

```javascript
import { useQuery } from '@tanstack/react-query';
import { requestWithRateLimit } from '../services/api/axios';

const useCrops = () => {
  return useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const response = await requestWithRateLimit(
        () => api.get('/farmer/crops'),
        '/farmer/crops',
        'GET'
      );
      return response.data;
    },
    retry: (failureCount, error) => {
      // Don't retry on rate limit errors
      if (error.status === 429) return false;
      return failureCount < 3;
    }
  });
};
```

---

## Monitoring & Debugging

### Debug Component

Add the `RateLimitStatus` component to any page for real-time monitoring:

```javascript
import { RateLimitStatus } from '../components/RateLimitStatus';

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <RateLimitStatus />
      {/* Rest of dashboard */}
    </div>
  );
}
```

### Console Commands

```javascript
// Import utilities
import { getRateLimitStatus, clearRateLimits } from '../utils/rateLimiter';

// Check current status
console.log(getRateLimitStatus());

// Clear all rate limits (testing only)
clearRateLimits();
```

### Backend Logging

Rate limit hits are logged automatically:

```
⚠️  Rate limit exceeded for IP 192.168.1.1 on /api/auth/login
```

---

## Best Practices

### 1. **Frontend: Debounce User Actions**

```javascript
import { useDebounce } from '../hooks/useDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch) {
      // This won't fire on every keystroke
      fetchSearchResults(debouncedSearch);
    }
  }, [debouncedSearch]);
}
```

### 2. **Frontend: Cache Read-Only Data**

```javascript
import { useQuery } from '@tanstack/react-query';

// Cache market rates for 5 minutes
const { data: marketRates } = useQuery({
  queryKey: ['market-rates'],
  queryFn: () => api.get('/public/market-rates').then(res => res.data),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### 3. **Frontend: Batch Requests**

```javascript
// Instead of multiple individual requests
const [users, setUsers] = useState([]);
const [orders, setOrders] = useState([]);

// Use Promise.all for parallel requests
useEffect(() => {
  Promise.all([
    api.get('/users'),
    api.get('/orders')
  ]).then(([usersRes, ordersRes]) => {
    setUsers(usersRes.data);
    setOrders(ordersRes.data);
  });
}, []);
```

### 4. **Backend: Exempt Health Checks**

```javascript
const { createSkipCheck } = require('./middleware/rateLimiter');

// Always skip health checks
const skipCheck = createSkipCheck(['/api/health', '/api/status']);
app.use('/api/', skipCheck, limiters.global);
```

### 5. **Backend: Use Standard Headers**

```javascript
const limiter = rateLimit({
  standardHeaders: true, // Use X-RateLimit-* headers
  legacyHeaders: false,  // Disable deprecated headers
});
```

### 6. **Testing: Clear Rate Limits**

```javascript
// In test setup
import { clearRateLimits } from '../utils/rateLimiter';

beforeEach(() => {
  clearRateLimits();
});
```

---

## Troubleshooting

### Issue: Users hitting rate limits unexpectedly

**Solution**: Check if frontend is making duplicate requests. Use React Query or similar to cache data.

### Issue: Rate limits too strict for development

**Solution**: Increase limits in `.env` or use `NODE_ENV=production` check:

```javascript
const isDev = process.env.NODE_ENV !== 'production';
const limits = isDev ? 1000 : 200; // Higher limits in dev
```

### Issue: Multi-server deployment causing inconsistent limits

**Solution**: Use Redis store instead of memory store:

```javascript
const RedisStore = require('rate-limit-redis');
```

### Issue: OTP requests still being abused

**Solution**: Add CAPTCHA after 2 failed OTP attempts, or implement phone number verification.

---

## Security Considerations

1. **Never expose rate limit values in frontend code** - Use environment variables
2. **Log all rate limit violations** - Monitor for attack patterns
3. **Implement IP blocking** - For repeated offenders
4. **Use HTTPS** - Prevent IP spoofing
5. **Monitor slow queries** - Rate limiting doesn't prevent DoS via complex queries

---

## Performance Impact

- **Backend**: Minimal (~1-2ms per request for memory store)
- **Frontend**: Negligible (in-memory tracking)
- **Redis Store**: ~5-10ms per request (acceptable for production)

---

## Migration Guide

### From Basic to Advanced Rate Limiting

**Before** (basic):
```javascript
const limiter = rateLimit({ windowMs: 900000, max: 200 });
app.use('/api/', limiter);
```

**After** (advanced):
```javascript
const { limiters, createSkipCheck } = require('./middleware/rateLimiter');
const skipCheck = createSkipCheck(['/api/health']);

app.use('/api/', skipCheck, limiters.global);
app.use('/api/auth/', skipCheck, limiters.auth);
app.use('/api/upload', skipCheck, limiters.upload);
app.use('/api/admin', skipCheck, limiters.admin);
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review rate limit status using debug component
3. Check server logs for rate limit violations
4. Adjust limits in `.env` as needed

---

## License

Part of AgriFlow ERP Project