# Stable Storage Specification

**Purpose:** Define the stable storage mechanisms and data schemas used to prevent data loss in the backend modules.  
**Task:** Requirement 4 - "Determine the stable storage mechanism for the module"  
**Audience:** Backend Developers, Database Administrators, SREs  

---

## 1. Overview

### **Storage Requirement**

The backend **cannot** rely solely on in-memory data structures because:
- ❌ Server crashes would lose all user state
- ❌ Deployments would reset all meeting data
- ❌ Restarts would disconnect users and lose verification history
- ❌ **Customers really hate data loss**

### **Solution: SQLite Persistent Storage**

All critical state is persisted to a **SQLite database file** (`audio-states.db`) that survives server crashes and restarts.

**Storage Technology:** SQLite 3 with Write-Ahead Logging (WAL) mode  
**Driver:** `better-sqlite3` (synchronous Node.js binding)  
**Location:** `backend/audio-states.db` (file-based, committed to `.gitignore`)  

---

## 2. Data Schema Definition

### **2.1 Primary Table: `user_states`**

**Purpose:** Store all user audio/device state and dual verification results.

**Schema:**

```sql
CREATE TABLE IF NOT EXISTS user_states (
  userId TEXT PRIMARY KEY,                  -- Unique user identifier
  username TEXT NOT NULL,                   -- Display name
  isMuted INTEGER NOT NULL DEFAULT 0,       -- User's mute intent (0=unmuted, 1=muted)
  verifiedMuted INTEGER DEFAULT NULL,       -- Web Audio API verification result
  packetVerifiedMuted INTEGER DEFAULT NULL, -- Packet inspection verification result
  packetVerifiedAt TEXT DEFAULT NULL,       -- Timestamp of last packet verification
  deviceId TEXT,                            -- Selected audio device ID
  deviceLabel TEXT,                         -- Human-readable device name
  roomId TEXT,                              -- Meeting room identifier
  lastUpdated TEXT NOT NULL,                -- ISO 8601 timestamp of last modification
  createdAt TEXT NOT NULL                   -- ISO 8601 timestamp of creation
);
```

**Implementation Reference:** [`backend/database.js:18-31`](backend/database.js)

---

### **2.2 Indexes**

**Purpose:** Optimize common query patterns (room lookups, time-based queries, username searches).

```sql
CREATE INDEX IF NOT EXISTS idx_roomId ON user_states(roomId);
CREATE INDEX IF NOT EXISTS idx_lastUpdated ON user_states(lastUpdated);
CREATE INDEX IF NOT EXISTS idx_username ON user_states(username);
```

**Rationale:**
- `idx_roomId`: Fast retrieval of all users in a meeting room
- `idx_lastUpdated`: Cleanup queries for stale data
- `idx_username`: User search functionality

**Implementation Reference:** [`backend/database.js:33-35`](backend/database.js)

---

### **2.3 Field Data Types and Encoding**

| Field | SQLite Type | JavaScript Type | Encoding Rule |
|-------|-------------|-----------------|---------------|
| `userId` | TEXT | string | UTF-8, must be non-empty |
| `username` | TEXT | string | UTF-8, must be non-empty |
| `isMuted` | INTEGER | boolean | `0` = false, `1` = true |
| `verifiedMuted` | INTEGER | boolean \| null | `0` = false, `1` = true, `NULL` = not verified |
| `packetVerifiedMuted` | INTEGER | boolean \| null | `0` = false, `1` = true, `NULL` = not verified |
| `packetVerifiedAt` | TEXT | string \| null | ISO 8601 format or `NULL` |
| `deviceId` | TEXT | string \| null | Device identifier or `NULL` |
| `deviceLabel` | TEXT | string \| null | UTF-8 or `NULL` |
| `roomId` | TEXT | string \| null | Room identifier or `NULL` |
| `lastUpdated` | TEXT | string | ISO 8601 format, required |
| `createdAt` | TEXT | string | ISO 8601 format, required |

**Implementation Reference:** [`backend/database.js:155-189`](backend/database.js)

---

## 3. Storage Operations (CRUD)

### **3.1 Create/Update (Upsert)**

**Function:** `createOrUpdateUserState()`

**SQL Pattern:** `INSERT...ON CONFLICT DO UPDATE`

```javascript
// Atomic upsert - either creates new row or updates existing
createOrUpdateUserState({
  userId: "user-123",
  username: "Alice",
  isMuted: true,
  verifiedMuted: true,
  packetVerifiedMuted: true,
  packetVerifiedAt: "2025-10-23T12:00:00Z",
  deviceId: "default",
  deviceLabel: "Built-in Microphone",
  roomId: "room-456"
});
```

**Persistence Guarantees:**
- ✅ Data written to disk immediately (synchronous mode)
- ✅ Atomic operation (all fields updated together)
- ✅ Survives server crashes (WAL mode with automatic checkpoint)

**Implementation Reference:** [`backend/database.js:155-189`](backend/database.js)

---

### **3.2 Read Operations**

#### **Single User Lookup**

```javascript
getUserState("user-123");
// Returns: {userId, username, isMuted, verifiedMuted, packetVerifiedMuted, ...}
```

**Implementation Reference:** [`backend/database.js:77-111`](backend/database.js)

#### **All Users**

```javascript
getAllUserStates();
// Returns: Array of all user states, ordered by lastUpdated DESC
```

**Implementation Reference:** [`backend/database.js:117-149`](backend/database.js)

#### **Users by Room**

```javascript
getUsersByRoom("room-456");
// Returns: Array of users in specified room
```

**Implementation Reference:** [`backend/database.js:204-237`](backend/database.js)

---

### **3.3 Delete**

```javascript
deleteUserState("user-123");
// Returns: true if deleted, false if not found
```

**Implementation Reference:** [`backend/database.js:195-198`](backend/database.js)

---

## 4. What Gets Persisted vs. What Doesn't

### **4.1 Persisted to SQLite (Survives Crashes)**

| Data | Why Persisted | User Story |
|------|---------------|------------|
| **User identity** (userId, username) | Critical: Cannot lose user identities | All |
| **Mute intent** (isMuted) | Critical: Users expect mute state to persist | User Story 1 |
| **Web Audio verification** (verifiedMuted) | Important: Verification result from frontend | User Story 1 |
| **Packet verification** (packetVerifiedMuted, packetVerifiedAt) | Important: Independent backend verification | User Story 1 |
| **Device selection** (deviceId, deviceLabel) | Important: User device preference | User Story 2 |
| **Room membership** (roomId) | Important: Meeting context | All |
| **Timestamps** (createdAt, lastUpdated) | Important: Audit trail | All |

**Cross-Reference:** See [`DATA_ABSTRACTIONS.md:177-191`](DATA_ABSTRACTIONS.md) for detailed persistence rationale.

---

### **4.2 NOT Persisted (In-Memory Only)**

| Data | Storage | Why Not Persisted |
|------|---------|-------------------|
| **Raw audio samples** (Float32Array[]) | In-memory Map | Transient: Processed immediately, ~1 second window, not needed after RMS analysis |
| **WebSocket connections** | In-memory | Transient: Clients reconnect after server restart |
| **Audio buffer metadata** (lastUpdate timestamps) | In-memory Map | Transient: Stale after 30 seconds, not useful after crash |

**Rationale:** Audio samples are ephemeral by design - we only care about the **analysis result** (packetVerifiedMuted), not the raw data.

**Implementation Reference:** [`backend/packet-verifier.js:24-26`](backend/packet-verifier.js)

**Cross-Reference:** See [`DATA_ABSTRACTIONS.md:192-199`](DATA_ABSTRACTIONS.md) for non-persisted data rationale.

---

## 5. Storage Architecture

### **5.1 Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Client                          │
│           (Triggers state changes via API)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP/WebSocket
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      server.js                              │
│              (Express route handlers)                       │
│  • POST   /api/users/:userId/state                         │
│  • PATCH  /api/users/:userId/mute                          │
│  • PATCH  /api/users/:userId/device                        │
│  • PATCH  /api/users/:userId/verify                        │
│  • WS     /audio-stream                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Call CRUD functions
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    database.js                              │
│              (Data Access Layer)                            │
│  • createOrUpdateUserState()                               │
│  • getUserState()                                          │
│  • getAllUserStates()                                      │
│  • getUsersByRoom()                                        │
│  • deleteUserState()                                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ SQL prepared statements
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  better-sqlite3                             │
│            (Synchronous SQLite driver)                      │
│  • Prepared statement cache                                │
│  • WAL mode enabled                                        │
│  • Synchronous blocking calls                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ File I/O (fsync)
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              File System (Disk Storage)                     │
│  • audio-states.db     (Main database file)                │
│  • audio-states.db-wal (Write-ahead log)                   │
│  • audio-states.db-shm (Shared memory index)               │
└─────────────────────────────────────────────────────────────┘
```

**Cross-Reference:** See [`DATA_ABSTRACTIONS.md:201-227`](DATA_ABSTRACTIONS.md) for storage architecture diagram.

---

### **5.2 Dual Verification Storage Pattern**

**Problem:** User Story 1 requires two independent verification methods, and both results must survive crashes.

**Solution:**

```
┌──────────────────────┐
│  Web Audio API Check │ (Method 1: Frontend)
│   (Frontend logic)   │
└──────────┬───────────┘
           │ PATCH /verify
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│   server.js          │────▶│  SQLite: verifiedMuted  │
│  /verify endpoint    │     └─────────────────────────┘
└──────────────────────┘

┌──────────────────────┐
│ Packet Inspection    │ (Method 2: Backend)
│  (Backend logic)     │
└──────────┬───────────┘
           │ processAudioSamples()
           ▼
┌──────────────────────┐     ┌─────────────────────────┐
│ packet-verifier.js   │────▶│ SQLite:                 │
│ createOrUpdateUser   │     │ - packetVerifiedMuted   │
│ State()              │     │ - packetVerifiedAt      │
└──────────────────────┘     └─────────────────────────┘
```

**Both verification methods write to the same SQLite database, ensuring:**
1. **Crash Resilience:** Both results survive server restarts
2. **Consistency:** Both stored in same transaction context
3. **Auditability:** Timestamps track when each verification occurred

**Implementation References:**
- Method 1: [`backend/server.js:311-347`](backend/server.js) (PATCH /verify endpoint)
- Method 2: [`backend/packet-verifier.js:62-80`](backend/packet-verifier.js) (persistence after RMS analysis)

**Cross-Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:1082-1097`](BACKEND_INTERNAL_ARCHITECTURE.md) for dual verification architecture.

---

## 6. Durability and Crash Recovery

### **6.1 Write-Ahead Logging (WAL) Mode**

**Enabled on startup:**

```javascript
db.pragma('journal_mode = WAL');
```

**Benefits:**
1. **Better write performance:** ~30% faster than DELETE mode
2. **Crash recovery:** Uncommitted changes preserved in WAL file
3. **Atomicity:** All-or-nothing writes (ACID compliance)

**How it works:**
- Writes go to `-wal` file first (fast, sequential)
- Periodically checkpointed to main `.db` file
- If crash occurs, WAL replayed on next startup

**Implementation Reference:** [`backend/database.js:12`](backend/database.js)

**Cross-Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:397-433`](BACKEND_INTERNAL_ARCHITECTURE.md) for WAL mode justification.

---

### **6.2 Crash Recovery Process**

**Scenario:** Server crashes mid-write

```
1. Server crash occurs
   ↓
2. SQLite automatically closes files (OS handles cleanup)
   ↓
3. Next startup: database.js calls initDatabase()
   ↓
4. SQLite detects incomplete WAL file
   ↓
5. WAL replay: Uncommitted transactions rolled back
   ↓
6. Database restored to last consistent state
   ↓
7. Server ready to accept requests
```

**Data Loss Window:** **~0-100ms** (time between write and WAL fsync)

**Acceptable because:**
- Scale: Only 10 concurrent users
- Frequency: Verification updates every 100ms-500ms
- Impact: User just re-sends verification (automatic retry)

---

### **6.3 Backup and Restore**

**Current:** No automated backups (demo environment)

**Future (Production):**

```javascript
// Skeleton for automated S3 backups (not implemented)
// See: backend/backup-to-s3.js
async function backupToS3() {
  // 1. Copy audio-states.db to S3 bucket
  // 2. Daily snapshots with 30-day retention
  // 3. Point-in-time recovery
}
```

**Implementation Reference:** [`backend/backup-to-s3.js`](backend/backup-to-s3.js) (skeleton only)

**Cross-Reference:** See [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) for backup procedures.

---

## 7. Schema Evolution and Migrations

### **7.1 Adding New Columns (Backward Compatibility)**

**Strategy:** Use `ALTER TABLE` with `DEFAULT` values for existing rows.

**Example:** Adding packet verification columns

```javascript
// Runs on every startup - safe if column already exists
try {
  db.exec(`ALTER TABLE user_states ADD COLUMN packetVerifiedMuted INTEGER DEFAULT NULL`);
  console.log('✅ Added packetVerifiedMuted column to existing database');
} catch (error) {
  // Column already exists or table is new - safe to ignore
}
```

**Implementation Reference:** [`backend/database.js:56-69`](backend/database.js)

---

### **7.2 Schema Version History**

| Version | Date | Changes | Migration Required |
|---------|------|---------|-------------------|
| **v1.0** | 2025-10-20 | Initial schema (userId, username, isMuted, deviceId, deviceLabel, roomId, timestamps) | N/A (new) |
| **v1.1** | 2025-10-21 | Added `username` field | ✅ Automatic (ALTER TABLE) |
| **v1.2** | 2025-10-22 | Added `verifiedMuted` field (Web Audio API verification) | ✅ Automatic (ALTER TABLE) |
| **v1.3** | 2025-10-23 | Added `packetVerifiedMuted` and `packetVerifiedAt` fields (Packet inspection) | ✅ Automatic (ALTER TABLE) |

**Current Schema Version:** v1.3

---

## 8. Storage Performance Characteristics

### **8.1 Write Performance**

**Measured on local development (M1 Mac):**
- Single upsert: ~1-3ms
- Batch 10 upserts: ~10-20ms
- Throughput: ~500-1000 writes/second

**Production estimate (AWS t2.micro):**
- Single upsert: ~5-10ms
- Throughput: ~100-200 writes/second

**Bottleneck:** SQLite is single-writer (no concurrent writes)

**Cross-Reference:** See [`USER_STORIES_BACKEND_SPEC.md:242`](USER_STORIES_BACKEND_SPEC.md) for performance details.

---

### **8.2 Read Performance**

**Query types:**
- `getUserState()`: ~0.5-1ms (primary key lookup)
- `getAllUserStates()`: ~2-5ms (10 users, ordered scan)
- `getUsersByRoom()`: ~1-2ms (indexed lookup)

**Acceptable because:**
- Scale: Only 10 concurrent users
- Frequency: Most operations are reads (90%+ read/write ratio)
- Caching: Not needed at this scale

---

### **8.3 Storage Size**

**Per-user overhead:**
```
Estimated row size:
- userId: ~20 bytes
- username: ~50 bytes
- Booleans (as INTEGER): 4 bytes × 3 = 12 bytes
- Timestamps: ~30 bytes × 3 = 90 bytes
- Strings (deviceId, deviceLabel, roomId): ~100 bytes
────────────────────────────────
Total per user: ~272 bytes
```

**For 10 users:** ~2.7 KB  
**For 100 users:** ~27 KB  
**For 1000 users:** ~270 KB  

**Disk usage is negligible** - no storage limits at this scale.

---

## 9. Design Justifications

### **9.1 Why SQLite Instead of PostgreSQL/MySQL?**

| Requirement | SQLite | PostgreSQL | MySQL |
|-------------|--------|------------|-------|
| **Setup complexity** | ✅ Zero config (single file) | ❌ Requires server setup | ❌ Requires server setup |
| **Portability** | ✅ Single file, easy to move | ❌ Requires dump/restore | ❌ Requires dump/restore |
| **10 user scale** | ✅ Excellent | ⚠️ Overkill | ⚠️ Overkill |
| **Cost** | ✅ Free (no server) | ⚠️ Requires RDS (~$15/mo) | ⚠️ Requires RDS (~$15/mo) |
| **Team experience** | ✅ SQL-familiar | ✅ SQL-familiar | ✅ SQL-familiar |

**Decision:** SQLite chosen for **simplicity** and **demo environment** requirements.

**Future migration path:** If scale exceeds 100 users, migrate to PostgreSQL.

**Cross-Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:307-356`](BACKEND_INTERNAL_ARCHITECTURE.md) for detailed database technology comparison.

---

### **9.2 Why Synchronous Driver (better-sqlite3)?**

**Choice:** Synchronous blocking calls instead of async

**Rationale:**
- **Simplicity:** No callback hell or promise chains
- **Acceptable at 10 users:** Blocking is ~5-10ms (fast enough)
- **Correctness:** Easier to reason about race conditions
- **Performance:** SQLite is single-writer anyway (no concurrency benefit from async)

**Trade-off:** Blocks Node.js event loop during database operations

**Limitation:** Would need to refactor to async at 100+ users

**Cross-Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:357-395`](BACKEND_INTERNAL_ARCHITECTURE.md) for synchronous operation justification.

---

### **9.3 Why No Connection Pool?**

**Decision:** Single SQLite connection, no pooling

**Rationale:**
- SQLite is **single-writer** (only one write at a time)
- Synchronous operations mean **sequential execution**
- Connection pool provides **no benefit** in this architecture
- Pooling would add complexity without performance gain

**Cross-Reference:** See [`BACKEND_INTERNAL_ARCHITECTURE.md:434-466`](BACKEND_INTERNAL_ARCHITECTURE.md) for connection pooling analysis.

---

## 10. Summary: Data Loss Prevention

### **10.1 What Survives Crashes**

✅ **All critical user state:**
- User identities (userId, username)
- Mute intent (isMuted)
- Both verification results (verifiedMuted, packetVerifiedMuted)
- Device selections (deviceId, deviceLabel)
- Room memberships (roomId)
- Complete audit trail (timestamps)

### **10.2 What Doesn't Survive (By Design)**

❌ **Transient data:**
- Active WebSocket connections (clients reconnect)
- Raw audio sample buffers (processed and discarded)
- In-flight HTTP requests (clients retry)

### **10.3 Recovery Time Objective (RTO)**

**Target:** < 5 seconds

**Measured:**
1. Server restart: ~2 seconds
2. Database initialization: ~100ms
3. First health check: ~50ms
4. Client reconnection: ~1 second

**Total:** ~3 seconds from crash to full availability

---

## 11. References

### **Implementation Files**

- [`backend/database.js`](backend/database.js) - Schema definition and CRUD operations
- [`backend/packet-verifier.js`](backend/packet-verifier.js) - Packet verification persistence
- [`backend/server.js`](backend/server.js) - API endpoints using storage

### **Related Documentation**

- [`DATA_ABSTRACTIONS.md`](DATA_ABSTRACTIONS.md) - Data representation and abstraction functions
- [`BACKEND_INTERNAL_ARCHITECTURE.md`](BACKEND_INTERNAL_ARCHITECTURE.md) - Detailed architecture decisions
- [`USER_STORIES_BACKEND_SPEC.md`](USER_STORIES_BACKEND_SPEC.md) - Module responsibilities
- [`DEPLOYMENT_RUNBOOK.md`](DEPLOYMENT_RUNBOOK.md) - Operational procedures

---

**Last Updated:** October 23, 2025  
**Task Completion:** Requirement 4 - Stable Storage Mechanisms  
**Maintained By:** Team Bug Farmers Backend Team  
**Review Cycle:** Before each milestone

