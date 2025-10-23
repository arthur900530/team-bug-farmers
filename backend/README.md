# Backend API Server

RESTful API server for tracking user audio states (mute/unmute status and device selection).

## 🚀 Quick Start

### Install Dependencies
```bash
cd backend
npm install
```

### Start Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on **http://localhost:3001**

---

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-21T..."
}
```

---

### Get All Users
```http
GET /api/users
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "userId": "user123",
      "isMuted": true,
      "deviceId": "default",
      "deviceLabel": "Built-in Microphone",
      "roomId": "room456",
      "lastUpdated": "2025-10-21T...",
      "createdAt": "2025-10-21T..."
    }
  ]
}
```

---

### Get Specific User State
```http
GET /api/users/:userId
```

**Example:**
```bash
curl http://localhost:3001/api/users/user123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "isMuted": false,
    "deviceId": "abc123",
    "deviceLabel": "External USB Microphone",
    "roomId": "room456",
    "lastUpdated": "2025-10-21T...",
    "createdAt": "2025-10-21T..."
  }
}
```

---

### Create/Update User State
```http
POST /api/users/:userId/state
Content-Type: application/json

{
  "isMuted": true,
  "deviceId": "device123",
  "deviceLabel": "Built-in Microphone",
  "roomId": "room456"
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/users/user123/state \
  -H "Content-Type: application/json" \
  -d '{
    "isMuted": true,
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User state updated",
  "data": {
    "userId": "user123",
    "isMuted": true,
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room456",
    "lastUpdated": "2025-10-21T...",
    "createdAt": "2025-10-21T..."
  }
}
```

---

### Update Mute Status Only
```http
PATCH /api/users/:userId/mute
Content-Type: application/json

{
  "isMuted": true
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user123/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted": true}'
```

---

### Update Device Only
```http
PATCH /api/users/:userId/device
Content-Type: application/json

{
  "deviceId": "new-device-id",
  "deviceLabel": "External USB Microphone"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user123/device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "abc123",
    "deviceLabel": "External USB Microphone"
  }'
```

---

### Update Mute Verification Status (User Story 1)
```http
PATCH /api/users/:userId/verify
Content-Type: application/json

{
  "verifiedMuted": true
}
```

**Purpose:** Report hardware verification result from frontend to backend. Separates user intent (`isMuted`) from confirmed hardware state (`verifiedMuted`).

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user123/verify \
  -H "Content-Type: application/json" \
  -d '{"verifiedMuted": true}'
```

**Response:**
```json
{
  "success": true,
  "message": "Mute verification status updated",
  "data": {
    "userId": "user123",
    "username": "John Doe",
    "isMuted": true,
    "verifiedMuted": true,
    "deviceId": "abc123",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room456",
    "lastUpdated": "2025-10-23T...",
    "createdAt": "2025-10-21T..."
  }
}
```

**Validation:**
- `verifiedMuted` must be a boolean

**Notes:**
- Frontend performs hardware verification via Web Audio API
- Checks if actual audio level is 0% when muted
- `verifiedMuted=true`: Hardware confirmed silent
- `verifiedMuted=false`: Audio still detected (potential leak)
- `verifiedMuted=null`: Not yet verified

---

### Delete User State
```http
DELETE /api/users/:userId
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/users/user123
```

**Response:**
```json
{
  "success": true,
  "message": "User state deleted"
}
```

---

### Get Users in Room
```http
GET /api/rooms/:roomId/users
```

**Example:**
```bash
curl http://localhost:3001/api/rooms/room456/users
```

**Response:**
```json
{
  "success": true,
  "roomId": "room456",
  "count": 3,
  "data": [
    {
      "userId": "user123",
      "isMuted": false,
      "deviceId": "default",
      "deviceLabel": "Built-in Microphone",
      "roomId": "room456",
      "lastUpdated": "2025-10-21T...",
      "createdAt": "2025-10-21T..."
    }
  ]
}
```

---

## 🗄️ Database Schema

**Table: `user_states`**

| Column | Type | Description |
|--------|------|-------------|
| userId | TEXT | User identifier (PRIMARY KEY) |
| isMuted | INTEGER | 0 = unmuted, 1 = muted |
| deviceId | TEXT | Microphone device ID |
| deviceLabel | TEXT | Human-readable device name |
| roomId | TEXT | Meeting room identifier |
| lastUpdated | TEXT | ISO 8601 timestamp |
| createdAt | TEXT | ISO 8601 timestamp |

**Indexes:**
- `idx_roomId` - For fast room queries
- `idx_lastUpdated` - For sorting by activity

---

## 🔧 Technology Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **better-sqlite3** - Fast SQLite database
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment configuration

---

## 📁 Project Structure

```
backend/
├── server.js           # Main server file
├── database.js         # Database operations
├── package.json        # Dependencies
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
├── audio-states.db     # SQLite database (auto-created)
└── README.md          # This file
```

---

## 🧪 Testing with curl

### Complete Test Flow

```bash
# 1. Check server health
curl http://localhost:3001/api/health

# 2. Create a user with muted state
curl -X POST http://localhost:3001/api/users/alice/state \
  -H "Content-Type: application/json" \
  -d '{
    "isMuted": true,
    "deviceId": "device1",
    "deviceLabel": "Built-in Mic",
    "roomId": "room1"
  }'

# 3. Get user state
curl http://localhost:3001/api/users/alice

# 4. Unmute user
curl -X PATCH http://localhost:3001/api/users/alice/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted": false}'

# 5. Change device
curl -X PATCH http://localhost:3001/api/users/alice/device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device2",
    "deviceLabel": "External USB Mic"
  }'

# 6. Get all users
curl http://localhost:3001/api/users

# 7. Get users in room
curl http://localhost:3001/api/rooms/room1/users

# 8. Delete user
curl -X DELETE http://localhost:3001/api/users/alice
```

---

## 🔒 Security Notes

For production deployment:
- Enable authentication (JWT, OAuth)
- Add rate limiting
- Use HTTPS only
- Validate all inputs
- Add proper logging
- Use environment variables for secrets

---

## 📊 Response Format

All API responses follow this structure:

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

## 🚧 Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Authentication & authorization
- [ ] Rate limiting
- [ ] Logging middleware
- [ ] User session management
- [ ] Analytics endpoints
- [ ] Backup/restore functionality

