/**
 * SignalingClient - From dev_specs/APIs.md lines 14-27
 * Purpose: Establishes WebSocket signaling and performs SDP/ICE negotiation
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - connect(url: string): Promise<void>
 * - sendJoin(meetingId: string, userId: string): void
 * - sendOffer(sdp: string): void
 * - sendAnswer(sdp: string): void
 * - sendIceCandidate(candidate: IceCandidate): void
 * 
 * Event Callbacks:
 * - onAnswer(callback): void
 * - onIceCandidate(callback): void
 * - onTierChange(callback): void  [User Story 8 - not implemented yet]
 * - onAckSummary(callback): void  [User Story 3 - not implemented yet]
 * 
 * Flow (from dev_specs/flow_charts.md lines 24-25):
 * - SignalingClient.connect → WebSocket URL
 * - SignalingClient.sendJoin → meetingId, userId
 */

import type {
  JoinMessage,
  JoinedMessage,
  OfferMessage,
  AnswerMessage,
  IceCandidateMessage,
  ErrorMessage,
  IceCandidate,
  AckSummary
} from '../types';

type MessageCallback<T> = (message: T) => void;

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string = '';
  
  // Event callbacks
  private answerCallbacks: MessageCallback<string>[] = [];
  private iceCandidateCallbacks: MessageCallback<IceCandidate>[] = [];
  private tierChangeCallbacks: MessageCallback<string>[] = [];
  private ackSummaryCallbacks: MessageCallback<AckSummary>[] = [];
  private joinedCallbacks: MessageCallback<JoinedMessage>[] = [];
  private userJoinedCallbacks: MessageCallback<{ type: 'user-joined'; userId: string }>[] = [];
  private errorCallbacks: MessageCallback<ErrorMessage>[] = [];

  /**
   * Connect to WebSocket signaling server
   * From dev_specs/flow_charts.md line 24: "SignalingClient.connect"
   * From dev_specs/public_interfaces.md line 20: WebSocket endpoint
   */
  connect(url: string): Promise<void> {
    this.url = url;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('[SignalingClient] WebSocket connected');
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('[SignalingClient] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[SignalingClient] WebSocket closed');
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   * From dev_specs/public_interfaces.md lines 80-135: Server → Client messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      console.log('[SignalingClient] Received message:', message.type);

      switch (message.type) {
        case 'joined':
          this.joinedCallbacks.forEach(cb => cb(message as JoinedMessage));
          break;

        case 'user-joined':
          // From dev_specs/flow_charts.md line 42: "NotifyOthers: User joined event"
          const userJoinedMsg = message as { type: 'user-joined'; userId: string };
          this.userJoinedCallbacks.forEach(cb => cb(userJoinedMsg));
          break;

        case 'offer':
          // Not typically received by the offerer in User Story 11
          break;

        case 'answer':
          // From dev_specs/public_interfaces.md lines 97-104: SDP Answer from SFU
          const answerMsg = message as AnswerMessage;
          this.answerCallbacks.forEach(cb => cb(answerMsg.sdp));
          break;

        case 'ice-candidate':
          // From dev_specs/public_interfaces.md lines 106-115: ICE Candidate from SFU
          const iceMsg = message as IceCandidateMessage;
          const iceCandidate: IceCandidate = {
            type: 'host', // Default, actual type comes from SDP
            address: iceMsg.candidate,
            port: 0 // Parsed from candidate string in real implementation
          };
          this.iceCandidateCallbacks.forEach(cb => cb(iceCandidate));
          break;

        case 'tier-change':
          // User Story 8 - Adaptive Quality Management (not implemented yet)
          const tierMsg = message as { type: 'tier-change'; tier: string };
          this.tierChangeCallbacks.forEach(cb => cb(tierMsg.tier));
          break;

        case 'ack-summary':
          // User Story 3 - Real-Time Audio Feedback (not implemented yet)
          const ackMsg = message as AckSummary & { type: 'ack-summary' };
          this.ackSummaryCallbacks.forEach(cb => cb(ackMsg));
          break;

        case 'error':
          // From dev_specs/public_interfaces.md lines 117-135: Error message
          const errorMsg = message as ErrorMessage;
          console.error('[SignalingClient] Server error:', errorMsg.message);
          this.errorCallbacks.forEach(cb => cb(errorMsg));
          break;

        default:
          console.warn('[SignalingClient] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[SignalingClient] Error parsing message:', error);
    }
  }

  /**
   * Send JOIN message
   * From dev_specs/flow_charts.md line 25: "SignalingClient.sendJoin"
   * From dev_specs/public_interfaces.md lines 35-44: Join message format
   */
  sendJoin(meetingId: string, userId: string, displayName: string = ''): void {
    const joinMessage: JoinMessage = {
      type: 'join',
      meetingId,
      userId,
      displayName
    };

    this.send(joinMessage);
    console.log(`[SignalingClient] Sent JOIN: meeting=${meetingId}, user=${userId}`);
  }

  /**
   * Send OFFER message
   * From dev_specs/flow_charts.md line 33: "SignalingClient.sendOffer"
   * From dev_specs/public_interfaces.md lines 46-54: Offer message format
   */
  sendOffer(sdp: string, meetingId: string): void {
    const offerMessage: OfferMessage = {
      type: 'offer',
      meetingId,
      sdp
    };

    this.send(offerMessage);
    console.log('[SignalingClient] Sent OFFER');
  }

  /**
   * Send ANSWER message
   * From dev_specs/public_interfaces.md lines 56-64: Answer message format
   */
  sendAnswer(sdp: string, meetingId: string): void {
    const answerMessage: AnswerMessage = {
      type: 'answer',
      meetingId,
      sdp
    };

    this.send(answerMessage);
    console.log('[SignalingClient] Sent ANSWER');
  }

  /**
   * Send ICE CANDIDATE message
   * From dev_specs/public_interfaces.md lines 66-76: ICE candidate message format
   */
  sendIceCandidate(candidate: RTCIceCandidate, meetingId: string): void {
    const iceCandidateMessage: IceCandidateMessage = {
      type: 'ice-candidate',
      meetingId,
      candidate: candidate.candidate || '',
      sdpMid: candidate.sdpMid || '',
      sdpMLineIndex: candidate.sdpMLineIndex || 0
    };

    this.send(iceCandidateMessage);
    console.log('[SignalingClient] Sent ICE CANDIDATE');
  }

  /**
   * Register callback for JOINED messages
   */
  onJoined(callback: MessageCallback<JoinedMessage>): void {
    this.joinedCallbacks.push(callback);
  }

  /**
   * Register callback for ANSWER messages
   * From dev_specs/APIs.md line 23: onAnswer(callback)
   */
  onAnswer(callback: MessageCallback<string>): void {
    this.answerCallbacks.push(callback);
  }

  /**
   * Register callback for ICE CANDIDATE messages
   * From dev_specs/APIs.md line 24: onIceCandidate(callback)
   */
  onIceCandidate(callback: MessageCallback<IceCandidate>): void {
    this.iceCandidateCallbacks.push(callback);
  }

  /**
   * Register callback for TIER CHANGE messages
   * From dev_specs/APIs.md line 25: onTierChange(callback)
   * User Story 8 - Not implemented yet
   */
  onTierChange(callback: MessageCallback<string>): void {
    this.tierChangeCallbacks.push(callback);
  }

  /**
   * Register callback for ACK SUMMARY messages
   * From dev_specs/APIs.md line 26: onAckSummary(callback)
   * User Story 3 - Not implemented yet
   */
  onAckSummary(callback: MessageCallback<AckSummary>): void {
    this.ackSummaryCallbacks.push(callback);
  }

  /**
   * Register callback for USER-JOINED messages
   * From dev_specs/flow_charts.md line 42: "NotifyOthers: User joined event"
   */
  onUserJoined(callback: MessageCallback<{ type: 'user-joined'; userId: string }>): void {
    this.userJoinedCallbacks.push(callback);
  }

  /**
   * Register callback for ERROR messages
   */
  onError(callback: MessageCallback<ErrorMessage>): void {
    this.errorCallbacks.push(callback);
  }

  /**
   * Send message via WebSocket
   */
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('[SignalingClient] WebSocket is not open');
    }
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

