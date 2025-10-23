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

**4 modules** directly implement these user stories:

1. **`backend/server.js`** - REST API endpoints for state management
2. **`backend/database.js`** - Data persistence layer
3. **`src/services/backendService.ts`** - Frontend API client (bridge to backend)
4. **`src/services/audioService.ts`** + **`backend/server.js /verify`** - Audio State Verification (User Story 1)

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

### **1.1 Features**

#### **A. Complete State Management**
**Endpoint:** `POST /api/users/:userId/state`

**What It Does:**
- Upserts complete user record (INSERT or UPDATE via SQLite ON CONFLICT)
- Validates `isMuted` is boolean (400 error if not)
- Accepts optional: `username`, `deviceId`, `deviceLabel`, `roomId` (all nullable)
- Auto-manages `lastUpdated`, preserves `createdAt`
- Returns full state after operation (idempotent)

**What It Does NOT Do:**
- No userId format validation
- No deviceId hardware verification
- No room membership checks
- No real-time push notifications to other users

---

#### **B. Mute Status Update (User Story 1)**
**Endpoint:** `PATCH /api/users/:userId/mute`

**What It Does:**
- Partial update: modifies only `isMuted` field
- Fetches current state, preserves `deviceId`, `deviceLabel`, `roomId`, `username`
- Validates `isMuted` is boolean (400 if not)
- Creates new user if doesn't exist (nulls for other fields)

**What It Does NOT Do:**
- No OS-level mute verification
- No permission checks or room policies
- No rate limiting

---

#### **C. Device Selection Update (User Story 2)**
**Endpoint:** `PATCH /api/users/:userId/device`

**What It Does:**
- Partial update: modifies only `deviceId` and `deviceLabel` fields
- **Preserves `isMuted` state** (critical for User Story 2: device switch without disconnection)
- Fetches current state first, preserves `roomId`, `username`
- Requires `deviceId` (400 if missing), `deviceLabel` optional (nullable)

**What It Does NOT Do:**
- No deviceId hardware existence checks
- No device availability/connectivity verification
- No device capability storage (sample rate, channels, etc.)

---

#### **D. User State Retrieval**
**Endpoint:** `GET /api/users/:userId`

**What It Does:**
- Returns current state for single user (includes `username`, `isMuted`, `deviceId`, `deviceLabel`, `roomId`, timestamps)
- 404 if user not found
- Enables state recovery after reconnection/refresh

**What It Does NOT Do:**
- No online/presence status
- No historical state retrieval

---

#### **E. All Users List**
**Endpoint:** `GET /api/users`

**What It Does:**
- Returns array of all users, ordered by `lastUpdated DESC`
- Empty array `[]` if no users exist

**What It Does NOT Do:**
- No pagination
- No filtering (returns all users)

---

#### **F. Room User List**
**Endpoint:** `GET /api/rooms/:roomId/users`

**What It Does:**
- Returns array of users in specific room, ordered by `lastUpdated DESC`
- Empty array `[]` if room empty or doesn't exist
- Indexed query (fast lookup via `idx_roomId`)

**What It Does NOT Do:**
- No room existence validation
- No pagination

---

#### **G. User State Deletion**
**Endpoint:** `DELETE /api/users/:userId`

**What It Does:**
- Permanently deletes user record from database
- Returns 200 with `{success: true, deleted: true}` if user existed
- Returns 404 with `{success: false, error: "User not found"}` if user didn't exist

**What It Does NOT Do:**
- No soft delete or archiving
- No cascade deletion (rooms remain if empty)

---

#### **H. Health Check**
**Endpoint:** `GET /api/health`

**What It Does:**
- Returns database connectivity status, uptime, memory usage
- Structured JSON: `{status, timestamp, uptime, database, memory, environment}`
- Returns 503 if database unreachable

**What It Does NOT Do:**
- No external dependency checks (only database)

---

#### **I. Metrics**
**Endpoint:** `GET /api/metrics`

**What It Does:**
- Returns API performance metrics: total requests, average response time, error rate, slow requests
- Per-endpoint breakdown available

**What It Does NOT Do:**
- No historical metrics (current session only)

---

#### **J. Mute Verification Status **
**Endpoint:** `PATCH /api/users/:userId/verify`

**What It Does:**
- Updates only `verifiedMuted` field (Web Audio API verification result from frontend)
- Validates `verifiedMuted` is boolean (400 if not)
- Preserves `isMuted`, `deviceId`, `deviceLabel`, `roomId`, `username`
- Returns complete state after update

**What It Does NOT Do:**
- No automatic verification (relies on frontend reporting)

**Purpose:** 
Stores Web Audio API verification result (Method 1 of dual verification).

---

#### **K. Packet Verification Status (User Story 1 - Dual Verification Method 2)**
**Endpoint:** `GET /api/users/:userId/packet-verification`

**What It Does:**
- Returns backend packet inspection result (independent verification)
- Analyzes actual audio data received via WebSocket
- Provides RMS (Root Mean Square) audio level analysis
- Returns `packetVerifiedMuted`: true (silence detected) / false (audio detected) / null (no data)

**What It Does NOT Do:**
- Requires active WebSocket audio streaming (not automatic)
- Stale if no audio streamed in last 5 seconds

**Purpose:**
Provides **second independent verification method** by inspecting audio packets on backend. This satisfies auditor's requirement for "two separate ways to verify mute" - Web Audio API check (frontend) + packet inspection (backend).

---

### **1.2 Limitations**

**Real-Time:**
- REST-based state management (clients must poll for user state updates)
- WebSocket used only for audio streaming (packet verification), not for state push notifications

**Security:** 
- No authentication, authorization, rate limiting, or CSRF protection (demo/prototype only)

**Media:**
- State management + audio verification only—no video processing, encoding/decoding, WebRTC signaling, or media relay/transmission
- Audio processing limited to RMS energy analysis for mute verification (packet inspection)

**Business Logic:**
- No meeting scheduling, room limits, moderator privileges, force mute, recording, or kick/ban

**Validation:**
- Minimal input validation (only boolean type checks)
- No userId/deviceId/roomId format or existence verification
- Frontend responsible for validation

**Scalability:**
- SQLite: ~10 concurrent writes max, no horizontal scaling
- Single-threaded, no load balancer support
- In-memory metrics lost on restart

**Performance:** 30-100ms per request, ~100 req/s throughput (tested on t2.micro)

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

### **2.1 Features**

#### **Schema: `user_states` Table**
- Columns: 
  - `userId` (PK)
  - `username`
  - `isMuted` (INTEGER 0/1) - User's intent (button clicked)
  - **`verifiedMuted` (INTEGER 0/1/NULL)** - Hardware verification result (User Story 1)
  - `deviceId`
  - `deviceLabel`
  - `roomId`
  - `lastUpdated`
  - `createdAt`
- Indexes: `idx_roomId`, `idx_lastUpdated`, `idx_username`
- WAL mode enabled for write performance (~30% faster) and crash recovery
- `initDatabase()`: Idempotent schema creation (CREATE IF NOT EXISTS)

**Note:** `verifiedMuted` is separate from `isMuted` to track verification status. NULL means unverified, 0/1 means verified false/true.

#### **CRUD Operations**

**What It Does:**
- `getUserState(userId)`: Returns single user or null; prepared statement; INTEGER→boolean conversion
- `getAllUserStates()`: Returns all users ordered by `lastUpdated DESC`; no pagination
- `getUsersByRoom(roomId)`: Returns users in room; uses `idx_roomId` index
- `createOrUpdateUserState(data)`: Upsert via `INSERT...ON CONFLICT DO UPDATE`; auto-timestamps; boolean→INTEGER conversion; returns full state
- `deleteUserState(userId)`: Hard delete; returns boolean success
- `cleanupOldEntries(daysOld)`: Deletes entries older than N days (maintenance)

**What It Does NOT Do:**
- No input validation (caller's responsibility)
- No caching
- No audit trail/change logging
- No transactions (single statements only)
- No schema migrations or versioning

---

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
- ❌ Does NOT support concurrent writes well (SQLite single-writer + synchronous operations)
- ❌ Writes serialize (one at a time) and block Node.js event loop

**Implication:**
- Max ~10 concurrent users practical (blocking operations acceptable at this scale)
- Beyond that, consider async PostgreSQL with connection pool

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
- WAL mode: ~10 concurrent writes max (theoretical)
- Single writer at a time (SQLite lock-based)
- Reads don't block writes (WAL benefit, but limited by sync operations - see below)

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
- All operations block Node.js event loop (~5-10ms per write)
- No async/await needed (intentional design)
- Simpler code, but blocks concurrent request processing
- Acceptable at 10 users, becomes bottleneck at 100+ users

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

## Module 4: Audio State Verification (User Story 1 - Dual Verification)

### **Module Overview**

**Components:** 
- Frontend: `audioService.ts` (Web Audio API check) + `audioStreamService.ts` (WebSocket streaming)
- Backend: `server.js /verify` endpoint + `packet-verifier.js` (WebSocket server) + `/packet-verification` endpoint

**Protocol:** **Dual Independent Verification**
1. **Method 1 (Frontend):** Web Audio API `getByteFrequencyData()` → Frontend checks audio levels
2. **Method 2 (Backend):** WebSocket audio stream → Backend inspects packets for silence

**Dependencies:** Web Audio API, WebSocket (ws), Express

**Purpose:**  
Implements User Story 1's requirement to verify mute at BOTH software AND hardware levels using **two independent methods**. This satisfies the auditor's requirement for "two separate ways to verify" - frontend Web Audio API check PLUS backend packet inspection.

---

### **4.1 Features**

#### **Dual Verification Architecture**

**Method 1: Web Audio API Check (Frontend)**
```
User Clicks Mute → audioService.mute() → Wait 500ms → verifyMuteState()
                     ↓                                        ↓
                track.enabled=false                  getByteFrequencyData()
                                                             ↓
                                                    Audio level < 1% ?
                                                             ↓
                                           updateMuteVerification(true/false)
```

**Method 2: Packet Inspection (Backend)**
```
Microphone → Web Audio API → ScriptProcessorNode → WebSocket Stream
                                                           ↓
                                                    Backend receives
                                                    Float32Array samples
                                                           ↓
                                                    RMS energy calculation
                                                           ↓
                                                    Silence detected?
                                                           ↓
                                            packetVerifiedMuted: true/false
```

**Two-Field State Model:**
1. **`isMuted`** (User Intent): What button they clicked
2. **`verifiedMuted`** (Dual Verification Result): Combined result from both methods

**Why Dual Verification?**
- **Auditor requirement:** "Two separate ways to verify mute"
- **Method 1 weakness:** Frontend can be manipulated by malicious user
- **Method 2 strength:** Backend independently verifies by inspecting actual audio data
- **Combined:** If both methods agree → high confidence; if disagree → flag conflict

---

#### **Frontend Verification (audioService.ts)**

**Function:** `verifyMuteState()`

**What It Does:**
- Calls Web Audio API `getByteFrequencyData()` to read actual microphone input
- Calculates average audio level from frequency bins
- Returns `true` if audio level = 0% (hardware silent)
- Returns `false` if audio level > 0% (hardware active despite mute)

**Implementation:**
```typescript
public verifyMuteState(): boolean {
  if (!this.analyser) return false;
  
  const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
  this.analyser.getByteFrequencyData(dataArray);
  
  const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
  const normalizedLevel = average / 255;
  
  // Verified if level is below threshold (effectively silent)
  return normalizedLevel < 0.01;  // <1% = verified muted
}
```

**Timing:**
- Called 500ms after user clicks mute (allows time for hardware to respond)
- Frontend immediately sends result to backend via `updateMuteVerification()`

---

#### **Backend Verification Endpoint**

**Endpoint:** `PATCH /api/users/:userId/verify`

**Request:**
```json
{
  "verifiedMuted": true  // or false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mute verification status updated",
  "data": {
    "userId": "user-123",
    "isMuted": true,        // User clicked mute
    "verifiedMuted": true,  // Hardware confirmed silent
    ...
  }
}
```

**Database Operation:**
- Updates only `verifiedMuted` field
- Preserves all other fields (`isMuted`, `deviceId`, etc.)
- Returns complete state so other users can see verification status

---

### **4.2 Dual Verification Flow**

```
┌───────────────────────────────────────────────────────────────┐
│ 1. User clicks mute button                                    │
│    - Frontend: audioService.mute()                            │
│    - Hardware: track.enabled = false                          │
│    - Backend: updateMuteStatus(userId, true) → isMuted=true   │
└────────────────┬──────────────────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
┌──────────────┐  ┌──────────────────────────────────────────┐
│ Method 1:    │  │ Method 2:                                │
│ Web Audio    │  │ Packet Inspection                        │
│ API Check    │  │                                          │
└──────┬───────┘  └──────┬───────────────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────────────────────────────────┐
│ 2a. Wait     │  │ 2b. audioStreamService.startStreaming()  │
│ 500ms        │  │     - Continuously sends audio samples   │
└──────┬───────┘  │       via WebSocket                      │
       │          └──────┬───────────────────────────────────┘
       ▼                 │
┌──────────────┐         │
│ 3a. Verify   │         │
│ audioService │         │
│ .verifyMute  │         │
│ State()      │         │
│ - Check freq │         │
│   data       │         │
│ - Level <1%? │         │
└──────┬───────┘         │
       │                 ▼
       │          ┌──────────────────────────────────────────┐
       │          │ 3b. Backend: packet-verifier.js          │
       │          │     - Receives Float32Array samples      │
       │          │     - Calculates RMS energy              │
       │          │     - Detects silence (threshold <1%)   │
       │          │     - Returns packetVerifiedMuted        │
       │          └──────┬───────────────────────────────────┘
       │                 │
       ▼                 ▼
┌──────────────┐  ┌──────────────────────────────────────────┐
│ 4a. Update   │  │ 4b. Backend stores packet result         │
│ PATCH /verify│  │     - Available via GET                  │
│ verifiedMuted│  │       /packet-verification               │
└──────┬───────┘  └──────┬───────────────────────────────────┘
       │                 │
       └────────┬────────┘
                ▼
┌───────────────────────────────────────────────────────────────┐
│ 5. Frontend combines both results                             │
│    - Method 1 (Web Audio API): true/false                     │
│    - Method 2 (Packet Inspection): true/false/null            │
│                                                                │
│    Decision Matrix:                                            │
│    Both true    → ✓✓ Verified (high confidence)              │
│    Both false   → ✗✗ Conflict (audio detected by both)       │
│    One true, one false → ⚠️  Warning (mismatch detected)     │
│    Packet null  → ⚠️  Partial (only Web Audio verified)      │
└───────────────────────────────────────────────────────────────┘
```

---

### **4.3 Limitations**

**WebSocket Dependency (Method 2):**
- Packet verification requires active WebSocket connection
- Network interruption stops packet inspection (falls back to Method 1 only)
- Additional bandwidth: ~176 KB/s per user (44.1kHz × 4 bytes)

**Verification Timing:**
- Method 1: 500ms delay after mute (hardware settle time)
- Method 2: Real-time continuous (updates every ~100ms)
- Brief window where Method 1 = null, Method 2 = active

**Not Truly "OS-Level":**
- Both methods use browser APIs (Web Audio API + WebSocket)
- True OS-level verification would require native agent (out of scope for web app)
- However, packet inspection provides backend-side verification independent of frontend

**No Continuous Monitoring (Method 1):**
- Web Audio API check happens once after mute click
- If hardware unmuted externally (physical button), Method 1 not updated
- Method 2 (packet inspection) detects this immediately via continuous streaming

---

## 🎯 **Summary: Module Responsibilities**

| Module | User Story 1 (Mute) | User Story 1 (Verification Method 1) | User Story 1 (Verification Method 2) | User Story 2 (Device) |
|--------|---------------------|--------------------------------------|-------------------------------------|----------------------|
| **server.js** | `PATCH /api/users/:userId/mute`<br>Stores mute intent (`isMuted`) | `PATCH /api/users/:userId/verify`<br>Stores Web Audio API result | WebSocket `/audio-stream`<br>`GET /packet-verification`<br>Packet inspection | `PATCH /api/users/:userId/device`<br>Stores device selection<br>**Preserves mute status** |
| **database.js** | `createOrUpdateUserState()`<br>Persists `isMuted` field | `createOrUpdateUserState()`<br>Persists `verifiedMuted` field | `createOrUpdateUserState()`<br>Persists `packetVerifiedMuted` + `packetVerifiedAt` fields | `createOrUpdateUserState()`<br>Persists `deviceId`, `deviceLabel`<br>**Does NOT reset mute** |
| **backendService.ts** | `updateMuteStatus()`<br>Sends mute intent | `updateMuteVerification()`<br>Sends Web Audio API result | (Uses audioStreamService) | `updateDevice()`<br>Sends device to backend |
| **audioService.ts** | `mute()`, `unmute()`<br>Controls hardware | `verifyMuteState()`<br>Web Audio API check | (N/A) | `switchMicrophone()`<br>Changes input device |
| **audioStreamService.ts** | (N/A) | (N/A) | `startStreaming()`<br>Sends audio samples via WebSocket<br>`onVerification()` callback | (N/A) |
| **packet-verifier.js** | (N/A) | (N/A) | `processAudioSamples()`<br>RMS energy analysis<br>Silence detection | (N/A) |

---

**Last Updated:** October 23, 2025  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each sprint

