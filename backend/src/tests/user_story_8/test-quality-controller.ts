/**
 * Test QualityController Component
 * 
 * Tests:
 * - C1.2.1: QualityController.decideTier() - Thresholds
 * - C1.2.2: QualityController.decideTier() - Hysteresis
 * - C1.2.3: QualityController.evaluateMeeting()
 * 
 * From dev_specs/flow_charts.md lines 138-142: Tier decision thresholds
 * From dev_specs/APIs.md lines 186-195: QualityController API
 * From USER_STORY_8_IMPLEMENTATION_GUIDE.md Decision 3: 2% hysteresis
 */

import { QualityController } from '../../QualityController';
import { RtcpCollector } from '../../RtcpCollector';
import { StreamForwarder } from '../../StreamForwarder';
import { MeetingRegistry } from '../../MeetingRegistry';
import { MediasoupManager } from '../../MediasoupManager';
import type { RtcpReport, UserSession } from '../../types';

// Test configuration
const TEST_MEETING_ID = 'test-meeting-quality';
const TEST_USER_1 = 'user-1';

console.log('===========================================');
console.log('🧪 Testing QualityController Component');
console.log('===========================================\n');

// Test C1.2.1: decideTier() - Thresholds
console.log('Test C1.2.1: QualityController.decideTier() - Thresholds');
console.log('-------------------------------------------');

async function testDecideTierThresholds(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  const rtcpCollector = new RtcpCollector(meetingRegistry);
  const controller = new QualityController(rtcpCollector, streamForwarder, meetingRegistry);
  
  // Test 1.1: Low Loss (< 2%) - HIGH tier
  console.log('  Test 1.1: Low Loss (< 2%) → HIGH tier');
  const tier1 = controller.decideTier(0.01, 'HIGH');
  if (tier1 === 'HIGH') {
    console.log('    ✅ PASS: 1% loss with current HIGH → HIGH');
  } else {
    console.log(`    ❌ FAIL: Expected HIGH, got ${tier1}`);
    process.exit(1);
  }
  
  // Test 1.2: Medium Loss (2-5%) - MEDIUM tier
  console.log('  Test 1.2: Medium Loss (2-5%) → MEDIUM tier');
  const tier2 = controller.decideTier(0.03, 'HIGH');
  if (tier2 === 'MEDIUM') {
    console.log('    ✅ PASS: 3% loss with current HIGH → MEDIUM');
  } else {
    console.log(`    ❌ FAIL: Expected MEDIUM, got ${tier2}`);
    process.exit(1);
  }
  
  // Test 1.3: High Loss (≥ 5%) - LOW tier
  console.log('  Test 1.3: High Loss (≥ 5%) → LOW tier');
  const tier3 = controller.decideTier(0.06, 'MEDIUM');
  if (tier3 === 'LOW') {
    console.log('    ✅ PASS: 6% loss with current MEDIUM → LOW');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${tier3}`);
    process.exit(1);
  }
  
  // Test 1.4: Boundary (2%) - With hysteresis
  console.log('  Test 1.4: Boundary (2%) - With hysteresis');
  const tier4 = controller.decideTier(0.02, 'HIGH');
  // With hysteresis: HIGH → MEDIUM requires loss ≥ 4% (2% + 2%)
  // So 2% loss should stay HIGH
  if (tier4 === 'HIGH') {
    console.log('    ✅ PASS: 2% loss with current HIGH → HIGH (hysteresis prevents change)');
  } else {
    console.log(`    ❌ FAIL: Expected HIGH (hysteresis), got ${tier4}`);
    process.exit(1);
  }
  
  // Test 1.5: Boundary (5%) - Immediate downgrade
  console.log('  Test 1.5: Boundary (5%) - Immediate downgrade');
  const tier5 = controller.decideTier(0.05, 'MEDIUM');
  if (tier5 === 'LOW') {
    console.log('    ✅ PASS: 5% loss with current MEDIUM → LOW');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${tier5}`);
    process.exit(1);
  }
  
  console.log('  ✅ All threshold tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Test C1.2.2: decideTier() - Hysteresis
console.log('Test C1.2.2: QualityController.decideTier() - Hysteresis');
console.log('-------------------------------------------');

async function testDecideTierHysteresis(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  const rtcpCollector = new RtcpCollector(meetingRegistry);
  const controller = new QualityController(rtcpCollector, streamForwarder, meetingRegistry);
  
  // Test 2.1: HIGH → MEDIUM (requires 4% with hysteresis)
  console.log('  Test 2.1: HIGH → MEDIUM (requires 4% with hysteresis)');
  const tier1 = controller.decideTier(0.04, 'HIGH'); // 4% = 2% + 2% hysteresis
  if (tier1 === 'MEDIUM') {
    console.log('    ✅ PASS: 4% loss with current HIGH → MEDIUM (hysteresis threshold met)');
  } else {
    console.log(`    ❌ FAIL: Expected MEDIUM, got ${tier1}`);
    process.exit(1);
  }
  
  // Test 2.2: MEDIUM → HIGH (requires < 2%)
  console.log('  Test 2.2: MEDIUM → HIGH (requires < 2%)');
  const tier2 = controller.decideTier(0.01, 'MEDIUM');
  if (tier2 === 'HIGH') {
    console.log('    ✅ PASS: 1% loss with current MEDIUM → HIGH');
  } else {
    console.log(`    ❌ FAIL: Expected HIGH, got ${tier2}`);
    process.exit(1);
  }
  
  // Test 2.3: MEDIUM → LOW (immediate at 5%)
  console.log('  Test 2.3: MEDIUM → LOW (immediate at 5%)');
  const tier3 = controller.decideTier(0.05, 'MEDIUM');
  if (tier3 === 'LOW') {
    console.log('    ✅ PASS: 5% loss with current MEDIUM → LOW');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${tier3}`);
    process.exit(1);
  }
  
  // Test 2.4: LOW → MEDIUM (requires < 3% with hysteresis)
  console.log('  Test 2.4: LOW → MEDIUM (requires < 3% with hysteresis)');
  const tier4 = controller.decideTier(0.02, 'LOW'); // 2% < 3% (5% - 2% hysteresis)
  if (tier4 === 'MEDIUM') {
    console.log('    ✅ PASS: 2% loss with current LOW → MEDIUM (hysteresis threshold met)');
  } else {
    console.log(`    ❌ FAIL: Expected MEDIUM, got ${tier4}`);
    process.exit(1);
  }
  
  // Test 2.5: LOW → MEDIUM (boundary at 3%)
  console.log('  Test 2.5: LOW → MEDIUM (boundary at 3%)');
  const tier5 = controller.decideTier(0.03, 'LOW'); // 3% = 5% - 2% hysteresis
  if (tier5 === 'MEDIUM') {
    console.log('    ✅ PASS: 3% loss with current LOW → MEDIUM (boundary case)');
  } else {
    console.log(`    ❌ FAIL: Expected MEDIUM, got ${tier5}`);
    process.exit(1);
  }
  
  // Test 2.6: LOW → MEDIUM (just above boundary, stays LOW)
  console.log('  Test 2.6: LOW → MEDIUM (just above boundary, stays LOW)');
  const tier6 = controller.decideTier(0.0301, 'LOW'); // Just above 3%
  if (tier6 === 'LOW') {
    console.log('    ✅ PASS: 3.01% loss with current LOW → LOW (hysteresis prevents change)');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${tier6}`);
    process.exit(1);
  }
  
  console.log('  ✅ All hysteresis tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Test C1.2.3: evaluateMeeting()
console.log('Test C1.2.3: QualityController.evaluateMeeting()');
console.log('-------------------------------------------');

async function testEvaluateMeeting(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const mediasoupManager = new MediasoupManager();
  await mediasoupManager.initialize();
  const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);
  const rtcpCollector = new RtcpCollector(meetingRegistry);
  const controller = new QualityController(rtcpCollector, streamForwarder, meetingRegistry);
  
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
  const meeting = meetingRegistry.getMeeting(TEST_MEETING_ID);
  if (!meeting) {
    console.log('    ❌ FAIL: Meeting not created');
    process.exit(1);
  }
  
  // Test 3.1: Tier Change
  console.log('  Test 3.1: Tier Change');
  // Set initial tier to HIGH
  meetingRegistry.updateQualityTier(TEST_MEETING_ID, 'HIGH');
  
  // Add RTCP report with high loss (should trigger tier change)
  const report: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.06, // 6% loss → should downgrade to LOW
    jitterMs: 30,
    rttMs: 150,
    timestamp: Date.now()
  };
  rtcpCollector.collect(report);
  
  await controller.evaluateMeeting(TEST_MEETING_ID);
  
  const updatedMeeting = meetingRegistry.getMeeting(TEST_MEETING_ID);
  if (updatedMeeting && updatedMeeting.currentTier === 'LOW') {
    console.log('    ✅ PASS: Tier changed from HIGH to LOW');
  } else {
    console.log(`    ❌ FAIL: Expected LOW, got ${updatedMeeting?.currentTier || 'undefined'}`);
    process.exit(1);
  }
  
  // Test 3.2: No Tier Change
  console.log('  Test 3.2: No Tier Change');
  // Add RTCP report with same loss level (should not change)
  const report2: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.06, // Same 6% loss
    jitterMs: 30,
    rttMs: 150,
    timestamp: Date.now()
  };
  rtcpCollector.collect(report2);
  
  await controller.evaluateMeeting(TEST_MEETING_ID);
  
  const updatedMeeting2 = meetingRegistry.getMeeting(TEST_MEETING_ID);
  if (updatedMeeting2 && updatedMeeting2.currentTier === 'LOW') {
    console.log('    ✅ PASS: Tier unchanged when loss stable');
  } else {
    console.log(`    ❌ FAIL: Expected LOW (unchanged), got ${updatedMeeting2?.currentTier || 'undefined'}`);
    process.exit(1);
  }
  
  // Test 3.3: No Meeting
  console.log('  Test 3.3: No Meeting');
  await controller.evaluateMeeting('non-existent-meeting');
  // Should not throw error
  console.log('    ✅ PASS: Handles non-existent meeting gracefully');
  
  console.log('  ✅ All evaluateMeeting() tests passed\n');
  
  await mediasoupManager.shutdown();
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testDecideTierThresholds();
    await testDecideTierHysteresis();
    await testEvaluateMeeting();
    
    console.log('===========================================');
    console.log('✅ ALL QUALITY CONTROLLER TESTS PASSED');
    console.log('===========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runAllTests();

