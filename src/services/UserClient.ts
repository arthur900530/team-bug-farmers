/**
 * UserClient - From dev_specs/APIs.md lines 32-44
 * Purpose: Orchestrates client operations including joining meetings, WebRTC connections, and audio transmission
 * 
 * Implementation follows tech_stack.md:
 * - Line 16: "Opus + Simulcast (16/32/64 kbps)" via WebRTC native
 * - Line 17: "WebRTC (RTP/RTCP)" for transport
 * - Line 18: "WebSocket" for signaling (via SignalingClient)
 * 
 * From dev_specs/classes.md M1.4.2 (C1.4.2):
 * "Orchestrates client operations including joining meetings, sending CRC32, and UI feedback"
 * Note: Dual role — sender submits encoded CRC32, receiver submits decoded CRC32
 * 
 * From dev_specs/flow_charts.md:
 * - Flow 1 (lines 23-44): Meeting join with SDP/ICE negotiation
 * - Flow 2 (lines 57-82): Audio transmission pipeline
 * - Flow 3 (lines 86-117): Audio reception pipeline
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - constructor(userId, meetingId)
 * - joinMeeting(): Promise<void>
 * - leaveMeeting(): void
 * - createOffer(): Promise<string>
 * - handleAnswer(sdp): void
 * - sendRtcpSr(): void [User Story 8 - not used in User Story 11]
 * - computeCrc32(frame): string [User Story 3 - not used in User Story 11]
 */

import { SignalingClient } from './SignalingClient';
import { AudioCapture } from './AudioCapture';
import { AudioPlayer } from './AudioPlayer';
import type { ConnectionState, UserSession } from '../types';

// WebRTC configuration
// From public_interfaces.md: ICE servers for NAT traversal
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export class UserClient {
  private userId: string;
  private meetingId: string;
  private displayName: string;
  
  // Core components
  private signalingClient: SignalingClient;
  private audioCapture: AudioCapture;
  private audioPlayer: AudioPlayer;
  private peerConnection: RTCPeerConnection | null = null;
  
  // State
  private connectionState: ConnectionState = 'Disconnected';
  private isJoined: boolean = false;
  private remoteAudioLevel: number = 0;
  
  // Callbacks for state updates
  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onRemoteTrack?: (track: MediaStreamTrack) => void;
  private onRemoteAudioLevelChange?: (level: number) => void;

  /**
   * Constructor
   * From dev_specs/APIs.md line 36: "constructor(userId: string, meetingId: string)"
   */
  constructor(userId: string, meetingId: string, displayName: string = '') {
    this.userId = userId;
    this.meetingId = meetingId;
    this.displayName = displayName || userId;
    
    this.signalingClient = new SignalingClient();
    this.audioCapture = new AudioCapture();
    this.audioPlayer = new AudioPlayer();
    
    // Start monitoring remote audio level for visual feedback
    this.startAudioLevelMonitoring();
    
    console.log(`[UserClient] Created for user ${userId} in meeting ${meetingId}`);
  }

  /**
   * Join meeting and establish WebRTC connection
   * From dev_specs/APIs.md line 38: "joinMeeting(): Promise<void>"
   * From dev_specs/flow_charts.md lines 23-44: Complete join flow
   */
  async joinMeeting(): Promise<void> {
    console.log(`[UserClient] Joining meeting ${this.meetingId}...`);
    
    try {
      // Step 1: Connect to signaling server
      // From flow_charts.md line 24: "SignalingClient.connect"
      this.updateConnectionState('Connecting');
      
      // TODO: Get WebSocket URL from config
      const wsUrl = 'ws://localhost:8080';
      await this.signalingClient.connect(wsUrl);
      
      // Step 2: Send JOIN message
      // From flow_charts.md line 25: "SignalingClient.sendJoin"
      this.updateConnectionState('Signaling');
      this.signalingClient.sendJoin(this.meetingId, this.userId, this.displayName);
      
      // Step 3: Wait for JOINED response
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 10000);
        
        this.signalingClient.onJoined((joinedMsg) => {
          clearTimeout(timeout);
          if (joinedMsg.success) {
            console.log(`[UserClient] Joined meeting with ${joinedMsg.participants.length} participants`);
            this.isJoined = true;
            resolve();
          } else {
            reject(new Error('Join failed'));
          }
        });
        
        this.signalingClient.onError((errorMsg) => {
          clearTimeout(timeout);
          reject(new Error(`Join error: ${errorMsg.message}`));
        });
      });
      
      // Step 4: Set up WebRTC peer connection
      // From flow_charts.md line 31: "UserClient.createOffer"
      await this.setupPeerConnection();
      
      // Step 5: Start audio capture
      // From flow_charts.md line 58: "AudioCapture.start - Open microphone"
      await this.startAudioTransmission();
      
      // Step 6: Create and send offer
      // From flow_charts.md line 33: "SignalingClient.sendOffer"
      this.updateConnectionState('Offering');
      const offer = await this.createOffer();
      this.signalingClient.sendOffer(offer, this.meetingId);
      
      // Step 7: Wait for answer
      // From flow_charts.md line 38: "UserClient.handleAnswer"
      this.updateConnectionState('Waiting_Answer');
      
      console.log('[UserClient] Join meeting completed successfully');
      
    } catch (error) {
      console.error('[UserClient] Failed to join meeting:', error);
      this.updateConnectionState('Disconnected');
      throw error;
    }
  }

  /**
   * Set up WebRTC peer connection with simulcast
   * From tech_stack.md line 16: "Opus + Simulcast (16/32/64 kbps)"
   * From tech_stack.md line 17: "WebRTC (RTP/RTCP)"
   */
  private async setupPeerConnection(): Promise<void> {
    console.log('[UserClient] Setting up WebRTC peer connection...');
    
    // Create peer connection
    // From public_interfaces.md: ICE, DTLS, SRTP handled by WebRTC
    this.peerConnection = new RTCPeerConnection({
      iceServers: ICE_SERVERS
    });
    
    // Handle ICE candidates
    // From flow_charts.md line 32: "Gather ICE candidates"
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[UserClient] ICE candidate generated');
        this.signalingClient.sendIceCandidate(event.candidate, this.meetingId);
      }
    };
    
    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log(`[UserClient] ICE connection state: ${iceState}`);
      
      switch (iceState) {
        case 'connected':
        case 'completed':
          this.updateConnectionState('Connected');
          break;
        case 'failed':
        case 'disconnected':
          this.updateConnectionState('Disconnected');
          break;
        case 'checking':
          this.updateConnectionState('ICE_Gathering');
          break;
      }
    };
    
    // Handle incoming tracks (for receiving audio - Flow 3)
    // From dev_specs/flow_charts.md line 95: "RtpReceiver.onRtp - EncodedFrame"
    // With WebRTC, this is handled via ontrack event
    this.peerConnection.ontrack = async (event) => {
      console.log('[UserClient] Received remote track:', event.track.kind);
      console.log(`[UserClient] Track ID: ${event.track.id}`);
      console.log(`[UserClient] Track enabled: ${event.track.enabled}`);
      console.log(`[UserClient] Track muted: ${event.track.muted}`);
      console.log(`[UserClient] Track readyState: ${event.track.readyState}`);
      
      if (event.track.kind === 'audio') {
        // From dev_specs/flow_charts.md line 102: "AudioPlayer.play - PCMFrame to speakers"
        // WebRTC handles decoding automatically, so we receive MediaStreamTrack
        try {
          await this.audioPlayer.play(event.track);
          console.log('[UserClient] Remote audio playback started successfully');
          
          // Notify callback
          if (this.onRemoteTrack) {
            this.onRemoteTrack(event.track);
          }
        } catch (error) {
          console.error('[UserClient] Failed to play remote audio:', error);
        }
      }
    };
    
    // Handle signaling state changes
    this.peerConnection.onsignalingstatechange = () => {
      console.log(`[UserClient] Signaling state: ${this.peerConnection?.signalingState}`);
    };
    
    // Listen for incoming ICE candidates from signaling
    this.signalingClient.onIceCandidate(async (candidate) => {
      try {
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate({
              candidate: candidate.address,
              sdpMid: '0',
              sdpMLineIndex: 0
            })
          );
          console.log('[UserClient] Added remote ICE candidate');
        }
      } catch (error) {
        console.error('[UserClient] Error adding ICE candidate:', error);
      }
    });
    
    // Listen for answer from signaling
    this.signalingClient.onAnswer(async (sdp) => {
      await this.handleAnswer(sdp);
    });
    
    console.log('[UserClient] WebRTC peer connection set up successfully');
  }

  /**
   * Start audio transmission with simulcast
   * From flow_charts.md lines 58-73: Audio Transmission Pipeline
   * From tech_stack.md line 16: "Opus + Simulcast (16/32/64 kbps)"
   */
  private async startAudioTransmission(): Promise<void> {
    console.log('[UserClient] Starting audio transmission...');
    
    // Step 1: Start audio capture
    // From flow_charts.md line 58: "AudioCapture.start - Open microphone"
    const mediaStream = await this.audioCapture.start();
    
    // Step 2: Add audio track to peer connection with simulcast
    // From public_interfaces.md lines 197-199: "3 simulcast tiers (LOW/MEDIUM/HIGH)"
    const audioTrack = mediaStream.getAudioTracks()[0];
    
    if (!audioTrack) {
      throw new Error('No audio track available');
    }
    
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    
    // Add track to peer connection
    const sender = this.peerConnection.addTrack(audioTrack, mediaStream);
    
    // Configure simulcast encoding parameters
    // From tech_stack.md line 16: "Multi-tier encoding (16/32/64 kbps)"
    // From public_interfaces.md line 198: "20ms Opus frames → 50 packets/sec per tier"
    try {
      const params = sender.getParameters();
      
      // Configure 3 simulcast tiers
      // From flow_charts.md lines 62-64: LOW/MEDIUM/HIGH tiers
      params.encodings = [
        {
          rid: 'high',
          maxBitrate: 64000,  // HIGH: 64 kbps
          priority: 'high',
          networkPriority: 'high'
        },
        {
          rid: 'mid',
          maxBitrate: 32000,  // MEDIUM: 32 kbps
          priority: 'medium',
          networkPriority: 'medium'
        },
        {
          rid: 'low',
          maxBitrate: 16000,  // LOW: 16 kbps
          priority: 'low',
          networkPriority: 'low'
        }
      ];
      
      await sender.setParameters(params);
      console.log('[UserClient] Simulcast configured: 64/32/16 kbps');
      
    } catch (error) {
      console.warn('[UserClient] Could not configure simulcast:', error);
      console.warn('[UserClient] Browser may not support simulcast, using single stream');
    }
    
    this.updateConnectionState('Streaming');
    console.log('[UserClient] Audio transmission started successfully');
  }

  /**
   * Create SDP offer
   * From dev_specs/APIs.md line 40: "createOffer(): Promise<string>"
   * From dev_specs/flow_charts.md line 31: "UserClient.createOffer - Generate SDP"
   */
  async createOffer(): Promise<string> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    
    console.log('[UserClient] Creating SDP offer...');
    
    // Create offer with audio only
    // From public_interfaces.md: SDP capability negotiation
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    
    // Set local description
    await this.peerConnection.setLocalDescription(offer);
    
    console.log('[UserClient] SDP offer created');
    return offer.sdp || '';
  }

  /**
   * Handle SDP answer from remote peer
   * From dev_specs/APIs.md line 41: "handleAnswer(sdp: string): void"
   * From dev_specs/flow_charts.md line 38: "UserClient.handleAnswer - Set remote description"
   */
  async handleAnswer(sdp: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }
    
    console.log('[UserClient] Handling SDP answer...');
    
    try {
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: sdp
      });
      
      this.updateConnectionState('Connected');
      console.log('[UserClient] SDP answer processed successfully');
      
    } catch (error) {
      console.error('[UserClient] Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Leave meeting and cleanup
   * From dev_specs/APIs.md line 39: "leaveMeeting(): void"
   * From dev_specs/flow_charts.md: Meeting teardown flow
   */
  leaveMeeting(): void {
    console.log('[UserClient] Leaving meeting...');
    
    // Stop audio capture
    // From flow_charts.md line 80: "Close microphone, Stop encoding"
    this.audioCapture.stop();
    
    // Stop audio playback
    // From flow_charts.md: Cleanup audio reception
    this.audioPlayer.stop();
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Close signaling connection
    this.signalingClient.close();
    
    this.isJoined = false;
    this.updateConnectionState('Disconnected');
    
    console.log('[UserClient] Left meeting successfully');
  }

  /**
   * Send RTCP Sender Report
   * From dev_specs/APIs.md line 42: "sendRtcpSr(): void"
   * From dev_specs/flow_charts.md line 74: "RtpSender.sendRtcpSr"
   * 
   * Note: This is handled automatically by WebRTC
   * From public_interfaces.md line 203: "Interval: every 5 seconds"
   * RTCP SR is sent automatically by RTCPeerConnection
   */
  sendRtcpSr(): void {
    // WebRTC automatically sends RTCP Sender Reports
    // This method is provided to match the dev_specs interface
    console.log('[UserClient] RTCP SR is handled automatically by WebRTC');
  }

  /**
   * Compute CRC32 fingerprint of audio frame
   * From dev_specs/APIs.md line 43: "computeCrc32(frame: AudioFrame): string"
   * From dev_specs/flow_charts.md line 66: "UserClient.computeCrc32"
   * 
   * Note: This is for User Story 3 (Real-Time Audio Feedback)
   * NOT IMPLEMENTED in User Story 11
   */
  computeCrc32(_frame: any): string {
    // User Story 3 - Real-Time Audio Feedback
    // Not implemented in User Story 11
    console.warn('[UserClient] computeCrc32 not implemented (User Story 3)');
    return '';
  }

  /**
   * Update connection state and notify listeners
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    console.log(`[UserClient] Connection state: ${state}`);
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state);
    }
  }

  /**
   * Set callback for connection state changes
   */
  setOnConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChange = callback;
  }

  /**
   * Set callback for remote tracks (for receiving audio)
   */
  setOnRemoteTrack(callback: (track: MediaStreamTrack) => void): void {
    this.onRemoteTrack = callback;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if user is in meeting
   */
  isInMeeting(): boolean {
    return this.isJoined;
  }

  /**
   * Get user session info
   * Returns current user's session data
   */
  getUserSession(): UserSession {
    return {
      userId: this.userId,
      pcId: `pc-${this.userId}`,
      qualityTier: 'HIGH', // Default, will be updated by QualityController (User Story 8)
      lastCrc32: '',
      connectionState: this.connectionState,
      timestamp: Date.now()
    };
  }

  /**
   * Get remote audio level (for visual feedback)
   * From testing plan: Audio level indicator
   * Returns value between 0.0 and 1.0
   */
  getRemoteAudioLevel(): number {
    return this.remoteAudioLevel;
  }

  /**
   * Set callback for remote audio level changes
   * Used for updating UI audio level meters
   */
  setOnRemoteAudioLevelChange(callback: (level: number) => void): void {
    this.onRemoteAudioLevelChange = callback;
  }

  /**
   * Start monitoring remote audio level
   * Updates level every 100ms for smooth visual feedback
   */
  private startAudioLevelMonitoring(): void {
    setInterval(() => {
      if (this.audioPlayer.isActive()) {
        const level = this.audioPlayer.getAudioLevel();
        if (Math.abs(level - this.remoteAudioLevel) > 0.01) {
          this.remoteAudioLevel = level;
          
          // Log audio level changes (for testing)
          if (level > 0.1) {
            console.log(`[UserClient] Remote audio level: ${level.toFixed(2)}`);
          }
          
          // Notify callback
          if (this.onRemoteAudioLevelChange) {
            this.onRemoteAudioLevelChange(level);
          }
        }
      } else {
        if (this.remoteAudioLevel > 0) {
          this.remoteAudioLevel = 0;
          if (this.onRemoteAudioLevelChange) {
            this.onRemoteAudioLevelChange(0);
          }
        }
      }
    }, 100); // Update every 100ms for smooth animation
  }

  /**
   * Check if receiving remote audio
   */
  isReceivingAudio(): boolean {
    return this.audioPlayer.isActive();
  }

  /**
   * Set remote audio volume
   * @param volume - Volume between 0.0 and 1.0
   */
  setRemoteAudioVolume(volume: number): void {
    this.audioPlayer.setVolume(volume);
  }

  /**
   * Get remote audio volume
   */
  getRemoteAudioVolume(): number {
    return this.audioPlayer.getVolume();
  }

  /**
   * Get local audio level (from microphone)
   * For Phase 4 testing: Verify microphone is capturing audio
   */
  getLocalAudioLevel(): number {
    return this.audioCapture.getAudioLevel();
  }

  /**
   * Get WebRTC peer connection stats
   * For Phase 4 testing: Verify RTP packet transmission/reception
   */
  async getPeerConnectionStats(): Promise<Map<string, RTCStatsReport>> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not established');
    }
    return await this.peerConnection.getStats();
  }
}

