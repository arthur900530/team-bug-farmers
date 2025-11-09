# Phase 4 Local Testing Verification Guide

## Problem: Testing on Same Laptop

When testing locally on the **same laptop** with the **same speakers and microphone**, you cannot rely on hearing audio to verify it's working because:
- Your microphone will pick up the audio from your speakers (feedback loop)
- You can't distinguish between "audio is working" vs "audio is just playing back your own voice"

## Solution: Objective Verification Methods

Use these **objective metrics** to verify audio transmission without relying on subjective hearing:

---

## Method 1: WebRTC Stats (RTP Packet Counts)

### Setup: Access UserClient in Browser Console

**Window 1 (Client A - Sender):**
```javascript
// Get the UserClient instance from the React app
// You may need to expose it globally or access it through the component
// For now, we'll need to add a helper to expose it

// Check if UserClient is accessible
// If not, we'll need to add a global reference
```

**Window 2 (Client B - Receiver):**
```javascript
// Same as Window 1
```

### Verification Script: RTP Packet Monitoring

**Client A (Sender) - Browser Console:**
```javascript
// Monitor RTP packet transmission
async function monitorSenderStats() {
  // Access UserClient (you may need to expose this globally)
  // For now, assuming it's accessible as window.userClientA
  
  const stats = await window.userClientA.getPeerConnectionStats();
  const statsArray = Array.from(stats.values());
  
  // Find outbound RTP stats (audio being sent)
  const senderStats = statsArray.find(s => 
    s.type === 'outbound-rtp' && 
    (s.mediaType === 'audio' || s.kind === 'audio')
  );
  
  if (senderStats) {
    console.log('📤 SENDER STATS:');
    console.log(`   Packets sent: ${senderStats.packetsSent}`);
    console.log(`   Bytes sent: ${senderStats.bytesSent}`);
    console.log(`   Packets per second: ${senderStats.packetsSent / ((Date.now() - startTime) / 1000)}`);
    
    // If packetsSent > 0 and increasing, audio is being transmitted
    if (senderStats.packetsSent > 0) {
      console.log('✅ Audio packets are being sent!');
    } else {
      console.log('❌ No packets sent yet');
    }
  } else {
    console.log('❌ No sender stats found');
  }
}

// Run every 2 seconds
const startTime = Date.now();
setInterval(monitorSenderStats, 2000);
```

**Client B (Receiver) - Browser Console:**
```javascript
// Monitor RTP packet reception
async function monitorReceiverStats() {
  const stats = await window.userClientB.getPeerConnectionStats();
  const statsArray = Array.from(stats.values());
  
  // Find inbound RTP stats (audio being received)
  const receiverStats = statsArray.find(s => 
    s.type === 'inbound-rtp' && 
    (s.mediaType === 'audio' || s.kind === 'audio')
  );
  
  if (receiverStats) {
    console.log('📥 RECEIVER STATS:');
    console.log(`   Packets received: ${receiverStats.packetsReceived}`);
    console.log(`   Bytes received: ${receiverStats.bytesReceived}`);
    console.log(`   Packets lost: ${receiverStats.packetsLost || 0}`);
    console.log(`   Jitter: ${receiverStats.jitter || 0} ms`);
    
    // If packetsReceived > 0 and increasing, audio is being received
    if (receiverStats.packetsReceived > 0) {
      console.log('✅ Audio packets are being received!');
      
      // Check if packets are increasing (active transmission)
      if (receiverStats.packetsReceived > lastPacketCount) {
        console.log('✅ Packets are actively being received!');
      }
    } else {
      console.log('❌ No packets received yet');
    }
    
    lastPacketCount = receiverStats.packetsReceived;
  } else {
    console.log('❌ No receiver stats found');
  }
}

let lastPacketCount = 0;
const startTime = Date.now();
setInterval(monitorReceiverStats, 2000);
```

### Success Criteria:
- ✅ **Client A**: `packetsSent > 0` and **increasing** when speaking
- ✅ **Client B**: `packetsReceived > 0` and **increasing** when Client A speaks
- ✅ **Packet rate**: ~50 packets/second (Opus 20ms frames = 50 fps)

---

## Method 2: Server Logs (Producer/Consumer Activity)

### Check Backend Terminal Logs

**Look for these log messages:**

```
[SignalingServer] User test-user-a joined meeting test-meeting-phase4
[SignalingServer] Handling offer from user test-user-a
[SignalingServer] Extracted RTP parameters for user test-user-a
[MediasoupManager] Producer created for user test-user-a
[SignalingServer] User test-user-b joined meeting test-meeting-phase4
[MediasoupManager] Consumer created for user test-user-b to receive from test-user-a
```

### Verify Producer/Consumer are Active

**Add logging to check Producer/Consumer stats (if available):**

The server should show:
- ✅ Producer created and active
- ✅ Consumer created and active
- ✅ RTP packets flowing through mediasoup

---

## Method 3: Audio Level Indicators

### Check Audio Levels in Browser Console

**Client A (Sender):**
```javascript
// Check microphone audio level
function checkLocalAudioLevel() {
  const level = window.userClientA.getLocalAudioLevel();
  console.log(`🎤 Microphone level: ${(level * 100).toFixed(1)}%`);
  
  if (level > 0.01) {
    console.log('✅ Microphone is capturing audio');
  } else {
    console.log('⚠️  Microphone level is low (speak louder or check mic)');
  }
}

setInterval(checkLocalAudioLevel, 1000);
```

**Client B (Receiver):**
```javascript
// Check remote audio level (if available)
function checkRemoteAudioLevel() {
  const level = window.userClientB.getRemoteAudioLevel();
  console.log(`🔊 Remote audio level: ${(level * 100).toFixed(1)}%`);
  
  if (level > 0.01) {
    console.log('✅ Receiving audio from remote');
  } else {
    console.log('⚠️  No remote audio detected');
  }
}

setInterval(checkRemoteAudioLevel, 1000);
```

---

## Method 4: Network Tab (Chrome DevTools)

### Verify WebRTC Connections

1. Open Chrome DevTools → **Network** tab
2. Filter by **WebRTC**
3. Look for:
   - ✅ **DTLS** connections (encrypted media)
   - ✅ **RTP** streams (audio data)
   - ✅ Active data transfer

### Check WebRTC Internals (Chrome)

1. Navigate to: `chrome://webrtc-internals/`
2. Look for:
   - ✅ Active peer connections
   - ✅ RTP streams (send/receive)
   - ✅ Packet counts increasing
   - ✅ Codec: **opus** (48000 Hz)

---

## Method 5: Automated Verification Script

### Create a Browser Console Script

**Add this to both browser windows:**

```javascript
// Comprehensive verification script
async function verifyAudioTransmission() {
  console.log('🔍 Verifying Audio Transmission...');
  console.log('');
  
  try {
    // 1. Check connection state
    const state = window.userClientA.getConnectionState();
    console.log(`1. Connection State: ${state}`);
    if (state === 'Streaming') {
      console.log('   ✅ Connected and streaming');
    } else {
      console.log(`   ⚠️  State: ${state} (should be 'Streaming')`);
    }
    
    // 2. Check local audio level
    const localLevel = window.userClientA.getLocalAudioLevel();
    console.log(`2. Local Audio Level: ${(localLevel * 100).toFixed(1)}%`);
    if (localLevel > 0.01) {
      console.log('   ✅ Microphone is active');
    } else {
      console.log('   ⚠️  Speak into microphone');
    
    // 3. Check RTP stats
    const stats = await window.userClientA.getPeerConnectionStats();
    const statsArray = Array.from(stats.values());
    const senderStats = statsArray.find(s => 
      s.type === 'outbound-rtp' && (s.mediaType === 'audio' || s.kind === 'audio')
    );
    
    if (senderStats) {
      console.log(`3. RTP Packets Sent: ${senderStats.packetsSent}`);
      console.log(`   Bytes Sent: ${senderStats.bytesSent}`);
      if (senderStats.packetsSent > 0) {
        console.log('   ✅ RTP packets are being transmitted');
      } else {
        console.log('   ❌ No RTP packets sent');
      }
    } else {
      console.log('3. ❌ No sender stats found');
    }
    
    console.log('');
    console.log('📊 Summary:');
    if (state === 'Streaming' && localLevel > 0.01 && senderStats && senderStats.packetsSent > 0) {
      console.log('✅✅✅ AUDIO TRANSMISSION VERIFIED ✅✅✅');
    } else {
      console.log('⚠️  Some checks failed - see details above');
    }
    
  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

// Run verification
verifyAudioTransmission();

// Set up periodic monitoring
setInterval(async () => {
  const stats = await window.userClientA.getPeerConnectionStats();
  const statsArray = Array.from(stats.values());
  const senderStats = statsArray.find(s => 
    s.type === 'outbound-rtp' && (s.mediaType === 'audio' || s.kind === 'audio')
  );
  if (senderStats) {
    console.log(`📤 Packets: ${senderStats.packetsSent} | Bytes: ${senderStats.bytesSent}`);
  }
}, 3000);
```

---

## Quick Verification Checklist

### Before Testing:
- [ ] Backend server running (`npm run dev` in `backend/`)
- [ ] Frontend server running (`npm run dev` in root)
- [ ] Two browser windows open (`http://localhost:5173`)
- [ ] Microphone access granted in both windows
- [ ] Both clients joined same meeting

### During Testing:
- [ ] **Client A**: Speak into microphone
- [ ] **Client A Console**: Check `packetsSent > 0` and increasing
- [ ] **Client B Console**: Check `packetsReceived > 0` and increasing
- [ ] **Server Logs**: Verify Producer/Consumer created
- [ ] **Audio Levels**: Check microphone level > 0

### Success Indicators:
- ✅ **Client A** sends packets when speaking
- ✅ **Client B** receives packets when Client A speaks
- ✅ **Packet rate**: ~50 packets/second (20ms Opus frames)
- ✅ **Server logs** show Producer/Consumer active
- ✅ **No packet loss** (or minimal < 1%)

---

## Troubleshooting

### If `packetsSent = 0`:
- Check microphone permissions
- Verify microphone is not muted
- Check `getLocalAudioLevel()` > 0
- Verify audio track is added to RTCPeerConnection

### If `packetsReceived = 0`:
- Check Client B connection state is 'Streaming'
- Verify Consumer was created on server
- Check server logs for errors
- Verify WebRTC connection established

### If packets not increasing:
- Check if you're actually speaking (audio level > 0)
- Verify network connection
- Check for WebRTC errors in console
- Verify DTLS handshake completed

---

## Next: Can P4.1-4.3 Be Simulated?

See `PHASE_4_SIMULATION_POSSIBILITY.md` for details on what can be automated vs. what requires manual testing.

