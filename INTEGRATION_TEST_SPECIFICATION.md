# Integration Test Specification: Frontend-Backend System

**Document Version:** 1.0  
**Date:** November 14, 2024  
**Project:** WebRTC Audio Conferencing System

---

## 1. Overview

This document specifies integration tests for code pathways that span both frontend and backend components. These tests verify end-to-end functionality including WebSocket signaling, WebRTC connection establishment, audio fingerprinting, adaptive quality control, and meeting state management.

### 1.1 Components Under Test

**Frontend Components:**
- `UserClient` (`src/services/UserClient.ts`)
- `SignalingClient` (`src/services/SignalingClient.ts`)
- `AudioCapture` (`src/services/AudioCapture.ts`)
- `AudioPlayer` (`src/services/AudioPlayer.ts`)

**Backend Components:**
- `SignalingServer` (`backend/src/SignalingServer.ts`)
- `MeetingRegistry` (`backend/src/MeetingRegistry.ts`)
- `MediasoupManager` (`backend/src/MediasoupManager.ts`)
- `StreamForwarder` (`backend/src/StreamForwarder.ts`)
- `FingerprintVerifier` (`backend/src/FingerprintVerifier.ts`)
- `AckAggregator` (`backend/src/AckAggregator.ts`)
- `RtcpCollector` (`backend/src/RtcpCollector.ts`)
- `QualityController` (`backend/src/QualityController.ts`)

### 1.2 Test Environment Setup

**Prerequisites:**
1. Backend server running on `localhost:8080` or configured via `VITE_WS_URL`
2. Frontend built and served (development or production)
3. Browser with WebRTC support (Chrome 90+, Firefox 88+, Safari 14+)
4. Network allowing UDP ports 40000-49999 for RTC media
5. Microphone access permissions granted

**Test Data:**
- Test Meeting IDs: `test-meeting-001`, `test-meeting-002`
- Test User IDs: `user-alice`, `user-bob`, `user-charlie`
- Test Display Names: `Alice`, `Bob`, `Charlie`

---

## 2. Functionality to be Tested

### 2.1 User Story 11: Initial Audio Connection
- WebSocket connection establishment
- Meeting join flow (JOIN → JOINED)
- WebRTC offer/answer exchange
- ICE candidate negotiation
- Audio track transmission and reception
- Connection state management
- Error handling and recovery

### 2.2 User Story 3: Audio Fingerprinting
- Sender fingerprint generation and transmission
- Receiver fingerprint generation and transmission
- Fingerprint verification on backend
- ACK summary generation and delivery
- CRC32 integrity checking
- RTP timestamp synchronization

### 2.3 User Story 8: Adaptive Quality Control
- RTCP report generation and transmission
- RTCP statistics aggregation
- Quality tier decision algorithm
- Tier change notification delivery
- Simulcast layer switching
- Quality degradation and recovery

### 2.4 Meeting State Management
- Multiple users joining same meeting
- Participant list synchronization
- User leaving meeting
- Meeting cleanup on last user departure
- Concurrent meeting support

### 2.5 Error Handling & Edge Cases
- WebSocket connection failures
- Authentication errors
- Invalid message formats
- Timeout handling
- Reconnection scenarios
- Resource cleanup

---

## 3. Integration Test Suite

### 3.1 User Story 11: Initial Audio Connection

#### Test Group: WebSocket Connection & Meeting Join

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-11-001 | Verify WebSocket connection establishment | Frontend: `UserClient.joinMeeting()` with valid meeting ID | Backend: WebSocket connection accepted, connection event logged | WebSocket `readyState` === `OPEN` (1), no connection errors |
| INT-11-002 | Verify JOIN message transmission and JOINED response | Frontend: Send `{type: 'join', meetingId: 'test-meeting-001', userId: 'user-alice', displayName: 'Alice'}` | Backend: Receive JOIN, create meeting session, send JOINED with `{success: true, participants: ['user-alice']}` | Frontend receives JOINED message, `isJoined` === `true`, connection state → 'Signaling' |
| INT-11-003 | Verify multiple users can join same meeting | Frontend: Two UserClients join `test-meeting-001` sequentially | Backend: Both users added to meeting, each receives JOINED with both participants in list | Both clients receive `participants` array containing both user IDs |
| INT-11-004 | Verify join timeout handling | Frontend: Send JOIN but backend doesn't respond within 10s | Frontend: Promise rejects with 'Join timeout' error | Error thrown, connection state → 'Disconnected', cleanup performed |
| INT-11-005 | Verify join with duplicate userId in same meeting | Frontend: Join meeting with userId already in that meeting | Backend: Send ERROR message with code 400, message 'User already in meeting' | Frontend receives error, join fails gracefully |

#### Test Group: WebRTC Signaling (SDP & ICE)

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|---|---------------|
| INT-11-006 | Verify SDP offer generation and transmission | Frontend: `UserClient.createOffer()` after successful join | Frontend: Generate offer with audio track, send `{type: 'offer', sdp: '...', meetingId: '...'}` | Offer contains `m=audio`, codec includes Opus, backend receives offer message |
| INT-11-007 | Verify backend processes offer and returns answer | Frontend: Send valid SDP offer | Backend: Process offer through MediasoupManager, create transport, generate SDP answer, send `{type: 'answer', sdp: '...'}` | Frontend receives answer, `setRemoteDescription()` succeeds |
| INT-11-008 | Verify ICE candidate exchange (frontend → backend) | Frontend: Generate ICE candidates after offer | Frontend: Send `{type: 'ice-candidate', candidate: {...}, meetingId: '...'}` for each candidate | Backend receives candidates, adds them via `addIceCandidate()` |
| INT-11-009 | Verify ICE candidate exchange (backend → frontend) | Backend: Generate ICE candidates for client | Backend: Send `{type: 'ice-candidate', candidate: {...}}` to frontend | Frontend receives candidates, adds to peer connection, ICE connection state → 'connected' |
| INT-11-010 | Verify complete WebRTC connection establishment | Frontend: Complete join flow including all signaling steps | End-to-end: WebSocket connected, offer/answer exchanged, ICE completed | `RTCPeerConnection.iceConnectionState` === 'connected' or 'completed', audio tracks flowing |

#### Test Group: Audio Transmission & Reception

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-11-011 | Verify audio track added to peer connection | Frontend: `AudioCapture.start()` captures microphone | Frontend: MediaStream added to peer connection, track visible in `getSenders()` | Peer connection has audio sender, track enabled |
| INT-11-012 | Verify audio simulcast encoding parameters | Frontend: Add audio track with simulcast config | Backend: Receive producer with 3 layers (LOW/MED/HIGH: 16/32/64 kbps) | Backend logs show 3 encoding layers created |
| INT-11-013 | Verify audio track reception | Frontend A: Send audio | Frontend B: Receive remote track via `ontrack` event | Frontend B's `AudioPlayer` receives track, `remoteAudio.srcObject` set |
| INT-11-014 | Verify bidirectional audio flow | Frontend A & B: Both send and receive audio | Both: Send audio via microphone, receive audio via speakers | Both peer connections have active sender and receiver |
| INT-11-015 | Verify audio transmission after network interruption | System: Simulate brief network drop (3s), then restore | System: ICE reconnects, audio resumes automatically | Connection state recovers to 'connected', audio continues without manual intervention |

---

### 3.2 User Story 3: Audio Fingerprinting

#### Test Group: Sender Fingerprint Flow

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-3-001 | Verify sender fingerprint generation | Frontend: `UserClient` starts sending audio | Frontend: Generate CRC32 fingerprint every 40ms, get RTP timestamp from outbound-rtp stats | Fingerprint computed from audio frame PCM data using CRC-32 algorithm |
| INT-3-002 | Verify sender fingerprint transmission | Frontend: Generated fingerprint with RTP timestamp | Frontend: Send `{type: 'frame-fingerprint', role: 'sender', fingerprint: 0xABCD1234, rtpTimestamp: 123456, meetingId: '...', userId: '...'}` | Backend receives fingerprint message via WebSocket |
| INT-3-003 | Verify sender fingerprint rate (25 fps) | Frontend: Send audio at normal rate | Frontend: Send ~25 fingerprints per second (40ms intervals) | Backend receives fingerprints at rate of 23-27 per second (allowing ±2 variance) |
| INT-3-004 | Verify sender fingerprint storage on backend | Backend: Receive sender fingerprint | Backend: Store in `FingerprintVerifier` with tuple `(meetingId, senderId, rtpTimestamp, fingerprint)` | Fingerprint retrievable from verifier storage |

#### Test Group: Receiver Fingerprint Flow

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-3-005 | Verify receiver fingerprint generation | Frontend B: Receive audio from Frontend A | Frontend B: Compute CRC32 from decoded audio frame every 40ms | Fingerprint computed from received PCM data |
| INT-3-006 | Verify receiver fingerprint transmission | Frontend B: Generated receiver fingerprint | Frontend B: Send `{type: 'frame-fingerprint', role: 'receiver', fingerprint: 0xABCD1234, rtpTimestamp: 123456, senderId: 'user-alice', meetingId: '...', userId: 'user-bob'}` | Backend receives receiver fingerprint with correct senderId reference |
| INT-3-007 | Verify fingerprint verification on backend | Backend: Receive matching sender and receiver fingerprints | Backend: `FingerprintVerifier.verify()` returns `true` when fingerprints match for same RTP timestamp | Verification succeeds for matching fingerprints |
| INT-3-008 | Verify fingerprint mismatch detection | Backend: Receive non-matching fingerprints (simulate corruption) | Backend: `FingerprintVerifier.verify()` returns `false` | Verification fails, mismatch logged |

#### Test Group: ACK Summary Generation & Delivery

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-3-009 | Verify ACK summary generation every 5 seconds | Backend: Collect fingerprint verifications over time | Backend: `AckAggregator` generates summary every 5s with `{ackedUsers: [...], missingUsers: [...], matchRate: 0.XX}` | Summary generated on timer, includes all participants |
| INT-3-010 | Verify ACK summary transmission to sender | Backend: Generate ACK summary for user-alice | Backend: Send `{type: 'ack-summary', ackedUsers: ['user-bob'], missingUsers: [], matchRate: 1.0, timestamp: ...}` via WebSocket | Frontend (user-alice) receives ACK summary message |
| INT-3-011 | Verify ACK summary reflects partial reception | System: 2 receivers, 1 receives audio, 1 doesn't | Backend: ACK summary shows `ackedUsers: ['user-bob'], missingUsers: ['user-charlie']` | Match rate accurately reflects 50% reception |
| INT-3-012 | Verify ACK summary callback on frontend | Frontend: Receive ACK summary | Frontend: `UserClient.onAckSummary()` callback fires with summary data | Callback invoked, UI can display reception status |

---

### 3.3 User Story 8: Adaptive Quality Control

#### Test Group: RTCP Statistics Collection

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-8-001 | Verify RTCP report generation on frontend | Frontend: Active audio transmission for 2+ seconds | Frontend: Collect stats from `getStats()`: `{packetsLost, jitter, rtt, timestamp}` | Stats object contains valid numeric values |
| INT-8-002 | Verify RTCP report transmission every 2 seconds | Frontend: Ongoing audio call | Frontend: Send `{type: 'rtcp-report', meetingId: '...', userId: '...', rtcpData: {...}}` every 2s | Backend receives RTCP reports at ~0.5 Hz rate |
| INT-8-003 | Verify RTCP report aggregation on backend | Backend: Receive RTCP reports from multiple users | Backend: `RtcpCollector.addReport()` stores reports per user | Reports retrievable via `getReports(meetingId, userId)` |
| INT-8-004 | Verify RTCP statistics averaging | Backend: Receive 5 reports from same user | Backend: `RtcpCollector` computes average packet loss, jitter, RTT | Averages calculated correctly over sliding window |

#### Test Group: Quality Tier Decision

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-8-005 | Verify quality downgrade on high packet loss | Backend: RTCP shows packet loss > 5% | Backend: `QualityController.determineTier()` returns lower tier (HIGH → MEDIUM or MEDIUM → LOW) | Tier downgrade decision made |
| INT-8-006 | Verify quality downgrade on high jitter | Backend: RTCP shows jitter > 30ms | Backend: Tier downgrade recommended | Lower tier selected |
| INT-8-007 | Verify quality downgrade on high RTT | Backend: RTCP shows RTT > 250ms | Backend: Tier downgrade recommended | Lower tier selected |
| INT-8-008 | Verify quality upgrade when network improves | Backend: Previously degraded, now packet loss < 2%, jitter < 20ms, RTT < 150ms | Backend: Tier upgrade recommended (LOW → MEDIUM or MEDIUM → HIGH) | Tier upgrade decision made after stability period |
| INT-8-009 | Verify tier decision rate limiting | Backend: Network oscillates rapidly | Backend: Tier changes no more than once per 10 seconds | Rate limiting prevents tier flapping |

#### Test Group: Tier Change Notification & Application

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-8-010 | Verify tier change notification transmission | Backend: `QualityController` decides tier change for user-alice | Backend: Send `{type: 'tier-change', tier: 'MEDIUM', timestamp: ...}` to user-alice | Message sent via WebSocket |
| INT-8-011 | Verify tier change reception on frontend | Frontend: Receive tier-change message | Frontend: `onTierChange()` callback fires, `currentTier` updated | State updated to new tier |
| INT-8-012 | Verify simulcast layer selection on backend | Backend: Tier change to MEDIUM for receiver | Backend: `StreamForwarder.setPreferredLayer()` called with spatialLayer=1 (MEDIUM) | Mediasoup consumer switches to medium layer |
| INT-8-013 | Verify quality improvement observable on frontend | System: Tier upgraded from LOW to HIGH | Frontend: Receiver experiences better audio quality (less artifacts, higher fidelity) | Audio quality measurably improves (can be verified via stats or perceptual test) |
| INT-8-014 | Verify end-to-end adaptive quality loop | System: Simulate network degradation → improvement | System: Quality degrades (HIGH→LOW), then upgrades (LOW→HIGH) automatically | Complete loop: packet loss increases → tier drops → network recovers → tier increases |

---

### 3.4 Meeting State Management

#### Test Group: Multi-User Meetings

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-4-001 | Verify sequential user joins | System: User A joins, then User B joins same meeting | Backend: Meeting has 2 participants, both receive updated participant lists | Each JOINED message contains both user IDs |
| INT-4-002 | Verify concurrent user joins | System: 3 users attempt to join simultaneously | Backend: All 3 users successfully join, meeting has 3 participants | All receive JOINED with 3-user participant list |
| INT-4-003 | Verify user-joined notification | System: User A in meeting, User B joins | Frontend A: Receives `{type: 'user-joined', userId: 'user-bob'}` notification | Notification received, participant list updated in UI |
| INT-4-004 | Verify user leaving meeting | System: User B sends `{type: 'leave', meetingId: '...'}` | Backend: Remove user from meeting, send `user-left` notification to others | User removed, others notified |
| INT-4-005 | Verify user-left notification | System: User B leaves meeting | Frontend A: Receives `{type: 'user-left', userId: 'user-bob'}` | Notification received, participant list updated |
| INT-4-006 | Verify meeting cleanup on last user departure | System: Last user leaves meeting | Backend: Meeting removed from `MeetingRegistry`, resources freed | Meeting no longer exists, `getMeeting()` returns null |
| INT-4-007 | Verify WebSocket disconnect triggers automatic leave | System: User closes browser/loses connection | Backend: Detect WebSocket close, automatically remove user from meeting, notify others | Auto-cleanup performed, other users notified |

#### Test Group: Concurrent Meetings

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-4-008 | Verify multiple independent meetings | System: Meeting A (users 1,2) and Meeting B (users 3,4) active simultaneously | Backend: Both meetings maintained separately, no cross-contamination | Each meeting has correct participants, audio doesn't leak between meetings |
| INT-4-009 | Verify user can only be in one meeting at a time | System: User A in Meeting 1, attempts to join Meeting 2 | Backend: First meeting session terminated OR second join rejected | User cannot be in two meetings simultaneously |
| INT-4-010 | Verify meeting isolation (audio routing) | System: 4 users in 2 separate meetings | Backend: Audio from Meeting A not routed to Meeting B and vice versa | Stream isolation verified, no audio leakage |

---

### 3.5 Error Handling & Edge Cases

#### Test Group: Connection Errors

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-5-001 | Verify backend unreachable handling | Frontend: Attempt join with backend stopped | Frontend: WebSocket connection fails, error logged, connection state → 'Disconnected' | Error handled gracefully, UI shows "Unable to connect" |
| INT-5-002 | Verify invalid WebSocket URL handling | Frontend: Configure invalid `VITE_WS_URL` (e.g., `ws://invalid:9999`) | Frontend: Connection attempt fails, error caught, user notified | Error message displayed, application doesn't crash |
| INT-5-003 | Verify network interruption during join | System: Disconnect network after JOIN sent but before JOINED received | Frontend: Timeout after 10s, join fails, error logged | Timeout handled, cleanup performed |
| INT-5-004 | Verify WebSocket reconnection | System: Established connection, then backend restarts | Frontend: Detect close event, attempt reconnection with exponential backoff | Reconnection attempted, connection re-established |

#### Test Group: Invalid Messages

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-5-005 | Verify malformed JSON handling | Frontend: Send non-JSON data over WebSocket | Backend: Catch parse error, send ERROR message with code 400 | Error message returned, connection remains open |
| INT-5-006 | Verify unknown message type handling | Frontend: Send `{type: 'invalid-type', data: '...'}` | Backend: Send ERROR with message 'Unknown message type' | Error returned, message logged |
| INT-5-007 | Verify missing required fields | Frontend: Send `{type: 'join'}` without meetingId | Backend: Validation fails, send ERROR with code 400 | Validation error returned |
| INT-5-008 | Verify invalid SDP handling | Frontend: Send offer with corrupted SDP | Backend: `setRemoteDescription()` fails, error logged | Error handled, doesn't crash server |

#### Test Group: Resource Management

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-5-009 | Verify peer connection cleanup on disconnect | System: User disconnects unexpectedly | Frontend & Backend: Peer connection closed, resources released | No memory leaks, event listeners removed |
| INT-5-010 | Verify audio track cleanup | System: User leaves meeting | Frontend: Stop audio capture, remove tracks from peer connection | Microphone released, tracks stopped |
| INT-5-011 | Verify mediasoup resource cleanup | System: Last user leaves meeting | Backend: Mediasoup router, transports, producers, consumers destroyed | Resources freed, memory released |
| INT-5-012 | Verify interval cleanup | Frontend: Leave meeting with active fingerprint/RTCP intervals | Frontend: All `setInterval()` timers cleared | No orphaned intervals continue running |

#### Test Group: Timeout Scenarios

| Test ID | Test Purpose | Test Inputs | Expected Output | Pass Criteria |
|---------|-------------|-------------|-----------------|---------------|
| INT-5-013 | Verify join timeout (no JOINED response) | Backend: Receive JOIN but don't respond | Frontend: Timeout after 10s, promise rejects | Timeout error thrown, cleaned up |
| INT-5-014 | Verify answer timeout (no ANSWER response) | Backend: Receive OFFER but don't respond | Frontend: Timeout after 10s, connection state → 'Disconnected' | Timeout handled |
| INT-5-015 | Verify ICE gathering timeout | System: No ICE candidates generated (network issue) | Frontend: ICE gathering state → 'failed', connection attempt aborted | Timeout detected, user notified |

---

## 4. Test Execution Instructions

### 4.1 Prerequisites

1. **Start Backend Server:**
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```
   Verify: Console shows "✅ Server ready for WebSocket connections"

2. **Build Frontend:**
   ```bash
   npm install
   npm run build
   npm run preview  # or npm run dev
   ```

3. **Configure Environment:**
   - Set `VITE_WS_URL=ws://localhost:8080` (or use default)
   - Grant microphone permissions when prompted

### 4.2 Manual Test Execution

**For Single-User Tests:**
1. Open application in browser: `http://localhost:4173`
2. Open browser DevTools (F12) → Console
3. Enter meeting ID, user ID, display name
4. Click "Join Meeting"
5. Observe console logs and verify expected behaviors

**For Multi-User Tests:**
1. Open application in multiple browser tabs/windows
2. Use different user IDs for each instance
3. Join the same meeting ID
4. Verify interactions between users

### 4.3 Automated Test Execution

**Test Framework Recommendations:**
- **End-to-End:** Playwright or Cypress
- **WebSocket Mock:** Mock WebSocket server for unit-level integration tests
- **Audio Mock:** Use Web Audio API with generated test tones

**Example Test Structure:**
```typescript
describe('INT-11-002: Meeting Join Flow', () => {
  let backend: MockBackendServer;
  let userClient: UserClient;
  
  beforeEach(() => {
    backend = new MockBackendServer(8080);
    userClient = new UserClient('user-alice', 'test-meeting-001', 'Alice');
  });
  
  afterEach(() => {
    backend.close();
    userClient.disconnect();
  });
  
  it('should receive JOINED message after sending JOIN', async () => {
    await userClient.joinMeeting();
    expect(userClient.isJoined).toBe(true);
    expect(userClient.connectionState).toBe('Signaling');
  });
});
```

### 4.4 Test Data Collection

For each test, collect and verify:
- **Console Logs:** Frontend and backend logs showing message flow
- **Network Tab:** WebSocket frame inspection
- **WebRTC Stats:** `getStats()` output for connection state
- **Timing:** Message round-trip times
- **Error Messages:** Any errors or warnings

---

## 5. Success Criteria

### 5.1 Overall System

- ✅ All 74 integration tests pass
- ✅ No console errors during normal operation
- ✅ Audio quality acceptable (no major artifacts)
- ✅ Connection establishment < 5 seconds
- ✅ No memory leaks over 1-hour test session

### 5.2 Key Performance Indicators

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Join Success Rate | > 99% | Successful joins / Total attempts |
| Connection Time | < 5s | Time from JOIN to audio flowing |
| Fingerprint Match Rate | > 95% | Matching fingerprints / Total verified |
| Tier Change Latency | < 3s | Time from RTCP trigger to tier change applied |
| WebSocket Latency | < 100ms | Round-trip time for signaling messages |
| Audio Latency | < 300ms | End-to-end audio delay |

---

## 6. Known Limitations & Future Tests

### 6.1 Current Limitations

- Authentication not fully implemented (JWT validation stubbed)
- TURN server fallback not tested (assumes direct connectivity)
- Mobile browser testing not included
- High-load testing (100+ concurrent users) not covered
- Screen sharing integration not included

### 6.2 Future Test Coverage

- **Security Testing:** JWT validation, injection attacks, DoS protection
- **Performance Testing:** Load testing with 100+ users, stress testing
- **Browser Compatibility:** Safari, Firefox, Edge-specific tests
- **Network Conditions:** Packet loss simulation, bandwidth throttling, high latency
- **Mobile Testing:** iOS Safari, Android Chrome
- **Accessibility:** Screen reader compatibility, keyboard navigation

---

## 7. Test Reporting

### 7.1 Report Format

Each test execution should generate a report including:
- Test ID and description
- Execution timestamp
- Pass/Fail status
- Execution time
- Error messages (if failed)
- Screenshots/logs (if applicable)

### 7.2 Defect Tracking

When a test fails:
1. Log defect with test ID reference
2. Capture full error stack trace
3. Record steps to reproduce
4. Assign severity: Critical / Major / Minor
5. Link to related code files

---

## 8. Appendix: Message Flow Diagrams

### 8.1 User Story 11: Complete Join Flow

```
Frontend                    Backend
   |                           |
   |-- WS Connect ------------>|
   |<-- WS Open ---------------|
   |                           |
   |-- JOIN ------------------->|
   |                           |-- MeetingRegistry.addUser()
   |                           |-- MediasoupManager.createTransport()
   |<-- JOINED ----------------|
   |                           |
   |-- OFFER ------------------>|
   |                           |-- MediasoupManager.handleOffer()
   |<-- ANSWER ----------------|
   |                           |
   |-- ICE Candidate --------->|
   |<-- ICE Candidate ---------|
   |                           |
   [ICE Connection Established]
   |                           |
   |== RTP Audio =============>|
   |<============= RTP Audio ==|
```

### 8.2 User Story 3: Fingerprint Flow

```
Frontend A          Backend          Frontend B
   |                   |                 |
   |-- Sender FP ----->|                 |
   |                   |-- Store --------|
   |                   |                 |
   |                   |<-- Receiver FP -|
   |                   |-- Verify -------|
   |                   |-- Aggregate ----|
   |                   |                 |
   |<-- ACK Summary ---|                 |
```

### 8.3 User Story 8: Quality Control Flow

```
Frontend            Backend
   |                   |
   |-- RTCP Report --->|
   |                   |-- RtcpCollector.addReport()
   |                   |-- QualityController.determineTier()
   |                   |-- (if tier change needed)
   |<-- Tier Change ---|
   |                   |-- StreamForwarder.setPreferredLayer()
   |                   |
```

---

**End of Integration Test Specification**

