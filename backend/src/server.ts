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

import http from 'http';
import https from 'https';
import fs from 'fs';
import { SignalingServer } from './SignalingServer';
import { MeetingRegistry } from './MeetingRegistry';
import { MediasoupManager } from './MediasoupManager';
import { StreamForwarder } from './StreamForwarder';
import { RtcpCollector } from './RtcpCollector';
import { QualityController } from './QualityController';

// Configuration
const WS_PORT = parseInt(process.env.WS_PORT || '8080');
const USE_SSL = process.env.USE_SSL === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './certs/cert.pem';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './certs/key.pem';

// Initialize components
console.log('===========================================');
console.log('🚀 Starting WebRTC Signaling Server');
console.log('===========================================');
console.log(`WebSocket Port: ${WS_PORT}`);
console.log(`SSL/TLS: ${USE_SSL ? 'Enabled' : 'Disabled'}`);
console.log(`Implementation: User Story 11 - Initial Audio Connection`);
console.log('===========================================');

// Initialize components
(async () => {
  try {
    // Define request handler for HTTP/HTTPS server
    const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          service: 'webrtc-signaling-server',
          ssl: USE_SSL
        }));
      } else {
        // Default 404 handler
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    };

    // Create HTTP or HTTPS server
    let httpServer: http.Server | https.Server;
    
    if (USE_SSL) {
      console.log('🔒 Configuring SSL/TLS...');
      try {
        // Check if certificate files exist
        if (!fs.existsSync(SSL_CERT_PATH)) {
          throw new Error(`SSL certificate not found at: ${SSL_CERT_PATH}`);
        }
        if (!fs.existsSync(SSL_KEY_PATH)) {
          throw new Error(`SSL key not found at: ${SSL_KEY_PATH}`);
        }
        
        const sslOptions = {
          cert: fs.readFileSync(SSL_CERT_PATH),
          key: fs.readFileSync(SSL_KEY_PATH)
        };
        httpServer = https.createServer(sslOptions, requestHandler);
        console.log('✅ SSL certificates loaded successfully');
        console.log(`   Certificate: ${SSL_CERT_PATH}`);
        console.log(`   Key: ${SSL_KEY_PATH}`);
      } catch (error) {
        console.error('❌ Failed to load SSL certificates:', error);
        console.error('   Falling back to HTTP (insecure)');
        httpServer = http.createServer(requestHandler);
      }
    } else {
      console.log('⚠️  Running without SSL (HTTP only - not recommended for production)');
      httpServer = http.createServer(requestHandler);
    }
    
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
      httpServer,
      meetingRegistry,
      mediasoupManager,
      streamForwarder,
      rtcpCollector,
      qualityController
    );

    // Start HTTP/HTTPS server
    httpServer.listen(WS_PORT, () => {
      const protocol = USE_SSL ? 'wss' : 'ws';
      console.log('✅ Server ready for WebSocket connections');
      console.log(`   Connect at: ${protocol}://localhost:${WS_PORT}`);
      console.log('===========================================\n');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\n[Server] Shutting down gracefully...');
      signalingServer.close();
      httpServer.close(() => {
        console.log('[Server] HTTP/HTTPS server closed');
      });
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

