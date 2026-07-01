require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { startScheduledJobs } = require('./utils/scheduledJobs');
const { limiters, createMethodBasedLimiter, createSkipCheck } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: true, // Reflects the request origin, allowing all origins but keeping credentials support
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
// Skip health checks from rate limiting
const skipCheck = createSkipCheck(['/api/health']);

// OTP-specific rate limiting (very strict)
app.use('/api/auth/send-otp', skipCheck, limiters.otp);
app.use('/api/auth/forgot-password/send-otp', skipCheck, limiters.otp);

// Login and register specific rate limiting
app.use('/api/auth/login', skipCheck, limiters.login);
app.use('/api/auth/register', skipCheck, limiters.auth);

// Global rate limiter for all API routes (skipping login and register per request to avoid double limiting)
const globalLimiterWithExclusions = (req, res, next) => {
  const path = req.originalUrl.split('?')[0].replace(/\/$/, '');
  if (path === '/api/auth/login' || path === '/api/auth/register') {
    return next();
  }
  return limiters.global(req, res, next);
};
app.use('/api/', skipCheck, globalLimiterWithExclusions);

// Custom middleware for auth endpoints that excludes login and register
const authLimiterExclusions = (req, res, next) => {
  // Skip login and register endpoints since they have their own limiters above
  if (req.path === '/login' || req.path === '/register') {
    return next();
  }
  // Apply auth limiter to all other auth endpoints
  return limiters.auth(req, res, next);
};

app.use('/api/auth/', skipCheck, authLimiterExclusions);

// Upload rate limiting (resource-intensive)
app.use('/api/upload', skipCheck, limiters.upload);

// Admin routes with higher limits
app.use('/api/admin', skipCheck, limiters.admin);

// Serve uploaded files statically
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/public', require('./routes/public'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🌱 AgroSeq Server running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/health`);
    console.log('\n📋 Default Credentials:');
    console.log('   Super Admin: phone=9999999999, password=Admin@123');
    console.log('   Manager:     phone=8888888888, password=Manager@123\n');
    // Start background scheduled jobs (farm visit reminders etc.)
    startScheduledJobs();
  });
}

module.exports = app;
