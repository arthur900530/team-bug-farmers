# Data Abstractions

**Purpose:** Formal definition of data abstractions for backend modules  
**Reference:** MIT 6.005 Reading 13 - Abstraction Functions & Rep Invariants  
**Audience:** Backend Developers, Technical Reviewers  

---

## Module 1: User State (`backend/database.js`)

### **Abstract Value**

A user's audio and device state in a meeting, including:
- User identity (userId, username)
- Mute status (user intent + dual verification results)
- Audio device selection
- Meeting room membership
- Temporal information (creation and last update timestamps)

### **Representation**

```javascript
{
  userId: string,                    // Primary key
  username: string,
  isMuted: 0 | 1,                    // SQLite INTEGER (0 = false, 1 = true)
  verifiedMuted: 0 | 1 | null,       // SQLite INTEGER or NULL (Web Audio API verification)
  packetVerifiedMuted: 0 | 1 | null, // SQLite INTEGER or NULL (Packet inspection verification)
  packetVerifiedAt: string | null,   // ISO 8601 timestamp of last packet verification
  deviceId: string | null,
  deviceLabel: string | null,
  roomId: string | null,
  lastUpdated: string,               // ISO 8601 timestamp
  createdAt: string                  // ISO 8601 timestamp
}
```

**Stable Storage:** SQLite database file `audio-states.db` with indexes on `roomId`, `lastUpdated`, `username`

### **Abstraction Function**

AF(r) = A user state where:
- Identity: (r.userId, r.username)
- Mute: user clicked mute if r.isMuted = 1
- Verification: 
  - Web Audio API verified muted if r.verifiedMuted = 1
  - Packet inspection verified muted if r.packetVerifiedMuted = 1
  - Last packet verification at r.packetVerifiedAt
- Device: currently using device (r.deviceId, r.deviceLabel) if non-null
- Location: in meeting room r.roomId if non-null
- Timeline: created at r.createdAt, last modified at r.lastUpdated

### **Representation Invariant**

- `userId`: non-empty string, unique across all records
- `username`: non-empty string
- `isMuted` ∈ {0, 1}
- `verifiedMuted` ∈ {0, 1, null}
- `packetVerifiedMuted` ∈ {0, 1, null}
- `packetVerifiedAt`: valid ISO 8601 timestamp string or null
- If `packetVerifiedMuted` is non-null, then `packetVerifiedAt` must be non-null
- `deviceId`, `deviceLabel`, `roomId`: string or null (nullable fields)
- `lastUpdated`, `createdAt`: valid ISO 8601 timestamp strings
- `lastUpdated` ≥ `createdAt` (chronological order)
- `packetVerifiedAt` ≤ current time (no future timestamps)

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
// In-memory: Audio sample buffers per user (transient)
Map<userId, {
  samples: Float32Array[],  // Ring buffer of audio samples
  lastUpdate: number        // Unix timestamp (ms)
}>

// Stable storage: Verification results in SQLite (persisted)
// Stored in user_states table as:
// - packetVerifiedMuted: 0 | 1 | null
// - packetVerifiedAt: ISO 8601 timestamp | null
```

### **Abstraction Function**

AF(buffers, database) = For each user:
- Audio stream (transient): sequence of Float32Array samples received in last 1000ms
- Verification status (persisted): user is transmitting silence (muted) or audio (unmuted)
- Freshness (persisted): timestamp of last packet verification

**Design rationale:** Audio samples are transient (in-memory) because they're processed immediately; verification results are persisted (database) to survive crashes.

### **Representation Invariant**

**In-memory (audio buffers):**
- `userId`: non-empty string keys
- `samples`: array of Float32Array objects (each ~4096 samples)
- `lastUpdate`: positive integer (Unix epoch ms)
- Sample buffer contains only data from last `VERIFICATION_WINDOW_MS` (1000ms)

**Persisted (database):**
- `packetVerifiedMuted` ∈ {0, 1, null} (boolean computed from RMS energy < 0.01 threshold)
- `packetVerifiedAt`: valid ISO 8601 timestamp or null
- If `packetVerifiedMuted` is non-null, then `packetVerifiedAt` must be non-null
- `packetVerifiedAt` ≤ current time (no future timestamps)

### **Safety from Rep Exposure**

- ✅ In-memory Map is private to the module (not exported)
- ✅ WebSocket connections identified by userId (no connection object exposure)
- ✅ Float32Array samples are consumed immediately for RMS calculation (not exposed)
- ✅ Verification results read from database (immutable after retrieval)
- ✅ Database handles persistence (no direct file system exposure)

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

## 📦 **Stable Storage Summary**

### **What's Persisted to SQLite (`audio-states.db`)**

| Data | Storage | Survives Crashes | Rationale |
|------|---------|------------------|-----------|
| User identity (userId, username) | ✅ Database | ✅ Yes | Critical: cannot lose user identities |
| Mute intent (isMuted) | ✅ Database | ✅ Yes | Critical: state must survive server restart |
| Web Audio verification (verifiedMuted) | ✅ Database | ✅ Yes | Important: verification result from frontend |
| Packet verification (packetVerifiedMuted) | ✅ Database | ✅ Yes | Important: verification result from backend |
| Packet verification time (packetVerifiedAt) | ✅ Database | ✅ Yes | Important: freshness tracking for verification |
| Device selection (deviceId, deviceLabel) | ✅ Database | ✅ Yes | Important: user device preference |
| Room membership (roomId) | ✅ Database | ✅ Yes | Important: meeting context |
| Timestamps (createdAt, lastUpdated) | ✅ Database | ✅ Yes | Important: audit trail |

### **What's NOT Persisted (In-Memory Only)**

| Data | Storage | Survives Crashes | Rationale |
|------|---------|------------------|-----------|
| Raw audio samples (Float32Array[]) | ❌ Memory | ❌ No | Transient: processed immediately, not needed after analysis |
| WebSocket connections | ❌ Memory | ❌ No | Transient: clients reconnect after server restart |
| Audio buffer timestamps | ❌ Memory | ❌ No | Transient: stale after 30 seconds anyway |
| API responses | ❌ Memory | ❌ No | Transient: generated on-demand from database |

### **Storage Architecture**

```
┌─────────────────────┐
│   Frontend Client   │
│   (Web Audio API)   │
└──────────┬──────────┘
           │ WebSocket (audio samples)
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│  packet-verifier.js │────▶│  In-Memory Buffers   │ (Transient)
│  (RMS analysis)     │     │  Float32Array[]      │
└──────────┬──────────┘     └──────────────────────┘
           │ persist()
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│    database.js      │────▶│  SQLite Database     │ (Stable)
│  (CRUD operations)  │     │  audio-states.db     │
└─────────────────────┘     └──────────────────────┘
                                      │
                                      │ WAL mode
                                      ▼
                            ┌──────────────────────┐
                            │  Disk Storage        │ (Persistent)
                            │  .db, .wal, .shm     │
                            └──────────────────────┘
```

### **Benefits of This Design**

1. **Crash Resilience:** Critical state (mute, verification, device) survives server restarts
2. **Memory Efficiency:** Only recent audio samples (1 second window) kept in memory
3. **Performance:** Fast in-memory processing of audio; slower database only for results
4. **Auditability:** All verification results and state changes persisted with timestamps

---

**Last Updated:** October 23, 2025  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each milestone

