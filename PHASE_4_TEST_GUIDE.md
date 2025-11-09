# Phase 4: End-to-End Testing Guide

## Overview

Phase 4 tests verify complete audio transmission from sender microphone through the server to receiver speakers using **real browser clients**. This is the final verification that User Story 11 is working correctly.

---

## Prerequisites

1. **Backend Server Running:**
   ```bash
   cd backend
   npm run dev
   ```
   Server should be running on `ws://localhost:8080`

2. **Frontend Application:**
   - Frontend should be built and running
   - Or use browser dev tools to test UserClient directly

3. **Browser Setup:**
   - 2+ browser windows/tabs (or different browsers)
   - Microphone access granted
   - Speakers enabled

---

## Test P4.1: Single Sender → Server → Single Receiver

### Goal
Verify complete audio path from sender microphone to receiver speakers through server.

### Steps

#### 1. Start Backend Server
```bash
cd backend
npm run dev
```

Verify server logs show:
- `[SignalingServer] WebSocket server started on port 8080`
- `[MediasoupManager] Initialization complete`

#### 2. Open Client A (Sender) in Browser

**Option A: Use Frontend Application**
- Open `http://localhost:5173` (or your frontend URL)
- Join meeting with user ID: `test-user-a`
- Meeting ID: `test-meeting-phase4`

**Option B: Use Browser Console**
```javascript
// In browser console
import { UserClient } from './src/services/UserClient.js';

const clientA = new UserClient('test-user-a', 'test-meeting-phase4', 'User A');
await clientA.joinMeeting();
```

#### 3. Verify Client A State

**Check Browser Console:**
- ✅ `[UserClient] Joined meeting...`
- ✅ `[UserClient] Connection state: Streaming`
- ✅ `[AudioCapture] Microphone started`

**Check Server Logs:**
- ✅ `[SignalingServer] User test-user-a joined meeting`
- ✅ `[SignalingServer] Handling offer from user test-user-a`
- ✅ `[SignalingServer] Producer created for user test-user-a`

**Check Audio Capture:**
```javascript
// In browser console
const audioLevel = clientA.getLocalAudioLevel();
console.log('Local audio level:', audioLevel); // Should be > 0 when speaking
```

#### 4. Open Client B (Receiver) in Browser

**Option A: Use Frontend Application**
- Open `http://localhost:5173` in new tab/window
- Join same meeting with user ID: `test-user-b`
- Meeting ID: `test-meeting-phase4`

**Option B: Use Browser Console**
```javascript
// In new browser tab/window console
const clientB = new UserClient('test-user-b', 'test-meeting-phase4', 'User B');
await clientB.joinMeeting();
```

#### 5. Verify Client B State

**Check Browser Console:**
- ✅ `[UserClient] Joined meeting...`
- ✅ `[UserClient] Connection state: Streaming`
- ✅ `[AudioPlayer] Audio track received` (if ontrack fires)

**Check Server Logs:**
- ✅ `[SignalingServer] User test-user-b joined meeting`
- ✅ `[SignalingServer] Consumer created for existing user test-user-b to receive from test-user-a`

#### 6. Test Audio Transmission

**On Client A (Sender):**
- Speak into microphone
- Verify audio level indicator shows activity

**On Client B (Receiver):**
- Verify audio is heard through speakers
- Verify audio level indicator shows activity (if implemented)

**Check Server Logs:**
- ✅ mediasoup Producer receiving RTP (check mediasoup worker logs)
- ✅ mediasoup Consumer forwarding RTP (check mediasoup worker logs)

#### 7. Verify WebRTC Stats

**Client A (Sender) - Browser Console:**
```javascript
// Get peer connection stats
const stats = await clientA.getPeerConnectionStats();
// Convert Map to Array and find audio sender stats
const statsArray = Array.from(stats.values());
const senderStats = statsArray.find(s => 
  s.type === 'outbound-rtp' && 
  (s.mediaType === 'audio' || s.kind === 'audio')
);
if (senderStats) {
  console.log('Packets sent:', senderStats.packetsSent);
  console.log('Bytes sent:', senderStats.bytesSent);
  // Should be > 0 when speaking
} else {
  console.log('No sender stats found yet');
}
```

**Client B (Receiver) - Browser Console:**
```javascript
// Get peer connection stats
const stats = await clientB.getPeerConnectionStats();
// Convert Map to Array and find audio receiver stats
const statsArray = Array.from(stats.values());
const receiverStats = statsArray.find(s => 
  s.type === 'inbound-rtp' && 
  (s.mediaType === 'audio' || s.kind === 'audio')
);
if (receiverStats) {
  console.log('Packets received:', receiverStats.packetsReceived);
  console.log('Bytes received:', receiverStats.bytesReceived);
  // Should be > 0 when receiving audio
} else {
  console.log('No receiver stats found yet');
}
```

### Success Criteria

- ✅ Client A microphone captures audio
- ✅ Server receives RTP from Client A (Producer active)
- ✅ Server forwards RTP to Client B (Consumer active)
- ✅ Client B receives audio track
- ✅ Client B plays audio
- ✅ Audio is audible on Client B (manual verification)
- ✅ No audio dropouts or glitches
- ✅ Latency is acceptable (< 500ms end-to-end)

### Expected Server Logs

```
[SignalingServer] User test-user-a joined meeting test-meeting-phase4
[SignalingServer] Handling offer from user test-user-a
[SignalingServer] Extracted RTP parameters for user test-user-a
[SignalingServer] Producer created for user test-user-a
[SignalingServer] User test-user-b joined meeting test-meeting-phase4
[SignalingServer] Consumer created for existing user test-user-b to receive from test-user-a
```

---

## Test P4.2: Bidirectional Communication

### Goal
Verify both clients can send and receive audio simultaneously.

### Steps

1. Both Client A and Client B join meeting (as in P4.1)
2. Both clients start speaking
3. Verify both clients receive audio from each other

### Verification

**Client A:**
- ✅ Sends audio to Client B
- ✅ Receives audio from Client B
- ✅ Audio level indicators show both send and receive activity

**Client B:**
- ✅ Sends audio to Client A
- ✅ Receives audio from Client A
- ✅ Audio level indicators show both send and receive activity

**Server Logs:**
- ✅ Producer created for Client A
- ✅ Producer created for Client B
- ✅ Consumer created: Client A → Client B
- ✅ Consumer created: Client B → Client A

### Success Criteria

- ✅ Both clients have Producers created
- ✅ Both clients have Consumers created
- ✅ Both clients receive audio simultaneously
- ✅ No conflicts or interference
- ✅ Both audio streams are audible

---

## Test P4.3: Multiple Receivers

### Goal
Verify server forwards audio to all receivers.

### Steps

1. Client A (sender) joins meeting
2. Client B (receiver 1) joins meeting
3. Client C (receiver 2) joins meeting
4. Client A speaks
5. Verify both Client B and Client C receive audio

### Verification

**Server Logs:**
- ✅ Producer created for Client A
- ✅ Consumer created: Client B → Client A
- ✅ Consumer created: Client C → Client A

**Client B:**
- ✅ Receives audio track
- ✅ Plays audio
- ✅ Audio is audible

**Client C:**
- ✅ Receives audio track
- ✅ Plays audio
- ✅ Audio is audible

### Success Criteria

- ✅ Server creates 2 Consumers (B→A, C→A)
- ✅ Both Client B and Client C receive audio track
- ✅ Both Client B and Client C play audio
- ✅ Both receivers hear Client A's audio

---

## Verification Methods

### 1. Browser Console Verification

**Check Connection State:**
```javascript
clientA.getConnectionState(); // Should be 'Streaming'
```

**Check Audio Levels:**
```javascript
clientA.getLocalAudioLevel(); // Should be > 0 when speaking
clientA.getRemoteAudioLevel(); // Should be > 0 when receiving
```

**Check WebRTC Stats:**
```javascript
const stats = await clientA.getPeerConnectionStats();
// Check for outbound-rtp (sending) and inbound-rtp (receiving)
```

### 2. Server Log Verification

**Check for:**
- `[SignalingServer] Producer created for user X`
- `[SignalingServer] Consumer created for existing user Y to receive from X`
- `[MediasoupManager] Producer created (ID: ...)`
- `[MediasoupManager] Consumer created (ID: ...)`

**Check mediasoup Worker Logs:**
- RTP packets received (Producer)
- RTP packets sent (Consumer)

### 3. Manual Verification

- **Audio Quality:** Audio should be clear and understandable
- **Latency:** Audio should be near real-time (< 500ms delay)
- **No Echo:** No echo or feedback loops
- **No Dropouts:** Audio should be continuous without gaps

---

## Troubleshooting

### Issue: Client doesn't join meeting

**Check:**
- Backend server is running
- WebSocket URL is correct (`ws://localhost:8080`)
- Browser console for errors
- Server logs for authentication errors

### Issue: No audio transmission

**Check:**
- Microphone permissions granted
- AudioCapture started successfully
- Producer created on server (check logs)
- Consumer created on server (check logs)
- WebRTC connection state is 'connected'

### Issue: Audio not received

**Check:**
- Consumer created on server (check logs)
- RTCPeerConnection state is 'connected'
- AudioPlayer started successfully
- Speakers enabled and volume up
- Browser console for errors

### Issue: High latency

**Check:**
- Network conditions
- Server performance
- Browser performance
- mediasoup worker logs for issues

---

## Test Results Template

### P4.1: Single Sender → Server → Single Receiver

- [ ] Client A joined successfully
- [ ] Client A Producer created on server
- [ ] Client B joined successfully
- [ ] Client B Consumer created on server
- [ ] Audio transmitted from Client A
- [ ] Audio received on Client B
- [ ] Audio is audible on Client B
- [ ] Latency acceptable (< 500ms)
- [ ] No dropouts or glitches

**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:**

---

### P4.2: Bidirectional Communication

- [ ] Both clients joined successfully
- [ ] Both Producers created on server
- [ ] Both Consumers created on server
- [ ] Client A receives audio from Client B
- [ ] Client B receives audio from Client A
- [ ] Both audio streams audible
- [ ] No conflicts or interference

**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:**

---

### P4.3: Multiple Receivers

- [ ] All 3 clients joined successfully
- [ ] Producer created for sender
- [ ] 2 Consumers created (one per receiver)
- [ ] Both receivers receive audio
- [ ] Both receivers play audio
- [ ] Both receivers hear sender's audio

**Status:** ⬜ PASS / ⬜ FAIL  
**Notes:**

---

## Next Steps

After Phase 4 is complete:
- ✅ Phase 5: Stress testing (10 concurrent users)
- ✅ Final verification and documentation

---

**Last Updated:** November 8, 2025

