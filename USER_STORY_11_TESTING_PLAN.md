# User Story 11: Comprehensive Testing Plan

**Purpose:** Verify server-mediated audio transmission (sender → server → receiver) and ensure all dependencies work without conflicts.

**Date:** November 7, 2025  
**Status:** Pre-Testing Planning

---

## 📋 Testing Objectives

### Primary Objective
**Verify audio propagates from sender → server → receiver without interruption** (per `dev_specs/user_stories.md` line 10)

### Secondary Objectives
1. Verify all components in the audio pipeline work correctly
2. Verify all dependencies are compatible and conflict-free
3. Verify server-mediated architecture (not peer-to-peer)
4. Verify simulcast tiers (16/32/64 kbps) are transmitted
5. Verify bidirectional communication (send and receive)

---

## 🏗️ Architecture Under Test

### Audio Flow Path
```
Sender Client
  ↓
AudioCapture (microphone)
  ↓
WebRTC RTCPeerConnection (simulcast encoding)
  ↓
RTP packets (3 tiers: 16/32/64 kbps)
  ↓
WebSocket Signaling (SDP/ICE)
  ↓
SignalingServer (backend)
  ↓
MediasoupManager (SFU)
  ↓
Producer (receives RTP from sender)
  ↓
Consumer (forwards RTP to receiver)
  ↓
WebRTC RTCPeerConnection (receiver)
  ↓
AudioPlayer (speakers)
  ↓
Receiver Client
```

### Components to Test

**Frontend:**
- `UserClient.ts` - WebRTC orchestration
- `SignalingClient.ts` - WebSocket signaling
- `AudioCapture.ts` - Microphone input
- `AudioPlayer.ts` - Speaker output

**Backend:**
- `SignalingServer.ts` - WebSocket server, SDP negotiation
- `MediasoupManager.ts` - mediasoup Worker, Router, Transports, Producer/Consumer
- `MeetingRegistry.ts` - Session management
- `StreamForwarder.ts` - RTP forwarding coordination

**Dependencies:**
- `mediasoup` (backend) - SFU library
- `ws` (backend) - WebSocket server
- `jsonwebtoken` (backend) - Authentication
- WebRTC APIs (browser) - Native RTP/RTCP
- Web Audio API (browser) - Audio capture/playback

---

## 🧪 Test Phases

### Phase 1: Dependency Verification
**Goal:** Ensure all dependencies are installed, compatible, and conflict-free.

### Phase 2: Component-Level Testing
**Goal:** Test individual components in isolation.

### Phase 3: Integration Testing
**Goal:** Test component interactions and data flow.

### Phase 4: End-to-End Testing
**Goal:** Verify complete audio transmission path (sender → server → receiver).

### Phase 5: Stress & Edge Case Testing
**Goal:** Test with multiple users, connection failures, and edge cases.

---

## 📝 Phase 1: Dependency Verification

### 1.1 Backend Dependencies

#### Test: Verify Backend Package Installation
**Steps:**
1. Navigate to `backend/` directory
2. Run `npm install`
3. Verify no errors or warnings
4. Check `node_modules/` exists

**Expected Result:**
- ✅ All packages installed successfully
- ✅ No version conflicts
- ✅ No missing peer dependencies

**Dependencies to Verify:**
- `mediasoup@^3.19.7` - SFU library
- `ws@^8.18.3` - WebSocket server
- `jsonwebtoken@^9.0.2` - JWT authentication
- `@types/node@^24.10.0` - TypeScript types
- `@types/ws@^8.18.1` - WebSocket types
- `typescript@^5.9.3` - TypeScript compiler

**Success Criteria:**
- ✅ `npm install` completes without errors
- ✅ All dependencies listed in `package.json` are installed
- ✅ No peer dependency warnings

---

#### Test: Verify Backend TypeScript Compilation
**Steps:**
1. Navigate to `backend/` directory
2. Run `npm run build`
3. Check for compilation errors

**Expected Result:**
- ✅ TypeScript compiles successfully
- ✅ No type errors
- ✅ `dist/` directory created with compiled files

**Success Criteria:**
- ✅ `npm run build` exits with code 0
- ✅ All `.ts` files compile to `.js` in `dist/`
- ✅ No TypeScript errors or warnings

---

#### Test: Verify mediasoup Installation & Compatibility
**Steps:**
1. Check `mediasoup` is installed: `npm list mediasoup`
2. Verify mediasoup version: `node -e "console.log(require('mediasoup/package.json').version)"`
3. Check mediasoup native dependencies are built

**Expected Result:**
- ✅ mediasoup@3.19.7 installed
- ✅ Native dependencies compiled (no errors)

**Success Criteria:**
- ✅ mediasoup package found in `node_modules`
- ✅ Version matches `^3.19.7`
- ✅ No native build errors

---

### 1.2 Frontend Dependencies

#### Test: Verify Frontend Package Installation
**Steps:**
1. Navigate to project root
2. Run `npm install`
3. Verify no errors or warnings

**Expected Result:**
- ✅ All packages installed successfully
- ✅ No version conflicts

**Key Dependencies to Verify:**
- `react@^18.2.0` - UI framework
- `vite@^5.0.8` - Build tool
- `typescript@^5.2.2` - TypeScript compiler
- WebRTC APIs (browser native)
- Web Audio API (browser native)

**Success Criteria:**
- ✅ `npm install` completes without errors
- ✅ All dependencies installed
- ✅ No peer dependency warnings

---

#### Test: Verify Frontend TypeScript Compilation
**Steps:**
1. Navigate to project root
2. Run `npm run build`
3. Check for compilation errors

**Expected Result:**
- ✅ TypeScript compiles successfully
- ✅ No type errors

**Success Criteria:**
- ✅ `npm run build` exits with code 0
- ✅ No TypeScript errors or warnings

---

### 1.3 Dependency Conflict Check

#### Test: Check for Version Conflicts
**Steps:**
1. Run `npm ls` in both `backend/` and root
2. Check for duplicate packages with different versions
3. Verify no conflicting peer dependencies

**Expected Result:**
- ✅ No version conflicts
- ✅ All packages use compatible versions

**Success Criteria:**
- ✅ `npm ls` shows no conflicts
- ✅ No duplicate packages with different versions
- ✅ All peer dependencies satisfied

---

## 📝 Phase 2: Component-Level Testing

### 2.1 Backend Components

#### Test: MediasoupManager Initialization
**Steps:**
1. Create test script: `test-mediasoup-init.ts`
2. Import `MediasoupManager`
3. Call `mediasoupManager.initialize()`
4. Verify Worker and Router are created

**Expected Result:**
- ✅ Worker created successfully
- ✅ Router created with Opus codec (payload type 111, 48kHz, 2 channels)
- ✅ No errors during initialization

**Success Criteria:**
- ✅ `initialize()` completes without errors
- ✅ Worker PID is valid
- ✅ Router ID is valid
- ✅ Router RTP capabilities include Opus codec

**Code to Test:**
```typescript
const mediasoupManager = new MediasoupManager();
await mediasoupManager.initialize();
const capabilities = mediasoupManager.getRouterRtpCapabilities();
// Verify Opus codec in capabilities
```

---

#### Test: MediasoupManager Transport Creation
**Steps:**
1. Initialize MediasoupManager
2. Call `createTransport(userId)`
3. Verify transport is created with ICE/DTLS parameters

**Expected Result:**
- ✅ Transport created successfully
- ✅ Transport has `id`, `iceParameters`, `iceCandidates`, `dtlsParameters`
- ✅ Transport stored in `transports` Map

**Success Criteria:**
- ✅ `createTransport()` returns transport parameters
- ✅ Transport ID is non-empty string
- ✅ ICE parameters include `usernameFragment` and `password`
- ✅ ICE candidates array is non-empty
- ✅ DTLS parameters include fingerprints

---

#### Test: MediasoupManager Producer Creation
**Steps:**
1. Initialize MediasoupManager
2. Create transport for user
3. Connect transport with DTLS parameters
4. Create Producer with RTP parameters
5. Verify Producer is created

**Expected Result:**
- ✅ Producer created successfully
- ✅ Producer ID is valid
- ✅ Producer stored in `producers` Map

**Success Criteria:**
- ✅ `createProducer()` returns Producer ID
- ✅ Producer exists in `producers` Map
- ✅ Producer is active and ready to receive RTP

---

#### Test: MediasoupManager Consumer Creation
**Steps:**
1. Initialize MediasoupManager
2. Create transport for sender and receiver
3. Create Producer for sender
4. Create Consumer for receiver
5. Verify Consumer is created

**Expected Result:**
- ✅ Consumer created successfully
- ✅ Consumer ID is valid
- ✅ Consumer has RTP parameters
- ✅ Consumer stored in `consumers` Map

**Success Criteria:**
- ✅ `createConsumer()` returns Consumer object
- ✅ Consumer exists in `consumers` Map
- ✅ Consumer RTP parameters are valid

---

#### Test: MeetingRegistry Operations
**Steps:**
1. Create `MeetingRegistry` instance
2. Test `registerUser()`
3. Test `listRecipients()`
4. Test `getMeeting()`
5. Test `removeUser()`
6. Test `updateQualityTier()`

**Expected Result:**
- ✅ All methods work correctly
- ✅ Meeting created on first user registration
- ✅ Users added to meeting sessions
- ✅ Meeting deleted when last user leaves

**Success Criteria:**
- ✅ `registerUser()` creates meeting if needed
- ✅ `listRecipients()` returns correct users
- ✅ `getMeeting()` returns meeting or null
- ✅ `removeUser()` removes user and deletes meeting if empty
- ✅ `updateQualityTier()` updates meeting tier

---

#### Test: SignalingServer Message Handling
**Steps:**
1. Create `SignalingServer` instance
2. Test `handleJoin()` - verify authentication and user registration
3. Test `handleOffer()` - verify SDP answer generation
4. Test `handleAnswer()` - verify DTLS connection and Producer/Consumer creation
5. Test `handleIceCandidate()` - verify ICE relay

**Expected Result:**
- ✅ All message handlers work correctly
- ✅ SDP answers are WebRTC-compatible
- ✅ Producers and Consumers created correctly

**Success Criteria:**
- ✅ `handleJoin()` authenticates and registers user
- ✅ `handleOffer()` generates valid SDP answer
- ✅ `handleAnswer()` connects transport and creates Producer/Consumer
- ✅ `handleIceCandidate()` relays ICE candidates

---

### 2.2 Frontend Components

#### Test: AudioCapture Start/Stop
**Steps:**
1. Create `AudioCapture` instance
2. Call `start()` - verify microphone access
3. Call `readFrame()` - verify PCM frames are read
4. Call `stop()` - verify microphone released

**Expected Result:**
- ✅ Microphone access granted
- ✅ PCM frames are read (20ms chunks)
- ✅ Audio level monitoring works
- ✅ Microphone released on stop

**Success Criteria:**
- ✅ `start()` resolves without errors
- ✅ `readFrame()` returns PCM frames
- ✅ `getAudioLevel()` returns valid level (0-1)
- ✅ `stop()` releases microphone

---

#### Test: AudioPlayer Play/Stop
**Steps:**
1. Create `AudioPlayer` instance
2. Create test audio track (sine wave or test tone)
3. Call `play(track)` - verify audio plays
4. Call `stop()` - verify audio stops

**Expected Result:**
- ✅ Audio plays through speakers
- ✅ Audio level monitoring works
- ✅ Audio stops cleanly

**Success Criteria:**
- ✅ `play()` resolves without errors
- ✅ Audio is audible (if speakers enabled)
- ✅ `getAudioLevel()` returns valid level
- ✅ `stop()` stops audio playback

---

#### Test: SignalingClient Connection
**Steps:**
1. Create `SignalingClient` instance
2. Call `connect(wsUrl)` - verify WebSocket connection
3. Verify callbacks are registered
4. Call `sendJoin()` - verify message sent
5. Verify `onJoined()` callback fires

**Expected Result:**
- ✅ WebSocket connects successfully
- ✅ Messages are sent correctly
- ✅ Callbacks fire on server responses

**Success Criteria:**
- ✅ `connect()` resolves without errors
- ✅ WebSocket state is `OPEN`
- ✅ `sendJoin()` sends valid JSON message
- ✅ `onJoined()` callback receives `JoinedMessage`

---

#### Test: UserClient Join Meeting
**Steps:**
1. Create `UserClient` instance
2. Call `joinMeeting()` - verify complete flow
3. Verify WebSocket connection
4. Verify SDP offer creation
5. Verify RTCPeerConnection setup

**Expected Result:**
- ✅ Meeting join completes successfully
- ✅ RTCPeerConnection created
- ✅ SDP offer generated
- ✅ Connection state transitions correctly

**Success Criteria:**
- ✅ `joinMeeting()` resolves without errors
- ✅ Connection state reaches `Streaming`
- ✅ RTCPeerConnection state is `connected`
- ✅ Audio track added to peer connection

---

## 📝 Phase 3: Integration Testing

### 3.1 Signaling Integration

#### Test: Complete Signaling Flow (2 Clients)
**Steps:**
1. Start backend server
2. Start 2 frontend clients (Client A and Client B)
3. Client A joins meeting
4. Client B joins meeting
5. Verify both clients receive `joined` messages
6. Verify SDP offers/answers exchanged
7. Verify ICE candidates exchanged

**Expected Result:**
- ✅ Both clients join successfully
- ✅ SDP negotiation completes
- ✅ ICE connection established
- ✅ Both clients reach `Streaming` state

**Success Criteria:**
- ✅ Client A receives `joined` with Client B in participants
- ✅ Client B receives `joined` with Client A in participants
- ✅ Client A receives SDP answer from server
- ✅ Client B receives SDP answer from server
- ✅ ICE connection established (RTCPeerConnection state = `connected`)

**Verification Points:**
- Check server logs for: "User X joined meeting"
- Check server logs for: "Producer created for user X"
- Check server logs for: "Consumer created for user X → user Y"
- Check client logs for: "Connection state: Streaming"

---

### 3.2 Mediasoup Integration

#### Test: Producer/Consumer Creation Flow
**Steps:**
1. Start backend server
2. Client A joins and sends offer
3. Verify server creates transport for Client A
4. Verify server creates Producer for Client A
5. Client B joins and sends offer
6. Verify server creates Consumer for Client B → Client A

**Expected Result:**
- ✅ Producer created when Client A sends answer
- ✅ Consumer created when Client B joins (to receive from Client A)
- ✅ Consumer created when Client A joins (to receive from Client B)

**Success Criteria:**
- ✅ Server logs show: "Producer created for user A"
- ✅ Server logs show: "Consumer created: user A → user B"
- ✅ Server logs show: "Consumer created: user B → user A"
- ✅ `MediasoupManager.getProducer('userA')` returns Producer
- ✅ Consumers exist in `MediasoupManager.consumers` Map

**Verification Points:**
- Check `MediasoupManager.transports` has entries for both users
- Check `MediasoupManager.producers` has entry for sender
- Check `MediasoupManager.consumers` has entries for receivers

---

## 📝 Phase 4: End-to-End Testing

### 4.1 Single Sender, Single Receiver

#### Test: Audio Transmission Sender → Server → Receiver
**Goal:** Verify complete audio path from sender microphone to receiver speakers through server.

**Prerequisites:**
- Backend server running
- 2 browser windows/tabs open
- Microphone access granted for sender
- Speakers enabled for receiver

**Steps:**
1. **Setup:**
   - Start backend: `cd backend && npm run dev`
   - Open Client A (sender) in browser
   - Open Client B (receiver) in browser

2. **Client A (Sender) Joins:**
   - Client A calls `userClientA.joinMeeting()`
   - Verify Client A reaches `Streaming` state
   - Verify Client A microphone is active
   - Verify server logs show: "Producer created for user A"

3. **Client B (Receiver) Joins:**
   - Client B calls `userClientB.joinMeeting()`
   - Verify Client B reaches `Streaming` state
   - Verify server logs show: "Consumer created: user A → user B"

4. **Audio Transmission:**
   - Client A speaks into microphone
   - Verify server receives RTP packets (check mediasoup logs)
   - Verify Client B receives audio track (check `ontrack` event)
   - Verify Client B plays audio (check AudioPlayer logs)

5. **Verification:**
   - **Sender Side:**
     - ✅ `AudioCapture.getAudioLevel() > 0` (microphone active)
     - ✅ RTCPeerConnection `getStats()` shows packets sent
     - ✅ Server logs show Producer receiving RTP
   
   - **Server Side:**
     - ✅ mediasoup Producer receives RTP packets
     - ✅ mediasoup Consumer forwards RTP packets
     - ✅ Server logs show: "Consumer created" and RTP forwarding
   
   - **Receiver Side:**
     - ✅ `AudioPlayer.getAudioLevel() > 0` (audio playing)
     - ✅ RTCPeerConnection `getStats()` shows packets received
     - ✅ `ontrack` event fired with audio track

**Expected Result:**
- ✅ Audio flows from Client A microphone → Server → Client B speakers
- ✅ Audio is audible on Client B
- ✅ No audio dropouts or glitches
- ✅ Latency is acceptable (< 500ms end-to-end)

**Success Criteria:**
- ✅ Client A microphone captures audio
- ✅ Server receives RTP from Client A (mediasoup Producer active)
- ✅ Server forwards RTP to Client B (mediasoup Consumer active)
- ✅ Client B receives audio track (`ontrack` event)
- ✅ Client B plays audio (AudioPlayer active)
- ✅ Audio is audible on Client B (manual verification)

**Manual Verification:**
- Speak into Client A microphone
- Verify audio is heard on Client B speakers
- Verify audio quality is acceptable
- Verify no echo or feedback

---

### 4.2 Bidirectional Communication

#### Test: Both Clients Send and Receive
**Goal:** Verify both clients can send and receive audio simultaneously.

**Steps:**
1. Both Client A and Client B join meeting
2. Both clients start audio transmission
3. Verify both clients receive audio from each other

**Expected Result:**
- ✅ Client A sends to Client B
- ✅ Client B sends to Client A
- ✅ Both clients receive audio simultaneously

**Success Criteria:**
- ✅ Client A receives audio from Client B
- ✅ Client B receives audio from Client A
- ✅ Both audio streams are audible
- ✅ No conflicts or interference

**Verification Points:**
- Check both clients have Producers created
- Check both clients have Consumers created
- Check both clients have active audio levels (send and receive)

---

### 4.3 Multiple Receivers

#### Test: One Sender, Multiple Receivers
**Goal:** Verify server forwards audio to all receivers.

**Steps:**
1. Client A (sender) joins
2. Client B (receiver 1) joins
3. Client C (receiver 2) joins
4. Client A speaks
5. Verify both Client B and Client C receive audio

**Expected Result:**
- ✅ Server creates Consumer for Client B → Client A
- ✅ Server creates Consumer for Client C → Client A
- ✅ Both Client B and Client C receive audio

**Success Criteria:**
- ✅ Server logs show 2 Consumers created (B→A, C→A)
- ✅ Both Client B and Client C receive audio track
- ✅ Both Client B and Client C play audio

**Verification Points:**
- Check `MediasoupManager.consumers` has 2 entries
- Check both receivers have `ontrack` events
- Check both receivers have active audio levels

---

## 📝 Phase 5: Stress & Edge Case Testing

### 5.1 Multiple Users (Up to 10)

#### Test: Maximum Users (10 Concurrent)
**Goal:** Verify system handles maximum specified users (10).

**Steps:**
1. Start backend server
2. Join 10 clients simultaneously
3. Verify all clients connect successfully
4. Verify audio transmission works for all pairs

**Expected Result:**
- ✅ All 10 clients join successfully
- ✅ All clients can send and receive audio
- ✅ No performance degradation
- ✅ No connection failures

**Success Criteria:**
- ✅ All 10 clients reach `Streaming` state
- ✅ Server creates 10 Producers
- ✅ Server creates 90 Consumers (10 users × 9 receivers each)
- ✅ All audio streams work correctly

---

### 5.2 Connection Failures

#### Test: Client Disconnection
**Goal:** Verify graceful handling of client disconnection.

**Steps:**
1. Client A and Client B join
2. Audio transmission active
3. Client A disconnects (close browser tab)
4. Verify cleanup happens correctly

**Expected Result:**
- ✅ Server detects disconnection
- ✅ Server cleans up Client A's Producer
- ✅ Server cleans up Consumers for Client A
- ✅ Client B handles disconnection gracefully

**Success Criteria:**
- ✅ Server logs show: "User A disconnected"
- ✅ Server logs show: "Producer closed for user A"
- ✅ Server logs show: "Transport closed for user A"
- ✅ Client B's Consumer is closed
- ✅ Client B's RTCPeerConnection handles disconnection

---

### 5.3 Network Conditions

#### Test: Simulated Network Issues
**Goal:** Verify system handles network issues gracefully.

**Steps:**
1. Start audio transmission
2. Simulate network issues (throttle connection, packet loss)
3. Verify audio continues (with possible quality degradation)

**Expected Result:**
- ✅ System handles network issues
- ✅ Audio continues (may have quality issues)
- ✅ No crashes or errors

**Success Criteria:**
- ✅ No crashes or errors
- ✅ Audio continues (may be degraded)
- ✅ Connection recovers when network improves

---

## 🔍 Verification Methods

### 1. Server-Side Verification

#### mediasoup Stats
```typescript
// Check Producer stats
const producer = mediasoupManager.getProducer(userId);
const stats = await producer.getStats();
// Verify: packets received > 0, bytes received > 0

// Check Consumer stats
const consumer = mediasoupManager.getConsumer(consumerId);
const stats = await consumer.getStats();
// Verify: packets sent > 0, bytes sent > 0
```

#### Server Logs
- Check for: "Producer created for user X"
- Check for: "Consumer created: user X → user Y"
- Check for: "Transport connected for user X"
- Check for: "RTP packets received" (mediasoup logs)

---

### 2. Client-Side Verification

#### WebRTC Stats
```typescript
// Sender stats
const stats = await peerConnection.getStats();
const senderStats = Array.from(stats.values())
  .find(s => s.type === 'outbound-rtp' && s.mediaType === 'audio');
// Verify: packetsSent > 0, bytesSent > 0

// Receiver stats
const receiverStats = Array.from(stats.values())
  .find(s => s.type === 'inbound-rtp' && s.mediaType === 'audio');
// Verify: packetsReceived > 0, bytesReceived > 0
```

#### Audio Level Monitoring
```typescript
// Sender
const senderLevel = audioCapture.getAudioLevel();
// Verify: level > 0 when speaking

// Receiver
const receiverLevel = audioPlayer.getAudioLevel();
// Verify: level > 0 when receiving audio
```

#### Event Verification
- Check `ontrack` event fires on receiver
- Check `onconnectionstatechange` reaches `connected`
- Check `oniceconnectionstatechange` reaches `connected`

---

### 3. Manual Verification

#### Audio Quality
- Speak into sender microphone
- Verify audio is audible on receiver speakers
- Verify audio quality is acceptable (no distortion, echo)
- Verify latency is acceptable (< 500ms)

#### Latency Measurement
- Use audio latency measurement tool
- Measure: microphone capture → speaker playback
- Target: < 500ms end-to-end latency

---

## 📊 Test Results Template

### Test Execution Log

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| P1.1.1 | Backend Package Installation | ⬜ | |
| P1.1.2 | Backend TypeScript Compilation | ⬜ | |
| P1.1.3 | mediasoup Installation | ⬜ | |
| P2.1.1 | MediasoupManager Initialization | ⬜ | |
| P2.1.2 | MediasoupManager Transport Creation | ⬜ | |
| P2.1.3 | MediasoupManager Producer Creation | ⬜ | |
| P2.1.4 | MediasoupManager Consumer Creation | ⬜ | |
| P3.1.1 | Complete Signaling Flow | ⬜ | |
| P3.2.1 | Producer/Consumer Creation Flow | ⬜ | |
| P4.1.1 | Audio Transmission E2E | ⬜ | |
| P4.2.1 | Bidirectional Communication | ⬜ | |
| P4.3.1 | Multiple Receivers | ⬜ | |
| P5.1.1 | Maximum Users (10) | ⬜ | |
| P5.2.1 | Client Disconnection | ⬜ | |

**Legend:**
- ✅ Pass
- ❌ Fail
- ⚠️ Partial Pass
- ⬜ Not Tested

---

## 🚨 Known Issues & Limitations

### Current Limitations
1. **No Automated Audio Quality Testing:** Manual verification required for audio quality
2. **No Network Simulation:** Network conditions testing requires external tools
3. **No Load Testing:** Stress testing with 10 users requires manual setup

### Potential Issues to Watch For
1. **mediasoup Native Dependencies:** May require compilation on first install
2. **Browser Permissions:** Microphone/speaker access requires user permission
3. **Firewall/NAT:** May require STUN/TURN servers for production
4. **Port Conflicts:** mediasoup uses dynamic ports (40000-49999)

---

## 📋 Pre-Testing Checklist

Before starting testing, verify:

- [ ] Backend dependencies installed (`cd backend && npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Backend compiles (`cd backend && npm run build`)
- [ ] Frontend compiles (`npm run build`)
- [ ] Backend server can start (`cd backend && npm run dev`)
- [ ] Frontend dev server can start (`npm run dev`)
- [ ] Browser supports WebRTC (Chrome, Firefox, Safari)
- [ ] Microphone access available (for sender testing)
- [ ] Speakers enabled (for receiver testing)
- [ ] Network connectivity (for WebSocket and RTP)

---

## 🎯 Success Criteria Summary

### Overall Success Criteria
1. ✅ **Audio Transmission:** Audio flows sender → server → receiver
2. ✅ **Server-Mediated:** Audio routes through server (not peer-to-peer)
3. ✅ **Bidirectional:** Both clients can send and receive
4. ✅ **Multiple Receivers:** Server forwards to all receivers
5. ✅ **No Conflicts:** All dependencies work without conflicts
6. ✅ **Stability:** System handles disconnections and edge cases

### Critical Success Criteria
- ✅ Audio is audible on receiver (manual verification)
- ✅ Server receives RTP (mediasoup Producer stats)
- ✅ Server forwards RTP (mediasoup Consumer stats)
- ✅ Receiver receives RTP (WebRTC stats)
- ✅ No crashes or errors during normal operation

---

**Testing Plan Complete** ✅  
**Status:** Ready for Test Execution

