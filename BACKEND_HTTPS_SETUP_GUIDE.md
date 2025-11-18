# Backend HTTPS/WSS Setup and Testing Guide

## Overview

The backend now supports both HTTP (ws://) and HTTPS (wss://) WebSocket connections through environment variable configuration. This enables secure connections required for production deployment with AWS Amplify.

## Changes Made

### Files Modified:
1. **`backend/src/server.ts`** - Added HTTPS server creation with SSL certificate loading
2. **`backend/src/SignalingServer.ts`** - Updated to accept HTTP/HTTPS server instance instead of port
3. **`backend/Dockerfile`** - Added SSL configuration and port 443 exposure
4. **`backend/tsconfig.json`** - Fixed Node.js types configuration

### New Environment Variables:
- `USE_SSL` - Enable/disable SSL (default: `false`)
- `SSL_CERT_PATH` - Path to SSL certificate (default: `./certs/cert.pem`)
- `SSL_KEY_PATH` - Path to SSL private key (default: `./certs/key.pem`)
- `WS_PORT` - WebSocket server port (default: `8080`, use `443` for HTTPS)

---

## Testing Options

### Option 1: Test HTTP (ws://) First (Simplest)

Test without SSL to verify basic functionality:

```bash
# Navigate to backend directory
cd backend

# Build the project
npm run build

# Run without SSL on port 8080
WS_PORT=8080 USE_SSL=false npm start
```

**Expected Output:**
```
===========================================
🚀 Starting WebRTC Signaling Server
===========================================
WebSocket Port: 8080
SSL/TLS: Disabled
⚠️  Running without SSL (HTTP only - not recommended for production)
✅ Mediasoup initialized
✅ Server ready for WebSocket connections
   Connect at: ws://localhost:8080
```

**Test Connection:**
```bash
# In another terminal, test WebSocket connection
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:8080'); ws.on('open', () => console.log('✅ Connected!')); ws.on('error', (e) => console.error('❌ Error:', e));"
```

**Expected:** `✅ Connected!`

---

### Option 2: Test HTTPS (wss://) with Self-Signed Certificate

For local HTTPS testing:

#### Step 1: Generate Self-Signed Certificate

```bash
# Create certs directory
mkdir -p backend/certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 \
  -keyout backend/certs/key.pem \
  -out backend/certs/cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"
```

#### Step 2: Run Backend with SSL

```bash
cd backend

# Build if not already built
npm run build

# Run with SSL on port 443 (may need sudo for port 443)
sudo WS_PORT=443 USE_SSL=true npm start

# OR use port 8443 without sudo
WS_PORT=8443 USE_SSL=true npm start
```

**Expected Output:**
```
===========================================
🚀 Starting WebRTC Signaling Server
===========================================
WebSocket Port: 443
SSL/TLS: Enabled
🔒 Configuring SSL/TLS...
✅ SSL certificates loaded successfully
   Certificate: ./certs/cert.pem
   Key: ./certs/key.pem
✅ Mediasoup initialized
✅ Server ready for WebSocket connections
   Connect at: wss://localhost:443
```

#### Step 3: Test Connection (Self-Signed)

```bash
# Test with Node.js (ignore self-signed cert warning)
NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "const WebSocket = require('ws'); const ws = new WebSocket('wss://localhost:443'); ws.on('open', () => console.log('✅ Connected!')); ws.on('error', (e) => console.error('❌ Error:', e));"
```

**Expected:** `✅ Connected!`

⚠️ **Note:** Browsers will show security warnings with self-signed certificates.

---

### Option 3: Test in Docker

#### Step 3a: Build Docker Image

```bash
# From project root
cd backend

# Build Docker image
docker build -t webrtc-backend:latest .
```

#### Step 3b: Run Without SSL (HTTP)

```bash
docker run -d \
  --name webrtc-backend-test \
  -p 8080:8080 \
  -p 40000-49999:40000-49999/udp \
  -e WS_PORT=8080 \
  -e USE_SSL=false \
  webrtc-backend:latest

# Check logs
docker logs -f webrtc-backend-test

# Test connection
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:8080'); ws.on('open', () => console.log('✅ Connected!')); ws.on('error', (e) => console.error('❌ Error:', e));"

# Cleanup
docker stop webrtc-backend-test
docker rm webrtc-backend-test
```

#### Step 3c: Run With SSL (HTTPS)

```bash
# First, create certificates (see Option 2 Step 1)
mkdir -p certs
openssl req -x509 -newkey rsa:4096 \
  -keyout certs/key.pem \
  -out certs/cert.pem \
  -days 365 -nodes \
  -subj "/CN=localhost"

# Run Docker with mounted certificates
docker run -d \
  --name webrtc-backend-test \
  -p 443:443 \
  -p 40000-49999:40000-49999/udp \
  -v $(pwd)/certs:/app/certs:ro \
  -e WS_PORT=443 \
  -e USE_SSL=true \
  webrtc-backend:latest

# Check logs
docker logs -f webrtc-backend-test

# Test connection (ignore self-signed cert)
NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "const WebSocket = require('ws'); const ws = new WebSocket('wss://localhost:443'); ws.on('open', () => console.log('✅ Connected!')); ws.on('error', (e) => console.error('❌ Error:', e));"

# Cleanup
docker stop webrtc-backend-test
docker rm webrtc-backend-test
```

---

## Production Deployment on EC2

### Prerequisites:
1. EC2 instance running
2. Domain name pointing to EC2 public IP (e.g., `backend.yourdomain.com`)
3. Security group allowing ports 443 and 40000-49999

### Step 1: Get Let's Encrypt SSL Certificate

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@3.235.171.18

# Install Certbot
sudo yum install -y certbot

# Get certificate (requires domain pointing to this IP)
sudo certbot certonly --standalone -d backend.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/backend.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/backend.yourdomain.com/privkey.pem
```

### Step 2: Deploy Docker Container with SSL

```bash
# Clone your repository
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers/backend

# Build Docker image
docker build -t webrtc-backend:latest .

# Get EC2 public IP for mediasoup
EC2_PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

# Run with Let's Encrypt certificates
docker run -d \
  --name webrtc-backend \
  --restart unless-stopped \
  -p 443:443 \
  -p 40000-49999:40000-49999/udp \
  -v /etc/letsencrypt/live/backend.yourdomain.com:/app/certs:ro \
  -e WS_PORT=443 \
  -e USE_SSL=true \
  -e SSL_CERT_PATH=/app/certs/fullchain.pem \
  -e SSL_KEY_PATH=/app/certs/privkey.pem \
  -e ANNOUNCED_IP=$EC2_PUBLIC_IP \
  webrtc-backend:latest

# Check logs
docker logs -f webrtc-backend
```

### Step 3: Test from Remote

```bash
# From your local machine
node -e "const WebSocket = require('ws'); const ws = new WebSocket('wss://backend.yourdomain.com'); ws.on('open', () => console.log('✅ Connected!')); ws.on('error', (e) => console.error('❌ Error:', e));"
```

### Step 4: Update Amplify Frontend

1. Go to AWS Amplify Console
2. Navigate to Environment variables
3. Set: `VITE_WS_URL=wss://backend.yourdomain.com`
4. Redeploy

---

## Troubleshooting

### Issue: "ECONNREFUSED"

**Cause:** Backend not running or port blocked

**Fix:**
```bash
# Check if backend is running
docker ps

# Check logs
docker logs webrtc-backend

# Verify port is listening
sudo netstat -tlnp | grep 443
```

### Issue: "SSL certificate error"

**Cause:** Self-signed certificate or certificate not valid for domain

**Fix:**
- For production: Use Let's Encrypt certificate for your domain
- For testing: Use `NODE_TLS_REJECT_UNAUTHORIZED=0` (Node.js only)
- For browser: Must use valid certificate or manually accept in browser

### Issue: "Certificate files not found"

**Cause:** Certificate paths incorrect or files missing

**Fix:**
```bash
# Check if certificates exist
ls -la /app/certs/  # inside Docker
ls -la ./certs/     # on host

# Verify volume mount
docker inspect webrtc-backend | grep -A 10 Mounts
```

### Issue: "Permission denied binding to port 443"

**Cause:** Port 443 requires root privileges

**Fix:**
- Use Docker (port mapping handles permissions)
- OR run with sudo: `sudo npm start`
- OR use port 8443 instead: `WS_PORT=8443`

---

## Environment Variable Reference

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `WS_PORT` | WebSocket server port | `8080` | `443`, `8443` |
| `USE_SSL` | Enable HTTPS/WSS | `false` | `true` |
| `SSL_CERT_PATH` | SSL certificate file | `./certs/cert.pem` | `/etc/letsencrypt/live/domain/fullchain.pem` |
| `SSL_KEY_PATH` | SSL private key file | `./certs/key.pem` | `/etc/letsencrypt/live/domain/privkey.pem` |
| `ANNOUNCED_IP` | Public IP for RTC media | `127.0.0.1` | `3.235.171.18` |

---

## Quick Reference Commands

```bash
# Local HTTP testing
WS_PORT=8080 USE_SSL=false npm start

# Local HTTPS testing (with certs)
WS_PORT=8443 USE_SSL=true npm start

# Docker HTTP
docker run -p 8080:8080 -e USE_SSL=false webrtc-backend:latest

# Docker HTTPS (with cert mount)
docker run -p 443:443 -v $(pwd)/certs:/app/certs:ro -e WS_PORT=443 -e USE_SSL=true webrtc-backend:latest

# Test connection (HTTP)
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:8080'); ws.on('open', () => console.log('✅ OK')); ws.on('error', (e) => console.error('❌ Error:', e));"

# Test connection (HTTPS, ignore self-signed)
NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "const WebSocket = require('ws'); const ws = new WebSocket('wss://localhost:443'); ws.on('open', () => console.log('✅ OK')); ws.on('error', (e) => console.error('❌ Error:', e));"
```

---

## Next Steps

1. ✅ Test locally with HTTP (`ws://`) first
2. ✅ Test locally with HTTPS (`wss://`) using self-signed certificate
3. ✅ Deploy to EC2 with Let's Encrypt certificate
4. ✅ Update Amplify frontend with `VITE_WS_URL`
5. ✅ Test end-to-end connection from Amplify to backend

---

**For questions or issues, refer to the INTEGRATION_TEST_SPECIFICATION.md for detailed testing procedures.**

