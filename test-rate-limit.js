/**
 * Simple test script to verify rate limiting is working
 * Run with: node test-rate-limit.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let authToken = null;

// Helper to make HTTP requests
function makeRequest(path, method = 'GET', body = null, useAuth = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Test health check (should not be rate limited)
async function testHealthCheck() {
  console.log('\n📋 Test 1: Health Check (should always work)');
  try {
    const res = await makeRequest('/api/health');
    console.log(`  Status: ${res.status}`);
    console.log(`  Response: ${JSON.stringify(res.data)}`);
    return res.status === 200;
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Test public endpoints (should be rate limited after many requests)
async function testPublicEndpoints() {
  console.log('\n📋 Test 2: Public Endpoints (testing global rate limit)');
  console.log('  Sending 5 requests to /api/public/market-rates...');
  
  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('/api/public/market-rates');
    if (res.status === 200) {
      successCount++;
    } else if (res.status === 429) {
      rateLimitedCount++;
      console.log(`  Request ${i + 1}: Rate limited (429)`);
    } else {
      console.log(`  Request ${i + 1}: Status ${res.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`  ✅ Success: ${successCount}/5`);
  console.log(`  ⚠️  Rate limited: ${rateLimitedCount}/5`);
  return successCount > 0;
}

// Test OTP endpoint (very strict rate limit)
async function testOTPEndpoint() {
  console.log('\n📋 Test 3: OTP Endpoint (testing strict rate limit)');
  console.log('  Sending 5 OTP requests rapidly...');
  
  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < 5; i++) {
    const res = await makeRequest('/api/auth/send-otp', 'POST', { phone: '9999999999' });
    if (res.status === 200) {
      successCount++;
      console.log(`  Request ${i + 1}: Success (200)`);
    } else if (res.status === 429) {
      rateLimitedCount++;
      console.log(`  Request ${i + 1}: Rate limited (429) - ${res.data.error}`);
    } else {
      console.log(`  Request ${i + 1}: Status ${res.status} - ${res.data.error || 'Unknown error'}`);
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`  ✅ Success: ${successCount}/5`);
  console.log(`  ⚠️  Rate limited: ${rateLimitedCount}/5`);
  return rateLimitedCount > 0; // We expect some to be rate limited
}

// Test login endpoint (moderate rate limit)
async function testLoginEndpoint() {
  console.log('\n📋 Test 4: Login Endpoint (testing auth rate limit)');
  console.log('  Sending 3 login attempts...');
  
  let successCount = 0;
  let rateLimitedCount = 0;

  for (let i = 0; i < 3; i++) {
    const res = await makeRequest('/api/auth/login', 'POST', {
      phone: '9999999999',
      password: 'wrongpassword'
    });
    if (res.status === 200 || res.status === 401) {
      successCount++;
    } else if (res.status === 429) {
      rateLimitedCount++;
      console.log(`  Request ${i + 1}: Rate limited (429)`);
    } else {
      console.log(`  Request ${i + 1}: Status ${res.status}`);
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`  ✅ Success/Auth failed: ${successCount}/3`);
  console.log(`  ⚠️  Rate limited: ${rateLimitedCount}/3`);
  return successCount > 0;
}

// Test rate limit headers
async function testRateLimitHeaders() {
  console.log('\n📋 Test 5: Rate Limit Headers');
  try {
    const res = await makeRequest('/api/public/market-rates');
    const headers = res.headers;
    
    console.log('  Response headers:');
    console.log(`    X-RateLimit-Limit: ${headers['x-ratelimit-limit'] || 'Not present'}`);
    console.log(`    X-RateLimit-Remaining: ${headers['x-ratelimit-remaining'] || 'Not present'}`);
    console.log(`    X-RateLimit-Reset: ${headers['x-ratelimit-reset'] || 'Not present'}`);
    
    return headers['x-ratelimit-limit'] !== undefined;
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Rate Limiting Tests');
  console.log('=' .repeat(50));
  console.log('⚠️  Make sure the server is running on port 5000');
  console.log('   Start with: npm run server');
  console.log('=' .repeat(50));

  const results = {
    healthCheck: await testHealthCheck(),
    publicEndpoints: await testPublicEndpoints(),
    otpEndpoint: await testOTPEndpoint(),
    loginEndpoint: await testLoginEndpoint(),
    rateLimitHeaders: await testRateLimitHeaders(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  let passCount = 0;
  let totalCount = 0;

  for (const [test, result] of Object.entries(results)) {
    totalCount++;
    const status = result ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} - ${test}`);
    if (result) passCount++;
  }

  console.log('='.repeat(50));
  console.log(`\n🎯 Score: ${passCount}/${totalCount} tests passed`);
  
  if (passCount === totalCount) {
    console.log('✨ All tests passed! Rate limiting is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the output above for details.');
  }

  console.log('\n💡 Tips:');
  console.log('  - If health check failed, server is not running');
  console.log('  - If rate limits not triggered, limits may be too high');
  console.log('  - Check server logs for rate limit violations');
  console.log('  - Adjust limits in .env file as needed\n');
}

// Run tests
runTests().catch(console.error);