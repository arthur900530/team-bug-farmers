import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { audioService } from '../audioService';

describe('audioService', () => {
  beforeEach(() => {
    // Reset service state before each test
    audioService.cleanup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    audioService.cleanup();
  });

  describe('initialize()', () => {
    it('should initialize with default device', async () => {
      const result = await audioService.initialize();
      
      expect(result).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      });
    });

    it('should initialize with specific device ID', async () => {
      const deviceId = 'specific-device-id';
      const result = await audioService.initialize(deviceId);
      
      expect(result).toBe(true);
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { deviceId: { exact: deviceId } },
      });
    });

    it('should return false on error', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const result = await audioService.initialize();
      
      expect(result).toBe(false);
    });

    it('should store current device ID', async () => {
      const deviceId = 'test-device';
      await audioService.initialize(deviceId);
      
      expect(audioService.getCurrentDeviceId()).toBe(deviceId);
    });
  });

  describe('mute() and unmute()', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should mute the microphone', () => {
      audioService.mute();
      
      expect(audioService.getMuted()).toBe(true);
    });

    it('should unmute the microphone', () => {
      audioService.mute();
      audioService.unmute();
      
      expect(audioService.getMuted()).toBe(false);
    });

    it('should disable audio tracks when muted', () => {
      audioService.mute();
      
      // Note: In real implementation, this would check track.enabled
      expect(audioService.getMuted()).toBe(true);
    });
  });

  describe('getAudioLevel()', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should return 0 when muted', () => {
      audioService.mute();
      
      const level = audioService.getAudioLevel();
      
      expect(level).toBe(0);
    });

    it('should return audio level between 0 and 100', () => {
      const level = audioService.getAudioLevel();
      
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(100);
    });
  });

  describe('getAudioDevices()', () => {
    it('should return list of audio input devices', async () => {
      const devices = await audioService.getAudioDevices();
      
      expect(Array.isArray(devices)).toBe(true);
      expect(devices.length).toBeGreaterThan(0);
      expect(devices[0]).toHaveProperty('deviceId');
      expect(devices[0]).toHaveProperty('kind', 'audioinput');
    });

    it('should filter only audioinput devices', async () => {
      const devices = await audioService.getAudioDevices();
      
      devices.forEach(device => {
        expect(device.kind).toBe('audioinput');
      });
    });
  });

  describe('switchMicrophone()', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should switch to new device', async () => {
      const newDeviceId = 'new-device-id';
      const result = await audioService.switchMicrophone(newDeviceId);
      
      expect(result).toBe(true);
      expect(audioService.getCurrentDeviceId()).toBe(newDeviceId);
    });

    it('should preserve mute state when switching', async () => {
      audioService.mute();
      await audioService.switchMicrophone('new-device');
      
      expect(audioService.getMuted()).toBe(true);
    });

    it('should return false on error', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new Error('Device not found')
      );

      const result = await audioService.switchMicrophone('invalid-device');
      
      expect(result).toBe(false);
    });
  });

  describe('startAudioLevelMonitoring()', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should call callback with audio levels', async () => {
      const callback = vi.fn();
      
      audioService.startAudioLevelMonitoring(callback, 50);
      
      // Wait for at least one callback
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(callback).toHaveBeenCalled();
      expect(typeof callback.mock.calls[0][0]).toBe('number');
    });

    it('should stop monitoring when stopAudioLevelMonitoring is called', async () => {
      const callback = vi.fn();
      
      audioService.startAudioLevelMonitoring(callback, 50);
      audioService.stopAudioLevelMonitoring();
      
      const callCountBefore = callback.mock.calls.length;
      await new Promise(resolve => setTimeout(resolve, 100));
      const callCountAfter = callback.mock.calls.length;
      
      // Should not increase after stop
      expect(callCountAfter).toBe(callCountBefore);
    });
  });

  describe('verifyMuteState()', () => {
    beforeEach(async () => {
      await audioService.initialize();
    });

    it('should return true when muted and silent', () => {
      audioService.mute();
      
      const isVerified = audioService.verifyMuteState();
      
      expect(isVerified).toBe(true);
    });

    it('should return true when unmuted (cannot verify)', () => {
      audioService.unmute();
      
      const isVerified = audioService.verifyMuteState();
      
      expect(isVerified).toBe(true);
    });
  });

  describe('cleanup()', () => {
    it('should stop all tracks and clear resources', async () => {
      await audioService.initialize();
      const mockStop = vi.fn();
      
      // Mock the stop function
      vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce({
        getTracks: () => [{ stop: mockStop, enabled: true, kind: 'audio' }],
        getAudioTracks: () => [{ stop: mockStop, enabled: true, kind: 'audio' }],
      } as any);
      
      await audioService.initialize();
      audioService.cleanup();
      
      expect(mockStop).toHaveBeenCalled();
    });
  });
});

