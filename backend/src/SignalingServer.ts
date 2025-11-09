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
  // Store RTP parameters and transport ID from client offers (keyed by userId) for Producer creation
  private pendingRtpParameters: Map<string, any> = new Map();
  private pendingTransportIds: Map<string, string> = new Map();
  // Store RTP capabilities per user (for Consumer creation)
  private userRtpCapabilities: Map<string, any> = new Map();

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
      // Create mediasoup transport for this user (single transport for both send and receive)
      const transport = await this.mediasoupManager.createTransport(userId);
      
      // Store transport ID for use in handleAnswer
      this.pendingTransportIds.set(userId, transport.id);

      // Extract RTP parameters from client's SDP offer for Producer creation
      // From dev_specs/flow_charts.md line 73: "RTP packets → StreamForwarder"
      // We'll create Producer after DTLS connection in handleAnswer
      const rtpParameters = this.extractRtpParametersFromSdp(sdp);
      if (rtpParameters) {
        this.pendingRtpParameters.set(userId, rtpParameters);
        console.log(`[SignalingServer] Extracted RTP parameters for user ${userId}, will create Producer after DTLS connection`);
      }
      
      // Extract RTP capabilities from client's SDP offer for Consumer creation
      // From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
      // RTP capabilities describe what the client can receive (codecs, header extensions)
      const rtpCapabilities = this.extractRtpCapabilitiesFromSdp(sdp);
      if (rtpCapabilities) {
        this.userRtpCapabilities.set(userId, rtpCapabilities);
        console.log(`[SignalingServer] Extracted RTP capabilities for user ${userId}, will use for Consumer creation`);
      }
      
      // From dev_specs/public_interfaces.md lines 97-107: Answer message format
      const answerMessage: AnswerMessage = {
        type: 'answer',
        meetingId,
        sdp: this.createMediasoupAnswerSdp(transport, sdp)
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
      // Connect mediasoup transport (single transport for both send and receive)
      const dtlsParameters = this.extractDtlsParameters(sdp);
      
      if (dtlsParameters) {
        await this.mediasoupManager.connectTransport(userId, dtlsParameters);
        console.log(`[SignalingServer] Connected mediasoup transport for user ${userId}`);
      }

      // Create Producer for this user (if they're sending audio)
      // From dev_specs/flow_charts.md line 73: "RTP packets → StreamForwarder"
      // Producer receives RTP from client and forwards to StreamForwarder
      const rtpParameters = this.pendingRtpParameters.get(userId);
      const transportId = this.pendingTransportIds.get(userId);
      
      if (rtpParameters && transportId) {
        try {
          await this.mediasoupManager.createProducer(userId, transportId, rtpParameters);
          this.pendingRtpParameters.delete(userId);
          this.pendingTransportIds.delete(userId);
          console.log(`[SignalingServer] Producer created for user ${userId}`);
          
          // Create Consumers for all existing users to receive from this new Producer
          // From dev_specs/architecture.md: SFU forwards audio to all receivers
          const allParticipants = this.meetingRegistry.listRecipients(meetingId);
          for (const receiver of allParticipants) {
            if (receiver.userId !== userId) {
              // Only create Consumer if receiver has RTP capabilities
              const receiverRtpCapabilities = this.userRtpCapabilities.get(receiver.userId);
              if (receiverRtpCapabilities) {
                try {
                  const consumer = await this.mediasoupManager.createConsumer(
                    receiver.userId,
                    userId,
                    receiverRtpCapabilities
                  );
                  if (consumer) {
                    console.log(`[SignalingServer] Consumer created for existing user ${receiver.userId} to receive from ${userId}`);
                  }
                } catch (error) {
                  console.error(`[SignalingServer] Error creating consumer for existing user ${receiver.userId} → ${userId}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error(`[SignalingServer] Failed to create Producer for user ${userId}:`, error);
          // Don't fail the entire connection if Producer creation fails
          // The client can still connect, but audio won't flow until Producer is created
        }
      } else {
        if (!rtpParameters) {
          console.warn(`[SignalingServer] No RTP parameters found for user ${userId}, Producer not created`);
        }
        if (!transportId) {
          console.warn(`[SignalingServer] No transport ID found for user ${userId}, Producer not created`);
        }
      }

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
      
      // Cleanup pending RTP parameters, transport IDs, and RTP capabilities
      this.pendingRtpParameters.delete(userId);
      this.pendingTransportIds.delete(userId);
      this.userRtpCapabilities.delete(userId);
      
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
   * Uses single mediasoup transport parameters for bidirectional communication (client sends and receives on same connection).
   */
  private createMediasoupAnswerSdp(
    transport: {
      id: string;
      iceParameters: any;
      iceCandidates: any;
      dtlsParameters: any;
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
    
    // Use single transport for bidirectional communication
    // From dev_specs: Client sends and receives RTP on same connection
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
   * Extract RTP parameters from client SDP offer
   * From dev_specs/public_interfaces.md: Opus codec, payload type 111, 48kHz, 2 channels
   * From dev_specs/public_interfaces.md: 3 simulcast tiers (16/32/64 kbps)
   * 
   * This extracts RTP parameters in mediasoup format from standard WebRTC SDP offer.
   */
  private extractRtpParametersFromSdp(sdp: string): any | null {
    try {
      // Extract audio media section
      const audioSectionMatch = sdp.match(/m=audio\s+(\d+)\s+([^\r\n]+)\s+([^\r\n]+)/);
      if (!audioSectionMatch || !audioSectionMatch[3]) {
        console.warn('[SignalingServer] No audio media section found in SDP');
        return null;
      }

      const payloadTypes = audioSectionMatch[3].split(' ').map(pt => parseInt(pt, 10)).filter(pt => !isNaN(pt));
      
      // Extract codec information (rtpmap)
      // From dev_specs/public_interfaces.md line 220: Opus payload type 111
      // From dev_specs/public_interfaces.md: Opus, 48kHz, 2 channels
      const codecs: any[] = [];
      const rtpmapRegex = /a=rtpmap:(\d+)\s+([^\s\/]+)\/(\d+)(?:\/(\d+))?/g;
      let rtpmapMatch;
      
      while ((rtpmapMatch = rtpmapRegex.exec(sdp)) !== null) {
        if (!rtpmapMatch[1] || !rtpmapMatch[2] || !rtpmapMatch[3]) {
          continue;
        }
        
        const payloadType = parseInt(rtpmapMatch[1], 10);
        const mimeType = rtpmapMatch[2].toLowerCase();
        const clockRate = parseInt(rtpmapMatch[3], 10);
        const channels = rtpmapMatch[4] ? parseInt(rtpmapMatch[4], 10) : 1;
        
        // Look for Opus codec (any payload type - client may use different PT than our answer)
        // From dev_specs/public_interfaces.md: Opus codec
        if (mimeType === 'opus') {
          // Extract codec parameters (fmtp)
          const fmtpMatch = sdp.match(new RegExp(`a=fmtp:${payloadType}\\s+([^\\r\\n]+)`));
          const parameters: any = {};
          
          if (fmtpMatch && fmtpMatch[1]) {
            // Parse fmtp parameters (e.g., "minptime=10;useinbandfec=1")
            fmtpMatch[1].split(';').forEach(param => {
              const [key, value] = param.split('=');
              if (key && value) {
                parameters[key.trim()] = value.trim();
              }
            });
          }
          
          // From dev_specs/public_interfaces.md: Opus with in-band FEC
          if (!parameters.useinbandfec) {
            parameters.useinbandfec = '1';
          }
          
          codecs.push({
            mimeType: 'audio/opus',
            payloadType: payloadType,
            clockRate: clockRate,
            channels: channels,
            parameters: parameters
          });
        }
      }
      
      if (codecs.length === 0) {
        console.warn('[SignalingServer] No Opus codec found in SDP');
        return null;
      }

      // Extract SSRC (if present)
      const ssrcMatch = sdp.match(/a=ssrc:(\d+)/);
      const ssrc = ssrcMatch && ssrcMatch[1] ? parseInt(ssrcMatch[1], 10) : undefined;

      // Extract simulcast information (if present)
      // From dev_specs/public_interfaces.md: 3 simulcast tiers
      const simulcastMatch = sdp.match(/a=simulcast:send\s+([^\r\n]+)/);
      const encodings: any[] = [];
      
      if (simulcastMatch && simulcastMatch[1]) {
        // Parse simulcast RIDs (e.g., "rid:high send;rid:mid send;rid:low send")
        const rids = simulcastMatch[1].split(';').map(rid => {
          const match = rid.match(/rid:([^\s]+)/);
          return match && match[1] ? match[1] : null;
        }).filter((rid): rid is string => rid !== null);
        
        // Create encodings for each simulcast layer
        // From dev_specs/public_interfaces.md: LOW (16 kbps), MEDIUM (32 kbps), HIGH (64 kbps)
        rids.forEach((rid, index) => {
          encodings.push({
            rid: rid,
            ssrc: ssrc ? ssrc + index : undefined,
            // Simulcast layers will be selected by mediasoup based on tier
          });
        });
      } else {
        // No simulcast, single encoding
        encodings.push({
          ssrc: ssrc
        });
      }

      // Build RTP parameters in mediasoup format
      const rtpParameters = {
        codecs: codecs,
        headerExtensions: [], // WebRTC header extensions (not critical for basic audio)
        encodings: encodings,
        rtcp: {
          cname: ssrc ? `user-${ssrc}` : 'user',
          reducedSize: true // From dev_specs/public_interfaces.md: RTCP reports
        }
      };

      console.log(`[SignalingServer] Extracted RTP parameters: ${codecs.length} codec(s), ${encodings.length} encoding(s)`);
      return rtpParameters;
      
    } catch (error) {
      console.error('[SignalingServer] Error extracting RTP parameters from SDP:', error);
      return null;
    }
  }

  /**
   * Extract RTP capabilities from client SDP offer
   * From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
   * 
   * RTP capabilities describe what the client can receive (codecs, header extensions).
   * Unlike RTP parameters, capabilities don't include encodings (SSRC, RID) since the
   * receiver doesn't know what it will receive yet.
   */
  private extractRtpCapabilitiesFromSdp(sdp: string): any | null {
    try {
      // Extract audio media section
      const audioSectionMatch = sdp.match(/m=audio\s+(\d+)\s+([^\r\n]+)\s+([^\r\n]+)/);
      if (!audioSectionMatch || !audioSectionMatch[3]) {
        console.warn('[SignalingServer] No audio media section found in SDP for capabilities');
        return null;
      }

      // Extract codec information (rtpmap)
      // From dev_specs/public_interfaces.md: Opus codec
      const codecs: any[] = [];
      const rtpmapRegex = /a=rtpmap:(\d+)\s+([^\s\/]+)\/(\d+)(?:\/(\d+))?/g;
      let rtpmapMatch;
      
      while ((rtpmapMatch = rtpmapRegex.exec(sdp)) !== null) {
        if (!rtpmapMatch[1] || !rtpmapMatch[2] || !rtpmapMatch[3]) {
          continue;
        }
        
        const payloadType = parseInt(rtpmapMatch[1], 10);
        const mimeType = rtpmapMatch[2].toLowerCase();
        const clockRate = parseInt(rtpmapMatch[3], 10);
        const channels = rtpmapMatch[4] ? parseInt(rtpmapMatch[4], 10) : 1;
        
        // Include all audio codecs the client supports (not just Opus)
        // This allows mediasoup to negotiate the best codec
        if (mimeType === 'opus' || mimeType === 'pcmu' || mimeType === 'pcma') {
          // Extract codec parameters (fmtp)
          const fmtpMatch = sdp.match(new RegExp(`a=fmtp:${payloadType}\\s+([^\\r\\n]+)`));
          const parameters: any = {};
          
          if (fmtpMatch && fmtpMatch[1]) {
            // Parse fmtp parameters
            fmtpMatch[1].split(';').forEach(param => {
              const [key, value] = param.split('=');
              if (key && value) {
                parameters[key.trim()] = value.trim();
              }
            });
          }
          
          // For Opus, ensure in-band FEC is enabled
          if (mimeType === 'opus' && !parameters.useinbandfec) {
            parameters.useinbandfec = '1';
          }
          
          codecs.push({
            kind: 'audio',
            mimeType: `audio/${mimeType}`,
            preferredPayloadType: payloadType,
            clockRate: clockRate,
            channels: channels,
            parameters: parameters
          });
        }
      }
      
      if (codecs.length === 0) {
        console.warn('[SignalingServer] No supported audio codecs found in SDP for capabilities');
        return null;
      }

      // Extract header extensions (if present)
      // WebRTC uses header extensions for things like audio level, abs-send-time, etc.
      const headerExtensions: any[] = [];
      const extmapRegex = /a=extmap:(\d+)\s+([^\s]+)(?:\s+([^\r\n]+))?/g;
      let extmapMatch;
      
      while ((extmapMatch = extmapRegex.exec(sdp)) !== null) {
        if (extmapMatch[1] && extmapMatch[2]) {
          headerExtensions.push({
            uri: extmapMatch[2],
            id: parseInt(extmapMatch[1], 10),
            encrypt: false
          });
        }
      }

      // Build RTP capabilities in mediasoup format
      const rtpCapabilities = {
        codecs: codecs,
        headerExtensions: headerExtensions,
        fecMechanisms: [] // FEC is handled by Opus in-band FEC
      };

      console.log(`[SignalingServer] Extracted RTP capabilities: ${codecs.length} codec(s), ${headerExtensions.length} header extension(s)`);
      return rtpCapabilities;
      
    } catch (error) {
      console.error('[SignalingServer] Error extracting RTP capabilities from SDP:', error);
      return null;
    }
  }

  /**
   * Create Consumers for a user to receive from other participants
   * From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
   * From dev_specs/flow_charts.md line 95: "RtpReceiver.onRtp - EncodedFrame"
   * 
   * When a user joins, create consumers to receive audio from all other participants
   */
  private async createConsumersForUser(receiverUserId: string, meetingId: string): Promise<void> {
    // Get receiver's RTP capabilities
    const receiverRtpCapabilities = this.userRtpCapabilities.get(receiverUserId);
    if (!receiverRtpCapabilities) {
      console.warn(`[SignalingServer] No RTP capabilities found for user ${receiverUserId}, cannot create Consumers`);
      return;
    }

    // Get all other participants in the meeting
    const otherParticipants = this.meetingRegistry.listRecipients(meetingId, receiverUserId);
    
    if (otherParticipants.length === 0) {
      console.log(`[SignalingServer] No other participants for user ${receiverUserId} to receive from`);
      return;
    }

    console.log(`[SignalingServer] Creating consumers for ${receiverUserId} to receive from ${otherParticipants.length} participants`);

    // For each sender, create a consumer
    // From dev_specs/architecture.md: SFU forwards selected tier to receiver
    for (const sender of otherParticipants) {
      const producer = this.mediasoupManager.getProducer(sender.userId);
      if (producer) {
        try {
          const consumer = await this.mediasoupManager.createConsumer(
            receiverUserId,
            sender.userId,
            receiverRtpCapabilities
          );
          
          if (consumer) {
            console.log(`[SignalingServer] Consumer created: ${sender.userId} → ${receiverUserId} (Consumer ID: ${consumer.id})`);
            // Note: Consumer RTP parameters would be sent to client via WebSocket
            // For now, mediasoup handles RTP forwarding automatically
          } else {
            console.warn(`[SignalingServer] Failed to create consumer for ${sender.userId} → ${receiverUserId}`);
          }
        } catch (error) {
          console.error(`[SignalingServer] Error creating consumer ${sender.userId} → ${receiverUserId}:`, error);
        }
      } else {
        console.log(`[SignalingServer] No producer found for sender ${sender.userId}, skipping consumer creation`);
      }
    }
  }

  /**
   * Cleanup and close server
   */
  close(): void {
    this.wss.close();
    console.log('[SignalingServer] Server closed');
  }
}

