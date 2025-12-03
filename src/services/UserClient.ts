/**
 * UserClient - REFACTORED to use mediasoup-client
 * 
 * This replaces the manual WebRTC (RTCPeerConnection) approach with mediasoup-client Device API
 * Key changes:
 * - No more SDP/ICE handling (handled by mediasoup-client)
 * - No more manual SSRC management (handled by mediasoup-client)
 * - Cleaner separation: SignalingClient for WebSocket, MediasoupClient for WebRTC
 */

import { SignalingClient } from './SignalingClient';
import { AudioCapture } from './AudioCapture';
import { AudioPlayer } from './AudioPlayer';
import { MediasoupClient } from './MediasoupClient';
import type { ConnectionState, RtcpReport } from '../types';
// import type { FingerprintMessage } from '../types';
// import CRC32 from 'crc-32';

export class UserClient {
  private userId: string;
  private meetingId: string;
  private displayName: string;
  
  // Core components
  private signalingClient: SignalingClient;
  private audioCapture: AudioCapture;
  private audioPlayer: AudioPlayer;
  private mediasoupClient: MediasoupClient | null = null;
  
  // State
  private connectionState: ConnectionState = 'Disconnected';
  private isJoined: boolean = false;
  private remoteAudioLevel: number = 0;
  
  // Callbacks for state updates
  private onConnectionStateChange?: (state: ConnectionState) => void;
  private onRemoteTrack?: (track: MediaStreamTrack) => void;
  private onRemoteAudioLevelChange?: (level: number) => void;
  
  // User Story 3: Fingerprint sending state
  // private _frameIdMap: Map<string, { timestamp: number; rtpTimestamp: number }> = new Map();
  private fingerprintInterval: NodeJS.Timeout | null = null;
  private activeSenders: Map<string, { senderUserId: string; receiverInterval: NodeJS.Timeout }> = new Map();
  
  // User Story 8: RTCP reporting state
  private rtcpReportingInterval: NodeJS.Timeout | null = null;
  private onTierChangeCallback?: (tier: 'LOW' | 'MEDIUM' | 'HIGH') => void;
  
  // RTP delivery feedback callback
  private onRtpStatsCallback?: (stats: { lossPct: number; jitterMs: number; rttMs: number; packetsSent: number; packetsReceived: number }) => void;

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
   * Join meeting and establish mediasoup connection
   */
  async joinMeeting(): Promise<void> {
    console.log(`[UserClient] Joining meeting ${this.meetingId}...`);
    
    try {
      // Step 1: Connect to signaling server
      this.updateConnectionState('Connecting');
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
      console.log(`[UserClient] Step 1: Connecting to WebSocket: ${wsUrl}`);
      await this.signalingClient.connect(wsUrl);
      console.log('[UserClient] Step 1: ✅ WebSocket connected');
      
      // Step 2: Send JOIN message
      this.updateConnectionState('Signaling');
      console.log('[UserClient] Step 2: Sending JOIN message...');
      this.signalingClient.sendJoin(this.meetingId, this.userId, this.displayName);
      
      // Step 3: Wait for JOINED response
      console.log('[UserClient] Step 3: Waiting for JOINED response...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Join timeout'));
        }, 10000);
        
        this.signalingClient.onJoined((joinedMsg) => {
          clearTimeout(timeout);
          if (joinedMsg.success) {
            console.log(`[UserClient] Step 3: ✅ Joined meeting with ${joinedMsg.participants.length} participants`);
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
      
      // Step 4: Initialize mediasoup Device
      console.log('[UserClient] Step 4: Initializing mediasoup Device...');
      this.mediasoupClient = new MediasoupClient(
        this.userId,
        this.meetingId,
        this.signalingClient,
        this.audioCapture
      );
      
      await this.mediasoupClient.initialize();
      console.log('[UserClient] Step 4: ✅ mediasoup Device initialized');
      
      // Step 5: Setup callbacks BEFORE producing to avoid race conditions
      // CRITICAL: Set up onNewProducer callback BEFORE starting production
      // This ensures we can receive notifications about existing producers immediately
      this.signalingClient.onNewProducer = async (producerUserId, producerId) => {
        console.log(`[UserClient] 🎤 New producer detected: ${producerId} from ${producerUserId}`);
        if (producerUserId !== this.userId && this.mediasoupClient) {
          try {
            await this.mediasoupClient.consume(producerUserId, producerId);
            console.log(`[UserClient] ✅ Successfully consuming from ${producerUserId}`);
          } catch (error) {
            console.error(`[UserClient] ❌ Failed to consume from ${producerUserId}:`, error);
          }
        }
      };
      
      // Setup other callbacks
      this.mediasoupClient.onTrack((track, producerUserId) => {
        console.log(`[UserClient] 🎵🎵🎵 Received track from user ${producerUserId}`);
        this.handleRemoteTrack(track, producerUserId);
      });
      
      this.mediasoupClient.onConnectionStateChange((state) => {
        console.log(`[UserClient] mediasoup connection state: ${state}`);
        if (state === 'connected') {
          // Don't downgrade from 'Streaming' to 'Connected'
          // 'Streaming' is the final successful state
          if (this.connectionState !== 'Streaming') {
            this.updateConnectionState('Connected');
          }
        } else if (state === 'failed' || state === 'disconnected') {
          this.updateConnectionState('Disconnected');
        }
      });
      
      // Step 6: Start producing audio (callback is already set up above)
      console.log('[UserClient] Step 5: Starting audio production...');
      this.updateConnectionState('Offering');
      await this.mediasoupClient.startProducing();
      console.log('[UserClient] Step 5: ✅ Audio production started');
      
      // Step 7: Connection established and streaming
      this.updateConnectionState('Streaming');
      console.log('[UserClient] ✅✅✅ Join meeting completed successfully - Now streaming!');
      
      // Start fingerprinting and RTCP reporting
      this.startFingerprintSending();
      this.startRtcpReporting();
      
    } catch (error) {
      console.error('[UserClient] ❌❌❌ Failed to join meeting:', error);
      this.updateConnectionState('Disconnected');
      throw error;
    }
  }

  /**
   * Handle received remote track
   */
  private handleRemoteTrack(track: MediaStreamTrack, producerUserId: string): void {
    console.log(`[UserClient] 🎵 Handling remote track: ${track.kind} from ${producerUserId}`);
    console.log(`[UserClient] Track ID: ${track.id}, enabled: ${track.enabled}, muted: ${track.muted}`);
    
    if (track.kind === 'audio') {
      // Play audio through AudioPlayer
      console.log(`[UserClient] 🔊 Starting audio playback for track ${track.id}`);
      this.audioPlayer.play(track);
      
      // Start receiver fingerprint sending
      this.startReceiverFingerprintSending(producerUserId, track.id);
      
      // Notify UI
      if (this.onRemoteTrack) {
        console.log(`[UserClient] Notifying UI about remote track`);
        this.onRemoteTrack(track);
      } else {
        console.warn(`[UserClient] ⚠️ No onRemoteTrack callback set!`);
      }
    }
  }

  /**
   * Leave meeting and cleanup
   */
  leaveMeeting(): void {
    console.log('[UserClient] Leaving meeting...');
    
    // Stop fingerprinting and RTCP
    this.stopFingerprintSending();
    this.stopRtcpReporting();
    
    // Close mediasoup
    if (this.mediasoupClient) {
      this.mediasoupClient.close();
      this.mediasoupClient = null;
    }
    
    // Close signaling
    this.signalingClient.close();
    
    // Stop audio
    this.audioPlayer.stop();
    
    this.isJoined = false;
    this.updateConnectionState('Disconnected');
    
    console.log('[UserClient] Left meeting');
  }

  /**
   * Start sender fingerprint sending
   */
  private startFingerprintSending(): void {
    if (this.fingerprintInterval) {
      return; // Already started
    }

    console.log('[UserClient] Starting sender fingerprint transmission...');
    
    this.fingerprintInterval = setInterval(() => {
      // For now, fingerprinting is optional since we're focusing on audio playback
      // const frame = this.audioCapture.getLatestFrame?.();
      // if (frame && frame.samples.length > 0) {
      //   this.sendSenderFingerprint(frame);
      // }
    }, 100); // Every 100ms
  }

  /**
   * Stop fingerprint sending
   */
  private stopFingerprintSending(): void {
    if (this.fingerprintInterval) {
      clearInterval(this.fingerprintInterval);
      this.fingerprintInterval = null;
    }
    
    // Stop all receiver fingerprint intervals
    for (const [_trackId, senderInfo] of this.activeSenders) {
      clearInterval(senderInfo.receiverInterval);
    }
    this.activeSenders.clear();
  }

  /**
   * Send sender fingerprint
   * Disabled for now - focusing on audio playback
   */
  // private _sendSenderFingerprint(frame: { samples: Float32Array; timestamp: number }): void {
  //   const frameId = this.generateFrameId();
  //   const crc32Value = CRC32.buf(new Uint8Array(frame.samples.buffer));
  //   
  //   // Convert CRC32 to hex string
  //   const crc32Hex = (crc32Value >>> 0).toString(16).padStart(8, '0');
  //   
  //   const fingerprintMsg: FingerprintMessage = {
  //     type: 'frame-fingerprint',
  //     frameId,
  //     crc32: crc32Hex,
  //     senderUserId: this.userId,
  //     timestamp: Date.now()
  //   };
  //   
  //   this.signalingClient.sendFingerprint(fingerprintMsg);
  // }

  /**
   * Start receiver fingerprint sending for a specific sender
   */
  private startReceiverFingerprintSending(senderUserId: string, trackId: string): void {
    if (this.activeSenders.has(trackId)) {
      return; // Already started for this track
    }

    console.log(`[UserClient] Starting receiver fingerprint for sender ${senderUserId}, track ${trackId}`);
    
    const receiverInterval = setInterval(() => {
      // In mediasoup-client, we don't have direct access to RTP timestamps
      // For now, send receiver fingerprints based on decoded audio
      this.sendReceiverFingerprint(senderUserId, trackId);
    }, 100);
    
    this.activeSenders.set(trackId, { senderUserId, receiverInterval });
  }

  /**
   * Send receiver fingerprint
   */
  private sendReceiverFingerprint(_senderUserId: string, _trackId: string): void {
    // Get decoded audio frame from AudioPlayer
    // const decodedFrame = this.audioPlayer.getLatestFrame?.();
    // if (!decodedFrame || decodedFrame.samples.length === 0) {
    //   return;
    // }
    // 
    // const frameId = this.generateFrameId();
    // const crc32Value = CRC32.buf(new Uint8Array(decodedFrame.samples.buffer));
    // const crc32Hex = (crc32Value >>> 0).toString(16).padStart(8, '0');
    // 
    // const fingerprintMsg: FingerprintMessage = {
    //   type: 'frame-fingerprint',
    //   frameId,
    //   crc32: crc32Hex,
    //   receiverUserId: this.userId,
    //   senderUserId: senderUserId,
    //   timestamp: Date.now()
    // };
    // 
    // this.signalingClient.sendFingerprint(fingerprintMsg);
  }

  /**
   * Generate unique frame ID
   * Disabled for now - focusing on audio playback
   */
  // private generateFrameId(): string {
  //   return `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  // }

  /**
   * Start RTCP reporting (User Story 8)
   */
  private startRtcpReporting(): void {
    if (this.rtcpReportingInterval) {
      return;
    }

    console.log('[UserClient] Starting RTCP reporting...');
    
    // For mediasoup-client, we can get stats from transport
    this.rtcpReportingInterval = setInterval(async () => {
      try {
        await this.sendRtcpReport();
      } catch (error) {
        console.error('[UserClient] Failed to send RTCP report:', error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Stop RTCP reporting
   */
  private stopRtcpReporting(): void {
    if (this.rtcpReportingInterval) {
      clearInterval(this.rtcpReportingInterval);
      this.rtcpReportingInterval = null;
    }
  }

  /**
   * Send RTCP report with real stats from mediasoup transport
   */
  private async sendRtcpReport(): Promise<void> {
    let stats = { lossPct: 0, jitterMs: 0, rttMs: 0, packetsSent: 0, packetsReceived: 0 };
    
    // Get real stats from mediasoup transport
    if (this.mediasoupClient) {
      stats = await this.mediasoupClient.getStats();
    }
    
    const report: RtcpReport = {
      userId: this.userId,
      lossPct: stats.lossPct,
      jitterMs: stats.jitterMs,
      rttMs: stats.rttMs,
      timestamp: Date.now()
    };
    
    this.signalingClient.sendRtcpReport(report);
    
    // Notify UI callback with full stats
    if (this.onRtpStatsCallback) {
      this.onRtpStatsCallback(stats);
    }
  }

  /**
   * Start audio level monitoring
   */
  private startAudioLevelMonitoring(): void {
    setInterval(() => {
      const level = this.audioPlayer.getAudioLevel();
      if (level !== this.remoteAudioLevel) {
        this.remoteAudioLevel = level;
        if (this.onRemoteAudioLevelChange) {
          this.onRemoteAudioLevelChange(level);
        }
      }
    }, 100);
  }

  /**
   * Update connection state
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    console.log(`[UserClient] Connection state: ${state}`);
    
    if (this.onConnectionStateChange) {
      this.onConnectionStateChange(state);
    }
  }

  // ===== Public API for UI callbacks =====
  
  setOnConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChange = callback;
  }

  setOnRemoteTrack(callback: (track: MediaStreamTrack) => void): void {
    this.onRemoteTrack = callback;
  }

  setOnRemoteAudioLevelChange(callback: (level: number) => void): void {
    this.onRemoteAudioLevelChange = callback;
  }

  setOnTierChange(callback: (tier: 'LOW' | 'MEDIUM' | 'HIGH') => void): void {
    this.onTierChangeCallback = callback;
    
    // Listen for tier change messages from server
    this.signalingClient.onTierChange((tierStr) => {
      const tier = tierStr as 'LOW' | 'MEDIUM' | 'HIGH';
      console.log(`[UserClient] Tier changed to: ${tier}`);
      if (this.onTierChangeCallback) {
        this.onTierChangeCallback(tier);
      }
    });
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getRemoteAudioLevel(): number {
    return this.remoteAudioLevel;
  }

  isConnected(): boolean {
    return this.isJoined && this.connectionState === 'Connected';
  }

  /**
   * Set callback for RTP stats updates (packet delivery feedback)
   */
  setOnRtpStats(callback: (stats: { lossPct: number; jitterMs: number; rttMs: number; packetsSent: number; packetsReceived: number }) => void): void {
    this.onRtpStatsCallback = callback;
  }
}

