# Username Feature Implementation

## Overview

This document describes the username-based user identification system that replaces random user IDs with persistent, human-readable identities.

---

## Changes Summary

### **Problem Solved**
- ❌ **Before:** Every page refresh created a new random user ID (`user-abc123`)
- ❌ **Before:** No way to identify users
- ❌ **Before:** Database filled with orphaned entries
- ✅ **After:** Users enter their name once
- ✅ **After:** Name persists across page refreshes (localStorage)
- ✅ **After:** Human-readable IDs (`alice-x7k2m9`)

---

## Implementation Details

### 1. **Frontend Changes**

#### **JoinMeetingModal.tsx**
- Added username input field with validation
- Shows username in video preview
- Requires name before joining (2-30 characters)
- Props changed to accept username in `onJoin` callback

```typescript
interface JoinMeetingModalProps {
  onJoin: (username: string) => void;  // Now passes username
  defaultUsername?: string;             // Pre-fill from localStorage
  ...
}
```

#### **App.tsx**
- Added `username` state and `userId` derived from username
- Implemented localStorage persistence:
  ```typescript
  // Stored as: { userId: 'alice-x7k2m9', username: 'Alice' }
  localStorage.setItem('zoomDemoUser', ...)
  ```
- Username-based ID generation:
  ```typescript
  createUserId('Alice') → 'alice-x7k2m9'
  createUserId('Bob Smith') → 'bob-smith-p4q8r1'
  ```
- Updated all backend calls to include username
- Dev Controls now shows: `👤 Alice` instead of `User: user-abc123`

#### **backendService.ts**
- Updated `UserState` interface to include `username`
- Updated `updateUserState()` signature to require `username` parameter
- All API calls now send username to backend

---

### 2. **Backend Changes**

#### **database.js**
- Added `username TEXT NOT NULL` column to schema
- Added index on username for faster lookups
- Migration logic for existing databases (ALTER TABLE)
- All queries now include username field
- `createOrUpdateUserState()` requires username parameter

**New Schema:**
```sql
CREATE TABLE user_states (
  userId TEXT PRIMARY KEY,
  username TEXT NOT NULL,     -- NEW
  isMuted INTEGER NOT NULL,
  deviceId TEXT,
  deviceLabel TEXT,
  roomId TEXT,
  lastUpdated TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_username ON user_states(username);
```

#### **server.js**
- Updated POST `/api/users/:userId/state` to require `username`
- Updated PATCH endpoints to preserve username from existing state
- Added validation: username must be a non-empty string
- Returns 404 if user doesn't exist for PATCH requests

**API Changes:**
```javascript
// POST /api/users/:userId/state
{
  username: "Alice",    // NEW - Required
  isMuted: false,
  deviceId: "...",
  ...
}
```

---

### 3. **Helper Scripts**

#### **check-db.js**
- Now shows username first: `👤 Alice`
- Followed by User ID for reference
- Updated SQL query to SELECT username

**Example Output:**
```
Found 2 user(s):

1. 👤 Alice
   User ID: alice-x7k2m9
   Status: 🔇 Muted
   Device: MacBook Pro Microphone
   ...

2. 👤 Bob
   User ID: bob-p4q8r1
   Status: 🎤 Unmuted
   ...
```

#### **cleanup-inactive.js** (NEW)
- Removes users inactive for X days (default: 30)
- Prevents database bloat
- Usage:
  ```bash
  node cleanup-inactive.js      # 30 days
  node cleanup-inactive.js 7    # 7 days
  ```

---

## User Flow

### **First Time User:**
```
1. Open app → Join Meeting modal
2. Enter name: "Alice"
3. Click Join → Creates userId: alice-x7k2m9
4. Stored in localStorage
5. Backend saves: { userId, username, ... }
```

### **Returning User:**
```
1. Open app → localStorage found
2. Join Meeting modal shows: "Alice" (pre-filled)
3. Can change name or keep existing
4. Same userId reused if name unchanged
```

### **Database Entries:**
```
Before:
- user-abc123 (who is this?)
- user-def456 (who is this?)
- user-ghi789 (who is this?)

After:
- alice-x7k2m9 (Alice)
- bob-smith-p4q8r1 (Bob Smith)
- charlie-j3k8m2 (Charlie)
```

---

## Benefits

### **User Experience:**
- ✅ Only enter name once
- ✅ Name remembered across sessions
- ✅ Can change name anytime

### **Development:**
- ✅ Easy to identify users in database
- ✅ Easy to debug issues
- ✅ Human-readable logs

### **Database:**
- ✅ Fewer orphaned entries
- ✅ Easy to query by username
- ✅ Cleanup script prevents bloat

---

## localStorage Storage

**Key:** `zoomDemoUser`

**Value:**
```json
{
  "userId": "alice-x7k2m9",
  "username": "Alice"
}
```

**Cleared when:**
- User clears browser data
- User uses incognito/private mode
- User switches browsers/devices

---

## API Examples

### **Create/Update User State:**
```bash
curl -X POST http://localhost:3001/api/users/alice-x7k2m9/state \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Alice",
    "isMuted": false,
    "deviceId": "default",
    "deviceLabel": "MacBook Pro Microphone",
    "roomId": "default-room"
  }'
```

### **Get User State:**
```bash
curl http://localhost:3001/api/users/alice-x7k2m9
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "alice-x7k2m9",
    "username": "Alice",
    "isMuted": false,
    "deviceId": "default",
    "deviceLabel": "MacBook Pro Microphone",
    "roomId": "default-room",
    "lastUpdated": "2025-01-15T10:30:00.000Z",
    "createdAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## Migration Guide

### **For Existing Databases:**

The database will automatically migrate:
```javascript
// database.js adds username column if it doesn't exist
try {
  db.exec(`ALTER TABLE user_states ADD COLUMN username TEXT`);
} catch (error) {
  // Column already exists
}
```

### **For Existing Users:**

Users will need to re-enter their name on next visit:
1. Old localStorage cleared (or doesn't have username)
2. Join Meeting modal appears
3. User enters name
4. New entry created with username

### **Clean Old Data:**
```bash
cd backend
node cleanup-inactive.js 0  # Remove all entries
```

---

## Testing

### **Test Username Feature:**
```bash
# 1. Start backend
cd backend && npm start

# 2. Start frontend (new terminal)
npm run dev

# 3. Test flow
# - Open http://localhost:5173
# - Enter name "Alice"
# - Join meeting
# - Check database: cd backend && node check-db.js
# - Refresh page → name should be pre-filled
# - Change name to "Alice Smith" → New userId created
```

### **Test Database:**
```bash
# View all users
cd backend && node check-db.js

# Cleanup old entries
node cleanup-inactive.js 30

# Clear all
node clear-db.js
```

---

## Future Enhancements

### **Potential Improvements:**
1. **Username validation:** Check for duplicates, reserved names
2. **Profile pictures:** Avatar based on username hash
3. **Username history:** Track name changes
4. **Authentication:** Real login system instead of localStorage
5. **Username search:** API endpoint to find users by name
6. **Display names:** Separate display name from userId

---

## Files Modified

### **Frontend:**
- `src/components/JoinMeetingModal.tsx` - Username input UI
- `src/App.tsx` - localStorage persistence & ID generation
- `src/services/backendService.ts` - API client updates

### **Backend:**
- `backend/database.js` - Schema migration & queries
- `backend/server.js` - API validation & endpoints
- `backend/check-db.js` - Display username in output
- `backend/cleanup-inactive.js` - NEW cleanup script

### **Documentation:**
- `USERNAME_FEATURE.md` - This file

---

## Troubleshooting

### **"Username is required" error:**
- Frontend not sending username in API call
- Check `updateUserState()` calls include username parameter

### **"User not found" on PATCH:**
- User state must be created first with POST
- Call `updateUserState()` on initial join

### **Name not persisting:**
- Check browser localStorage is enabled
- Check localStorage key `zoomDemoUser`
- Try different browser (incognito clears on close)

### **Database migration failed:**
- Delete `audio-states.db` and restart
- Backend will recreate with new schema

---

## Summary

This feature transforms the user experience from anonymous random IDs to persistent, human-readable identities. Users enter their name once, and it's remembered across sessions via localStorage. The database stores username alongside userId, making debugging and user management much easier.

**Key Benefits:**
- 👤 Human-readable identities
- 💾 Persistent across refreshes
- 🗄️ Cleaner database entries
- 🛠️ Better debugging experience

