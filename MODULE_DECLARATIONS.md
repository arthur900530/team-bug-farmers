# Module Declarations

**Purpose:** Comprehensive list of all class, method, and field declarations with visibility classification.  
**Task:** Requirement 6 - "Provide a list of all class, method, and field declarations. Identify which are externally visible and which are private to the module."  
**Audience:** Developers, Architects, Code Reviewers  
**Version:** 1.3.0 (Dual Verification Support)  

---

## 📋 **Overview**

This document catalogs all declarations across backend and frontend modules, categorizing them by visibility:

**Visibility Markers:**
- 🌐 **Externally Visible:** Exported (`export` keyword) - Part of the public API
- 🔒 **Private/Internal:** Not exported - Implementation details

**Module Count:**
- **Backend Modules:** 4 core modules (server, database, packet-verifier, metrics) + 1 skeleton (aws-config)
- **Frontend Modules:** 3 service modules (backendService, audioService, audioStreamService)

---

## 1. Backend Modules

### **1.1 Module: `backend/server.js`**

**Purpose:** Express.js HTTP server with REST API endpoints and WebSocket initialization  
**Architecture:** Functional module (no classes, route-based)  
**Cross-Reference:** [`API_SPECIFICATION.md`](API_SPECIFICATION.md) for API contracts

---

#### **1.1.1 Imported External Dependencies**

```javascript
🔒 express (from 'express')
🔒 cors (from 'cors')
🔒 dotenv (from 'dotenv')
🔒 Database (from 'better-sqlite3')
```

#### **1.1.2 Imported Internal Dependencies**

```javascript
🔒 initDatabase (from './database.js')
🔒 getUserState (from './database.js')
🔒 createOrUpdateUserState (from './database.js')
🔒 getAllUserStates (from './database.js')
🔒 deleteUserState (from './database.js')
🔒 metricsMiddleware (from './metrics.js')
🔒 getMetricsHandler (from './metrics.js')
🔒 initializePacketVerifier (from './packet-verifier.js')
```

---

#### **1.1.3 Module-Level Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `__filename` | `string` | 🔒 Private | Current module file path |
| `__dirname` | `string` | 🔒 Private | Current module directory path |
| `db` | `Database` | 🔒 Private | SQLite database instance |
| `app` | `Express` | 🔒 Private | Express application instance |
| `PORT` | `number` | 🔒 Private | Server port (from env or 3001) |
| `server` | `http.Server` | 🔒 Private | HTTP server instance |
| `packetVerifier` | `object` | 🔒 Private | WebSocket packet verifier instance |

**Note:** No fields are exported from this module (server is started but not exported).

---

#### **1.1.4 Functions (None Exported)**

**All functions are route handlers (private to Express app):**

| Function/Handler | HTTP Method | Route | Purpose | Visibility |
|------------------|-------------|-------|---------|------------|
| Health check handler | GET | `/api/health` | Server health status | 🔒 Private (route) |
| Metrics handler | GET | `/api/metrics` | Performance metrics | 🔒 Private (route) |
| Get all users handler | GET | `/api/users` | Retrieve all users | 🔒 Private (route) |
| Get user handler | GET | `/api/users/:userId` | Retrieve specific user | 🔒 Private (route) |
| Create/update user handler | POST | `/api/users/:userId/state` | Upsert user state | 🔒 Private (route) |
| Update mute handler | PATCH | `/api/users/:userId/mute` | Update mute only | 🔒 Private (route) |
| Update device handler | PATCH | `/api/users/:userId/device` | Update device only | 🔒 Private (route) |
| Update verification handler | PATCH | `/api/users/:userId/verify` | Update Web Audio verification | 🔒 Private (route) |
| Get packet verification handler | GET | `/api/users/:userId/packet-verification` | Get packet verification | 🔒 Private (route) |
| Delete user handler | DELETE | `/api/users/:userId` | Delete user state | 🔒 Private (route) |
| Get room users handler | GET | `/api/rooms/:roomId/users` | Get users in room | 🔒 Private (route) |

**Logging Middleware:**
```javascript
🔒 Request logging middleware (req, res, next) => void
   - Purpose: Structured JSON logging for all requests
   - Attaches: req.requestId
   - Logs: timestamp, method, path, statusCode, duration, userId
```

**Graceful Shutdown Handler:**
```javascript
🔒 SIGTERM handler () => void
   - Purpose: Clean database shutdown on server termination
   - Actions: Close database connection, exit process
```

**Note:** While route handlers are private, the **HTTP API endpoints are public** and documented in [`API_SPECIFICATION.md`](API_SPECIFICATION.md).

---

### **1.2 Module: `backend/database.js`**

**Purpose:** Data Access Object (DAO) for SQLite database operations  
**Architecture:** Functional module with exported CRUD functions  
**Cross-Reference:** [`STABLE_STORAGE_SPECIFICATION.md`](STABLE_STORAGE_SPECIFICATION.md) for schema details

---

#### **1.2.1 Imported External Dependencies**

```javascript
🔒 Database (from 'better-sqlite3')
```

---

#### **1.2.2 Module-Level Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `__filename` | `string` | 🔒 Private | Current module file path |
| `__dirname` | `string` | 🔒 Private | Current module directory path |
| `db` | `Database` | 🔒 Private | SQLite database connection instance |

**Database Configuration:**
```javascript
🔒 db.pragma('journal_mode = WAL')
   - Purpose: Enable Write-Ahead Logging mode
   - Benefits: Better write performance, crash recovery
```

---

#### **1.2.3 Exported Functions (Public API)**

##### **1. `initDatabase()`**

```javascript
🌐 export function initDatabase(): void
```

**Purpose:** Initialize database schema and indexes  
**Parameters:** None  
**Returns:** `void`  
**Side Effects:**
- Creates `user_states` table if not exists
- Creates indexes on `roomId`, `lastUpdated`, `username`
- Adds new columns for backward compatibility (username, verifiedMuted, packetVerifiedMuted, packetVerifiedAt)

**Schema Created:**
- Table: `user_states`
- Columns: 11 fields (userId, username, isMuted, verifiedMuted, packetVerifiedMuted, packetVerifiedAt, deviceId, deviceLabel, roomId, lastUpdated, createdAt)
- Indexes: 3 (idx_roomId, idx_lastUpdated, idx_username)

**Implementation Reference:** [`backend/database.js:17-72`](backend/database.js)

---

##### **2. `getUserState(userId)`**

```javascript
🌐 export function getUserState(userId: string): UserState | null
```

**Purpose:** Retrieve a single user's state by userId  
**Parameters:**
- `userId` (string, required): User identifier

**Returns:**
- `UserState` object if found
- `null` if user not found

**Return Type:**
```typescript
{
  userId: string;
  username: string;
  isMuted: boolean;
  verifiedMuted: boolean | null;
  packetVerifiedMuted: boolean | null;
  packetVerifiedAt: string | null;
  deviceId: string | null;
  deviceLabel: string | null;
  roomId: string | null;
  lastUpdated: string;
  createdAt: string;
}
```

**Implementation Reference:** [`backend/database.js:77-111`](backend/database.js)

---

##### **3. `getAllUserStates()`**

```javascript
🌐 export function getAllUserStates(): UserState[]
```

**Purpose:** Retrieve all user states, ordered by last update (most recent first)  
**Parameters:** None  
**Returns:** Array of `UserState` objects (may be empty)  
**Ordering:** `ORDER BY lastUpdated DESC`

**Implementation Reference:** [`backend/database.js:117-149`](backend/database.js)

---

##### **4. `createOrUpdateUserState(options)`**

```javascript
🌐 export function createOrUpdateUserState({
  userId: string,
  username: string,
  isMuted: boolean,
  verifiedMuted: boolean | null,
  packetVerifiedMuted: boolean | null,
  packetVerifiedAt: string | null,
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null
}): UserState
```

**Purpose:** Insert new user or update existing user (upsert operation)  
**Parameters:** Object with user state fields  
**Returns:** Updated `UserState` object  
**SQL Pattern:** `INSERT...ON CONFLICT DO UPDATE`  
**Atomicity:** Single transaction, all-or-nothing

**Special Behavior:**
- Timestamps: `createdAt` set only on insert, `lastUpdated` always updated
- Null handling: Only updates fields if new value is not null (preserves existing values)
- Boolean conversion: JavaScript boolean → SQLite INTEGER (0/1)

**Implementation Reference:** [`backend/database.js:155-189`](backend/database.js)

---

##### **5. `deleteUserState(userId)`**

```javascript
🌐 export function deleteUserState(userId: string): boolean
```

**Purpose:** Permanently delete a user's state from database  
**Parameters:**
- `userId` (string, required): User identifier

**Returns:**
- `true` if user was deleted
- `false` if user not found

**Warning:** Irreversible operation (no soft delete)

**Implementation Reference:** [`backend/database.js:195-198`](backend/database.js)

---

##### **6. `getUsersByRoom(roomId)`**

```javascript
🌐 export function getUsersByRoom(roomId: string): UserState[]
```

**Purpose:** Retrieve all users in a specific meeting room  
**Parameters:**
- `roomId` (string, required): Room identifier

**Returns:** Array of `UserState` objects (may be empty)  
**Ordering:** `ORDER BY lastUpdated DESC`  
**Index Used:** `idx_roomId` (optimized query)

**Implementation Reference:** [`backend/database.js:204-237`](backend/database.js)

---

##### **7. `cleanupOldEntries(daysOld)`**

```javascript
🌐 export function cleanupOldEntries(daysOld: number = 30): number
```

**Purpose:** Delete stale user states (maintenance function)  
**Parameters:**
- `daysOld` (number, optional, default: 30): Age threshold in days

**Returns:** Number of entries deleted  
**Use Case:** Periodic cleanup of abandoned user states

**Implementation Reference:** [`backend/database.js:243-252`](backend/database.js)

---

#### **1.2.4 Private Functions**

**None** - All database operations are exposed as public API functions.

---

### **1.3 Module: `backend/packet-verifier.js`**

**Purpose:** WebSocket server for audio packet streaming and silence detection  
**Architecture:** Class-based with single exported initialization function  
**Cross-Reference:** [`BACKEND_INTERNAL_ARCHITECTURE.md:1105-1280`](BACKEND_INTERNAL_ARCHITECTURE.md) for dual verification architecture

---

#### **1.3.1 Imported External Dependencies**

```javascript
🔒 WebSocketServer (from 'ws')
```

#### **1.3.2 Imported Internal Dependencies**

```javascript
🔒 createOrUpdateUserState (from './database.js')
🔒 getUserState (from './database.js')
```

---

#### **1.3.3 Module-Level Constants**

| Constant | Type | Value | Visibility | Description |
|----------|------|-------|------------|-------------|
| `SILENCE_THRESHOLD` | `number` | `0.01` | 🔒 Private | RMS level below 1% = silence |
| `VERIFICATION_WINDOW_MS` | `number` | `1000` | 🔒 Private | Analyze 1 second of audio data |

---

#### **1.3.4 Class: `AudioPacketVerifier`**

**Visibility:** 🔒 **Private** (not exported, only used internally)  
**Purpose:** Manages per-user audio stream analysis and silence detection

---

##### **Constructor**

```javascript
🔒 constructor()
```

**Purpose:** Initialize audio packet verifier  
**Fields Initialized:**
- `userAudioBuffers` (Map<userId, buffer data>)
- No verification cache (results stored in database)

**Side Effects:** Logs initialization message

---

##### **Method: `processAudioSamples(userId, audioData)`**

```javascript
🔒 processAudioSamples(userId: string, audioData: Float32Array): boolean
```

**Visibility:** 🔒 Private (class method)  
**Purpose:** Process incoming audio samples, detect silence, persist to database

**Parameters:**
- `userId` (string): User identifier
- `audioData` (Float32Array): Raw audio samples (~4096 samples per buffer)

**Returns:** `boolean` - `true` if silent, `false` if audio detected

**Algorithm:**
1. Store audio samples in in-memory ring buffer (last 1 second)
2. Calculate RMS energy across all buffered samples
3. Compare RMS to `SILENCE_THRESHOLD` (0.01)
4. Persist result to database (`packetVerifiedMuted`, `packetVerifiedAt`)
5. Log verification result

**Implementation Reference:** [`backend/packet-verifier.js:38-85`](backend/packet-verifier.js)

---

##### **Method: `analyzeForSilence(sampleArrays)`**

```javascript
🔒 analyzeForSilence(sampleArrays: Float32Array[]): boolean
```

**Visibility:** 🔒 Private (class method)  
**Purpose:** Calculate RMS energy and determine if audio is silent

**Parameters:**
- `sampleArrays` (Float32Array[]): Array of audio sample buffers

**Returns:** `boolean` - `true` if RMS < threshold

**Algorithm:**
```javascript
RMS = sqrt(sum(sample^2) / count)
isSilent = RMS < 0.01
```

**Implementation Reference:** [`backend/packet-verifier.js:87-117`](backend/packet-verifier.js)

---

##### **Method: `getVerificationResult(userId)`**

```javascript
🔒 getVerificationResult(userId: string): {
  packetVerifiedMuted: boolean | null,
  packetVerifiedAt: string | null
} | null
```

**Visibility:** 🔒 Private (class method)  
**Purpose:** Retrieve verification result from database (not cached in memory)

**Parameters:**
- `userId` (string): User identifier

**Returns:**
- Object with verification data if user found and data is fresh (< 5 seconds old)
- `null` if user not found or data is stale

**Implementation Reference:** [`backend/packet-verifier.js:124-148`](backend/packet-verifier.js)

---

##### **Method: `cleanup()`**

```javascript
🔒 cleanup(): void
```

**Visibility:** 🔒 Private (class method)  
**Purpose:** Remove inactive user audio buffers (memory leak prevention)

**Parameters:** None  
**Behavior:**
- Removes audio buffers for users inactive > 30 seconds
- Verification results remain in database (not cleaned up)

**Periodicity:** Called automatically by WebSocket server

**Implementation Reference:** [`backend/packet-verifier.js:155-168`](backend/packet-verifier.js)

---

##### **Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `userAudioBuffers` | `Map<userId, {samples: Float32Array[], lastUpdate: number}>` | 🔒 Private | In-memory audio buffer per user (transient) |

**Note:** Verification cache removed in v1.3.0 - results now persisted to SQLite.

---

#### **1.3.5 Exported Function**

##### **`initializePacketVerifier(httpServer)`**

```javascript
🌐 export function initializePacketVerifier(
  httpServer: http.Server
): {
  getPacketVerificationStatus: (userId: string) => object
}
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Initialize WebSocket server for audio streaming

**Parameters:**
- `httpServer` (http.Server): Express HTTP server to attach WebSocket

**Returns:** Object with methods:
- `getPacketVerificationStatus(userId)`: Get verification status for user

**Side Effects:**
- Creates WebSocket server on `/audio-stream` path
- Instantiates `AudioPacketVerifier`
- Sets up connection, message, and close event handlers
- Starts periodic cleanup (every 60 seconds)

**WebSocket Events Handled:**
- `connection`: New client connects
- `message`: Receive audio data (binary) or control messages (text)
- `close`: Client disconnects
- `error`: Connection error

**Implementation Reference:** [`backend/packet-verifier.js:176-226`](backend/packet-verifier.js)

**Cross-Reference:** See [`API_SPECIFICATION.md:994-1280`](API_SPECIFICATION.md) for WebSocket API specification.

---

### **1.4 Module: `backend/metrics.js`**

**Purpose:** Performance metrics collection and exposure  
**Architecture:** Singleton metrics collector with exported middleware and handler

---

#### **1.4.1 Module-Level Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `startTime` | `number` | 🔒 Private | Server start timestamp (Date.now()) |
| `metrics` | `object` | 🔒 Private | Metrics data structure |

**Metrics Data Structure:**
```javascript
🔒 {
  totalRequests: number,
  successfulRequests: number,
  failedRequests: number,
  totalDuration: number,
  endpoints: Map<path, {count, totalDuration}>
}
```

---

#### **1.4.2 Private Functions**

##### **`calculateStats()`**

```javascript
🔒 function calculateStats(): object
```

**Visibility:** 🔒 Private  
**Purpose:** Calculate derived metrics (averages, error rates)  
**Returns:** Summary object with computed statistics

---

#### **1.4.3 Exported Functions (Public API)**

##### **1. `metricsMiddleware(req, res, next)`**

```javascript
🌐 export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Express middleware to collect request metrics

**Parameters:**
- `req` (Request): Express request object
- `res` (Response): Express response object
- `next` (NextFunction): Next middleware function

**Returns:** `void`

**Behavior:**
- Captures request start time
- Listens for response `finish` event
- Records: duration, status code, endpoint path
- Updates metrics counters

**Usage:**
```javascript
app.use(metricsMiddleware);
```

**Implementation Reference:** [`backend/metrics.js:309-352`](backend/metrics.js)

---

##### **2. `getMetricsHandler(req, res)`**

```javascript
🌐 export function getMetricsHandler(
  req: Request,
  res: Response
): void
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Express route handler to expose metrics via HTTP

**Parameters:**
- `req` (Request): Express request object
- `res` (Response): Express response object

**Returns:** `void` (sends JSON response)

**Response Format:**
```json
{
  "uptime": number,
  "totalRequests": number,
  "successfulRequests": number,
  "failedRequests": number,
  "averageResponseTime": number,
  "errorRate": number,
  "endpoints": {
    "[path]": {
      "count": number,
      "avgDuration": number
    }
  },
  "lastReset": string
}
```

**Usage:**
```javascript
app.get('/api/metrics', getMetricsHandler);
```

**Implementation Reference:** [`backend/metrics.js:355-366`](backend/metrics.js)

---

##### **3. `sendMetricsToCloudWatch()`**

```javascript
🌐 export async function sendMetricsToCloudWatch(): Promise<void>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Send metrics to AWS CloudWatch (skeleton implementation)

**Parameters:** None  
**Returns:** `Promise<void>`

**Current Status:** 🏗️ Skeleton - Logs to console, does not actually send to AWS

**Implementation Reference:** [`backend/metrics.js:369-377`](backend/metrics.js)

---

### **1.5 Module: `backend/aws-config.js`**

**Purpose:** AWS deployment configuration (skeleton for future use)  
**Architecture:** Configuration object and mock deployment functions  
**Status:** 🏗️ **Skeleton** - Not used in demo environment

---

#### **1.5.1 Exported Constants**

##### **`AWS_CONFIG`**

```javascript
🌐 export const AWS_CONFIG = {
  region: string,
  services: {
    compute: object,
    database: object,
    storage: object,
    networking: object
  },
  deployment: object,
  monitoring: object
}
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Centralized AWS configuration  
**Current Status:** Mock configuration for documentation purposes

**Implementation Reference:** [`backend/aws-config.js:24-188`](backend/aws-config.js)

---

#### **1.5.2 Exported Functions (All Mock)**

All functions are **skeleton implementations** that log to console:

| Function | Signature | Purpose | Status |
|----------|-----------|---------|--------|
| `initializeAWSInfrastructure()` | `async () => Promise<void>` | Setup AWS resources | 🏗️ Mock |
| `deployToAWS(version)` | `async (version: string) => Promise<void>` | Deploy application | 🏗️ Mock |
| `getMetrics()` | `async () => Promise<object>` | Fetch CloudWatch metrics | 🏗️ Mock |
| `checkInstanceHealth()` | `async () => Promise<object>` | Check EC2 health | 🏗️ Mock |

**Visibility:** 🌐 All exported but not used in current implementation

**Implementation Reference:** [`backend/aws-config.js:192-251`](backend/aws-config.js)

---

## 2. Frontend Modules

### **2.1 Module: `src/services/backendService.ts`**

**Purpose:** REST API client for backend communication  
**Architecture:** Functional module with exported async functions  
**Cross-Reference:** [`API_SPECIFICATION.md`](API_SPECIFICATION.md) for API contracts

---

#### **2.1.1 Module-Level Constants**

| Constant | Type | Value | Visibility | Description |
|----------|------|-------|------------|-------------|
| `API_BASE_URL` | `string` | `import.meta.env.VITE_API_URL \|\| 'http://localhost:3001/api'` | 🔒 Private | Base URL for API requests |

---

#### **2.1.2 Interfaces (Type Definitions)**

##### **`UserState`**

```typescript
🔒 interface UserState {
  userId: string;
  username: string;
  isMuted: boolean;
  verifiedMuted: boolean | null;
  deviceId: string | null;
  deviceLabel: string | null;
  roomId: string | null;
  lastUpdated?: string;
  createdAt?: string;
}
```

**Visibility:** 🔒 Private (not exported, used internally)  
**Purpose:** Type definition for user state objects returned from backend

**Note:** Missing `packetVerifiedMuted` and `packetVerifiedAt` fields - needs update to match v1.3.0 schema.

---

##### **`ApiResponse<T>`**

```typescript
🔒 interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**Visibility:** 🔒 Private (not exported)  
**Purpose:** Type definition for backend API response format

---

#### **2.1.3 Exported Functions (Public API)**

##### **1. `updateUserState(...)`**

```typescript
🌐 export async function updateUserState(
  userId: string,
  username: string,
  isMuted: boolean,
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null = 'default-room'
): Promise<UserState | null>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Create or update complete user state  
**HTTP:** `POST /api/users/${userId}/state`  
**Returns:** `UserState` object or `null` on error (graceful degradation)

**Implementation Reference:** [`src/services/backendService.ts:30-66`](src/services/backendService.ts)

---

##### **2. `updateMuteStatus(userId, isMuted)`**

```typescript
🌐 export async function updateMuteStatus(
  userId: string,
  isMuted: boolean
): Promise<UserState | null>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Update only mute status  
**HTTP:** `PATCH /api/users/${userId}/mute`  
**Returns:** `UserState` object or `null` on error

**Implementation Reference:** [`src/services/backendService.ts:71-98`](src/services/backendService.ts)

---

##### **3. `updateDevice(userId, deviceId, deviceLabel)`**

```typescript
🌐 export async function updateDevice(
  userId: string,
  deviceId: string,
  deviceLabel: string
): Promise<UserState | null>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Update only device selection  
**HTTP:** `PATCH /api/users/${userId}/device`  
**Returns:** `UserState` object or `null` on error

**Implementation Reference:** [`src/services/backendService.ts:102-133`](src/services/backendService.ts)

---

##### **4. `updateMuteVerification(userId, verifiedMuted)`**

```typescript
🌐 export async function updateMuteVerification(
  userId: string,
  verifiedMuted: boolean
): Promise<UserState | null>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Report Web Audio API verification result to backend  
**HTTP:** `PATCH /api/users/${userId}/verify`  
**Returns:** `UserState` object or `null` on error

**Implementation Reference:** [`src/services/backendService.ts:137-165`](src/services/backendService.ts)

---

##### **5. `getUserState(userId)`**

```typescript
🌐 export async function getUserState(
  userId: string
): Promise<UserState | null>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Fetch specific user's current state  
**HTTP:** `GET /api/users/${userId}`  
**Returns:** `UserState` object or `null` on error

**Implementation Reference:** [`src/services/backendService.ts:168-184`](src/services/backendService.ts)

---

##### **6. `getRoomUsers(roomId)`**

```typescript
🌐 export async function getRoomUsers(
  roomId: string
): Promise<UserState[]>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Fetch all users in a room  
**HTTP:** `GET /api/rooms/${roomId}/users`  
**Returns:** Array of `UserState` objects (empty array on error)

**Implementation Reference:** [`src/services/backendService.ts:187-203`](src/services/backendService.ts)

---

##### **7. `deleteUserState(userId)`**

```typescript
🌐 export async function deleteUserState(
  userId: string
): Promise<boolean>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Delete user state from backend  
**HTTP:** `DELETE /api/users/${userId}`  
**Returns:** `true` if successful, `false` on error

**Implementation Reference:** [`src/services/backendService.ts:206-220`](src/services/backendService.ts)

---

##### **8. `checkBackendHealth()`**

```typescript
🌐 export async function checkBackendHealth(): Promise<boolean>
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Purpose:** Check if backend server is healthy  
**HTTP:** `GET /api/health`  
**Returns:** `true` if backend is healthy, `false` otherwise

**Implementation Reference:** [`src/services/backendService.ts:223-235`](src/services/backendService.ts)

---

#### **2.1.4 Private Functions**

**None** - All HTTP client functions are exported for use by UI components.

---

### **2.2 Module: `src/services/audioService.ts`**

**Purpose:** Web Audio API wrapper for microphone control and verification  
**Architecture:** Singleton class pattern (single exported instance)

---

#### **2.2.1 Class: `AudioService`**

**Visibility:** 🔒 Private class, 🌐 Exported singleton instance  
**Purpose:** Manage microphone access, mute/unmute, device switching, and audio verification

---

##### **Constructor**

```typescript
🔒 constructor()
```

**Visibility:** 🔒 Private (called once for singleton)  
**Purpose:** Initialize audio service  
**Fields Initialized:** All set to `null` or `false`

---

##### **Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `audioContext` | `AudioContext \| null` | 🔒 Private | Web Audio API context |
| `mediaStream` | `MediaStream \| null` | 🔒 Private | Microphone media stream |
| `analyser` | `AnalyserNode \| null` | 🔒 Private | Audio analysis node |
| `microphone` | `MediaStreamAudioSourceNode \| null` | 🔒 Private | Audio source node |
| `isMuted` | `boolean` | 🔒 Private | Local mute state |
| `audioLevelCheckInterval` | `number \| null` | 🔒 Private | Interval ID for audio level monitoring |
| `currentDeviceId` | `string \| null` | 🔒 Private | Currently selected device ID |

---

##### **Method: `initialize(deviceId?)`**

```typescript
🌐 public async initialize(deviceId?: string): Promise<boolean>
```

**Visibility:** 🌐 Public (part of singleton API)  
**Purpose:** Initialize microphone access and Web Audio API

**Parameters:**
- `deviceId` (string, optional): Specific device to use

**Returns:** `Promise<boolean>` - `true` if successful, `false` on error

**Side Effects:**
- Requests microphone permission
- Creates AudioContext
- Creates AnalyserNode (for verification)
- Starts audio level monitoring

**Implementation Reference:** [`src/services/audioService.ts:19-62`](src/services/audioService.ts)

---

##### **Method: `mute()`**

```typescript
🌐 public mute(): boolean
```

**Visibility:** 🌐 Public  
**Purpose:** Mute microphone (disable audio track)

**Returns:** `boolean` - `true` if successful, `false` if no stream

**Side Effects:**
- Sets `track.enabled = false`
- Updates local `isMuted` state

**Implementation Reference:** [`src/services/audioService.ts:67-78`](src/services/audioService.ts)

---

##### **Method: `unmute()`**

```typescript
🌐 public unmute(): boolean
```

**Visibility:** 🌐 Public  
**Purpose:** Unmute microphone (enable audio track)

**Returns:** `boolean` - `true` if successful, `false` if no stream

**Side Effects:**
- Sets `track.enabled = true`
- Updates local `isMuted` state

**Implementation Reference:** [`src/services/audioService.ts:83-94`](src/services/audioService.ts)

---

##### **Method: `verifyMuteState()`**

```typescript
🌐 public verifyMuteState(): boolean
```

**Visibility:** 🌐 Public  
**Purpose:** Verify mute status via Web Audio API (Method 1 of dual verification)

**Returns:** `boolean`
- `true` if audio level is 0% (hardware confirmed silent)
- `false` if audio detected or verification failed

**Algorithm:**
1. Get frequency data from `AnalyserNode`
2. Calculate average audio level across frequency bins
3. Normalize to 0-1 range
4. Return `true` if level < 0.01 (1%)

**Implementation Reference:** [`src/services/audioService.ts:99-116`](src/services/audioService.ts)

**Cross-Reference:** See [`API_SPECIFICATION.md:673-778`](API_SPECIFICATION.md) for verification flow.

---

##### **Method: `getAudioLevel()`**

```typescript
🌐 public getAudioLevel(): number
```

**Visibility:** 🌐 Public  
**Purpose:** Get current audio level (0-100)

**Returns:** `number` - Audio level percentage (0-100)

**Use Case:** Visual audio level indicator in UI

**Implementation Reference:** [`src/services/audioService.ts:121-137`](src/services/audioService.ts)

---

##### **Method: `switchMicrophone(newStream)`**

```typescript
🌐 public async switchMicrophone(newStream: MediaStream): Promise<boolean>
```

**Visibility:** 🌐 Public  
**Purpose:** Switch to a different microphone device

**Parameters:**
- `newStream` (MediaStream): New media stream from different device

**Returns:** `Promise<boolean>` - `true` if successful

**Behavior:**
- Disconnects old audio nodes
- Connects new stream to audio nodes
- Preserves mute state
- Updates analyser

**Implementation Reference:** [`src/services/audioService.ts:142-180`](src/services/audioService.ts)

---

##### **Method: `getAudioDevices()`**

```typescript
🌐 public async getAudioDevices(): Promise<MediaDeviceInfo[]>
```

**Visibility:** 🌐 Public  
**Purpose:** List available audio input devices

**Returns:** `Promise<MediaDeviceInfo[]>` - Array of audio input devices

**Implementation Reference:** [`src/services/audioService.ts:185-196`](src/services/audioService.ts)

---

##### **Method: `getCurrentDeviceId()`**

```typescript
🌐 public getCurrentDeviceId(): string | null
```

**Visibility:** 🌐 Public  
**Purpose:** Get currently selected device ID

**Returns:** `string | null` - Device ID or null if not set

**Implementation Reference:** [`src/services/audioService.ts:201-203`](src/services/audioService.ts)

---

##### **Method: `cleanup()`**

```typescript
🌐 public cleanup(): void
```

**Visibility:** 🌐 Public  
**Purpose:** Clean up resources (stop streams, close context)

**Side Effects:**
- Stops all media tracks
- Closes AudioContext
- Clears intervals
- Resets all fields to null

**Use Case:** Called when component unmounts

**Implementation Reference:** [`src/services/audioService.ts:208-233`](src/services/audioService.ts)

---

##### **Private Methods**

###### **`startAudioLevelMonitoring()`**

```typescript
🔒 private startAudioLevelMonitoring(): void
```

**Visibility:** 🔒 Private  
**Purpose:** Start interval to continuously monitor audio levels

**Behavior:**
- Calls `getAudioLevel()` every 100ms
- Used for UI audio level visualization

**Implementation Reference:** [`src/services/audioService.ts:238-248`](src/services/audioService.ts)

---

###### **`stopAudioLevelMonitoring()`**

```typescript
🔒 private stopAudioLevelMonitoring(): void
```

**Visibility:** 🔒 Private  
**Purpose:** Stop audio level monitoring interval

**Implementation Reference:** [`src/services/audioService.ts:253-258`](src/services/audioService.ts)

---

#### **2.2.2 Exported Singleton Instance**

```typescript
🌐 export const audioService = new AudioService();
```

**Visibility:** 🌐 **Externally Visible** (exported)  
**Type:** `AudioService` instance  
**Usage:** Import and use directly (singleton pattern)

```typescript
import { audioService } from './services/audioService';
await audioService.initialize();
audioService.mute();
```

**Implementation Reference:** [`src/services/audioService.ts:280`](src/services/audioService.ts)

---

### **2.3 Module: `src/services/audioStreamService.ts`**

**Purpose:** WebSocket client for streaming audio samples to backend  
**Architecture:** Singleton class pattern (single exported instance)  
**Cross-Reference:** [`API_SPECIFICATION.md:994-1280`](API_SPECIFICATION.md) for WebSocket protocol

---

#### **2.3.1 Module-Level Constants**

| Constant | Type | Value | Visibility | Description |
|----------|------|-------|------------|-------------|
| `WS_URL` | `string` | `import.meta.env.VITE_WS_URL \|\| 'ws://localhost:3001/audio-stream'` | 🔒 Private | WebSocket server URL |

---

#### **2.3.2 Interfaces (Type Definitions)**

##### **`VerificationResult`**

```typescript
🔒 interface VerificationResult {
  type: 'verification_result';
  userId: string;
  isVerifiedMuted: boolean;
  timestamp: number;
}
```

**Visibility:** 🔒 Private  
**Purpose:** Type definition for verification messages from backend

---

#### **2.3.3 Class: `AudioStreamService`**

**Visibility:** 🔒 Private class, 🌐 Exported singleton instance  
**Purpose:** Manage WebSocket connection and audio sample streaming

---

##### **Constructor**

```typescript
🔒 constructor()
```

**Visibility:** 🔒 Private (called once for singleton)  
**Purpose:** Initialize audio stream service  
**Fields Initialized:** All set to `null` or `false`

---

##### **Fields**

| Field | Type | Visibility | Description |
|-------|------|------------|-------------|
| `ws` | `WebSocket \| null` | 🔒 Private | WebSocket connection |
| `userId` | `string \| null` | 🔒 Private | Associated user ID |
| `isAuthenticated` | `boolean` | 🔒 Private | Authentication status |
| `audioContext` | `AudioContext \| null` | 🔒 Private | Web Audio context for streaming |
| `sourceNode` | `MediaStreamAudioSourceNode \| null` | 🔒 Private | Audio source node |
| `scriptProcessor` | `ScriptProcessorNode \| null` | 🔒 Private | Audio processor node (generates samples) |
| `isStreaming` | `boolean` | 🔒 Private | Streaming active flag |
| `onVerificationCallback` | `((result: boolean) => void) \| null` | 🔒 Private | Callback for verification results |

---

##### **Method: `connect(userId)`**

```typescript
🌐 public connect(userId: string): Promise<void>
```

**Visibility:** 🌐 Public  
**Purpose:** Establish WebSocket connection to backend

**Parameters:**
- `userId` (string): User identifier to associate with connection

**Returns:** `Promise<void>` - Resolves when connected

**Side Effects:**
- Creates WebSocket connection
- Sets up event handlers (onopen, onmessage, onclose, onerror)
- Sends `setUserId` control message

**WebSocket URL:** `ws://localhost:3001/audio-stream?userId=${userId}`

**Implementation Reference:** [`src/services/audioStreamService.ts:38-83`](src/services/audioStreamService.ts)

---

##### **Method: `disconnect()`**

```typescript
🌐 public disconnect(): void
```

**Visibility:** 🌐 Public  
**Purpose:** Close WebSocket connection

**Side Effects:**
- Closes WebSocket (code 1000 - normal closure)
- Stops audio streaming if active

**Implementation Reference:** [`src/services/audioStreamService.ts:88-95`](src/services/audioStreamService.ts)

---

##### **Method: `startStreaming(mediaStream)`**

```typescript
🌐 public async startStreaming(mediaStream: MediaStream): Promise<void>
```

**Visibility:** 🌐 Public  
**Purpose:** Begin streaming audio samples to backend via WebSocket

**Parameters:**
- `mediaStream` (MediaStream): Microphone media stream

**Returns:** `Promise<void>`

**Algorithm:**
1. Create AudioContext and ScriptProcessorNode (4096 buffer size)
2. Connect mediaStream → sourceNode → scriptProcessor
3. On each audio process event:
   - Extract Float32Array of audio samples
   - Send binary data via WebSocket
4. Process ~10.75 buffers/second (~176 KB/s bandwidth)

**Side Effects:**
- Continuously sends audio data while streaming
- Updates backend's packet verification in real-time

**Implementation Reference:** [`src/services/audioStreamService.ts:110-143`](src/services/audioStreamService.ts)

---

##### **Method: `stopStreaming()`**

```typescript
🌐 public stopStreaming(): void
```

**Visibility:** 🌐 Public  
**Purpose:** Stop audio sample streaming

**Side Effects:**
- Disconnects audio nodes
- Closes AudioContext
- Stops sending data to WebSocket

**Implementation Reference:** [`src/services/audioStreamService.ts:148-161`](src/services/audioStreamService.ts)

---

##### **Method: `onVerification(callback)`**

```typescript
🌐 public onVerification(callback: (result: boolean) => void): void
```

**Visibility:** 🌐 Public  
**Purpose:** Register callback for verification result messages from backend

**Parameters:**
- `callback` (function): Function to call with verification result

**Use Case:** UI can react to backend's packet verification results

**Implementation Reference:** [`src/services/audioStreamService.ts:166-168`](src/services/audioStreamService.ts)

---

##### **Private Method: `handleAudioProcess(event)`**

```typescript
🔒 private handleAudioProcess(event: AudioProcessingEvent): void
```

**Visibility:** 🔒 Private  
**Purpose:** Process each audio buffer and send to WebSocket

**Parameters:**
- `event` (AudioProcessingEvent): Audio processing event from ScriptProcessorNode

**Behavior:**
1. Extract Float32Array from inputBuffer
2. Check WebSocket ready state
3. Send binary data: `ws.send(inputBuffer.buffer)`

**Implementation Reference:** [`src/services/audioStreamService.ts:173-181`](src/services/audioStreamService.ts)

---

#### **2.3.4 Exported Singleton Instance**

```typescript
🌐 export default audioStreamService;
```

**Visibility:** 🌐 **Externally Visible** (default export)  
**Type:** `AudioStreamService` instance  
**Usage:** Import and use directly (singleton pattern)

```typescript
import { audioStreamService } from './services/audioStreamService';
await audioStreamService.connect('user-123');
audioStreamService.startStreaming(stream);
```

**Implementation Reference:** [`src/services/audioStreamService.ts:229`](src/services/audioStreamService.ts)

---

## 3. Summary Tables

### **3.1 Backend Modules Summary**

| Module | Classes | Exported Functions | Private Functions | Exported Fields | Private Fields |
|--------|---------|-------------------|------------------|-----------------|----------------|
| **server.js** | 0 | 0 | 11 route handlers + 2 middleware | 0 | 7 |
| **database.js** | 0 | 7 | 0 | 0 | 3 |
| **packet-verifier.js** | 1 (private) | 1 | 5 class methods | 0 | 2 |
| **metrics.js** | 0 | 3 | 1 | 0 | 3 |
| **aws-config.js** | 0 | 5 (all mock) | 0 | 1 (config object) | 0 |

**Total:** 1 private class, 16 exported functions, 17 private functions, 1 exported field, 15 private fields

---

### **3.2 Frontend Modules Summary**

| Module | Classes | Exported Functions | Private Functions/Methods | Exported Instances | Interfaces (Private) |
|--------|---------|-------------------|---------------------------|-------------------|---------------------|
| **backendService.ts** | 0 | 8 | 0 | 0 | 2 |
| **audioService.ts** | 1 (private) | 0 | 2 methods | 1 singleton | 0 |
| **audioStreamService.ts** | 1 (private) | 0 | 1 method | 1 singleton | 1 |

**Total:** 2 private classes, 8 exported functions, 3 private methods, 2 exported singletons, 3 private interfaces

---

### **3.3 Visibility Distribution**

#### **Backend**

| Category | Count | Percentage |
|----------|-------|------------|
| 🌐 **Externally Visible** (Exported) | 17 | ~48% |
| 🔒 **Private/Internal** | 18 | ~52% |

#### **Frontend**

| Category | Count | Percentage |
|----------|-------|------------|
| 🌐 **Externally Visible** (Exported) | 10 | ~77% |
| 🔒 **Private/Internal** | 3 | ~23% |

**Frontend Analysis:** Higher proportion of public APIs because frontend services are designed to be consumed by UI components. Backend has more internal functions for routing and middleware.

---

### **3.4 Module Interconnections**

```
Backend Module Dependencies:
server.js → database.js (CRUD operations)
          → metrics.js (middleware)
          → packet-verifier.js (WebSocket)

packet-verifier.js → database.js (persist verification)

Frontend Module Dependencies:
App.tsx → backendService.ts (API calls)
        → audioService.ts (microphone control)
        → audioStreamService.ts (WebSocket streaming)

audioStreamService.ts → (No internal dependencies)
audioService.ts → (No internal dependencies)
backendService.ts → (No internal dependencies)
```

---

## 4. Cross-References & Consistency Verification

### **4.1 Consistency with API_SPECIFICATION.md**

✅ **Verified:** All 11 REST endpoints in `server.js` match [`API_SPECIFICATION.md:155-991`](API_SPECIFICATION.md)  
✅ **Verified:** WebSocket endpoint `/audio-stream` matches [`API_SPECIFICATION.md:994-1280`](API_SPECIFICATION.md)  
✅ **Verified:** All `backendService.ts` functions correspond to documented API endpoints

---

### **4.2 Consistency with BACKEND_INTERNAL_ARCHITECTURE.md**

✅ **Verified:** `database.js` CRUD operations match [`BACKEND_INTERNAL_ARCHITECTURE.md:157-233`](BACKEND_INTERNAL_ARCHITECTURE.md)  
✅ **Verified:** Dual verification architecture matches [`BACKEND_INTERNAL_ARCHITECTURE.md:1105-1280`](BACKEND_INTERNAL_ARCHITECTURE.md)  
✅ **Verified:** No separate controller layer (routes call database directly) as documented

---

### **4.3 Consistency with USER_STORIES_BACKEND_SPEC.md**

✅ **Verified:** Module responsibilities match [`USER_STORIES_BACKEND_SPEC.md:1065-1075`](USER_STORIES_BACKEND_SPEC.md)  
✅ **Verified:** Dual verification methods implemented as specified  
✅ **Verified:** Device switching preserves mute status (User Story 2 requirement)

---

### **4.4 Consistency with STABLE_STORAGE_SPECIFICATION.md**

✅ **Verified:** Database schema in `database.js` matches [`STABLE_STORAGE_SPECIFICATION.md:36-50`](STABLE_STORAGE_SPECIFICATION.md)  
✅ **Verified:** All 11 fields in `user_states` table accounted for  
✅ **Verified:** Packet verification results persisted to SQLite (not memory)

---

### **4.5 Consistency with DATA_ABSTRACTIONS.md**

✅ **Verified:** `database.js` functions match data abstraction spec [`DATA_ABSTRACTIONS.md:9-73`](DATA_ABSTRACTIONS.md)  
✅ **Verified:** `packet-verifier.js` architecture matches [`DATA_ABSTRACTIONS.md:76-126`](DATA_ABSTRACTIONS.md)  
✅ **Verified:** API response format matches [`DATA_ABSTRACTIONS.md:130-174`](DATA_ABSTRACTIONS.md)

---

## 5. Known Issues & Discrepancies

### **5.1 Type Definition Mismatch**

**Issue:** `src/services/backendService.ts` `UserState` interface is missing fields from v1.3.0 schema.

**Current:**
```typescript
interface UserState {
  // ... other fields
  verifiedMuted: boolean | null;
  // Missing: packetVerifiedMuted, packetVerifiedAt
}
```

**Expected (v1.3.0):**
```typescript
interface UserState {
  // ... other fields
  verifiedMuted: boolean | null;
  packetVerifiedMuted: boolean | null;  // ← Missing
  packetVerifiedAt: string | null;      // ← Missing
}
```

**Impact:** TypeScript compiler may not catch errors when accessing these fields.

**Recommendation:** Update `UserState` interface to include all v1.3.0 fields.

---

### **5.2 Module Export Inconsistency**

**Issue:** `audioStreamService.ts` uses default export, while `audioService.ts` uses named export for singleton.

**Recommendation:** Standardize to named exports for consistency:
```typescript
// Preferred:
export const audioStreamService = new AudioStreamService();

// Instead of:
export default audioStreamService;
```

---

## 6. Architecture Patterns Observed

### **6.1 Backend Patterns**

1. **Functional Module Pattern** (`database.js`, `metrics.js`)
   - Export pure functions
   - Minimal state
   - Clear separation of concerns

2. **Factory Pattern** (`packet-verifier.js`)
   - Private class
   - Exported initialization function
   - Encapsulation of complexity

3. **Middleware Pattern** (`server.js`)
   - Composable request processing
   - Logging, metrics collection
   - Cross-cutting concerns

---

### **6.2 Frontend Patterns**

1. **Singleton Pattern** (`audioService.ts`, `audioStreamService.ts`)
   - Single instance per application
   - Centralized state management
   - Easy to import and use

2. **Facade Pattern** (`backendService.ts`)
   - Wraps Fetch API
   - Simplified interface for REST calls
   - Graceful error handling

3. **Strategy Pattern** (Dual Verification)
   - Method 1: `audioService.verifyMuteState()`
   - Method 2: `audioStreamService` + `packet-verifier.js`
   - Independent, complementary strategies

---

## 7. References

### **Implementation Files**

- [`backend/server.js`](backend/server.js) - Express server and routes
- [`backend/database.js`](backend/database.js) - SQLite DAO
- [`backend/packet-verifier.js`](backend/packet-verifier.js) - WebSocket server
- [`backend/metrics.js`](backend/metrics.js) - Metrics collection
- [`backend/aws-config.js`](backend/aws-config.js) - AWS config (skeleton)
- [`src/services/backendService.ts`](src/services/backendService.ts) - REST client
- [`src/services/audioService.ts`](src/services/audioService.ts) - Microphone control
- [`src/services/audioStreamService.ts`](src/services/audioStreamService.ts) - WebSocket client

### **Related Documentation**

- [`API_SPECIFICATION.md`](API_SPECIFICATION.md) - API contracts
- [`BACKEND_INTERNAL_ARCHITECTURE.md`](BACKEND_INTERNAL_ARCHITECTURE.md) - Architecture details
- [`USER_STORIES_BACKEND_SPEC.md`](USER_STORIES_BACKEND_SPEC.md) - Module responsibilities
- [`STABLE_STORAGE_SPECIFICATION.md`](STABLE_STORAGE_SPECIFICATION.md) - Database schema
- [`DATA_ABSTRACTIONS.md`](DATA_ABSTRACTIONS.md) - Data abstractions

---

**Last Updated:** October 23, 2025  
**Version:** 1.3.0  
**Maintained By:** Team Bug Farmers Development Team  
**Review Cycle:** Before each milestone

