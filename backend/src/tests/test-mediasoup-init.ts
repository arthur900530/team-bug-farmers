/**
 * Test script for MediasoupManager initialization
 * Phase 2.1.1: Verify MediasoupManager can initialize Worker and Router
 */

import { MediasoupManager } from '../MediasoupManager';

async function testMediasoupInit() {
  console.log('[Test] Starting MediasoupManager initialization test...');
  
  try {
    const mediasoupManager = new MediasoupManager();
    
    // Test initialization
    console.log('[Test] Calling mediasoupManager.initialize()...');
    await mediasoupManager.initialize();
    console.log('[Test] ✅ MediasoupManager initialized successfully');
    
    // Verify Router RTP capabilities
    console.log('[Test] Getting Router RTP capabilities...');
    const capabilities = mediasoupManager.getRouterRtpCapabilities();
    
    if (!capabilities) {
      throw new Error('Router RTP capabilities are null');
    }
    
    console.log('[Test] ✅ Router RTP capabilities retrieved');
    console.log('[Test] Capabilities:', JSON.stringify(capabilities, null, 2));
    
    // Verify Opus codec is present
    const codecs = capabilities.codecs || [];
    const opusCodec = codecs.find((c: any) => c.mimeType === 'audio/opus');
    
    if (!opusCodec) {
      throw new Error('Opus codec not found in Router RTP capabilities');
    }
    
    console.log('[Test] ✅ Opus codec found in capabilities');
    console.log('[Test] Opus codec:', JSON.stringify(opusCodec, null, 2));
    
    // Verify Opus codec parameters
    if (opusCodec.preferredPayloadType !== 111) {
      throw new Error(`Expected Opus payload type 111, got ${opusCodec.preferredPayloadType}`);
    }
    
    if (opusCodec.clockRate !== 48000) {
      throw new Error(`Expected Opus clock rate 48000, got ${opusCodec.clockRate}`);
    }
    
    if (opusCodec.channels !== 2) {
      throw new Error(`Expected Opus channels 2, got ${opusCodec.channels}`);
    }
    
    console.log('[Test] ✅ Opus codec parameters verified:');
    console.log(`  - Payload Type: ${opusCodec.preferredPayloadType} (expected: 111)`);
    console.log(`  - Clock Rate: ${opusCodec.clockRate} (expected: 48000)`);
    console.log(`  - Channels: ${opusCodec.channels} (expected: 2)`);
    
    // Cleanup
    console.log('[Test] Shutting down MediasoupManager...');
    await mediasoupManager.shutdown();
    console.log('[Test] ✅ MediasoupManager shut down successfully');
    
    console.log('\n[Test] ✅ ALL TESTS PASSED');
    process.exit(0);
    
  } catch (error) {
    console.error('[Test] ❌ TEST FAILED:', error);
    process.exit(1);
  }
}

// Run test
testMediasoupInit();

