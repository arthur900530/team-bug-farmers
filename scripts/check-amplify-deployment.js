#!/usr/bin/env node

/**
 * Check Amplify Deployment Status
 * 
 * Verifies if the Amplify frontend has been updated with the latest code.
 * This helps determine when it's safe to run cloud tests after a push.
 * 
 * Usage:
 *   node scripts/check-amplify-deployment.js
 */

import https from 'https';
import http from 'http';

// Configuration
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://main.d3j8fnrr90aipm.amplifyapp.com';

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
 * Check if frontend has been updated
 * 
 * This is a heuristic check - we fetch the frontend and check if it contains
 * recent code patterns. For the App.tsx fix, we check if the participants
 * array mapping doesn't filter out the current user.
 */
async function checkFrontendUpdate() {
  return new Promise((resolve) => {
    logSection('Checking Amplify Deployment Status');
    log(`Frontend URL: ${FRONTEND_URL}`, 'blue');
    log('Note: This checks if the frontend has been updated.', 'yellow');
    log('Amplify typically takes 2-5 minutes to build and deploy.', 'yellow');
    console.log('');
    
    const url = new URL(FRONTEND_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname || '/',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AmplifyDeploymentChecker/1.0)',
      },
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Check for indicators that the fix is deployed
          // The fix removed the filter, so we check for patterns that suggest
          // the new code is present. However, minified code makes this difficult.
          
          // Check if it's a React app
          const isReactApp = data.includes('react') || data.includes('React');
          
          // Check build timestamp or version (if available)
          // Note: This is a heuristic - minified code makes exact detection difficult
          
          log(`✅ Frontend is accessible (Status: ${res.statusCode})`, 'green');
          log(`   React/Vite detected: ${isReactApp ? 'Yes' : 'No'}`, isReactApp ? 'green' : 'yellow');
          
          // Check response headers for cache/deployment info
          const lastModified = res.headers['last-modified'];
          const etag = res.headers['etag'];
          
          if (lastModified) {
            log(`   Last Modified: ${lastModified}`, 'blue');
          }
          if (etag) {
            log(`   ETag: ${etag.substring(0, 20)}...`, 'blue');
          }
          
          log('\n⚠️  Heuristic Check Limitations:', 'yellow');
          log('   - Minified code makes exact version detection difficult', 'yellow');
          log('   - Best way to verify: Run cloud tests and check if they pass', 'yellow');
          log('   - Amplify build typically takes 2-5 minutes', 'yellow');
          
          resolve({ success: true, statusCode: res.statusCode, lastModified, etag });
        } else {
          log(`❌ Frontend returned status: ${res.statusCode}`, 'red');
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
    });
    
    req.on('error', (error) => {
      log(`❌ Check failed!`, 'red');
      log(`   Error: ${error.message}`, 'red');
      resolve({ success: false, error: error.message });
    });
    
    req.on('timeout', () => {
      req.destroy();
      log(`❌ Check timed out after 10 seconds`, 'red');
      resolve({ success: false, error: 'Timeout' });
    });
    
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  const result = await checkFrontendUpdate();
  
  logSection('Recommendation');
  
  if (result.success) {
    log('✅ Frontend is accessible', 'green');
    log('\n📋 Next Steps:', 'blue');
    log('   1. Wait 2-5 minutes for Amplify to finish building', 'blue');
    log('   2. Check Amplify Console for build status:', 'blue');
    log('      https://console.aws.amazon.com/amplify/', 'yellow');
    log('   3. Once build is complete, run cloud tests:', 'blue');
    log('      TEST_ENV=cloud npx playwright test', 'yellow');
    log('\n💡 Tip: You can check Amplify build status in AWS Console', 'blue');
    log('   or wait ~3 minutes and then run the tests.', 'blue');
  } else {
    log('❌ Frontend check failed', 'red');
    log(`   Error: ${result.error || 'Unknown'}`, 'red');
  }
  
  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('check-amplify-deployment.js') ||
                     process.argv[1]?.endsWith('check-amplify-deployment.js');

if (isMainModule) {
  main().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  });
}

export { checkFrontendUpdate };

