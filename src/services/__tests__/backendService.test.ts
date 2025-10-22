import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  updateUserState,
  updateMuteStatus,
  updateDevice,
  getUserState,
  getRoomUsers,
  deleteUserState,
  checkBackendHealth,
} from '../backendService';

// Mock fetch
global.fetch = vi.fn();

describe('backendService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('updateUserState()', () => {
    it('should send POST request with user state', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'test-user',
          username: 'Test User',
          isMuted: false,
          deviceId: 'device-1',
          deviceLabel: 'Microphone',
          roomId: 'room-1',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await updateUserState(
        'test-user',
        'Test User',
        false,
        'device-1',
        'Microphone',
        'room-1'
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/state'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Test User',
            isMuted: false,
            deviceId: 'device-1',
            deviceLabel: 'Microphone',
            roomId: 'room-1',
          }),
        })
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should return null on error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Server error' }),
      } as Response);

      const result = await updateUserState(
        'test-user',
        'Test User',
        false,
        null,
        null
      );

      expect(result).toBeNull();
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await updateUserState(
        'test-user',
        'Test User',
        false,
        null,
        null
      );

      expect(result).toBeNull();
    });
  });

  describe('updateMuteStatus()', () => {
    it('should send PATCH request to update mute status', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'test-user',
          username: 'Test User',
          isMuted: true,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await updateMuteStatus('test-user', true);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/mute'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ isMuted: true }),
        })
      );

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateDevice()', () => {
    it('should send PATCH request to update device', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'test-user',
          deviceId: 'new-device',
          deviceLabel: 'New Microphone',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await updateDevice('test-user', 'new-device', 'New Microphone');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user/device'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({
            deviceId: 'new-device',
            deviceLabel: 'New Microphone',
          }),
        })
      );

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getUserState()', () => {
    it('should fetch user state', async () => {
      const mockResponse = {
        success: true,
        data: {
          userId: 'test-user',
          username: 'Test User',
          isMuted: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getUserState('test-user');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user')
      );

      expect(result).toEqual(mockResponse.data);
    });

    it('should return null when user not found', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Not found' }),
      } as Response);

      const result = await getUserState('nonexistent-user');

      expect(result).toBeNull();
    });
  });

  describe('getRoomUsers()', () => {
    it('should fetch all users in a room', async () => {
      const mockResponse = {
        success: true,
        data: [
          { userId: 'user-1', username: 'User 1' },
          { userId: 'user-2', username: 'User 2' },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getRoomUsers('room-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/rooms/room-1/users')
      );

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockResponse.data);
    });

    it('should return empty array on error', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await getRoomUsers('room-1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteUserState()', () => {
    it('should send DELETE request', async () => {
      const mockResponse = {
        success: true,
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await deleteUserState('test-user');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/test-user'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false }),
      } as Response);

      const result = await deleteUserState('test-user');

      expect(result).toBe(false);
    });
  });

  describe('checkBackendHealth()', () => {
    it('should return true when backend is healthy', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await checkBackendHealth();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toBe(true);
    });

    it('should return false when backend is unavailable', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await checkBackendHealth();

      expect(result).toBe(false);
    });
  });
});

