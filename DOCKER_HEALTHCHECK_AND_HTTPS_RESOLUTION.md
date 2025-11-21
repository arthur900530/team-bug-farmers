# Docker HEALTHCHECK and HTTPS Resolution

**Purpose:** Address Docker HEALTHCHECK requirement and EC2 HTTPS-only issue  
**Date:** November 14, 2025  
**Context:** Dockerfile uses HTTP health check, but EC2 only accepts HTTPS

---

## 🚨 Status Update (After Git Pull)

**Analysis of Current Codebase (`backend/src/server.ts`):**
1.  ✅ **HTTPS Support:** The code now includes logic to load SSL certificates and create an HTTPS server if `USE_SSL=true`.
2.  ❌ **Missing /health Endpoint:** The `http.createServer()` or `https.createServer()` calls **do not** include a request handler for `/health`. They are created empty and passed to `SignalingServer`.
3.  ❌ **Dockerfile Mismatch:** The current Dockerfile uses a TCP connection check (`net.createConnection`), not the HTTP check.

**Implication:**
If you update the Dockerfile to use `require('http').get(...)` **without** updating `server.ts` to handle the request, the health check **will fail** (404 or no response).

---

## ❓ Question 1: Do We Need HTTP Health Endpoint?

### ✅ **YES - Absolutely Required!**

**Your Proposed Dockerfile HEALTHCHECK:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

**What This Does:**
- Docker runs this command **inside the container** every 30 seconds
- Makes HTTP GET request to `http://localhost:8080/health`
- Expects HTTP 200 response

**Current Problem in `server.ts`:**
- The server is created, but it handles *no* HTTP routes.
- It only handles WebSocket upgrades (via `SignalingServer`).
- Accessing `http://localhost:8080/health` will result in a 404 or hang.

### ✅ Solution: Update `server.ts`

We must modify the server creation to handle the `/health` route.

**Required Change in `backend/src/server.ts`:**

```typescript
// ... inside the async function ...

// Define request handler
const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: 'webrtc-signaling-server'
    }));
  } else {
    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
};

if (USE_SSL) {
  // ... SSL loading ...
  httpServer = https.createServer(sslOptions, requestHandler); // <--- Add requestHandler
} else {
  httpServer = http.createServer(requestHandler); // <--- Add requestHandler
}
```

---

## ❓ Question 2: EC2 Only Accepts HTTPS - How to Resolve?

### ✅ Current Status: Backend Supports HTTPS

The pulled code (`backend/src/server.ts`) already supports HTTPS via `USE_SSL` env var.

**How to Enable:**
1.  Set `USE_SSL=true` in Docker environment.
2.  Provide `SSL_CERT_PATH` and `SSL_KEY_PATH` (files must exist).

### Recommended Docker HEALTHCHECK for HTTPS

If you enable HTTPS, the internal health check can still be simple.

**Option A: Internal HTTP (Simplest)**
Even if external access is HTTPS, you can theoretically run a separate internal HTTP server for health checks, but that complicates things.

**Option B: Internal HTTPS with Self-Signed Acceptance (Recommended)**
Since the health check runs *inside* the container, it can talk to itself via HTTPS.

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "const http = require(process.env.USE_SSL === 'true' ? 'https' : 'http'); http.get((process.env.USE_SSL === 'true' ? 'https' : 'http') + '://localhost:8080/health', {rejectUnauthorized: false}, (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```
*Note: `rejectUnauthorized: false` is crucial if using self-signed certs or if localhost certificate validation fails.*

---

## 📋 Action Items

1.  **Update `backend/src/server.ts`:** Add the `requestHandler` to respond to `/health`.
2.  **Update `backend/Dockerfile`:** Update the `HEALTHCHECK` command to use the HTTP/HTTPS check as shown above.
3.  **Configure EC2:** Ensure SSL certs are available and mapped into the container if using HTTPS.

---

**END OF DOCUMENT**
