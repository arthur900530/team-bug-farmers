# Database Guide

Complete guide for checking and managing the SQLite database.

---

## 📍 Database Location

```
/Users/yu-hang/Documents/CMU/Fall 2025/AITool/team-bug-farmers/backend/audio-states.db
```

**Relative path from project root:**
```
backend/audio-states.db
```

**Database files:**
- `audio-states.db` - Main database file
- `audio-states.db-shm` - Shared memory file (WAL mode)
- `audio-states.db-wal` - Write-ahead log file

---

## 🔍 5 Ways to Check User States

### **Method 1: Using the Check Script** (Easiest!)

I created a helper script for you:

```bash
cd backend
node check-db.js
```

**Output:**
```
==========================================
📊 Database Contents
==========================================

Found 2 user(s):

1. User: user-abc123
   Status: 🔇 Muted
   Device: Built-in Microphone
   Room: default-room
   Last Updated: 10/21/2025, 6:50:23 PM
   Created: 10/21/2025, 6:45:12 PM

2. User: user-xyz789
   Status: 🎤 Unmuted
   Device: External USB Microphone
   Room: default-room
   Last Updated: 10/21/2025, 6:51:45 PM
   Created: 10/21/2025, 6:50:01 PM

==========================================
📋 Table Schema
==========================================

  userId: TEXT (PRIMARY KEY)
  isMuted: INTEGER
  deviceId: TEXT
  deviceLabel: TEXT
  roomId: TEXT
  lastUpdated: TEXT
  createdAt: TEXT

==========================================
```

---

### **Method 2: Using SQLite Command Line**

```bash
cd backend
sqlite3 audio-states.db
```

**Once in SQLite shell:**

```sql
-- See all users
SELECT * FROM user_states;

-- Pretty format
.mode column
.headers on
SELECT * FROM user_states;

-- Check specific user
SELECT * FROM user_states WHERE userId = 'user-abc123';

-- Count users
SELECT COUNT(*) FROM user_states;

-- Get muted users only
SELECT * FROM user_states WHERE isMuted = 1;

-- Get users by room
SELECT * FROM user_states WHERE roomId = 'default-room';

-- Recent activity
SELECT userId, isMuted, lastUpdated 
FROM user_states 
ORDER BY lastUpdated DESC 
LIMIT 5;

-- Exit
.quit
```

---

### **Method 3: Using the API** (While Server Running)

Start the backend server:
```bash
cd backend
npm start
```

Then use curl:

```bash
# Get all users
curl http://localhost:3001/api/users

# Get specific user
curl http://localhost:3001/api/users/user-abc123

# Get users in room
curl http://localhost:3001/api/rooms/default-room/users
```

**Response format:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "userId": "user-abc123",
      "isMuted": true,
      "deviceId": "device123",
      "deviceLabel": "Built-in Microphone",
      "roomId": "default-room",
      "lastUpdated": "2025-10-21T22:50:23.456Z",
      "createdAt": "2025-10-21T22:45:12.123Z"
    }
  ]
}
```

---

### **Method 4: Using Browser (While Server Running)**

Open in browser:
- All users: http://localhost:3001/api/users
- Specific user: http://localhost:3001/api/users/user-abc123

You'll see formatted JSON.

---

### **Method 5: Using DB Browser for SQLite** (GUI)

1. Download [DB Browser for SQLite](https://sqlitebrowser.org/)
2. Open `backend/audio-states.db`
3. Visual interface to browse data

---

## 📊 Common Queries

### **Check if user is muted:**
```bash
cd backend
sqlite3 audio-states.db "SELECT userId, isMuted FROM user_states WHERE userId = 'user-abc123';"
```

### **Get all muted users:**
```bash
sqlite3 audio-states.db "SELECT userId, deviceLabel FROM user_states WHERE isMuted = 1;"
```

### **Count users per room:**
```bash
sqlite3 audio-states.db "SELECT roomId, COUNT(*) as userCount FROM user_states GROUP BY roomId;"
```

### **Recent activity (last 24 hours):**
```bash
sqlite3 audio-states.db "SELECT * FROM user_states WHERE lastUpdated > datetime('now', '-1 day');"
```

### **Find users with specific device:**
```bash
sqlite3 audio-states.db "SELECT userId, deviceLabel FROM user_states WHERE deviceLabel LIKE '%USB%';"
```

---

## 🧹 Database Management

### **View Database Size:**
```bash
cd backend
ls -lh audio-states.db
```

### **Clear All Data:**

I created a script for you:
```bash
cd backend
node clear-db.js
```

Or manually:
```bash
sqlite3 audio-states.db "DELETE FROM user_states;"
```

### **Backup Database:**
```bash
cd backend
cp audio-states.db audio-states-backup-$(date +%Y%m%d).db
```

### **Restore Backup:**
```bash
cd backend
cp audio-states-backup-20251021.db audio-states.db
```

### **Export to CSV:**
```bash
sqlite3 audio-states.db <<EOF
.mode csv
.output users-export.csv
SELECT * FROM user_states;
.quit
EOF
```

---

## 🔧 Troubleshooting

### **Database Locked Error**

**Problem:** `database is locked`

**Solution:**
```bash
# Stop backend server
# Then try again
cd backend
sqlite3 audio-states.db "SELECT * FROM user_states;"
```

### **Database Not Found**

**Problem:** `unable to open database file`

**Solution:**
```bash
# Make sure you're in the backend directory
cd backend
ls -la *.db

# If missing, start the server to create it
npm start
```

### **No Data Showing**

**Problem:** Database is empty

**Solution:**
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Join a meeting in the frontend
4. Check again: `node check-db.js`

---

## 📈 Monitoring in Real-Time

### **Watch for changes (macOS/Linux):**
```bash
cd backend
watch -n 2 'sqlite3 audio-states.db "SELECT userId, isMuted, lastUpdated FROM user_states;"'
```

### **View server logs:**
```bash
cd backend
npm start
# Watch console for API requests
```

### **Monitor database size:**
```bash
cd backend
watch -n 5 'ls -lh audio-states.db'
```

---

## 🎯 Quick Reference

```bash
# Location
cd backend

# Check data
node check-db.js

# Clear data
node clear-db.js

# SQL query
sqlite3 audio-states.db "SELECT * FROM user_states;"

# API request
curl http://localhost:3001/api/users

# Backup
cp audio-states.db audio-states.backup.db
```

---

## 📝 Database Schema Reference

```sql
CREATE TABLE user_states (
  userId TEXT PRIMARY KEY,      -- Unique user identifier
  isMuted INTEGER NOT NULL,     -- 0 = unmuted, 1 = muted
  deviceId TEXT,                -- Microphone device ID
  deviceLabel TEXT,             -- Device name (e.g., "Built-in Mic")
  roomId TEXT,                  -- Meeting room ID
  lastUpdated TEXT NOT NULL,    -- ISO 8601 timestamp
  createdAt TEXT NOT NULL       -- ISO 8601 timestamp
);

CREATE INDEX idx_roomId ON user_states(roomId);
CREATE INDEX idx_lastUpdated ON user_states(lastUpdated);
```

---

## 🐛 Debug Commands

```bash
# Check if database exists
ls -la backend/*.db

# Check database integrity
sqlite3 backend/audio-states.db "PRAGMA integrity_check;"

# Check table structure
sqlite3 backend/audio-states.db ".schema user_states"

# Check row count
sqlite3 backend/audio-states.db "SELECT COUNT(*) FROM user_states;"

# Check recent updates
sqlite3 backend/audio-states.db "SELECT userId, lastUpdated FROM user_states ORDER BY lastUpdated DESC LIMIT 5;"
```

---

## 💡 Pro Tips

1. **Keep server running** when checking via API
2. **Use check-db.js** for quick checks (no need to remember SQL)
3. **Backup before clearing** data
4. **Check timestamps** to verify updates are working
5. **Monitor logs** to see API requests in real-time

---

## 🎉 Summary

**Database Location:**
```
backend/audio-states.db
```

**Quickest Check:**
```bash
cd backend
node check-db.js
```

**API Check (server running):**
```bash
curl http://localhost:3001/api/users
```

**SQL Check:**
```bash
cd backend
sqlite3 audio-states.db "SELECT * FROM user_states;"
```

**Everything is stored automatically when you mute/unmute or switch devices in the frontend!** 🎉

