# Backend Module Specifications for User Stories

**Purpose:** Detailed specification of backend modules that implement the two user stories  
**Audience:** Professional Backend Developers  
**Scope:** Modules directly involved in User Story 1 and User Story 2 implementation  

---

## 📖 **User Stories Context**

### **User Story 1: Microphone Mute Verification**
**Feature:** When a user mutes their microphone, the system verifies the mute state at both software and hardware levels and provides visual confirmation.

**Backend Role:** Persist and coordinate mute states across users in the same meeting room.

### **User Story 2: In-Call Device Switching**
**Feature:** Users can switch between different microphone devices during an active call without disconnecting from the meeting.

**Backend Role:** Track device selections and maintain state consistency during device transitions.

---

## 🗂️ **Backend Modules Implementing User Stories**

Only **3 modules** directly implement these user stories:

1. **`backend/server.js`** - REST API endpoints for state management
2. **`backend/database.js`** - Data persistence layer
3. **`src/services/backendService.ts`** - Frontend API client (bridge to backend)

---

## Module 1: REST API Server (`backend/server.js`)

### **Module Overview**

**Type:** Express.js HTTP API Server  
**Protocol:** REST (HTTP/1.1)  
**Port:** 3001 (configurable via `PORT` environment variable)  
**Language:** JavaScript (ES6 modules)  
**Dependencies:** `express`, `cors`, `dotenv`, `better-sqlite3`  

**Purpose:**  
Provides HTTP endpoints for persisting and retrieving user audio states (mute status and device selection) to enable multi-user coordination and state recovery.

---

### **1.1 Features - What It Does**

#### **A. User State Persistence (Both User Stories)**

**Endpoint:** `POST /api/users/:userId/state`

**Purpose:** Create or update complete user state (atomic operation)

**Request:**
```javascript
POST /api/users/user-123/state
Content-Type: application/json

{
  "isMuted": true,              // User Story 1: Mute status
  "deviceId": "device-abc",     // User Story 2: Device identifier
  "deviceLabel": "External Mic", // User Story 2: Human-readable name
  "roomId": "room-456"          // Room assignment
}
```

**Response:**
```javascript
200 OK
{
  "success": true,
  "message": "User state updated",
  "data": {
    "userId": "user-123",
    "isMuted": true,
    "deviceId": "device-abc",
    "deviceLabel": "External Mic",
    "roomId": "room-456",
    "lastUpdated": "2025-10-22T12:34:56.789Z",
    "createdAt": "2025-10-21T08:00:00.000Z"
  }
}
```

**Validation:**
- `isMuted` must be boolean (returns 400 if not)
- `userId` extracted from URL path
- `deviceId`, `deviceLabel`, `roomId` are optional (nullable)
- Automatic timestamp management

**What It Does:**
- ✅ Upserts user record (INSERT or UPDATE)
- ✅ Updates `lastUpdated` timestamp automatically
- ✅ Preserves `createdAt` on updates
- ✅ Returns complete user state after operation
- ✅ Atomic operation (all fields or none)
- ✅ Idempotent (same request multiple times = same result)

**What It Does NOT Do:**
- ❌ Does NOT validate userId format/existence
- ❌ Does NOT verify deviceId corresponds to real hardware
- ❌ Does NOT check if user is actually in the specified room
- ❌ Does NOT enforce business rules (e.g., "can't unmute if kicked")
- ❌ Does NOT notify other users of state change (polling required)

---

#### **B. Mute Status Management (User Story 1)**

**Endpoint:** `PATCH /api/users/:userId/mute`

**Purpose:** Update only mute status without affecting device selection

**Request:**
```javascript
PATCH /api/users/user-123/mute
Content-Type: application/json

{
  "isMuted": true
}
```

**Response:**
```javascript
200 OK
{
  "success": true,
  "message": "Mute status updated",
  "data": {
    "userId": "user-123",
    "isMuted": true,
    "deviceId": "device-abc",        // Preserved from previous state
    "deviceLabel": "External Mic",   // Preserved from previous state
    "roomId": "room-456",            // Preserved from previous state
    "lastUpdated": "2025-10-22T12:35:00.000Z"
  }
}
```

**Behavior:**
- ✅ Retrieves current user state first
- ✅ Updates only `isMuted` field
- ✅ Preserves `deviceId`, `deviceLabel`, `roomId` from current state
- ✅ Returns 200 even if user doesn't exist (creates new record)
- ✅ Sets nulls for preserved fields if user is new

**What It Does:**
- ✅ Granular update (only mute status changes)
- ✅ Reduces network payload (boolean only)
- ✅ Maintains state consistency (doesn't reset device)
- ✅ Fast operation (<10ms with SQLite)

**What It Does NOT Do:**
- ❌ Does NOT verify microphone is actually muted at OS level
- ❌ Does NOT check if user has permission to unmute
- ❌ Does NOT enforce room-wide mute policies
- ❌ Does NOT rate-limit rapid mute/unmute toggling
- ❌ Does NOT broadcast state change to other users

**Use Case:**
```javascript
// User Story 1: Mute Verification Flow
1. User clicks mute button in UI
2. Frontend: audioService.mute() → Hardware muted at OS level
3. Frontend: updateMuteStatus(userId, true) → Backend sync
4. Backend: This endpoint updates database
5. Frontend: Shows green checkmark (verified)
6. Other users: Poll /api/rooms/:roomId/users to see mute state
```

---

#### **C. Device Selection Management (User Story 2)**

**Endpoint:** `PATCH /api/users/:userId/device`

**Purpose:** Update device selection without affecting mute status

**Request:**
```javascript
PATCH /api/users/user-123/device
Content-Type: application/json

{
  "deviceId": "device-xyz",
  "deviceLabel": "Bluetooth Headset"
}
```

**Response:**
```javascript
200 OK
{
  "success": true,
  "message": "Device updated",
  "data": {
    "userId": "user-123",
    "isMuted": true,                      // Preserved from previous state
    "deviceId": "device-xyz",             // Updated
    "deviceLabel": "Bluetooth Headset",   // Updated
    "roomId": "room-456",                 // Preserved from previous state
    "lastUpdated": "2025-10-22T12:36:00.000Z"
  }
}
```

**Validation:**
- `deviceId` is required (returns 400 if missing)
- `deviceLabel` is optional (nullable)

**Behavior:**
- ✅ Retrieves current user state first
- ✅ Updates only `deviceId` and `deviceLabel` fields
- ✅ Preserves `isMuted` state (critical for User Story 2 requirement)
- ✅ Preserves `roomId`
- ✅ Returns complete state after update

**What It Does:**
- ✅ Maintains mute state during device switch (key feature!)
- ✅ Tracks device history via `lastUpdated` timestamps
- ✅ Supports null deviceLabel (device enumeration may not provide labels)
- ✅ Enables device preference persistence

**What It Does NOT Do:**
- ❌ Does NOT verify deviceId exists on user's system
- ❌ Does NOT check if device is available/connected
- ❌ Does NOT handle device permissions
- ❌ Does NOT store device capabilities (sample rate, channels, etc.)
- ❌ Does NOT manage device enumeration (frontend responsibility)

**Use Case:**
```javascript
// User Story 2: Device Switching Flow
1. User selects new device in dropdown
2. Frontend: audioService.switchMicrophone(deviceId)
   ├── Stores current mute state (e.g., muted=true)
   ├── Stops current audio stream
   ├── Requests new device from OS
   ├── Restores mute state to new device
3. Frontend: updateDevice(userId, deviceId, label) → Backend sync
4. Backend: This endpoint updates database (preserving mute state)
5. Frontend: Shows confirmation "Switched to Bluetooth Headset"
6. Mute button: Still shows 🔇 (mute state preserved)
```

---

#### **D. User State Retrieval (Both User Stories)**

**Endpoint:** `GET /api/users/:userId`

**Purpose:** Retrieve complete user state (for reconnection recovery)

**Request:**
```javascript
GET /api/users/user-123
```

**Response (User Exists):**
```javascript
200 OK
{
  "success": true,
  "data": {
    "userId": "user-123",
    "isMuted": true,
    "deviceId": "device-xyz",
    "deviceLabel": "Bluetooth Headset",
    "roomId": "room-456",
    "lastUpdated": "2025-10-22T12:36:00.000Z",
    "createdAt": "2025-10-21T08:00:00.000Z"
  }
}
```

**Response (User Not Found):**
```javascript
404 Not Found
{
  "success": false,
  "error": "User not found"
}
```

**What It Does:**
- ✅ Retrieves current state from database
- ✅ Returns 404 if user never connected
- ✅ Enables state recovery after page refresh
- ✅ Supports reconnection logic

**What It Does NOT Do:**
- ❌ Does NOT check if user is currently online
- ❌ Does NOT return historical states (only current)
- ❌ Does NOT include other users in room

**Use Case:**
```javascript
// Reconnection Flow
1. User refreshes page (WebSocket disconnected)
2. Frontend: Loads app.tsx
3. Frontend: getUserState(userId)
4. Backend: This endpoint returns last known state
5. Frontend: Restores mute button UI
6. Frontend: Restores device selection in dropdown
7. Frontend: Continues from previous state
```

---

#### **E. Room User Listing (Multi-User Coordination)**

**Endpoint:** `GET /api/rooms/:roomId/users`

**Purpose:** List all users in a meeting room (enables UI to show other participants)

**Request:**
```javascript
GET /api/rooms/room-456/users
```

**Response:**
```javascript
200 OK
{
  "success": true,
  "roomId": "room-456",
  "count": 3,
  "data": [
    {
      "userId": "user-123",
      "isMuted": true,
      "deviceId": "device-xyz",
      "deviceLabel": "Bluetooth Headset",
      "roomId": "room-456",
      "lastUpdated": "2025-10-22T12:36:00.000Z"
    },
    {
      "userId": "user-456",
      "isMuted": false,
      "deviceId": "default",
      "deviceLabel": "Built-in Microphone",
      "roomId": "room-456",
      "lastUpdated": "2025-10-22T12:35:30.000Z"
    },
    {
      "userId": "user-789",
      "isMuted": false,
      "deviceId": "device-usb",
      "deviceLabel": "USB Microphone",
      "roomId": "room-456",
      "lastUpdated": "2025-10-22T12:34:00.000Z"
    }
  ]
}
```

**What It Does:**
- ✅ Returns all users assigned to specified room
- ✅ Includes mute states for all users (User Story 1)
- ✅ Includes device selections for all users (User Story 2)
- ✅ Ordered by `lastUpdated` DESC (most recent first)
- ✅ Returns empty array if room has no users

**What It Does NOT Do:**
- ❌ Does NOT filter inactive users (no timeout mechanism)
- ❌ Does NOT return user presence status (online/offline)
- ❌ Does NOT paginate results (returns all, max 10 users expected)
- ❌ Does NOT include audio levels or real-time metrics

**Use Case:**
```javascript
// Participant List UI
1. Frontend: Polls GET /api/rooms/room-456/users every 5 seconds
2. Backend: Returns all users in room
3. Frontend: Renders participant list:
   - User 123: 🔇 Muted (Bluetooth Headset)
   - User 456: 🎤 Unmuted (Built-in Microphone)
   - User 789: 🎤 Unmuted (USB Microphone)
```

---

### **1.2 Features - What It Does NOT Do**

#### **A. Real-Time Communication**
- ❌ No WebSocket connections
- ❌ No Server-Sent Events (SSE)
- ❌ No push notifications to clients
- ❌ Clients must poll for updates (REST only)
- ❌ No sub-second latency guarantees

**Implication:** 
- Updates propagate on next poll (5-10 second delay typical)
- Not suitable for real-time collaboration indicators
- Acceptable for 10 users, not for 100+

#### **B. Audio/Video Processing**
- ❌ Does NOT process audio streams
- ❌ Does NOT encode/decode audio codecs
- ❌ Does NOT handle WebRTC signaling
- ❌ Does NOT transmit media between users
- ❌ Does NOT manage STUN/TURN servers

**Implication:**
- This is a state management API only
- Media flows peer-to-peer (WebRTC) or not at all
- Backend has no visibility into actual audio data

#### **C. Authentication & Authorization**
- ❌ No user authentication (no JWT, no OAuth)
- ❌ No session management
- ❌ No permission checks (anyone can update any user)
- ❌ No rate limiting (beyond basic Express defaults)
- ❌ No CSRF protection

**Implication:**
- Demo/prototype security model only
- Trusts all clients
- Not suitable for production without adding auth

#### **D. Business Logic**
- ❌ No meeting scheduling
- ❌ No room capacity limits
- ❌ No moderator privileges
- ❌ No "force mute all" functionality
- ❌ No recording/playback
- ❌ No user kick/ban logic

**Implication:**
- Minimal business logic (pure state storage)
- Extensions require custom endpoints

#### **E. Data Validation**
- ❌ Does NOT validate userId format (accepts any string)
- ❌ Does NOT verify deviceId exists on user's system
- ❌ Does NOT check roomId is valid meeting
- ❌ Does NOT sanitize input for XSS (trusts clients)
- ❌ Does NOT enforce schema beyond type checking

**Implication:**
- Garbage in, garbage out
- Frontend must validate before sending
- SQL injection prevented by prepared statements only

---

### **1.3 Technical Constraints**

#### **Performance Characteristics**
```javascript
Tested on t2.micro (1 vCPU, 1 GB RAM):
- Response time: 30-100ms per request
- Throughput: ~100 requests/second
- Concurrent users: 10 (design limit)
- Database size: Negligible (<1 MB for 10 users)
```

#### **Scalability Limits**
```javascript
Hard Limits:
- SQLite write lock: ~10 concurrent writes max
- Single-threaded: No horizontal scaling
- In-memory metrics: Lost on restart
- No load balancer support (sticky sessions required)

Soft Limits:
- Room size: 10 users (no enforcement, just design target)
- Request rate: ~100/s before degradation
- Database size: 140 TB theoretical, 100 MB practical
```

#### **Error Handling**
```javascript
HTTP Status Codes:
- 200 OK: Success
- 400 Bad Request: Invalid input (e.g., isMuted not boolean)
- 404 Not Found: User doesn't exist (GET only)
- 500 Internal Server Error: Database failure, uncaught exception

Response Format (All Errors):
{
  "success": false,
  "error": "Human-readable error message"
}
```

---

## Module 2: Database Persistence Layer (`backend/database.js`)

### **Module Overview**

**Type:** Data Access Layer  
**Database:** SQLite 3 with better-sqlite3 driver  
**Mode:** WAL (Write-Ahead Logging)  
**Language:** JavaScript (ES6 modules)  
**Dependencies:** `better-sqlite3`  

**Purpose:**  
Abstracts database operations for user state management. Provides CRUD operations with prepared statements for security and performance.

---

### **2.1 Features - What It Does**

#### **A. Schema Management**

**Function:** `initDatabase()`

**Purpose:** Create database schema if it doesn't exist (idempotent)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS user_states (
  userId TEXT PRIMARY KEY,          -- Unique user identifier
  isMuted INTEGER NOT NULL DEFAULT 0, -- Boolean as 0/1 (SQLite convention)
  deviceId TEXT,                    -- Device identifier (nullable)
  deviceLabel TEXT,                 -- Human-readable device name (nullable)
  roomId TEXT,                      -- Meeting room identifier (nullable)
  lastUpdated TEXT NOT NULL,        -- ISO 8601 timestamp
  createdAt TEXT NOT NULL           -- ISO 8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_roomId 
  ON user_states(roomId);           -- Fast room queries

CREATE INDEX IF NOT EXISTS idx_lastUpdated 
  ON user_states(lastUpdated);      -- Fast ordering by recency
```

**What It Does:**
- ✅ Creates table on first run
- ✅ Creates indexes for common queries
- ✅ Enables WAL mode for better concurrency
- ✅ Idempotent (safe to run multiple times)
- ✅ Logs success message

**What It Does NOT Do:**
- ❌ Does NOT handle migrations (schema is fixed)
- ❌ Does NOT version control schema
- ❌ Does NOT support rollback to previous schema
- ❌ Does NOT validate existing data on startup

---

#### **B. User State Retrieval**

**Function:** `getUserState(userId)`

**Purpose:** Retrieve single user state by ID

**Signature:**
```javascript
function getUserState(userId: string): UserState | null
```

**Returns:**
```javascript
{
  userId: "user-123",
  isMuted: true,                    // Converted from INTEGER to boolean
  deviceId: "device-xyz",
  deviceLabel: "Bluetooth Headset",
  roomId: "room-456",
  lastUpdated: "2025-10-22T12:36:00.000Z",
  createdAt: "2025-10-21T08:00:00.000Z"
}

// OR

null  // If user not found
```

**What It Does:**
- ✅ Uses prepared statement (SQL injection safe)
- ✅ Converts SQLite INTEGER (0/1) to JavaScript boolean
- ✅ Returns null instead of throwing if not found
- ✅ Fast query (<1ms)

**What It Does NOT Do:**
- ❌ Does NOT cache results
- ❌ Does NOT validate userId format
- ❌ Does NOT load related entities (rooms, etc.)

---

#### **C. Bulk User Retrieval**

**Function:** `getAllUserStates()`

**Purpose:** Retrieve all users (used by GET /api/users)

**Signature:**
```javascript
function getAllUserStates(): UserState[]
```

**Returns:**
```javascript
[
  { userId: "user-123", isMuted: true, ... },
  { userId: "user-456", isMuted: false, ... },
  // ...
]
// Ordered by lastUpdated DESC (most recent first)
```

**What It Does:**
- ✅ Returns all users in database
- ✅ Orders by `lastUpdated` DESC
- ✅ Converts booleans for all users
- ✅ Returns empty array if no users

**What It Does NOT Do:**
- ❌ Does NOT paginate (returns all)
- ❌ Does NOT filter by criteria
- ❌ Does NOT limit result size

---

#### **D. User State Upsert (Core Operation)**

**Function:** `createOrUpdateUserState(data)`

**Purpose:** Insert new user or update existing (atomic operation)

**Signature:**
```javascript
function createOrUpdateUserState(data: {
  userId: string,
  isMuted: boolean,
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null
}): UserState
```

**SQL (Prepared Statement):**
```sql
INSERT INTO user_states (
  userId, isMuted, deviceId, deviceLabel, roomId, 
  lastUpdated, createdAt
)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(userId) DO UPDATE SET
  isMuted = excluded.isMuted,
  deviceId = excluded.deviceId,
  deviceLabel = excluded.deviceLabel,
  roomId = excluded.roomId,
  lastUpdated = excluded.lastUpdated;
```

**What It Does:**
- ✅ **Upsert operation:** INSERT if new, UPDATE if exists
- ✅ Converts boolean to INTEGER (0/1) for SQLite
- ✅ Generates timestamps automatically (ISO 8601)
- ✅ Preserves `createdAt` on updates (conflict clause)
- ✅ Updates `lastUpdated` on every call
- ✅ Returns complete user state after operation
- ✅ Atomic (all fields or none)

**What It Does NOT Do:**
- ❌ Does NOT validate input (caller's responsibility)
- ❌ Does NOT log changes (no audit trail)
- ❌ Does NOT handle partial updates efficiently
  - (Updates all fields even if only one changed)
- ❌ Does NOT use transactions (single statement only)

**Performance:**
- Write time: ~5-10ms on SSD
- Blocking operation (waits for disk write)

---

#### **E. User Deletion**

**Function:** `deleteUserState(userId)`

**Purpose:** Remove user from database

**Signature:**
```javascript
function deleteUserState(userId: string): boolean
```

**Returns:**
```javascript
true   // If user was deleted
false  // If user didn't exist
```

**What It Does:**
- ✅ Deletes user record
- ✅ Returns boolean success indicator
- ✅ Idempotent (safe to call multiple times)

**What It Does NOT Do:**
- ❌ Does NOT cascade delete related data (none exists)
- ❌ Does NOT soft delete (permanent removal)
- ❌ Does NOT require confirmation

---

#### **F. Room-Based Queries**

**Function:** `getUsersByRoom(roomId)`

**Purpose:** Get all users in a specific room

**Signature:**
```javascript
function getUsersByRoom(roomId: string): UserState[]
```

**Returns:**
```javascript
[
  { userId: "user-123", roomId: "room-456", ... },
  { userId: "user-789", roomId: "room-456", ... }
]
// All users where roomId matches
// Ordered by lastUpdated DESC
```

**What It Does:**
- ✅ Filters by roomId
- ✅ Uses indexed query (fast via idx_roomId)
- ✅ Returns empty array if no users in room

**What It Does NOT Do:**
- ❌ Does NOT validate roomId exists
- ❌ Does NOT filter by user status (all users returned)

---

### **2.2 Features - What It Does NOT Do**

#### **A. No Transaction Support**
- ❌ Does NOT wrap operations in BEGIN/COMMIT
- ❌ Does NOT support rollback
- ❌ Each function is atomic, but no grouped operations
- ❌ Race conditions possible with concurrent updates

**Example Issue:**
```javascript
// Thread 1: Update mute status
// Thread 2: Update device (simultaneously)
// Result: One may overwrite the other
// Solution: Use server.js granular endpoints (/mute, /device)
```

#### **B. No Connection Pooling**
- ❌ Single connection to database (better-sqlite3 design)
- ❌ Does NOT support concurrent writes well
- ❌ Writes serialize (one at a time)

**Implication:**
- Max ~10 concurrent users practical
- Beyond that, consider PostgreSQL with connection pool

#### **C. No Caching**
- ❌ Every read hits disk
- ❌ Does NOT use Redis or memcached
- ❌ Does NOT cache prepared statements (driver does this)

**Implication:**
- Fast enough for 10 users (<1ms reads)
- For 100+ users, add caching layer

#### **D. No Data Validation**
- ❌ Does NOT validate userId format
- ❌ Does NOT enforce deviceId conventions
- ❌ Does NOT check foreign keys (no rooms table)
- ❌ SQL injection prevented by prepared statements only

**Implication:**
- Validation is server.js responsibility
- Database accepts any valid SQLite types

#### **E. No Audit Trail**
- ❌ Does NOT log changes
- ❌ Does NOT maintain history
- ❌ Only current state stored (no previous states)

**Implication:**
- Can't answer "when did user X mute?"
- Can't replay state changes
- For auditing, add separate audit table

---

### **2.3 Technical Constraints**

#### **SQLite Limitations**
```javascript
Write Concurrency:
- WAL mode: ~10 concurrent writes max
- Single writer at a time (lock contention)
- Reads don't block writes (WAL benefit)

File Size:
- Max database size: 140 TB (theoretical)
- Practical limit: Depends on I/O performance
- For 10 users: <1 MB

Performance:
- Read: <1ms (in-memory page cache)
- Write: ~5-10ms (fsync to disk)
- Index lookup: O(log n) via B-tree
```

#### **better-sqlite3 Design**
```javascript
Synchronous API:
- All operations block Node.js event loop
- No async/await needed (intentional design)
- Simpler code, but can block under load

Connection:
- Single connection for app lifetime
- Created at module import
- Closed on SIGINT

Prepared Statements:
- Cached automatically by driver
- SQL compiled once, executed many times
- Safe from SQL injection
```

---

## Module 3: Frontend Backend Client (`src/services/backendService.ts`)

### **Module Overview**

**Type:** API Client Library  
**Protocol:** HTTP REST (fetch API)  
**Language:** TypeScript  
**Dependencies:** None (browser fetch API)  

**Purpose:**  
Provides typed functions for frontend to call backend API. Handles request/response formatting and error handling.

---

### **3.1 Features - What It Does**

#### **A. Complete State Update**

**Function:** `updateUserState()`

**Purpose:** Send complete user state to backend (used on initial connection)

**Signature:**
```typescript
async function updateUserState(
  userId: string,
  isMuted: boolean,
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null = 'default-room'
): Promise<UserState | null>
```

**Usage:**
```typescript
// When user joins meeting
const state = await updateUserState(
  'user-123',
  false,              // Not muted initially
  'default',          // Default device
  'Built-in Mic',
  'room-456'
);

// Returns:
// { userId: "user-123", isMuted: false, deviceId: "default", ... }
// OR null on error
```

**What It Does:**
- ✅ Calls `POST /api/users/:userId/state`
- ✅ Formats request body as JSON
- ✅ Parses JSON response
- ✅ Returns typed UserState object
- ✅ Logs success/errors to console
- ✅ Returns null on any error (network, 4xx, 5xx)

**What It Does NOT Do:**
- ❌ Does NOT retry on failure
- ❌ Does NOT queue requests (fire-and-forget)
- ❌ Does NOT validate input types (TypeScript compile-time only)
- ❌ Does NOT throw exceptions (returns null)

---

#### **B. Mute Status Update (User Story 1)**

**Function:** `updateMuteStatus()`

**Purpose:** Send mute status change to backend

**Signature:**
```typescript
async function updateMuteStatus(
  userId: string,
  isMuted: boolean
): Promise<UserState | null>
```

**Usage:**
```typescript
// User Story 1: When user clicks mute button
const handleMicToggle = async () => {
  // 1. Control hardware first
  audioService.mute();
  setMicMuted(true);
  
  // 2. Sync to backend (fire-and-forget)
  if (backendConnected) {
    await updateMuteStatus(userId, true);
  }
  
  // 3. Verify mute state
  const isVerified = audioService.verifyMuteState();
  if (isVerified) {
    showGreenCheckmark();
  }
};
```

**What It Does:**
- ✅ Calls `PATCH /api/users/:userId/mute`
- ✅ Minimal payload (boolean only)
- ✅ Preserves device selection on backend
- ✅ Logs mute/unmute action to console

**What It Does NOT Do:**
- ❌ Does NOT control microphone hardware (audioService does)
- ❌ Does NOT verify hardware mute state
- ❌ Does NOT wait for backend before showing UI change
- ❌ Does NOT rollback UI if backend fails

---

#### **C. Device Selection Update (User Story 2)**

**Function:** `updateDevice()`

**Purpose:** Send device selection change to backend

**Signature:**
```typescript
async function updateDevice(
  userId: string,
  deviceId: string,
  deviceLabel: string | null
): Promise<UserState | null>
```

**Usage:**
```typescript
// User Story 2: When user switches device
const handleMicrophoneSwitch = async (deviceId: string) => {
  // 1. Switch hardware first
  const success = await audioService.switchMicrophone(deviceId);
  
  if (success) {
    setCurrentDeviceId(deviceId);
    
    // 2. Get device label
    const device = availableDevices.find(d => d.deviceId === deviceId);
    const deviceLabel = device?.label || null;
    
    // 3. Sync to backend
    if (backendConnected) {
      await updateDevice(userId, deviceId, deviceLabel);
    }
    
    // 4. Restart audio monitoring
    audioService.startAudioLevelMonitoring(...);
  }
};
```

**What It Does:**
- ✅ Calls `PATCH /api/users/:userId/device`
- ✅ Sends deviceId and deviceLabel
- ✅ Preserves mute status on backend (critical!)
- ✅ Logs device name to console

**What It Does NOT Do:**
- ❌ Does NOT switch hardware device (audioService does)
- ❌ Does NOT enumerate devices (navigator.mediaDevices does)
- ❌ Does NOT verify device exists
- ❌ Does NOT handle permission errors

---

#### **D. Health Check**

**Function:** `checkBackendHealth()`

**Purpose:** Verify backend is reachable

**Signature:**
```typescript
async function checkBackendHealth(): Promise<boolean>
```

**Usage:**
```typescript
// On app startup
useEffect(() => {
  checkBackendHealth().then(isHealthy => {
    setBackendConnected(isHealthy);
    if (isHealthy) {
      console.log('✅ Backend connected');
    } else {
      console.warn('⚠️ Backend offline (running in offline mode)');
    }
  });
}, []);
```

**What It Does:**
- ✅ Calls `GET /api/health`
- ✅ Returns true if 200 OK
- ✅ Returns false on any error (network, timeout, 5xx)
- ✅ Fast check (no body parsing)

**What It Does NOT Do:**
- ❌ Does NOT parse health response
- ❌ Does NOT retry
- ❌ Does NOT cache result

---

### **3.2 Features - What It Does NOT Do**

#### **A. No Request Queue**
- ❌ Does NOT queue requests during network issues
- ❌ Does NOT retry failed requests automatically
- ❌ Fire-and-forget pattern (if fails, app continues)

#### **B. No Optimistic Updates**
- ❌ Does NOT update UI before backend responds
- ❌ Hardware changed first, then backend (async)

#### **C. No Batching**
- ❌ Does NOT batch multiple updates into one request
- ❌ Each call is separate HTTP request

#### **D. No Caching**
- ❌ Does NOT cache responses
- ❌ No client-side state management (beyond React state)

#### **E. No WebSocket**
- ❌ Does NOT maintain persistent connection
- ❌ Does NOT receive push updates
- ❌ Polling-based architecture (if implemented by consumer)

---

## 🔄 **Data Flow Diagrams**

### **User Story 1: Mute Verification Flow**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User clicks mute button in UI                            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Frontend: audioService.mute()                            │
│    - Calls: audioTrack.enabled = false                      │
│    - Effect: OS-level microphone muted                      │
│    - Latency: <10ms                                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Frontend: UI updates immediately                         │
│    - setMicMuted(true)                                      │
│    - Shows: Mute button highlighted                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Frontend: updateMuteStatus(userId, true)                 │
│    - Calls: PATCH /api/users/:userId/mute                   │
│    - Body: {"isMuted": true}                                │
│    - Async (doesn't block UI)                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Backend: server.js receives request                      │
│    - Logs: JSON request log                                 │
│    - Validates: isMuted is boolean                          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Backend: database.js operations                          │
│    - getUserState(userId) → Current state                   │
│    - createOrUpdateUserState({                              │
│        userId, isMuted: true,                               │
│        deviceId: preserved,                                 │
│        deviceLabel: preserved,                              │
│        roomId: preserved                                    │
│      })                                                      │
│    - SQLite write: ~5-10ms                                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. Backend: Returns 200 OK                                  │
│    - Body: {"success": true, "data": {...}}                 │
│    - Metrics: Records response time                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. Frontend: Response received                              │
│    - Console log: "✅ Mute status updated: Muted"           │
│    - No UI change (already updated)                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. Frontend: Verification step                              │
│    - audioService.verifyMuteState()                         │
│    - Checks: Audio levels are 0%                            │
│    - Shows: Green checkmark ✅                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 10. Other users see update (polling)                        │
│     - Poll: GET /api/rooms/:roomId/users every 5s           │
│     - Backend: database.getUsersByRoom(roomId)              │
│     - Frontend: Shows "User X 🔇 Muted" in participant list │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Hardware muted FIRST (step 2) - instant
- Backend sync AFTER (step 4) - async
- UI updates immediately (step 3) - doesn't wait for backend
- Other users see update eventually (step 10) - polling lag

---

### **User Story 2: Device Switching Flow**

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User selects new device in dropdown                      │
│    - UI: <select onChange={handleMicrophoneSwitch}>         │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Frontend: audioService.switchMicrophone(deviceId)        │
│    Step 2a: Store current mute state                        │
│      - const wasMuted = audioService.isMuted()              │
│    Step 2b: Stop current stream                             │
│      - currentStream.getTracks().forEach(track.stop())      │
│    Step 2c: Request new device                              │
│      - getUserMedia({audio: {deviceId: {exact: ...}}})      │
│    Step 2d: Apply stored mute state to new device           │
│      - if (wasMuted) newTrack.enabled = false               │
│    Step 2e: Create new analyser for monitoring              │
│      - audioContext.createAnalyser()                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Frontend: UI updates                                     │
│    - setCurrentDeviceId(newDeviceId)                        │
│    - Shows: "Switched to Bluetooth Headset"                 │
│    - Mute button: Still shows 🔇 if was muted               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Frontend: Get device label                               │
│    - Find device in availableDevices array                  │
│    - const device = devices.find(d => d.deviceId === id)    │
│    - const label = device?.label || null                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Frontend: updateDevice(userId, deviceId, label)          │
│    - Calls: PATCH /api/users/:userId/device                 │
│    - Body: {"deviceId": "...", "deviceLabel": "..."}        │
│    - Async (doesn't block UI)                               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. Backend: server.js receives request                      │
│    - Validates: deviceId is present                         │
│    - Logs: JSON request log with isCriticalEndpoint: true   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. Backend: database.js operations                          │
│    - getUserState(userId) → Current state                   │
│    - createOrUpdateUserState({                              │
│        userId,                                              │
│        isMuted: preserved, ← CRITICAL: Mute state preserved │
│        deviceId: newDeviceId,                               │
│        deviceLabel: newLabel,                               │
│        roomId: preserved                                    │
│      })                                                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. Backend: Returns 200 OK                                  │
│    - Body: Complete user state with preserved mute status   │
│    - Confirms: isMuted unchanged, deviceId updated          │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. Frontend: Restart audio monitoring                       │
│    - audioService.startAudioLevelMonitoring(...)            │
│    - Shows: Audio level bars updating from new device       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│ 10. Frontend: Verification                                  │
│     - If was muted: Audio levels still 0%                   │
│     - If was unmuted: Audio levels >0% from new device      │
│     - Mute button state: Unchanged                          │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Device switched FIRST (step 2) - may take 100-500ms
- Mute state PRESERVED during switch (step 2d)
- Backend sync AFTER (step 5) - async
- Backend MUST preserve mute status (step 7)
- User experience: Seamless, mute button doesn't flicker

---

## 🎯 **Summary: Module Responsibilities**

| Module | User Story 1 (Mute) | User Story 2 (Device) |
|--------|---------------------|----------------------|
| **server.js** | `PATCH /api/users/:userId/mute`<br>Stores mute status<br>Returns state to other users | `PATCH /api/users/:userId/device`<br>Stores device selection<br>**Preserves mute status** |
| **database.js** | `createOrUpdateUserState()`<br>Persists `isMuted` field<br>Indexed queries for rooms | `createOrUpdateUserState()`<br>Persists `deviceId`, `deviceLabel`<br>**Does NOT reset mute** |
| **backendService.ts** | `updateMuteStatus()`<br>Sends mute to backend<br>Fire-and-forget | `updateDevice()`<br>Sends device to backend<br>Fire-and-forget |

---

**Last Updated:** October 22, 2025  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each sprint

