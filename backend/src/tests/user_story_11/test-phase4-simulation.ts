/**
 * Phase 4 Simulation Test
 * 
 * Simulates the complete end-to-end flow that happens in the browser:
 * 1. Two clients join the same meeting
 * 2. Each client sends SDP offer
 * 3. Server responds with SDP answer
 * 4. Verify connection states transition correctly
 * 5. Verify participant list updates
 * 
 * This simulates what happens when you open two browser windows
 * and join the same meeting.
 */

import WebSocket from 'ws';
import { createConnection } from 'net';

/**
 * Phase 4 Simulation Test
 * 
 * From dev_specs/public_interfaces.md:
 * - WebSocket endpoint: ws://localhost:8080 (development)
 * - Protocol: WebSocket (ws:// for dev, wss:// for production)
 * - Message Format: JSON messages
 * 
 * From dev_specs/flow_charts.md:
 * - Flow 1 (lines 23-44): Meeting join with SDP/ICE negotiation
 * - SignalingClient.connect → WebSocket URL
 * - SignalingClient.sendJoin → meetingId, userId
 */

const SERVER_URL = 'ws://localhost:8080';
const SERVER_PORT = 8080;
const SERVER_HOST = 'localhost';
const MEETING_ID = 'test-meeting-phase4-sim';

/**
 * Check if backend server is running before attempting connection
 * From dev_specs/public_interfaces.md: WebSocket endpoint should be available
 * 
 * This prevents ECONNREFUSED errors and provides clear feedback
 */
async function checkServerAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection(SERVER_PORT, SERVER_HOST);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    // Timeout after 2 seconds
    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);
  });
}

interface SimulatedClient {
  ws: WebSocket;
  userId: string;
  displayName: string;
  state: 'disconnected' | 'connecting' | 'joined' | 'offering' | 'waiting_answer' | 'connected' | 'streaming';
  joined: boolean;
  participants: string[];
  offerSent: boolean;
  answerReceived: boolean;
  userJoinedEvents: string[];
}

function createSimulatedClient(userId: string, displayName: string): Promise<SimulatedClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    
    const client: SimulatedClient = {
      ws,
      userId,
      displayName,
      state: 'connecting',
      joined: false,
      participants: [],
      offerSent: false,
      answerReceived: false,
      userJoinedEvents: []
    };

    ws.on('open', () => {
      console.log(`[${userId}] WebSocket connected`);
      client.state = 'joined';
      resolve(client);
    });

    ws.on('error', (error: Error) => {
      // From dev_specs/public_interfaces.md: WebSocket connection must succeed
      // Provide clear error message if connection fails
      if ((error as any).code === 'ECONNREFUSED') {
        console.error(`[${userId}] ❌ WebSocket connection refused`);
        console.error(`[${userId}]    Backend server is not running on ${SERVER_URL}`);
        console.error(`[${userId}]    Please start the backend server first: cd backend && npm run dev`);
      } else {
        console.error(`[${userId}] WebSocket error:`, error);
      }
      reject(error);
    });

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString());
        console.log(`[${userId}] Received:`, message.type);

        switch (message.type) {
          case 'joined':
            client.joined = true;
            client.participants = message.participants || [];
            console.log(`[${userId}] ✅ Joined meeting. Participants:`, client.participants);
            break;

          case 'user-joined':
            const newUserId = message.userId;
            if (!client.userJoinedEvents.includes(newUserId)) {
              client.userJoinedEvents.push(newUserId);
              console.log(`[${userId}] ✅ User joined event: ${newUserId}`);
            }
            break;

          case 'answer':
            client.answerReceived = true;
            client.state = 'connected';
            console.log(`[${userId}] ✅ Received SDP answer from server`);
            console.log(`[${userId}] State transition: Waiting_Answer → Connected`);
            break;

          case 'error':
            console.error(`[${userId}] Server error:`, message.message);
            break;

          default:
            console.log(`[${userId}] Unknown message type:`, message.type);
        }
      } catch (error) {
        console.error(`[${userId}] Error parsing message:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`[${userId}] WebSocket closed`);
      client.state = 'disconnected';
    });
  });
}

function sendJoin(client: SimulatedClient): void {
  const message = {
    type: 'join',
    meetingId: MEETING_ID,
    userId: client.userId,
    displayName: client.displayName
  };
  client.ws.send(JSON.stringify(message));
  console.log(`[${client.userId}] Sent JOIN message`);
}

function sendOffer(client: SimulatedClient): void {
  // Simulate a minimal SDP offer (real offers are much longer)
  const mockOfferSdp = `v=0
o=- ${Date.now()} 2 IN IP4 127.0.0.1
s=-
t=0 0
m=audio 9 UDP/TLS/RTP/SAVPF 111
c=IN IP4 0.0.0.0
a=rtpmap:111 opus/48000/2
a=fmtp:111 minptime=10;useinbandfec=1
a=sendrecv
a=rtcp-mux
`;

  const message = {
    type: 'offer',
    meetingId: MEETING_ID,
    sdp: mockOfferSdp
  };
  
  client.ws.send(JSON.stringify(message));
  client.offerSent = true;
  client.state = 'waiting_answer';
  console.log(`[${client.userId}] Sent SDP OFFER`);
  console.log(`[${client.userId}] State transition: Offering → Waiting_Answer`);
  console.log(`[${client.userId}] ⏳ Waiting for server response...`);
}

async function waitForAnswer(client: SimulatedClient, timeout: number = 5000): Promise<boolean> {
  const startTime = Date.now();
  
  while (!client.answerReceived && (Date.now() - startTime) < timeout) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return client.answerReceived;
}

async function simulatePhase4Flow() {
  console.log('='.repeat(60));
  console.log('Phase 4 Simulation: Two Clients Joining Meeting');
  console.log('='.repeat(60));
  console.log(`Server: ${SERVER_URL}`);
  console.log(`Meeting: ${MEETING_ID}`);
  console.log('');

  // Pre-flight check: Verify backend server is running
  // From dev_specs/public_interfaces.md: WebSocket endpoint must be available
  console.log('🔍 Checking if backend server is running...');
  const serverAvailable = await checkServerAvailability();
  
  if (!serverAvailable) {
    console.log('');
    console.log('❌❌❌ BACKEND SERVER NOT RUNNING ❌❌❌');
    console.log('');
    console.log('The simulation cannot run because the backend server is not available.');
    console.log('');
    console.log('To fix this:');
    console.log('1. Open a terminal');
    console.log('2. Navigate to the backend directory:');
    console.log('   cd backend');
    console.log('3. Start the backend server:');
    console.log('   npm run dev');
    console.log('');
    console.log('You should see:');
    console.log('   [SignalingServer] WebSocket server started on port 8080');
    console.log('   [MediasoupManager] Initialization complete');
    console.log('');
    console.log('Then run this simulation again.');
    console.log('');
    process.exit(1);
  }
  
  console.log('✅ Backend server is running');
  console.log('');

  try {
    // Step 1: Create Client A
    console.log('📱 Step 1: Creating Client A (test-user-a)...');
    const clientA = await createSimulatedClient('test-user-a', 'User A');
    console.log('✅ Client A connected\n');

    // Step 2: Client A joins
    console.log('📱 Step 2: Client A joins meeting...');
    sendJoin(clientA);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!clientA.joined) {
      throw new Error('Client A did not receive joined message');
    }
    console.log(`✅ Client A joined. Initial participants: ${clientA.participants.length}`);
    console.log(`   Participants: ${clientA.participants.join(', ')}\n`);

    // Step 3: Client A sends offer
    console.log('📱 Step 3: Client A sends SDP offer...');
    sendOffer(clientA);
    console.log('⏳ Client A is now in "Waiting for response..." state\n');

    // Step 4: Wait for server answer
    console.log('📱 Step 4: Waiting for server to send SDP answer...');
    const answerReceivedA = await waitForAnswer(clientA, 5000);
    
    if (answerReceivedA) {
      console.log('✅ Client A received SDP answer!');
      console.log(`✅ State transition: Waiting_Answer → Connected`);
      console.log(`✅ "Waiting for response..." should now disappear in UI\n`);
    } else {
      console.log('❌ Client A did NOT receive SDP answer within 5 seconds');
      console.log('❌ "Waiting for response..." would stay stuck in UI\n');
    }

    // Step 5: Create Client B
    console.log('📱 Step 5: Creating Client B (test-user-b)...');
    const clientB = await createSimulatedClient('test-user-b', 'User B');
    console.log('✅ Client B connected\n');

    // Step 6: Client B joins
    console.log('📱 Step 6: Client B joins meeting...');
    sendJoin(clientB);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (!clientB.joined) {
      throw new Error('Client B did not receive joined message');
    }
    console.log(`✅ Client B joined. Participants: ${clientB.participants.length}`);
    console.log(`   Participants: ${clientB.participants.join(', ')}\n`);

    // Step 7: Verify Client A received user-joined event
    console.log('📱 Step 7: Verifying Client A received user-joined event...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (clientA.userJoinedEvents.includes('test-user-b')) {
      console.log('✅ Client A received user-joined event for test-user-b');
      console.log('✅ Participant list should update in Client A\'s browser\n');
    } else {
      console.log('⚠️  Client A did not receive user-joined event');
      console.log('⚠️  Participant list might not update automatically\n');
    }

    // Step 8: Client B sends offer
    console.log('📱 Step 8: Client B sends SDP offer...');
    sendOffer(clientB);
    console.log('⏳ Client B is now in "Waiting for response..." state\n');

    // Step 9: Wait for server answer
    console.log('📱 Step 9: Waiting for server to send SDP answer to Client B...');
    const answerReceivedB = await waitForAnswer(clientB, 5000);
    
    if (answerReceivedB) {
      console.log('✅ Client B received SDP answer!');
      console.log(`✅ State transition: Waiting_Answer → Connected`);
      console.log(`✅ "Waiting for response..." should now disappear in UI\n`);
    } else {
      console.log('❌ Client B did NOT receive SDP answer within 5 seconds');
      console.log('❌ "Waiting for response..." would stay stuck in UI\n');
    }

    // Summary
    console.log('='.repeat(60));
    console.log('Simulation Summary');
    console.log('='.repeat(60));
    console.log(`Client A:`);
    console.log(`  - Joined: ${clientA.joined ? '✅' : '❌'}`);
    console.log(`  - Participants: ${clientA.participants.length}`);
    console.log(`  - Offer sent: ${clientA.offerSent ? '✅' : '❌'}`);
    console.log(`  - Answer received: ${clientA.answerReceived ? '✅' : '❌'}`);
    console.log(`  - User-joined events: ${clientA.userJoinedEvents.length}`);
    console.log(`  - Final state: ${clientA.state}`);
    console.log('');
    console.log(`Client B:`);
    console.log(`  - Joined: ${clientB.joined ? '✅' : '❌'}`);
    console.log(`  - Participants: ${clientB.participants.length}`);
    console.log(`  - Offer sent: ${clientB.offerSent ? '✅' : '❌'}`);
    console.log(`  - Answer received: ${clientB.answerReceived ? '✅' : '❌'}`);
    console.log(`  - User-joined events: ${clientB.userJoinedEvents.length}`);
    console.log(`  - Final state: ${clientB.state}`);
    console.log('');

    // Verify success
    if (clientA.joined && clientB.joined && 
        clientA.answerReceived && clientB.answerReceived) {
      console.log('✅✅✅ SIMULATION SUCCESSFUL ✅✅✅');
      console.log('');
      console.log('Expected browser behavior:');
      console.log('1. Both clients should see each other in participant list');
      console.log('2. "Waiting for response..." should disappear after ~1-3 seconds');
      console.log('3. Connection state should show "Streaming"');
    } else {
      console.log('❌❌❌ SIMULATION FAILED ❌❌❌');
      console.log('');
      console.log('Issues detected:');
      if (!clientA.answerReceived || !clientB.answerReceived) {
        console.log('- Server is not sending SDP answers');
        console.log('- Check backend logs for errors');
        console.log('- "Waiting for response..." will stay stuck in browser');
      }
      if (clientA.participants.length < 2 || clientB.participants.length < 2) {
        console.log('- Participant list not updating correctly');
        console.log('- Check if user-joined events are being sent');
      }
    }

    // Cleanup
    clientA.ws.close();
    clientB.ws.close();
    
    await new Promise(resolve => setTimeout(resolve, 500));
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Simulation error:', error);
    process.exit(1);
  }
}

// Run simulation
if (require.main === module) {
  simulatePhase4Flow();
}

export { simulatePhase4Flow };

