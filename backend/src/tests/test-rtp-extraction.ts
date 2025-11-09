/**
 * Test script for RTP Parameter Extraction
 * Phase 2.1.5: Verify RTP parameter extraction from SDP works correctly
 * 
 * This test verifies:
 * 1. RTP parameters are correctly extracted from SDP
 * 2. Extraction handles various SDP formats
 * 3. Extraction fails gracefully with invalid SDP
 */

// We need to test the private method, so we'll create a test version
// or test through SignalingServer's public interface

import { SignalingServer } from '../SignalingServer';
import { MeetingRegistry } from '../MeetingRegistry';
import { MediasoupManager } from '../MediasoupManager';
import WebSocket from 'ws';

async function testRtpExtraction() {
  console.log('[Test] Starting RTP Parameter Extraction test...');
  
  try {
    // Initialize components
    const meetingRegistry = new MeetingRegistry();
    const mediasoupManager = new MediasoupManager();
    await mediasoupManager.initialize();
    
    // Create a SignalingServer instance (we'll use it to test extraction)
    // Use type casting to access private methods for testing
    const signalingServer = new SignalingServer(8081, meetingRegistry, mediasoupManager) as any;
    
    // Test 1: Valid SDP with Opus codec
    console.log('\n[Test] Test 1: Valid SDP with Opus codec...');
    const validSdp = `v=0
o=- 1234567890 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=sendrecv
a=ssrc:123456 cname:test
a=simulcast:send rid:high send;rid:mid send;rid:low send
`;
    
    const rtpParams = signalingServer.extractRtpParametersFromSdp(validSdp);
    
    if (!rtpParams) {
      throw new Error('Failed to extract RTP parameters from valid SDP');
    }
    
    if (!rtpParams.codecs || rtpParams.codecs.length === 0) {
      throw new Error('No codecs extracted from SDP');
    }
    
    const opusCodec = rtpParams.codecs.find((c: any) => c.mimeType === 'audio/opus');
    if (!opusCodec) {
      throw new Error('Opus codec not found in extracted parameters');
    }
    
    if (opusCodec.clockRate !== 48000) {
      throw new Error(`Expected clockRate 48000, got ${opusCodec.clockRate}`);
    }
    
    if (opusCodec.channels !== 2) {
      throw new Error(`Expected channels 2, got ${opusCodec.channels}`);
    }
    
    if (!opusCodec.parameters.useinbandfec) {
      throw new Error('useinbandfec parameter not extracted');
    }
    
    console.log('[Test] ✅ Valid SDP extraction passed');
    console.log(`  - Codecs: ${rtpParams.codecs.length}`);
    console.log(`  - Encodings: ${rtpParams.encodings.length}`);
    console.log(`  - Opus codec: ${opusCodec.mimeType}/${opusCodec.clockRate}/${opusCodec.channels}`);
    
    // Test 2: SDP without audio section
    console.log('\n[Test] Test 2: SDP without audio section...');
    const noAudioSdp = `v=0
o=- 1234567890 2 IN IP4 127.0.0.1
s=-
t=0 0
`;
    
    const rtpParamsNoAudio = signalingServer.extractRtpParametersFromSdp(noAudioSdp);
    if (rtpParamsNoAudio !== null) {
      throw new Error('Expected null for SDP without audio section');
    }
    console.log('[Test] ✅ Correctly returned null for SDP without audio');
    
    // Test 3: SDP with non-Opus codec
    console.log('\n[Test] Test 3: SDP with non-Opus codec...');
    const nonOpusSdp = `v=0
o=- 1234567890 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 0
c=IN IP4 0.0.0.0
a=rtpmap:0 PCMU/8000
`;
    
    const rtpParamsNonOpus = signalingServer.extractRtpParametersFromSdp(nonOpusSdp);
    if (rtpParamsNonOpus !== null) {
      throw new Error('Expected null for SDP without Opus codec');
    }
    console.log('[Test] ✅ Correctly returned null for SDP without Opus');
    
    // Test 4: SDP with simulcast
    console.log('\n[Test] Test 4: SDP with simulcast...');
    const simulcastSdp = `v=0
o=- 1234567890 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=ssrc:123456 cname:test
a=simulcast:send rid:high send;rid:mid send;rid:low send
`;
    
    const rtpParamsSimulcast = signalingServer.extractRtpParametersFromSdp(simulcastSdp);
    if (!rtpParamsSimulcast) {
      throw new Error('Failed to extract RTP parameters from simulcast SDP');
    }
    
    if (rtpParamsSimulcast.encodings.length < 3) {
      throw new Error(`Expected 3 simulcast encodings, got ${rtpParamsSimulcast.encodings.length}`);
    }
    
    console.log('[Test] ✅ Simulcast SDP extraction passed');
    console.log(`  - Simulcast encodings: ${rtpParamsSimulcast.encodings.length}`);
    
    // Cleanup
    await mediasoupManager.shutdown();
    signalingServer.close();
    
    console.log('\n[Test] ✅ ALL RTP EXTRACTION TESTS PASSED');
    process.exit(0);
    
  } catch (error) {
    console.error('[Test] ❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testRtpExtraction();

