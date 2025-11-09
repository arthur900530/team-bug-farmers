/**
 * Test script for MediasoupManager Transport Creation
 * Phase 2.1.2: Verify transport creation with ICE/DTLS parameters
 */

import { MediasoupManager } from '../MediasoupManager';

async function testTransportCreation() {
  console.log('[Test] Starting MediasoupManager Transport Creation test...');
  
  try {
    const mediasoupManager = new MediasoupManager();
    await mediasoupManager.initialize();
    console.log('[Test] ✅ MediasoupManager initialized');
    
    // Test transport creation
    const userId = 'test-user-1';
    console.log(`[Test] Creating transport for user: ${userId}...`);
    const transport = await mediasoupManager.createTransport(userId);
    
    // Verify transport parameters
    if (!transport.id) {
      throw new Error('Transport ID is missing');
    }
    
    if (!transport.iceParameters) {
      throw new Error('ICE parameters are missing');
    }
    
    if (!transport.iceParameters.usernameFragment) {
      throw new Error('ICE usernameFragment is missing');
    }
    
    if (!transport.iceParameters.password) {
      throw new Error('ICE password is missing');
    }
    
    if (!transport.iceCandidates || transport.iceCandidates.length === 0) {
      throw new Error('ICE candidates array is empty');
    }
    
    if (!transport.dtlsParameters) {
      throw new Error('DTLS parameters are missing');
    }
    
    if (!transport.dtlsParameters.fingerprints || transport.dtlsParameters.fingerprints.length === 0) {
      throw new Error('DTLS fingerprints array is empty');
    }
    
    console.log('[Test] ✅ Transport created successfully');
    console.log(`[Test] Transport ID: ${transport.id}`);
    console.log(`[Test] ICE usernameFragment: ${transport.iceParameters.usernameFragment}`);
    console.log(`[Test] ICE candidates: ${transport.iceCandidates.length}`);
    console.log(`[Test] DTLS fingerprints: ${transport.dtlsParameters.fingerprints.length}`);
    
    // Verify first ICE candidate
    const firstCandidate = transport.iceCandidates[0];
    console.log(`[Test] First ICE candidate: ${firstCandidate.type} ${firstCandidate.ip}:${firstCandidate.port}`);
    
    // Verify first DTLS fingerprint
    const firstFingerprint = transport.dtlsParameters.fingerprints[0];
    console.log(`[Test] First DTLS fingerprint: ${firstFingerprint.algorithm} ${firstFingerprint.value.substring(0, 20)}...`);
    
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

testTransportCreation();

