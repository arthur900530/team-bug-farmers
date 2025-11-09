/**
 * Test script for MediasoupManager Consumer Creation
 * Phase 2.1.4: Verify Consumer can be created to forward RTP
 */

import { MediasoupManager } from '../../MediasoupManager';

async function testConsumerCreation() {
  console.log('[Test] Starting MediasoupManager Consumer Creation test...');
  
  try {
    const mediasoupManager = new MediasoupManager();
    await mediasoupManager.initialize();
    console.log('[Test] ✅ MediasoupManager initialized');
    
    // Create sender transport and Producer
    const senderId = 'test-sender';
    console.log(`[Test] Creating sender transport: ${senderId}...`);
    const senderTransport = await mediasoupManager.createTransport(senderId);
    console.log(`[Test] ✅ Sender transport created: ${senderTransport.id}`);
    
    // Connect sender transport
    const senderDtlsParams = {
      role: 'auto',
      fingerprints: senderTransport.dtlsParameters.fingerprints
    };
    await mediasoupManager.connectTransport(senderId, senderDtlsParams);
    console.log(`[Test] ✅ Sender transport connected`);
    
    // Create Producer for sender
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
      encodings: [{ ssrc: 1234567890 }],
      rtcp: { cname: 'test-sender', reducedSize: true }
    };
    
    const producerResult = await mediasoupManager.createProducer(senderId, senderTransport.id, rtpParameters);
    console.log(`[Test] ✅ Producer created: ${producerResult.id}`);
    
    // Create receiver transport
    const receiverId = 'test-receiver';
    console.log(`[Test] Creating receiver transport: ${receiverId}...`);
    const receiverTransport = await mediasoupManager.createTransport(receiverId);
    console.log(`[Test] ✅ Receiver transport created: ${receiverTransport.id}`);
    
    // Connect receiver transport
    const receiverDtlsParams = {
      role: 'auto',
      fingerprints: receiverTransport.dtlsParameters.fingerprints
    };
    await mediasoupManager.connectTransport(receiverId, receiverDtlsParams);
    console.log(`[Test] ✅ Receiver transport connected`);
    
    // Create RTP capabilities for receiver (what receiver can receive)
    const rtpCapabilities = {
      codecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          preferredPayloadType: 111,
          clockRate: 48000,
          channels: 2,
          rtcpFeedback: [],
          parameters: {
            useinbandfec: 1
          }
        }
      ],
      headerExtensions: [],
      fecMechanisms: []
    };
    
    // Create Consumer
    console.log(`[Test] Creating Consumer: ${senderId} → ${receiverId}...`);
    const consumerResult = await mediasoupManager.createConsumer(receiverId, senderId, rtpCapabilities);
    
    if (!consumerResult) {
      throw new Error('Consumer creation failed - null returned');
    }
    
    if (!consumerResult.id) {
      throw new Error('Consumer creation failed - no ID returned');
    }
    
    console.log(`[Test] ✅ Consumer created: ${consumerResult.id}`);
    console.log(`[Test] Consumer Producer ID: ${consumerResult.producerId}`);
    console.log(`[Test] Consumer kind: ${consumerResult.kind}`);
    
    // Verify Consumer has RTP parameters
    if (!consumerResult.rtpParameters) {
      throw new Error('Consumer RTP parameters are missing');
    }
    
    if (!consumerResult.rtpParameters.codecs || consumerResult.rtpParameters.codecs.length === 0) {
      throw new Error('Consumer RTP parameters have no codecs');
    }
    
    console.log(`[Test] ✅ Consumer RTP parameters verified`);
    console.log(`[Test] Consumer codecs: ${consumerResult.rtpParameters.codecs.length}`);
    
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

testConsumerCreation();

