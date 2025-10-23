/**
 * Audio Stream Service
 * 
 * Purpose: Stream raw audio samples to backend via WebSocket for packet verification
 * This provides backend-side verification independent from Web Audio API mute check
 * 
 * Architecture: Web Audio API → ScriptProcessorNode → WebSocket → Backend
 */

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/audio-stream';

interface VerificationResult {
  type: 'verification_result';
  userId: string;
  isVerifiedMuted: boolean;
  timestamp: number;
}

/**
 * Audio Stream Manager
 * Handles WebSocket connection and audio sample streaming
 */
class AudioStreamService {
  private ws: WebSocket | null = null;
  private userId: string | null = null;
  private isAuthenticated = false;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isStreaming = false;

  // Callback for verification results from backend
  private onVerificationCallback: ((result: boolean) => void) | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket already connected');
        resolve();
        return;
      }

      console.log(`🔌 Connecting to WebSocket: ${WS_URL}`);
      this.userId = userId;

      try {
        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          // Authenticate with backend
          this.ws?.send(JSON.stringify({
            type: 'auth',
            userId: this.userId
          }));
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'auth_success') {
              console.log(`✅ Authenticated as ${message.userId}`);
              this.isAuthenticated = true;
              resolve();
            }

            if (message.type === 'verification_result') {
              const result = message as VerificationResult;
              console.log(`📊 Packet verification: ${result.isVerifiedMuted ? 'MUTED ✓' : 'ACTIVE'}`);
              
              // Call registered callback
              if (this.onVerificationCallback) {
                this.onVerificationCallback(result.isVerifiedMuted);
              }
            }

            if (message.type === 'error') {
              console.error('❌ WebSocket error:', message.message);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('📴 WebSocket disconnected');
          this.isAuthenticated = false;
          this.stopStreaming();
        };

      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Start streaming audio samples to backend
   */
  async startStreaming(mediaStream: MediaStream): Promise<void> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call connect() first.');
    }

    if (this.isStreaming) {
      console.warn('⚠️  Already streaming');
      return;
    }

    console.log('🎤 Starting audio stream...');

    try {
      // Create audio context if needed
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Create source from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(mediaStream);

      // Create script processor (deprecated but widely supported)
      // Buffer size: 4096 samples, 1 input channel, 1 output channel
      this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

      // Process audio samples
      this.scriptProcessor.onaudioprocess = (event) => {
        if (!this.isStreaming) return;

        // Get audio data from input buffer
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to regular array for JSON serialization
        const samples = Array.from(inputData);

        // Send to backend via WebSocket
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'audio_samples',
            samples: samples,
            timestamp: Date.now()
          }));
        }
      };

      // Connect nodes: source → processor → destination
      this.sourceNode.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);

      this.isStreaming = true;
      console.log('✅ Audio streaming started');

    } catch (error) {
      console.error('Error starting audio stream:', error);
      throw error;
    }
  }

  /**
   * Stop streaming audio
   */
  stopStreaming(): void {
    if (!this.isStreaming) return;

    console.log('🛑 Stopping audio stream...');

    // Disconnect nodes
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    this.isStreaming = false;
    console.log('✅ Audio streaming stopped');
  }

  /**
   * Register callback for verification results
   */
  onVerification(callback: (isVerifiedMuted: boolean) => void): void {
    this.onVerificationCallback = callback;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopStreaming();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isAuthenticated = false;
    console.log('✅ WebSocket disconnected');
  }

  /**
   * Check if currently streaming
   */
  isActive(): boolean {
    return this.isStreaming && this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const audioStreamService = new AudioStreamService();

export default audioStreamService;

