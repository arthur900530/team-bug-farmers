/**
 * MediasoupClient - Wrapper for mediasoup-client Device API
 * Handles WebRTC transport, producers, and consumers using mediasoup-client library
 */

import * as mediasoupClient from 'mediasoup-client';
import type { Device } from 'mediasoup-client';
import { SignalingClient } from './SignalingClient';
import { AudioCapture } from './AudioCapture';

type Transport = any; // mediasoup-client Transport type
type Producer = any; // mediasoup-client Producer type
type Consumer = any; // mediasoup-client Consumer type

export class MediasoupClient {
  private signalingClient: SignalingClient;
  private audioCapture: AudioCapture;
  
  private device: Device | null = null;
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  
  // private _userId: string;
  // private _meetingId: string;
  
  // Callbacks
  private onTrackCallback?: (track: MediaStreamTrack, producerUserId: string) => void;
  private onConnectionStateChangeCallback?: (state: string) => void;

  constructor(userId: string, _meetingId: string, signalingClient: SignalingClient, audioCapture: AudioCapture) {
    // this._userId = userId;
    // this._meetingId = meetingId;
    this.signalingClient = signalingClient;
    this.audioCapture = audioCapture;
    
    console.log('[MediasoupClient] Created for user', userId);
  }

  /**
   * Initialize mediasoup Device and load router capabilities
   */
  async initialize(): Promise<void> {
    console.log('[MediasoupClient] Initializing...');
    
    // Create Device
    this.device = new mediasoupClient.Device();
    console.log('[MediasoupClient] Device created');
    
    // Request router RTP capabilities from server
    const rtpCapabilities = await this.requestRouterCapabilities();
    console.log('[MediasoupClient] Router capabilities received');
    
    // Load capabilities into device
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    console.log('[MediasoupClient] Device loaded with router capabilities');
    console.log('[MediasoupClient] Can produce audio:', this.device.canProduce('audio'));
  }

  /**
   * Request router RTP capabilities from server
   */
  private async requestRouterCapabilities(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for router capabilities'));
      }, 10000);

      // Send request
      this.signalingClient.send({
        type: 'getRouterRtpCapabilities'
      });

      // Set callback on SignalingClient
      (this.signalingClient as any).onRouterCapabilities = (rtpCapabilities: any) => {
        clearTimeout(timeout);
        resolve(rtpCapabilities);
      };
    });
  }

  /**
   * Create send transport and start producing audio
   */
  async startProducing(): Promise<void> {
    console.log('[MediasoupClient] Starting audio production...');
    
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Create send transport
    console.log('[MediasoupClient] Creating send transport...');
    this.sendTransport = await this.createSendTransport();
    console.log('[MediasoupClient] Send transport created');

    // Get microphone stream
    const mediaStream = await this.audioCapture.start();
    const audioTrack = mediaStream.getAudioTracks()[0];
    
    if (!audioTrack) {
      throw new Error('No audio track available');
    }

    console.log('[MediasoupClient] Creating producer...');
    
    // Create producer
    this.producer = await this.sendTransport.produce({
      track: audioTrack,
      codecOptions: {
        opusStereo: true,
        opusDtx: true,
        opusFec: true,
        opusMaxPlaybackRate: 48000
      }
    });

    console.log('[MediasoupClient] ✅ Producer created:', this.producer.id);
    
    // Handle producer events
    this.producer.on('transportclose', () => {
      console.log('[MediasoupClient] Producer transport closed');
    });

    this.producer.on('trackended', () => {
      console.log('[MediasoupClient] Producer track ended');
    });
  }

  /**
   * Create send transport
   */
  private async createSendTransport(): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Request transport from server
    const transportParams = await this.requestTransportCreation();
    
    console.log('[MediasoupClient] Creating WebRTC send transport...');
    const transport = this.device.createSendTransport(transportParams);

    // Handle 'connect' event - fired when transport needs to establish connection
    transport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        console.log('[MediasoupClient] Send transport connecting...');
        
        // Send DTLS parameters to server
        this.signalingClient.send({
          type: 'connectWebRtcTransport',
          dtlsParameters
        });

        // Wait for server confirmation
        await this.waitForTransportConnected();
        
        callback();
        console.log('[MediasoupClient] Send transport connected');
      } catch (error) {
        console.error('[MediasoupClient] Error connecting send transport:', error);
        errback(error as Error);
      }
    });

    // Handle 'produce' event - fired when transport wants to send media
    transport.on('produce', async ({ kind, rtpParameters }: any, callback: any, errback: any) => {
      try {
        console.log('[MediasoupClient] Producing', kind);
        
        // Tell server to create Producer
        this.signalingClient.send({
          type: 'produce',
          kind,
          rtpParameters
        });

        // Wait for producer ID from server
        const producerId = await this.waitForProduced();
        
        callback({ id: producerId });
        console.log('[MediasoupClient] Producer created on server:', producerId);
      } catch (error) {
        console.error('[MediasoupClient] Error producing:', error);
        errback(error as Error);
      }
    });

    transport.on('connectionstatechange', (state: any) => {
      console.log('[MediasoupClient] Send transport connection state:', state);
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }
    });

    return transport;
  }

  /**
   * Request transport creation from server
   */
  private async requestTransportCreation(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for transport creation'));
      }, 10000);

      this.signalingClient.send({
        type: 'createWebRtcTransport'
      });

      // Wait for response
      (this.signalingClient as any).onTransportCreated = (params: any) => {
        clearTimeout(timeout);
        resolve({
          id: params.transportId,
          iceParameters: params.iceParameters,
          iceCandidates: params.iceCandidates,
          dtlsParameters: params.dtlsParameters
        });
      };
    });
  }

  /**
   * Wait for transport connected confirmation
   */
  private async waitForTransportConnected(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for transport connected'));
      }, 10000);

      (this.signalingClient as any).onTransportConnected = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  }

  /**
   * Wait for produced confirmation with producer ID
   */
  private async waitForProduced(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for produced'));
      }, 10000);

      (this.signalingClient as any).onProduced = (producerId: string) => {
        clearTimeout(timeout);
        resolve(producerId);
      };
    });
  }

  /**
   * Consume audio from a remote producer
   */
  async consume(producerUserId: string, producerId: string): Promise<void> {
    console.log(`[MediasoupClient] Consuming from producer ${producerId} (user: ${producerUserId})`);
    
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Create receive transport if not exists
    if (!this.recvTransport) {
      console.log('[MediasoupClient] Creating receive transport...');
      this.recvTransport = await this.createRecvTransport();
      console.log('[MediasoupClient] Receive transport created');
    }

    // Request to consume from server
    const consumerParams = await this.requestConsume(producerUserId, producerId);
    
    // Create consumer
    const consumer = await this.recvTransport.consume({
      id: consumerParams.id,
      producerId: consumerParams.producerId,
      kind: consumerParams.kind,
      rtpParameters: consumerParams.rtpParameters
    });

    this.consumers.set(producerId, consumer);
    
    console.log('[MediasoupClient] ✅ Consumer created:', consumer.id);
    console.log('[MediasoupClient] Consumer track:', consumer.track.kind, consumer.track.id);

    // Resume consumer (some configs create paused)
    await this.signalingClient.send({
      type: 'resumeConsumer',
      consumerId: consumer.id
    });

    // Notify callback with track
    if (this.onTrackCallback) {
      this.onTrackCallback(consumer.track, producerUserId);
    }

    // Handle consumer events
    consumer.on('transportclose', () => {
      console.log('[MediasoupClient] Consumer transport closed:', consumer.id);
      this.consumers.delete(producerId);
    });

    consumer.on('trackended', () => {
      console.log('[MediasoupClient] Consumer track ended:', consumer.id);
    });
  }

  /**
   * Create receive transport
   */
  private async createRecvTransport(): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Request transport from server (reuse same method)
    const transportParams = await this.requestTransportCreation();
    
    console.log('[MediasoupClient] Creating WebRTC receive transport...');
    const transport = this.device.createRecvTransport(transportParams);

    // Handle 'connect' event
    transport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
      try {
        console.log('[MediasoupClient] Receive transport connecting...');
        
        this.signalingClient.send({
          type: 'connectWebRtcTransport',
          dtlsParameters
        });

        await this.waitForTransportConnected();
        
        callback();
        console.log('[MediasoupClient] Receive transport connected');
      } catch (error) {
        console.error('[MediasoupClient] Error connecting receive transport:', error);
        errback(error as Error);
      }
    });

    transport.on('connectionstatechange', (state: any) => {
      console.log('[MediasoupClient] Receive transport connection state:', state);
    });

    return transport;
  }

  /**
   * Request to consume from server
   */
  private async requestConsume(_producerUserId: string, _producerId: string): Promise<any> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for consume response'));
      }, 10000);

      this.signalingClient.send({
        type: 'consume',
        producerUserId: _producerUserId,
        rtpCapabilities: this.device!.rtpCapabilities
      });

      (this.signalingClient as any).onConsumed = (params: any) => {
        clearTimeout(timeout);
        resolve(params);
      };
    });
  }

  /**
   * Set callback for received tracks
   */
  onTrack(callback: (track: MediaStreamTrack, producerUserId: string) => void): void {
    this.onTrackCallback = callback;
  }

  /**
   * Set callback for connection state changes
   */
  onConnectionStateChange(callback: (state: string) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  /**
   * Get transport stats for RTP delivery feedback
   * Returns packet loss, jitter, and RTT from WebRTC stats
   */
  async getStats(): Promise<{ lossPct: number; jitterMs: number; rttMs: number; packetsReceived: number; packetsSent: number }> {
    const stats = {
      lossPct: 0,
      jitterMs: 0,
      rttMs: 0,
      packetsReceived: 0,
      packetsSent: 0
    };

    try {
      // Get send transport stats (for outgoing audio)
      if (this.sendTransport) {
        const sendStats = await this.sendTransport.getStats();
        for (const report of sendStats.values()) {
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            stats.packetsSent = report.packetsSent || 0;
          }
          if (report.type === 'remote-inbound-rtp' && report.kind === 'audio') {
            // Remote reports contain loss and RTT info
            stats.lossPct = report.fractionLost || 0;
            stats.rttMs = report.roundTripTime ? report.roundTripTime * 1000 : 0;
            stats.jitterMs = report.jitter ? report.jitter * 1000 : 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            // RTT from ICE candidate pair
            if (report.currentRoundTripTime) {
              stats.rttMs = report.currentRoundTripTime * 1000;
            }
          }
        }
      }

      // Get receive transport stats (for incoming audio)
      if (this.recvTransport) {
        const recvStats = await this.recvTransport.getStats();
        for (const report of recvStats.values()) {
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            stats.packetsReceived = report.packetsReceived || 0;
            stats.jitterMs = report.jitter ? report.jitter * 1000 : stats.jitterMs;
            
            // Calculate loss from packets lost vs received
            if (report.packetsLost && report.packetsReceived) {
              const total = report.packetsLost + report.packetsReceived;
              stats.lossPct = total > 0 ? report.packetsLost / total : 0;
            }
          }
        }
      }
    } catch (error) {
      console.error('[MediasoupClient] Error getting stats:', error);
    }

    return stats;
  }

  /**
   * Cleanup
   */
  async close(): Promise<void> {
    console.log('[MediasoupClient] Closing...');
    
    if (this.producer) {
      this.producer.close();
    }
    
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();
    
    if (this.sendTransport) {
      this.sendTransport.close();
    }
    
    if (this.recvTransport) {
      this.recvTransport.close();
    }
    
    this.audioCapture.stop();
    
    console.log('[MediasoupClient] Closed');
  }
}

