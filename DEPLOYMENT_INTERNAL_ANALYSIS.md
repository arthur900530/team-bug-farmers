# Deployment Internal Analysis

**Purpose:** Review deployment questions against dev_specs documentation and light load constraints  
**Date:** November 14, 2025  
**Context:** Max 10 concurrent users, light load, EC2 + AWS Amplify deployment  
**Compliance:** All analysis based on `dev_specs/` (HOLY BIBLE)

---

## 📋 Analysis Framework

### Given Constraints
1. **Max Users:** 10 concurrent users
2. **Load:** Light load (not optimized for scalability)
3. **Infrastructure:** EC2 (backend) + AWS Amplify (frontend)
4. **Memory Footprint:** ~9 KB per meeting (from `dev_specs/data_schemas.md` line 191)
5. **Dev Specs Status:** Lines 26, 29-31 of `dev_specs/tech_stack.md` mark Redis, Docker, Nginx, Prometheus as "planned" (not required immediately)

---

## 🔍 Question-by-Question Analysis

### Question 1: WebSocket URL Format

**Original Question:**
> What should the production WebSocket URL be?
> - Option A: `wss://api.yourdomain.com` (domain + reverse proxy)
> - Option B: `wss://<ec2-ip>:8080` (direct connection)
> - Option C: `wss://<ec2-domain>/signaling` (Nginx/HAProxy path routing)

**Dev Specs Reference:**
- **`dev_specs/public_interfaces.md` line 20:**
  ```
  | **Endpoint** | `wss://server.example.com/signaling` |
  ```

**ANSWER FROM DEV_SPECS:** ✅  
**Format:** `wss://<domain>/signaling`  
**Reasoning:** dev_specs explicitly specifies `/signaling` path

**Deployment Decision:**
- Use domain with `/signaling` path: `wss://api.yourdomain.com/signaling`
- Requires DNS configuration
- Requires reverse proxy (Nginx/HAProxy) per dev_specs

---

### Question 2: SSL/TLS Termination

**Original Question:**
> Should we use Nginx/HAProxy reverse proxy (matches dev_specs) or Node.js with HTTPS?

**Dev Specs Reference:**
- **`dev_specs/tech_stack.md` line 29:**
  ```
  | **Infrastructure** | Load Balancer | Nginx / HAProxy | Traffic distribution & SSL termination |
  ```
- **`dev_specs/public_interfaces.md` line 21:**
  ```
  | **Protocol** | WebSocket over TLS |
  ```

**ANSWER FROM DEV_SPECS:** ✅  
**Approach:** Nginx/HAProxy for SSL termination  
**Reasoning:** Explicitly stated in tech_stack.md line 29

**Current Codebase Status (After Git Pull):**
- `backend/src/server.ts` now supports native HTTPS via `USE_SSL` env var.
- This allows the backend to handle SSL directly, which is useful for:
  1. Development/Testing with self-signed certs.
  2. Deployment without Nginx (if desired, though deviates from specs).
  3. Internal traffic encryption (e.g., between Load Balancer and Backend).

**Deployment Decision:**
- **Primary Plan:** Use Nginx reverse proxy (Complies with dev_specs).
- **Alternative:** Use native Node.js HTTPS if Nginx setup is too complex for light load.
- **Configuration:**
  - **Dev/Test:** Native HTTPS (`USE_SSL=true`)
  - **Production:** Nginx handling SSL -> Proxy to HTTP on 8080 (Standard) OR Proxy to HTTPS on 8080 (End-to-End Encryption).

---

### Question 3: RTP Port Range

**Original Question:**
> Keep 40000-49999 or use smaller range for single EC2 instance?

**Dev Specs Reference:**
- **`dev_specs/public_interfaces.md` line 189:**
  ```
  | **Ports** | Dynamic (ICE-selected) |
  ```
- **Current Implementation:** `backend/src/MediasoupManager.ts` lines 78-79:
  ```typescript
  rtcMinPort: 40000,
  rtcMaxPort: 49999,
  ```

**NO EXPLICIT ANSWER IN DEV_SPECS** (implicit from mediasoup defaults)

**Light Load Analysis:**
- **10 users:** Each user needs 1-2 UDP ports for RTP/RTCP
- **Estimated requirement:** ~20-30 ports total
- **Current range:** 10,000 ports (40000-49999)
- **Risk:** No risk keeping large range (just firewall rule size)

**Deployment Decision:**
- **Keep current range (40000-49999)** for simplicity
- Reasoning:
  - No benefit to reducing (EC2 security group can handle large ranges)
  - Mediasoup defaults are tested and stable
  - Changing might introduce configuration errors
  - Light load doesn't stress this range

---

### Question 4: ANNOUNCED_IP Configuration

**Original Question:**
> Use Elastic IP or auto-detect EC2 public IP?

**Dev Specs Reference:**
- **`dev_specs/public_interfaces.md` line 175:**
  ```
  | **Public IP:** `ANNOUNCED_IP` must be reachable from clients |
  ```
- **Current Implementation:** `backend/src/MediasoupManager.ts` line 148:
  ```typescript
  announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1'
  ```

**NO EXPLICIT ANSWER IN DEV_SPECS** (operational decision)

**Light Load Analysis:**
- **Elastic IP benefits:**
  - Static IP (doesn't change on restart)
  - Easier DNS configuration
  - No additional cost (free if attached to running instance)
- **EC2 Public IP issues:**
  - Changes on instance stop/start
  - Requires reconfiguration after restart

**Deployment Decision:**
- **Use Elastic IP** (static IP)
- Reasoning:
  - Production stability (IP doesn't change)
  - DNS configuration remains valid
  - Free cost (attached to running instance)
- Configuration: Set `ANNOUNCED_IP=<ELASTIC_IP>` in environment

---

### Question 5: Authentication

**Original Question:**
> Implement JWT per dev_specs before deployment, or defer?

**Dev Specs Reference:**
- **`dev_specs/public_interfaces.md` line 22:**
  ```
  | **Authentication** | JWT included in WebSocket upgrade request |
  ```
- **`dev_specs/public_interfaces.md` line 25:**
  ```
  The server validates the JWT **before accepting** the WebSocket connection.
  ```
- **`dev_specs/public_interfaces.md` line 132:**
  ```
  | **401** | Invalid/expired JWT |
  ```

**ANSWER FROM DEV_SPECS:** ✅  
**Requirement:** JWT authentication is required per dev_specs  
**Timing:** Must be implemented before production deployment

**Light Load Analysis:**
- **10 users:** Security still important (prevent unauthorized access)
- **Complexity:** Moderate (JWT generation + verification)
- **Risk of deferring:** Violates dev_specs, security vulnerability

**Deployment Decision:**
- **⚠️ STOP: Must implement JWT authentication before deployment**
- Reasoning:
  - Dev_specs explicitly requires JWT (lines 22, 25)
  - Security best practice (even for light load)
  - Error code 401 defined in dev_specs (line 132)
- Current Status: Simplified authentication (see `backend/src/SignalingServer.ts` line 153)
- **Action Required:** Implement JWT before deployment

**Implementation Notes:**
- Use `jsonwebtoken` library (already in `backend/package.json` line 16)
- JWT passed in WebSocket upgrade request headers
- Server validates before accepting WebSocket connection
- Frontend needs JWT generation mechanism (AWS Cognito or custom auth service)

---

### Question 6: State Management

**Original Question:**
> Deploy with in-memory state or add Redis first?

**Dev Specs Reference:**
- **`dev_specs/tech_stack.md` line 26:**
  ```
  | **Server** | Meeting State | Redis / In-memory | Session & meeting management |
  ```
- **`dev_specs/data_schemas.md` lines 213-215:**
  ```
  # Persistence Strategy
  
  **Current:** No persistence (all in-memory).  
  **Future optional:** Redis for replication / failover.
  ```

**ANSWER FROM DEV_SPECS:** ✅  
**Approach:** In-memory is acceptable (Redis is optional/future)  
**Reasoning:** dev_specs line 214 says "Current: No persistence (all in-memory)"

**Light Load Analysis:**
- **10 users:** Memory footprint = 9 KB per meeting (from `data_schemas.md` line 191)
- **Total memory:** ~9 KB (single meeting) - negligible
- **Redis benefits:** Persistence, horizontal scaling, failover
- **Redis drawbacks:** Added complexity, additional service to manage

**Deployment Decision:**
- **Deploy with in-memory state** (matches dev_specs "Current" status)
- Reasoning:
  - Dev_specs explicitly says "Current: No persistence (all in-memory)"
  - Redis marked as "Future optional" (line 215)
  - Light load (10 users) doesn't require Redis
  - Simplifies initial deployment
  - Can add Redis later if needed (dev_specs provides Redis schema)

**Trade-offs:**
- **Pros:** Simpler deployment, matches dev_specs "Current" status
- **Cons:** State lost on server restart, no horizontal scaling
- **Acceptable for:** MVP, light load, single instance deployment

---

### Question 7: Process Management

**Original Question:**
> Use PM2, systemd, or Docker for EC2?

**Dev Specs Reference:**
- **`dev_specs/tech_stack.md` line 31:**
  ```
  | **Infrastructure** | Deployment | Docker + Kubernetes | Containerization & orchestration |
  ```

**User Instruction (Message 16):**
> "We're planning to use PM2 instead of Docker now."

**Deployment Decision:**
- **Use PM2 on EC2** (Directly on VM, no Docker).
- **Reasoning:**
  - Matches user's explicit instruction.
  - Simpler for single instance deployment.
  - "Bypasses" Docker complexity (no image building, no container networking).
  - Integrates directly with EC2 instance resources.

**Configuration:**
- **Process Manager:** PM2
- **Run Command:**
  ```bash
  # Install PM2
  sudo npm install -g pm2
  
  # Start Application
  pm2 start dist/server.js --name webrtc-backend
  
  # Enable Auto-Start
  pm2 startup
  pm2 save
  ```

---

### Question 8: Monitoring and Logging

**Original Question:**
> Add basic logging (CloudWatch) or full Prometheus + Grafana?

**Dev Specs Reference:**
- **`dev_specs/tech_stack.md` line 30:**
  ```
  | **Infrastructure** | Monitoring | Prometheus + Grafana | RTCP metrics and operational dashboards |
  ```

**ANSWER FROM DEV_SPECS:** ✅ (but marked as infrastructure, may be overkill for 10 users)  
**Approach:** Prometheus + Grafana for RTCP metrics

**Light Load Analysis:**
- **10 users:** Full Prometheus + Grafana setup is overkill for initial deployment.
- **Essential logging:** PM2 logs, AWS CloudWatch.

**Deployment Decision:**
- **Start with PM2 Logs + CloudWatch, add Prometheus later.**
- **Reasoning:**
  - Light load doesn't require real-time dashboards initially.
  - PM2 logs (`pm2 logs webrtc-backend`) are sufficient for debugging.
  - CloudWatch Agent can stream PM2 log files to AWS.
- **Initial Setup:**
  1.  **PM2 Logging:** File-based logs (default).
  2.  **AWS CloudWatch:** Configure CloudWatch Agent on EC2 to push PM2 logs.
- **Future Enhancement:**
  - Add Prometheus + Grafana later if needed.

**Deviation from dev_specs:**
- Dev_specs specifies Prometheus + Grafana (line 30).
- Justification: Light load + initial deployment = basic logging is appropriate.
- Plan to add Prometheus later per dev_specs.

---

## 📊 Summary of Decisions

| Question | Answer Source | Decision | Dev Specs Compliance |
|----------|---------------|----------|----------------------|
| 1. WebSocket URL | ✅ dev_specs | `wss://<domain>/signaling` | ✅ Compliant |
| 2. SSL/TLS | ✅ dev_specs | Nginx reverse proxy | ✅ Compliant |
| 3. RTP Port Range | ❌ Not specified | Keep 40000-49999 | ✅ Acceptable |
| 4. ANNOUNCED_IP | ❌ Not specified | Use Elastic IP | ✅ Acceptable |
| 5. Authentication | ✅ dev_specs | **⚠️ Implement JWT before deployment** | ⚠️ **Required** |
| 6. State Management | ✅ dev_specs | In-memory (Redis optional) | ✅ Compliant |
| 7. Process Management | ⚠️ dev_specs (Docker) | **Use PM2 (Single EC2)** | ⚠️ Deviation (user request) |
| 8. Monitoring | ⚠️ dev_specs (Prometheus) | Basic logging initially | ⚠️ Deviation (justified) |

---

## 🚨 Critical Action Items

### 1. ⚠️ **JWT Authentication (REQUIRED)**

**Status:** Not implemented  
**Dev Specs Requirement:** `dev_specs/public_interfaces.md` lines 22, 25  
**Priority:** **MUST implement before deployment**

**Why Required:**
- Dev_specs explicitly requires JWT (line 22: "JWT included in WebSocket upgrade request")
- Security vulnerability without authentication
- Error code 401 defined for invalid/expired JWT (line 132)

**Implementation Approach:**

**Backend (`backend/src/SignalingServer.ts`):**
```typescript
import jwt from 'jsonwebtoken';

// In SignalingServer constructor or initialization
this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  // Extract JWT from WebSocket upgrade request
  const token = this.extractTokenFromRequest(req);
  
  if (!token || !this.verifyJwt(token)) {
    ws.close(1008, 'Unauthorized: Invalid or missing JWT');
    return;
  }
  
  // Continue with connection handling...
});

private extractTokenFromRequest(req: IncomingMessage): string | null {
  // Extract from Authorization header or query parameter
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

private verifyJwt(token: string): boolean {
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
    return true;
  } catch (error) {
    return false;
  }
}
```

**Frontend (`src/services/SignalingClient.ts`):**
```typescript
connect(url: string, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Include JWT in WebSocket connection
    const wsUrl = `${url}?token=${token}`;
    // OR use subprotocol:
    // this.ws = new WebSocket(url, ['jwt', token]);
    
    this.ws = new WebSocket(wsUrl);
    // ... rest of connection logic
  });
}
```

**Environment Configuration:**
```bash
# backend/.env
JWT_SECRET=your-secret-key-here
```

**Authentication Service Options:**
1. **AWS Cognito** (recommended for AWS deployment)
   - Managed authentication service
   - Integrates with AWS Amplify
   - Provides JWT tokens
2. **Custom Auth Service** (simpler, but more work)
   - Separate authentication endpoint
   - Generate JWT tokens
   - User login/registration

**⚠️ STOP POINT:** Do not proceed with deployment until JWT is implemented.

---

### 2. ✅ **Nginx Reverse Proxy Configuration**

**Status:** Required per dev_specs  
**Dev Specs Reference:** `dev_specs/tech_stack.md` line 29

**Installation (Ubuntu EC2):**
```bash
# Install Nginx
sudo apt update
sudo apt install nginx

# Install Certbot for Let's Encrypt
sudo apt install certbot python3-certbot-nginx
```

**Configuration (`/etc/nginx/sites-available/webrtc-backend`):**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # WebSocket signaling endpoint
    location /signaling {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/webrtc-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**SSL Certificate:**
```bash
sudo certbot --nginx -d api.yourdomain.com
```

---

## 📝 Revised Deployment Checklist

### Pre-Deployment

- [x] **WebSocket URL:** `wss://api.yourdomain.com/signaling` (per dev_specs)
- [x] **SSL/TLS:** Nginx reverse proxy (per dev_specs)
- [x] **RTP Port Range:** Keep 40000-49999 (acceptable for light load)
- [x] **ANNOUNCED_IP:** Use Elastic IP (static IP)
- [ ] **⚠️ Authentication:** Implement JWT before deployment (REQUIRED)
- [x] **State Management:** In-memory (per dev_specs "Current")
- [x] **Process Management:** Use PM2 (Single EC2)
- [x] **Monitoring:** Basic logging initially (PM2 Logs + CloudWatch)

### EC2 Backend Deployment

1. **EC2 Instance Setup:**
   - [ ] Launch Ubuntu 22.04 LTS EC2 instance (t3.small or larger)
   - [ ] Allocate and attach Elastic IP
   - [ ] Configure Security Group:
     - [ ] TCP 80 (HTTP, redirects to HTTPS)
     - [ ] TCP 443 (HTTPS/WSS via Nginx)
     - [ ] UDP 40000-49999 (RTP/RTCP media)

2. **DNS Configuration:**
   - [ ] Create A record: `api.yourdomain.com` → Elastic IP

3. **Backend Installation (PM2):**
   ```bash
   # Install Node.js 18.x
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   
   # Clone repository
   git clone <repository-url>
   cd team-bug-farmers/backend
   
   # Install dependencies
   npm install
   
   # Build TypeScript
   npm run build
   ```

4. **Environment Configuration:**
   ```bash
   # Create .env file
   cat > .env << EOF
   WS_PORT=8080
   ANNOUNCED_IP=<ELASTIC_IP>
   JWT_SECRET=<generate-secure-secret>
   NODE_ENV=production
   USE_SSL=false  # Nginx handles SSL
   EOF
   ```

5. **Nginx Setup:**
   - [ ] Install Nginx
   - [ ] Configure reverse proxy (see configuration above)
   - [ ] Obtain SSL certificate (Let's Encrypt)
   - [ ] Test Nginx configuration
   - [ ] Restart Nginx

6. **Start Backend (PM2):**
   ```bash
   # Start with PM2
   pm2 start dist/server.js --name webrtc-backend
   
   # Enable startup script
   pm2 startup
   pm2 save
   
   # View logs
   pm2 logs webrtc-backend
   ```

### AWS Amplify Frontend Deployment

1. **Amplify Configuration:**
   - [ ] Connect GitHub repository to AWS Amplify
   - [ ] Configure build settings (already in `amplify.yml`)
   - [ ] Set environment variable: `VITE_WS_URL=wss://api.yourdomain.com/signaling`
   - [ ] Deploy frontend

2. **Frontend-Backend Connection Testing:**
   - [ ] Verify WebSocket connection from Amplify to EC2
   - [ ] Test SDP/ICE negotiation
   - [ ] Test RTP/RTCP media flow
   - [ ] Verify fingerprint verification (User Story 3)
   - [ ] Verify adaptive quality (User Story 8)

---

## 🔍 Dev Specs Compliance Summary

### ✅ Fully Compliant

1. **WebSocket URL:** `wss://<domain>/signaling` (per `public_interfaces.md` line 20)
2. **SSL/TLS:** Nginx reverse proxy (per `tech_stack.md` line 29)
3. **State Management:** In-memory (per `data_schemas.md` line 214)
4. **RTP Ports:** Dynamic ICE-selected (per `public_interfaces.md` line 189)

### ⚠️ Required Before Deployment

1. **JWT Authentication:** MUST implement (per `public_interfaces.md` lines 22, 25)

### ⚠️ Justified Deviations (Light Load)

1. **Process Management:** PM2 instead of Docker (dev_specs line 31)
   - **Justification:** Light load (10 users), single instance, simpler deployment
2. **Monitoring:** Basic logging instead of Prometheus + Grafana (dev_specs line 30)
   - **Justification:** Light load, initial deployment, can add later

### ✅ Optional Future Enhancements (Per Dev Specs)

1. **Redis:** Future optional (per `data_schemas.md` line 215)
2. **Docker + Kubernetes:** Planned infrastructure (per `tech_stack.md` line 31)
3. **Prometheus + Grafana:** Planned monitoring (per `tech_stack.md` line 30)

---

## ❓ Remaining Questions for User

After reviewing dev_specs, only 1 critical question remains:

### 1. **JWT Authentication Implementation**

**Question:** How should we implement JWT authentication?

**Options:**
- **Option A:** Use AWS Cognito (recommended for AWS ecosystem)
  - Pros: Managed service, integrates with Amplify, production-ready
  - Cons: Additional AWS service, learning curve
- **Option B:** Implement custom auth service
  - Pros: Full control, simpler for 10 users
  - Cons: More development work, security responsibility
- **Option C:** Defer JWT temporarily for MVP testing (violates dev_specs)
  - Pros: Faster initial deployment
  - Cons: Security vulnerability, violates dev_specs

**Recommendation:** Option A (AWS Cognito) - best fit for AWS deployment

---

## 📚 References

### Dev Specs (HOLY BIBLE)
- **`dev_specs/tech_stack.md`** - Lines 24-31 (Server & Infrastructure)
- **`dev_specs/public_interfaces.md`** - Lines 18-27 (WebSocket connection)
- **`dev_specs/data_schemas.md`** - Lines 213-215 (Persistence strategy)
- **`dev_specs/architecture.md`** - Overall system design

### Implementation Files
- **`backend/src/server.ts`** - Server entry point
- **`backend/src/SignalingServer.ts`** - WebSocket handler (line 153: simplified auth)
- **`backend/src/MediasoupManager.ts`** - SFU core (line 148: ANNOUNCED_IP)
- **`backend/package.json`** - Line 16: jsonwebtoken dependency

---

**END OF DOCUMENT**

