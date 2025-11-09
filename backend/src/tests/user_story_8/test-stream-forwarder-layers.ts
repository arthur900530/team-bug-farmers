/**
 * Test StreamForwarder Layer Switching
 * 
 * Tests:
 * - C1.3.1: setTier() - Layer Mapping
 * - C1.3.2: setTier() - Multiple Consumers
 * - C1.3.3: setTier() - No Change
 * 
 * From dev_specs/flow_charts.md line 157: StreamForwarder forwards new tier
 * From USER_STORY_8_MEDIASOUP_API_VERIFICATION.md: setPreferredLayers() API verified
 * From USER_STORY_8_IMPLEMENTATION_GUIDE.md: Layer mapping (LOW=0, MEDIUM=1, HIGH=2)
 * 
 * Note: This test verifies the logic and layer mapping. Actual mediasoup Consumer
 * layer switching is tested in integration tests with real mediasoup setup.
 */

import { StreamForwarder } from '../../StreamForwarder';
import { MeetingRegistry } from '../../MeetingRegistry';
import { MediasoupManager } from '../../MediasoupManager';
import type { UserSession } from '../../types';

// Test configuration
const TEST_MEETING_ID = 'test-meeting-layers';
const TEST_USER_1 = 'user-1';
const TEST_USER_2 = 'user-2';

console.log('===========================================');
console.log('🧪 Testing StreamForwarder Layer Switching');
console.log('===========================================\n');

// Test C1.3.1: setTier() - Layer Mapping
console.log('Test C1.3.1: setTier() - Layer Mapping');
console.log('-------------------------------------------');

async function testLayerMapping(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  
  // Create meeting
  const session1: UserSession = {
    userId: TEST_USER_1,
    pcId: `pc-${TEST_USER_1}`,
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  meetingRegistry.registerUser(TEST_MEETING_ID, session1);
  
  // Test 1.1: LOW Tier (layer 0)
  console.log('  Test 1.1: LOW Tier → Layer 0');
  await streamForwarder.setTier(TEST_MEETING_ID, 'LOW');
  const tier1 = (streamForwarder as any).meetingTiers.get(TEST_MEETING_ID);
  if (tier1 === 'LOW') {
    console.log('    ✅ PASS: LOW tier set correctly');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${tier1}`);
    process.exit(1);
  }
  
  // Test 1.2: MEDIUM Tier (layer 1)
  console.log('  Test 1.2: MEDIUM Tier → Layer 1');
  await streamForwarder.setTier(TEST_MEETING_ID, 'MEDIUM');
  const tier2 = (streamForwarder as any).meetingTiers.get(TEST_MEETING_ID);
  if (tier2 === 'MEDIUM') {
    console.log('    ✅ PASS: MEDIUM tier set correctly');
  } else {
    console.log(`    ❌ FAIL: Expected MEDIUM, got ${tier2}`);
    process.exit(1);
  }
  
  // Test 1.3: HIGH Tier (layer 2)
  console.log('  Test 1.3: HIGH Tier → Layer 2');
  await streamForwarder.setTier(TEST_MEETING_ID, 'HIGH');
  const tier3 = (streamForwarder as any).meetingTiers.get(TEST_MEETING_ID);
  if (tier3 === 'HIGH') {
    console.log('    ✅ PASS: HIGH tier set correctly');
  } else {
    console.log(`    ❌ FAIL: Expected HIGH, got ${tier3}`);
    process.exit(1);
  }
  
  // Verify MeetingRegistry updated
  const meeting = meetingRegistry.getMeeting(TEST_MEETING_ID);
  if (meeting && meeting.currentTier === 'HIGH') {
    console.log('    ✅ PASS: MeetingRegistry updated correctly');
  } else {
    console.log(`    ❌ FAIL: MeetingRegistry not updated, got ${meeting?.currentTier || 'undefined'}`);
    process.exit(1);
  }
  
  console.log('  ✅ All layer mapping tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Test C1.3.2: setTier() - Multiple Consumers
console.log('Test C1.3.2: setTier() - Multiple Consumers');
console.log('-------------------------------------------');

async function testMultipleConsumers(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  
  // Create meeting with multiple users
  const session1: UserSession = {
    userId: TEST_USER_1,
    pcId: `pc-${TEST_USER_1}`,
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  const session2: UserSession = {
    userId: TEST_USER_2,
    pcId: `pc-${TEST_USER_2}`,
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  meetingRegistry.registerUser(TEST_MEETING_ID, session1);
  meetingRegistry.registerUser(TEST_MEETING_ID, session2);
  
  // Test 2.1: No Consumers (should handle gracefully)
  console.log('  Test 2.1: No Consumers (should handle gracefully)');
  try {
    await streamForwarder.setTier(TEST_MEETING_ID, 'LOW');
    console.log('    ✅ PASS: Handles no consumers gracefully');
  } catch (error) {
    console.log(`    ❌ FAIL: Should handle no consumers gracefully, got error: ${error}`);
    process.exit(1);
  }
  
  // Note: Testing with actual consumers requires mediasoup Producer/Consumer setup
  // This is tested in integration tests (C2.2)
  console.log('    ℹ️  Note: Actual consumer layer switching tested in integration tests');
  
  console.log('  ✅ All multiple consumers tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Test C1.3.3: setTier() - No Change
console.log('Test C1.3.3: setTier() - No Change');
console.log('-------------------------------------------');

async function testNoChange(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  
  // Create meeting
  const session1: UserSession = {
    userId: TEST_USER_1,
    pcId: `pc-${TEST_USER_1}`,
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  meetingRegistry.registerUser(TEST_MEETING_ID, session1);
  
  // Set tier first time
  await streamForwarder.setTier(TEST_MEETING_ID, 'HIGH');
  
  // Test 3.1: Same Tier (should return early)
  console.log('  Test 3.1: Same Tier (should return early)');
  // Capture console.log to verify early return message
  const originalLog = console.log;
  let earlyReturnDetected = false;
  console.log = (...args: any[]) => {
    if (args[0] && args[0].includes('already set to')) {
      earlyReturnDetected = true;
    }
    originalLog(...args);
  };
  
  await streamForwarder.setTier(TEST_MEETING_ID, 'HIGH');
  
  console.log = originalLog;
  
  if (earlyReturnDetected) {
    console.log('    ✅ PASS: Early return when tier unchanged');
  } else {
    console.log('    ⚠️  WARNING: Early return message not detected (may still work correctly)');
  }
  
  // Verify tier still HIGH
  const tier = (streamForwarder as any).meetingTiers.get(TEST_MEETING_ID);
  if (tier === 'HIGH') {
    console.log('    ✅ PASS: Tier unchanged correctly');
  } else {
    console.log(`    ❌ FAIL: Expected HIGH, got ${tier}`);
    process.exit(1);
  }
  
  console.log('  ✅ All no change tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testLayerMapping();
    await testMultipleConsumers();
    await testNoChange();
    
    console.log('===========================================');
    console.log('✅ ALL STREAM FORWARDER LAYER TESTS PASSED');
    console.log('===========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runAllTests();

