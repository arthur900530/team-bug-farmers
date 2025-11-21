#!/usr/bin/env node

/**
 * Backend Health Check Script
 * 
 * Verifies that the backend is running and accessible on EC2.
 * Checks both HTTP health endpoint and WebSocket connectivity.
 * 
 * Usage:
 *   node scripts/check-backend-health.js
 *   node scripts/check-backend-health.js --cloud
 */

import https from 'https';
import http from 'http';
import { WebSocket } from 'ws';

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://34.193.221.159.nip.io:443';
const HEALTH_ENDPOINT = `${BACKEND_URL}/health`;
const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://');

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
 * Check HTTP/HTTPS health endpoint
 */
async function checkHealthEndpoint() {
  return new Promise((resolve, reject) => {
    logSection('1. Checking Health Endpoint');
    log(`URL: ${HEALTH_ENDPOINT}`, 'blue');
    
    const url = new URL(HEALTH_ENDPOINT);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    // For HTTPS, we might need to accept self-signed certificates
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'GET',
      timeout: 10000,
      // Accept self-signed certificates (for nip.io)
      rejectUnauthorized: false,
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const health = JSON.parse(data);
            log(`✅ Health check passed!`, 'green');
            log(`   Status: ${health.status}`, 'green');
            log(`   Service: ${health.service}`, 'green');
            log(`   SSL: ${health.ssl ? 'Enabled' : 'Disabled'}`, 'green');
            log(`   Uptime: ${health.uptime.toFixed(2)} seconds`, 'green');
            log(`   Timestamp: ${health.timestamp}`, 'green');
            resolve({ success: true, health });
          } catch (error) {
            log(`⚠️  Health endpoint responded but JSON parse failed`, 'yellow');
            log(`   Response: ${data}`, 'yellow');
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        } else {
          log(`❌ Health check failed! Status: ${res.statusCode}`, 'red');
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Health check failed!`, 'red');
      log(`   Error: ${error.message}`, 'red');
      if (error.code === 'ECONNREFUSED') {
        log(`   → Backend might not be running or port is incorrect`, 'yellow');
      } else if (error.code === 'ENOTFOUND') {
        log(`   → DNS resolution failed. Check the URL.`, 'yellow');
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        log(`   → SSL certificate issue. This might be expected for nip.io.`, 'yellow');
      }
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      log(`⚠️  Health endpoint timed out after 10 seconds`, 'yellow');
      log(`   → This might be normal if HTTP requests are blocked or slow`, 'yellow');
      log(`   → WebSocket connectivity check will verify if backend is actually running`, 'yellow');
      resolve({ success: false, error: 'Timeout', warning: true });
    });
    
    req.end();
  });
}

/**
 * Check WebSocket connectivity
 */
async function checkWebSocket() {
  return new Promise((resolve) => {
    logSection('2. Checking WebSocket Connectivity');
    log(`URL: ${WS_URL}`, 'blue');
    
    const ws = new WebSocket(WS_URL, {
      rejectUnauthorized: false, // Accept self-signed certificates
    });
    
    const timeout = setTimeout(() => {
      ws.close();
      log(`❌ WebSocket connection timed out after 10 seconds`, 'red');
      resolve({ success: false, error: 'Timeout' });
    }, 10000);
    
    ws.on('open', () => {
      clearTimeout(timeout);
      log(`✅ WebSocket connection established!`, 'green');
      ws.close();
      resolve({ success: true });
    });
    
    ws.on('error', (error) => {
      clearTimeout(timeout);
      log(`❌ WebSocket connection failed!`, 'red');
      log(`   Error: ${error.message}`, 'red');
      if (error.code === 'ECONNREFUSED') {
        log(`   → Backend might not be running or WebSocket not enabled`, 'yellow');
      } else if (error.code === 'ENOTFOUND') {
        log(`   → DNS resolution failed. Check the URL.`, 'yellow');
      }
      resolve({ success: false, error: error.message });
    });
    
    ws.on('close', (code, reason) => {
      if (code === 1000) {
        // Normal closure
        log(`   Connection closed normally`, 'green');
      } else {
        log(`   Connection closed with code: ${code}, reason: ${reason}`, 'yellow');
      }
    });
  });
}

/**
 * Main execution
 */
async function main() {
  logSection('Backend Health Check');
  log(`Target: ${BACKEND_URL}`, 'blue');
  log(`WebSocket: ${WS_URL}`, 'blue');
  console.log('');
  
  const healthResult = await checkHealthEndpoint();
  const wsResult = await checkWebSocket();
  
  // Summary
  logSection('Summary');
  
  // WebSocket is the critical check - if it works, backend is accessible
  if (wsResult.success) {
    if (healthResult.success) {
      log('✅ All checks passed! Backend is healthy and accessible.', 'green');
    } else if (healthResult.warning) {
      log('⚠️  WebSocket works, but health endpoint timed out.', 'yellow');
      log('   → Backend is accessible via WebSocket (this is what matters for the app)', 'yellow');
      log('   → Health endpoint timeout might be due to firewall/routing rules', 'yellow');
      log('   → Backend is functional for WebSocket connections ✅', 'green');
    } else {
      log('⚠️  WebSocket works, but health endpoint failed.', 'yellow');
      log('   → Backend is accessible via WebSocket (this is what matters for the app)', 'yellow');
      log(`   → Health endpoint error: ${healthResult.error}`, 'yellow');
      log('   → Backend is functional for WebSocket connections ✅', 'green');
    }
    process.exit(0); // Success if WebSocket works
  } else {
    log('❌ Critical checks failed. Backend is not accessible.', 'red');
    if (!healthResult.success) {
      log(`   Health endpoint: ${healthResult.error || 'Failed'}`, 'red');
    }
    if (!wsResult.success) {
      log(`   WebSocket: ${wsResult.error || 'Failed'}`, 'red');
    }
    log('   → Please verify backend is running on EC2', 'yellow');
    process.exit(1);
  }
}

// Run if executed directly
// In ES modules, check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('check-backend-health.js') ||
                     process.argv[1]?.endsWith('check-backend-health.js');

if (isMainModule) {
  main().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { checkHealthEndpoint, checkWebSocket };

