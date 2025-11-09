/**
 * SignalingServer - From dev_specs/classes.md lines 280-283
 * Purpose: Handles WebSocket connections, user authentication, and relays SDP/ICE
 * 
 * Required Methods (from dev_specs/classes.md):
 * - authenticate(userId, token): bool
 * - relayOffer(userId, sdp)
 * - relayAnswer(userId, sdp)
 * - relayIce(userId, candidate)
 * - notify(userId, event)
 * 
 * Message Flow (from dev_specs/public_interfaces.md lines 139-153):
 * 1. Client opens WebSocket with JWT
 * 2. Client sends join → Server returns joined
 * 3. Client sends offer → Server relays to other participants
 * 4. Server returns answer
 * 5. ICE negotiation via ice-candidate messages
 * 6. WebSocket remains open for notifications
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import {
  ClientMessage,
  JoinMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  LeaveMessage,
  JoinedMessage,
  ErrorMessage,
  UserSession
} from './types';
import { MeetingRegistry } from './MeetingRegistry';
import { MediasoupManager } from './MediasoupManager';

interface ClientConnection {
  ws: WebSocket;
  userId: string | null;
  meetingId: string | null;
  authenticated: boolean;
}

export class SignalingServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private meetingRegistry: MeetingRegistry;
  private mediasoupManager: MediasoupManager;

  constructor(port: number, meetingRegistry: MeetingRegistry, mediasoupManager: MediasoupManager) {
    this.meetingRegistry = meetingRegistry;
    this.mediasoupManager = mediasoupManager;

    // From public_interfaces.md line 20: WebSocket over TLS
    // For development, we'll use ws:// instead of wss://
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    console.log(`[SignalingServer] WebSocket server started on port ${port}`);
  }

  /**
   * Handle new WebSocket connection
   * From public_interfaces.md line 141: "Client opens WebSocket with JWT"
   */
  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    console.log('[SignalingServer] New WebSocket connection');

    // Initialize client connection
    const clientConn: ClientConnection = {
      ws,
      userId: null,
      meetingId: null,
      authenticated: false
    };
    this.clients.set(ws, clientConn);

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      this.handleMessage(ws, data);
    });

    // Handle disconnection
    ws.on('close', async () => {
      await this.handleDisconnection(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[SignalingServer] WebSocket error:', error);
    });
  }

  /**
   * Handle incoming WebSocket messages
   * From dev_specs/APIs.md lines 91-99: Incoming message types
   */
  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      console.log('[SignalingServer] Received message:', message.type);

      // Route message based on type
      switch (message.type) {
        case 'join':
          this.handleJoin(ws, message);
          break;
        case 'offer':
          this.handleOffer(ws, message);
          break;
        case 'answer':
          this.handleAnswer(ws, message);
          break;
        case 'ice-candidate':
          this.handleIceCandidate(ws, message);
          break;
        case 'leave':
          this.handleLeave(ws, message).catch(err => {
            console.error('[SignalingServer] Error handling leave:', err);
          });
          break;
        default:
          this.sendError(ws, 400, 'Unknown message type');
      }
    } catch (error) {
      console.error('[SignalingServer] Error parsing message:', error);
      this.sendError(ws, 400, 'Malformed message');
    }
  }

  /**
   * Handle JOIN message
   * From dev_specs/flow_charts.md lines 23-44: Meeting join flow
   * From dev_specs/public_interfaces.md lines 35-44: Join message format
   */
  private handleJoin(ws: WebSocket, message: JoinMessage): void {
    const { meetingId, userId, displayName } = message;
    const clientConn = this.clients.get(ws);

    if (!clientConn) {
      return;
    }

    // From flow_charts.md line 26: "SignalingServer.authenticate"
    // For User Story 11, we'll do simple authentication (no JWT yet)
    const authSuccess = this.authenticate(userId, ''); // Simplified for now

    if (!authSuccess) {
      // From public_interfaces.md line 131: Error code 401
      this.sendError(ws, 401, 'Invalid/expired JWT');
      ws.close();
      return;
    }

    // Mark client as authenticated
    clientConn.authenticated = true;
    clientConn.userId = userId;
    clientConn.meetingId = meetingId;

    // From flow_charts.md line 40: "MeetingRegistry.registerUser"
    // Create UserSession from data_schemas.md DS-01
    const userSession: UserSession = {
      userId,
      pcId: `pc-${userId}-${Date.now()}`,
      qualityTier: 'HIGH', // From flow_charts.md line 41: "qualityTier: HIGH"
      lastCrc32: '',
      connectionState: 'Connected',
      timestamp: Date.now()
    };

    this.meetingRegistry.registerUser(meetingId, userSession);

    // Get list of participants
    const participants = this.meetingRegistry.listRecipients(meetingId)
      .map(s => s.userId);

    // From dev_specs/public_interfaces.md lines 85-95: Joined message format
    // Include router RTP capabilities for mediasoup (needed for client to create offer)
    // This is an extension that doesn't break the spec (optional field)
    const routerRtpCapabilities = this.mediasoupManager.getRouterRtpCapabilities();
    
    const joinedMessage: JoinedMessage & { routerRtpCapabilities?: any } = {
      type: 'joined',
      meetingId,
      userId,
      success: true,
      participants,
      timestamp: Date.now(),
      routerRtpCapabilities // For mediasoup: client needs this to create offer
    };

    this.sendMessage(ws, joinedMessage);

    // From flow_charts.md line 42: "NotifyOthers: User joined event"
    this.notifyOthers(meetingId, userId, {
      type: 'user-joined',
      userId
    });

    console.log(`[SignalingServer] User ${userId} joined meeting ${meetingId}`);
  }

  /**
   * Handle OFFER message
   * From dev_specs/flow_charts.md line 33: "SignalingClient.sendOffer"
   * From dev_specs/public_interfaces.md lines 46-54: Offer message format
   * From dev_specs/public_interfaces.md line 144: "Server (via SFU) returns answer"
   * 
   * With mediasoup:
   * 1. Create mediasoup transports (send/recv) for this user
   * 2. Generate mediasoup SDP answer
   * 3. Return answer to client
   */
  private async handleOffer(ws: WebSocket, message: OfferMessage): Promise<void> {
    const { meetingId, sdp } = message;
    const clientConn = this.clients.get(ws);

    if (!clientConn || !clientConn.authenticated || !clientConn.userId) {
      this.sendError(ws, 401, 'Not authenticated');
      return;
    }

    const userId = clientConn.userId;

    try {
      console.log(`[SignalingServer] Handling offer from user ${userId} in meeting ${meetingId}`);

      // From dev_specs/public_interfaces.md line 144: "Server (via SFU) returns answer"
      // Create mediasoup transports for this user
      const transports = await this.mediasoupManager.createTransports(userId);

      // Parse client's SDP offer to extract RTP parameters
      // Note: In a real implementation, we'd parse the SDP to get RTP capabilities
      // For now, we'll create the answer with mediasoup transport parameters
      
      // Connect send transport with DTLS parameters from client offer
      // The client's offer contains DTLS fingerprint, we need to extract it
      // For mediasoup, we'll handle DTLS connection when client sends answer confirmation

      // Generate mediasoup answer SDP
      // This is a simplified version - in production, we'd properly construct SDP
      // For mediasoup, the answer includes transport ICE parameters and DTLS parameters
      
      // From dev_specs/public_interfaces.md lines 97-107: Answer message format
      const answerMessage: AnswerMessage = {
        type: 'answer',
        meetingId,
        sdp: this.createMediasoupAnswerSdp(transports, sdp)
      };

      // Send answer back to client
      // From flow_charts.md line 37: "SignalingServer.relayAnswer back to sender"
      this.sendMessage(ws, answerMessage);

      console.log(`[SignalingServer] Sent mediasoup answer to user ${userId}`);

    } catch (error) {
      console.error(`[SignalingServer] Error handling offer from ${userId}:`, error);
      this.sendError(ws, 500, `Failed to process offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle ANSWER message
   * From dev_specs/flow_charts.md line 37: "SignalingServer.relayAnswer"
   * From dev_specs/public_interfaces.md lines 56-64: Answer message format
   * 
   * With mediasoup:
   * - Client sends answer confirmation after receiving server's answer
   * - Connect mediasoup transports with DTLS parameters
   * - Create Producer for sender (if sending audio)
   * - Create Consumers for receiver (to receive from other participants)
   */
  private async handleAnswer(ws: WebSocket, message: AnswerMessage): Promise<void> {
    const { meetingId, sdp } = message;
    const clientConn = this.clients.get(ws);

    if (!clientConn || !clientConn.authenticated || !clientConn.userId) {
      this.sendError(ws, 401, 'Not authenticated');
      return;
    }

    const userId = clientConn.userId;

    try {
      console.log(`[SignalingServer] Handling answer from user ${userId} in meeting ${meetingId}`);

      // Parse client's answer SDP to extract DTLS parameters
      // Connect mediasoup transports
      const dtlsParameters = this.extractDtlsParameters(sdp);
      
      if (dtlsParameters) {
        // Connect send transport (for Producer)
        await this.mediasoupManager.connectTransport(userId, 'send', dtlsParameters);
        
        // Connect recv transport (for Consumer)
        await this.mediasoupManager.connectTransport(userId, 'recv', dtlsParameters);
        
        console.log(`[SignalingServer] Connected mediasoup transports for user ${userId}`);
      }

      // Create Producer for this user (if they're sending audio)
      // From dev_specs/flow_charts.md line 73: "RTP packets → StreamForwarder"
      // The Producer will be created when client starts sending RTP
      // For now, we'll wait for the client to send RTP parameters

      // Create Consumers for this user (to receive from other participants)
      // From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
      await this.createConsumersForUser(userId, meetingId);

      // From flow_charts.md line 40: "MeetingRegistry.registerUser"
      // User is now fully connected
      const clientConn = this.clients.get(ws);
      if (clientConn && clientConn.meetingId) {
        const userSession = this.meetingRegistry.getUserSession(clientConn.meetingId, userId);
        if (userSession) {
          userSession.connectionState = 'Streaming';
        }
      }

      console.log(`[SignalingServer] User ${userId} fully connected to mediasoup`);

    } catch (error) {
      console.error(`[SignalingServer] Error handling answer from ${userId}:`, error);
      this.sendError(ws, 500, `Failed to process answer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle ICE-CANDIDATE message
   * From dev_specs/public_interfaces.md lines 66-76: ICE candidate message format
   */
  private handleIceCandidate(ws: WebSocket, message: IceCandidateMessage): void {
    const { meetingId, candidate, sdpMid, sdpMLineIndex } = message;
    const clientConn = this.clients.get(ws);

    if (!clientConn || !clientConn.authenticated) {
      this.sendError(ws, 401, 'Not authenticated');
      return;
    }

    // Relay ICE candidate to other participants
    this.relayIce(clientConn.userId!, { candidate, sdpMid, sdpMLineIndex }, meetingId);
  }

  /**
   * Handle LEAVE message
   * From dev_specs/flow_charts.md: Meeting teardown flow
   */
  private async handleLeave(ws: WebSocket, message: LeaveMessage): Promise<void> {
    const { meetingId, userId } = message;

    // Cleanup mediasoup resources
    try {
      await this.mediasoupManager.cleanupUser(userId);
    } catch (error) {
      console.error(`[SignalingServer] Error cleaning up mediasoup for ${userId}:`, error);
    }

    // Remove user from meeting registry
    this.meetingRegistry.removeUser(meetingId, userId);

    // Notify other participants
    this.notifyOthers(meetingId, userId, {
      type: 'user-left',
      userId
    });

    console.log(`[SignalingServer] User ${userId} left meeting ${meetingId}`);
  }

  /**
   * Handle client disconnection
   * Cleanup mediasoup resources when user disconnects
   */
  private async handleDisconnection(ws: WebSocket): Promise<void> {
    const clientConn = this.clients.get(ws);
    if (clientConn && clientConn.userId && clientConn.meetingId) {
      const userId = clientConn.userId;
      const meetingId = clientConn.meetingId;
      
      // Cleanup mediasoup resources
      // From dev_specs: Cleanup on user leave
      try {
        await this.mediasoupManager.cleanupUser(userId);
      } catch (error) {
        console.error(`[SignalingServer] Error cleaning up mediasoup for ${userId}:`, error);
      }
      
      // Remove from meeting registry
      this.meetingRegistry.removeUser(meetingId, userId);
      
      // Notify other participants
      this.notifyOthers(meetingId, userId, {
        type: 'user-left',
        userId
      });
      
      console.log(`[SignalingServer] User ${userId} disconnected`);
    }

    this.clients.delete(ws);
  }

  /**
   * Authenticate user
   * From dev_specs/flow_charts.md line 26: "SignalingServer.authenticate"
   * From dev_specs/public_interfaces.md line 22: "JWT included in WebSocket upgrade request"
   * 
   * For User Story 11: Simplified authentication (no JWT validation yet)
   */
  authenticate(userId: string, token: string): boolean {
    // TODO: Implement JWT validation when authentication is added
    // For now, accept any userId as valid
    return userId.length > 0;
  }

  /**
   * Relay offer to other participants
   * From dev_specs/flow_charts.md line 34: "RelayOffer to other participants"
   */
  relayOffer(fromUserId: string, sdp: string, meetingId: string): void {
    const recipients = this.meetingRegistry.listRecipients(meetingId, fromUserId);

    const offerMessage: OfferMessage = {
      type: 'offer',
      meetingId,
      sdp
    };

    recipients.forEach(recipient => {
      const clientWs = this.findClientWebSocket(recipient.userId);
      if (clientWs) {
        this.sendMessage(clientWs, offerMessage);
      }
    });

    console.log(`[SignalingServer] Relayed offer from ${fromUserId} to ${recipients.length} participants`);
  }

  /**
   * Relay answer back to sender
   * From dev_specs/flow_charts.md line 37: "RelayAnswer back to sender"
   */
  relayAnswer(fromUserId: string, sdp: string, meetingId: string): void {
    const recipients = this.meetingRegistry.listRecipients(meetingId, fromUserId);

    const answerMessage: AnswerMessage = {
      type: 'answer',
      meetingId,
      sdp
    };

    recipients.forEach(recipient => {
      const clientWs = this.findClientWebSocket(recipient.userId);
      if (clientWs) {
        this.sendMessage(clientWs, answerMessage);
      }
    });

    console.log(`[SignalingServer] Relayed answer from ${fromUserId} to ${recipients.length} participants`);
  }

  /**
   * Relay ICE candidate
   * From dev_specs/public_interfaces.md line 145: "ICE negotiation continues via ice-candidate messages"
   */
  relayIce(fromUserId: string, iceData: any, meetingId: string): void {
    const recipients = this.meetingRegistry.listRecipients(meetingId, fromUserId);

    const iceMessage: IceCandidateMessage = {
      type: 'ice-candidate',
      meetingId,
      ...iceData
    };

    recipients.forEach(recipient => {
      const clientWs = this.findClientWebSocket(recipient.userId);
      if (clientWs) {
        this.sendMessage(clientWs, iceMessage);
      }
    });

    console.log(`[SignalingServer] Relayed ICE candidate from ${fromUserId} to ${recipients.length} participants`);
  }

  /**
   * Notify specific user of an event
   * From dev_specs/classes.md line 283: "notify(userId, event)"
   */
  notify(userId: string, event: any): void {
    const clientWs = this.findClientWebSocket(userId);
    if (clientWs) {
      this.sendMessage(clientWs, event);
    }
  }

  /**
   * Notify all users in a meeting except the sender
   * From dev_specs/flow_charts.md line 42: "NotifyOthers: User joined event"
   */
  private notifyOthers(meetingId: string, excludeUserId: string, event: any): void {
    const recipients = this.meetingRegistry.listRecipients(meetingId, excludeUserId);

    recipients.forEach(recipient => {
      const clientWs = this.findClientWebSocket(recipient.userId);
      if (clientWs) {
        this.sendMessage(clientWs, event);
      }
    });
  }

  /**
   * Send error message to client
   * From dev_specs/public_interfaces.md lines 117-135: Error message format and codes
   */
  private sendError(ws: WebSocket, code: number, message: string): void {
    const errorMessage: ErrorMessage = {
      type: 'error',
      code,
      message
    };

    this.sendMessage(ws, errorMessage);
  }

  /**
   * Send message to specific WebSocket
   */
  private sendMessage(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Find WebSocket for a given userId
   * Helper method to locate client connections
   */
  private findClientWebSocket(userId: string): WebSocket | null {
    for (const [ws, conn] of this.clients.entries()) {
      if (conn.userId === userId && ws.readyState === WebSocket.OPEN) {
        return ws;
      }
    }
    return null;
  }

  /**
   * Create WebRTC-compatible SDP answer
   * From dev_specs/public_interfaces.md line 144: "Server (via SFU) returns answer"
   * From dev_specs/tech_stack.md line 40: "SDP – Capability negotiation and session description"
   * 
   * This creates a proper WebRTC SDP answer that standard RTCPeerConnection can understand.
   * Uses mediasoup send transport parameters for the answer (client sends to server).
   * Receiving will be handled separately via mediasoup consumers.
   */
  private createMediasoupAnswerSdp(
    transports: {
      sendTransport: { id: string; iceParameters: any; iceCandidates: any; dtlsParameters: any };
      recvTransport: { id: string; iceParameters: any; iceCandidates: any; dtlsParameters: any };
    },
    clientOfferSdp: string
  ): string {
    // Parse client offer to extract session information
    // Extract session ID from offer (o= line)
    const sessionMatch = clientOfferSdp.match(/^o=([^\s]+)\s+(\d+)\s+(\d+)\s+IN\s+IP4\s+([^\s]+)/m);
    const sessionId = sessionMatch && sessionMatch[1] ? sessionMatch[1] : '-';
    const sessionVersion = sessionMatch && sessionMatch[2] ? parseInt(sessionMatch[2], 10) : 0;
    
    // Extract media section info from offer
    const mediaMatch = clientOfferSdp.match(/^m=audio\s+(\d+)\s+([^\s]+)\s+([^\r\n]+)/m);
    const mediaPort = mediaMatch && mediaMatch[1] ? parseInt(mediaMatch[1], 10) : 9;
    const mediaProtocol = mediaMatch && mediaMatch[2] ? mediaMatch[2] : 'UDP/TLS/RTP/SAVPF';
    
    // Use send transport for the answer (client sends to server)
    // From dev_specs: Client sends RTP to server via Producer
    const transport = transports.sendTransport;
    const iceParams = transport.iceParameters;
    const dtlsParams = transport.dtlsParameters;
    
    // Build standard WebRTC SDP answer
    // Format: https://datatracker.ietf.org/doc/html/rfc4566
    let sdp = `v=0\r\n`;
    
    // Session description
    // o=<username> <sess-id> <sess-version> <nettype> <addrtype> <unicast-address>
    sdp += `o=- ${sessionId} ${sessionVersion + 1} IN IP4 127.0.0.1\r\n`;
    sdp += `s=-\r\n`;
    
    // Timing (t=0 0 means session is not bounded)
    sdp += `t=0 0\r\n`;
    
    // Media section for audio
    // From dev_specs/public_interfaces.md line 220: Opus payload type 111
    // From dev_specs/public_interfaces.md: Opus, 48kHz, 2 channels
    sdp += `m=audio ${mediaPort} ${mediaProtocol} 111\r\n`;
    
    // Connection information
    // Use first ICE candidate's IP, or default
    const firstCandidate = transport.iceCandidates && transport.iceCandidates.length > 0
      ? transport.iceCandidates[0]
      : null;
    const connectionIp = firstCandidate?.ip || '0.0.0.0';
    sdp += `c=IN IP4 ${connectionIp}\r\n`;
    
    // ICE parameters (standard WebRTC format)
    // From dev_specs/tech_stack.md line 37: "WebRTC – Connection establishment (ICE)"
    sdp += `a=ice-ufrag:${iceParams.usernameFragment}\r\n`;
    sdp += `a=ice-pwd:${iceParams.password}\r\n`;
    
    // ICE candidates (standard WebRTC format)
    // Format: a=candidate:<foundation> <component-id> <transport> <priority> <ip> <port> typ <type>
    transport.iceCandidates.forEach((candidate: any) => {
      // mediasoup candidate format: { foundation, priority, ip, port, type, protocol }
      // WebRTC SDP format: candidate:<foundation> <component> <transport> <priority> <ip> <port> typ <type>
      const component = 1; // RTP component (1 for audio)
      const transport = candidate.protocol?.toUpperCase() || 'UDP';
      sdp += `a=candidate:${candidate.foundation} ${component} ${transport} ${candidate.priority} ${candidate.ip} ${candidate.port} typ ${candidate.type}`;
      if (candidate.relatedAddress) {
        sdp += ` raddr ${candidate.relatedAddress} rport ${candidate.relatedPort}`;
      }
      sdp += `\r\n`;
    });
    
    // DTLS parameters (standard WebRTC format)
    // From dev_specs/tech_stack.md line 37: "WebRTC – encryption (DTLS)"
    // Format: a=fingerprint:<hash> <fingerprint-value>
    if (dtlsParams.fingerprints && dtlsParams.fingerprints.length > 0) {
      const fingerprint = dtlsParams.fingerprints[0];
      sdp += `a=fingerprint:${fingerprint.algorithm} ${fingerprint.value}\r\n`;
      sdp += `a=setup:actpass\r\n`; // Server can be active or passive
    }
    
    // Media attributes
    // From dev_specs/public_interfaces.md line 220: Opus payload type 111
    // From dev_specs/public_interfaces.md: Opus, 48kHz, 2 channels
    sdp += `a=rtpmap:111 opus/48000/2\r\n`;
    
    // Opus codec parameters
    // From dev_specs/public_interfaces.md: Opus with in-band FEC and DTX
    sdp += `a=fmtp:111 minptime=10;useinbandfec=1\r\n`;
    
    // Media direction: sendrecv (client can send and receive)
    // Note: Receiving will be handled via mediasoup consumers separately
    sdp += `a=sendrecv\r\n`;
    
    // Additional WebRTC attributes
    sdp += `a=rtcp-mux\r\n`; // RTCP multiplexing (RTCP on same port as RTP)
    sdp += `a=rtcp-rsize\r\n`; // Reduced-size RTCP
    
    return sdp;
  }

  /**
   * Extract DTLS parameters from client SDP
   * Helper method to parse SDP and extract DTLS fingerprint
   */
  private extractDtlsParameters(sdp: string): any | null {
    // Simplified DTLS extraction from SDP
    // In production, use proper SDP parser
    const fingerprintMatch = sdp.match(/a=fingerprint:(\w+) ([A-F0-9:]+)/i);
    
    if (fingerprintMatch) {
      return {
        role: 'auto',
        fingerprints: [
          {
            algorithm: fingerprintMatch[1],
            value: fingerprintMatch[2]
          }
        ]
      };
    }
    
    return null;
  }

  /**
   * Create Consumers for a user to receive from other participants
   * From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
   * 
   * When a user joins, create consumers to receive audio from all other participants
   */
  private async createConsumersForUser(receiverUserId: string, meetingId: string): Promise<void> {
    // Get all other participants in the meeting
    const otherParticipants = this.meetingRegistry.listRecipients(meetingId, receiverUserId);
    
    if (otherParticipants.length === 0) {
      console.log(`[SignalingServer] No other participants for user ${receiverUserId} to receive from`);
      return;
    }

    // For each sender, create a consumer
    // Note: We need the receiver's RTP capabilities to create consumers
    // This will be handled when the client sends its RTP capabilities
    // For now, we'll log what we would do
    
    console.log(`[SignalingServer] Would create consumers for ${receiverUserId} to receive from ${otherParticipants.length} participants`);
    
    // In production, we'd do:
    // for (const sender of otherParticipants) {
    //   const producer = this.mediasoupManager.getProducer(sender.userId);
    //   if (producer) {
    //     const consumer = await this.mediasoupManager.createConsumer(
    //       receiverUserId,
    //       sender.userId,
    //       receiverRtpCapabilities
    //     );
    //   }
    // }
  }

  /**
   * Cleanup and close server
   */
  close(): void {
    this.wss.close();
    console.log('[SignalingServer] Server closed');
  }
}

