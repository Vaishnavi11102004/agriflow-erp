/**
 * Frontend Validation Utilities
 * Provides validation functions for forms and user inputs
 */

// Validation rules
const validators = {
  // Phone number: exactly 10 digits
  phone: (value) => {
    if (!value) return 'Phone number is required';
    if (!/^\d{10}$/.test(value)) return 'Phone number must be exactly 10 digits';
    return null;
  },

  // Email: optional, must be valid if provided
  email: (value) => {
    if (!value) return null; // Optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email address';
    return null;
  },

  // Password: minimum 8 characters, at least one letter and one number
  password: (value) => {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 100) return 'Password must be less than 100 characters';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
      return 'Password must contain at least one letter and one number';
    }
    return null;
  },

  // Name: required, 2-100 characters, letters and spaces only
  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (value.length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters and spaces';
    return null;
  },

  // Positive number
  positiveNumber: (value, max = Infinity, fieldName = 'Value') => {
    if (value === null || value === undefined || value === '') {
      return `${fieldName} is required`;
    }
    const num = parseFloat(value);
    if (isNaN(num)) return `${fieldName} must be a number`;
    if (num < 0) return `${fieldName} must be a positive number`;
    if (num > max) return `${fieldName} must be less than ${max}`;
    return null;
  },

  // Date in YYYY-MM-DD format
  date: (value) => {
    if (!value) return 'Date is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Date must be in YYYY-MM-DD format';
    const date = new Date(value);
    if (isNaN(date.getTime())) return 'Invalid date';
    return null;
  },

  // URL validation
  url: (value) => {
    if (!value) return null; // Optional
    try {
      new URL(value);
      return null;
    } catch {
      return 'Invalid URL format';
    }
  },

  // Text content
  text: (value, maxLength = 1000, fieldName = 'Text') => {
    if (!value) return null; // Optional
    if (value.length > maxLength) return `${fieldName} must be less than ${maxLength} characters`;
    return null;
  },

  // OTP: exactly 6 digits
  otp: (value) => {
    if (!value) return 'OTP is required';
    if (!/^\d{6}$/.test(value)) return 'OTP must be exactly 6 digits';
    return null;
  },

  // IFSC code: ABCD0123456 format
  ifscCode: (value) => {
    if (!value) return 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value)) {
      return 'Invalid IFSC code format (e.g., ABCD0123456)';
    }
    return null;
  },

  // Account number: 9-18 digits
  accountNumber: (value) => {
    if (!value) return 'Account number is required';
    if (!/^\d{9,18}$/.test(value)) return 'Account number must be 9-18 digits';
    return null;
  },

  // UPI ID: name@upi format
  upiId: (value) => {
    if (!value) return null; // Optional
    if (!/^[\w.\-]+@[\w]+$/.test(value)) return 'Invalid UPI ID format (e.g., name@upi)';
    return null;
  },

  // Time in HH:MM format (24-hour)
  time: (value) => {
    if (!value) return 'Time is required';
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
      return 'Time must be in HH:MM format (24-hour)';
    }
    return null;
  },

  // Crop type
  cropType: (value) => {
    if (!value) return 'Crop type is required';
    if (value.length < 2) return 'Crop type must be at least 2 characters';
    if (value.length > 100) return 'Crop type must be less than 100 characters';
    return null;
  },

  // Grain type
  grainType: (value) => {
    if (!value) return 'Grain type is required';
    if (value.length < 2) return 'Grain type must be at least 2 characters';
    if (value.length > 100) return 'Grain type must be less than 100 characters';
    return null;
  },

  // Address
  address: (value, maxLength = 500) => {
    if (!value) return null; // Optional
    if (value.length > maxLength) return `Address must be less than ${maxLength} characters`;
    return null;
  },

  // Status enum
  status: (value, allowedValues) => {
    if (!value) return 'Status is required';
    if (!allowedValues.includes(value)) {
      return `Status must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },
};

/**
 * Validate a single field
 */
export function validateField(name, value, rules) {
  if (typeof rules === 'function') {
    return rules(value);
  }
  return null;
}

/**
 * Validate entire form data
 */
export function validateForm(data, schema) {
  const errors = {};
  let isValid = true;

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    const error = validateField(field, value, rules);
    
    if (error) {
      errors[field] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

/**
 * Create a validation schema for a form
 */
export function createSchema(fields) {
  return fields;
}

// Common form schemas
export const schemas = {
  login: {
    phone: validators.phone,
    password: (value) => {
      if (!value) return 'Password is required';
      return null;
    },
  },

  register: {
    name: validators.name,
    phone: validators.phone,
    email: validators.email,
    password: validators.password,
    otp: validators.otp,
    address: (value) => validators.address(value, 500),
    acres_of_land: (value) => validators.positiveNumber(value, 10000, 'Acres of land'),
  },

  forgotPassword: {
    phone: validators.phone,
  },

  resetPassword: {
    phone: validators.phone,
    otp: validators.otp,
    new_password: validators.password,
  },

  changePassword: {
    phone: validators.phone,
    old_password: (value) => {
      if (!value) return 'Current password is required';
      return null;
    },
    new_password: validators.password,
  },

  cropRegistration: {
    crop_type: validators.cropType,
    acres: (value) => validators.positiveNumber(value, 1000, 'Acres'),
    sowing_date: validators.date,
  },

  grainSale: {
    grain_type: validators.grainType,
    quantity_kg: (value) => validators.positiveNumber(value, 100000, 'Quantity'),
    warehouse_id: (value) => validators.positiveNumber(value, Infinity, 'Warehouse'),
  },

  seedPurchase: {
    seed_id: (value) => validators.positiveNumber(value, Infinity, 'Seed'),
    quantity_kg: (value) => validators.positiveNumber(value, 10000, 'Quantity'),
    payment_method: (value) => {
      if (!value) return 'Payment method is required';
      if (!['online', 'warehouse'].includes(value)) {
        return 'Payment method must be online or warehouse';
      }
      return null;
    },
    warehouse_id: (value) => validators.positiveNumber(value, Infinity, 'Warehouse'),
  },

  bankChangeRequest: {
    bank_name: (value) => {
      if (!value) return 'Bank name is required';
      if (value.length > 100) return 'Bank name must be less than 100 characters';
      return null;
    },
    account_number: validators.accountNumber,
    ifsc_code: validators.ifscCode,
    upi_id: validators.upiId,
  },

  bookingSlot: {
    grain_sale_id: (value) => validators.positiveNumber(value, Infinity, 'Grain sale'),
    booking_date: validators.date,
    delivery_address: (value) => {
      if (!value) return 'Delivery address is required';
      if (value.length > 500) return 'Delivery address must be less than 500 characters';
      return null;
    },
    grain_type: validators.grainType,
    warehouse_id: (value) => validators.positiveNumber(value, Infinity, 'Warehouse'),
    quantity_kg: (value) => validators.positiveNumber(value, 100000, 'Quantity'),
  },
};

/**
 * Custom hook for form validation
 */
export function useFormValidation(initialValues, schema) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field on blur
    const error = validateField(name, values[name], schema[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const error = validateField(field, values[field], rules);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    }

    setErrors(newErrors);
    setTouched(
      Object.keys(schema).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    );

    return isValid;
  };

  const resetForm = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  };

  const setFieldValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const setFieldError = (name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateForm,
    resetForm,
    setFieldValue,
    setFieldError,
    isValid: Object.keys(errors).length === 0,
  };
}

// Import React for the hook
import { useState } from 'react';

export default {
  validators,
  validateField,
  validateForm,
  createSchema,
  schemas,
  useFormValidation,
};