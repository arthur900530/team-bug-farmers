/**
 * Audio Packet Verification Module
 * 
 * Purpose: Inspects raw audio data packets from frontend to verify mute status
 * This provides backend-side verification independent of Web Audio API
 * 
 * Architecture: WebSocket receives Float32Array audio samples → Analyze for silence
 * Storage: Verification results persisted to SQLite database
 */

import { WebSocketServer } from 'ws';
import { createOrUpdateUserState, getUserState } from './database.js';

// Audio analysis thresholds
const SILENCE_THRESHOLD = 0.01;  // Audio level below 1% = silence
const VERIFICATION_WINDOW_MS = 1000;  // Analyze 1 second of audio data

/**
 * Audio Packet Verifier
 * Maintains per-user audio stream analysis
 */
class AudioPacketVerifier {
  constructor() {
    // Store audio data buffers per user (in-memory only - not persisted)
    // Map<userId, { samples: Float32Array[], lastUpdate: timestamp }>
    this.userAudioBuffers = new Map();
    
    // Verification results are now persisted to database (no in-memory cache)
    
    console.log('✅ Audio Packet Verifier initialized (with SQLite persistence)');
  }

  /**
   * Process incoming audio samples from frontend
   * @param {string} userId - User identifier
   * @param {Float32Array} audioData - Raw audio samples from Web Audio API
   */
  processAudioSamples(userId, audioData) {
    // Initialize buffer for new user
    if (!this.userAudioBuffers.has(userId)) {
      this.userAudioBuffers.set(userId, {
        samples: [],
        lastUpdate: Date.now()
      });
    }

    const buffer = this.userAudioBuffers.get(userId);
    
    // Add samples to buffer
    buffer.samples.push(audioData);
    buffer.lastUpdate = Date.now();

    // Keep only last 1 second of data (assuming 44.1kHz sample rate)
    const maxSamples = Math.ceil(44100 / audioData.length);  // ~1 second
    if (buffer.samples.length > maxSamples) {
      buffer.samples = buffer.samples.slice(-maxSamples);
    }

    // Perform verification analysis
    const isVerifiedMuted = this.analyzeForSilence(buffer.samples);
    
    // Persist result to database
    try {
      const currentState = getUserState(userId);
      if (currentState) {
        createOrUpdateUserState({
          userId: currentState.userId,
          username: currentState.username,
          isMuted: currentState.isMuted,
          verifiedMuted: currentState.verifiedMuted,
          packetVerifiedMuted: isVerifiedMuted,
          packetVerifiedAt: new Date().toISOString(),
          deviceId: currentState.deviceId,
          deviceLabel: currentState.deviceLabel,
          roomId: currentState.roomId
        });
      }
    } catch (error) {
      console.error(`Error persisting packet verification for ${userId}:`, error);
    }

    console.log(`🎤 User ${userId}: Packet analysis = ${isVerifiedMuted ? 'MUTED ✓' : 'ACTIVE'} (persisted to DB)`);
    
    return isVerifiedMuted;
  }

  /**
   * Analyze audio samples for silence
   * @param {Float32Array[]} sampleArrays - Array of audio sample buffers
   * @returns {boolean} - True if silent (muted), false if audio detected
   */
  analyzeForSilence(sampleArrays) {
    if (sampleArrays.length === 0) {
      return true;  // No data = assume muted
    }

    let totalEnergy = 0;
    let sampleCount = 0;

    // Calculate RMS (Root Mean Square) energy across all samples
    for (const samples of sampleArrays) {
      for (let i = 0; i < samples.length; i++) {
        totalEnergy += samples[i] * samples[i];
        sampleCount++;
      }
    }

    const rmsLevel = Math.sqrt(totalEnergy / sampleCount);
    
    // Normalize to 0-1 range (assuming Float32 audio data is -1 to 1)
    const normalizedLevel = rmsLevel;

    console.log(`   📊 Audio RMS level: ${(normalizedLevel * 100).toFixed(2)}%`);

    // Return true if below silence threshold
    return normalizedLevel < SILENCE_THRESHOLD;
  }

  /**
   * Get verification result for user from database
   * @param {string} userId 
   * @returns {{packetVerifiedMuted: boolean | null, packetVerifiedAt: string | null} | null}
   */
  getVerificationResult(userId) {
    try {
      const userState = getUserState(userId);
      
      if (!userState || !userState.packetVerifiedAt) {
        return null;
      }

      // Check if result is stale (>5 seconds old)
      const lastVerified = new Date(userState.packetVerifiedAt).getTime();
      const age = Date.now() - lastVerified;
      if (age > 5000) {
        console.warn(`⚠️  User ${userId}: Verification result is stale (${age}ms old)`);
        return null;
      }

      return {
        packetVerifiedMuted: userState.packetVerifiedMuted,
        packetVerifiedAt: userState.packetVerifiedAt
      };
    } catch (error) {
      console.error(`Error fetching verification result for ${userId}:`, error);
      return null;
    }
  }

  /**
   * Clean up old user data
   * Call this periodically to prevent memory leaks
   * Note: Only audio buffers are in-memory; verification results are in database
   */
  cleanup() {
    const now = Date.now();
    const TIMEOUT_MS = 30000;  // 30 seconds

    // Remove inactive users' audio buffers
    for (const [userId, buffer] of this.userAudioBuffers.entries()) {
      if (now - buffer.lastUpdate > TIMEOUT_MS) {
        this.userAudioBuffers.delete(userId);
        console.log(`🧹 Cleaned up inactive user audio buffer: ${userId}`);
      }
    }
    
    // Verification results remain in database (no cleanup needed here)
  }
}

/**
 * Initialize WebSocket server for audio packet streaming
 * @param {http.Server} httpServer - Express HTTP server
 * @returns {AudioPacketVerifier} - Verifier instance
 */
export function initializePacketVerifier(httpServer) {
  const verifier = new AudioPacketVerifier();

  // Create WebSocket server attached to HTTP server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/audio-stream'
  });

  console.log('🔌 WebSocket server initialized on /audio-stream');

  // Handle WebSocket connections
  wss.on('connection', (ws, req) => {
    let userId = null;

    console.log('📡 New WebSocket connection');

    ws.on('message', (data) => {
      try {
        // Parse message: { type, userId, audioData }
        const message = JSON.parse(data.toString());

        if (message.type === 'auth') {
          // User authentication
          userId = message.userId;
          console.log(`✅ User authenticated: ${userId}`);
          ws.send(JSON.stringify({ type: 'auth_success', userId }));
          return;
        }

        if (message.type === 'audio_samples') {
          if (!userId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }

          // Convert array back to Float32Array
          const audioData = new Float32Array(message.samples);
          
          // Process samples
          const isVerifiedMuted = verifier.processAudioSamples(userId, audioData);

          // Send verification result back
          ws.send(JSON.stringify({
            type: 'verification_result',
            userId,
            isVerifiedMuted,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      console.log(`📴 WebSocket closed for user: ${userId || 'unknown'}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Periodic cleanup
  setInterval(() => {
    verifier.cleanup();
  }, 10000);  // Every 10 seconds

  return verifier;
}

export default AudioPacketVerifier;

