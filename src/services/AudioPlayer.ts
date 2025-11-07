/**
 * AudioPlayer - From dev_specs/classes.md M1.3.2 (C1.3.2)
 * Purpose: Plays decoded PCM audio to speakers
 * 
 * From dev_specs/flow_charts.md line 102:
 * "AudioPlayer.play - PCMFrame to speakers"
 * 
 * From dev_specs/tech_stack.md line 15:
 * "Audio I/O: Web Audio API - Microphone capture and speaker playback"
 * 
 * Implementation Note:
 * With WebRTC, audio decoding is handled automatically by the browser.
 * This component receives MediaStreamTrack from RTCPeerConnection.ontrack
 * and plays it through speakers using Web Audio API or HTMLAudioElement.
 * 
 * The dev_specs define AudioDecoder separately, but WebRTC handles decoding
 * automatically, so we receive already-decoded audio tracks.
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
 * AudioPlayer implementation
 * From dev_specs/classes.md M1.3.2 (C1.3.2)
 */
export class AudioPlayer implements AudioProcessor {
  private audioContext: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying: boolean = false;
  private currentTrack: MediaStreamTrack | null = null;

  /**
   * Play audio from MediaStreamTrack
   * From dev_specs/flow_charts.md line 102: "AudioPlayer.play - PCMFrame to speakers"
   * 
   * With WebRTC, we receive MediaStreamTrack which contains decoded audio.
   * This method creates a MediaStream and plays it through speakers.
   * 
   * @param track - MediaStreamTrack from RTCPeerConnection.ontrack
   */
  async play(track: MediaStreamTrack): Promise<void> {
    console.log('[AudioPlayer] Starting audio playback...');
    console.log(`[AudioPlayer] Track ID: ${track.id}`);
    console.log(`[AudioPlayer] Track enabled: ${track.enabled}`);
    console.log(`[AudioPlayer] Track muted: ${track.muted}`);

    try {
      // Stop any existing playback
      this.stop();

      // Store current track
      this.currentTrack = track;

      // Create MediaStream from track
      this.mediaStream = new MediaStream([track]);

      // Create audio context for analysis and volume control
      // From tech_stack.md line 15: "Web Audio API"
      this.audioContext = new AudioContext({
        sampleRate: 48000 // Opus standard sample rate
      });

      // Create source node from media stream
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0; // Full volume

      // Create analyser node for audio level monitoring
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;

      // Connect nodes: source → gain → analyser → destination (speakers)
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      // Also create HTMLAudioElement as fallback/alternative
      // This provides additional browser compatibility
      this.audioElement = new Audio();
      this.audioElement.srcObject = this.mediaStream;
      this.audioElement.autoplay = true;
      this.audioElement.volume = 1.0;

      // Handle audio element events
      this.audioElement.onplay = () => {
        console.log('[AudioPlayer] HTMLAudioElement playback started');
        this.isPlaying = true;
      };

      this.audioElement.onpause = () => {
        console.log('[AudioPlayer] HTMLAudioElement playback paused');
        this.isPlaying = false;
      };

      this.audioElement.onerror = (error) => {
        console.error('[AudioPlayer] HTMLAudioElement error:', error);
      };

      // Play audio element
      try {
        await this.audioElement.play();
        console.log('[AudioPlayer] Audio playback started successfully');
        console.log(`[AudioPlayer] Sample rate: ${this.audioContext.sampleRate} Hz`);
        this.isPlaying = true;
      } catch (playError) {
        console.warn('[AudioPlayer] Autoplay prevented, user interaction required:', playError);
        // Audio will play when user interacts with page
      }

      // Monitor track state changes
      track.onended = () => {
        console.log('[AudioPlayer] Remote audio track ended');
        this.stop();
      };

      track.onmute = () => {
        console.log('[AudioPlayer] Remote audio track muted');
      };

      track.onunmute = () => {
        console.log('[AudioPlayer] Remote audio track unmuted');
      };

    } catch (error) {
      console.error('[AudioPlayer] Failed to start playback:', error);
      throw error;
    }
  }

  /**
   * Stop audio playback
   * From dev_specs/flow_charts.md: Cleanup when track ends
   */
  stop(): void {
    console.log('[AudioPlayer] Stopping audio playback...');

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.srcObject = null;
      this.audioElement = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
      });
      this.mediaStream = null;
    }

    this.currentTrack = null;
    this.isPlaying = false;
    console.log('[AudioPlayer] Audio playback stopped');
  }

  /**
   * Get current audio level (for visual feedback)
   * Returns volume level between 0.0 and 1.0
   * 
   * This provides the audio level indicator mentioned in testing plan
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

    // Normalize to 0-1 range and apply smoothing
    const level = Math.min(rms * 10, 1.0);
    return level;
  }

  /**
   * Set volume level
   * @param volume - Volume between 0.0 and 1.0
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
      console.log(`[AudioPlayer] Volume set to ${volume}`);
    }

    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current volume level
   */
  getVolume(): number {
    if (this.gainNode) {
      return this.gainNode.gain.value;
    }
    return 1.0;
  }

  /**
   * AudioProcessor.process implementation
   * From dev_specs/classes.md: AudioProcessor interface
   * 
   * Note: With WebRTC, processing is handled by the browser.
   * This method is provided to match the interface.
   */
  process(data: any): any {
    // In this implementation, processing is handled by WebRTC and Web Audio API
    return data;
  }

  /**
   * Check if audio is currently playing
   */
  isActive(): boolean {
    return this.isPlaying && this.currentTrack !== null && this.currentTrack.readyState === 'live';
  }

  /**
   * Get current MediaStreamTrack
   */
  getCurrentTrack(): MediaStreamTrack | null {
    return this.currentTrack;
  }

  /**
   * Get audio context (for advanced audio processing if needed)
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

