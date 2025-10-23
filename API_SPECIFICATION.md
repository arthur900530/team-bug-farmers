# API Specification

**Purpose:** Define clear, unambiguous REST and WebSocket APIs for external callers of the backend module.  
**Task:** Requirement 5 - "Define a clear, unambiguous API for external callers"  
**Audience:** Frontend Developers, Integration Partners, API Consumers  
**Version:** 1.3.0 (Dual Verification Support)  

---

## 1. API Overview

### **1.1 Base Information**

| Property | Value |
|----------|-------|
| **Base URL** | `http://localhost:3001/api` (development)<br/>`https://<your-domain>/api` (production) |
| **Protocol** | REST over HTTP/HTTPS |
| **Data Format** | JSON |
| **Character Encoding** | UTF-8 |
| **Authentication** | None (demo environment) |
| **Rate Limiting** | None (10 concurrent users max) |

**Environment Variables:**
- **Frontend:** `VITE_API_URL` (default: `http://localhost:3001/api`)
- **Backend:** `PORT` (default: `3001`)

**Implementation Reference:** [`backend/server.js:18`](backend/server.js)

---

### **1.2 API Categories**

| Category | Endpoints | Purpose |
|----------|-----------|---------|
| **Health & Monitoring** | 2 | System health checks and performance metrics |
| **User State Management** | 7 | CRUD operations for user audio/device state |
| **Room Management** | 1 | Room-based user queries |
| **Audio Streaming** | 1 (WebSocket) | Real-time audio packet verification |

**Total:** 11 REST endpoints + 1 WebSocket endpoint

**Cross-Reference:** See [`USER_STORIES_BACKEND_SPEC.md`](USER_STORIES_BACKEND_SPEC.md) for module responsibilities.

---

### **1.3 Response Format Standard**

All REST API responses follow this structure:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation description",
  "data": { /* Response payload */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "message": "User-friendly error message"
}
```

**Implementation Reference:** [`backend/server.js`](backend/server.js) (all endpoints use this pattern)

**Cross-Reference:** See [`DATA_ABSTRACTIONS.md:130-174`](DATA_ABSTRACTIONS.md) for API Response Format abstraction.

---

## 2. Data Schemas

### **2.1 UserState Schema**

**Description:** Complete representation of a user's audio and device state in a meeting.

```typescript
interface UserState {
  userId: string;                    // Unique user identifier
  username: string;                  // Display name
  isMuted: boolean;                  // User's mute intent (button clicked)
  verifiedMuted: boolean | null;     // Web Audio API verification result
  packetVerifiedMuted: boolean | null; // Packet inspection verification result
  packetVerifiedAt: string | null;   // ISO 8601 timestamp of last packet verification
  deviceId: string | null;           // Selected audio device ID
  deviceLabel: string | null;        // Human-readable device name
  roomId: string | null;             // Meeting room identifier
  lastUpdated: string;               // ISO 8601 timestamp of last modification
  createdAt: string;                 // ISO 8601 timestamp of creation
}
```

**Field Constraints:**
- `userId`: Non-empty string, unique
- `username`: Non-empty string
- `isMuted`: Boolean (required)
- `verifiedMuted`: Boolean or `null` (Method 1 verification)
- `packetVerifiedMuted`: Boolean or `null` (Method 2 verification)
- `packetVerifiedAt`: ISO 8601 string or `null`
- Timestamps: ISO 8601 format (e.g., `2025-10-23T12:00:00.000Z`)

**Storage Reference:** See [`STABLE_STORAGE_SPECIFICATION.md:36-50`](STABLE_STORAGE_SPECIFICATION.md) for database schema.

**Abstraction Reference:** See [`DATA_ABSTRACTIONS.md:9-73`](DATA_ABSTRACTIONS.md) for data abstraction definition.

---

### **2.2 Health Check Schema**

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;              // ISO 8601 timestamp
  uptime: number;                 // Server uptime in seconds
  database: {
    connected: boolean;
    responseTime: number;         // Query response time in ms
  };
  memory: {
    used: number;                 // Memory usage in MB
    total: number;                // Total memory in MB
    percentage: number;           // Memory usage percentage
  };
  environment: string;            // 'development' | 'production'
}
```

---

### **2.3 Metrics Schema**

```typescript
interface SystemMetrics {
  uptime: number;                 // Server uptime in seconds
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;    // In milliseconds
  errorRate: number;              // Percentage
  endpoints: {
    [path: string]: {
      count: number;
      avgDuration: number;
    }
  };
  lastReset: string;              // ISO 8601 timestamp
}
```

---

## 3. REST API Endpoints

### **3.1 Health Check**

**Endpoint:** `GET /api/health`

**Purpose:** Monitor server, database, and resource health. Used for deployment verification and monitoring systems.

**Request:**
```http
GET /api/health HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "connected": true,
    "responseTime": 1
  },
  "memory": {
    "used": 45.2,
    "total": 512,
    "percentage": 8.8
  },
  "environment": "development"
}
```

**Response Codes:**
- `200 OK`: Server is healthy
- `503 Service Unavailable`: Database unreachable

**Example:**
```bash
curl http://localhost:3001/api/health
```

**Implementation Reference:** [`backend/server.js:116-158`](backend/server.js)

---

### **3.2 Get Metrics**

**Endpoint:** `GET /api/metrics`

**Purpose:** Retrieve API performance metrics (response times, error rates, request counts).

**Request:**
```http
GET /api/metrics HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "uptime": 3600,
  "totalRequests": 1250,
  "successfulRequests": 1200,
  "failedRequests": 50,
  "averageResponseTime": 5.2,
  "errorRate": 4.0,
  "endpoints": {
    "/api/users/:userId/mute": {
      "count": 450,
      "avgDuration": 3.1
    },
    "/api/users/:userId/device": {
      "count": 200,
      "avgDuration": 4.5
    }
  },
  "lastReset": "2025-10-23T00:00:00.000Z"
}
```

**Response Codes:**
- `200 OK`: Metrics retrieved successfully

**Example:**
```bash
curl http://localhost:3001/api/metrics
```

**Implementation Reference:** [`backend/metrics.js`](backend/metrics.js), [`backend/server.js:111`](backend/server.js)

---

### **3.3 Get All Users**

**Endpoint:** `GET /api/users`

**Purpose:** Retrieve all user states, ordered by last update time (most recent first).

**Request:**
```http
GET /api/users HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "userId": "user-123",
      "username": "Alice",
      "isMuted": true,
      "verifiedMuted": true,
      "packetVerifiedMuted": true,
      "packetVerifiedAt": "2025-10-23T12:00:00.000Z",
      "deviceId": "default",
      "deviceLabel": "Built-in Microphone",
      "roomId": "room-456",
      "lastUpdated": "2025-10-23T12:00:00.000Z",
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    {
      "userId": "user-456",
      "username": "Bob",
      "isMuted": false,
      "verifiedMuted": null,
      "packetVerifiedMuted": null,
      "packetVerifiedAt": null,
      "deviceId": "usb-mic-001",
      "deviceLabel": "Blue Yeti",
      "roomId": "room-456",
      "lastUpdated": "2025-10-23T11:55:00.000Z",
      "createdAt": "2025-10-23T10:30:00.000Z"
    }
  ]
}
```

**Response Codes:**
- `200 OK`: Users retrieved successfully (may be empty array)
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl http://localhost:3001/api/users
```

**Implementation Reference:** [`backend/server.js:159-176`](backend/server.js)

**Database Reference:** See [`backend/database.js:117-149`](backend/database.js) for `getAllUserStates()`.

---

### **3.4 Get User State**

**Endpoint:** `GET /api/users/:userId`

**Purpose:** Retrieve a specific user's current state.

**Parameters:**
- `userId` (path, required): User identifier

**Request:**
```http
GET /api/users/user-123 HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User state retrieved",
  "data": {
    "userId": "user-123",
    "username": "Alice",
    "isMuted": true,
    "verifiedMuted": true,
    "packetVerifiedMuted": true,
    "packetVerifiedAt": "2025-10-23T12:00:00.000Z",
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room-456",
    "lastUpdated": "2025-10-23T12:00:00.000Z",
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Response Codes:**
- `200 OK`: User found
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Database error

**Example:**
```bash
curl http://localhost:3001/api/users/user-123
```

**Implementation Reference:** [`backend/server.js:177-202`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:168-184`](src/services/backendService.ts) `getUserState()`

---

### **3.5 Create/Update User State**

**Endpoint:** `POST /api/users/:userId/state`

**Purpose:** Create a new user or update all fields of an existing user's state. This is a full state replacement (upsert operation).

**User Stories:** User Story 1 (Mute), User Story 2 (Device)

**Parameters:**
- `userId` (path, required): User identifier

**Request Body:**
```json
{
  "username": "Alice",
  "isMuted": true,
  "deviceId": "default",
  "deviceLabel": "Built-in Microphone",
  "roomId": "room-456"
}
```

**Field Requirements:**
- `username` (string, required): Non-empty display name
- `isMuted` (boolean, required): Mute status
- `deviceId` (string, optional): Device identifier (null if not set)
- `deviceLabel` (string, optional): Device display name (null if not set)
- `roomId` (string, optional): Room identifier (null if not set)

**Request:**
```http
POST /api/users/user-123/state HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "username": "Alice",
  "isMuted": true,
  "deviceId": "default",
  "deviceLabel": "Built-in Microphone",
  "roomId": "room-456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User state updated",
  "data": {
    "userId": "user-123",
    "username": "Alice",
    "isMuted": true,
    "verifiedMuted": null,
    "packetVerifiedMuted": null,
    "packetVerifiedAt": null,
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room-456",
    "lastUpdated": "2025-10-23T12:00:00.000Z",
    "createdAt": "2025-10-23T12:00:00.000Z"
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "username is required"
}
```

**Response Codes:**
- `200 OK`: User state created or updated
- `400 Bad Request`: Invalid input (missing required fields, wrong types)
- `500 Internal Server Error`: Database error

**Validation Rules:**
- `username` must be a non-empty string
- `isMuted` must be a boolean
- `deviceId` must be a string or null
- `deviceLabel` must be a string or null
- `roomId` must be a string or null

**Example:**
```bash
curl -X POST http://localhost:3001/api/users/user-123/state \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Alice",
    "isMuted": true,
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room-456"
  }'
```

**Implementation Reference:** [`backend/server.js:203-246`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:30-66`](src/services/backendService.ts) `updateUserState()`

**Database Reference:** See [`backend/database.js:155-189`](backend/database.js) for `createOrUpdateUserState()`.

---

### **3.6 Update Mute Status**

**Endpoint:** `PATCH /api/users/:userId/mute`

**Purpose:** Update only the mute status, preserving all other fields. Used when user clicks mute/unmute button.

**User Story:** User Story 1 (Microphone Mute Verification)

**Parameters:**
- `userId` (path, required): User identifier

**Request Body:**
```json
{
  "isMuted": true
}
```

**Field Requirements:**
- `isMuted` (boolean, required): New mute status

**Request:**
```http
PATCH /api/users/user-123/mute HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "isMuted": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Mute status updated",
  "data": {
    "userId": "user-123",
    "username": "Alice",
    "isMuted": true,
    "verifiedMuted": null,
    "packetVerifiedMuted": null,
    "packetVerifiedAt": null,
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room-456",
    "lastUpdated": "2025-10-23T12:01:00.000Z",
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found. Create user state first with POST /api/users/:userId/state"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "isMuted must be a boolean"
}
```

**Response Codes:**
- `200 OK`: Mute status updated
- `400 Bad Request`: Invalid input (not a boolean)
- `404 Not Found`: User does not exist (must create state first)
- `500 Internal Server Error`: Database error

**Behavior:**
- **Preserves** all other fields (username, device, room, etc.)
- **Resets** `verifiedMuted` to `null` (requires re-verification after mute change)
- Updates `lastUpdated` timestamp

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user-123/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted": true}'
```

**Implementation Reference:** [`backend/server.js:247-290`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:71-98`](src/services/backendService.ts) `updateMuteStatus()`

**Architecture Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:157-233`](BACKEND_INTERNAL_ARCHITECTURE.md) for Module 1 internal architecture.

---

### **3.7 Update Device**

**Endpoint:** `PATCH /api/users/:userId/device`

**Purpose:** Update only the audio device selection, preserving all other fields including mute status.

**User Story:** User Story 2 (In-Call Device Switching)

**Parameters:**
- `userId` (path, required): User identifier

**Request Body:**
```json
{
  "deviceId": "usb-mic-001",
  "deviceLabel": "Blue Yeti USB Microphone"
}
```

**Field Requirements:**
- `deviceId` (string, required): Device identifier
- `deviceLabel` (string, required): Human-readable device name

**Request:**
```http
PATCH /api/users/user-123/device HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "deviceId": "usb-mic-001",
  "deviceLabel": "Blue Yeti USB Microphone"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Device updated",
  "data": {
    "userId": "user-123",
    "username": "Alice",
    "isMuted": true,
    "verifiedMuted": true,
    "packetVerifiedMuted": true,
    "packetVerifiedAt": "2025-10-23T12:00:00.000Z",
    "deviceId": "usb-mic-001",
    "deviceLabel": "Blue Yeti USB Microphone",
    "roomId": "room-456",
    "lastUpdated": "2025-10-23T12:02:00.000Z",
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found. Create user state first with POST /api/users/:userId/state"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "deviceId and deviceLabel are required"
}
```

**Response Codes:**
- `200 OK`: Device updated
- `400 Bad Request`: Invalid input (missing fields, wrong types)
- `404 Not Found`: User does not exist (must create state first)
- `500 Internal Server Error`: Database error

**Behavior:**
- **Preserves** mute status and verification results (per User Story 2 requirement)
- **Preserves** all other fields (username, room, etc.)
- Updates `lastUpdated` timestamp

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user-123/device \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "usb-mic-001",
    "deviceLabel": "Blue Yeti USB Microphone"
  }'
```

**Implementation Reference:** [`backend/server.js:291-334`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:102-133`](src/services/backendService.ts) `updateDevice()`

**Architecture Reference:** See [`USER_STORIES_BACKEND_SPEC.md:592-710`](USER_STORIES_BACKEND_SPEC.md) for User Story 2 device switching requirements.

---

### **3.8 Update Mute Verification (Method 1)**

**Endpoint:** `PATCH /api/users/:userId/verify`

**Purpose:** Report Web Audio API hardware verification result from frontend. This is Method 1 of dual verification.

**User Story:** User Story 1 (Microphone Mute Verification - Method 1: Web Audio API Check)

**Parameters:**
- `userId` (path, required): User identifier

**Request Body:**
```json
{
  "verifiedMuted": true
}
```

**Field Requirements:**
- `verifiedMuted` (boolean, required): Hardware verification result
  - `true`: Audio level is 0% (hardware confirmed silent)
  - `false`: Audio level > 0% (audio still detected - potential leak)

**Request:**
```http
PATCH /api/users/user-123/verify HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "verifiedMuted": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Mute verification status updated",
  "data": {
    "userId": "user-123",
    "username": "Alice",
    "isMuted": true,
    "verifiedMuted": true,
    "packetVerifiedMuted": true,
    "packetVerifiedAt": "2025-10-23T12:00:00.000Z",
    "deviceId": "default",
    "deviceLabel": "Built-in Microphone",
    "roomId": "room-456",
    "lastUpdated": "2025-10-23T12:00:30.000Z",
    "createdAt": "2025-10-23T10:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found. Create user state first with POST /api/users/:userId/state"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "verifiedMuted must be a boolean"
}
```

**Response Codes:**
- `200 OK`: Verification status updated
- `400 Bad Request`: Invalid input (not a boolean)
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Database error

**Behavior:**
- Updates only `verifiedMuted` field (Method 1 verification)
- **Preserves** all other fields including `packetVerifiedMuted` (Method 2)
- Updates `lastUpdated` timestamp

**Verification Flow:**
```
1. User clicks mute → updateMuteStatus(true)
2. Wait 500ms for hardware to settle
3. Frontend: audioService.verifyMuteState() → checks Web Audio API
4. Frontend: updateMuteVerification(true/false) → calls this endpoint
5. Backend: Stores verification result in database
```

**Example:**
```bash
curl -X PATCH http://localhost:3001/api/users/user-123/verify \
  -H "Content-Type: application/json" \
  -d '{"verifiedMuted": true}'
```

**Implementation Reference:** [`backend/server.js:335-382`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:137-165`](src/services/backendService.ts) `updateMuteVerification()`

**Architecture Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:1105-1280`](BACKEND_INTERNAL_ARCHITECTURE.md) for dual verification architecture (Method 1 details).

**Related Documentation:** See [`backend/README.md:184-242`](backend/README.md) for additional context on Web Audio API verification.

---

### **3.9 Get Packet Verification Status (Method 2)**

**Endpoint:** `GET /api/users/:userId/packet-verification`

**Purpose:** Retrieve backend's independent packet inspection result. This is Method 2 of dual verification.

**User Story:** User Story 1 (Microphone Mute Verification - Method 2: Packet Inspection)

**Parameters:**
- `userId` (path, required): User identifier

**Request:**
```http
GET /api/users/user-123/packet-verification HTTP/1.1
Host: localhost:3001
```

**Response (200 OK - Active Stream):**
```json
{
  "success": true,
  "message": "Packet verification status",
  "data": {
    "userId": "user-123",
    "hasActiveStream": true,
    "packetVerifiedMuted": true,
    "lastVerified": "2025-10-23T12:00:00.000Z",
    "note": "Backend detected silence in audio stream."
  }
}
```

**Response (200 OK - No Stream):**
```json
{
  "success": true,
  "message": "Packet verification status",
  "data": {
    "userId": "user-123",
    "hasActiveStream": false,
    "packetVerifiedMuted": null,
    "lastVerified": null,
    "note": "Start WebSocket audio streaming to enable packet verification"
  }
}
```

**Response Codes:**
- `200 OK`: Status retrieved (may indicate no active stream)
- `500 Internal Server Error`: Database error

**Field Meanings:**
- `hasActiveStream`: Whether user is currently streaming audio via WebSocket
- `packetVerifiedMuted`:
  - `true`: Backend detected silence (RMS < 1%)
  - `false`: Backend detected audio (RMS ≥ 1%)
  - `null`: No recent audio data (no stream or stale data)
- `lastVerified`: Timestamp of last packet analysis (null if never verified)

**Data Freshness:**
- Result is considered **stale** if > 5 seconds old
- Requires active WebSocket connection to `/audio-stream`
- Updates approximately every 100ms during streaming

**Example:**
```bash
curl http://localhost:3001/api/users/user-123/packet-verification
```

**Implementation Reference:** [`backend/server.js:383-411`](backend/server.js)

**Packet Verifier Reference:** [`backend/packet-verifier.js:124-148`](backend/packet-verifier.js) `getVerificationResult()`

**Architecture Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:1105-1280`](BACKEND_INTERNAL_ARCHITECTURE.md) for dual verification architecture (Method 2 details).

**Related Documentation:** See [`backend/README.md:249-283`](backend/README.md) for packet verification details.

---

### **3.10 Delete User State**

**Endpoint:** `DELETE /api/users/:userId`

**Purpose:** Remove a user's state from the system (e.g., when they leave the meeting).

**Parameters:**
- `userId` (path, required): User identifier

**Request:**
```http
DELETE /api/users/user-123 HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User state deleted"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Response Codes:**
- `200 OK`: User deleted
- `404 Not Found`: User does not exist
- `500 Internal Server Error`: Database error

**Behavior:**
- Permanently removes user state from database
- Does **not** close WebSocket connections (handled separately)
- Cannot be undone (must create new state to restore)

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/users/user-123
```

**Implementation Reference:** [`backend/server.js:412-437`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:206-220`](src/services/backendService.ts) `deleteUserState()`

---

### **3.11 Get Users by Room**

**Endpoint:** `GET /api/rooms/:roomId/users`

**Purpose:** Retrieve all users in a specific meeting room, ordered by last update time.

**Parameters:**
- `roomId` (path, required): Room identifier

**Request:**
```http
GET /api/rooms/room-456/users HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Room users retrieved",
  "data": [
    {
      "userId": "user-123",
      "username": "Alice",
      "isMuted": true,
      "verifiedMuted": true,
      "packetVerifiedMuted": true,
      "packetVerifiedAt": "2025-10-23T12:00:00.000Z",
      "deviceId": "default",
      "deviceLabel": "Built-in Microphone",
      "roomId": "room-456",
      "lastUpdated": "2025-10-23T12:00:00.000Z",
      "createdAt": "2025-10-23T10:00:00.000Z"
    },
    {
      "userId": "user-456",
      "username": "Bob",
      "isMuted": false,
      "verifiedMuted": null,
      "packetVerifiedMuted": null,
      "packetVerifiedAt": null,
      "deviceId": "usb-mic-001",
      "deviceLabel": "Blue Yeti",
      "roomId": "room-456",
      "lastUpdated": "2025-10-23T11:55:00.000Z",
      "createdAt": "2025-10-23T10:30:00.000Z"
    }
  ]
}
```

**Response (200 OK - Empty Room):**
```json
{
  "success": true,
  "message": "Room users retrieved",
  "data": []
}
```

**Response Codes:**
- `200 OK`: Users retrieved (may be empty array)
- `500 Internal Server Error`: Database error

**Use Cases:**
- Display participant list in meeting UI
- Show mute status of all users
- Monitor room occupancy

**Example:**
```bash
curl http://localhost:3001/api/rooms/room-456/users
```

**Implementation Reference:** [`backend/server.js:438-458`](backend/server.js)

**Frontend Reference:** [`src/services/backendService.ts:187-203`](src/services/backendService.ts) `getRoomUsers()`

**Database Reference:** See [`backend/database.js:204-237`](backend/database.js) for `getUsersByRoom()`.

---

## 4. WebSocket API

### **4.1 Audio Stream Endpoint**

**Endpoint:** `ws://localhost:3001/audio-stream`

**Purpose:** Stream raw audio samples from frontend to backend for packet inspection (Method 2 of dual verification).

**User Story:** User Story 1 (Microphone Mute Verification - Method 2: Packet Inspection)

**Protocol:** WebSocket (binary frames for audio data, text frames for control messages)

---

#### **4.1.1 Connection**

**Connection URL:**
```
ws://localhost:3001/audio-stream?userId=user-123
```

**Query Parameters:**
- `userId` (optional): User identifier for initial association

**Connection Lifecycle:**
```
1. Client: new WebSocket('ws://localhost:3001/audio-stream')
2. Server: WebSocket connection accepted
3. Client: Send control message with userId (if not in query)
4. Server: Acknowledge connection
5. Client: Stream audio samples (Float32Array → binary)
6. Server: Process samples, detect silence, persist to database
7. Client/Server: Either side can close connection
8. Server: Cleanup user's audio buffer (verification persists)
```

**Example (JavaScript):**
```javascript
const ws = new WebSocket('ws://localhost:3001/audio-stream?userId=user-123');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('WebSocket closed:', event.code, event.reason);
};
```

---

#### **4.1.2 Control Messages (Text Frames)**

**Set User ID:**
```json
{
  "type": "setUserId",
  "userId": "user-123"
}
```

**Purpose:** Associate WebSocket connection with a user (if not provided in query string).

**When to Send:** Immediately after connection, before streaming audio.

**Example:**
```javascript
ws.send(JSON.stringify({
  type: 'setUserId',
  userId: 'user-123'
}));
```

---

#### **4.1.3 Audio Data Messages (Binary Frames)**

**Format:** Float32Array of audio samples (raw binary data)

**Sample Rate:** 44.1 kHz (standard audio sample rate)

**Buffer Size:** 4096 samples per buffer (typical ScriptProcessorNode size)

**Buffer Frequency:** ~10.75 buffers/second

**Bandwidth:** ~176 KB/s per user (4096 samples × 4 bytes × 10.75 Hz)

**Data Flow:**
```
Web Audio API → ScriptProcessorNode → Float32Array → ArrayBuffer
       ↓
WebSocket.send(audioBuffer.buffer)
       ↓
Backend receives binary message
       ↓
Convert to Float32Array: new Float32Array(message.buffer)
       ↓
Process samples: RMS energy calculation
       ↓
Detect silence: RMS < 0.01 (1%)
       ↓
Persist to database: packetVerifiedMuted
```

**Example (Frontend):**
```javascript
// Web Audio API setup
const audioContext = new AudioContext();
const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);

processor.onaudioprocess = (event) => {
  const inputBuffer = event.inputBuffer.getChannelData(0); // Float32Array
  
  // Send raw audio samples to backend via WebSocket
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(inputBuffer.buffer); // Binary message
  }
};

source.connect(processor);
processor.connect(audioContext.destination);
```

---

#### **4.1.4 Server Processing**

**Backend Flow:**

1. **Receive Audio Samples:**
   ```javascript
   ws.on('message', (message) => {
     const audioSamples = new Float32Array(message.buffer);
     // audioSamples.length = 4096
   });
   ```

2. **Buffer Management:**
   - Store last 1 second of audio (in-memory ring buffer)
   - Limit: ~10-11 buffers per user
   - Auto-cleanup after 30 seconds of inactivity

3. **RMS Energy Calculation:**
   ```javascript
   function calculateRMS(samples) {
     let sumOfSquares = 0;
     for (let i = 0; i < samples.length; i++) {
       sumOfSquares += samples[i] * samples[i];
     }
     return Math.sqrt(sumOfSquares / samples.length);
   }
   ```

4. **Silence Detection:**
   ```javascript
   const rmsLevel = calculateRMS(samples);
   const isSilent = rmsLevel < 0.01; // 1% threshold
   ```

5. **Persist Result:**
   ```javascript
   createOrUpdateUserState({
     userId: userId,
     // ... other fields preserved
     packetVerifiedMuted: isSilent,
     packetVerifiedAt: new Date().toISOString()
   });
   ```

**Implementation Reference:** [`backend/packet-verifier.js`](backend/packet-verifier.js)

---

#### **4.1.5 Disconnection**

**Normal Close:**
```javascript
ws.close(1000, 'User left meeting'); // Code 1000 = Normal Closure
```

**Close Codes:**
- `1000`: Normal closure (user left, streaming stopped)
- `1001`: Going away (page navigation, browser close)
- `1006`: Abnormal closure (network failure, server crash)

**Server Behavior on Disconnect:**
- Remove user's audio buffer from memory
- **Preserve** verification results in database
- Client should reconnect if streaming should continue

**Example:**
```javascript
ws.onclose = (event) => {
  if (event.code === 1006) {
    // Abnormal closure - attempt reconnect
    setTimeout(() => reconnect(), 3000);
  }
};
```

---

#### **4.1.6 Error Handling**

**Connection Failed:**
```javascript
ws.onerror = (error) => {
  console.error('WebSocket connection failed:', error);
  // Fallback: Use Method 1 (Web Audio API) verification only
};
```

**Message Send Failed:**
```javascript
if (ws.readyState !== WebSocket.OPEN) {
  // Skip sending this buffer
  return;
}
ws.send(audioBuffer);
```

**Reconnection Strategy:**
```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function reconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('Max reconnect attempts reached');
    return;
  }
  
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
  
  setTimeout(() => {
    console.log(`Reconnecting... (attempt ${reconnectAttempts})`);
    connect();
  }, delay);
}
```

---

#### **4.1.7 Complete Example**

**Frontend Implementation:**

See [`src/services/audioStreamService.ts`](src/services/audioStreamService.ts) for full implementation.

**Key Methods:**
- `connect(userId)`: Establish WebSocket connection
- `startStreaming(mediaStream)`: Begin audio streaming
- `stopStreaming()`: Stop audio streaming
- `disconnect()`: Close WebSocket connection

**Usage:**
```typescript
import { audioStreamService } from './services/audioStreamService';

// 1. Connect to WebSocket
await audioStreamService.connect('user-123');

// 2. Get microphone access
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// 3. Start streaming
audioStreamService.startStreaming(stream);

// 4. Later: Stop streaming
audioStreamService.stopStreaming();

// 5. Disconnect
audioStreamService.disconnect();
```

**Backend Implementation:**

See [`backend/packet-verifier.js`](backend/packet-verifier.js) for full implementation.

**Architecture Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:1105-1280`](BACKEND_INTERNAL_ARCHITECTURE.md) for complete dual verification flow.

---

## 5. Error Handling

### **5.1 Error Response Format**

All error responses follow this structure:

```json
{
  "success": false,
  "error": "Detailed error message",
  "message": "User-friendly message (optional)"
}
```

---

### **5.2 HTTP Status Codes**

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful request |
| **400** | Bad Request | Invalid input, validation failed |
| **404** | Not Found | Resource does not exist |
| **500** | Internal Server Error | Database error, server error |
| **503** | Service Unavailable | Database unreachable (health check) |

---

### **5.3 Common Errors**

#### **Validation Errors (400)**

**Missing Required Field:**
```json
{
  "success": false,
  "error": "username is required"
}
```

**Wrong Type:**
```json
{
  "success": false,
  "error": "isMuted must be a boolean"
}
```

**Multiple Validation Errors:**
```json
{
  "success": false,
  "error": "deviceId and deviceLabel are required"
}
```

---

#### **Not Found Errors (404)**

**User Does Not Exist:**
```json
{
  "success": false,
  "error": "User not found"
}
```

**Suggestion to Create:**
```json
{
  "success": false,
  "error": "User not found. Create user state first with POST /api/users/:userId/state"
}
```

---

#### **Server Errors (500)**

**Database Error:**
```json
{
  "success": false,
  "error": "Failed to update user state"
}
```

**Generic Error:**
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

### **5.4 Error Handling Best Practices**

#### **Frontend Error Handling:**

```typescript
try {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/mute`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isMuted: true })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    console.error('API error:', result.error);
    // Handle error: show toast notification, retry, fallback
    return null;
  }

  return result.data;
} catch (error) {
  console.error('Network error:', error);
  // Handle network failure: offline mode, retry
  return null;
}
```

#### **Graceful Degradation:**

If backend is unavailable, frontend should:
1. Continue functioning with local state
2. Queue operations for retry when backend recovers
3. Show user a warning (e.g., "Saving changes locally")

**Frontend Reference:** [`src/services/backendService.ts`](src/services/backendService.ts) implements graceful degradation (returns `null` on error).

---

## 6. API Integration Guide

### **6.1 Typical User Flow**

**Meeting Join & Mute/Unmute with Dual Verification:**

```javascript
// 1. User joins meeting
await updateUserState(
  'user-123',
  'Alice',
  false,          // Initially unmuted
  'default',
  'Built-in Microphone',
  'room-456'
);

// 2. Connect WebSocket for packet verification (Method 2)
await audioStreamService.connect('user-123');
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
audioStreamService.startStreaming(stream);

// 3. User clicks mute button
await updateMuteStatus('user-123', true);

// 4. Wait 500ms for hardware to settle
await new Promise(resolve => setTimeout(resolve, 500));

// 5. Verify mute via Web Audio API (Method 1)
const isVerified = audioService.verifyMuteState();
await updateMuteVerification('user-123', isVerified);

// 6. Backend simultaneously verifies via packet inspection (Method 2)
// (happens automatically via WebSocket - no additional API call needed)

// 7. Check verification status from both methods
const userState = await getUserState('user-123');
console.log('Method 1 (Web Audio):', userState.verifiedMuted);
console.log('Method 2 (Packet):', userState.packetVerifiedMuted);

// 8. User switches device
await updateDevice('user-123', 'usb-mic-001', 'Blue Yeti');
// Note: Mute status preserved!

// 9. User leaves meeting
audioStreamService.stopStreaming();
audioStreamService.disconnect();
await deleteUserState('user-123');
```

---

### **6.2 Frontend Integration Example**

**Complete integration using all APIs:**

```typescript
import { 
  updateUserState,
  updateMuteStatus,
  updateDevice,
  updateMuteVerification,
  getUserState,
  getRoomUsers
} from './services/backendService';
import { audioStreamService } from './services/audioStreamService';
import { audioService } from './services/audioService';

async function handleMeetingFlow() {
  const userId = 'user-123';
  const roomId = 'room-456';
  
  // Initialize user
  await updateUserState(userId, 'Alice', false, 'default', 'Built-in Microphone', roomId);
  
  // Start audio streaming for packet verification
  await audioStreamService.connect(userId);
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  await audioService.init(stream);
  audioStreamService.startStreaming(stream);
  
  // Mute with dual verification
  audioService.mute();
  await updateMuteStatus(userId, true);
  await new Promise(r => setTimeout(r, 500));
  const verified = audioService.verifyMuteState();
  await updateMuteVerification(userId, verified);
  
  // Switch device (preserves mute)
  const newStream = await navigator.mediaDevices.getUserMedia({ 
    audio: { deviceId: 'usb-mic-001' } 
  });
  await audioService.switchMicrophone(newStream);
  await updateDevice(userId, 'usb-mic-001', 'Blue Yeti');
  
  // Unmute
  audioService.unmute();
  await updateMuteStatus(userId, false);
  
  // Get room users
  const roomUsers = await getRoomUsers(roomId);
  console.log('Users in room:', roomUsers);
  
  // Cleanup
  audioStreamService.stopStreaming();
  audioStreamService.disconnect();
  await deleteUserState(userId);
}
```

---

### **6.3 Testing APIs**

#### **Using curl:**

```bash
# Health check
curl http://localhost:3001/api/health

# Create user
curl -X POST http://localhost:3001/api/users/test-user/state \
  -H "Content-Type: application/json" \
  -d '{"username":"Test","isMuted":false,"deviceId":"default","deviceLabel":"Test Mic","roomId":"test-room"}'

# Update mute
curl -X PATCH http://localhost:3001/api/users/test-user/mute \
  -H "Content-Type: application/json" \
  -d '{"isMuted":true}'

# Verify mute
curl -X PATCH http://localhost:3001/api/users/test-user/verify \
  -H "Content-Type: application/json" \
  -d '{"verifiedMuted":true}'

# Get user
curl http://localhost:3001/api/users/test-user

# Get room users
curl http://localhost:3001/api/rooms/test-room/users

# Delete user
curl -X DELETE http://localhost:3001/api/users/test-user
```

#### **Using Postman:**

**Import Collection:** See [`backend/README.md`](backend/README.md) for example requests.

**Environment Variables:**
- `BASE_URL`: `http://localhost:3001/api`
- `USER_ID`: `test-user`
- `ROOM_ID`: `test-room`

---

## 7. API Versioning

### **7.1 Current Version**

**Version:** 1.3.0 (Dual Verification Support)

**Version History:**
- **v1.0.0** (Oct 20, 2025): Initial API (basic CRUD)
- **v1.1.0** (Oct 21, 2025): Added username field
- **v1.2.0** (Oct 22, 2025): Added `verifiedMuted` (Method 1: Web Audio API)
- **v1.3.0** (Oct 23, 2025): Added `packetVerifiedMuted`, `packetVerifiedAt`, and WebSocket endpoint (Method 2: Packet Inspection)

---

### **7.2 Versioning Strategy**

**Current:** No version in URL (demo environment)

**Future (Production):**
- URL versioning: `/api/v1/users`, `/api/v2/users`
- Header versioning: `Accept: application/vnd.api+json; version=1`

**Breaking Changes:**
- Field removal or rename
- Required field addition
- Response format change
- Endpoint removal

**Non-Breaking Changes:**
- Optional field addition (e.g., `packetVerifiedMuted`)
- New endpoint addition
- Response field addition

---

## 8. Performance Characteristics

### **8.1 Latency**

**Measured on local development (M1 Mac):**

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `GET /api/health` | 2ms | 5ms | 10ms |
| `GET /api/users/:userId` | 1ms | 3ms | 8ms |
| `POST /api/users/:userId/state` | 3ms | 8ms | 15ms |
| `PATCH /api/users/:userId/mute` | 2ms | 6ms | 12ms |
| `PATCH /api/users/:userId/device` | 2ms | 6ms | 12ms |
| `PATCH /api/users/:userId/verify` | 2ms | 6ms | 12ms |
| `GET /api/users/:userId/packet-verification` | 1ms | 3ms | 8ms |

**Production estimate (AWS t2.micro):**
- ~2-5x slower than local (5-30ms per request)

**WebSocket Audio Streaming:**
- Latency: ~10-50ms per buffer
- Frequency: ~10.75 buffers/second
- Bandwidth: ~176 KB/s per user

---

### **8.2 Throughput**

**Current scale (10 users):**
- Concurrent requests: ~100 req/s
- WebSocket connections: 10 simultaneous
- Total bandwidth: ~1.76 MB/s (audio streaming)

**Estimated scale (100 users):**
- Would require optimization (async database, connection pooling)
- Bandwidth: ~17.6 MB/s (may need audio compression)

**Cross-Reference:** See [`USER_STORIES_BACKEND_SPEC.md:242`](USER_STORIES_BACKEND_SPEC.md) for performance details.

---

### **8.3 Rate Limiting**

**Current:** None (demo environment, 10 users max)

**Future (Production):**
- Per-user: 100 requests/minute
- Per-IP: 1000 requests/minute
- WebSocket: 1 connection per user

---

## 9. Security Considerations

### **9.1 Current Security (Demo)**

**Authentication:** ⚠️ None  
**Authorization:** ⚠️ None  
**Encryption:** ⚠️ HTTP only (no HTTPS)  
**Input Validation:** ✅ Type checking, required field validation  
**SQL Injection:** ✅ Protected (prepared statements)  
**CORS:** ✅ Enabled (allows all origins)  

---

### **9.2 Production Security (Recommended)**

**Authentication:**
- JWT tokens (Bearer authentication)
- Token expiration: 1 hour
- Refresh token support

**Authorization:**
- Users can only modify their own state
- Room-based permissions

**Encryption:**
- HTTPS/TLS for REST API
- WSS (WebSocket Secure) for audio streaming

**Input Validation:**
- JSON schema validation
- Rate limiting per user
- Request size limits

**Example (with auth):**
```http
GET /api/users/user-123 HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 10. Monitoring & Observability

### **10.1 Structured Logging**

All requests logged in JSON format:

```json
{
  "timestamp": "2025-10-23T12:00:00.000Z",
  "requestId": "abc123def",
  "method": "PATCH",
  "path": "/api/users/user-123/mute",
  "statusCode": 200,
  "duration": 3,
  "userId": "user-123",
  "isError": false,
  "isSlowRequest": false
}
```

**Implementation Reference:** [`backend/server.js:26-98`](backend/server.js)

---

### **10.2 Metrics Endpoint**

**Endpoint:** `GET /api/metrics`

**Returns:**
- Total/successful/failed request counts
- Average response time
- Error rate
- Per-endpoint statistics

**Use Cases:**
- Grafana dashboards
- CloudWatch alarms
- Performance monitoring

**Implementation Reference:** [`backend/metrics.js`](backend/metrics.js)

---

### **10.3 Health Check Endpoint**

**Endpoint:** `GET /api/health`

**Returns:**
- Server status
- Database connectivity
- Memory usage
- Uptime

**Use Cases:**
- AWS ELB health checks
- Kubernetes liveness probes
- Deployment verification

**Cross-Reference:** See [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) for operational procedures.

---

## 11. Cross-References

### **Implementation Files**

| File | Purpose |
|------|---------|
| [`backend/server.js`](backend/server.js) | All REST endpoints + WebSocket initialization |
| [`backend/database.js`](backend/database.js) | Database CRUD operations |
| [`backend/packet-verifier.js`](backend/packet-verifier.js) | WebSocket server + packet inspection |
| [`src/services/backendService.ts`](src/services/backendService.ts) | Frontend REST API client |
| [`src/services/audioStreamService.ts`](src/services/audioStreamService.ts) | Frontend WebSocket client |

### **Related Documentation**

| Document | Relevant Sections |
|----------|------------------|
| [`BACKEND_INTERNAL_ARCHITECTURE.md`](BACKEND_INTERNAL_ARCHITECTURE.md) | Section 1 (REST API), Section 4 (Dual Verification) |
| [`USER_STORIES_BACKEND_SPEC.md`](USER_STORIES_BACKEND_SPEC.md) | Module features, limitations, responsibilities |
| [`STABLE_STORAGE_SPECIFICATION.md`](STABLE_STORAGE_SPECIFICATION.md) | Data schemas, persistence |
| [`DATA_ABSTRACTIONS.md`](DATA_ABSTRACTIONS.md) | UserState abstraction, API response format |
| [`backend/README.md`](backend/README.md) | Quick start, example requests |
| [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) | Deployment, monitoring, troubleshooting |

---

## 12. Changelog

### **Version 1.3.0 (October 23, 2025)**
- ✨ Added `packetVerifiedMuted` and `packetVerifiedAt` fields to UserState
- ✨ Added WebSocket endpoint `/audio-stream` for audio packet streaming
- ✨ Added `GET /api/users/:userId/packet-verification` endpoint
- 🔄 Updated all endpoints to return new verification fields
- 📚 Completed dual verification architecture (Method 1 + Method 2)

### **Version 1.2.0 (October 22, 2025)**
- ✨ Added `verifiedMuted` field to UserState
- ✨ Added `PATCH /api/users/:userId/verify` endpoint
- 📚 Added Web Audio API verification (Method 1)

### **Version 1.1.0 (October 21, 2025)**
- ✨ Added `username` field to UserState
- 🔄 Made `username` required in `POST /api/users/:userId/state`

### **Version 1.0.0 (October 20, 2025)**
- 🎉 Initial API release
- ✨ Basic CRUD operations for user state
- ✨ Health and metrics endpoints

---

**Last Updated:** October 23, 2025  
**API Version:** 1.3.0  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each milestone  
**Contact:** See project README for support

