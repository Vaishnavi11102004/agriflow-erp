const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation result handler middleware
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages,
    });
  }
  next();
}

/**
 * Common validation rules
 */
const commonValidators = {
  // Phone number: exactly 10 digits
  phone: (field = 'phone') => 
    body(field)
      .isLength({ min: 10, max: 10 })
      .withMessage('Phone number must be exactly 10 digits')
      .isNumeric()
      .withMessage('Phone number must contain only numbers')
      .trim(),

  // Email: optional, must be valid email if provided
  email: (field = 'email') => 
    body(field)
      .optional()
      .isEmail()
      .withMessage('Invalid email address')
      .normalizeEmail(),

  // Password: minimum 8 characters, at least one letter and one number
  password: (field = 'password') => 
    body(field)
      .isLength({ min: 8, max: 100 })
      .withMessage('Password must be between 8 and 100 characters')
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
      .withMessage('Password must contain at least one letter and one number')
      .trim(),

  // Name: required, 2-100 characters, letters and spaces only
  name: (field = 'name') => 
    body(field)
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces')
      .trim(),

  // Positive number
  positiveNumber: (field, max = Infinity) => 
    body(field)
      .isFloat({ gt: 0, max })
      .withMessage(`${field} must be a strictly positive number greater than 0`),

  // Integer ID
  id: (field = 'id') => 
    param(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),

  // Date in YYYY-MM-DD format
  date: (field = 'date') => 
    body(field)
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Date must be in YYYY-MM-DD format')
      .custom(value => {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return true;
      }),

  // URL validation
  url: (field = 'url') => 
    body(field)
      .optional()
      .isURL()
      .withMessage('Invalid URL format'),

  // Text content
  text: (field, maxLength = 1000) => 
    body(field)
      .optional()
      .isLength({ max: maxLength })
      .withMessage(`${field} must be less than ${maxLength} characters`)
      .trim(),

  // Enum/status validation
  status: (field, allowedValues) => 
    body(field)
      .optional()
      .isIn(allowedValues)
      .withMessage(`${field} must be one of: ${allowedValues.join(', ')}`),

  // Array validation
  array: (field, min = 0, max = 100) => 
    body(field)
      .optional()
      .isArray({ min, max })
      .withMessage(`${field} must be an array with ${min}-${max} items`),
};

/**
 * Validation schemas for each route
 */
const validationSchemas = {
  // Auth routes
  sendOTP: [
    commonValidators.phone(),
  ],

  verifyOTP: [
    commonValidators.phone(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
  ],

  register: [
    commonValidators.name(),
    commonValidators.phone(),
    commonValidators.email(),
    commonValidators.password(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    commonValidators.text('address', 500),
    commonValidators.positiveNumber('acres_of_land', 10000),
    commonValidators.text('crop_address', 500),
  ],

  login: [
    commonValidators.phone(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('role')
      .optional()
      .isIn(['farmer', 'manager', 'super_admin'])
      .withMessage('Invalid role'),
  ],

  changePassword: [
    commonValidators.phone(),
    body('old_password')
      .notEmpty()
      .withMessage('Old password is required'),
    commonValidators.password('new_password'),
  ],

  forgotPasswordSendOTP: [
    commonValidators.phone(),
  ],

  forgotPasswordReset: [
    commonValidators.phone(),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .isNumeric()
      .withMessage('OTP must contain only numbers'),
    commonValidators.password('new_password'),
  ],

  updateProfile: [
    commonValidators.name('name', 100),
    commonValidators.email('email'),
  ],

  // Farmer routes
  updateFarmerProfile: [
    commonValidators.name('name', 100),
    commonValidators.email('email'),
    commonValidators.text('address', 500),
    commonValidators.positiveNumber('acres_of_land', 10000),
    commonValidators.text('crop_address', 500),
    commonValidators.text('soil_type', 80),
    commonValidators.text('irrigation_type', 80),
    commonValidators.text('primary_crop', 100),
    commonValidators.text('secondary_crop', 100),
    commonValidators.url('aadhaar_card_url'),
    commonValidators.url('bank_passbook_url'),
    commonValidators.url('land_ownership_url'),
  ],

  bankChangeRequest: [
    body('bank_name')
      .notEmpty()
      .withMessage('Bank name is required')
      .isLength({ max: 100 })
      .withMessage('Bank name must be less than 100 characters'),
    body('account_number')
      .notEmpty()
      .withMessage('Account number is required')
      .isLength({ min: 9, max: 18 })
      .withMessage('Account number must be 9-18 digits')
      .isNumeric()
      .withMessage('Account number must contain only numbers'),
    body('ifsc_code')
      .notEmpty()
      .withMessage('IFSC code is required')
      .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/)
      .withMessage('Invalid IFSC code format (e.g., ABCD0123456)'),
    body('upi_id')
      .optional()
      .isLength({ max: 50 })
      .withMessage('UPI ID must be less than 50 characters')
      .matches(/^[\w.\-]+@[\w]+$/)
      .withMessage('Invalid UPI ID format'),
  ],

  createCrop: [
    body('crop_type')
      .notEmpty()
      .withMessage('Crop type is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Crop type must be 2-100 characters'),
    commonValidators.positiveNumber('acres', 1000),
    commonValidators.date('sowing_date'),
  ],

  seedPurchase: [
    commonValidators.positiveNumber('seed_id'),
    commonValidators.positiveNumber('quantity_kg', 10000),
    body('payment_method')
      .isIn(['upi', 'warehouse'])
      .withMessage('Payment method must be Pay Now (UPI) or Pay at Warehouse'),
    body('upi_id')
      .optional()
      .isLength({ max: 50 })
      .withMessage('UPI ID must be less than 50 characters'),
    body('transaction_id')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Transaction ID must be less than 100 characters'),
    commonValidators.positiveNumber('warehouse_id'),
  ],

  grainSale: [
    body('grain_type')
      .notEmpty()
      .withMessage('Grain type is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Grain type must be 2-100 characters'),
    commonValidators.positiveNumber('quantity_kg', 100000),
    commonValidators.positiveNumber('warehouse_id'),
  ],

  bookingSlot: [
    body('grain_sale_id')
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage('grain_sale_id must be a positive number'),
    commonValidators.date('booking_date'),
    body('delivery_address')
      .notEmpty()
      .withMessage('Delivery address is required')
      .isLength({ max: 500 })
      .withMessage('Delivery address must be less than 500 characters'),
    body('grain_type')
      .notEmpty()
      .withMessage('Grain type is required')
      .isLength({ max: 100 })
      .withMessage('Grain type must be less than 100 characters'),
    commonValidators.positiveNumber('warehouse_id'),
    commonValidators.positiveNumber('quantity_kg', 100000),
  ],

  // Admin routes
  updateFarmerStatus: [
    commonValidators.id('id'),
    body('status')
      .isIn(['active', 'rejected'])
      .withMessage('Status must be active or rejected'),
    commonValidators.text('notes', 1000),
  ],

  updateBankRequest: [
    commonValidators.id('id'),
    body('status')
      .isIn(['approved', 'rejected'])
      .withMessage('Status must be approved or rejected'),
    commonValidators.text('notes', 1000),
  ],

  createSeed: [
    body('name')
      .notEmpty()
      .withMessage('Seed name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Seed name must be 2-100 characters'),
    body('variety')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Variety must be less than 100 characters'),
    commonValidators.positiveNumber('price_per_kg', 10000),
    commonValidators.positiveNumber('stock_kg', 1000000),
    commonValidators.text('description', 1000),
  ],

  updateSeed: [
    commonValidators.id('id'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Seed name must be 2-100 characters'),
    body('variety')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Variety must be less than 100 characters'),
    commonValidators.positiveNumber('price_per_kg', 10000).optional(),
    commonValidators.positiveNumber('stock_kg', 1000000).optional(),
    commonValidators.text('description', 1000),
    body('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean'),
  ],

  updateSeedPurchase: [
    commonValidators.id('id'),
    body('status')
      .isIn(['approved', 'rejected'])
      .withMessage('Status must be approved or rejected'),
  ],

  createWarehouse: [
    body('name')
      .notEmpty()
      .withMessage('Warehouse name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Warehouse name must be 2-100 characters'),
    body('address')
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ max: 500 })
      .withMessage('Address must be less than 500 characters'),
    commonValidators.positiveNumber('total_capacity_kg', 100000000),
  ],

  addWarehouseInventory: [
    commonValidators.id('id'),
    body('grain_type')
      .notEmpty()
      .withMessage('Grain type is required')
      .isLength({ max: 100 })
      .withMessage('Grain type must be less than 100 characters'),
    commonValidators.positiveNumber('quantity_kg', 1000000),
  ],

  createWarehouseSlot: [
    commonValidators.positiveNumber('warehouse_id'),
    commonValidators.date('slot_date'),
    body('start_time')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Start time must be in HH:MM format (24-hour)'),
    body('end_time')
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('End time must be in HH:MM format (24-hour)'),
    commonValidators.positiveNumber('total_capacity_kg', 1000000),
  ],

  updateWarehouseSlot: [
    commonValidators.id('id'),
    body('status')
      .optional()
      .isIn(['active', 'cancelled'])
      .withMessage('Status must be active or cancelled'),
    commonValidators.positiveNumber('total_capacity_kg', 1000000).optional(),
  ],

  createFarmVisit: [
    commonValidators.positiveNumber('crop_id'),
    commonValidators.positiveNumber('farmer_id'),
    body('admin_id')
      .optional({ nullable: true, checkFalsy: true })
      .isFloat({ min: 0 })
      .withMessage('admin_id must be a positive number'),
    body('visit_month')
      .isInt({ min: 1, max: 12 })
      .withMessage('Visit month must be between 1 and 12'),
    commonValidators.date('scheduled_date'),
  ],

  updateFarmVisit: [
    commonValidators.id('id'),
    body('status')
      .optional()
      .isIn(['scheduled', 'pending', 'completed', 'cancelled'])
      .withMessage('Invalid status'),
    commonValidators.positiveNumber('admin_id').optional(),
    commonValidators.date('actual_date').optional(),
    commonValidators.positiveNumber('verified_acres', 10000).optional(),
    commonValidators.text('report', 5000),
    commonValidators.date('scheduled_date').optional(),
  ],

  setMarketRate: [
    body('crop_type')
      .notEmpty()
      .withMessage('Crop type is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Crop type must be 2-100 characters'),
    body('grade')
      .isIn(['A', 'B', 'C'])
      .withMessage('Grade must be A, B, or C'),
    commonValidators.positiveNumber('price_per_kg', 100000),
    commonValidators.date('effective_date'),
  ],

  processPayment: [
    commonValidators.id('id'),
  ],

  createManager: [
    commonValidators.name(),
    commonValidators.email(),
    commonValidators.phone(),
    commonValidators.password(),
    commonValidators.text('department', 100),
  ],

  updateManager: [
    commonValidators.id('id'),
    body('status')
      .isIn(['active', 'suspended'])
      .withMessage('Status must be active or suspended'),
  ],

  // Upload route
  upload: [
    body('image')
      .notEmpty()
      .withMessage('Image data is required')
      .matches(/^data:(image\/(png|jpeg|jpg|gif|webp)|application\/pdf);base64,.+$/)
      .withMessage('Invalid image format. Must be base64 encoded image or PDF'),
  ],

  // Query parameters
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be between 1 and 1000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],

  search: [
    query('search')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search term must be 1-100 characters')
      .trim(),
  ],

  dateRange: [
    query('start_date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Start date must be in YYYY-MM-DD format'),
    query('end_date')
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('End date must be in YYYY-MM-DD format'),
  ],
};

/**
 * Apply validation schema to a route
 */
function validate(schema) {
  return [...schema, handleValidationErrors];
}

/**
 * Sanitize input to prevent XSS
 */
function sanitizeInput(req, res, next) {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove HTML tags and special characters
        req.body[key] = req.body[key]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/[<>]/g, '') // Remove < and >
          .trim();
      }
    });
  }
  next();
}

/**
 * Validate file upload
 */
function validateFileUpload(req, res, next) {
  const { image } = req.body;
  
  if (!image) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Check file size (max 5MB)
  const base64Data = image.split(',')[1];
  const fileSize = Buffer.byteLength(base64Data, 'base64');
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (fileSize > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSize: '5MB',
      actualSize: `${(fileSize / 1024 / 1024).toFixed(2)}MB`
    });
  }

  // Validate file type
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];

  const match = image.match(/^data:([^;]+);base64,/);
  if (!match || !allowedTypes.includes(match[1])) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowedTypes
    });
  }

  next();
}

module.exports = {
  handleValidationErrors,
  commonValidators,
  validationSchemas,
  validate,
  sanitizeInput,
  validateFileUpload,
};