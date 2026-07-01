// Simple in-memory OTP store (use Redis in production)
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeOTP(phone, otp) {
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(phone, { otp, expires });
  return otp;
}

function verifyOTP(phone, otp, keep = false) {
  const entry = otpStore.get(phone);
  if (!entry) return { valid: false, reason: 'OTP not found' };
  if (Date.now() > entry.expires) {
    otpStore.delete(phone);
    return { valid: false, reason: 'OTP expired' };
  }
  if (entry.otp !== otp) return { valid: false, reason: 'Invalid OTP' };
  if (!keep) {
    otpStore.delete(phone);
  }
  return { valid: true };
}

function sendOTP(phone, otp) {
  // In production: integrate with SMS provider (Twilio/MSG91)
  console.log(`\n📱 OTP for ${phone}: ${otp}\n`);
  return true;
}

module.exports = { generateOTP, storeOTP, verifyOTP, sendOTP };
