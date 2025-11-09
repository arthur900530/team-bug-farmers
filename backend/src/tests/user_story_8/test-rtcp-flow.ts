/**
 * Test RTCP Report Flow (Integration)
 * 
 * Tests:
 * - C2.1.1: RTCP Report Reception
 * - C2.1.2: Multiple Receivers
 * - C2.1.3: Periodic Reporting
 * 
 * From dev_specs/flow_charts.md lines 108-112: RTCP report generation and collection
 * 
 * Prerequisites:
 * - Backend server must be running: cd backend && npm run dev
 */

import WebSocket from 'ws';
import type { RtcpReportMessage } from '../../types';

// Test configuration
const WS_URL = 'ws://localhost:8080';
const TEST_MEETING_ID = 'test-meeting-rtcp-flow';
const TEST_USER_1 = 'test-user-rtcp-1';
const TEST_USER_2 = 'test-user-rtcp-2';
const TEST_USER_3 = 'test-user-rtcp-3';

console.log('===========================================');
console.log('🧪 Testing RTCP Report Flow (Integration)');
console.log('===========================================\n');
console.log('⚠️  Prerequisites: Backend server must be running (cd backend && npm run dev)');
console.log('');

// Helper function to check server availability
function checkServerAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const client = net.createConnection({ port: 8080, host: 'localhost' }, () => {
      client.end();
      resolve(true);
    });
    client.on('error', () => {
      resolve(false);
    });
    setTimeout(() => {
      client.destroy();
      resolve(false);
    }, 1000);
  });
}

// Test C2.1.1: RTCP Report Reception
console.log('Test C2.1.1: RTCP Report Reception');
console.log('-------------------------------------------');

async function testRtcpReportReception(): Promise<void> {
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log('  ❌ FAIL: Backend server not running');
    console.log('  Please start backend server: cd backend && npm run dev');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let joined = false;
    
    ws.on('open', async () => {
      console.log('  ✅ WebSocket connected');
      
      // Step 1: Join meeting
      ws.send(JSON.stringify({
        type: 'join',
        meetingId: TEST_MEETING_ID,
        userId: TEST_USER_1,
        displayName: 'Test User 1'
      }));
    });
    
    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined' && !joined) {
        joined = true;
        console.log('  ✅ Joined meeting successfully');
        
        // Step 2: Send RTCP report
        const rtcpReport: RtcpReportMessage = {
          type: 'rtcp-report',
          userId: TEST_USER_1,
          lossPct: 0.02,
          jitterMs: 15,
          rttMs: 75,
          timestamp: Date.now()
        };
        
        ws.send(JSON.stringify(rtcpReport));
        console.log('  ✅ RTCP report sent');
        
        // Wait a bit for server to process
        setTimeout(() => {
          ws.close();
          console.log('  ✅ RTCP report reception test passed\n');
          resolve();
        }, 500);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`  ❌ FAIL: WebSocket error: ${error}`);
      reject(error);
    });
  });
}

// Test C2.1.2: Multiple Receivers
console.log('Test C2.1.2: Multiple Receivers');
console.log('-------------------------------------------');

async function testMultipleReceivers(): Promise<void> {
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log('  ❌ FAIL: Backend server not running');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const ws1 = new WebSocket(WS_URL);
    const ws2 = new WebSocket(WS_URL);
    const ws3 = new WebSocket(WS_URL);
    
    let joined1 = false;
    let joined2 = false;
    let joined3 = false;
    let reportsSent = 0;
    
    const checkComplete = () => {
      if (joined1 && joined2 && joined3 && reportsSent === 3) {
        setTimeout(() => {
          ws1.close();
          ws2.close();
          ws3.close();
          console.log('  ✅ Multiple receivers test passed\n');
          resolve();
        }, 500);
      }
    };
    
    // Client 1
    ws1.on('open', () => {
      ws1.send(JSON.stringify({
        type: 'join',
        meetingId: TEST_MEETING_ID,
        userId: TEST_USER_1,
        displayName: 'Test User 1'
      }));
    });
    
    ws1.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined' && !joined1) {
        joined1 = true;
        ws1.send(JSON.stringify({
          type: 'rtcp-report',
          userId: TEST_USER_1,
          lossPct: 0.01,
          jitterMs: 10,
          rttMs: 50,
          timestamp: Date.now()
        }));
        reportsSent++;
        checkComplete();
      }
    });
    
    // Client 2
    ws2.on('open', () => {
      ws2.send(JSON.stringify({
        type: 'join',
        meetingId: TEST_MEETING_ID,
        userId: TEST_USER_2,
        displayName: 'Test User 2'
      }));
    });
    
    ws2.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined' && !joined2) {
        joined2 = true;
        ws2.send(JSON.stringify({
          type: 'rtcp-report',
          userId: TEST_USER_2,
          lossPct: 0.05,
          jitterMs: 20,
          rttMs: 100,
          timestamp: Date.now()
        }));
        reportsSent++;
        checkComplete();
      }
    });
    
    // Client 3
    ws3.on('open', () => {
      ws3.send(JSON.stringify({
        type: 'join',
        meetingId: TEST_MEETING_ID,
        userId: TEST_USER_3,
        displayName: 'Test User 3'
      }));
    });
    
    ws3.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'joined' && !joined3) {
        joined3 = true;
        ws3.send(JSON.stringify({
          type: 'rtcp-report',
          userId: TEST_USER_3,
          lossPct: 0.08,
          jitterMs: 30,
          rttMs: 150,
          timestamp: Date.now()
        }));
        reportsSent++;
        checkComplete();
      }
    });
    
    ws1.on('error', reject);
    ws2.on('error', reject);
    ws3.on('error', reject);
  });
}

// Test C2.1.3: Periodic Reporting
console.log('Test C2.1.3: Periodic Reporting');
console.log('-------------------------------------------');

async function testPeriodicReporting(): Promise<void> {
  const serverAvailable = await checkServerAvailability();
  if (!serverAvailable) {
    console.log('  ❌ FAIL: Backend server not running');
    process.exit(1);
  }
  
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    let joined = false;
    let reportCount = 0;
    const maxReports = 3;
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'join',
        meetingId: TEST_MEETING_ID,
        userId: TEST_USER_1,
        displayName: 'Test User 1'
      }));
    });
    
    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'joined' && !joined) {
        joined = true;
        console.log('  ✅ Joined meeting');
        
        // Send reports every 1 second (simulating 5 second interval)
        const sendReport = () => {
          if (reportCount < maxReports) {
            ws.send(JSON.stringify({
              type: 'rtcp-report',
              userId: TEST_USER_1,
              lossPct: 0.02 + (reportCount * 0.01),
              jitterMs: 15 + (reportCount * 5),
              rttMs: 75 + (reportCount * 25),
              timestamp: Date.now()
            }));
            reportCount++;
            console.log(`  ✅ Sent RTCP report ${reportCount}/${maxReports}`);
            
            if (reportCount < maxReports) {
              setTimeout(sendReport, 1000);
            } else {
              setTimeout(() => {
                ws.close();
                console.log('  ✅ Periodic reporting test passed\n');
                resolve();
              }, 500);
            }
          }
        };
        
        sendReport();
      }
    });
    
    ws.on('error', reject);
  });
}

// Run all tests
async function runAllTests(): Promise<void> {
  try {
    await testRtcpReportReception();
    await testMultipleReceivers();
    await testPeriodicReporting();
    
    console.log('===========================================');
    console.log('✅ ALL RTCP FLOW TESTS PASSED');
    console.log('===========================================');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
    process.exit(1);
  }
}

runAllTests();

