# Audio Service

Simple implementation of real microphone mute/unmute functionality using Web Audio API.

## Features

✅ **Real Microphone Access** - Uses `getUserMedia()` to access actual microphone  
✅ **Mute/Unmute Control** - Actually enables/disables audio tracks  
✅ **Audio Level Monitoring** - Real-time audio level detection (0-100%)  
✅ **Mute Verification** - Checks if hardware state matches software state  
✅ **Device Enumeration** - Lists available audio input devices  

## Usage

```typescript
import { audioService } from './services/audioService';

// Initialize microphone access
const success = await audioService.initialize();

// Mute microphone
audioService.mute();

// Unmute microphone
audioService.unmute();

// Toggle mute state
audioService.toggleMute();

// Get current audio level (0-100)
const level = audioService.getAudioLevel();

// Check if muted
const isMuted = audioService.getMuteState();

// Monitor audio levels in real-time
audioService.startAudioLevelMonitoring((level) => {
  console.log(`Current audio level: ${level}%`);
}, 100); // Check every 100ms

// Stop monitoring
audioService.stopAudioLevelMonitoring();

// Verify mute state
const isVerified = audioService.verifyMuteState();

// Cleanup
audioService.cleanup();
```

## How It Works

### 1. **Initialization**
- Requests microphone permission from the browser
- Creates `AudioContext` for audio analysis
- Sets up `AnalyserNode` to monitor audio levels

### 2. **Mute/Unmute**
- Controls the `enabled` property of `MediaStreamTrack`
- When muted: `track.enabled = false` (no audio data sent)
- When unmuted: `track.enabled = true` (audio data flows)

### 3. **Audio Level Detection**
- Uses `AnalyserNode.getByteFrequencyData()` to get frequency data
- Calculates average amplitude across all frequencies
- Normalizes to 0-100 scale for easy display

### 4. **Mute Verification**
- When muted, checks if audio level is below threshold (< 5%)
- If audio detected while muted, verification fails
- Helps detect hardware/software mismatch

## Browser Permissions

The app requires microphone permission. Users will see a browser prompt:
- **Chrome/Edge**: "Allow [site] to access your microphone?"
- **Firefox**: "Share your microphone with [site]?"
- **Safari**: "[site] wants to use your microphone"

## Technical Details

- **API Used**: Web Audio API + MediaStream API
- **Audio Features**: Echo cancellation, noise suppression, auto gain control
- **FFT Size**: 256 (balances accuracy and performance)
- **Monitoring Frequency**: 100ms intervals (10x per second)
- **Silence Threshold**: 5% of max volume

## Limitations

- Frontend-only (no backend server)
- No audio recording/streaming
- No peer-to-peer communication (WebRTC would be needed)
- Single microphone input only
- Requires HTTPS in production (browser security requirement)

