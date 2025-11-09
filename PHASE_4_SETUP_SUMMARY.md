# Phase 4 Setup: Quick Reference

## What You Need Running

### 1. Backend Server (Terminal 1)
```bash
cd backend
npm run dev
```
- ✅ Runs on port **8080**
- ✅ **NOT opened in browser** - just runs in terminal
- ✅ Provides WebSocket signaling server

### 2. Frontend Server (Terminal 2)
```bash
# In root directory
npm run dev
```
- ✅ Runs on port **5173**
- ✅ **This is what you open in browser**

### 3. Browser Windows

**Open the SAME URL (`http://localhost:5173`) in TWO browser windows:**

- **Window 1:** Client A (sender)
  - Join meeting with user ID: `test-user-a`
  - Meeting ID: `test-meeting-phase4`

- **Window 2:** Client B (receiver)
  - Join meeting with user ID: `test-user-b`
  - Meeting ID: `test-meeting-phase4` (same meeting)

## Visual Summary

```
Terminal 1: Backend Server (port 8080)
  └─ WebSocket signaling server
     └─ NOT opened in browser

Terminal 2: Frontend Server (port 5173)
  └─ React application
     └─ Open in browser

Browser Window 1: http://localhost:5173
  └─ Client A (test-user-a)
     └─ Joins meeting: test-meeting-phase4

Browser Window 2: http://localhost:5173 (same URL!)
  └─ Client B (test-user-b)
     └─ Joins meeting: test-meeting-phase4 (same meeting!)
```

## Important Notes

- ❌ **Don't open** `localhost:8080` in browser (that's just the WebSocket server)
- ✅ **Do open** `localhost:5173` in browser (the React UI)
- ✅ **Open it TWICE** in separate windows to test with two clients
- ✅ Both clients join the **SAME meeting ID**

---

**Last Updated:** November 8, 2025

