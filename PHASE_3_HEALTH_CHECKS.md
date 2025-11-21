# Phase 3: Cloud Readiness - Health Check Scripts

**Date:** November 14, 2025  
**Purpose:** Verify backend and frontend are ready for cloud testing  
**Status:** Scripts created, ready for execution

---

## 📋 Overview

Two health check scripts have been created to verify cloud infrastructure before running integration tests:

1. **Backend Health Check** - Verifies EC2 backend is running and accessible
2. **Frontend-Backend Connectivity Check** - Verifies Amplify frontend can reach backend

---

## 🚀 Quick Start

### Run All Checks
```bash
npm run check:cloud
```

### Run Individual Checks
```bash
# Check backend only
npm run check:backend

# Check frontend only
npm run check:frontend
```

### Direct Script Execution
```bash
# Backend health check
node scripts/check-backend-health.js

# Frontend connectivity check
node scripts/check-frontend-backend-connectivity.js
```

---

## 📝 Script Details

### 1. Backend Health Check (`scripts/check-backend-health.js`)

**What it checks:**
- ✅ HTTP/HTTPS health endpoint (`/health`)
- ✅ WebSocket connectivity
- ✅ SSL certificate status
- ✅ Backend uptime and status

**Configuration:**
- Default backend URL: `https://34.193.221.159.nip.io:443`
- Override with: `BACKEND_URL=https://your-backend.com:443 node scripts/check-backend-health.js`

**Expected Output:**
```
============================================================
Backend Health Check
============================================================
Target: https://34.193.221.159.nip.io:443
WebSocket: wss://34.193.221.159.nip.io:443

============================================================
1. Checking Health Endpoint
============================================================
URL: https://34.193.221.159.nip.io:443/health
✅ Health check passed!
   Status: ok
   Service: webrtc-signaling-server
   SSL: Enabled
   Uptime: 1234.56 seconds
   Timestamp: 2025-11-14T20:00:00.000Z

============================================================
2. Checking WebSocket Connectivity
============================================================
URL: wss://34.193.221.159.nip.io:443
✅ WebSocket connection established!

============================================================
Summary
============================================================
✅ All checks passed! Backend is healthy and accessible.
```

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed

---

### 2. Frontend-Backend Connectivity Check (`scripts/check-frontend-backend-connectivity.js`)

**What it checks:**
- ✅ Frontend is accessible (Amplify deployment)
- ✅ Frontend contains expected React/Vite content
- ⚠️ Provides instructions for manual WebSocket verification

**Configuration:**
- Default frontend URL: `https://main.d3j8fnrr90aipm.amplifyapp.com`
- Default backend WebSocket: `wss://34.193.221.159.nip.io:443`
- Override with:
  ```bash
  FRONTEND_URL=https://your-frontend.com \
  BACKEND_WS_URL=wss://your-backend.com:443 \
  node scripts/check-frontend-backend-connectivity.js
  ```

**Expected Output:**
```
============================================================
Frontend-Backend Connectivity Check
============================================================
Frontend: https://main.d3j8fnrr90aipm.amplifyapp.com
Backend: wss://34.193.221.159.nip.io:443

============================================================
1. Checking Frontend Accessibility
============================================================
URL: https://main.d3j8fnrr90aipm.amplifyapp.com
✅ Frontend is accessible!
   Status: 200
   ✅ Detected React/Vite application
   ✅ Detected WebSocket references in build

============================================================
2. Frontend-Backend Connectivity
============================================================
Frontend: https://main.d3j8fnrr90aipm.amplifyapp.com
Backend WebSocket: wss://34.193.221.159.nip.io:443

ℹ️  To verify frontend-backend connectivity:
   1. Open the frontend URL in a browser
   2. Open browser DevTools (F12)
   3. Go to Network tab and filter for "WS" (WebSocket)
   4. Try to join a meeting
   5. Check if WebSocket connection is made to:
      wss://34.193.221.159.nip.io:443

⚠️  Note: Frontend must be built with:
   VITE_WS_URL=wss://34.193.221.159.nip.io:443
   If the frontend connects to a different URL, it needs to be rebuilt.

============================================================
Summary
============================================================
✅ Frontend is accessible
⚠️  Manual verification needed for WebSocket connectivity
   See instructions above for browser-based testing
```

**Exit Codes:**
- `0` - Frontend is accessible
- `1` - Frontend accessibility check failed

---

## 🔍 Troubleshooting

### Backend Health Check Fails

**Error: `ECONNREFUSED`**
- **Cause:** Backend not running or wrong port
- **Fix:** 
  ```bash
  # SSH into EC2 and check PM2
  ssh -i key.pem ubuntu@34.193.221.159
  sudo pm2 list
  sudo pm2 logs mediasoup-server
  ```

**Error: `ENOTFOUND`**
- **Cause:** DNS resolution failed
- **Fix:** Verify the URL is correct: `34.193.221.159.nip.io`

**Error: `CERT_HAS_EXPIRED` or `UNABLE_TO_VERIFY_LEAF_SIGNATURE`**
- **Cause:** SSL certificate issue (common with nip.io)
- **Fix:** Script accepts self-signed certificates, but verify certs on EC2:
  ```bash
  # On EC2
  sudo certbot certificates
  ```

**Error: `Timeout`**
- **Cause:** Backend not responding or network issues
- **Fix:** Check EC2 security groups allow port 443, verify backend is running

### Frontend Connectivity Check Fails

**Error: `ENOTFOUND`**
- **Cause:** Amplify URL incorrect or deployment not complete
- **Fix:** Verify Amplify deployment status in AWS Console

**Error: `Timeout`**
- **Cause:** Amplify deployment might be down or slow
- **Fix:** Check Amplify build status, verify deployment completed

---

## 📊 Next Steps After Health Checks

Once both health checks pass:

1. **Run Cloud Integration Tests:**
   ```bash
   TEST_ENV=cloud npx playwright test
   ```

2. **Monitor Test Results:**
   - Tests may take longer due to network latency
   - Some tests might need timeout adjustments
   - Check for cloud-specific issues (SSL, CORS, etc.)

3. **Fix Any Issues:**
   - Update timeouts if needed
   - Fix SSL/certificate issues
   - Verify frontend was built with correct `VITE_WS_URL`

---

## 🔗 Related Files

- **Backend Health Script:** `scripts/check-backend-health.js`
- **Frontend Connectivity Script:** `scripts/check-frontend-backend-connectivity.js`
- **Playwright Config:** `playwright.config.ts`
- **Local vs Cloud Testing:** `LOCAL_VS_CLOUD_TESTING.md`
- **Integration Test Planning:** `INTEGRATION_TEST_PLANNING.md`

---

## 📝 Notes

- **SSL Certificates:** Scripts accept self-signed certificates (for nip.io)
- **Timeouts:** Default timeout is 10 seconds for each check
- **Environment Variables:** All URLs can be overridden via environment variables
- **Manual Verification:** Frontend-backend WebSocket connectivity requires browser-based testing

---

**Last Updated:** November 14, 2025

