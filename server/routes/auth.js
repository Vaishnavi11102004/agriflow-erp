const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { generateToken, authMiddleware, requireRole } = require('../middleware/auth');
const { generateOTP, storeOTP, verifyOTP, sendOTP } = require('../utils/otp');
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

// POST /api/auth/send-otp
router.post('/send-otp', validate(validationSchemas.sendOTP), sanitizeInput, (req, res) => {
  const { phone } = req.body;
  if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Valid 10-digit phone required' });
  const otp = generateOTP();
  storeOTP(phone, otp);
  sendOTP(phone, otp);
  res.json({ message: 'OTP sent successfully', otp }); // Remove otp from response in production
});

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(validationSchemas.verifyOTP), sanitizeInput, (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
  const otpResult = verifyOTP(phone, otp, true); // keep=true so it can be verified again during registration
  if (!otpResult.valid) return res.status(400).json({ error: otpResult.reason });
  res.json({ message: 'OTP verified successfully' });
});

// POST /api/auth/register (farmer only)
router.post('/register', validate(validationSchemas.register), sanitizeInput, async (req, res) => {
  const { name, phone, email, password, otp, address, acres_of_land, crop_address } = req.body;
  if (!name || !phone || !password || !otp) return res.status(400).json({ error: 'Missing required fields' });

  const otpResult = verifyOTP(phone, otp);
  if (!otpResult.valid) return res.status(400).json({ error: otpResult.reason });

  try {
    const { rows: existing } = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (existing.length > 0) return res.status(409).json({ error: 'Phone number already registered' });

    const hash = bcrypt.hashSync(password, 10);

    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, first_login)
       VALUES ($1, $2, $3, $4, 'farmer', 'pending', FALSE) RETURNING id`,
      [name, email || null, phone, hash]
    );
    const userId = rows[0].id;

    await db.query(
      `INSERT INTO farmer_profiles (user_id, address, acres_of_land, crop_address)
       VALUES ($1, $2, $3, $4)`,
      [userId, address || null, acres_of_land || 0, crop_address || null]
    );

    // Notify all managers & super admins
    const { rows: managers } = await db.query(
      "SELECT id FROM users WHERE role IN ('manager','super_admin') AND status = 'active'"
    );
    for (const m of managers) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, 'info', 'farmer', $4)`,
        [m.id, 'New Farmer Registration', `${name} (${phone}) has requested registration.`, userId]
      );
    }

    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// POST /api/auth/login
router.post('/login', validate(validationSchemas.login), sanitizeInput, async (req, res) => {
  const { phone, password, role } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

  try {
    const { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (role && user.role !== role) return res.status(403).json({ error: `This account is not a ${role}` });
    if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status === 'pending') return res.status(403).json({ error: 'Account pending admin approval' });
    if (user.status === 'rejected') return res.status(403).json({ error: 'Account has been rejected' });
    if (user.status === 'suspended') return res.status(403).json({ error: 'Account suspended' });

    const token = generateToken({ id: user.id, role: user.role });

    // Log audit
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, 'LOGIN', 'user', $1, $2, $3)`,
      [user.id, `Role: ${user.role}`, req.ip || req.connection?.remoteAddress]
    );

    let profile = null;
    if (user.role === 'farmer') {
      const { rows: pRows } = await db.query('SELECT * FROM farmer_profiles WHERE user_id = $1', [user.id]);
      profile = pRows[0] || null;
    }

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        phone: user.phone, role: user.role, status: user.status,
        first_login: user.first_login,
      },
      profile,
      requirePasswordChange: user.first_login === true,
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', validate(validationSchemas.changePassword), sanitizeInput, async (req, res) => {
  const { phone, old_password, new_password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!bcrypt.compareSync(old_password, user.password_hash)) return res.status(401).json({ error: 'Wrong current password' });
    const hash = bcrypt.hashSync(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1, first_login = FALSE WHERE id = $2', [hash, user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed: ' + err.message });
  }
});

// POST /api/auth/forgot-password/send-otp
router.post('/forgot-password/send-otp', validate(validationSchemas.forgotPasswordSendOTP), sanitizeInput, async (req, res) => {
  const { phone } = req.body;
  try {
    const { rows } = await db.query('SELECT id FROM users WHERE phone = $1', [phone]);
    if (rows.length === 0) return res.status(404).json({ error: 'No account found with this phone number' });
    const otp = generateOTP();
    storeOTP('reset_' + phone, otp);
    sendOTP(phone, otp);
    res.json({ message: 'Reset OTP sent', otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password/reset
router.post('/forgot-password/reset', validate(validationSchemas.forgotPasswordReset), sanitizeInput, async (req, res) => {
  const { phone, otp, new_password } = req.body;
  const result = verifyOTP('reset_' + phone, otp);
  if (!result.valid) return res.status(400).json({ error: result.reason });
  try {
    const hash = bcrypt.hashSync(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE phone = $2', [hash, phone]);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/update-profile  (manager / super_admin only)
router.patch('/update-profile', authMiddleware, requireRole('manager', 'super_admin'), validate(validationSchemas.updateProfile), sanitizeInput, async (req, res) => {
  const { name, email } = req.body;
  const userId = parseInt(req.user.id, 10); // ensure integer for pg BIGINT binding

  if (!name && email === undefined) {
    return res.status(400).json({ error: 'At least one field (name or email) is required' });
  }

  try {
    // Fetch current values so we can describe what changed
    const { rows: current } = await db.query(
      'SELECT name, email, phone, role FROM users WHERE id = $1',
      [userId]
    );
    if (current.length === 0) return res.status(404).json({ error: 'User not found' });
    const prev = current[0];

    // Build the update — use incoming value when provided, else keep existing
    const newName  = (name  !== undefined && name  !== null) ? name.trim()  : prev.name;
    const newEmail = (email !== undefined && email !== null) ? email.trim() : prev.email;

    await db.query(
      'UPDATE users SET name = $1, email = $2, updated_at = now() WHERE id = $3',
      [newName, newEmail || null, userId]
    );

    // Build a human-readable change summary
    const changes = [];
    if (newName  !== prev.name)  changes.push(`name: "${prev.name}" → "${newName}"`);
    if (newEmail !== prev.email) changes.push(`email: "${prev.email || 'not set'}" → "${newEmail || 'not set'}"`);
    const changeSummary = changes.length > 0 ? changes.join(', ') : 'No field values changed';

    // Audit log — use the same minimal columns as the rest of auth.js to avoid schema mismatches
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, 'PROFILE_UPDATE', 'user', $1, $2, $3)`,
        [userId, changeSummary, req.ip || req.connection?.remoteAddress]
      );
    } catch (auditErr) {
      // Non-fatal — don't fail the whole request if audit logging errors
      console.warn('Audit log insert failed (non-fatal):', auditErr.message);
    }

    // Notify all active super_admins
    try {
      const { rows: admins } = await db.query(
        "SELECT id FROM users WHERE role = 'super_admin' AND status = 'active'"
      );
      for (const admin of admins) {
        if (admin.id === userId) continue; // don't self-notify super_admins
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type)
           VALUES ($1, $2, $3, 'info')`,
          [
            admin.id,
            'Manager Profile Updated',
            `Manager ${prev.name} (${prev.phone}) has updated their profile. Changes: ${changeSummary}.`,
          ]
        );
      }
    } catch (notifErr) {
      // Non-fatal — don't fail the whole request if notification insert errors
      console.warn('Notification insert failed (non-fatal):', notifErr.message);
    }

    res.json({
      message: 'Profile updated successfully',
      user: { id: userId, name: newName, email: newEmail || null, phone: prev.phone, role: prev.role },
    });
  } catch (err) {
    console.error('PROFILE_UPDATE error:', err.message, err.stack);
    res.status(500).json({ error: 'Profile update failed: ' + err.message });
  }
});

module.exports = router;

