/**
 * Backend Server Entry Point
 * 
 * This server implements User Story 11: Establishing Initial Audio Connection
 * From dev_specs/user_stories.md lines 5-12
 * 
 * Components:
 * - SignalingServer: Handles WebSocket signaling
 * - MeetingRegistry: Manages meeting state
 * - MediasoupManager: Manages mediasoup Worker and Router (SFU core)
 * - StreamForwarder: Routes RTP packets (STUB - placeholder for mediasoup)
 */

import { SignalingServer } from './SignalingServer';
import { MeetingRegistry } from './MeetingRegistry';
import { MediasoupManager } from './MediasoupManager';
import { StreamForwarder } from './StreamForwarder';
import { RtcpCollector } from './RtcpCollector';
import { QualityController } from './QualityController';

// Configuration
const WS_PORT = parseInt(process.env.WS_PORT || '8080');

// Initialize components
console.log('===========================================');
console.log('🚀 Starting WebRTC Signaling Server');
console.log('===========================================');
console.log(`WebSocket Port: ${WS_PORT}`);
console.log(`Implementation: User Story 11 - Initial Audio Connection`);
console.log('===========================================');

// Initialize components
(async () => {
  try {
    // Create MeetingRegistry (from dev_specs/classes.md M2.2)
    const meetingRegistry = new MeetingRegistry();

    // Create MediasoupManager (from dev_specs/tech_stack.md line 25: mediasoup SFU)
    const mediasoupManager = new MediasoupManager();
    await mediasoupManager.initialize();
    console.log('✅ Mediasoup initialized');

    // Create StreamForwarder (from dev_specs/classes.md M2.3)
    // Integrated with mediasoup for RTP packet forwarding
    const streamForwarder = new StreamForwarder(meetingRegistry, mediasoupManager);

    // User Story 8: Create RTCP Collector and Quality Controller
    // From dev_specs/classes.md C2.4.1: RtcpCollector
    const rtcpCollector = new RtcpCollector(meetingRegistry);
    
    // From dev_specs/classes.md C2.4.2: QualityController
    const qualityController = new QualityController(rtcpCollector, streamForwarder, meetingRegistry);
    console.log('✅ User Story 8 components initialized (RtcpCollector, QualityController)');

    // Create SignalingServer (from dev_specs/classes.md M2.1)
    const signalingServer = new SignalingServer(
      WS_PORT,
      meetingRegistry,
      mediasoupManager,
      streamForwarder,
      rtcpCollector,
      qualityController
    );

    console.log('✅ Server ready for WebSocket connections');
    console.log(`   Connect at: ws://localhost:${WS_PORT}`);
    console.log('===========================================\n');

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      signalingServer.close();
      await mediasoupManager.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('[Server] Failed to initialize:', error);
    process.exit(1);
  }
})();

