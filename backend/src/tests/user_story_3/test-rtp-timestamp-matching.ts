/**
 * Test RTP Timestamp Matching (Approximation Behavior)
 * 
 * Tests:
 * - C3.2: RTP Timestamp Matching with Tolerance Window
 * 
 * From USER_STORY_3_TECHNICAL_DECISIONS.md Decision 2: RTP timestamp matching with ±50ms tolerance
 * From dev_specs/public_interfaces.md line 266: "Jitter tolerance: up to 50ms"
 */

console.log('===========================================');
console.log('🧪 Testing RTP Timestamp Matching');
console.log('===========================================\n');

// Test C3.2: RTP Timestamp Matching
console.log('Test C3.2: RTP Timestamp Matching with Tolerance');
console.log('-------------------------------------------');

// Simulate frameIdMap structure (from UserClient implementation)
interface FrameData {
  timestamp: number;
  rtpTimestamp: number;
}

/**
 * Find matching sender frameId using RTP timestamp
 * From UserClient.findMatchingFrameId() implementation
 */
function findMatchingFrameId(
  frameIdMap: Map<string, FrameData>,
  rtpTimestamp: number,
  toleranceMs: number
): string | null {
  // Search through recent sender fingerprints
  // Match based on RTP timestamp within tolerance window
  for (const [frameId, frameData] of frameIdMap.entries()) {
    const timestampDiff = Math.abs(frameData.rtpTimestamp - rtpTimestamp);
    if (timestampDiff <= toleranceMs) {
      return frameId; // Match found
    }
  }
  return null; // No match found (packet loss)
}

async function testRtpTimestampMatching(): Promise<void> {
  const TIMESTAMP_TOLERANCE_MS = 50; // ±50ms window (from USER_STORY_3_TECHNICAL_DECISIONS.md)
  
  // Test 2.1: Exact Match
  console.log('  Test 2.1: Exact Match');
  
  const frameIdMap = new Map<string, FrameData>();
  const senderRtpTimestamp = 1000000;
  
  frameIdMap.set('frame-1', {
    timestamp: Date.now(),
    rtpTimestamp: senderRtpTimestamp
  });
  
  const match1 = findMatchingFrameId(frameIdMap, senderRtpTimestamp, TIMESTAMP_TOLERANCE_MS);
  
  if (match1 === 'frame-1') {
    console.log('    ✅ PASS: Exact match found');
  } else {
    console.log(`    ❌ FAIL: Expected 'frame-1', got ${match1}`);
    process.exit(1);
  }
  
  // Test 2.2: Within Tolerance (Small Jitter)
  console.log('  Test 2.2: Within Tolerance - Small Jitter (±10ms)');
  
  const receiverRtpTimestamp1 = senderRtpTimestamp + 10; // 10ms later
  
  const match2 = findMatchingFrameId(frameIdMap, receiverRtpTimestamp1, TIMESTAMP_TOLERANCE_MS);
  
  if (match2 === 'frame-1') {
    console.log('    ✅ PASS: Small jitter handled correctly');
  } else {
    console.log(`    ❌ FAIL: Expected 'frame-1' for ±10ms jitter, got ${match2}`);
    process.exit(1);
  }
  
  // Test 2.3: Within Tolerance (Medium Jitter)
  console.log('  Test 2.3: Within Tolerance - Medium Jitter (±40ms)');
  
  const receiverRtpTimestamp2 = senderRtpTimestamp - 40; // 40ms earlier
  
  const match3 = findMatchingFrameId(frameIdMap, receiverRtpTimestamp2, TIMESTAMP_TOLERANCE_MS);
  
  if (match3 === 'frame-1') {
    console.log('    ✅ PASS: Medium jitter handled correctly');
  } else {
    console.log(`    ❌ FAIL: Expected 'frame-1' for ±40ms jitter, got ${match3}`);
    process.exit(1);
  }
  
  // Test 2.4: At Tolerance Boundary (±50ms)
  console.log('  Test 2.4: At Tolerance Boundary (±50ms)');
  
  const receiverRtpTimestamp3 = senderRtpTimestamp + 50; // Exactly at tolerance
  
  const match4 = findMatchingFrameId(frameIdMap, receiverRtpTimestamp3, TIMESTAMP_TOLERANCE_MS);
  
  if (match4 === 'frame-1') {
    console.log('    ✅ PASS: Tolerance boundary handled correctly');
  } else {
    console.log(`    ❌ FAIL: Expected 'frame-1' at tolerance boundary, got ${match4}`);
    process.exit(1);
  }
  
  // Test 2.5: Outside Tolerance (Large Jitter - Packet Loss)
  console.log('  Test 2.5: Outside Tolerance - Large Jitter (±60ms)');
  
  const receiverRtpTimestamp4 = senderRtpTimestamp + 60; // Outside tolerance
  
  const match5 = findMatchingFrameId(frameIdMap, receiverRtpTimestamp4, TIMESTAMP_TOLERANCE_MS);
  
  if (match5 === null) {
    console.log('    ✅ PASS: Large jitter (outside tolerance) → No match (packet loss)');
  } else {
    console.log(`    ❌ FAIL: Expected null for ±60ms jitter, got ${match5}`);
    process.exit(1);
  }
  
  // Test 2.6: Multiple Frames - Correct Frame Matched
  console.log('  Test 2.6: Multiple Frames - Correct Frame Matched');
  
  const frameIdMap2 = new Map<string, FrameData>();
  const baseTimestamp = 2000000;
  
  frameIdMap2.set('frame-early', {
    timestamp: Date.now() - 100,
    rtpTimestamp: baseTimestamp - 100
  });
  
  frameIdMap2.set('frame-target', {
    timestamp: Date.now(),
    rtpTimestamp: baseTimestamp
  });
  
  frameIdMap2.set('frame-late', {
    timestamp: Date.now() + 100,
    rtpTimestamp: baseTimestamp + 100
  });
  
  const receiverRtpTimestamp5 = baseTimestamp + 5; // Should match frame-target
  
  const match6 = findMatchingFrameId(frameIdMap2, receiverRtpTimestamp5, TIMESTAMP_TOLERANCE_MS);
  
  if (match6 === 'frame-target') {
    console.log('    ✅ PASS: Correct frame matched from multiple candidates');
  } else {
    console.log(`    ❌ FAIL: Expected 'frame-target', got ${match6}`);
    process.exit(1);
  }
  
  // Test 2.7: No Matching Frame (Packet Loss)
  console.log('  Test 2.7: No Matching Frame (Packet Loss)');
  
  const emptyFrameIdMap = new Map<string, FrameData>();
  const receiverRtpTimestamp6 = 3000000;
  
  const match7 = findMatchingFrameId(emptyFrameIdMap, receiverRtpTimestamp6, TIMESTAMP_TOLERANCE_MS);
  
  if (match7 === null) {
    console.log('    ✅ PASS: No match found when no frames available (packet loss)');
  } else {
    console.log(`    ❌ FAIL: Expected null for empty map, got ${match7}`);
    process.exit(1);
  }
  
  console.log('  ✅ All RTP timestamp matching tests passed\n');
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testRtpTimestampMatching();
    
    console.log('===========================================');
    console.log('✅ All RTP Timestamp Matching tests PASSED');
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

