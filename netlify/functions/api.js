require('dotenv').config();

// Set production env before loading the app
process.env.NODE_ENV = 'production';

const serverless = require('serverless-http');
const app = require('../../server/index.js');

// We tell serverless-http to ignore the '/.netlify/functions' part of the URL.
// So if Netlify sends '/.netlify/functions/api/health', Express only sees '/api/health'
// which matches exactly how your backend is coded!
module.exports.handler = serverless(app, {
  basePath: '/.netlify/functions'
});
