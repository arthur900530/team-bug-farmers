# User Story 3: Real-Time Audio Feedback - Implementation Guide

**Story:** "As a user, I want real-time feedback showing that other participants can hear me so that I can confidently speak without having to ask 'can you hear me?' every call."

**Purpose:** Provide visual feedback to confirm that outbound audio is successfully received by other participants using CRC32 fingerprint verification.

**Status:** Planning Phase  
**Depends on:** User Story 11 (✅ Complete)  
**Last Updated:** November 7, 2025

**Note:** This document follows the same structure as `USER_STORY_11_IMPLEMENTATION_GUIDE.md` for consistency. It provides a comprehensive guide for implementing User Story 3, including what exists, what needs to be built, dependencies, risks, and integration points.

---

## 📋 Executive Summary

### Requirements (from `dev_specs/user_stories.md`)

**User Story 3 — Real-Time Audio Feedback**
- **Depends on:** User Story 11
- **What it's about:** Providing visual or other feedback to confirm that outbound audio is successfully received by other participants
- **Size:** Large (Real-time audio processing)

### Key Technical Requirements (from `dev_specs`)

1. **CRC32 Fingerprinting** (`tech_stack.md` line 23, `flow_charts.md` lines 66-77)
   - Sender computes CRC32 on **encoded frames** (after encoding, before transmission)
   - Receiver computes CRC32 on **decoded frames** (after decoding, before playback)
   - Fingerprints sent via **WebSocket** (not RTP) per `USER_STORY_11_IMPLEMENTATION_GUIDE.md` line 401

2. **Fingerprint Verification** (`flow_charts.md` lines 163-198, `state_diagrams.md` lines 132-165)
   - Server compares sender CRC32 vs receiver CRC32
   - Match → ACK, Mismatch → NACK
   - Aggregates results per meeting

3. **ACK Summary** (`data_schemas.md` DS-05, `public_interfaces.md` line 124)
   - Lists `ackedUsers` (successful receivers) and `missingUsers` (failed/timeout)
   - Sent to sender via WebSocket `ack-summary` message
   - Displayed in UI via `AckIndicator` component

---

## ✅ What Already Exists (from User Story 11)

### Frontend Types (`src/types/index.ts`)
- ✅ `FrameFingerprint` interface (lines 33-36)
- ✅ `AckSummary` interface (lines 46-50)
- ✅ `AckSummaryMessage` interface (lines 93-98)

### Frontend Components
- ✅ `AckIndicator.tsx` - UI component to display ACK summary (exists, may need updates)
- ✅ `SignalingClient.onAckSummary()` callback (line 254)
- ✅ `UserClient.computeCrc32()` stub (line 429) - **NEEDS IMPLEMENTATION**

### Backend Types (`backend/src/types.ts`)
- ✅ `UserSession.lastCrc32: string` field (line 11)
- ⚠️ `FrameFingerprint` and `AckSummary` types **NOT in backend types.ts** - **NEEDS ADDITION**

### Backend Infrastructure
- ✅ `SignalingServer` - WebSocket handler (can be extended)
- ✅ `MeetingRegistry` - Participant tracking
- ❌ `FingerprintVerifier` class - **DOES NOT EXIST** - **NEEDS CREATION**
- ❌ `AckAggregator` class - **DOES NOT EXIST** - **NEEDS CREATION**

---

## 🎯 What Needs to Be Implemented

### Backend (Server-Side)

#### 1. **`backend/src/types.ts`** - Add Missing Types
**Purpose:** Define `FrameFingerprint` and `AckSummary` types for backend

**From `dev_specs/data_schemas.md` DS-04:**
```typescript
export interface FrameFingerprint {
  frameId: string;        // hex, 16 chars (from data_schemas.md line 101)
  crc32: string;          // hex, 8 chars (from data_schemas.md line 102)
  senderUserId: string;   // UUID (from data_schemas.md line 103)
  receiverCrc32s?: Map<string, string>;  // map<userId, crc32> (from data_schemas.md line 104)
  timestamp: number;      // int64 (from data_schemas.md line 105)
}
```

**From `dev_specs/data_schemas.md` DS-05:**
```typescript
export interface AckSummary {
  meetingId: string;       // UUID (from data_schemas.md line 125)
  ackedUsers: string[];   // Successful receivers (from data_schemas.md line 126)
  missingUsers: string[]; // Failed/timed-out receivers (from data_schemas.md line 127)
  timestamp: number;     // int64 (from data_schemas.md line 128)
}
```

**From `dev_specs/public_interfaces.md` line 136:**
```typescript
export interface FingerprintMessage {
  type: 'frame-fingerprint';
  frameId: string;
  crc32: string;
  senderUserId: string;   // For sender fingerprints
  receiverUserId?: string; // For receiver fingerprints (optional)
  timestamp: number;
}
```

**Compliance:** ✅ Matches `data_schemas.md` DS-04 and DS-05 exactly

---

#### 2. **`backend/src/FingerprintVerifier.ts`** - NEW FILE
**Purpose:** Compare sender/receiver CRC32 for end-to-end integrity verification

**From `dev_specs/classes.md` lines 323-324:**
> "FingerprintVerifier - Purpose: Compares sender/receiver CRC32 for end-to-end integrity"

**From `dev_specs/APIs.md` lines 200-207:**
```typescript
class FingerprintVerifier {
  compare(sender: FrameFingerprint, receiver: FrameFingerprint): boolean
  onMatch(userId: string): void
  onMismatch(userId: string): void
}
```

**⚠️ APPROXIMATION SUPPORT:**
- `compare()` method will support adjustable threshold for CRC32 matching
- Default: Exact match (CRC32 must match exactly)
- Future: Can be adjusted to account for encoding differences and packet loss

**From `dev_specs/flow_charts.md` lines 170-198:**
- Receives sender's encoded `FrameFingerprint`
- Receives all receivers' decoded `FrameFingerprint`s
- Compares `sender.crc32` vs `receiver.crc32` per frame
- Calls `onMatch(userId)` or `onMismatch(userId)`
- Feeds results to `AckAggregator`

**From `dev_specs/state_diagrams.md` lines 132-165:**
- State machine: `Idle` → `Waiting_Sender` → `Waiting_Receiver` → `Comparing` → `Match`/`Mismatch`
- TTL: 15 seconds per frame (from `data_schemas.md` line 96)
- Typical retention: ~5 frames (from `data_schemas.md` line 97)

**Implementation Requirements:**
```typescript
export class FingerprintVerifier {
  // Store fingerprints per frameId (Map<frameId, FrameFingerprint>)
  private fingerprints: Map<string, FrameFingerprint> = new Map();
  
  // TTL: 15 seconds (from data_schemas.md line 96)
  private readonly FINGERPRINT_TTL_MS = 15000;
  
  // Callback to AckAggregator
  private onMatchCallback?: (userId: string, frameId: string) => void;
  private onMismatchCallback?: (userId: string, frameId: string) => void;
  
  /**
   * Add sender fingerprint
   * From flow_charts.md line 172: "Receive sender's encoded FrameFingerprint"
   */
  addSenderFingerprint(frameId: string, crc32: string, senderUserId: string): void;
  
  /**
   * Add receiver fingerprint
   * From flow_charts.md line 173: "Receive all receivers' decoded FrameFingerprints"
   */
  addReceiverFingerprint(frameId: string, crc32: string, receiverUserId: string): void;
  
  /**
   * Compare sender vs receiver CRC32
   * From flow_charts.md line 176: "FingerprintVerifier.compare"
   * From state_diagrams.md line 163: "compare(senderCRC, receiverCRC)"
   * 
   * APPROXIMATION: Supports adjustable threshold for matching
   * (default: exact match, can be adjusted for encoding differences/packet loss)
   */
  compare(sender: FrameFingerprint, receiver: FrameFingerprint, threshold?: number): boolean;
  
  /**
   * Called when CRC32 matches
   * From flow_charts.md line 180: "FingerprintVerifier.onMatch"
   */
  onMatch(userId: string, frameId: string): void;
  
  /**
   * Called when CRC32 mismatches
   * From flow_charts.md line 183: "FingerprintVerifier.onMismatch"
   */
  onMismatch(userId: string, frameId: string): void;
  
  /**
   * Cleanup expired fingerprints (TTL: 15 seconds)
   * From data_schemas.md line 96: "TTL: 15 seconds"
   */
  cleanupExpiredFingerprints(): void;
  
  /**
   * Set callbacks for match/mismatch events
   */
  setCallbacks(
    onMatch: (userId: string, frameId: string) => void,
    onMismatch: (userId: string, frameId: string) => void
  ): void;
}
```

**Dependencies:**
- Uses: `FrameFingerprint` type (from `types.ts`)
- Used by: `SignalingServer` (receives fingerprints), `AckAggregator` (receives match/mismatch events)

**Compliance:** ✅ Matches `dev_specs/APIs.md` lines 200-207, `flow_charts.md` lines 170-198, `state_diagrams.md` lines 132-165

---

#### 3. **`backend/src/AckAggregator.ts`** - NEW FILE
**Purpose:** Aggregates CRC32 match results and produces per-meeting ACK summary

**From `dev_specs/classes.md` lines 326-327:**
> "AckAggregator - Purpose: Aggregates CRC32 match results and produces per-meeting ACK summary"

**From `dev_specs/APIs.md` lines 212-219:**
```typescript
class AckAggregator {
  onDecodeAck(userId: string, matched: boolean): void
  summaryForSpeaker(meetingId: string): AckSummary
  reset(meetingId: string): void
}
```

**From `dev_specs/flow_charts.md` lines 181-192:**
- Receives ACK/NACK from `FingerprintVerifier`
- Records per receiver: `userId: ACK` or `userId: NACK`
- After all receivers processed, calls `summaryForSpeaker(meetingId)`
- Creates `AckSummary` with `ackedUsers` and `missingUsers`
- Sends to sender via `SignalingServer`

**Implementation Requirements:**
```typescript
export class AckAggregator {
  // Store ACK/NACK results per meeting (Map<meetingId, Map<userId, boolean>>)
  private ackResults: Map<string, Map<string, boolean>> = new Map();
  
  // Summary window (how often to generate summaries)
  private readonly SUMMARY_WINDOW_MS = 5000; // 5 seconds (reasonable default)
  
  // Callback to SignalingServer for sending summaries
  private onSummaryCallback?: (meetingId: string, summary: AckSummary) => void;
  
  /**
   * Record ACK/NACK result for a receiver
   * From flow_charts.md line 181: "AckAggregator.onDecodeAck"
   * From APIs.md line 216: "onDecodeAck(userId: string, matched: boolean): void"
   */
  onDecodeAck(meetingId: string, userId: string, matched: boolean): void;
  
  /**
   * Generate ACK summary for a speaker
   * From flow_charts.md line 190: "AckAggregator.summaryForSpeaker"
   * From APIs.md line 217: "summaryForSpeaker(meetingId: string): AckSummary"
   */
  summaryForSpeaker(meetingId: string, senderUserId: string): AckSummary;
  
  /**
   * Reset ACK results for a meeting
   * From APIs.md line 218: "reset(meetingId: string): void"
   */
  reset(meetingId: string): void;
  
  /**
   * Set callback for summary generation
   */
  setOnSummaryCallback(callback: (meetingId: string, summary: AckSummary) => void): void;
}
```

**Dependencies:**
- Uses: `AckSummary` type (from `types.ts`), `MeetingRegistry` (to get participants)
- Used by: `SignalingServer` (sends summaries to clients)

**Compliance:** ✅ Matches `dev_specs/APIs.md` lines 212-219, `flow_charts.md` lines 181-192

---

#### 4. **`backend/src/SignalingServer.ts`** - EXTEND
**Purpose:** Handle fingerprint messages and coordinate FingerprintVerifier/AckAggregator

**New Message Handler:**
```typescript
/**
 * Handle frame-fingerprint message from client
 * From public_interfaces.md: Fingerprint messages sent via WebSocket
 */
private handleFingerprint(ws: WebSocket, message: FingerprintMessage): void {
  // Extract frameId, crc32, senderUserId/receiverUserId
  // If senderUserId matches client userId → sender fingerprint
  // If receiverUserId is present → receiver fingerprint
  // Forward to FingerprintVerifier
}
```

**Integration Points:**
1. Initialize `FingerprintVerifier` and `AckAggregator` in constructor
2. Set up callbacks:
   - `FingerprintVerifier.onMatch` → `AckAggregator.onDecodeAck(meetingId, userId, true)`
   - `FingerprintVerifier.onMismatch` → `AckAggregator.onDecodeAck(meetingId, userId, false)`
   - `AckAggregator.onSummary` → Send `ack-summary` message to sender
3. Add `handleFingerprint()` to message router
4. Periodically call `FingerprintVerifier.cleanupExpiredFingerprints()` (every 5 seconds)

**Compliance:** ✅ Matches `dev_specs/flow_charts.md` lines 193-197, `public_interfaces.md` line 124

---

### Frontend (Client-Side)

#### 5. **`src/services/UserClient.ts`** - IMPLEMENT `computeCrc32()`
**Purpose:** Compute CRC32 hash of audio frame (PCM approximation for sender, decoded for receiver)

**From `dev_specs/APIs.md` line 43:**
> "computeCrc32(frame: AudioFrame): string"

**From `dev_specs/flow_charts.md` lines 66, 104:**
- Line 66: Sender computes CRC32 on **encoded frame** (after encoding, before transmission)
- Line 104: Receiver computes CRC32 on **decoded frame** (after decoding, before playback)

**⚠️ APPROXIMATION APPROACH (User Decision):**
Since WebRTC handles encoding internally and we cannot access encoded Opus frames directly, we will:
- **Sender:** Compute CRC32 on **PCM frames** (before encoding) as an approximation
- **Receiver:** Compute CRC32 on **decoded PCM frames** (after decoding) - matches spec
- **Threshold-based matching:** Use adjustable threshold to account for packet loss and encoding differences

**Implementation Requirements:**
```typescript
/**
 * Compute CRC32 fingerprint of audio frame
 * From dev_specs/APIs.md line 43
 * 
 * APPROXIMATION: For sender, we compute CRC32 on PCM frames (before encoding)
 * because WebRTC handles encoding internally and we cannot access encoded frames.
 * 
 * @param frame - PCMFrame (sender: before encoding, receiver: after decoding)
 * @returns CRC32 hash as hex string (8 chars, from data_schemas.md line 102)
 */
computeCrc32(frame: PCMFrame): string {
  // Use 'crc-32' npm package
  // Convert Float32Array samples to Uint8Array for CRC32 computation
  const samples = frame.samples;
  const uint8Array = new Uint8Array(samples.buffer);
  
  // Compute CRC32
  const crc32 = CRC32.buf(uint8Array);
  
  // Return hex string (8 chars, uppercase, zero-padded)
  return crc32.toString(16).toUpperCase().padStart(8, '0');
}
```

**CRC32 Library:**
- **`crc-32`** (npm package) - Fast, pure JavaScript
- Install: `npm install crc-32`
- Type definitions: `npm install --save-dev @types/crc-32` (if available)

**Compliance:** ⚠️ **APPROXIMATION** - Matches `dev_specs/APIs.md` line 43 intent, uses PCM frames for sender (practical limitation)

---

#### 6. **`src/services/UserClient.ts`** - SEND SENDER FINGERPRINTS
**Purpose:** Send CRC32 fingerprints after capturing PCM frames (sender side)

**From `dev_specs/flow_charts.md` lines 66-76:**
1. Capture PCM frame → Encode → 3 tiers (Low/Med/High)
2. Compute CRC32 for PCM frame (line 66 - **APPROXIMATION: before encoding**)
3. Create `FrameFingerprint` (line 70)
4. Send RTP packets (line 71)
5. Send fingerprint to `FingerprintVerifier` via WebSocket (line 76)

**⚠️ APPROXIMATION APPROACH (User Decision):**
- Compute CRC32 on **PCM frames** (before encoding) as approximation
- Use `AudioCapture.readFrame()` to get PCM frames
- Send fingerprints periodically (e.g., every 20ms to match frame rate)

**Implementation Location:**
- In `startAudioTransmission()` method, after audio track is added
- Use `setInterval` to periodically read PCM frames and compute CRC32
- Frame rate: 50 frames/sec (20ms per frame, from `public_interfaces.md` line 198)

**Implementation Requirements:**
```typescript
/**
 * Send sender fingerprint after capturing PCM frame
 * From flow_charts.md lines 66-76
 * 
 * APPROXIMATION: We compute CRC32 on PCM frames (before encoding)
 * because WebRTC handles encoding internally.
 */
private startFingerprintSending(): void {
  // Send fingerprints at frame rate (50 fps = 20ms interval)
  const FRAME_INTERVAL_MS = 20;
  
  this.fingerprintInterval = setInterval(async () => {
    try {
      // Read PCM frame from AudioCapture
      const pcmFrame = this.audioCapture.readFrame();
      
      // Generate unique frameId (hex, 16 chars, from data_schemas.md line 101)
      const frameId = this.generateFrameId();
      
      // Compute CRC32 on PCM frame (approximation for encoded frame)
      const crc32 = this.computeCrc32(pcmFrame);
      
      // Store frameId with timestamp for matching (see receiver fingerprints)
      this.frameIdMap.set(frameId, {
        timestamp: Date.now(),
        rtpTimestamp: this.getCurrentRtpTimestamp() // For matching with receiver
      });
      
      // Send via WebSocket (not RTP, per USER_STORY_11_IMPLEMENTATION_GUIDE.md line 401)
      await this.signalingClient.sendFingerprint({
        type: 'frame-fingerprint',
        frameId,
        crc32,
        senderUserId: this.userId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[UserClient] Error sending fingerprint:', error);
    }
  }, FRAME_INTERVAL_MS);
}

/**
 * Generate unique frame ID (hex, 16 chars)
 * From data_schemas.md line 101: "frameId: string (hex, 16 chars)"
 */
private generateFrameId(): string {
  // Use timestamp + random to ensure uniqueness
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).substring(2);
  return (timestamp + random).substring(0, 16).padStart(16, '0');
}

/**
 * Get current RTP timestamp for frame matching
 * Used to match sender fingerprints with receiver fingerprints
 */
private getCurrentRtpTimestamp(): number {
  // Use WebRTC stats to get RTP timestamp
  // This will be used for matching with receiver fingerprints
  // Approximation: Use current time or sequence number
  return Date.now(); // Will be refined with actual RTP timestamp extraction
}
```

**Compliance:** ⚠️ **APPROXIMATION** - Uses PCM frames instead of encoded frames (practical limitation due to WebRTC internal encoding)

---

#### 7. **`src/services/UserClient.ts`** - SEND RECEIVER FINGERPRINTS
**Purpose:** Send CRC32 fingerprints after decoding frames (receiver side)

**From `dev_specs/flow_charts.md` lines 104-106:**
1. Decode frame (line 101)
2. Play to speakers (line 102)
3. Compute CRC32 on **decoded frame** (line 104)
4. Create `FrameFingerprint` (line 105)
5. Send to `FingerprintVerifier` (line 106)

**⚠️ APPROXIMATION APPROACH (User Decision):**
- Use **RTP timestamp** to match receiver fingerprints with sender fingerprints
- Account for **packet loss** by using a time window tolerance (e.g., ±50ms)
- Use **adjustable threshold** for CRC32 matching to account for encoding differences and packet loss

**Implementation Location:**
- In `ontrack` handler, after receiving audio track
- Use Web Audio API to extract decoded PCM frames
- Match frames using RTP timestamp from WebRTC stats

**Implementation Requirements:**
```typescript
/**
 * Send receiver fingerprint after decoding frame
 * From flow_charts.md lines 104-106
 * 
 * APPROXIMATION: We match frames using RTP timestamp with tolerance
 * to account for packet loss and network jitter.
 */
private async sendReceiverFingerprint(
  decodedFrame: PCMFrame, 
  senderUserId: string,
  rtpTimestamp: number
): Promise<void> {
  // Compute CRC32 on decoded frame
  const crc32 = this.computeCrc32(decodedFrame);
  
  // Find matching sender frameId using RTP timestamp (with tolerance)
  // Tolerance accounts for packet loss and network jitter
  const TIMESTAMP_TOLERANCE_MS = 50; // ±50ms window
  const frameId = this.findMatchingFrameId(rtpTimestamp, TIMESTAMP_TOLERANCE_MS);
  
  if (!frameId) {
    // No matching sender frame found (packet loss or out of window)
    console.warn('[UserClient] No matching sender frame for RTP timestamp:', rtpTimestamp);
    return;
  }
  
  // Send via WebSocket
  await this.signalingClient.sendFingerprint({
    type: 'frame-fingerprint',
    frameId, // Matched from sender using RTP timestamp
    crc32,
    receiverUserId: this.userId,
    senderUserId: senderUserId,
    timestamp: Date.now(),
    rtpTimestamp: rtpTimestamp // Include for server-side matching verification
  });
}

/**
 * Find matching sender frameId using RTP timestamp
 * Uses approximation with tolerance to account for packet loss
 */
private findMatchingFrameId(rtpTimestamp: number, toleranceMs: number): string | null {
  // Search through recent sender fingerprints
  // Match based on RTP timestamp within tolerance window
  for (const [frameId, frameData] of this.frameIdMap.entries()) {
    const timestampDiff = Math.abs(frameData.rtpTimestamp - rtpTimestamp);
    if (timestampDiff <= toleranceMs) {
      return frameId;
    }
  }
  return null; // No match found (packet loss)
}

/**
 * Extract RTP timestamp from WebRTC stats
 * Used for matching receiver frames with sender frames
 */
private async getRtpTimestampFromStats(): Promise<number | null> {
  if (!this.peerConnection) return null;
  
  try {
    const stats = await this.peerConnection.getStats();
    // Extract RTP timestamp from stats
    // This will be refined based on actual WebRTC stats structure
    // Approximation: Use current time for now
    return Date.now();
  } catch (error) {
    console.error('[UserClient] Error getting RTP timestamp:', error);
    return null;
  }
}
```

**Frame Matching Strategy:**
1. **Sender:** Stores `frameId` with `rtpTimestamp` in a map
2. **Receiver:** Extracts `rtpTimestamp` from WebRTC stats
3. **Matching:** Find sender `frameId` where `|sender.rtpTimestamp - receiver.rtpTimestamp| <= tolerance`
4. **Tolerance:** ±50ms window to account for:
   - Network jitter
   - Packet loss (receiver may receive frames out of order)
   - Encoding/decoding delays

**Compliance:** ⚠️ **APPROXIMATION** - Uses RTP timestamp matching with tolerance (practical approach to handle packet loss)

---

#### 8. **`src/services/SignalingClient.ts`** - ADD `sendFingerprint()` METHOD
**Purpose:** Send fingerprint messages to server via WebSocket

**From `dev_specs/public_interfaces.md`:**
- Fingerprints sent via WebSocket (not RTP)
- Message type: `frame-fingerprint`

**Implementation Requirements:**
```typescript
/**
 * Send frame fingerprint to server
 * From public_interfaces.md: Fingerprint messages via WebSocket
 */
async sendFingerprint(fingerprint: FingerprintMessage): Promise<void> {
  if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected');
  }
  
  this.ws.send(JSON.stringify(fingerprint));
}
```

**Add Type:**
```typescript
export interface FingerprintMessage {
  type: 'frame-fingerprint';
  frameId: string;
  crc32: string;
  senderUserId?: string;   // For sender fingerprints
  receiverUserId?: string; // For receiver fingerprints
  timestamp: number;
}
```

**Compliance:** ✅ Matches `dev_specs/public_interfaces.md` (fingerprints via WebSocket)

---

#### 9. **`src/types/index.ts`** - ADD `FingerprintMessage` TYPE
**Purpose:** Type definition for fingerprint messages

**Add:**
```typescript
export interface FingerprintMessage {
  type: 'frame-fingerprint';
  frameId: string;
  crc32: string;
  senderUserId?: string;
  receiverUserId?: string;
  timestamp: number;
}
```

**Compliance:** ✅ Matches `dev_specs/public_interfaces.md`

---

#### 10. **`src/components/meeting/AckIndicator.tsx`** - VERIFY/UPDATE
**Purpose:** Display ACK summary in UI

**Status:** Component already exists (lines 1-87)

**Verify:**
- ✅ Displays `ackedUsers` and `missingUsers`
- ✅ Shows success rate percentage
- ✅ Expandable list of users
- ⚠️ May need to add `meetingId` and `timestamp` display (if needed)

**Compliance:** ✅ Component exists, may need minor updates

---

## 🔄 Implementation Flow

### Complete Flow (from `dev_specs/flow_charts.md`)

**Sender Side:**
1. Capture audio → Encode (3 tiers) → Compute CRC32 on encoded frame
2. Create `FrameFingerprint` (frameId, crc32)
3. Send RTP packets (via WebRTC)
4. Send fingerprint via WebSocket → `SignalingServer.handleFingerprint()`
5. Server → `FingerprintVerifier.addSenderFingerprint()`

**Receiver Side:**
1. Receive RTP packet → Decode → Play
2. Compute CRC32 on decoded frame
3. Create `FrameFingerprint` (frameId, crc32)
4. Send fingerprint via WebSocket → `SignalingServer.handleFingerprint()`
5. Server → `FingerprintVerifier.addReceiverFingerprint()`

**Server Side:**
1. `FingerprintVerifier` compares sender CRC32 vs receiver CRC32
2. Match → `onMatch(userId)` → `AckAggregator.onDecodeAck(meetingId, userId, true)`
3. Mismatch → `onMismatch(userId)` → `AckAggregator.onDecodeAck(meetingId, userId, false)`
4. After all receivers processed → `AckAggregator.summaryForSpeaker(meetingId, senderUserId)`
5. Server sends `ack-summary` message to sender
6. Frontend displays via `AckIndicator` component

---

## ✅ Technical Decisions (RESOLVED)

**📄 Full Decision Record:** See `USER_STORY_3_TECHNICAL_DECISIONS.md` for complete documentation.

### Decision 1: CRC32 Computation on Encoded Frames (Sender Side)
**Issue:** WebRTC handles encoding internally. We cannot access encoded Opus frames directly.

**✅ RESOLVED - User Decision:**
- **Approximation:** Compute CRC32 on **PCM frames** (before encoding) instead of encoded frames
- **Rationale:** WebRTC handles encoding internally, making encoded frame access impractical
- **Threshold:** Use adjustable threshold in `FingerprintVerifier.compare()` to account for:
  - Encoding differences (PCM → Opus encoding may change CRC32)
  - Packet loss (lost packets decode differently)
- **Implementation:** Use `AudioCapture.readFrame()` to get PCM frames, compute CRC32, send via WebSocket

**Spec Reference:** `flow_charts.md` line 66: "UserClient.computeCrc32 encoded frame" (approximated with PCM)

**📄 Details:** See `USER_STORY_3_TECHNICAL_DECISIONS.md` section "Decision 1"

---

### Decision 2: Frame Matching (Receiver to Sender)
**Issue:** RTP packets don't include `frameId`. How do we match receiver fingerprints to sender fingerprints?

**✅ RESOLVED - User Decision:**
- **Approximation:** Use **RTP timestamp** to match frames with tolerance window
- **Tolerance:** ±50ms window to account for:
  - Network jitter
  - Packet loss (receiver may receive frames out of order)
  - Encoding/decoding delays
- **Implementation:**
  1. Sender stores `frameId` with `rtpTimestamp` in a map
  2. Receiver extracts `rtpTimestamp` from WebRTC stats
  3. Match using `|sender.rtpTimestamp - receiver.rtpTimestamp| <= tolerance`
- **Packet Loss Handling:** If no match found within tolerance, frame is considered lost (NACK)

**Spec Reference:** `flow_charts.md` lines 104-106: Receiver computes CRC32 on decoded frame (matching via RTP timestamp)

**📄 Details:** See `USER_STORY_3_TECHNICAL_DECISIONS.md` section "Decision 2"

---

### Decision 3: CRC32 Matching Threshold
**Issue:** Even with matching frames, CRC32 may differ due to encoding/decoding and packet loss.

**✅ RESOLVED - User Decision:**
- **Adjustable Threshold:** `FingerprintVerifier.compare()` will use a configurable threshold
- **Default Threshold:** Exact match (CRC32 must match exactly)
- **Future Enhancement:** Can be adjusted based on:
  - Network conditions (higher threshold for high packet loss)
  - Encoding quality (Opus encoding may introduce minor differences)
- **Implementation:** Start with exact match, add threshold if needed during testing

**Note:** Threshold will be implemented in `FingerprintVerifier.compare()` method (backend)

---

## 📝 Implementation Checklist

### Backend
- [ ] Add `FrameFingerprint` and `AckSummary` types to `backend/src/types.ts`
- [ ] Create `backend/src/FingerprintVerifier.ts`
  - [ ] Implement `addSenderFingerprint()`
  - [ ] Implement `addReceiverFingerprint()`
  - [ ] Implement `compare()`
  - [ ] Implement `onMatch()` and `onMismatch()`
  - [ ] Implement `cleanupExpiredFingerprints()` (TTL: 15 seconds)
- [ ] Create `backend/src/AckAggregator.ts`
  - [ ] Implement `onDecodeAck()`
  - [ ] Implement `summaryForSpeaker()`
  - [ ] Implement `reset()`
- [ ] Extend `backend/src/SignalingServer.ts`
  - [ ] Initialize `FingerprintVerifier` and `AckAggregator`
  - [ ] Add `handleFingerprint()` method
  - [ ] Set up callbacks between FingerprintVerifier and AckAggregator
  - [ ] Send `ack-summary` messages to clients
  - [ ] Add periodic cleanup (every 5 seconds)

### Frontend
- [ ] Install CRC32 library (`crc-32` npm package)
- [ ] Implement `UserClient.computeCrc32()` method
- [ ] Add `FingerprintMessage` type to `src/types/index.ts`
- [ ] Add `SignalingClient.sendFingerprint()` method
- [ ] Implement sender fingerprint sending (after encoding)
- [ ] Implement receiver fingerprint sending (after decoding)
- [ ] Verify `AckIndicator` component works with real data
- [ ] Connect `onAckSummary` callback in `App.tsx` to update UI

### Testing
- [ ] Unit tests for `FingerprintVerifier.compare()`
- [ ] Unit tests for `AckAggregator.summaryForSpeaker()`
- [ ] Integration test: Sender → Server → Receiver fingerprint flow
- [ ] End-to-end test: Verify ACK summary appears in UI

---

## 🔗 Dependencies

### External Libraries
- **`crc-32`** (npm package) - For CRC32 computation
  - Install: `npm install crc-32`
  - Type definitions: `npm install --save-dev @types/crc-32` (if available)

### Internal Dependencies
- ✅ `MeetingRegistry` - To get participants for ACK summary
- ✅ `SignalingServer` - To send `ack-summary` messages
- ✅ `SignalingClient` - To send fingerprint messages
- ✅ `UserClient` - To compute CRC32 and send fingerprints

---

## 📚 Reference Documents

- **`dev_specs/user_stories.md`** - User Story 3 requirements
- **`dev_specs/flow_charts.md`** - Fingerprint verification flow (lines 163-198)
- **`dev_specs/state_diagrams.md`** - Fingerprint verification state machine (lines 132-165)
- **`dev_specs/data_schemas.md`** - DS-04 (FrameFingerprint), DS-05 (AckSummary)
- **`dev_specs/APIs.md`** - FingerprintVerifier and AckAggregator APIs (lines 200-219)
- **`dev_specs/public_interfaces.md`** - WebSocket message formats (line 124)
- **`dev_specs/classes.md`** - Class responsibilities (lines 323-330)
- **`USER_STORY_11_IMPLEMENTATION_GUIDE.md`** - What's safe to modify, dependencies, risks
- **`USER_STORY_3_TECHNICAL_DECISIONS.md`** - **📄 Complete decision record for technical blockers**

---

## ⚠️ Critical Constraints

1. **DO NOT modify existing audio encoding/decoding pipeline** (`USER_STORY_11_IMPLEMENTATION_GUIDE.md` line 397)
2. **DO NOT change RTP packet structure** (`USER_STORY_11_IMPLEMENTATION_GUIDE.md` line 398)
3. **DO send fingerprints via WebSocket** (not RTP) (`USER_STORY_11_IMPLEMENTATION_GUIDE.md` line 401)
4. **DO compute CRC32 on encoded frames** (sender) and **decoded frames** (receiver) (`USER_STORY_11_IMPLEMENTATION_GUIDE.md` lines 399-400)
5. **DO NOT modify `types.ts` existing types** - Only add new types (`USER_STORY_11_IMPLEMENTATION_GUIDE.md` line 97)

---

**END OF DOCUMENT**

*This guide provides a comprehensive implementation plan for User Story 3. All technical blockers have been resolved using approximation approaches with adjustable thresholds. The implementation can proceed with the understanding that:*
- *Sender CRC32 is computed on PCM frames (approximation for encoded frames)*
- *Frame matching uses RTP timestamp with tolerance window (approximation for packet loss)*
- *CRC32 matching supports adjustable threshold (for encoding differences)*

