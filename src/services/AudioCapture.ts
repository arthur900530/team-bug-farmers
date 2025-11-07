/**
 * AudioCapture - From dev_specs/APIs.md lines 49-56
 * Purpose: Captures microphone input and provides PCM frames for encoding
 * 
 * From dev_specs/flow_charts.md line 58:
 * "AudioCapture.start → Open microphone"
 * 
 * From dev_specs/tech_stack.md line 15:
 * "Audio I/O: Web Audio API - Microphone capture and speaker playback"
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - start(): Promise<MediaStream>
 * - stop(): void
 * - readFrame(): PCMFrame
 * 
 * Implementation Note:
 * This uses the Web Audio API (getUserMedia) to capture microphone audio.
 * In a full WebRTC implementation, the MediaStream is added to RTCPeerConnection,
 * which handles encoding and RTP transmission automatically.
 */

import type { PCMFrame } from '../types';

/**
 * AudioProcessor interface (from dev_specs/classes.md)
 * Base interface for audio processing components
 */
export interface AudioProcessor {
  process(data: any): any;
}

/**
 * AudioCapture implementation
 * From dev_specs/classes.md M1.1.1 (C1.1.1)
 */
export class AudioCapture implements AudioProcessor {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isCapturing: boolean = false;

  /**
   * Start audio capture from microphone
   * From dev_specs/APIs.md line 53: "start(): Promise<MediaStream>"
   * From dev_specs/flow_charts.md line 58: "AudioCapture.start - Open microphone"
   * 
   * Returns MediaStream that can be added to RTCPeerConnection
   */
  async start(): Promise<MediaStream> {
    console.log('[AudioCapture] Starting microphone capture...');

    try {
      // Request microphone access
      // From tech_stack.md line 15: "Web Audio API"
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Opus codec will be configured in RTCPeerConnection
          // From tech_stack.md line 16: "Opus + Simulcast (16/32/64 kbps)"
        },
        video: false
      });

      // Create audio context for analysis
      // This allows us to implement readFrame() if needed
      this.audioContext = new AudioContext({
        sampleRate: 48000 // Opus standard sample rate
      });

      // Create source node from microphone stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create analyser node for PCM frame extraction
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048; // Will provide 1024 samples
      
      // Connect nodes
      this.sourceNode.connect(this.analyserNode);

      this.isCapturing = true;
      console.log('[AudioCapture] Microphone capture started successfully');
      console.log(`[AudioCapture] Sample rate: ${this.audioContext.sampleRate} Hz`);

      return this.mediaStream;

    } catch (error) {
      console.error('[AudioCapture] Failed to access microphone:', error);
      throw new Error(`Microphone access denied: ${error}`);
    }
  }

  /**
   * Stop audio capture
   * From dev_specs/APIs.md line 54: "stop(): void"
   * From dev_specs/flow_charts.md line 80: "Close microphone, Stop encoding"
   */
  stop(): void {
    console.log('[AudioCapture] Stopping microphone capture...');

    if (this.mediaStream) {
      // Stop all tracks in the media stream
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log(`[AudioCapture] Stopped track: ${track.kind}`);
      });
      this.mediaStream = null;
    }

    // Disconnect and close audio nodes
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isCapturing = false;
    console.log('[AudioCapture] Microphone capture stopped');
  }

  /**
   * Read a PCM frame from the audio stream
   * From dev_specs/APIs.md line 55: "readFrame(): PCMFrame"
   * From dev_specs/flow_charts.md line 59: "AudioCapture.readFrame - Get PCM frame 20ms"
   * 
   * Returns PCM audio data at the current moment
   * From dev_specs/data_schemas.md: PCMFrame structure
   * 
   * Note: In practice, with WebRTC, the browser handles frame extraction.
   * This method is provided to match the dev_specs interface.
   */
  readFrame(): PCMFrame {
    if (!this.analyserNode || !this.audioContext) {
      throw new Error('[AudioCapture] Cannot read frame: capture not started');
    }

    // Get time domain data (PCM samples)
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(dataArray);

    // From dev_specs/data_schemas.md: PCMFrame structure
    const pcmFrame: PCMFrame = {
      samples: dataArray,
      sampleRate: this.audioContext.sampleRate,
      channels: 1 // Mono audio
    };

    return pcmFrame;
  }

  /**
   * AudioProcessor.process implementation
   * From dev_specs/classes.md: AudioProcessor interface
   * 
   * Generic processing method - can be used for custom audio processing
   */
  process(data: any): any {
    // In this implementation, processing is handled by Web Audio API
    // This method can be extended for custom audio processing if needed
    return data;
  }

  /**
   * Get the current MediaStream
   * Useful for adding to RTCPeerConnection
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /**
   * Check if capture is active
   */
  isActive(): boolean {
    return this.isCapturing && this.mediaStream !== null;
  }

  /**
   * Get audio level (for UI feedback)
   * Returns volume level between 0.0 and 1.0
   */
  getAudioLevel(): number {
    if (!this.analyserNode) {
      return 0;
    }

    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(dataArray);

    // Calculate RMS (root mean square) for volume level
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);

    return Math.min(rms * 10, 1.0); // Normalize to 0-1
  }
}

