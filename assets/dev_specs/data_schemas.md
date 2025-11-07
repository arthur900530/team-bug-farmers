# Data Schemas

These schemas define the **in-memory data structures** maintained during SFU runtime, including user sessions, meeting state, quality metrics, audio fingerprints, and signaling artifacts.  
All data is ephemeral—stored in RAM only—and is lost if the SFU restarts. No persistent database is used in the current design.

---

# Overview

- **Storage model:** In-memory maps and structs (per SFU instance)
- **Persistence:** None (stateless; recomputed on join)
- **Lifetime:** Tied to WebRTC sessions, RTCP intervals, and TTL windows
- **Memory goal:** Low steady-state footprint even at scale  
- **Scaling unit:** `numMeetings × numUsers × per-entry size`

---

# DS-01: `UserSession`

**Runtime Location:** `MeetingRegistry`  
**Mapping:** `Map<meetingId, UserSession[]>`  
**Storage Type:** Struct / object (language-dependent)

| Field | Type | Description | Size (bytes) |
|-------|------|-------------|---------------|
| `userId` | string (UUID) | Unique identifier | 36 |
| `pcId` | string | PeerConnection ID | 36 |
| `qualityTier` | enum (`low`/`medium`/`high`) | Current tier for this user | 1 |
| `lastCrc32` | string (hex) | Latest CRC32 from receiver | 8 |
| `connectionState` | enum | WebRTC state machine value | 1 |
| `timestamp` | int64 | Last update time (Unix ms) | 8 |

**Total Size:** ~**90 bytes per user**

**Memory Function:**  
```

UserSessionMemory = 90 × numUsers

```

---

# DS-02: `Meeting`

**Runtime Location:** `MeetingRegistry`  
**Mapping:** `Map<meetingId, Meeting>`

| Field | Type | Description | Size (bytes) |
|--------|------|-------------|---------------|
| `meetingId` | string (UUID) | Unique meeting identifier | 36 |
| `currentTier` | enum | Global audio tier | 1 |
| `createdAt` | int64 | Meeting creation time | 8 |
| `sessions` | pointer | Reference to UserSession[] | 8 |

**Base Size:** **53 bytes** + (UserSession array)

**Memory Function:**  
```

MeetingMemory = 53 + (90 × numUsers)

```

---

# DS-03: `RtcpReport`

**Runtime Location:** `RtcpCollector`  
**Mapping:** `Map<userId, RtcpReport[]>`  
**Retention:** Sliding window of last **10 reports** per user

| Field | Type | Description | Size (bytes) |
|--------|------|-------------|---------------|
| `userId` | string (UUID) | Report sender | 36 |
| `lossPct` | float32 | Loss % for interval | 4 |
| `jitterMs` | float32 | Jitter in ms | 4 |
| `rttMs` | float32 | RTT estimate | 4 |
| `timestamp` | int64 | Report time | 8 |

**Total Size:** **56 bytes per report**

**Memory Function:**  
```

RtcpMemory = 56 × 10 × numUsers

```

---

# DS-04: `FrameFingerprint`

**Runtime Location:** `FingerprintVerifier`  
**Mapping:** `Map<frameId, FrameFingerprint>`  
**TTL:** 15 seconds  
**Typical retention:** ~5 frames (20ms frames → 100ms window)

| Field | Type | Description | Size (bytes) |
|--------|------|-------------|---------------|
| `frameId` | string (hex, 16 chars) | Unique audio frame ID | 16 |
| `crc32` | string (hex, 8 chars) | Sender CRC32 | 8 |
| `senderUserId` | string (UUID) | Originating user | 36 |
| `receiverCrc32s` | map<userId,string> | Receiver CRCs | ~44 × numReceivers |
| `timestamp` | int64 | Creation timestamp | 8 |

**Base Size:** **68 bytes + 44 × numReceivers**

**Memory Function (avg 5 frames):**  
```

FingerprintMemory = (68 + 44 × numReceivers) × 5

```

---

# DS-05: `AckSummary`

**Runtime Location:** `AckAggregator`  
**Persistence:** Ephemeral; discarded after sending to UI

| Field | Type | Description | Size (bytes) |
|--------|------|-------------|---------------|
| `meetingId` | string (UUID) | Context ID | 36 |
| `ackedUsers` | string[] | Successful receivers | 36 × numAcked |
| `missingUsers` | string[] | Failed or timed-out receivers | 36 × numMissing |
| `timestamp` | int64 | Generated time | 8 |

**Total Size:**  
```

AckSummaryMemory = 44 + (36 × numUsers)

```

---

# DS-06: `SdpSession`

**Runtime Location:** Signaling Flow (temporary)  
**Lifetime:** Until SDP negotiation completes

| Field | Type | Size (bytes) |
|--------|------|--------------|
| `offer` | string | ~1250 avg |
| `answer` | string | ~1250 avg |
| `userId` | UUID | 36 |

**Total Size:** ~**2536 bytes per negotiation**

**Note:** Deleted immediately after WebRTC negotiation; not counted in steady-state memory.

---

# DS-07: `IceCandidate`

**Runtime Location:** `SignalingServer`  
**Lifetime:** During ICE negotiation only (discarded afterward)

| Field | Type | Description | Size (bytes) |
|--------|------|-------------|---------------|
| `type` | enum | host / srflx / relay | 1 |
| `address` | string | IP address | ~20 avg |
| `port` | uint16 | Port number | 2 |
| `priority` | uint32 | ICE priority | 4 |

**Total Size:** ~**27 bytes per candidate**

**Memory Function:**  
```

IceCandidateMemory = 27 × 10 × numUsers   // ~10 per user

```

---

# Memory Budget Summary

For a **10-user meeting**:

| Data Type | Size |
|-----------|-------|
| Meeting | `53 + (90 × 10) = 953 bytes` |
| RtcpReports | `56 × 10 × 10 = 5600 bytes` |
| FrameFingerprints | `(68 + 44×10) × 5 = 2540 bytes` |
| AckSummaries | negligible |
| SDP/ICE (peak) | +25 KB (temporary) |

### ✅ **Steady-state:** ~**9 KB per meeting**

### ✅ **Scaling example:**  
1000 meetings × 10 users → **~9 MB RAM**

---

# Data Lifecycle

| Schema | Created | Updated | Deleted |
|--------|----------|----------|----------|
| **UserSession** | On join | Tier changes, CRC32 | On leave |
| **Meeting** | First user joins | Tier changes | Last user leaves |
| **RtcpReport** | Every 3–5s | Never (append) | Oldest removed after 10 |
| **FrameFingerprint** | Per encoded frame | Receiver CRC added | After 15s TTL |
| **AckSummary** | Every summary window | Never | After sending |
| **SdpSession** | Start of negotiation | Answer received | End of signaling |
| **IceCandidate** | During ICE | Never | After ICE completion |

---

# Persistence Strategy

**Current:** No persistence (all in-memory).  
**Future optional:** Redis for replication / failover.

Recommended future schema:

- Key format: `meeting:{meetingId}:sessions`
- TTL: 1 hour after last activity
- No schema changes required (same fields as in-memory)

```