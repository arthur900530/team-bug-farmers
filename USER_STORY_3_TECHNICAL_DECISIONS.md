# User Story 3: Technical Decision Record

**Purpose:** Document critical technical decisions made during User Story 3 implementation planning.

**Date:** November 7, 2025  
**Status:** Approved  
**Related:** `USER_STORY_3_IMPLEMENTATION_GUIDE.md`

---

## 📋 Executive Summary

Two critical technical blockers were identified during User Story 3 planning. Both have been resolved using approximation approaches with adjustable thresholds to account for WebRTC limitations and network conditions.

---

## Decision 1: CRC32 Computation on Encoded Frames (Sender Side)

### Problem Statement

**Blocker:** The `dev_specs/flow_charts.md` (line 66) specifies that the sender should compute CRC32 on **encoded frames** (after encoding, before transmission). However, WebRTC handles Opus encoding internally, and we cannot access the encoded Opus frames directly from the browser's WebRTC implementation.

**Technical Constraint:**
- WebRTC's `RTCPeerConnection` handles audio encoding internally
- The browser's WebRTC stack does not expose encoded Opus frames to JavaScript
- We only have access to PCM frames via `AudioCapture.readFrame()`

**Specification Reference:**
- `dev_specs/flow_charts.md` line 66: "UserClient.computeCrc32 encoded frame"
- `dev_specs/APIs.md` line 43: "computeCrc32(frame: AudioFrame): string"

---

### Decision

**Approved Approach:** Compute CRC32 on **PCM frames** (before encoding) as an approximation for encoded frames.

**Rationale:**
1. **Practical Limitation:** WebRTC's internal encoding makes encoded frame access impossible without custom RTP handling (complex and out of scope)
2. **Approximation Acceptable:** PCM frames represent the source audio that will be encoded, providing a reasonable approximation
3. **Threshold Compensation:** Adjustable threshold in `FingerprintVerifier.compare()` will account for encoding differences

---

### Implementation Details

**Location:** `src/services/UserClient.ts` - `computeCrc32()` method

**Approach:**
```typescript
/**
 * Compute CRC32 fingerprint of audio frame
 * APPROXIMATION: For sender, we compute CRC32 on PCM frames (before encoding)
 * because WebRTC handles encoding internally and we cannot access encoded frames.
 * 
 * @param frame - PCMFrame (sender: before encoding, receiver: after decoding)
 * @returns CRC32 hash as hex string (8 chars)
 */
computeCrc32(frame: PCMFrame): string {
  // Convert Float32Array samples to Uint8Array for CRC32 computation
  const uint8Array = new Uint8Array(frame.samples.buffer);
  
  // Compute CRC32 using 'crc-32' npm package
  const crc32 = CRC32.buf(uint8Array);
  
  // Return hex string (8 chars, uppercase, zero-padded)
  return crc32.toString(16).toUpperCase().padStart(8, '0');
}
```

**Fingerprint Sending:**
- Use `AudioCapture.readFrame()` to get PCM frames
- Send fingerprints at frame rate (50 fps = 20ms interval, per `public_interfaces.md` line 198)
- Store `frameId` with `rtpTimestamp` for matching with receiver fingerprints

---

### Threshold Strategy

**Purpose:** Account for encoding differences and packet loss

**Implementation Location:** `backend/src/FingerprintVerifier.ts` - `compare()` method

**Default Behavior:**
- **Exact Match:** CRC32 must match exactly (default threshold = 0)
- **Future Enhancement:** Adjustable threshold can be configured based on:
  - Network conditions (higher threshold for high packet loss)
  - Encoding quality (Opus encoding may introduce minor differences)

**Threshold Parameters:**
```typescript
compare(sender: FrameFingerprint, receiver: FrameFingerprint, threshold?: number): boolean {
  // Default: exact match (threshold = 0)
  // Future: can use threshold for fuzzy matching if needed
  const matchThreshold = threshold ?? 0;
  // Implementation details in FingerprintVerifier.ts
}
```

---

### Compliance Status

**Specification Compliance:** ⚠️ **APPROXIMATION**
- **Intent:** ✅ Matches `dev_specs/APIs.md` line 43 intent (CRC32 computation for integrity verification)
- **Method:** ⚠️ Uses PCM frames instead of encoded frames (practical limitation)
- **Rationale:** WebRTC internal encoding prevents access to encoded frames

**Documentation:**
- Decision documented in `USER_STORY_3_IMPLEMENTATION_GUIDE.md` section "Decision 1"
- Implementation code includes comments explaining approximation

---

## Decision 2: Frame Matching (Receiver to Sender)

### Problem Statement

**Blocker:** RTP packets do not include `frameId`. When a receiver computes CRC32 on a decoded frame, we need to match it to the corresponding sender's fingerprint. However, there is no direct way to identify which decoded frame corresponds to which sender frame.

**Technical Constraint:**
- RTP packets contain: SSRC, sequence number, timestamp, payload
- RTP packets do **not** contain: `frameId` (custom field)
- WebRTC does not expose frame-level metadata in JavaScript

**Specification Reference:**
- `dev_specs/flow_charts.md` lines 104-106: Receiver computes CRC32 on decoded frame
- `dev_specs/data_schemas.md` line 101: `frameId` is a hex string (16 chars)

---

### Decision

**Approved Approach:** Use **RTP timestamp** to match receiver fingerprints with sender fingerprints, with a tolerance window to account for packet loss and network jitter.

**Rationale:**
1. **RTP Timestamp Available:** WebRTC stats provide RTP timestamp information
2. **Tolerance Window:** ±50ms window accounts for:
   - Network jitter (packets may arrive out of order)
   - Packet loss (receiver may skip frames)
   - Encoding/decoding delays
3. **Practical Solution:** No custom RTP header extensions needed (simpler implementation)

---

### Implementation Details

**Location:** `src/services/UserClient.ts` - Frame matching logic

**Sender Side:**
```typescript
/**
 * Store frameId with RTP timestamp for matching
 */
private frameIdMap: Map<string, { timestamp: number; rtpTimestamp: number }> = new Map();

private startFingerprintSending(): void {
  setInterval(async () => {
    const pcmFrame = this.audioCapture.readFrame();
    const frameId = this.generateFrameId();
    const crc32 = this.computeCrc32(pcmFrame);
    
    // Store frameId with RTP timestamp for matching
    const rtpTimestamp = await this.getRtpTimestampFromStats();
    this.frameIdMap.set(frameId, {
      timestamp: Date.now(),
      rtpTimestamp: rtpTimestamp
    });
    
    // Send fingerprint via WebSocket
    await this.signalingClient.sendFingerprint({
      type: 'frame-fingerprint',
      frameId,
      crc32,
      senderUserId: this.userId,
      timestamp: Date.now()
    });
  }, 20); // 50 fps = 20ms interval
}
```

**Receiver Side:**
```typescript
/**
 * Match receiver fingerprint to sender fingerprint using RTP timestamp
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

private async sendReceiverFingerprint(
  decodedFrame: PCMFrame,
  senderUserId: string,
  rtpTimestamp: number
): Promise<void> {
  const crc32 = this.computeCrc32(decodedFrame);
  
  // Find matching sender frameId using RTP timestamp (with tolerance)
  const TIMESTAMP_TOLERANCE_MS = 50; // ±50ms window
  const frameId = this.findMatchingFrameId(rtpTimestamp, TIMESTAMP_TOLERANCE_MS);
  
  if (!frameId) {
    // No matching sender frame found (packet loss or out of window)
    console.warn('[UserClient] No matching sender frame for RTP timestamp:', rtpTimestamp);
    return; // Frame considered lost (will result in NACK)
  }
  
  // Send fingerprint with matched frameId
  await this.signalingClient.sendFingerprint({
    type: 'frame-fingerprint',
    frameId, // Matched from sender using RTP timestamp
    crc32,
    receiverUserId: this.userId,
    senderUserId: senderUserId,
    timestamp: Date.now(),
    rtpTimestamp: rtpTimestamp
  });
}
```

---

### Tolerance Window Strategy

**Tolerance:** ±50ms window

**Rationale:**
- **Network Jitter:** Packets may arrive out of order (±20ms typical)
- **Packet Loss:** Receiver may skip frames, causing timestamp gaps
- **Encoding/Decoding Delays:** Processing time may vary (±10ms)
- **Safety Margin:** Additional buffer for edge cases (±20ms)

**Total Tolerance:** ±50ms provides reasonable coverage for typical network conditions

**Packet Loss Handling:**
- If no match found within tolerance → Frame considered lost
- Server will record NACK for that receiver
- Missing frames will appear in `AckSummary.missingUsers`

---

### RTP Timestamp Extraction

**Location:** `src/services/UserClient.ts` - `getRtpTimestampFromStats()`

**Approach:**
```typescript
/**
 * Extract RTP timestamp from WebRTC stats
 * Used for matching receiver frames with sender frames
 */
private async getRtpTimestampFromStats(): Promise<number | null> {
  if (!this.peerConnection) return null;
  
  try {
    const stats = await this.peerConnection.getStats();
    
    // Extract RTP timestamp from stats
    // WebRTC stats structure:
    // - outbound-rtp: timestamp (RTP timestamp)
    // - inbound-rtp: timestamp (RTP timestamp)
    
    for (const [id, stat] of stats.entries()) {
      if (stat.type === 'outbound-rtp' && stat.timestamp) {
        return stat.timestamp;
      }
    }
    
    // Fallback: Use current time as approximation
    return Date.now();
  } catch (error) {
    console.error('[UserClient] Error getting RTP timestamp:', error);
    return null;
  }
}
```

**Note:** Initial implementation may use `Date.now()` as approximation. Will be refined with actual WebRTC stats structure during implementation.

---

### Compliance Status

**Specification Compliance:** ⚠️ **APPROXIMATION**
- **Intent:** ✅ Matches `dev_specs/flow_charts.md` lines 104-106 intent (receiver computes CRC32 on decoded frame)
- **Method:** ⚠️ Uses RTP timestamp matching instead of direct `frameId` in RTP packets (practical limitation)
- **Rationale:** RTP packets don't include custom `frameId` field, and adding custom RTP header extensions is complex

**Documentation:**
- Decision documented in `USER_STORY_3_IMPLEMENTATION_GUIDE.md` section "Decision 2"
- Implementation code includes comments explaining approximation and tolerance

---

## Summary

### Key Decisions

1. **CRC32 Computation:** Use PCM frames (approximation) instead of encoded frames
2. **Frame Matching:** Use RTP timestamp with ±50ms tolerance window

### Common Themes

Both decisions use **approximation approaches** with **adjustable thresholds** to:
- Work within WebRTC's limitations
- Account for network conditions (packet loss, jitter)
- Provide practical implementation paths

### Future Enhancements

1. **CRC32 Threshold:** Can be adjusted based on network conditions and encoding quality
2. **RTP Timestamp Extraction:** Will be refined with actual WebRTC stats structure
3. **Tolerance Window:** Can be tuned based on observed network jitter patterns

---

## References

- **Implementation Guide:** `USER_STORY_3_IMPLEMENTATION_GUIDE.md`
- **User Story 11 Guide:** `USER_STORY_11_IMPLEMENTATION_GUIDE.md`
- **Dev Specs:** `assets/dev_specs/`
  - `flow_charts.md` - Flow diagrams
  - `APIs.md` - API specifications
  - `data_schemas.md` - Data structures
  - `public_interfaces.md` - Message formats

---

**Decision Record Complete** ✅  
**Status:** Approved and Ready for Implementation  
**Last Updated:** November 7, 2025

