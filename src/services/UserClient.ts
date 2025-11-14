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
import type { ConnectionState, UserSession, PCMFrame, FingerprintMessage, RtcpReport } from '../types';
import CRC32 from 'crc-32';

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
  
  // User Story 3: Fingerprint sending state
  // Store frameId with RTP timestamp for matching (from USER_STORY_3_TECHNICAL_DECISIONS.md)
  private frameIdMap: Map<string, { timestamp: number; rtpTimestamp: number }> = new Map();
  private fingerprintInterval: NodeJS.Timeout | null = null;
  // Track which senders we're receiving from (for receiver fingerprints)
  private activeSenders: Map<string, { senderUserId: string; receiverInterval: NodeJS.Timeout }> = new Map();
  
  // User Story 8: RTCP reporting state
  // From dev_specs/public_interfaces.md line 203: "Interval: every 5 seconds"
  private rtcpReportingInterval: NodeJS.Timeout | null = null;
  // Callback for tier changes
  private onTierChangeCallback?: (tier: 'LOW' | 'MEDIUM' | 'HIGH') => void;

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
          
          // User Story 3: Start sending receiver fingerprints
          // From flow_charts.md lines 104-106: Receiver computes CRC32 on decoded frame
          // Extract senderUserId from track ID or SSRC (approximation)
          // In a real implementation, we'd get this from signaling or RTP stats
          // For now, we'll use a placeholder - this should be improved to get actual senderUserId
          const trackId = event.track.id;
          const senderUserId = this.extractSenderUserIdFromTrack(trackId, Array.from(event.streams));
          
          if (senderUserId) {
            this.startReceiverFingerprintSending(senderUserId);
          } else {
            console.warn('[UserClient] Could not determine senderUserId for receiver fingerprints');
          }
          
          // User Story 8: Start RTCP reporting when receiving audio
          // From dev_specs/flow_charts.md lines 108-112: RTCP report generation
          // From dev_specs/public_interfaces.md line 203: "Interval: every 5 seconds"
          this.startRtcpReporting();
          
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
    
    // User Story 8: Listen for tier change messages
    // From dev_specs/flow_charts.md line 154: "SignalingServer.notify Tier change to all participants"
    this.signalingClient.onTierChange((tier: string) => {
      const qualityTier = tier as 'LOW' | 'MEDIUM' | 'HIGH';
      console.log(`[UserClient] Tier changed to: ${qualityTier}`);
      if (this.onTierChangeCallback) {
        this.onTierChangeCallback(qualityTier);
      }
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
    
    // User Story 3: Start sending sender fingerprints
    // From flow_charts.md lines 66-76: Compute CRC32 and send fingerprints
    this.startFingerprintSending();
    
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
    
    // User Story 3: Stop sending fingerprints
    if (this.fingerprintInterval) {
      clearInterval(this.fingerprintInterval);
      this.fingerprintInterval = null;
    }
    
    // Cleanup fingerprint state
    this.frameIdMap.clear();
    
    // Stop all receiver fingerprint sending intervals
    this.activeSenders.forEach((senderInfo) => {
      clearInterval(senderInfo.receiverInterval);
    });
    this.activeSenders.clear();
    
    // User Story 8: Stop RTCP reporting
    this.stopRtcpReporting();
    
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
   * APPROXIMATION: For sender, we compute CRC32 on PCM frames (before encoding)
   * because WebRTC handles encoding internally and we cannot access encoded frames.
   * From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 1
   * 
   * @param frame - PCMFrame (sender: before encoding, receiver: after decoding)
   * @returns CRC32 hash as hex string (8 chars, from data_schemas.md line 102)
   */
  computeCrc32(frame: PCMFrame): string {
    // Convert Float32Array samples to Uint8Array for CRC32 computation
    const samples = frame.samples;
    // Convert Float32Array to Uint8Array (4 bytes per float)
    const uint8Array = new Uint8Array(samples.buffer);
    
    // Compute CRC32 using 'crc-32' library
    // From USER_STORY_3_IMPLEMENTATION_GUIDE.md: Use crc-32 npm package
    const crc32 = CRC32.buf(uint8Array);
    
    // Return hex string (8 chars, uppercase, zero-padded)
    // From data_schemas.md line 102: "crc32: string (hex, 8 chars)"
    return Math.abs(crc32).toString(16).toUpperCase().padStart(8, '0');
  }

  /**
   * Start sending sender fingerprints
   * From flow_charts.md lines 66-76: Compute CRC32 and send fingerprints
   * From USER_STORY_3_IMPLEMENTATION_GUIDE.md: Send fingerprints at frame rate (50 fps = 20ms)
   */
  private startFingerprintSending(): void {
    // Send fingerprints at frame rate (50 fps = 20ms interval)
    // From public_interfaces.md line 198: "20ms Opus frames → 50 packets/sec per tier"
    const FRAME_INTERVAL_MS = 20;
    
    this.fingerprintInterval = setInterval(async () => {
      try {
        // Read PCM frame from AudioCapture
        const pcmFrame = this.audioCapture.readFrame();
        
        // Generate unique frameId (hex, 16 chars, from data_schemas.md line 101)
        const frameId = this.generateFrameId();
        
        // Compute CRC32 on PCM frame (approximation for encoded frame)
        // From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 1
        const crc32 = this.computeCrc32(pcmFrame);
        
        // Get RTP timestamp for frame matching
        const rtpTimestamp = await this.getCurrentRtpTimestamp();
        
        // Store frameId with timestamp for matching (see receiver fingerprints)
        this.frameIdMap.set(frameId, {
          timestamp: Date.now(),
          rtpTimestamp: rtpTimestamp || Date.now() // Fallback to current time
        });
        
        // Cleanup old frameIds (keep last 5 seconds worth)
        this.cleanupOldFrameIds(5000);
        
        // Send via WebSocket (not RTP, per USER_STORY_11_IMPLEMENTATION_GUIDE.md line 401)
        const fingerprint: FingerprintMessage = {
          type: 'frame-fingerprint',
          frameId,
          crc32,
          senderUserId: this.userId,
          timestamp: Date.now(),
          rtpTimestamp: rtpTimestamp || undefined
        };
        
        await this.signalingClient.sendFingerprint(fingerprint);
      } catch (error) {
        console.error('[UserClient] Error sending fingerprint:', error);
      }
    }, FRAME_INTERVAL_MS);
    
    console.log('[UserClient] Started sending sender fingerprints (50 fps)');
  }

  /**
   * Generate unique frame ID (hex, 16 chars)
   * From data_schemas.md line 101: "frameId: string (hex, 16 chars)"
   */
  private generateFrameId(): string {
    // Use timestamp + random to ensure uniqueness
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2);
    return (timestamp + random).substring(0, 16).padStart(16, '0');
  }

  /**
   * Get current RTP timestamp for frame matching
   * Used to match sender fingerprints with receiver fingerprints
   * From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 2
   */
  private async getCurrentRtpTimestamp(): Promise<number | null> {
    if (!this.peerConnection) return null;
    
    try {
      const stats = await this.peerConnection.getStats();
      // Extract RTP timestamp from stats
      // WebRTC stats structure: Map<string, RTCStats>
      for (const [_id, stat] of stats.entries()) {
        if (stat.type === 'outbound-rtp') {
          // RTP timestamp is available in outbound-rtp stats
          // Note: Actual implementation will depend on WebRTC stats structure
          if ('timestamp' in stat) {
            return (stat as any).timestamp as number;
          }
        }
      }
      
      // Fallback: Use current time (approximation)
      return Date.now();
    } catch (error) {
      console.error('[UserClient] Error getting RTP timestamp:', error);
      return null;
    }
  }

  /**
   * Cleanup old frameIds from map (to prevent memory leak)
   */
  private cleanupOldFrameIds(maxAgeMs: number): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.frameIdMap.forEach((data, frameId) => {
      if (now - data.timestamp > maxAgeMs) {
        keysToDelete.push(frameId);
      }
    });
    
    keysToDelete.forEach(key => this.frameIdMap.delete(key));
  }

  /**
   * Find matching sender frameId using RTP timestamp
   * Uses approximation with tolerance to account for packet loss
   * From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 2
   */
  private findMatchingFrameId(rtpTimestamp: number, toleranceMs: number): string | null {
    // Search through recent sender fingerprints
    // Match based on RTP timestamp within tolerance window
    for (const [frameId, frameData] of this.frameIdMap.entries()) {
      const timestampDiff = Math.abs(frameData.rtpTimestamp - rtpTimestamp);
      if (timestampDiff <= toleranceMs) {
        return frameId; // Match found
      }
    }
    return null; // No match found (packet loss)
  }

  /**
   * Send receiver fingerprint for a decoded frame
   * From flow_charts.md lines 104-106: Receiver computes CRC32 on decoded frame
   * From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 2 (RTP timestamp matching)
   * 
   * This method should be called when a decoded PCM frame is available
   * (e.g., from AudioPlayer or Web Audio API processing)
   * 
   * @param decodedFrame - PCMFrame after decoding
   * @param senderUserId - User ID of the sender
   * @param rtpTimestamp - RTP timestamp for frame matching
   */
  private async sendReceiverFingerprint(
    decodedFrame: PCMFrame,
    senderUserId: string,
    rtpTimestamp: number
  ): Promise<void> {
    // Compute CRC32 on decoded frame
    const crc32 = this.computeCrc32(decodedFrame);
    
    // Find matching sender frameId using RTP timestamp (with tolerance)
    // Tolerance accounts for packet loss and network jitter
    const TIMESTAMP_TOLERANCE_MS = 50; // ±50ms window (from USER_STORY_3_TECHNICAL_DECISIONS.md)
    const frameId = this.findMatchingFrameId(rtpTimestamp, TIMESTAMP_TOLERANCE_MS);
    
    if (!frameId) {
      // No matching sender frame found (packet loss or out of window)
      console.warn('[UserClient] No matching sender frame for RTP timestamp:', rtpTimestamp);
      return; // Frame is considered lost (NACK)
    }
    
    // Send via WebSocket
    const fingerprint: FingerprintMessage = {
      type: 'frame-fingerprint',
      frameId, // Matched from sender using RTP timestamp
      crc32,
      receiverUserId: this.userId,
      senderUserId: senderUserId,
      timestamp: Date.now(),
      rtpTimestamp: rtpTimestamp // Include for server-side matching verification
    };
    
    await this.signalingClient.sendFingerprint(fingerprint);
  }

  /**
   * Start sending receiver fingerprints for a specific sender
   * From flow_charts.md lines 104-106: Receiver computes CRC32 on decoded frame
   * From USER_STORY_3_IMPLEMENTATION_GUIDE.md: Send fingerprints at frame rate (50 fps = 20ms)
   */
  private startReceiverFingerprintSending(senderUserId: string): void {
    // Check if we're already sending fingerprints for this sender
    if (this.activeSenders.has(senderUserId)) {
      console.log(`[UserClient] Already sending receiver fingerprints for sender: ${senderUserId}`);
      return;
    }

    // Send fingerprints at frame rate (50 fps = 20ms interval)
    // From public_interfaces.md line 198: "20ms Opus frames → 50 packets/sec per tier"
    const FRAME_INTERVAL_MS = 20;
    
    const receiverInterval = setInterval(async () => {
      try {
        // Read PCM frame from AudioPlayer (decoded audio)
        const decodedFrame = this.audioPlayer.readFrame();
        
        // Get RTP timestamp from WebRTC stats (inbound-rtp)
        const rtpTimestamp = await this.getReceiverRtpTimestamp();
        
        // Send receiver fingerprint
        await this.sendReceiverFingerprint(decodedFrame, senderUserId, rtpTimestamp || Date.now());
      } catch (error) {
        // If readFrame fails, audio might not be ready yet - this is okay
        if (error instanceof Error && error.message.includes('Cannot read frame')) {
          // Audio not ready yet, skip this frame
          return;
        }
        console.error('[UserClient] Error sending receiver fingerprint:', error);
      }
    }, FRAME_INTERVAL_MS);
    
    // Store the interval for cleanup
    this.activeSenders.set(senderUserId, { senderUserId, receiverInterval });
    
    console.log(`[UserClient] Started sending receiver fingerprints for sender: ${senderUserId} (50 fps)`);
  }

  /**
   * Get RTP timestamp from inbound-rtp stats (for receiver)
   * Used to match receiver fingerprints with sender fingerprints
   * From USER_STORY_3_TECHNICAL_DECISIONS.md: Decision 2
   */
  private async getReceiverRtpTimestamp(): Promise<number | null> {
    if (!this.peerConnection) return null;
    
    try {
      const stats = await this.peerConnection.getStats();
      // Extract RTP timestamp from inbound-rtp stats
      for (const [_id, stat] of stats.entries()) {
        if (stat.type === 'inbound-rtp') {
          // RTP timestamp is available in inbound-rtp stats
          // Note: Actual implementation will depend on WebRTC stats structure
          if ('timestamp' in stat) {
            return (stat as any).timestamp as number;
          }
        }
      }
      
      // Fallback: Use current time (approximation)
      return Date.now();
    } catch (error) {
      console.error('[UserClient] Error getting receiver RTP timestamp:', error);
      return null;
    }
  }

  /**
   * Extract senderUserId from track ID or MediaStream
   * This is an approximation - in a real implementation, we'd get this from:
   * 1. Signaling messages (when track is received)
   * 2. RTP stats (SSRC mapping)
   * 3. MediaStream labels
   * 
   * For now, we'll use a placeholder approach
   */
  private extractSenderUserIdFromTrack(_trackId: string, _streams: MediaStream[]): string | null {
    // TODO: Implement proper senderUserId extraction
    // For now, we'll use a simple approach:
    // - Check if we have participant info from signaling
    // - Use track ID as fallback (not ideal, but works for testing)
    
    // In a real implementation, we'd maintain a mapping of:
    // - trackId -> senderUserId (from signaling)
    // - SSRC -> senderUserId (from RTP stats)
    
    // For now, return a placeholder - this should be improved
    // The actual senderUserId should come from the signaling layer
    // when the track is received
    console.warn('[UserClient] extractSenderUserIdFromTrack: Using placeholder - needs proper implementation');
    return 'unknown-sender'; // Placeholder - should be replaced with actual senderUserId
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
  async getPeerConnectionStats(): Promise<RTCStatsReport> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not established');
    }
    return await this.peerConnection.getStats();
  }

  /**
   * Get SignalingClient instance
   * For App.tsx to set up participant update callbacks
   */
  getSignalingClient(): SignalingClient {
    return this.signalingClient;
  }

  /**
   * Extract RTCP metrics from WebRTC stats
   * From dev_specs/flow_charts.md lines 108-112: RTCP report generation
   * From dev_specs/public_interfaces.md: Extract loss%, jitter, RTT from inbound-rtp stats
   * 
   * Returns null if stats are not available (graceful handling per Decision 4)
   */
  private async extractRtcpMetrics(): Promise<RtcpReport | null> {
    if (!this.peerConnection) {
      console.warn('[UserClient] Cannot extract RTCP metrics: peer connection not established');
      return null;
    }

    try {
      const stats = await this.peerConnection.getStats();
      
      // Find inbound-rtp stats (for received audio)
      // From dev_specs/flow_charts.md line 109: "Update reception stats packets received, jitter"
      let inboundRtp: RTCInboundRtpStreamStats | null = null;
      
      for (const [_, stat] of stats.entries()) {
        if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
          inboundRtp = stat as RTCInboundRtpStreamStats;
          break;
        }
      }
      
      if (!inboundRtp) {
        // Stats not available yet (graceful handling per Decision 4)
        console.warn('[UserClient] No inbound-rtp stats available yet');
        return null;
      }
      
      // Extract metrics
      // From dev_specs/flow_charts.md line 111: "Create RtcpReport userId, lossPct, jitterMs, rttMs"
      const packetsReceived = inboundRtp.packetsReceived || 0;
      const packetsLost = inboundRtp.packetsLost || 0;
      const totalPackets = packetsReceived + packetsLost;
      
      // Calculate loss percentage
      // Handle division by zero (if no packets received yet)
      const lossPct = totalPackets > 0 ? packetsLost / totalPackets : 0;
      
      // Extract jitter (in seconds, convert to milliseconds)
      const jitterMs = (inboundRtp.jitter || 0) * 1000;
      
      // Extract RTT (round-trip time)
      // RTT is typically in remote-inbound-rtp stats, but we'll use a fallback
      // For now, we'll use 0 if not available (graceful handling)
      let rttMs = 0;
      
      // Try to find remote-inbound-rtp for RTT
      for (const [_, stat] of stats.entries()) {
        if (stat.type === 'remote-inbound-rtp' && stat.kind === 'audio') {
          const remoteInbound = stat as any;
          if (remoteInbound.roundTripTime !== undefined) {
            rttMs = remoteInbound.roundTripTime * 1000; // Convert to milliseconds
            break;
          }
        }
      }
      
      // If RTT not found, try to estimate from candidate-pair stats
      if (rttMs === 0) {
        for (const [_, stat] of stats.entries()) {
          if (stat.type === 'candidate-pair' && stat.selected) {
            const candidatePair = stat as RTCIceCandidatePairStats;
            if (candidatePair.currentRoundTripTime !== undefined) {
              rttMs = candidatePair.currentRoundTripTime * 1000; // Convert to milliseconds
              break;
            }
          }
        }
      }
      
      const report: RtcpReport = {
        userId: this.userId,
        lossPct,
        jitterMs,
        rttMs,
        timestamp: Date.now(),
      };
      
      return report;
    } catch (error) {
      console.error('[UserClient] Error extracting RTCP metrics:', error);
      return null; // Graceful handling per Decision 4
    }
  }

  /**
   * Send RTCP report to server
   * From dev_specs/flow_charts.md line 112: "Send to RtcpCollector"
   * Skips sending if metrics are null (graceful handling per Decision 4)
   */
  private async sendRtcpReport(): Promise<void> {
    const metrics = await this.extractRtcpMetrics();
    
    if (!metrics) {
      // Skip sending if metrics not available (graceful handling)
      return;
    }
    
    // Send via SignalingClient
    this.signalingClient.sendRtcpReport(metrics);
  }

  /**
   * Start periodic RTCP reporting
   * From dev_specs/public_interfaces.md line 203: "Interval: every 5 seconds"
   * From dev_specs/flow_charts.md lines 108-112: RTCP report generation
   */
  private startRtcpReporting(): void {
    // Don't start if already running
    if (this.rtcpReportingInterval) {
      console.log('[UserClient] RTCP reporting already started');
      return;
    }
    
    // Send initial report immediately
    this.sendRtcpReport().catch((error) => {
      console.error('[UserClient] Error sending initial RTCP report:', error);
    });
    
    // Then send every 5 seconds
    this.rtcpReportingInterval = setInterval(() => {
      this.sendRtcpReport().catch((error) => {
        console.error('[UserClient] Error sending RTCP report:', error);
        // Continue trying on next interval (graceful handling)
      });
    }, 5000);
    
    console.log('[UserClient] Started RTCP reporting (every 5 seconds)');
  }

  /**
   * Stop periodic RTCP reporting
   * Called when leaving meeting
   */
  private stopRtcpReporting(): void {
    if (this.rtcpReportingInterval) {
      clearInterval(this.rtcpReportingInterval);
      this.rtcpReportingInterval = null;
      console.log('[UserClient] Stopped RTCP reporting');
    }
  }

  /**
   * Set callback for tier changes
   * From dev_specs/APIs.md: UserClient should handle tier changes
   * Called by App.tsx to update UI
   */
  setOnTierChange(callback: (tier: 'LOW' | 'MEDIUM' | 'HIGH') => void): void {
    this.onTierChangeCallback = callback;
  }
}

