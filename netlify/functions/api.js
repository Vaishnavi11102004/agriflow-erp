// Netlify Functions handler for the Express backend API
// Environment variables are injected by Netlify — no dotenv needed here.

// Set production env before loading the app
process.env.NODE_ENV = 'production';

const serverless = require('serverless-http');
const app = require('../../server/index.js');

// We tell serverless-http to strip the '/.netlify/functions' prefix.
// So if Netlify sends '/.netlify/functions/api/health', Express sees '/api/health'
module.exports.handler = serverless(app, {
  basePath: '/.netlify/functions'
});
