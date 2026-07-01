# Input Validation Implementation

This document describes the comprehensive input validation system implemented across the AgriFlow ERP project to ensure data integrity, prevent security vulnerabilities, and provide better user experience.

## Table of Contents

1. [Overview](#overview)
2. [Backend Validation](#backend-validation)
3. [Frontend Validation](#frontend-validation)
4. [Security Features](#security-features)
5. [Usage Examples](#usage-examples)
6. [Validation Rules Reference](#validation-rules-reference)
7. [Best Practices](#best-practices)

---

## Overview

The validation system operates at two levels:

1. **Backend (Server-side)**: Express.js middleware using `express-validator` that enforces strict validation on all inputs
2. **Frontend (Client-side)**: React hooks and utilities for real-time form validation

### Key Features

- **Comprehensive field validation**: Phone, email, password, dates, URLs, numbers, enums
- **XSS prevention**: Input sanitization to remove HTML tags and special characters
- **File upload validation**: Size limits, type checking, format validation
- **Consistent error responses**: Standardized validation error format
- **Pre-built schemas**: Ready-to-use validation for all forms
- **React hook integration**: Easy-to-use `useFormValidation` hook
- **Real-time validation**: Validate on blur and change

---

## Backend Validation

### Architecture

```
Request → Validation Middleware → Sanitization → Route Handler
```

### Implementation

**File**: `server/middleware/validation.js`

```javascript
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

// Apply to route
router.post('/login', 
  validate(validationSchemas.login), 
  sanitizeInput, 
  async (req, res) => {
    // Handler code
  }
);
```

### Validation Flow

1. **express-validator** checks all field rules
2. **handleValidationErrors** middleware collects errors
3. If errors exist, returns 400 with detailed error messages
4. **sanitizeInput** removes HTML tags and dangerous characters
5. Route handler receives clean, validated data

### Error Response Format

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "phone",
      "message": "Phone number must be exactly 10 digits",
      "value": "12345"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "short"
    }
  ]
}
```

### Applied Routes

All POST/PATCH/PUT routes now have validation:

**Auth Routes:**
- ✅ `/api/auth/send-otp` - Phone validation
- ✅ `/api/auth/verify-otp` - Phone + OTP validation
- ✅ `/api/auth/register` - Name, phone, email, password, OTP validation
- ✅ `/api/auth/login` - Phone + password validation
- ✅ `/api/auth/change-password` - Phone + password validation
- ✅ `/api/auth/forgot-password/send-otp` - Phone validation
- ✅ `/api/auth/forgot-password/reset` - Phone + OTP + password validation
- ✅ `/api/auth/update-profile` - Name + email validation

**Farmer Routes:**
- ✅ `/api/farmer/profile` (PATCH) - Profile fields validation
- ✅ `/api/farmer/bank-change-request` - Bank details validation
- ✅ `/api/farmer/crops` (POST) - Crop registration validation
- ✅ `/api/farmer/seed-purchase` - Purchase validation
- ✅ `/api/farmer/grain-sale` - Sale validation
- ✅ `/api/farmer/booking-slot` - Booking validation

**Admin Routes:**
- ✅ `/api/admin/farmers/:id/approve` - Status validation
- ✅ `/api/admin/bank-requests/:id` - Status validation
- ✅ `/api/admin/seeds` (POST) - Seed creation validation
- ✅ `/api/admin/seed-purchases/:id` - Status validation
- ✅ `/api/admin/seeds/:id` (PATCH) - Seed update validation
- ✅ `/api/admin/warehouses` (POST) - Warehouse validation
- ✅ `/api/admin/warehouses/:id/inventory` - Inventory validation
- ✅ `/api/admin/warehouse-slots` (POST) - Slot creation validation
- ✅ `/api/admin/warehouse-slots/:id` (PATCH) - Slot update validation
- ✅ `/api/admin/visits` (POST) - Visit creation validation
- ✅ `/api/admin/visits/:id` (PATCH) - Visit update validation
- ✅ `/api/admin/market-rates` (POST) - Rate setting validation
- ✅ `/api/admin/transactions/:id/pay` - Payment validation
- ✅ `/api/admin/managers` (POST) - Manager creation validation
- ✅ `/api/admin/managers/:id` (PATCH) - Manager update validation

**Upload Route:**
- ✅ `/api/upload` (POST) - File validation (size, type, format)

---

## Frontend Validation

### Architecture

```
User Input → Real-time Validation → Error Display → API Call
```

### Implementation

**File**: `src/utils/validation.js`

```javascript
import { useFormValidation, schemas } from '../utils/validation';

function LoginForm() {
  const { values, errors, handleChange, handleBlur, validateForm } = 
    useFormValidation(
      { phone: '', password: '' },
      schemas.login
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        name="phone"
        value={values.phone}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.phone && <span className="error">{errors.phone}</span>}
      
      <input
        name="password"
        type="password"
        value={values.password}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.password && <span className="error">{errors.password}</span>}
      
      <button type="submit">Login</button>
    </form>
  );
}
```

### Available Schemas

Pre-built validation schemas for common forms:

```javascript
import { schemas } from '../utils/validation';

// Available schemas:
schemas.login           // Phone + password
schemas.register        // Name, phone, email, password, OTP
schemas.forgotPassword  // Phone
schemas.resetPassword   // Phone, OTP, new password
schemas.changePassword  // Phone, old password, new password
schemas.cropRegistration // Crop type, acres, date
schemas.grainSale       // Grain type, quantity, warehouse
schemas.seedPurchase    // Seed, quantity, payment method
schemas.bankChangeRequest // Bank details
schemas.bookingSlot     // Booking details
```

### Custom Validation

Create custom validation rules:

```javascript
import { validators, validateForm } from '../utils/validation';

const customSchema = {
  name: validators.name,
  email: validators.email,
  customField: (value) => {
    if (!value) return 'Custom field is required';
    if (value !== 'expected') return 'Value must be "expected"';
    return null;
  }
};

// Validate form data
const { isValid, errors } = validateForm(formData, customSchema);
```

---

## Security Features

### 1. XSS Prevention

**Sanitization** removes dangerous characters:

```javascript
// Before sanitization
{ name: "<script>alert('xss')</script>" }

// After sanitization
{ name: "scriptalertxssscript" }
```

**Applied to all string inputs:**
- Removes HTML tags: `<[^>]*>`
- Removes angle brackets: `<` and `>`
- Trims whitespace

### 2. SQL Injection Prevention

**Parameterized queries** are used throughout:

```javascript
// ✅ SAFE - Parameterized query
const { rows } = await db.query(
  'SELECT * FROM users WHERE phone = $1',
  [phone]
);

// ❌ NEVER DO THIS - String concatenation
const { rows } = await db.query(
  `SELECT * FROM users WHERE phone = '${phone}'`
);
```

### 3. File Upload Security

**Multiple layers of validation:**

```javascript
// 1. Format validation (base64 data URI)
// 2. File size check (max 5MB)
// 3. MIME type validation
// 4. Allowed extensions: png, jpg, jpeg, gif, webp, pdf
```

**File size limits:**
- Images: 5MB maximum
- PDFs: 5MB maximum
- Total upload directory: Monitored

### 4. Password Security

**Strong password requirements:**
- Minimum 8 characters
- Maximum 100 characters
- At least one letter (A-Z, a-z)
- At least one number (0-9)
- Bcrypt hashing with 10 rounds

### 5. Input Length Limits

**Prevents buffer overflow and DoS:**

| Field | Max Length |
|-------|-----------|
| Name | 100 chars |
| Email | 100 chars (standard) |
| Address | 500 chars |
| Description | 1000 chars |
| Notes | 1000 chars |
| Report | 5000 chars |

---

## Usage Examples

### Backend: Adding Validation to New Route

```javascript
const router = express.Router();
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

// 1. Define validation schema in validationSchemas object
validationSchemas.myCustomRoute = [
  body('field1')
    .notEmpty()
    .withMessage('Field1 is required')
    .isLength({ max: 100 })
    .withMessage('Field1 must be less than 100 characters'),
  body('field2')
    .optional()
    .isNumeric()
    .withMessage('Field2 must be a number'),
];

// 2. Apply to route
router.post('/my-route', 
  validate(validationSchemas.myCustomRoute), 
  sanitizeInput, 
  async (req, res) => {
    // Your handler - req.body is now validated and sanitized
  }
);
```

### Frontend: Using Validation Hook

```javascript
import { useFormValidation, schemas } from '../utils/validation';
import toast from 'react-hot-toast';

function CropRegistrationForm() {
  const { values, errors, handleChange, handleBlur, validateForm, isSubmitting } = 
    useFormValidation(
      { crop_type: '', acres: '', sowing_date: '' },
      schemas.cropRegistration
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await api.post('/farmer/crops', values);
      toast.success('Crop registered successfully!');
    } catch (error) {
      toast.error('Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          name="crop_type"
          value={values.crop_type}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Crop type"
        />
        {errors.crop_type && <span className="error">{errors.crop_type}</span>}
      </div>

      <div>
        <input
          name="acres"
          type="number"
          value={values.acres}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Acres"
        />
        {errors.acres && <span className="error">{errors.acres}</span>}
      </div>

      <div>
        <input
          name="sowing_date"
          type="date"
          value={values.sowing_date}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {errors.sowing_date && <span className="error">{errors.sowing_date}</span>}
      </div>

      <button type="submit" disabled={isSubmitting}>
        Register Crop
      </button>
    </form>
  );
}
```

### Frontend: Manual Validation

```javascript
import { validators, validateForm } from '../utils/validation';

function MyComponent() {
  const [errors, setErrors] = useState({});

  const validateField = (name, value) => {
    const error = validators[name](value);
    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleSubmit = () => {
    const schema = {
      phone: validators.phone,
      email: validators.email,
    };

    const { isValid, errors } = validateForm(formData, schema);
    
    if (!isValid) {
      setErrors(errors);
      return;
    }

    // Submit form
  };

  return (
    <form>
      <input
        onBlur={(e) => validateField('phone', e.target.value)}
      />
      {errors.phone && <span>{errors.phone}</span>}
    </form>
  );
}
```

---

## Validation Rules Reference

### Common Validators

| Validator | Description | Example |
|-----------|-------------|---------|
| `phone(value)` | Exactly 10 digits | `"9999999999"` |
| `email(value)` | Valid email format | `"user@example.com"` |
| `password(value)` | 8-100 chars, letter + number | `"Pass1234"` |
| `name(value)` | 2-100 chars, letters only | `"John Doe"` |
| `positiveNumber(value, max)` | Positive number with max | `"100"` |
| `date(value)` | YYYY-MM-DD format | `"2024-12-31"` |
| `url(value)` | Valid URL | `"https://example.com"` |
| `otp(value)` | Exactly 6 digits | `"123456"` |
| `ifscCode(value)` | ABCD0123456 format | `"SBIN0123456"` |
| `accountNumber(value)` | 9-18 digits | `"123456789012"` |
| `upiId(value)` | name@upi format | `"user@upi"` |
| `time(value)` | HH:MM 24-hour format | `"14:30"` |

### Field-Specific Validators

| Validator | Description | Rules |
|-----------|-------------|-------|
| `cropType(value)` | Crop name | 2-100 chars |
| `grainType(value)` | Grain name | 2-100 chars |
| `address(value, max)` | Address text | Optional, max 500 chars |
| `status(value, allowed)` | Enum value | Must be in allowed list |

---

## Best Practices

### 1. **Always Validate on Backend**

Frontend validation is for UX only. Backend validation is for security:

```javascript
// Frontend: Good UX
const { isValid } = useFormValidation(data, schema);
if (!isValid) return;

// Backend: Security (REQUIRED)
router.post('/endpoint', validate(schema), async (req, res) => {
  // Backend still validates even if frontend did
});
```

### 2. **Validate Early, Validate Often**

```javascript
// ✅ Validate on blur (user leaves field)
<input onBlur={handleBlur} />

// ✅ Validate on change (clear errors)
<input onChange={handleChange} />

// ✅ Validate entire form on submit
if (validateForm()) { /* submit */ }
```

### 3. **Show Clear Error Messages**

```javascript
// ✅ Good - Specific and actionable
"Phone number must be exactly 10 digits"

// ❌ Bad - Vague
"Invalid input"

// ✅ Good - Suggests fix
"Password must contain at least one letter and one number"

// ❌ Bad - Technical
"Regex match failed"
```

### 4. **Use Consistent Error Display**

```javascript
// Show errors near the field
<div className="form-group">
  <input {...props} />
  {errors.field && <span className="error-text">{errors.field}</span>}
</div>

// Use icons for visual indication
{errors.field ? <ErrorIcon /> : <CheckIcon />}
```

### 5. **Disable Submit Until Valid**

```javascript
<button 
  type="submit" 
  disabled={!isValid || isSubmitting}
>
  Submit
</button>
```

### 6. **Validate File Uploads Client-Side**

```javascript
// Check file size before upload
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
if (file.size > MAX_SIZE) {
  toast.error('File must be less than 5MB');
  return;
}

// Check file type
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
if (!ALLOWED_TYPES.includes(file.type)) {
  toast.error('Invalid file type');
  return;
}
```

### 7. **Sanitize Rich Text**

If you need to allow some HTML (e.g., in descriptions):

```javascript
// Use a library like DOMPurify
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(dirtyHtml);
```

### 8. **Log Validation Failures**

Monitor for attack patterns:

```javascript
// In backend
if (errors.length > 0) {
  console.warn('Validation failed:', {
    ip: req.ip,
    path: req.path,
    errors: errors.array(),
  });
}
```

---

## Testing Validation

### Backend Testing

```bash
# Start server
npm run server

# Test with invalid data
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "123", "password": "short"}'

# Expected response
{
  "error": "Validation failed",
  "details": [
    {
      "field": "phone",
      "message": "Phone number must be exactly 10 digits",
      "value": "123"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters",
      "value": "short"
    }
  ]
}
```

### Frontend Testing

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { useFormValidation, schemas } from '../utils/validation';

test('validates phone number', () => {
  const { errors, handleBlur } = useFormValidation(
    { phone: '' },
    schemas.login
  );

  fireEvent.blur(screen.getByLabelText(/phone/i), {
    target: { name: 'phone', value: '123' }
  });

  expect(errors.phone).toBe('Phone number must be exactly 10 digits');
});

test('accepts valid phone number', () => {
  const { errors } = useFormValidation(
    { phone: '9999999999' },
    schemas.login
  );

  expect(errors.phone).toBeUndefined();
});
```

---

## Troubleshooting

### Issue: Validation not working

**Check:**
1. Middleware imported correctly
2. `validate()` wrapper applied to route
3. `sanitizeInput` middleware added
4. `handleValidationErrors` is last in middleware chain

### Issue: Frontend validation not triggering

**Check:**
1. `onBlur` handler attached to input
2. Field name matches schema key
3. Schema passed to `useFormValidation`

### Issue: XSS still possible

**Check:**
1. `sanitizeInput` middleware applied
2. React's built-in XSS protection enabled (default)
3. No `dangerouslySetInnerHTML` usage

### Issue: File upload failing

**Check:**
1. File size < 5MB
2. File type is PNG, JPG, GIF, WEBP, or PDF
3. File is base64 encoded data URI
4. Upload directory has write permissions

---

## Performance Considerations

- **Backend**: Validation adds ~1-5ms per request (negligible)
- **Frontend**: Real-time validation is instant (in-memory)
- **Memory**: Validation schemas are loaded once at startup
- **Bundle size**: ~5KB gzipped for validation utilities

---

## Migration Guide

### Adding Validation to Existing Routes

**Before:**
```javascript
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  // Manual validation
  if (!phone || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  // ...
});
```

**After:**
```javascript
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

router.post('/login', 
  validate(validationSchemas.login), 
  sanitizeInput, 
  async (req, res) => {
    const { phone, password } = req.body; // Already validated
    // ...
  }
);
```

---

## Support

For issues or questions:
1. Check validation error messages (they're user-friendly)
2. Review this documentation
3. Check server logs for validation failures
4. Adjust validation rules in `validationSchemas` as needed

---

## License

Part of AgriFlow ERP Project