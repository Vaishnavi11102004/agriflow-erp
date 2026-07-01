# Security Implementation Summary

This document provides a comprehensive overview of all security measures implemented in the AgriFlow ERP project.

## Table of Contents

1. [Security Layers](#security-layers)
2. [Rate Limiting](#rate-limiting)
3. [Input Validation](#input-validation)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Protection](#data-protection)
6. [File Upload Security](#file-upload-security)
7. [Security Headers](#security-headers)
8. [Audit & Monitoring](#audit--monitoring)
9. [Security Checklist](#security-checklist)

---

## Security Layers

The project implements defense-in-depth with multiple security layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                           │
├─────────────────────────────────────────────────────────────┤
│ 1. Rate Limiting (DDoS/Abuse Prevention)                    │
│ 2. Input Validation (Data Integrity)                        │
│ 3. Authentication (JWT Tokens)                               │
│ 4. Authorization (Role-Based Access)                         │
│ 5. Input Sanitization (XSS Prevention)                       │
│ 6. SQL Injection Prevention (Parameterized Queries)          │
│ 7. File Upload Validation                                    │
│ 8. Security Headers (Helmet.js)                             │
│ 9. CORS Configuration                                        │
│ 10. Audit Logging                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Rate Limiting

### Implementation
- **File**: `server/middleware/rateLimiter.js`
- **Library**: express-rate-limit
- **Store**: Memory store (upgradeable to Redis)

### Rate Limits by Category

| Category | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| Global | 15 min | 200 | Default API limit |
| Auth | 15 min | 20 | Login/registration |
| OTP | 1 min | 3 | SMS abuse prevention |
| Write | 5 min | 30 | Data modification |
| Upload | 15 min | 10 | Resource protection |
| Admin | 5 min | 100 | Manager operations |

### Features
- ✅ Per-IP rate limiting
- ✅ Standard headers (X-RateLimit-*)
- ✅ Health check exemption
- ✅ Role-based multipliers (admins get higher limits)
- ✅ Configurable via environment variables
- ✅ Frontend request queuing
- ✅ 429 error handling with retry information

### Documentation
- **File**: `RATE_LIMITING.md`
- **Examples**: `src/examples/rateLimitExample.jsx`
- **Hook**: `src/hooks/useRateLimit.js`

---

## Input Validation

### Implementation
- **File**: `server/middleware/validation.js`
- **Library**: express-validator
- **Coverage**: 100% of POST/PATCH/PUT routes

### Validation Rules

#### Auth Routes
- **Phone**: Exactly 10 digits, numeric only
- **Email**: Valid email format (optional)
- **Password**: 8-100 chars, letter + number required
- **OTP**: Exactly 6 digits
- **Name**: 2-100 chars, letters and spaces only

#### Farmer Routes
- **Crop Type**: 2-100 characters
- **Acres**: Positive number, max 1000
- **Date**: YYYY-MM-DD format
- **Bank Details**: IFSC code format, account number 9-18 digits
- **UPI ID**: name@upi format

#### Admin Routes
- **Status**: Enum validation (active, rejected, approved, etc.)
- **Warehouse**: Name, address, capacity validation
- **Time**: HH:MM 24-hour format
- **Grade**: A, B, or C only

#### File Uploads
- **Size**: Maximum 5MB
- **Types**: PNG, JPG, JPEG, GIF, WEBP, PDF
- **Format**: Base64 data URI required

### Features
- ✅ Comprehensive field validation
- ✅ XSS prevention via sanitization
- ✅ Consistent error response format
- ✅ Pre-built validation schemas
- ✅ Frontend validation mirroring backend

### Documentation
- **File**: `VALIDATION.md`
- **Frontend Utils**: `src/utils/validation.js`
- **React Hook**: `useFormValidation`

---

## Authentication & Authorization

### Implementation
- **File**: `server/middleware/auth.js`
- **Method**: JWT (JSON Web Tokens)
- **Expiry**: 7 days (configurable)

### Authentication Flow
```
1. User submits credentials (phone + password)
2. Server validates against database
3. JWT token generated with user ID and role
4. Token returned to client
5. Client stores in sessionStorage
6. Subsequent requests include Bearer token
7. Server validates token on each request
```

### Authorization Levels

| Role | Access Level |
|------|--------------|
| **farmer** | Own data only (profile, crops, purchases, sales) |
| **manager** | All farmers + warehouse management |
| **super_admin** | Full access including manager management |

### Features
- ✅ JWT token-based authentication
- ✅ Role-based access control (RBAC)
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ First login password change enforcement
- ✅ Account status checks (pending, active, suspended, rejected)
- ✅ Audit logging for all authentication events

### Security Measures
- Passwords never returned in API responses
- Tokens expire after 7 days
- Invalid tokens automatically clear session
- Suspended accounts cannot login
- Failed login attempts logged

---

## Data Protection

### SQL Injection Prevention
- **Method**: Parameterized queries only
- **Library**: pg (PostgreSQL client)

```javascript
// ✅ SAFE
const { rows } = await db.query(
  'SELECT * FROM users WHERE phone = $1',
  [phone]
);

// ❌ NEVER ALLOWED
const { rows } = await db.query(
  `SELECT * FROM users WHERE phone = '${phone}'`
);
```

### XSS Prevention
- **Backend**: Input sanitization removes HTML tags
- **Frontend**: React's built-in XSS protection
- **Sanitization**: Removes `<`, `>`, and HTML tags

```javascript
// Input: "<script>alert('xss')</script>"
// After sanitization: "scriptalertxssscript"
```

### Sensitive Data Handling
- Passwords: Bcrypt hashed (never stored in plain text)
- OTPs: Stored temporarily with expiry
- Tokens: JWT with secret key
- Personal info: Encrypted in transit (HTTPS required)

---

## File Upload Security

### Implementation
- **File**: `server/routes/upload.js`
- **Storage**: Local filesystem (configurable to S3)

### Security Layers

1. **Format Validation**
   - Must be base64 data URI
   - Pattern: `data:image/png;base64,...`

2. **File Type Validation**
   - Allowed: PNG, JPG, JPEG, GIF, WEBP, PDF
   - MIME type checking

3. **File Size Validation**
   - Maximum: 5MB per file
   - Checked before writing to disk

4. **Filename Security**
   - Random generation: `{timestamp}_{random}.{ext}`
   - No user input in filename

5. **Directory Security**
   - Uploads stored outside web root
   - Served via controlled route

### Features
- ✅ Multi-layer validation
- ✅ Size limits enforced
- ✅ Type checking
- ✅ Secure filename generation
- ✅ Base64 validation

---

## Security Headers

### Implementation
- **Library**: Helmet.js
- **File**: `server/index.js`

### Headers Set

```javascript
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API
  // Other headers enabled by default:
  // - X-Content-Type-Options: nosniff
  // - X-Frame-Options: DENY
  // - X-XSS-Protection: 1; mode=block
  // - Strict-Transport-Security (HSTS)
  // - And more...
}));
```

### CORS Configuration

```javascript
app.use(cors({
  origin: true, // Reflects request origin
  credentials: true, // Allows cookies/auth headers
}));
```

**Note**: For production, restrict `origin` to specific domains.

---

## Audit & Monitoring

### Audit Logging

All critical actions are logged:

```javascript
// Example: Login
INSERT INTO audit_logs (user_id, action, details)
VALUES (123, 'LOGIN', 'Role: farmer');

// Example: Status change
INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
VALUES (456, 'Approve Registration', 'farmer', 789, 'Approved farmer registration');
```

### Logged Events
- ✅ User login/logout
- ✅ Registration approvals/rejections
- ✅ Password changes
- ✅ Bank detail changes
- ✅ Seed price updates (super_admin only)
- ✅ Warehouse inventory changes
- ✅ Farm visit scheduling
- ✅ Payment processing
- ✅ Manager creation/deactivation

### Rate Limit Monitoring

```javascript
// Automatic logging of rate limit violations
console.log('Rate limit exceeded for IP', req.ip, 'on', req.path);
```

---

## Security Checklist

### Backend Security
- ✅ Rate limiting on all API routes
- ✅ Input validation on all POST/PATCH/PUT routes
- ✅ Input sanitization (XSS prevention)
- ✅ SQL injection prevention (parameterized queries)
- ✅ JWT authentication
- ✅ Role-based authorization
- ✅ Password hashing (bcrypt)
- ✅ File upload validation
- ✅ Security headers (Helmet.js)
- ✅ CORS configuration
- ✅ Audit logging
- ✅ Error handling (no stack traces in production)

### Frontend Security
- ✅ Client-side validation
- ✅ Rate limit handling
- ✅ Token storage in sessionStorage (not localStorage)
- ✅ Automatic token cleanup on 401
- ✅ XSS protection (React default)
- ✅ No inline JavaScript
- ✅ HTTPS enforcement (in production)

### Data Security
- ✅ Sensitive data encrypted in transit
- ✅ Passwords hashed
- ✅ OTPs temporary with expiry
- ✅ No sensitive data in logs
- ✅ Database connection SSL (Supabase)

### Infrastructure Security
- ✅ Environment variables for secrets
- ✅ .env in .gitignore
- ✅ No hardcoded credentials
- ✅ Rate limiting prevents DoS
- ✅ File upload size limits
- ✅ Health check endpoint (no auth required)

---

## Environment Variables

### Required in .env

```env
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key-here

# Server
PORT=5000
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_GLOBAL_MAX=200
RATE_LIMIT_GLOBAL_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=20
RATE_LIMIT_OTP_MAX=3
# ... (see .env for full list)

# Frontend (Vite)
VITE_API_URL=https://api.example.com
```

### Security Notes
- Never commit .env to version control
- Use strong, random JWT_SECRET (32+ characters)
- Rotate secrets regularly
- Use different secrets for dev/staging/production

---

## Production Deployment Security

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (32+ random characters)
- [ ] Enable HTTPS (SSL/TLS certificates)
- [ ] Configure CORS with specific origins (not `origin: true`)
- [ ] Set up Redis for rate limiting (multi-server)
- [ ] Enable database SSL
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Enable audit log rotation
- [ ] Regular security updates
- [ ] Penetration testing
- [ ] Security audit

### Recommended Additions

1. **Redis Store for Rate Limiting**
   ```javascript
   const RedisStore = require('rate-limit-redis');
   ```

2. **IP Blocking for Repeat Offenders**
   ```javascript
   // After 5 rate limit violations, block IP for 1 hour
   ```

3. **CAPTCHA for OTP Endpoints**
   ```javascript
   // After 3 OTP requests, require CAPTCHA
   ```

4. **Request Logging**
   ```javascript
   // Log all requests for security analysis
   ```

5. **Anomaly Detection**
   ```javascript
   // Alert on unusual patterns (e.g., 1000 requests/min)
   ```

---

## Incident Response

### If Security Breach Suspected

1. **Immediate Actions**
   - Rotate JWT_SECRET
   - Invalidate all active tokens
   - Review audit logs
   - Block suspicious IPs

2. **Investigation**
   - Check audit logs for unauthorized access
   - Review rate limit violations
   - Analyze failed login attempts
   - Check for data exfiltration

3. **Remediation**
   - Patch vulnerability
   - Update dependencies
   - Force password reset for affected users
   - Notify users if data breached

4. **Prevention**
   - Update validation rules
   - Enhance monitoring
   - Security training for team

---

## Security Contacts

For security issues:
1. Review documentation: `RATE_LIMITING.md`, `VALIDATION.md`
2. Check audit logs in database
3. Review rate limit violations
4. Contact development team

---

## Compliance

This implementation follows:
- ✅ OWASP Top 10 prevention
- ✅ Input validation best practices
- ✅ Secure authentication standards
- ✅ Data protection principles
- ✅ Audit logging requirements

---

## License

Part of AgriFlow ERP Project