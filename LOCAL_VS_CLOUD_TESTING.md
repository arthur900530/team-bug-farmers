# Local vs Cloud Testing: Key Differences

**Date:** November 14, 2025  
**Purpose:** Document the differences between running integration tests locally vs. in the cloud (EC2/Amplify)  
**Context:** Integration tests for User Stories 11, 3, and 8

---

## 📊 Summary Table

| Aspect | Local Testing | Cloud Testing |
|--------|--------------|---------------|
| **Frontend URL** | `http://localhost:5173` | `https://main.d3j8fnrr90aipm.amplifyapp.com` |
| **Backend WebSocket** | `ws://localhost:8080` | `wss://<ec2-ip-or-domain>:8080` |
| **Protocol** | HTTP/WS (unencrypted) | HTTPS/WSS (encrypted, required) |
| **Network Latency** | Minimal (~0-1ms) | Real network (~50-200ms+) |
| **Backend Availability** | Manual start (`npm run dev`) | PM2 on EC2 (should be running) |
| **Test Execution** | Developer's machine | GitHub Actions runner |
| **Environment Variables** | Defaults or `.env.local` | GitHub Secrets or CI env vars |
| **Timeouts** | Shorter (5-15s) | Longer (15-30s) for network delays |
| **Network Conditions** | Ideal (no packet loss) | Real-world (potential packet loss) |
| **SSL/TLS Certificates** | Not required | Required (nip.io or real cert) |

---

## 🔍 Detailed Differences

### 1. **Frontend URL Configuration**

**Local:**
```typescript
// playwright.config.ts
baseURL: 'http://localhost:5173'
```

**Cloud:**
```typescript
// playwright.config.ts
baseURL: process.env.CLOUD_URL || 'https://main.d3j8fnrr90aipm.amplifyapp.com'
```

**Test Execution:**
```bash
# Local
npx playwright test

# Cloud
TEST_ENV=cloud npx playwright test
```

---

### 2. **Backend WebSocket URL**

**Local:**
- Default: `ws://localhost:8080` (from `UserClient.ts` line 73)
- No environment variable needed
- Backend runs on same machine

**Cloud:**
- Must configure: `VITE_WS_URL=wss://34.193.221.159.nip.io:443`
- Uses WSS (secure WebSocket) instead of WS
- Backend runs on EC2 instance (IP: `34.193.221.159`)
- Requires SSL certificate (nip.io configured)

**Configuration:**
```bash
# Local - no env var needed, uses default
npm run dev

# Cloud - must set VITE_WS_URL before building
VITE_WS_URL=wss://34.193.221.159.nip.io:443 npm run build
```

**Note:** The frontend must be **rebuilt** with the correct `VITE_WS_URL` for cloud testing, as Vite environment variables are baked into the build at compile time.

---

### 3. **Network Conditions**

**Local:**
- **Latency:** ~0-1ms (same machine)
- **Packet Loss:** None (ideal conditions)
- **Bandwidth:** Unlimited (local loopback)
- **Jitter:** Minimal
- **Impact:** Tests run faster, more predictable

**Cloud:**
- **Latency:** ~50-200ms+ (real network)
- **Packet Loss:** Possible (real-world conditions)
- **Bandwidth:** Limited by network
- **Jitter:** Variable
- **Impact:** Tests may need longer timeouts, may experience intermittent failures

**Test Adjustments Needed:**
```typescript
// Local - shorter timeout
await expect(element).toBeVisible({ timeout: 5000 });

// Cloud - longer timeout for network delays
await expect(element).toBeVisible({ timeout: 15000 });
```

---

### 4. **SSL/TLS Requirements**

**Local:**
- HTTP/WS (unencrypted) is acceptable
- No certificate needed
- Browser may show "Not Secure" warning (acceptable for local dev)

**Cloud:**
- HTTPS/WSS (encrypted) is **required**
- Browser blocks unencrypted connections in production
- Requires SSL certificate:
  - **Development:** nip.io (wildcard DNS for dynamic IPs)
  - **Production:** Real SSL certificate (Let's Encrypt, AWS Certificate Manager, etc.)

**Backend Configuration:**
```typescript
// backend/src/server.ts
const USE_SSL = process.env.USE_SSL === 'true'; // true for cloud
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/cert.pem';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/key.pem';
```

---

### 5. **Backend Availability**

**Local:**
- Developer manually starts backend: `cd backend && npm run dev`
- Backend runs on same machine as tests
- Easy to restart if needed
- Can see real-time logs

**Cloud:**
- Backend runs on EC2 via PM2
- Must be running before tests execute
- Managed by PM2 (auto-restart on crash)
- Logs via `pm2 logs` or CloudWatch

**Verification:**
```bash
# Local - check if backend is running
curl http://localhost:8080/health

# Cloud - check if backend is running on EC2
curl https://<ec2-ip>.nip.io:443/health
```

---

### 6. **Test Execution Environment**

**Local:**
- Runs on developer's machine
- Uses local browser instances
- Can debug interactively
- Can use `playwright show-report` for visual debugging

**Cloud (GitHub Actions):**
- Runs on GitHub Actions runner (Ubuntu/Linux)
- Headless browser mode
- No interactive debugging
- Artifacts uploaded for review
- May have different browser behavior

**GitHub Actions Configuration:**
```yaml
# .github/workflows/run-integration-tests.yml
- name: Run Integration Tests (Cloud)
  env:
    TEST_ENV: cloud
    CLOUD_URL: ${{ secrets.CLOUD_FRONTEND_URL }}
    VITE_WS_URL: ${{ secrets.CLOUD_BACKEND_WS_URL }}
  run: npx playwright test
```

---

### 7. **Environment Variables**

**Local:**
- Uses `.env.local` file (if exists)
- Or defaults in code
- Easy to override per test run

**Cloud:**
- Must be set in GitHub Secrets
- Or passed via CI environment variables
- Cannot be changed without redeploying

**Required Secrets for Cloud Testing:**
```
CLOUD_FRONTEND_URL=https://main.d3j8fnrr90aipm.amplifyapp.com
CLOUD_BACKEND_WS_URL=wss://34.193.221.159.nip.io:443
```

---

### 8. **Test Timeouts**

**Local:**
- Connection establishment: ~1-2 seconds
- WebRTC negotiation: ~2-5 seconds
- Total test time: ~5-10 seconds per test

**Cloud:**
- Connection establishment: ~2-5 seconds (network latency)
- WebRTC negotiation: ~5-10 seconds (network latency)
- Total test time: ~15-30 seconds per test

**Recommended Timeouts:**
```typescript
// Local
await expect(statusIndicator).toBeVisible({ timeout: 10000 });

// Cloud
await expect(statusIndicator).toBeVisible({ timeout: 20000 });
```

---

### 9. **Test Reliability**

**Local:**
- **High reliability:** Ideal network conditions
- **Consistent results:** Same machine, same network
- **Fast feedback:** Quick test execution
- **Easy debugging:** Can see browser, inspect network

**Cloud:**
- **Variable reliability:** Real network conditions
- **Potential flakiness:** Network issues, EC2 availability
- **Slower feedback:** Network latency adds time
- **Harder debugging:** Must rely on logs and artifacts

**Mitigation Strategies:**
1. **Retries:** Use Playwright's retry mechanism (`retries: 2` in CI)
2. **Longer timeouts:** Account for network latency
3. **Health checks:** Verify backend is up before running tests
4. **Graceful failures:** Don't fail entire suite on one flaky test

---

### 10. **Specific Test Scenarios**

#### **User Story 11: Connection Tests**

**Local:**
- WebSocket connection: Instant
- SDP offer/answer: Fast
- ICE connection: Immediate (same machine)

**Cloud:**
- WebSocket connection: May take 1-2 seconds
- SDP offer/answer: Network latency adds delay
- ICE connection: May need more time for STUN/TURN

#### **User Story 3: Fingerprinting Tests**

**Local:**
- Fingerprint transmission: Fast
- ACK summary delivery: Predictable timing

**Cloud:**
- Fingerprint transmission: Network latency may affect timing
- ACK summary delivery: May be delayed by network conditions

#### **User Story 8: Quality Control Tests**

**Local:**
- RTCP reports: Sent every 5 seconds (as implemented)
- Tier changes: Won't occur (dummy data)

**Cloud:**
- RTCP reports: Same interval, but network may affect delivery
- Tier changes: Still won't occur (dummy data), but real network conditions may trigger tier changes once real stats are implemented

---

## 🛠️ Implementation Recommendations

### 1. **Dynamic Timeout Configuration**

```typescript
// tests/integration/helpers.ts
export const getTimeout = (baseTimeout: number): number => {
  const testEnv = process.env.TEST_ENV || 'localhost';
  const multiplier = testEnv === 'cloud' ? 2 : 1;
  return baseTimeout * multiplier;
};

// Usage in tests
await expect(element).toBeVisible({ timeout: getTimeout(10000) });
```

### 2. **Environment-Specific WebSocket URL**

```typescript
// playwright.config.ts
// Already configured! Use getWebSocketUrl() from config
import { getWebSocketUrl } from '../playwright.config';

const wsUrl = getWebSocketUrl(); // Returns correct URL based on TEST_ENV
// localhost: 'ws://localhost:8080'
// cloud: 'wss://34.193.221.159.nip.io:443'
```

### 3. **Health Check Before Tests**

```typescript
// tests/integration/helpers.ts
export async function waitForBackend(baseURL: string, timeout = 30000): Promise<void> {
  const healthUrl = baseURL.replace('http://', 'http://').replace('https://', 'https://');
  const healthEndpoint = healthUrl.includes('localhost') 
    ? 'http://localhost:8080/health'
    : `${baseURL.replace(/\/$/, '')}/health`; // Adjust for cloud
  
  // Poll health endpoint until it responds
  // ...
}
```

### 4. **Conditional Test Execution**

```typescript
// Skip tests that require specific conditions
test.skip(process.env.TEST_ENV === 'cloud' && !process.env.CLOUD_BACKEND_WS_URL, 
  'Cloud backend URL not configured');
```

---

## 📝 Checklist for Cloud Testing

- [ ] **Frontend deployed** to Amplify and accessible
- [ ] **Backend running** on EC2 via PM2
- [ ] **SSL certificates** configured (nip.io or real cert)
- [ ] **WebSocket URL** set in GitHub Secrets (`CLOUD_BACKEND_WS_URL`)
- [ ] **Frontend rebuilt** with correct `VITE_WS_URL` environment variable
- [ ] **Health check** endpoint accessible (`/health`)
- [ ] **Timeouts increased** for network latency
- [ ] **Retries enabled** in Playwright config for CI
- [ ] **Test artifacts** configured for upload (screenshots, videos, traces)

---

## 🚨 Common Issues in Cloud Testing

1. **WebSocket Connection Fails**
   - **Cause:** Backend not running, wrong URL, SSL issues
   - **Fix:** Verify backend health, check `VITE_WS_URL`, verify SSL certs

2. **Tests Timeout**
   - **Cause:** Network latency, backend slow to respond
   - **Fix:** Increase timeouts, verify backend performance

3. **Frontend Can't Connect to Backend**
   - **Cause:** `VITE_WS_URL` not set at build time
   - **Fix:** Rebuild frontend with correct environment variable

4. **SSL Certificate Errors**
   - **Cause:** Invalid or expired certificate
   - **Fix:** Regenerate nip.io cert or update real certificate

5. **Intermittent Test Failures**
   - **Cause:** Network conditions, EC2 availability
   - **Fix:** Add retries, increase timeouts, verify infrastructure

---

## 📚 References

- **Playwright Config:** `playwright.config.ts`
- **Integration Test Planning:** `INTEGRATION_TEST_PLANNING.md`
- **Integration Test Specification:** `INTEGRATION_TEST_SPECIFICATION.md`
- **AWS Deployment:** `AWS_deploy.md`
- **Backend Server:** `backend/src/server.ts` (SSL configuration)

---

**Last Updated:** November 14, 2025

