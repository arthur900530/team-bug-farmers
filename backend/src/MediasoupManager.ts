/**
 * MediasoupManager - Manages mediasoup Worker and Router
 * 
 * From dev_specs/tech_stack.md line 25:
 * "Server - SFU Core: mediasoup / Janus / Pion - Selective Forwarding Unit (audio routing)"
 * 
 * From dev_specs/architecture.md lines 64-65:
 * "UA == RTP: Audio (Low/Med/High tiers) ==> FWD"
 * "FWD == RTP: Selected tier only ==> UB"
 * 
 * From dev_specs/public_interfaces.md lines 197-199:
 * - 3 simulcast tiers (LOW/MEDIUM/HIGH)
 * - Opus codec
 * - Bitrates: 16/32/64 kbps
 * 
 * Purpose:
 * - Create and manage mediasoup Worker
 * - Create Router for audio routing
 * - Provide transports for clients
 * - Handle Producer/Consumer for RTP forwarding
 */

import * as mediasoup from 'mediasoup';
import type {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
  WebRtcTransportOptions,
  RouterOptions
} from 'mediasoup/node/lib/types';

/**
 * MediasoupManager
 * Manages mediasoup Worker and Router lifecycle
 */
export class MediasoupManager {
  private worker: Worker | null = null;
  private router: Router | null = null;
  
  // Track transports per user
  // From dev_specs: Each client needs send and recv transports
  private transports: Map<string, { send: WebRtcTransport; recv: WebRtcTransport }> = new Map();
  
  // Track producers per user (audio sender)
  private producers: Map<string, Producer> = new Map();
  
  // Track consumers: Map<consumerId, Consumer>
  private consumers: Map<string, Consumer> = new Map();

  /**
   * Initialize mediasoup Worker and Router
   * From dev_specs/tech_stack.md: mediasoup for SFU core
   */
  async initialize(): Promise<void> {
    console.log('[MediasoupManager] Initializing mediasoup...');
    
    try {
      // Create Worker
      // Worker is a separate process that handles media processing
      this.worker = await mediasoup.createWorker({
        logLevel: 'warn',
        logTags: [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
        ],
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
      });

      console.log(`[MediasoupManager] Worker created (PID: ${this.worker.pid})`);

      // Handle Worker errors
      this.worker.on('died', () => {
        console.error('[MediasoupManager] Worker died, exiting process');
        setTimeout(() => process.exit(1), 2000);
      });

      // Create Router
      // Router handles RTP packet routing between producers and consumers
      // From dev_specs/public_interfaces.md: Opus codec, 48kHz
      // From dev_specs/public_interfaces.md line 220: Opus payload type 111
      const mediaCodecs: RtpCodecCapability[] = [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
          preferredPayloadType: 111, // From dev_specs/public_interfaces.md line 220
          parameters: {
            // From dev_specs/public_interfaces.md line 198:
            // "Opus + Simulcast (16/32/64 kbps)"
            useinbandfec: 1,
            usedtx: 1,
          },
        },
      ];

      this.router = await this.worker.createRouter({
        mediaCodecs,
      } as RouterOptions);

      console.log(`[MediasoupManager] Router created (ID: ${this.router.id})`);
      console.log('[MediasoupManager] Initialization complete');
    } catch (error) {
      console.error('[MediasoupManager] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Create WebRTC transports for a client
   * From dev_specs/public_interfaces.md lines 139-146: Signaling flow with SDP
   * 
   * Each client needs two transports:
   * - Send transport: for sending RTP (Producer)
   * - Recv transport: for receiving RTP (Consumer)
   */
  async createTransports(userId: string): Promise<{
    sendTransport: {
      id: string;
      iceParameters: any;
      iceCandidates: any;
      dtlsParameters: any;
    };
    recvTransport: {
      id: string;
      iceParameters: any;
      iceCandidates: any;
      dtlsParameters: any;
    };
  }> {
    if (!this.router) {
      throw new Error('Router not initialized');
    }

    console.log(`[MediasoupManager] Creating transports for user ${userId}`);

    // Transport options
    // From dev_specs: ICE, DTLS for secure RTP
    const transportOptions: WebRtcTransportOptions = {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1', // Use public IP in production
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };

    // Create send transport (for Producer)
    const sendTransport = await this.router.createWebRtcTransport(transportOptions);
    
    // Create recv transport (for Consumer)
    const recvTransport = await this.router.createWebRtcTransport(transportOptions);

    // Store transports
    this.transports.set(userId, { send: sendTransport, recv: recvTransport });

    console.log(`[MediasoupManager] Transports created for user ${userId}`);
    console.log(`  - Send transport: ${sendTransport.id}`);
    console.log(`  - Recv transport: ${recvTransport.id}`);

    // Return transport parameters for client SDP
    return {
      sendTransport: {
        id: sendTransport.id,
        iceParameters: sendTransport.iceParameters,
        iceCandidates: sendTransport.iceCandidates,
        dtlsParameters: sendTransport.dtlsParameters,
      },
      recvTransport: {
        id: recvTransport.id,
        iceParameters: recvTransport.iceParameters,
        iceCandidates: recvTransport.iceCandidates,
        dtlsParameters: recvTransport.dtlsParameters,
      },
    };
  }

  /**
   * Connect transport with DTLS parameters from client
   * Called when client sends DTLS parameters
   */
  async connectTransport(
    userId: string,
    transportType: 'send' | 'recv',
    dtlsParameters: any
  ): Promise<void> {
    const transports = this.transports.get(userId);
    if (!transports) {
      throw new Error(`No transports found for user ${userId}`);
    }

    const transport = transportType === 'send' ? transports.send : transports.recv;
    
    await transport.connect({ dtlsParameters });
    
    console.log(`[MediasoupManager] ${transportType} transport connected for user ${userId}`);
  }

  /**
   * Create Producer for audio sender
   * From dev_specs/flow_charts.md line 73: "RTP packets → StreamForwarder - All 3 tiers"
   * From dev_specs/public_interfaces.md: 3 simulcast tiers
   */
  async createProducer(
    userId: string,
    transportId: string,
    rtpParameters: any
  ): Promise<{ id: string }> {
    const transports = this.transports.get(userId);
    if (!transports || transports.send.id !== transportId) {
      throw new Error(`Send transport not found for user ${userId}`);
    }

    console.log(`[MediasoupManager] Creating producer for user ${userId}`);

    // Create producer with simulcast
    // From dev_specs/public_interfaces.md lines 197-199:
    // "3 simulcast tiers (LOW/MEDIUM/HIGH) - Opus frames at 16/32/64 kbps"
    const producer = await transports.send.produce({
      kind: 'audio',
      rtpParameters,
      // Note: Simulcast for audio is configured on client side via SDP
      // mediasoup will receive all 3 layers and we can select which to forward
    });

    this.producers.set(userId, producer);

    console.log(`[MediasoupManager] Producer created for user ${userId} (ID: ${producer.id})`);

    return { id: producer.id };
  }

  /**
   * Create Consumer for audio receiver
   * From dev_specs/architecture.md line 65: "FWD == RTP: Selected tier only ==> UB"
   * From dev_specs/classes.md line 306: "Forward selected tier based on worst receiver"
   */
  async createConsumer(
    receiverUserId: string,
    senderUserId: string,
    rtpCapabilities: any
  ): Promise<{
    id: string;
    producerId: string;
    kind: string;
    rtpParameters: any;
  } | null> {
    const receiverTransports = this.transports.get(receiverUserId);
    if (!receiverTransports) {
      throw new Error(`Recv transport not found for user ${receiverUserId}`);
    }

    const producer = this.producers.get(senderUserId);
    if (!producer) {
      console.warn(`[MediasoupManager] No producer found for sender ${senderUserId}`);
      return null;
    }

    // Check if router can consume this producer
    if (!this.router?.canConsume({ producerId: producer.id, rtpCapabilities })) {
      console.warn(`[MediasoupManager] Cannot consume producer ${producer.id}`);
      return null;
    }

    console.log(`[MediasoupManager] Creating consumer: ${senderUserId} → ${receiverUserId}`);

    // Create consumer
    const consumer = await receiverTransports.recv.consume({
      producerId: producer.id,
      rtpCapabilities,
      paused: false, // Start receiving immediately
    });

    this.consumers.set(consumer.id, consumer);

    console.log(`[MediasoupManager] Consumer created (ID: ${consumer.id})`);

    return {
      id: consumer.id,
      producerId: producer.id,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  /**
   * Get Producer for a user
   */
  getProducer(userId: string): Producer | undefined {
    return this.producers.get(userId);
  }

  /**
   * Get all Producers in a meeting (for forwarding)
   */
  getAllProducers(): Producer[] {
    return Array.from(this.producers.values());
  }

  /**
   * Get Router RTP capabilities
   * Needed for client to generate offer
   */
  getRouterRtpCapabilities(): any {
    if (!this.router) {
      throw new Error('Router not initialized');
    }
    return this.router.rtpCapabilities;
  }

  /**
   * Cleanup transports and producers for a user
   * Called when user leaves meeting
   */
  async cleanupUser(userId: string): Promise<void> {
    console.log(`[MediasoupManager] Cleaning up user ${userId}`);

    // Close producer
    const producer = this.producers.get(userId);
    if (producer) {
      producer.close();
      this.producers.delete(userId);
      console.log(`[MediasoupManager] Producer closed for user ${userId}`);
    }

    // Close transports
    const transports = this.transports.get(userId);
    if (transports) {
      transports.send.close();
      transports.recv.close();
      this.transports.delete(userId);
      console.log(`[MediasoupManager] Transports closed for user ${userId}`);
    }

    // Close consumers for this user
    for (const [consumerId, consumer] of this.consumers.entries()) {
      // Note: We need to track which consumers belong to which user
      // For now, we'll close all consumers when a user leaves
      // In production, maintain a userId → consumerId mapping
      consumer.close();
      this.consumers.delete(consumerId);
    }
  }

  /**
   * Shutdown mediasoup
   */
  async shutdown(): Promise<void> {
    console.log('[MediasoupManager] Shutting down mediasoup...');

    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
    this.consumers.clear();

    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();

    // Close all transports
    for (const transports of this.transports.values()) {
      transports.send.close();
      transports.recv.close();
    }
    this.transports.clear();

    // Close router
    if (this.router) {
      this.router.close();
      this.router = null;
    }

    // Close worker
    if (this.worker) {
      this.worker.close();
      this.worker = null;
    }

    console.log('[MediasoupManager] Shutdown complete');
  }
}

