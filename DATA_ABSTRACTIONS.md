# Data Abstractions

**Purpose:** Formal definition of data abstractions for backend modules  
**Reference:** MIT 6.005 Reading 13 - Abstraction Functions & Rep Invariants  
**Audience:** Backend Developers, Technical Reviewers  

---

## Module 1: User State (`backend/database.js`)

### **Abstract Value**

A user's audio and device state in a meeting, including:
- User identity (userId, username)
- Mute status (user intent + verification result)
- Audio device selection
- Meeting room membership
- Temporal information (creation and last update timestamps)

### **Representation**

```javascript
{
  userId: string,           // Primary key
  username: string,
  isMuted: 0 | 1,          // SQLite INTEGER (0 = false, 1 = true)
  verifiedMuted: 0 | 1 | null,  // SQLite INTEGER or NULL
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null,
  lastUpdated: string,     // ISO 8601 timestamp
  createdAt: string        // ISO 8601 timestamp
}
```

**Storage:** SQLite table `user_states` with indexes on `roomId`, `lastUpdated`, `username`

### **Abstraction Function**

AF(r) = A user state where:
- Identity: (r.userId, r.username)
- Mute: user clicked mute if r.isMuted = 1, hardware verified muted if r.verifiedMuted = 1
- Device: currently using device (r.deviceId, r.deviceLabel) if non-null
- Location: in meeting room r.roomId if non-null
- Timeline: created at r.createdAt, last modified at r.lastUpdated

### **Representation Invariant**

- `userId`: non-empty string, unique across all records
- `username`: non-empty string
- `isMuted` ∈ {0, 1}
- `verifiedMuted` ∈ {0, 1, null}
- `deviceId`, `deviceLabel`, `roomId`: string or null (nullable fields)
- `lastUpdated`, `createdAt`: valid ISO 8601 timestamp strings
- `lastUpdated` ≥ `createdAt` (chronological order)

### **Safety from Rep Exposure**

- ✅ All fields are immutable types (strings, numbers) or null
- ✅ Database module returns plain JavaScript objects (no mutable references)
- ✅ Boolean conversion at module boundary (INTEGER ↔ boolean)
- ✅ No direct database handle exposed to clients

---

## Module 2: Packet Verification State (`backend/packet-verifier.js`)

### **Abstract Value**

Per-user audio stream analysis tracking whether a user's microphone is actually transmitting audio (silence detection for mute verification).

### **Representation**

```javascript
// Audio sample buffers per user
Map<userId, {
  samples: Float32Array[],  // Ring buffer of audio samples
  lastUpdate: number        // Unix timestamp (ms)
}>

// Verification results cache
Map<userId, {
  isVerifiedMuted: boolean,  // true = silence detected, false = audio detected
  lastVerified: number       // Unix timestamp (ms)
}>
```

### **Abstraction Function**

AF(buffers, cache) = For each user:
- Audio stream: sequence of Float32Array samples received in last 1000ms
- Verification status: user is transmitting silence (muted) or audio (unmuted)
- Freshness: timestamp of last received sample and last verification

### **Representation Invariant**

- `userId`: non-empty string keys in both Maps
- `samples`: array of Float32Array objects (each 4096 samples)
- `lastUpdate`, `lastVerified`: positive integers (Unix epoch ms)
- `isVerifiedMuted`: boolean computed from RMS energy < 0.01 threshold
- Sample buffer contains only data from last `VERIFICATION_WINDOW_MS` (1000ms)

### **Safety from Rep Exposure**

- ✅ Maps are private to the module (not exported)
- ✅ WebSocket connections identified by userId (no connection object exposure)
- ✅ Float32Array samples are consumed immediately for RMS calculation
- ⚠️ Verification results returned as plain objects (safe, immutable)

---

## Module 3: API Response Format (`backend/server.js`)

### **Abstract Value**

A standardized HTTP response wrapping operation results, indicating success/failure and providing data or error information.

### **Representation**

```javascript
// Success response
{
  success: true,
  data: T,              // Generic type (UserState, array, etc.)
  message?: string      // Optional human-readable message
}

// Error response
{
  success: false,
  error: string,        // Error description
  message?: string      // Optional additional context
}
```

### **Abstraction Function**

AF(r) = An API operation result where:
- Operation succeeded if r.success = true, failed if r.success = false
- Result payload: r.data (on success) or r.error (on failure)
- Optional context: r.message provides human-readable description

### **Representation Invariant**

- `success`: boolean (always present)
- If `success = true`: `data` field present, `error` field absent
- If `success = false`: `error` field present (non-empty string), `data` field absent
- `message`: string or undefined (optional in both cases)
- `data`: type depends on endpoint (UserState, UserState[], HealthStatus, etc.)

### **Safety from Rep Exposure**

- ✅ Response objects are serialized to JSON (deep copy, no references)
- ✅ All data types are primitives, plain objects, or arrays (no mutable ADTs)
- ✅ UserState objects from database are already safe (see Module 1)

---

**Last Updated:** October 23, 2025  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each milestone

