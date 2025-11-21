#!/usr/bin/env node

/**
 * Frontend-Backend Connectivity Check Script
 * 
 * Verifies that the Amplify frontend can connect to the EC2 backend.
 * This checks if the frontend was built with the correct VITE_WS_URL.
 * 
 * Usage:
 *   node scripts/check-frontend-backend-connectivity.js
 */

import https from 'https';
import http from 'http';

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d3j8fnrr90aipm.amplifyapp.com';
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'wss://34.193.221.159.nip.io:443';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

/**
 * Check if frontend is accessible
 */
async function checkFrontendAccessibility() {
  return new Promise((resolve) => {
    logSection('1. Checking Frontend Accessibility');
    log(`URL: ${FRONTEND_URL}`, 'blue');
    
    const url = new URL(FRONTEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname || '/',
      method: 'GET',
      timeout: 10000,
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          log(`✅ Frontend is accessible!`, 'green');
          log(`   Status: ${res.statusCode}`, 'green');
          
          // Check if the page contains expected content
          const hasReact = data.includes('react') || data.includes('React');
          const hasVite = data.includes('vite') || data.includes('Vite');
          
          if (hasReact || hasVite) {
            log(`   ✅ Detected React/Vite application`, 'green');
          } else {
            log(`   ⚠️  Could not detect React/Vite in response`, 'yellow');
          }
          
          // Check if VITE_WS_URL is embedded in the build
          // Note: This is a heuristic - the actual value is minified
          const hasWebSocketReference = data.includes('WebSocket') || 
                                       data.includes('ws://') || 
                                       data.includes('wss://');
          
          if (hasWebSocketReference) {
            log(`   ✅ Detected WebSocket references in build`, 'green');
          } else {
            log(`   ⚠️  Could not detect WebSocket references`, 'yellow');
            log(`   → This might be normal if code is heavily minified`, 'yellow');
          }
          
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          log(`❌ Frontend returned status: ${res.statusCode}`, 'red');
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Frontend check failed!`, 'red');
      log(`   Error: ${error.message}`, 'red');
      if (error.code === 'ENOTFOUND') {
        log(`   → DNS resolution failed. Check the URL.`, 'yellow');
      }
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      log(`❌ Frontend check timed out after 10 seconds`, 'red');
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

/**
 * Check if frontend can connect to backend
 * 
 * This is a heuristic check - we can't actually test the WebSocket connection
 * from the frontend without running a browser. Instead, we:
 * 1. Verify backend is accessible (from previous health check)
 * 2. Provide instructions for manual verification
 */
async function checkFrontendBackendConnectivity() {
  logSection('2. Frontend-Backend Connectivity');
  log(`Frontend: ${FRONTEND_URL}`, 'blue');
  log(`Backend WebSocket: ${BACKEND_WS_URL}`, 'blue');
  console.log('');
  
  log('ℹ️  To verify frontend-backend connectivity:', 'blue');
  log('   1. Open the frontend URL in a browser', 'blue');
  log('   2. Open browser DevTools (F12)', 'blue');
  log('   3. Go to Network tab and filter for "WS" (WebSocket)', 'blue');
  log('   4. Try to join a meeting', 'blue');
  log('   5. Check if WebSocket connection is made to:', 'blue');
  log(`      ${BACKEND_WS_URL}`, 'yellow');
  console.log('');
  
  log('⚠️  Note: Frontend must be built with:', 'yellow');
  log(`   VITE_WS_URL=${BACKEND_WS_URL}`, 'yellow');
  log('   If the frontend connects to a different URL, it needs to be rebuilt.', 'yellow');
  
  return { success: true, note: 'Manual verification required' };
}

/**
 * Main execution
 */
async function main() {
  logSection('Frontend-Backend Connectivity Check');
  log(`Frontend: ${FRONTEND_URL}`, 'blue');
  log(`Backend: ${BACKEND_WS_URL}`, 'blue');
  console.log('');
  
  const frontendResult = await checkFrontendAccessibility();
  const connectivityResult = await checkFrontendBackendConnectivity();
  
  // Summary
  logSection('Summary');
  
  if (frontendResult.success) {
    log('✅ Frontend is accessible', 'green');
    log('⚠️  Manual verification needed for WebSocket connectivity', 'yellow');
    log('   See instructions above for browser-based testing', 'yellow');
    process.exit(0);
  } else {
    log('❌ Frontend accessibility check failed', 'red');
    log(`   Error: ${frontendResult.error || 'Unknown'}`, 'red');
    process.exit(1);
  }
}

// Run if executed directly
// In ES modules, check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('check-frontend-backend-connectivity.js') ||
                     process.argv[1]?.endsWith('check-frontend-backend-connectivity.js');

if (isMainModule) {
  main().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { checkFrontendAccessibility, checkFrontendBackendConnectivity };

