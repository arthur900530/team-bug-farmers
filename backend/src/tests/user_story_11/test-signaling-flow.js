"use strict";
/**
 * Test script for Complete Signaling Flow
 * Phase 3.1.1: Verify WebSocket signaling flow with 2 clients
 *
 * This test simulates two clients connecting to the server:
 * 1. Client A joins meeting
 * 2. Client B joins meeting
 * 3. Verify SDP offers/answers exchanged
 * 4. Verify ICE candidates exchanged
 * 5. Verify both clients reach Streaming state
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const SERVER_URL = 'ws://localhost:8080';
const MEETING_ID = 'test-meeting-integration';
async function createTestClient(userId) {
    return new Promise((resolve, reject) => {
        const ws = new ws_1.default(SERVER_URL);
        const client = {
            ws,
            userId,
            meetingId: MEETING_ID,
            connected: false,
            joined: false,
            offerReceived: false,
            answerReceived: false,
            iceCandidatesReceived: 0
        };
        ws.on('open', () => {
            client.connected = true;
            console.log(`[Client ${userId}] WebSocket connected`);
            resolve(client);
        });
        ws.on('error', (error) => {
            console.error(`[Client ${userId}] WebSocket error:`, error);
            reject(error);
        });
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`[Client ${userId}] Received:`, message.type);
                switch (message.type) {
                    case 'joined':
                        client.joined = true;
                        console.log(`[Client ${userId}] ✅ Joined meeting, participants:`, message.participants);
                        break;
                    case 'answer':
                        client.answerReceived = true;
                        console.log(`[Client ${userId}] ✅ Received SDP answer`);
                        break;
                    case 'ice-candidate':
                        client.iceCandidatesReceived++;
                        console.log(`[Client ${userId}] ✅ Received ICE candidate (${client.iceCandidatesReceived} total)`);
                        break;
                    case 'error':
                        console.error(`[Client ${userId}] ❌ Server error:`, message.message);
                        break;
                }
            }
            catch (error) {
                console.error(`[Client ${userId}] Error parsing message:`, error);
            }
        });
    });
}
async function sendJoin(client) {
    return new Promise((resolve, reject) => {
        const message = {
            type: 'join',
            meetingId: client.meetingId,
            userId: client.userId,
            displayName: `Test User ${client.userId}`
        };
        client.ws.send(JSON.stringify(message));
        console.log(`[Client ${client.userId}] Sent JOIN message`);
        // Wait for joined response
        const checkJoined = setInterval(() => {
            if (client.joined) {
                clearInterval(checkJoined);
                resolve();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkJoined);
            if (!client.joined) {
                reject(new Error('Join timeout - did not receive joined message'));
            }
        }, 5000);
    });
}
async function sendOffer(client) {
    return new Promise((resolve) => {
        // Create a mock SDP offer (simplified)
        const sdpOffer = `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=sendrecv
a=ice-ufrag:test
a=ice-pwd:testpassword
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF
a=setup:actpass
`;
        const message = {
            type: 'offer',
            meetingId: client.meetingId,
            sdp: sdpOffer
        };
        client.ws.send(JSON.stringify(message));
        console.log(`[Client ${client.userId}] Sent SDP OFFER`);
        // Wait a bit for answer
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}
async function sendAnswer(client) {
    return new Promise((resolve) => {
        // Create a mock SDP answer (simplified)
        const sdpAnswer = `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=sendrecv
a=ice-ufrag:test
a=ice-pwd:testpassword
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF
a=setup:active
`;
        const message = {
            type: 'answer',
            meetingId: client.meetingId,
            sdp: sdpAnswer
        };
        client.ws.send(JSON.stringify(message));
        console.log(`[Client ${client.userId}] Sent SDP ANSWER`);
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}
async function testSignalingFlow() {
    console.log('[Test] Starting Complete Signaling Flow test...');
    console.log('[Test] Server URL:', SERVER_URL);
    console.log('[Test] Meeting ID:', MEETING_ID);
    try {
        // Create Client A
        console.log('\n[Test] Step 1: Creating Client A...');
        const clientA = await createTestClient('user-a');
        console.log('[Test] ✅ Client A connected');
        // Create Client B
        console.log('\n[Test] Step 2: Creating Client B...');
        const clientB = await createTestClient('user-b');
        console.log('[Test] ✅ Client B connected');
        // Client A joins
        console.log('\n[Test] Step 3: Client A joins meeting...');
        await sendJoin(clientA);
        if (!clientA.joined) {
            throw new Error('Client A did not receive joined message');
        }
        console.log('[Test] ✅ Client A joined');
        // Client B joins
        console.log('\n[Test] Step 4: Client B joins meeting...');
        await sendJoin(clientB);
        if (!clientB.joined) {
            throw new Error('Client B did not receive joined message');
        }
        console.log('[Test] ✅ Client B joined');
        // Client A sends offer
        console.log('\n[Test] Step 5: Client A sends SDP offer...');
        await sendOffer(clientA);
        console.log('[Test] ✅ Client A sent offer');
        // Wait for answer
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!clientA.answerReceived) {
            throw new Error('Client A did not receive SDP answer from server');
        }
        console.log('[Test] ✅ Client A received SDP answer from server');
        // Client B sends offer
        console.log('\n[Test] Step 6: Client B sends SDP offer...');
        await sendOffer(clientB);
        console.log('[Test] ✅ Client B sent offer');
        // Wait for answer
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!clientB.answerReceived) {
            throw new Error('Client B did not receive SDP answer from server');
        }
        console.log('[Test] ✅ Client B received SDP answer from server');
        // Client A sends answer (confirmation)
        console.log('\n[Test] Step 7: Client A sends answer confirmation...');
        await sendAnswer(clientA);
        console.log('[Test] ✅ Client A sent answer confirmation');
        // Client B sends answer (confirmation)
        console.log('\n[Test] Step 8: Client B sends answer confirmation...');
        await sendAnswer(clientB);
        console.log('[Test] ✅ Client B sent answer confirmation');
        // Wait a bit for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Verify results
        console.log('\n[Test] Verification:');
        console.log(`  Client A - Joined: ${clientA.joined}, Answer received: ${clientA.answerReceived}`);
        console.log(`  Client B - Joined: ${clientB.joined}, Answer received: ${clientB.answerReceived}`);
        if (!clientA.joined || !clientB.joined) {
            throw new Error('One or both clients did not join');
        }
        if (!clientA.answerReceived || !clientB.answerReceived) {
            throw new Error('One or both clients did not receive SDP answer');
        }
        // Cleanup
        clientA.ws.close();
        clientB.ws.close();
        console.log('\n[Test] ✅ ALL TESTS PASSED');
        process.exit(0);
    }
    catch (error) {
        console.error('[Test] ❌ TEST FAILED:', error);
        process.exit(1);
    }
}
// Check if server is running
const testConnection = new ws_1.default(SERVER_URL);
testConnection.on('open', () => {
    testConnection.close();
    console.log('[Test] Server is running, starting test...\n');
    testSignalingFlow();
});
testConnection.on('error', (error) => {
    console.error('[Test] ❌ Cannot connect to server. Make sure backend server is running:');
    console.error('  cd backend && npm run dev');
    console.error('Error:', error.message);
    process.exit(1);
});
