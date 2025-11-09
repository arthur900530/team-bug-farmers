/**
 * Test RtcpCollector Component
 * 
 * Tests:
 * - C1.1: RtcpCollector.collect() - RTCP report collection and sliding window
 * - C1.2: RtcpCollector.getWorstLoss() - Worst loss computation
 * - C1.3: RtcpCollector.getMetrics() - Metrics aggregation
 * - C1.4: Cleanup methods
 * 
 * From dev_specs/flow_charts.md lines 108-112: RTCP collection flow
 * From dev_specs/APIs.md lines 169-181: RtcpCollector API
 * From dev_specs/data_schemas.md DS-03: RtcpReport structure
 */

import { RtcpCollector } from '../../RtcpCollector';
import { MeetingRegistry } from '../../MeetingRegistry';
import type { RtcpReport, UserSession } from '../../types';

// Test configuration
const TEST_MEETING_ID = 'test-meeting-rtcp';
const TEST_USER_1 = 'user-1';
const TEST_USER_2 = 'user-2';
const TEST_USER_3 = 'user-3';

console.log('===========================================');
console.log('🧪 Testing RtcpCollector Component');
console.log('===========================================\n');

// Test C1.1: collect()
console.log('Test C1.1: RtcpCollector.collect()');
console.log('-------------------------------------------');

async function testCollect(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const collector = new RtcpCollector(meetingRegistry);
  
  // Create meeting with users
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
  
  // Test 1.1: Single Report
  console.log('  Test 1.1: Single Report');
  const report1: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.01,
    jitterMs: 10,
    rttMs: 50,
    timestamp: Date.now()
  };
  
  collector.collect(report1);
  const reports1 = (collector as any).userReports.get(TEST_USER_1);
  if (reports1 && reports1.length === 1) {
    console.log('    ✅ PASS: Single report stored correctly');
  } else {
    console.log('    ❌ FAIL: Single report not stored');
    process.exit(1);
  }
  
  // Test 1.2: Multiple Reports (Same User) - Sliding Window
  console.log('  Test 1.2: Multiple Reports (Sliding Window)');
  for (let i = 2; i <= 15; i++) {
    const report: RtcpReport = {
      userId: TEST_USER_1,
      lossPct: 0.01 * i,
      jitterMs: 10 * i,
      rttMs: 50 * i,
      timestamp: Date.now()
    };
    collector.collect(report);
  }
  
  const reports2 = (collector as any).userReports.get(TEST_USER_1);
  if (reports2 && reports2.length === 10) {
    console.log('    ✅ PASS: Sliding window maintained (last 10 reports)');
  } else {
    console.log(`    ❌ FAIL: Expected 10 reports, got ${reports2?.length || 0}`);
    process.exit(1);
  }
  
  // Test 1.3: Multiple Reports (Different Users)
  console.log('  Test 1.3: Multiple Reports (Different Users)');
  const report2: RtcpReport = {
    userId: TEST_USER_2,
    lossPct: 0.05,
    jitterMs: 20,
    rttMs: 100,
    timestamp: Date.now()
  };
  collector.collect(report2);
  
  const reports3 = (collector as any).userReports.get(TEST_USER_2);
  if (reports3 && reports3.length === 1) {
    console.log('    ✅ PASS: Multiple users handled correctly');
  } else {
    console.log('    ❌ FAIL: Multiple users not handled correctly');
    process.exit(1);
  }
  
  console.log('  ✅ All collect() tests passed\n');
}

// Test C1.2: getWorstLoss()
console.log('Test C1.2: RtcpCollector.getWorstLoss()');
console.log('-------------------------------------------');

async function testGetWorstLoss(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const collector = new RtcpCollector(meetingRegistry);
  
  // Create meeting with users
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
  const session3: UserSession = {
    userId: TEST_USER_3,
    pcId: `pc-${TEST_USER_3}`,
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  meetingRegistry.registerUser(TEST_MEETING_ID, session1);
  meetingRegistry.registerUser(TEST_MEETING_ID, session2);
  meetingRegistry.registerUser(TEST_MEETING_ID, session3);
  
  // Test 2.1: Single User (Low Loss)
  console.log('  Test 2.1: Single User (Low Loss)');
  const report1: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.01,
    jitterMs: 10,
    rttMs: 50,
    timestamp: Date.now()
  };
  collector.collect(report1);
  
  const worstLoss1 = collector.getWorstLoss(TEST_MEETING_ID);
  if (Math.abs(worstLoss1 - 0.01) < 0.001) {
    console.log('    ✅ PASS: Single user worst loss computed correctly');
  } else {
    console.log(`    ❌ FAIL: Expected 0.01, got ${worstLoss1}`);
    process.exit(1);
  }
  
  // Test 2.2: Multiple Users (Different Loss)
  console.log('  Test 2.2: Multiple Users (Different Loss)');
  const report2: RtcpReport = {
    userId: TEST_USER_2,
    lossPct: 0.05,
    jitterMs: 20,
    rttMs: 100,
    timestamp: Date.now()
  };
  const report3: RtcpReport = {
    userId: TEST_USER_3,
    lossPct: 0.08,
    jitterMs: 30,
    rttMs: 150,
    timestamp: Date.now()
  };
  collector.collect(report2);
  collector.collect(report3);
  
  const worstLoss2 = collector.getWorstLoss(TEST_MEETING_ID);
  if (Math.abs(worstLoss2 - 0.08) < 0.001) {
    console.log('    ✅ PASS: Worst loss computed correctly (max across all users)');
  } else {
    console.log(`    ❌ FAIL: Expected 0.08, got ${worstLoss2}`);
    process.exit(1);
  }
  
  // Test 2.3: No Reports
  console.log('  Test 2.3: No Reports');
  const meetingRegistry2 = new MeetingRegistry();
  const collector2 = new RtcpCollector(meetingRegistry2);
  const worstLoss3 = collector2.getWorstLoss('non-existent-meeting');
  if (worstLoss3 === 0) {
    console.log('    ✅ PASS: No reports returns 0');
  } else {
    console.log(`    ❌ FAIL: Expected 0, got ${worstLoss3}`);
    process.exit(1);
  }
  
  // Test 2.4: Empty Meeting
  console.log('  Test 2.4: Empty Meeting');
  const worstLoss4 = collector2.getWorstLoss('empty-meeting');
  if (worstLoss4 === 0) {
    console.log('    ✅ PASS: Empty meeting returns 0');
  } else {
    console.log(`    ❌ FAIL: Expected 0, got ${worstLoss4}`);
    process.exit(1);
  }
  
  console.log('  ✅ All getWorstLoss() tests passed\n');
}

// Test C1.3: getMetrics()
console.log('Test C1.3: RtcpCollector.getMetrics()');
console.log('-------------------------------------------');

async function testGetMetrics(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const collector = new RtcpCollector(meetingRegistry);
  
  // Create meeting with users
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
  
  // Test 3.1: Average Metrics
  console.log('  Test 3.1: Average Metrics');
  const report1: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.02,
    jitterMs: 10,
    rttMs: 50,
    timestamp: Date.now()
  };
  const report2: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.04,
    jitterMs: 20,
    rttMs: 100,
    timestamp: Date.now()
  };
  const report3: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.06,
    jitterMs: 30,
    rttMs: 150,
    timestamp: Date.now()
  };
  collector.collect(report1);
  collector.collect(report2);
  collector.collect(report3);
  
  const metrics = collector.getMetrics(TEST_MEETING_ID);
  const expectedAvgLoss = (0.02 + 0.04 + 0.06) / 3;
  const expectedAvgJitter = (10 + 20 + 30) / 3;
  const expectedAvgRtt = (50 + 100 + 150) / 3;
  const expectedWorstLoss = 0.06;
  
  if (Math.abs(metrics.avgLoss - expectedAvgLoss) < 0.001 &&
      Math.abs(metrics.avgJitter - expectedAvgJitter) < 0.1 &&
      Math.abs(metrics.avgRtt - expectedAvgRtt) < 0.1 &&
      Math.abs(metrics.worstLoss - expectedWorstLoss) < 0.001) {
    console.log('    ✅ PASS: Metrics aggregated correctly');
  } else {
    console.log(`    ❌ FAIL: Expected avgLoss=${expectedAvgLoss}, avgJitter=${expectedAvgJitter}, avgRtt=${expectedAvgRtt}, worstLoss=${expectedWorstLoss}`);
    console.log(`    Got: avgLoss=${metrics.avgLoss}, avgJitter=${metrics.avgJitter}, avgRtt=${metrics.avgRtt}, worstLoss=${metrics.worstLoss}`);
    process.exit(1);
  }
  
  // Test 3.2: No Reports
  console.log('  Test 3.2: No Reports');
  const meetingRegistry2 = new MeetingRegistry();
  const collector2 = new RtcpCollector(meetingRegistry2);
  const metrics2 = collector2.getMetrics('non-existent-meeting');
  if (metrics2.avgLoss === 0 && metrics2.avgJitter === 0 && metrics2.avgRtt === 0 && metrics2.worstLoss === 0) {
    console.log('    ✅ PASS: No reports returns all zeros');
  } else {
    console.log(`    ❌ FAIL: Expected all zeros, got ${JSON.stringify(metrics2)}`);
    process.exit(1);
  }
  
  console.log('  ✅ All getMetrics() tests passed\n');
}

// Test C1.4: Cleanup
console.log('Test C1.4: Cleanup Methods');
console.log('-------------------------------------------');

async function testCleanup(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const collector = new RtcpCollector(meetingRegistry);
  
  // Create meeting with users
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
  
  // Collect some reports
  const report1: RtcpReport = {
    userId: TEST_USER_1,
    lossPct: 0.01,
    jitterMs: 10,
    rttMs: 50,
    timestamp: Date.now()
  };
  const report2: RtcpReport = {
    userId: TEST_USER_2,
    lossPct: 0.05,
    jitterMs: 20,
    rttMs: 100,
    timestamp: Date.now()
  };
  collector.collect(report1);
  collector.collect(report2);
  
  // Test 4.1: cleanupUser()
  console.log('  Test 4.1: cleanupUser()');
  collector.cleanupUser(TEST_USER_1);
  const reports1 = (collector as any).userReports.get(TEST_USER_1);
  if (!reports1) {
    console.log('    ✅ PASS: User reports cleaned up correctly');
  } else {
    console.log('    ❌ FAIL: User reports not cleaned up');
    process.exit(1);
  }
  
  // Test 4.2: cleanupMeeting()
  console.log('  Test 4.2: cleanupMeeting()');
  collector.cleanupMeeting(TEST_MEETING_ID);
  const reports2 = (collector as any).userReports.get(TEST_USER_2);
  if (!reports2) {
    console.log('    ✅ PASS: Meeting reports cleaned up correctly');
  } else {
    console.log('    ❌ FAIL: Meeting reports not cleaned up');
    process.exit(1);
  }
  
  console.log('  ✅ All cleanup tests passed\n');
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testCollect();
    await testGetWorstLoss();
    await testGetMetrics();
    await testCleanup();
    
    console.log('===========================================');
    console.log('✅ ALL RTCP COLLECTOR TESTS PASSED');
    console.log('===========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runAllTests();

