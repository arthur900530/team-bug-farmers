# Phase 4 Troubleshooting Guide

## Common Issues

### Issue: Port 8080 Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Cause:**
A previous backend server instance is still running on port 8080.

**Solution:**

1. **Find the process using port 8080:**
   ```bash
   lsof -ti:8080
   ```
   This will show the process ID (PID).

2. **Kill the process:**
   ```bash
   kill <PID>
   ```
   Or if that doesn't work:
   ```bash
   kill -9 <PID>
   ```

3. **Verify port is free:**
   ```bash
   lsof -ti:8080
   ```
   Should return nothing if port is free.

4. **Restart the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

**Alternative: Use a different port**

If you need to run multiple instances, you can change the port:
```bash
WS_PORT=8081 npm run dev
```

---

## Understanding `npm run dev` in Different Directories

### Backend Directory (`backend/`)
```bash
cd backend
npm run dev
```

**What it does:**
- Compiles TypeScript (`tsc`)
- Runs the backend WebSocket server (`node dist/server.js`)
- Server runs on **port 8080** (default)
- This is the **signaling server** that handles WebSocket connections

**package.json script:**
```json
"dev": "tsc && node dist/server.js"
```

### Root Directory
```bash
npm run dev
```

**What it does:**
- Runs the frontend Vite development server
- Frontend runs on **port 5173** (default, or next available)
- This is the **React frontend application**

**package.json script:**
```json
"dev": "vite"
```

### Summary

| Directory | Command | What It Runs | Port |
|-----------|---------|--------------|------|
| `backend/` | `npm run dev` | Backend WebSocket server | 8080 |
| Root | `npm run dev` | Frontend Vite dev server | 5173 |

**For Phase 4 Testing:**
- You need **both** running:
  1. Backend server (port 8080) - for WebSocket signaling
  2. Frontend server (port 5173) - for the React UI

**Terminal Setup:**
```bash
# Terminal 1: Backend server
cd backend
npm run dev

# Terminal 2: Frontend server (in root directory)
npm run dev
```

---

## Other Common Issues

### Issue: Cannot Connect to WebSocket

**Check:**
- Backend server is running (`cd backend && npm run dev`)
- Server logs show: `[SignalingServer] WebSocket server started on port 8080`
- Browser console shows WebSocket connection errors
- Firewall is not blocking port 8080

### Issue: Microphone Not Working

**Check:**
- Browser permissions granted for microphone
- Browser console shows: `[AudioCapture] Microphone capture started`
- `getLocalAudioLevel()` returns > 0 when speaking
- System microphone settings are correct

### Issue: No Audio Received

**Check:**
- Server logs show: `[SignalingServer] Consumer created for existing user ...`
- Browser console shows: `[AudioPlayer] Audio track received`
- `getRemoteAudioLevel()` returns > 0 when receiving
- Speakers are enabled and volume is up
- RTCPeerConnection state is 'connected'

---

**Last Updated:** November 8, 2025

