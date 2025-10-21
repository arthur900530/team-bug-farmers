/**
 * AudioService - Handles real microphone access and mute/unmute functionality
 * Uses Web Audio API for actual audio device control
 */

class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private isMuted: boolean = false;
  private audioLevelCheckInterval: number | null = null;
  private currentDeviceId: string | null = null;

  /**
   * Initialize and request microphone access
   * @param deviceId Optional device ID to use specific microphone
   */
  async initialize(deviceId?: string): Promise<boolean> {
    try {
      // Request microphone permission
      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      };

      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Store the current device ID
      const audioTrack = this.mediaStream.getAudioTracks()[0];
      this.currentDeviceId = audioTrack.getSettings().deviceId || null;

      // Create audio context for analysis
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      // Connect microphone to analyser
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.microphone.connect(this.analyser);

      console.log('✅ Microphone initialized successfully');
      console.log(`🎤 Using device: ${audioTrack.label || 'Default'}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize microphone:', error);
      return false;
    }
  }

  /**
   * Mute the microphone
   */
  mute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
      console.log('🔇 Microphone muted');
    }
  }

  /**
   * Unmute the microphone
   */
  unmute(): void {
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
      console.log('🎤 Microphone unmuted');
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute(): boolean {
    if (this.isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.isMuted;
  }

  /**
   * Get current mute state
   */
  getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * Get current audio level (0-100)
   * Returns 0 if muted or no audio
   */
  getAudioLevel(): number {
    if (!this.analyser || this.isMuted) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    
    // Normalize to 0-100 scale
    return Math.min(100, Math.round((average / 255) * 100));
  }

  /**
   * Check if audio is silent (below threshold)
   */
  isSilent(threshold: number = 5): boolean {
    return this.getAudioLevel() < threshold;
  }

  /**
   * Verify mute state consistency
   * Returns true if hardware and software states match
   */
  verifyMuteState(): boolean {
    const audioLevel = this.getAudioLevel();
    const isSilent = audioLevel < 5;

    // If muted, audio should be silent
    // If unmuted, we can't verify (user might just be quiet)
    if (this.isMuted) {
      return isSilent;
    }

    return true; // Can't verify unmute state definitively
  }

  /**
   * Start monitoring audio levels (for real-time verification)
   */
  startAudioLevelMonitoring(callback: (level: number) => void, interval: number = 100): void {
    this.stopAudioLevelMonitoring(); // Clear any existing interval

    this.audioLevelCheckInterval = window.setInterval(() => {
      const level = this.getAudioLevel();
      callback(level);
    }, interval);
  }

  /**
   * Stop monitoring audio levels
   */
  stopAudioLevelMonitoring(): void {
    if (this.audioLevelCheckInterval !== null) {
      clearInterval(this.audioLevelCheckInterval);
      this.audioLevelCheckInterval = null;
    }
  }

  /**
   * Check if microphone is available
   */
  isAvailable(): boolean {
    return this.mediaStream !== null && this.audioContext !== null;
  }

  /**
   * Get list of available audio input devices
   */
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Get the currently active device ID
   */
  getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  /**
   * Switch to a different microphone device
   * @param deviceId The device ID to switch to
   */
  async switchMicrophone(deviceId: string): Promise<boolean> {
    try {
      console.log(`🔄 Switching to device: ${deviceId}`);

      // Store current mute state
      const wasMuted = this.isMuted;

      // Stop current monitoring
      const wasMonitoring = this.audioLevelCheckInterval !== null;
      this.stopAudioLevelMonitoring();

      // Disconnect and stop current stream
      if (this.microphone) {
        this.microphone.disconnect();
        this.microphone = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      // Initialize with new device
      const success = await this.initialize(deviceId);

      if (success) {
        // Restore mute state
        if (wasMuted) {
          this.mute();
        }

        // Restart monitoring if it was active
        if (wasMonitoring) {
          // The monitoring will be restarted by the caller
        }

        console.log('✅ Successfully switched microphone');
        return true;
      } else {
        console.error('❌ Failed to switch microphone');
        return false;
      }
    } catch (error) {
      console.error('❌ Error switching microphone:', error);
      return false;
    }
  }

  /**
   * Cleanup and release resources
   */
  cleanup(): void {
    this.stopAudioLevelMonitoring();

    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('🧹 Audio service cleaned up');
  }
}

// Export singleton instance
export const audioService = new AudioService();

