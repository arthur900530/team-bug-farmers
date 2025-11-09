/**
 * Test AckAggregator Component
 * 
 * Tests:
 * - C1.3: AckAggregator.onDecodeAck() - ACK/NACK recording logic
 * - C1.4: AckAggregator.summaryForSpeaker() - ACK summary generation
 * 
 * From dev_specs/flow_charts.md lines 181-192: ACK aggregation flow
 * From dev_specs/APIs.md lines 212-219: AckAggregator API
 * From dev_specs/data_schemas.md DS-05: AckSummary structure
 */

import { AckAggregator } from '../../AckAggregator';
import { MeetingRegistry } from '../../MeetingRegistry';
import { UserSession } from '../../types';

// Test configuration
const TEST_MEETING_ID = 'test-meeting-ack';
const TEST_SENDER_USER_ID = 'sender-user-123';
const TEST_RECEIVER_1 = 'receiver-user-1';
const TEST_RECEIVER_2 = 'receiver-user-2';
const TEST_RECEIVER_3 = 'receiver-user-3';

console.log('===========================================');
console.log('🧪 Testing AckAggregator Component');
console.log('===========================================\n');

// Test C1.3: AckAggregator.onDecodeAck()
console.log('Test C1.3: AckAggregator.onDecodeAck()');
console.log('-------------------------------------------');

async function testOnDecodeAck(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const aggregator = new AckAggregator(meetingRegistry);
  
  // Set up meeting with participants
  const senderSession: UserSession = {
    userId: TEST_SENDER_USER_ID,
    pcId: 'pc-sender',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  const receiver1Session: UserSession = {
    userId: TEST_RECEIVER_1,
    pcId: 'pc-receiver-1',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  const receiver2Session: UserSession = {
    userId: TEST_RECEIVER_2,
    pcId: 'pc-receiver-2',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  meetingRegistry.registerUser(TEST_MEETING_ID, senderSession);
  meetingRegistry.registerUser(TEST_MEETING_ID, receiver1Session);
  meetingRegistry.registerUser(TEST_MEETING_ID, receiver2Session);
  
  let summaryCallbackCalled = false;
  let receivedSummary: any = null;
  
  // Set up callback to capture summary
  aggregator.setOnSummaryCallback((meetingId: string, senderUserId: string, summary: any) => {
    summaryCallbackCalled = true;
    receivedSummary = summary;
    console.log(`    [Callback] Summary generated: meetingId=${meetingId}, sender=${senderUserId}`);
    console.log(`      ackedUsers: ${summary.ackedUsers.length}, missingUsers: ${summary.missingUsers.length}`);
  });
  
  // Test 3.1: Record ACK
  console.log('  Test 3.1: Record ACK');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, true);
  
  // Wait for summary window (2 seconds)
  await new Promise(resolve => setTimeout(resolve, 2100));
  
  if (summaryCallbackCalled && receivedSummary) {
    if (receivedSummary.ackedUsers.includes(TEST_RECEIVER_1)) {
      console.log('    ✅ PASS: ACK recorded correctly');
    } else {
      console.log('    ❌ FAIL: ACK not in ackedUsers');
      process.exit(1);
    }
  } else {
    console.log('    ❌ FAIL: Summary callback not called');
    process.exit(1);
  }
  
  // Reset for next test
  summaryCallbackCalled = false;
  receivedSummary = null;
  
  // Test 3.2: Record NACK
  console.log('  Test 3.2: Record NACK');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, false);
  
  await new Promise(resolve => setTimeout(resolve, 2100));
  
  if (summaryCallbackCalled && receivedSummary) {
    if (receivedSummary.missingUsers.includes(TEST_RECEIVER_1)) {
      console.log('    ✅ PASS: NACK recorded correctly');
    } else {
      console.log('    ❌ FAIL: NACK not in missingUsers');
      process.exit(1);
    }
  } else {
    console.log('    ❌ FAIL: Summary callback not called');
    process.exit(1);
  }
  
  // Reset for next test
  summaryCallbackCalled = false;
  receivedSummary = null;
  
  // Test 3.3: Multiple Receivers (Mixed ACK/NACK)
  console.log('  Test 3.3: Multiple Receivers (Mixed ACK/NACK)');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, true);  // ACK
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_2, false); // NACK
  
  await new Promise(resolve => setTimeout(resolve, 2100));
  
  if (summaryCallbackCalled && receivedSummary) {
    const hasReceiver1 = receivedSummary.ackedUsers.includes(TEST_RECEIVER_1);
    const hasReceiver2 = receivedSummary.missingUsers.includes(TEST_RECEIVER_2);
    
    if (hasReceiver1 && hasReceiver2) {
      console.log('    ✅ PASS: Mixed ACK/NACK handled correctly');
    } else {
      console.log(`    ❌ FAIL: Expected receiver1 in ackedUsers and receiver2 in missingUsers`);
      console.log(`      ackedUsers: ${receivedSummary.ackedUsers}`);
      console.log(`      missingUsers: ${receivedSummary.missingUsers}`);
      process.exit(1);
    }
  } else {
    console.log('    ❌ FAIL: Summary callback not called');
    process.exit(1);
  }
  
  console.log('  ✅ All onDecodeAck() tests passed\n');
}

// Test C1.4: AckAggregator.summaryForSpeaker()
console.log('Test C1.4: AckAggregator.summaryForSpeaker()');
console.log('-------------------------------------------');

async function testSummaryForSpeaker(): Promise<void> {
  const meetingRegistry = new MeetingRegistry();
  const aggregator = new AckAggregator(meetingRegistry);
  
  // Set up meeting with participants
  const senderSession: UserSession = {
    userId: TEST_SENDER_USER_ID,
    pcId: 'pc-sender',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  const receiver1Session: UserSession = {
    userId: TEST_RECEIVER_1,
    pcId: 'pc-receiver-1',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  const receiver2Session: UserSession = {
    userId: TEST_RECEIVER_2,
    pcId: 'pc-receiver-2',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  const receiver3Session: UserSession = {
    userId: TEST_RECEIVER_3,
    pcId: 'pc-receiver-3',
    qualityTier: 'HIGH',
    lastCrc32: '',
    connectionState: 'Streaming',
    timestamp: Date.now()
  };
  
  meetingRegistry.registerUser(TEST_MEETING_ID, senderSession);
  meetingRegistry.registerUser(TEST_MEETING_ID, receiver1Session);
  meetingRegistry.registerUser(TEST_MEETING_ID, receiver2Session);
  meetingRegistry.registerUser(TEST_MEETING_ID, receiver3Session);
  
  // Test 4.1: All ACKed
  console.log('  Test 4.1: All Receivers ACKed');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, true);
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_2, true);
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_3, true);
  
  // Manually trigger summary (bypassing window)
  const summary1 = aggregator.summaryForSpeaker(TEST_MEETING_ID, TEST_SENDER_USER_ID);
  
  if (summary1.ackedUsers.length === 3 && summary1.missingUsers.length === 0) {
    console.log('    ✅ PASS: All ACKed summary correct');
  } else {
    console.log(`    ❌ FAIL: Expected 3 ackedUsers and 0 missingUsers`);
    console.log(`      Got: ${summary1.ackedUsers.length} ackedUsers, ${summary1.missingUsers.length} missingUsers`);
    process.exit(1);
  }
  
  // Reset aggregator
  aggregator.reset(TEST_MEETING_ID);
  
  // Test 4.2: All Missing
  console.log('  Test 4.2: All Receivers Missing (NACK or timeout)');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, false);
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_2, false);
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_3, false);
  
  const summary2 = aggregator.summaryForSpeaker(TEST_MEETING_ID, TEST_SENDER_USER_ID);
  
  if (summary2.ackedUsers.length === 0 && summary2.missingUsers.length === 3) {
    console.log('    ✅ PASS: All Missing summary correct');
  } else {
    console.log(`    ❌ FAIL: Expected 0 ackedUsers and 3 missingUsers`);
    console.log(`      Got: ${summary2.ackedUsers.length} ackedUsers, ${summary2.missingUsers.length} missingUsers`);
    process.exit(1);
  }
  
  // Reset aggregator
  aggregator.reset(TEST_MEETING_ID);
  
  // Test 4.3: Mixed (Some ACKed, Some Missing)
  console.log('  Test 4.3: Mixed (Some ACKed, Some Missing)');
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_1, true);  // ACK
  aggregator.onDecodeAck(TEST_MEETING_ID, TEST_SENDER_USER_ID, TEST_RECEIVER_2, false); // NACK
  // Receiver 3: No ACK/NACK (timeout)
  
  const summary3 = aggregator.summaryForSpeaker(TEST_MEETING_ID, TEST_SENDER_USER_ID);
  
  const hasReceiver1 = summary3.ackedUsers.includes(TEST_RECEIVER_1);
  const hasReceiver2 = summary3.missingUsers.includes(TEST_RECEIVER_2);
  const hasReceiver3 = summary3.missingUsers.includes(TEST_RECEIVER_3);
  
  if (hasReceiver1 && hasReceiver2 && hasReceiver3 && summary3.ackedUsers.length === 1 && summary3.missingUsers.length === 2) {
    console.log('    ✅ PASS: Mixed summary correct');
  } else {
    console.log(`    ❌ FAIL: Expected receiver1 in ackedUsers, receiver2 and receiver3 in missingUsers`);
    console.log(`      ackedUsers: ${summary3.ackedUsers}`);
    console.log(`      missingUsers: ${summary3.missingUsers}`);
    process.exit(1);
  }
  
  // Test 4.4: No Results Yet
  console.log('  Test 4.4: No Results Yet (All Missing)');
  aggregator.reset(TEST_MEETING_ID);
  
  const summary4 = aggregator.summaryForSpeaker(TEST_MEETING_ID, TEST_SENDER_USER_ID);
  
  if (summary4.ackedUsers.length === 0 && summary4.missingUsers.length === 3) {
    console.log('    ✅ PASS: No results → All missing');
  } else {
    console.log(`    ❌ FAIL: Expected 0 ackedUsers and 3 missingUsers when no results`);
    console.log(`      Got: ${summary4.ackedUsers.length} ackedUsers, ${summary4.missingUsers.length} missingUsers`);
    process.exit(1);
  }
  
  // Test 4.5: Verify AckSummary Structure
  console.log('  Test 4.5: Verify AckSummary Structure (per data_schemas.md DS-05)');
  const summary5 = aggregator.summaryForSpeaker(TEST_MEETING_ID, TEST_SENDER_USER_ID);
  
  // From data_schemas.md DS-05: meetingId, ackedUsers, missingUsers, timestamp
  const hasMeetingId = typeof summary5.meetingId === 'string' && summary5.meetingId === TEST_MEETING_ID;
  const hasAckedUsers = Array.isArray(summary5.ackedUsers);
  const hasMissingUsers = Array.isArray(summary5.missingUsers);
  const hasTimestamp = typeof summary5.timestamp === 'number' && summary5.timestamp > 0;
  
  if (hasMeetingId && hasAckedUsers && hasMissingUsers && hasTimestamp) {
    console.log('    ✅ PASS: AckSummary structure matches specification');
  } else {
    console.log('    ❌ FAIL: AckSummary structure does not match specification');
    console.log(`      meetingId: ${hasMeetingId}, ackedUsers: ${hasAckedUsers}, missingUsers: ${hasMissingUsers}, timestamp: ${hasTimestamp}`);
    process.exit(1);
  }
  
  console.log('  ✅ All summaryForSpeaker() tests passed\n');
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testOnDecodeAck();
    await testSummaryForSpeaker();
    
    console.log('===========================================');
    console.log('✅ All AckAggregator tests PASSED');
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

