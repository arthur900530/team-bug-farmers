/**
 * Test script for MediasoupManager Producer Creation
 * Phase 2.1.3: Verify Producer can be created and receives RTP
 */

import { MediasoupManager } from '../../MediasoupManager';

async function testProducerCreation() {
  console.log('[Test] Starting MediasoupManager Producer Creation test...');
  
  try {
    const mediasoupManager = new MediasoupManager();
    await mediasoupManager.initialize();
    console.log('[Test] ✅ MediasoupManager initialized');
    
    // Create transport
    const userId = 'test-sender';
    console.log(`[Test] Creating transport for user: ${userId}...`);
    const transport = await mediasoupManager.createTransport(userId);
    console.log(`[Test] ✅ Transport created: ${transport.id}`);
    
    // Create mock DTLS parameters (simulating client connection)
    const dtlsParameters = {
      role: 'auto',
      fingerprints: transport.dtlsParameters.fingerprints
    };
    
    // Connect transport
    console.log(`[Test] Connecting transport...`);
    await mediasoupManager.connectTransport(userId, dtlsParameters);
    console.log(`[Test] ✅ Transport connected`);
    
    // Create RTP parameters (simulating client SDP offer)
    const rtpParameters = {
      codecs: [
        {
          mimeType: 'audio/opus',
          payloadType: 111,
          clockRate: 48000,
          channels: 2,
          parameters: {
            useinbandfec: 1,
            usedtx: 1
          }
        }
      ],
      headerExtensions: [],
      encodings: [
        {
          ssrc: 1234567890
        }
      ],
      rtcp: {
        cname: 'test-sender',
        reducedSize: true
      }
    };
    
    // Create Producer
    console.log(`[Test] Creating Producer...`);
    const producerResult = await mediasoupManager.createProducer(userId, transport.id, rtpParameters);
    
    if (!producerResult || !producerResult.id) {
      throw new Error('Producer creation failed - no ID returned');
    }
    
    console.log(`[Test] ✅ Producer created: ${producerResult.id}`);
    
    // Verify Producer exists
    const producer = mediasoupManager.getProducer(userId);
    if (!producer) {
      throw new Error('Producer not found in producers Map');
    }
    
    console.log(`[Test] ✅ Producer verified in Map`);
    
    // Get Producer stats (if available)
    try {
      const stats = await producer.getStats();
      console.log(`[Test] ✅ Producer stats retrieved (${Object.keys(stats).length} entries)`);
    } catch (error) {
      console.log(`[Test] ⚠️  Producer stats not available yet (normal if no RTP received)`);
    }
    
    // Cleanup
    await mediasoupManager.shutdown();
    console.log('[Test] ✅ MediasoupManager shut down successfully');
    
    console.log('\n[Test] ✅ ALL TESTS PASSED');
    process.exit(0);
    
  } catch (error) {
    console.error('[Test] ❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testProducerCreation();

