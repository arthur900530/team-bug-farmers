# Backend Test Specifications

This document contains test specifications for the two core backend files implementing User Story 11 (Establishing Initial Audio Connection).

---

## Test Specification 1: backend/src/SignalingServer.ts

### Purpose
SignalingServer handles WebSocket signaling, SDP/ICE negotiation, and server-mediated connection setup for audio routing through the server.

### List of Functions
1. `constructor(port, meetingRegistry, mediasoupManager)`
2. `handleConnection(ws, req)`
3. `handleMessage(ws, data)`
4. `handleJoin(ws, message)`
5. `handleOffer(ws, message)`
6. `handleAnswer(ws, message)`
7. `handleIceCandidate(ws, message)`
8. `handleLeave(ws, message)`
9. `handleDisconnection(ws)`
10. `authenticate(userId, token)`
11. `relayOffer(fromUserId, sdp, meetingId)`
12. `relayAnswer(fromUserId, sdp, meetingId)`
13. `relayIce(fromUserId, iceData, meetingId)`
14. `notify(userId, event)`
15. `notifyOthers(meetingId, excludeUserId, event)`
16. `sendError(ws, code, message)`
17. `sendMessage(ws, message)`
18. `findClientWebSocket(userId)`
19. `createMediasoupAnswerSdp(transports, clientOfferSdp)`
20. `extractDtlsParameters(sdp)`
21. `createConsumersForUser(receiverUserId, meetingId)`
22. `close()`

### Test Cases

| # | Function | Purpose of Test | Test Inputs | Expected Output |
|---|----------|----------------|-------------|-----------------|
| 1 | `constructor` | Creates WebSocket server and stores dependencies | `port=8080`, `mockMeetingRegistry`, `mockMediasoupManager` | Instance created; `wss` listening on port 8080; internal `clients` Map initialized empty; `meetingRegistry` and `mediasoupManager` stored |
| 2 | `handleConnection` | Registers connection handlers and stores client | `mockWebSocket`, `mockRequest` with headers | Client entry added to `clients` Map with `authenticated=false`, `userId=null`, `meetingId=null`; message/close/error event handlers attached to WebSocket |
| 3 | `handleMessage` | Routes 'join' message to correct handler | `ws`, `data=Buffer.from('{"type":"join","meetingId":"m1","userId":"u1","displayName":"User"}')` | `handleJoin` called with parsed JoinMessage |
| 4 | `handleMessage` | Routes 'offer' message to correct handler | `ws`, `data=Buffer.from('{"type":"offer","meetingId":"m1","sdp":"v=0..."}')` | `handleOffer` called with parsed OfferMessage |
| 5 | `handleMessage` | Returns error for unknown message type | `ws`, `data=Buffer.from('{"type":"unknown"}')` | `sendError` called with code 400 and message "Unknown message type" |
| 6 | `handleMessage` | Returns error for malformed JSON | `ws`, `data=Buffer.from('invalid json')` | `sendError` called with code 400 and message "Malformed message" |
| 7 | `handleJoin` | Authenticates user and sends joined message | `ws`, `{type:'join', meetingId:'m1', userId:'user@test.com', displayName:'Test User'}` | `authenticate` called; `MeetingRegistry.registerUser` called with UserSession; `joined` message sent with `success=true`, participants array, and `routerRtpCapabilities` |
| 8 | `handleJoin` | Rejects unauthenticated user | `ws`, `{type:'join', userId:'', meetingId:'m1', displayName:''}` (authenticate returns false) | `sendError` called with code 401 and "Invalid/expired JWT"; WebSocket closed |
| 9 | `handleOffer` | Creates transports and returns answer | `ws` (authenticated as 'u1'), `{type:'offer', meetingId:'m1', sdp:'v=0\r\no=- 123 0 IN IP4 127.0.0.1\r\na=fingerprint:SHA-256 AA:BB:CC'}` | `MediasoupManager.createTransports` called with 'u1'; `answer` message sent containing SDP with `a=send-transport-id`, `a=recv-transport-id`, ICE parameters, DTLS fingerprints |
| 10 | `handleOffer` | Returns error for unauthenticated client | `ws` (not authenticated), `{type:'offer', meetingId:'m1', sdp:'v=0...'}` | `sendError` called with code 401 and "Not authenticated" |
| 11 | `handleAnswer` | Connects transports with DTLS params | `ws` (authenticated as 'u1' in 'm1'), `{type:'answer', meetingId:'m1', sdp:'a=fingerprint:SHA-256 11:22:33'}` | `extractDtlsParameters` called; `MediasoupManager.connectTransport` called twice (for 'send' and 'recv'); `createConsumersForUser` called; UserSession.connectionState updated to 'Streaming' |
| 12 | `handleAnswer` | Handles missing DTLS gracefully | `ws` (authenticated), `{type:'answer', meetingId:'m1', sdp:'v=0 (no fingerprint)'}` | `extractDtlsParameters` returns null; function continues without throwing error |
| 13 | `handleIceCandidate` | Relays ICE candidate to other participants | `ws` (authenticated as 'u1'), `{type:'ice-candidate', meetingId:'m1', candidate:'candidate:...', sdpMid:'0', sdpMLineIndex:0}` | `relayIce` called with normalized iceData `{candidate, sdpMid, sdpMLineIndex}` |
| 14 | `handleIceCandidate` | Rejects for unauthenticated client | `ws` (not authenticated), `{type:'ice-candidate', ...}` | `sendError` called with code 401 |
| 15 | `handleLeave` | Removes user and notifies others | `ws`, `{type:'leave', meetingId:'m1', userId:'u1'}` | `MediasoupManager.cleanupUser('u1')` called; `MeetingRegistry.removeUser('m1', 'u1')` called; other participants receive `{type:'user-left', userId:'u1'}` |
| 16 | `handleDisconnection` | Cleans up on WebSocket close | `ws` associated with userId='u1', meetingId='m1' | `MediasoupManager.cleanupUser('u1')` called; `MeetingRegistry.removeUser('m1', 'u1')` called; other participants notified with `user-left` event |
| 17 | `handleDisconnection` | Handles disconnection with no user info | `ws` with no associated userId/meetingId | No errors thrown; client removed from `clients` Map |
| 18 | `authenticate` | Accepts valid non-empty userId | `userId='user@test.com'`, `token=''` | Returns `true` |
| 19 | `authenticate` | Rejects empty userId | `userId=''`, `token=''` | Returns `false` |
| 20 | `relayOffer` | Relays offer to all participants except sender | `fromUserId='u1'`, `sdp='v=0...'`, `meetingId='m1'` with 2 other participants ('u2', 'u3') | `offer` message sent to 'u2' and 'u3' WebSockets; not sent to 'u1' |
| 21 | `relayAnswer` | Relays answer to all except sender | `fromUserId='u1'`, `sdp='v=0...'`, `meetingId='m1'` with participants 'u2', 'u3' | `answer` message sent to 'u2' and 'u3'; not sent to 'u1' |
| 22 | `relayIce` | Relays ICE candidate to others | `fromUserId='u1'`, `iceData={candidate:'...', sdpMid:'0', sdpMLineIndex:0}`, `meetingId='m1'` | `ice-candidate` message sent to all participants except 'u1' |
| 23 | `notify` | Sends event to specific user | `userId='u1'` (connected), `event={type:'user-joined', userId:'u2'}` | WebSocket for 'u1' receives serialized event |
| 24 | `notify` | Handles notify to non-existent user | `userId='nonexistent'`, `event={...}` | No error thrown; no message sent |
| 25 | `notifyOthers` | Broadcasts event to all except one user | `meetingId='m1'` with participants ['u1', 'u2', 'u3'], `excludeUserId='u1'`, `event={type:'tier-change'}` | Event sent to 'u2' and 'u3'; not sent to 'u1' |
| 26 | `sendError` | Sends error message to open WebSocket | `ws` (readyState=OPEN), `code=401`, `message='Unauthorized'` | `ws.send` called with `'{"type":"error","code":401,"message":"Unauthorized"}'` |
| 27 | `sendError` | Handles closed WebSocket gracefully | `ws` (readyState=CLOSED), `code=500`, `message='Error'` | No error thrown; no send attempted |
| 28 | `sendMessage` | Sends serialized JSON message | `ws` (readyState=OPEN), `message={type:'joined', success:true}` | `ws.send` called with JSON.stringify(message) |
| 29 | `sendMessage` | Skips send for closed WebSocket | `ws` (readyState=CLOSED), `message={...}` | `ws.send` not called |
| 30 | `findClientWebSocket` | Finds WebSocket for connected user | `userId='u1'` where 'u1' is connected with OPEN WebSocket | Returns the WebSocket instance for 'u1' |
| 31 | `findClientWebSocket` | Returns null for non-existent user | `userId='nonexistent'` | Returns `null` |
| 32 | `findClientWebSocket` | Returns null for closed connection | `userId='u1'` with readyState=CLOSED | Returns `null` |
| 33 | `createMediasoupAnswerSdp` | Generates SDP with transport parameters | `transports={sendTransport:{id:'st1', iceParameters:{usernameFragment:'ufrag1', password:'pwd1'}, iceCandidates:[{foundation:'1', priority:123, ip:'127.0.0.1', port:40000, type:'host'}], dtlsParameters:{fingerprints:[{algorithm:'SHA-256', value:'AA:BB'}]}}, recvTransport:{id:'rt1', ...}}`, `clientOfferSdp='v=0...'` | Returns SDP string containing: `v=0`, `a=send-transport-id:st1`, `a=send-ice-ufrag:ufrag1`, `a=send-ice-pwd:pwd1`, `a=send-candidate:...`, `a=recv-transport-id:rt1`, `a=send-dtls-fingerprint:SHA-256 AA:BB`, `m=audio 9 UDP/TLS/RTP/SAVPF 111`, `a=rtpmap:111 opus/48000/2` |
| 34 | `extractDtlsParameters` | Extracts DTLS fingerprint from SDP | `sdp='v=0\r\na=fingerprint:SHA-256 11:22:33:44:55'` | Returns `{role:'auto', fingerprints:[{algorithm:'SHA-256', value:'11:22:33:44:55'}]}` |
| 35 | `extractDtlsParameters` | Returns null for SDP without fingerprint | `sdp='v=0\r\no=- 123 0 IN IP4 127.0.0.1'` (no fingerprint line) | Returns `null` |
| 36 | `createConsumersForUser` | Logs intent when other participants present | `receiverUserId='u1'`, `meetingId='m1'` with 2 other participants | Logs "Would create consumers for u1 to receive from 2 participants"; returns without error |
| 37 | `createConsumersForUser` | Handles no other participants | `receiverUserId='u1'`, `meetingId='m1'` with only 'u1' | Logs "No other participants for user u1"; returns immediately |
| 38 | `close` | Closes WebSocket server | Server instance | `wss.close()` called; logs "Server closed" |

---

## Test Specification 2: backend/src/MediasoupManager.ts

### Purpose
MediasoupManager manages the mediasoup Worker and Router for SFU-based audio routing through the server, including transport creation, producer/consumer management, and cleanup.

### List of Functions
1. `initialize()`
2. `createTransports(userId)`
3. `connectTransport(userId, transportType, dtlsParameters)`
4. `createProducer(userId, transportId, rtpParameters)`
5. `createConsumer(receiverUserId, senderUserId, rtpCapabilities)`
6. `getProducer(userId)`
7. `getAllProducers()`
8. `getRouterRtpCapabilities()`
9. `cleanupUser(userId)`
10. `shutdown()`

### Test Cases

| # | Function | Purpose of Test | Test Inputs | Expected Output |
|---|----------|----------------|-------------|-----------------|
| 1 | `initialize` | Creates mediasoup Worker successfully | No inputs (called on fresh instance) | `worker` is non-null Worker instance; `worker.pid` is valid process ID; logs "Worker created (PID: {pid})" |
| 2 | `initialize` | Creates Router with Opus codec at 48kHz | After Worker created | `router` is non-null Router instance; `router.id` is valid UUID; logs "Router created (ID: {id})" |
| 3 | `initialize` | Configures Opus with correct parameters | After initialization | `router.rtpCapabilities.codecs` includes entry with: `kind:'audio'`, `mimeType:'audio/opus'`, `clockRate:48000`, `channels:2`, `preferredPayloadType:111`, `parameters.useinbandfec:1`, `parameters.usedtx:1` |
| 4 | `initialize` | Handles Worker death event | Worker instance crashes/dies | Logs "Worker died, exiting process"; `process.exit(1)` called after 2 second timeout |
| 5 | `createTransports` | Creates send and recv transports for user | `userId='user1'` after initialize() | Returns object with `sendTransport` and `recvTransport` properties; each contains `id` (string), `iceParameters` (object with usernameFragment, password), `iceCandidates` (array), `dtlsParameters` (object with fingerprints array) |
| 6 | `createTransports` | Stores transports in internal map | `userId='user1'` | `transports.get('user1')` returns `{send: WebRtcTransport, recv: WebRtcTransport}`; both transports are non-null |
| 7 | `createTransports` | Logs transport creation | `userId='user1'` | Logs "Creating transports for user user1" and "Transports created for user user1" with transport IDs |
| 8 | `createTransports` | Throws error when router not initialized | `userId='user1'` before initialize() called | Throws Error with message "Router not initialized" |
| 9 | `connectTransport` | Connects send transport with DTLS | `userId='user1'` (with transports), `transportType='send'`, `dtlsParameters={fingerprints:[{algorithm:'SHA-256', value:'AA:BB:CC'}]}` | `transport.connect` called on send transport with provided dtlsParameters; logs "send transport connected for user user1" |
| 10 | `connectTransport` | Connects recv transport with DTLS | `userId='user1'`, `transportType='recv'`, `dtlsParameters={...}` | `transport.connect` called on recv transport; logs "recv transport connected for user user1" |
| 11 | `connectTransport` | Throws error for non-existent transports | `userId='nonexistent'`, `transportType='send'`, `dtlsParameters={...}` | Throws Error with message "No transports found for user nonexistent" |
| 12 | `createProducer` | Creates Producer for audio with correct params | `userId='user1'` (with send transport), `transportId=sendTransport.id`, `rtpParameters={kind:'audio', rtpParameters:{codecs:[...]}}` | Returns `{id: string}` where id is Producer ID; `producers.get('user1')` is the created Producer instance; logs "Creating producer for user user1" and "Producer created for user user1 (ID: {id})" |
| 13 | `createProducer` | Throws error for mismatched transport ID | `userId='user1'`, `transportId='wrong-id'`, `rtpParameters={...}` | Throws Error with message "Send transport not found for user user1" |
| 14 | `createProducer` | Throws error for non-existent user | `userId='nonexistent'`, `transportId='any'`, `rtpParameters={...}` | Throws Error indicating transport not found |
| 15 | `createConsumer` | Creates Consumer to receive from Producer | `receiverUserId='user2'` (with recv transport), `senderUserId='user1'` (with Producer), `rtpCapabilities` (compatible with router) | Returns object with `{id: string, producerId: string, kind: 'audio', rtpParameters: object}`; `consumers.get(id)` is the Consumer instance; logs "Creating consumer: user1 → user2" and "Consumer created (ID: {id})" |
| 16 | `createConsumer` | Returns null when router cannot consume | `receiverUserId='user2'`, `senderUserId='user1'`, `rtpCapabilities` (incompatible) | Returns `null`; logs "Cannot consume producer {id}" |
| 17 | `createConsumer` | Returns null when sender has no Producer | `receiverUserId='user2'`, `senderUserId='nonexistent'`, `rtpCapabilities={...}` | Returns `null`; logs "No producer found for sender nonexistent" |
| 18 | `createConsumer` | Throws error when receiver has no transport | `receiverUserId='nonexistent'`, `senderUserId='user1'`, `rtpCapabilities={...}` | Throws Error with message "Recv transport not found for user nonexistent" |
| 19 | `getProducer` | Returns Producer for existing user | `userId='user1'` (with created Producer) | Returns the Producer instance previously created |
| 20 | `getProducer` | Returns undefined for non-existent user | `userId='nonexistent'` | Returns `undefined` |
| 21 | `getAllProducers` | Returns array of all Producers | After creating Producers for 'user1' and 'user2' | Returns array of length 2 containing both Producer instances |
| 22 | `getAllProducers` | Returns empty array when no Producers | Before any Producers created | Returns `[]` (empty array) |
| 23 | `getRouterRtpCapabilities` | Returns router capabilities after init | After initialize() called | Returns object with `codecs` array including Opus entry; object is router's rtpCapabilities |
| 24 | `getRouterRtpCapabilities` | Throws error before initialization | Before initialize() called | Throws Error with message "Router not initialized" |
| 25 | `cleanupUser` | Closes Producer for user | `userId='user1'` (with Producer) | Producer.close() called; `producers.get('user1')` returns undefined; logs "Producer closed for user user1" |
| 26 | `cleanupUser` | Closes send and recv transports | `userId='user1'` (with transports) | Both send and recv transports closed; `transports.get('user1')` returns undefined; logs "Transports closed for user user1" |
| 27 | `cleanupUser` | Closes associated Consumers | `userId='user1'` (with Consumers) | All Consumers for user closed and removed from map |
| 28 | `cleanupUser` | Handles cleanup for non-existent user | `userId='nonexistent'` | No errors thrown; logs "Cleaning up user nonexistent" |
| 29 | `shutdown` | Closes all Consumers | After creating 2 Consumers | Both Consumer.close() called; `consumers.size` becomes 0 |
| 30 | `shutdown` | Closes all Producers | After creating 2 Producers | Both Producer.close() called; `producers.size` becomes 0 |
| 31 | `shutdown` | Closes all transports | After creating transports for 2 users | All 4 transports (2 send, 2 recv) closed; `transports.size` becomes 0 |
| 32 | `shutdown` | Closes router and worker | After initialization | Router.close() called; Worker.close() called; `router` set to null; `worker` set to null; logs "Shutdown complete" |
| 33 | `shutdown` | Handles shutdown when already clean | Before any resources created | No errors thrown; logs "Shutdown complete" |

---

## Testing Notes

### General Testing Approach

1. **Mocking Strategy:**
   - Mock mediasoup primitives (Worker, Router, WebRtcTransport, Producer, Consumer) for MediasoupManager tests
   - Mock WebSocket instances and MeetingRegistry/MediasoupManager dependencies for SignalingServer tests
   - Use spy functions to verify method calls and arguments

2. **Assertion Types:**
   - **State assertions:** Verify internal state changes (maps populated, flags set)
   - **Behavioral assertions:** Verify method calls on mocks (ws.send, transport.connect)
   - **Return value assertions:** Verify correct return values match expected types/structures
   - **Error assertions:** Verify correct errors thrown with expected messages

3. **Test Organization:**
   - Group tests by function
   - Include both success and failure cases
   - Test edge cases (empty inputs, non-existent resources, closed connections)
   - Verify proper cleanup and resource management

4. **Key Test Data:**
   - Valid SDP examples with DTLS fingerprints
   - Valid RTP parameters for Opus audio
   - Valid ICE candidates and parameters
   - Valid user IDs and meeting IDs

### Dependencies for Testing

- **Test Framework:** Jest or similar
- **Mocking:** jest.fn(), jest.spyOn() for mocks and spies
- **WebSocket Mocking:** Mock EventEmitter pattern for WebSocket events
- **mediasoup Mocking:** Mock Worker, Router, Transport, Producer, Consumer classes

### Coverage Goals

- Aim for 100% function coverage (all 32 functions tested)
- Aim for >90% line coverage
- Cover all error paths and edge cases
- Verify proper resource cleanup in all scenarios

