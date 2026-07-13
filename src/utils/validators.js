/**
 * Client-side field validation rules, mirroring server validation.js.
 * Each validator returns an error string or null.
 */

// Strips everything except 0-9 and caps at 10 digits. Used on every mobile
// number field's onChange/onPaste so invalid characters (letters, spaces,
// symbols, emoji, +/-, brackets) can never actually land in the input,
// regardless of whether they arrived via typing, paste, or autofill.
export function sanitizeMobileInput(raw) {
  return (raw || '').replace(/[^0-9]/g, '').slice(0, 10);
}

const validators = {
  // Single source of truth for mobile number validation — every form in the
  // app (Register, Admin Create Farmer, Manager Create/Edit, etc.) calls
  // this same function so the rules and error copy never drift apart.
  phone: (v) => {
    if (!v) return 'Mobile number must contain exactly 10 digits';
    if (!/^\d+$/.test(v)) return 'Mobile number must contain only numbers';
    if (v.length !== 10) return 'Mobile number must contain exactly 10 digits';
    if (v[0] === '0') return 'Mobile number cannot start with 0';
    return null;
  },

  name: (v) => {
    if (!v) return 'Name is required';
    if (v.length < 2) return 'Name must be at least 2 characters';
    if (v.length > 100) return 'Name must be less than 100 characters';
    if (!/^[a-zA-Z\s]+$/.test(v)) return 'Name can only contain letters and spaces';
    return null;
  },

  email: (v) => {
    if (!v) return null; // optional
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email address';
    return null;
  },

  emailRequired: (v) => {
    if (!v) return 'Email address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email address';
    return null;
  },

  password: (v) => {
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    if (v.length > 100) return 'Password must be less than 100 characters';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(v)) return 'Must contain at least one letter and one number';
    return null;
  },

  confirmPassword: (v, form) => {
    if (!v) return 'Confirm password is required';
    if (form?.password && v !== form.password) return 'Passwords do not match';
    return null;
  },

  otp: (v) => {
    if (!v) return 'OTP is required';
    if (!/^\d+$/.test(v)) return 'OTP must contain only numbers';
    if (v.length !== 6) return 'OTP must be exactly 6 digits';
    return null;
  },

  required: (v, _form, label) => {
    if (!v || (typeof v === 'string' && !v.trim())) return `${label || 'This field'} is required`;
    return null;
  },

  positiveNumber: (v, _form, label) => {
    if (!v && v !== 0) return `${label || 'This field'} is required`;
    const n = parseFloat(v);
    if (isNaN(n)) return 'Must be a valid number';
    if (n <= 0) return 'Must be a positive number greater than 0';
    return null;
  },

  date: (v) => {
    if (!v) return 'Date is required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Date must be in YYYY-MM-DD format';
    if (isNaN(new Date(v).getTime())) return 'Invalid date';
    return null;
  },

  time: (v) => {
    if (!v) return 'Time is required';
    if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)) return 'Time must be in HH:MM format';
    return null;
  },

  grade: (v) => {
    if (!v) return 'Grade is required';
    if (!['A', 'B', 'C'].includes(v)) return 'Grade must be A, B, or C';
    return null;
  },

  cropType: (v) => {
    if (!v) return 'Crop type is required';
    if (v.length < 2) return 'Crop type must be at least 2 characters';
    if (v.length > 100) return 'Crop type must be less than 100 characters';
    return null;
  },

  seedName: (v) => {
    if (!v) return 'Seed name is required';
    if (v.length < 2) return 'Seed name must be at least 2 characters';
    if (v.length > 100) return 'Seed name must be less than 100 characters';
    return null;
  },

  address: (v) => {
    if (!v || !v.trim()) return 'Address is required';
    if (v.length > 500) return 'Address must be less than 500 characters';
    return null;
  },

  acres: (v) => {
    if (!v && v !== 0) return 'Acres is required';
    const n = parseFloat(v);
    if (isNaN(n)) return 'Must be a valid number';
    if (n <= 0) return 'Must be greater than 0';
    if (n > 10000) return 'Maximum 10,000 acres';
    return null;
  },

  warehouseName: (v) => {
    if (!v) return 'Warehouse name is required';
    if (v.length < 2) return 'Must be at least 2 characters';
    if (v.length > 100) return 'Must be less than 100 characters';
    return null;
  },

  bankAccountNumber: (v) => {
    if (!v) return 'Account number is required';
    if (!/^\d+$/.test(v)) return 'Account number must contain only numbers';
    if (v.length < 9 || v.length > 18) return 'Account number must be 9-18 digits';
    return null;
  },

  ifscCode: (v) => {
    if (!v) return 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(v.toUpperCase())) return 'Invalid IFSC format (e.g., ABCD0123456)';
    return null;
  },

  upiId: (v) => {
    if (!v) return null; // optional
    if (!/^[\w.\-]+@[\w]+$/.test(v)) return 'Invalid UPI format (e.g., name@upi)';
    return null;
  },
};

export default validators;
