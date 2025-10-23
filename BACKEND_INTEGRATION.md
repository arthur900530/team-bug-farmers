# Backend Integration Guide

Complete guide for the RESTful API backend integration.

---

## 🎯 Overview

The application now includes a **RESTful API backend** that:
- ✅ Tracks user mute/unmute status
- ✅ Stores device selection preferences
- ✅ Maintains user states in SQLite database
- ✅ Supports multiple users and rooms
- ✅ Provides real-time state synchronization

---

## 🏗️ Architecture

```
┌─────────────────┐         HTTP/REST           ┌──────────────────┐
│  Frontend       │────────────────────────────▶│  Backend API     │
│  (React)        │                             │  (Express)       │
│                 │◀────────────────────────────│                  │
│  - audioService │      JSON Responses         │  - Routes        │
│  - backendService│                            │  - Controllers   │
└─────────────────┘                             │  - Database      │
                                                └──────────────────┘
                                                          │
                                                          ▼
                                                 ┌──────────────────┐
                                                 │   SQLite DB      │
                                                 │  audio-states.db │
                                                 └──────────────────┘
```

---

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Start Backend Server

```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on **http://localhost:3001**

### 3. Start Frontend

```bash
# In project root
npm run dev
```

Frontend runs on **http://localhost:5173**

### 4. Test Integration

1. Join meeting in frontend
2. Watch console for: `✅ Backend connected`
3. Mute/unmute microphone
4. Switch devices
5. Check backend logs for API calls

---

## 📡 API Endpoints

### User State Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server status |
| GET | `/api/users` | Get all users |
| GET | `/api/users/:userId` | Get specific user |
| POST | `/api/users/:userId/state` | Create/update complete state |
| PATCH | `/api/users/:userId/mute` | Update mute status only |
| PATCH | `/api/users/:userId/device` | Update device only |
| DELETE | `/api/users/:userId` | Delete user state |
| GET | `/api/rooms/:roomId/users` | Get users in room |

### Example: Update User State

```bash
curl -X POST http://localhost:3001/api/users/alice/state \
  -H "Content-Type: application/json" \
  -d '{
    "isMuted": true,
    "deviceId": "device123",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room1"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User state updated",
  "data": {
    "userId": "alice",
    "isMuted": true,
    "deviceId": "device123",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room1",
    "lastUpdated": "2025-10-21T...",
    "createdAt": "2025-10-21T..."
  }
}
```

---

## 🔌 Frontend Integration

### backendService.ts

The `backendService.ts` provides functions to interact with the backend:

```typescript
import { 
  updateUserState, 
  updateMuteStatus, 
  updateDevice, 
  checkBackendHealth 
} from './services/backendService';

// Check if backend is available
const isHealthy = await checkBackendHealth();

// Update complete state
await updateUserState(userId, isMuted, deviceId, deviceLabel, roomId);

// Update mute status only
await updateMuteStatus(userId, true);

// Update device only
await updateDevice(userId, deviceId, deviceLabel);
```

### Automatic Synchronization

The frontend automatically sends updates to the backend when:

1. **User mutes/unmutes**
   ```typescript
   audioService.mute();
   if (backendConnected) {
     updateMuteStatus(userId, true);
   }
   ```

2. **User switches devices**
   ```typescript
   await audioService.switchMicrophone(deviceId);
   if (backendConnected) {
     updateDevice(userId, deviceId, deviceLabel);
   }
   ```

3. **User joins meeting**
   ```typescript
   if (backendConnected) {
     updateUserState(userId, false, deviceId, deviceLabel, roomId);
   }
   ```

---

## 🗄️ Database Schema

### Table: `user_states`

```sql
CREATE TABLE user_states (
  userId TEXT PRIMARY KEY,
  isMuted INTEGER NOT NULL DEFAULT 0,
  deviceId TEXT,
  deviceLabel TEXT,
  roomId TEXT,
  lastUpdated TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
```

**Fields:**
- `userId` - Unique user identifier
- `isMuted` - 0 = unmuted, 1 = muted
- `deviceId` - Current microphone device ID
- `deviceLabel` - Device name (e.g., "Built-in Microphone")
- `roomId` - Meeting room identifier
- `lastUpdated` - Last update timestamp (ISO 8601)
- `createdAt` - Creation timestamp (ISO 8601)

**Indexes:**
- `idx_roomId` - Fast lookup by room
- `idx_lastUpdated` - Sort by recent activity

---

## 💡 How It Works

### Data Flow Diagram

```
┌───────────┐
│   User    │
│  Actions  │
└─────┬─────┘
      │
      ▼
┌───────────────────────────────────────┐
│  Frontend (React)                     │
│                                       │
│  1. User clicks mute button          │
│  2. audioService.mute()               │
│  3. setMicMuted(true)                 │
│  4. updateMuteStatus(userId, true)    │ ─────┐
└───────────────────────────────────────┘      │
                                                │ HTTP POST
                                                │
                                                ▼
                                     ┌─────────────────────┐
                                     │  Backend API        │
                                     │                     │
                                     │  POST /api/users/   │
                                     │    :userId/mute     │
                                     │                     │
                                     │  - Validate data    │
                                     │  - Update database  │
                                     │  - Return result    │
                                     └──────────┬──────────┘
                                                │
                                                ▼
                                     ┌─────────────────────┐
                                     │  SQLite Database    │
                                     │                     │
                                     │  UPDATE user_states │
                                     │  SET isMuted = 1    │
                                     │  WHERE userId = ... │
                                     └─────────────────────┘
```

---

## 🎮 Testing the Integration

### 1. Check Backend Health

```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok",...}`

### 2. Test from Frontend

1. Open browser console
2. Join meeting
3. Look for: `✅ Backend connected`
4. Mute/unmute and watch console logs

### 3. Verify Database

```bash
cd backend
sqlite3 audio-states.db "SELECT * FROM user_states;"
```

### 4. Monitor API Calls

Backend console will show:
```
2025-10-21T... - POST /api/users/user-abc123/state
2025-10-21T... - PATCH /api/users/user-abc123/mute
2025-10-21T... - PATCH /api/users/user-abc123/device
```

---

## 🔄 Offline Mode

The application works even if backend is unavailable:

```typescript
// Frontend checks health on load
const isHealthy = await checkBackendHealth();
setBackendConnected(isHealthy);

if (!isHealthy) {
  console.warn('⚠️ Backend not available (running in offline mode)');
}

// All API calls are conditional
if (backendConnected) {
  await updateMuteStatus(userId, true);
}
```

**UI Indicator:**
- `● API` (green) = Connected
- `○ Offline` (gray) = No backend

---

## 🎨 UI Changes

### Dev Controls Panel

```
┌───────────────────────────┐
│ Dev Controls        ● API │ ← Connection status
├───────────────────────────┤
│ User: user-abc123         │ ← Auto-generated ID
├───────────────────────────┤
│ ☑ Audio Device Connected  │
│                           │
│ Audio Status:             │
│ Muted: 🎤 No              │
│ Level: 45%                │
│ [████████░░░░░░░░░░]      │
│                           │
│ Microphone:               │
│ ▼ [Built-in Mic     ]    │
└───────────────────────────┘
```

---

## 🔧 Configuration

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api
```

### Backend (.env)

```env
PORT=3001
DATABASE_PATH=./audio-states.db
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 📊 Backend Console Output

```
==========================================
🚀 Zoom Demo Backend Server
==========================================
✅ Server running on http://localhost:3001
✅ API available at http://localhost:3001/api
✅ Health check: http://localhost:3001/api/health
==========================================
✅ Database initialized
2025-10-21T... - POST /api/users/user-abc123/state
2025-10-21T... - PATCH /api/users/user-abc123/mute
```

---

## 🐛 Troubleshooting

### Backend not connecting

**Check:**
1. Is backend running? `npm start` in backend/
2. Correct port? Default is 3001
3. CORS enabled? Check backend logs
4. Firewall blocking?

**Solution:**
```bash
# Backend terminal
cd backend
npm install
npm start

# Should see: ✅ Server running on http://localhost:3001
```

### Database errors

**Check:**
1. Write permissions in backend/
2. Database file created? `backend/audio-states.db`

**Solution:**
```bash
cd backend
rm -f audio-states.db
npm start  # Will recreate database
```

### CORS errors

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**
Update `backend/server.js`:
```javascript
app.use(cors({
  origin: 'http://localhost:5173'
}));
```

---

## 🚀 Deployment

### Backend

**Option 1: Heroku**
```bash
cd backend
heroku create
git push heroku main
```

**Option 2: DigitalOcean/AWS**
```bash
# Install Node.js on server
npm install --production
PORT=3001 npm start
```

### Frontend

Update `.env`:
```env
VITE_API_URL=https://your-backend-url.com/api
```

---

## 📈 Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] User authentication (JWT)
- [ ] Rate limiting
- [ ] Analytics dashboard
- [ ] Data export/import
- [ ] Multi-room support
- [ ] User presence tracking

---

## 🎉 Summary

You now have:
- ✅ RESTful API backend
- ✅ SQLite database
- ✅ Frontend integration
- ✅ Automatic state synchronization
- ✅ Offline mode support
- ✅ User tracking
- ✅ Device tracking
- ✅ Room support

**Backend tracks every mute/unmute and device change in real-time!** 🚀

