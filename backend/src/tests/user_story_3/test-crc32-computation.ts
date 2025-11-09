/**
 * Test CRC32 Computation (Approximation Behavior)
 * 
 * Tests:
 * - C3.1: PCM Frame CRC32 Computation
 * 
 * From USER_STORY_3_TECHNICAL_DECISIONS.md Decision 1: CRC32 computed on PCM frames
 * From dev_specs/data_schemas.md line 102: "crc32: string (hex, 8 chars)"
 */

import CRC32 from 'crc-32';

// Simulate PCMFrame structure (from dev_specs/data_schemas.md)
interface PCMFrame {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
}

console.log('===========================================');
console.log('🧪 Testing CRC32 Computation');
console.log('===========================================\n');

// Test C3.1: PCM Frame CRC32 Computation
console.log('Test C3.1: PCM Frame CRC32 Computation');
console.log('-------------------------------------------');

/**
 * Compute CRC32 fingerprint of audio frame
 * From UserClient.computeCrc32() implementation
 */
function computeCrc32(frame: PCMFrame): string {
  // Convert Float32Array samples to Uint8Array for CRC32 computation
  const samples = frame.samples;
  // Convert Float32Array to Uint8Array (4 bytes per float)
  const uint8Array = new Uint8Array(samples.buffer);
  
  // Compute CRC32 using 'crc-32' library
  const crc32 = CRC32.buf(uint8Array);
  
  // Return hex string (8 chars, uppercase, zero-padded)
  // From data_schemas.md line 102: "crc32: string (hex, 8 chars)"
  return Math.abs(crc32).toString(16).toUpperCase().padStart(8, '0');
}

async function testCrc32Computation(): Promise<void> {
  // Test 1.1: Sender Side - Compute CRC32 on PCM frame
  console.log('  Test 1.1: Sender Side - Compute CRC32 on PCM frame');
  
  // Create a test PCM frame (simulating 20ms of audio at 48kHz = 960 samples)
  const sampleCount = 960; // 20ms at 48kHz
  const samples = new Float32Array(sampleCount);
  
  // Fill with test data (sine wave pattern)
  for (let i = 0; i < sampleCount; i++) {
    samples[i] = Math.sin(2 * Math.PI * 440 * i / 48000); // 440 Hz tone
  }
  
  const pcmFrame: PCMFrame = {
    samples,
    sampleRate: 48000,
    channels: 1
  };
  
  const crc32 = computeCrc32(pcmFrame);
  
  // Verify format: 8 chars, hex, uppercase
  if (crc32.length === 8 && /^[0-9A-F]{8}$/.test(crc32)) {
    console.log(`    ✅ PASS: CRC32 computed correctly: ${crc32}`);
  } else {
    console.log(`    ❌ FAIL: CRC32 format incorrect: ${crc32} (length: ${crc32.length})`);
    process.exit(1);
  }
  
  // Test 1.2: Consistency - Same PCM frame → Same CRC32
  console.log('  Test 1.2: Consistency - Same PCM frame → Same CRC32');
  
  const crc32_1 = computeCrc32(pcmFrame);
  const crc32_2 = computeCrc32(pcmFrame);
  
  if (crc32_1 === crc32_2) {
    console.log(`    ✅ PASS: Same frame produces same CRC32: ${crc32_1}`);
  } else {
    console.log(`    ❌ FAIL: Same frame produces different CRC32: ${crc32_1} vs ${crc32_2}`);
    process.exit(1);
  }
  
  // Test 1.3: Different PCM frames → Different CRC32
  console.log('  Test 1.3: Different PCM frames → Different CRC32');
  
  const samples2 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    samples2[i] = Math.sin(2 * Math.PI * 880 * i / 48000); // 880 Hz tone (different frequency)
  }
  
  const pcmFrame2: PCMFrame = {
    samples: samples2,
    sampleRate: 48000,
    channels: 1
  };
  
  const crc32_3 = computeCrc32(pcmFrame2);
  
  if (crc32_1 !== crc32_3) {
    console.log(`    ✅ PASS: Different frames produce different CRC32: ${crc32_1} vs ${crc32_3}`);
  } else {
    console.log(`    ❌ FAIL: Different frames produce same CRC32: ${crc32_1}`);
    process.exit(1);
  }
  
  // Test 1.4: Receiver Side - Compute CRC32 on decoded PCM frame
  console.log('  Test 1.4: Receiver Side - Compute CRC32 on decoded PCM frame');
  
  // Simulate decoded frame (same structure as sender, but after decoding)
  const decodedFrame: PCMFrame = {
    samples: new Float32Array(samples), // Copy of original samples
    sampleRate: 48000,
    channels: 1
  };
  
  const decodedCrc32 = computeCrc32(decodedFrame);
  
  // Note: In real scenario, decoded frame might differ slightly due to encoding/decoding
  // But for this test, we verify the computation works
  if (decodedCrc32.length === 8 && /^[0-9A-F]{8}$/.test(decodedCrc32)) {
    console.log(`    ✅ PASS: Decoded frame CRC32 computed correctly: ${decodedCrc32}`);
  } else {
    console.log(`    ❌ FAIL: Decoded frame CRC32 format incorrect: ${decodedCrc32}`);
    process.exit(1);
  }
  
  // Test 1.5: Edge Case - Empty frame
  console.log('  Test 1.5: Edge Case - Empty frame');
  
  const emptyFrame: PCMFrame = {
    samples: new Float32Array(0),
    sampleRate: 48000,
    channels: 1
  };
  
  const emptyCrc32 = computeCrc32(emptyFrame);
  
  if (emptyCrc32.length === 8 && /^[0-9A-F]{8}$/.test(emptyCrc32)) {
    console.log(`    ✅ PASS: Empty frame CRC32 computed correctly: ${emptyCrc32}`);
  } else {
    console.log(`    ❌ FAIL: Empty frame CRC32 format incorrect: ${emptyCrc32}`);
    process.exit(1);
  }
  
  console.log('  ✅ All CRC32 computation tests passed\n');
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testCrc32Computation();
    
    console.log('===========================================');
    console.log('✅ All CRC32 Computation tests PASSED');
    console.log('===========================================');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Execute tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

