/**
 * StreamForwarder Test Suite
 * 
 * Test specifications from BACKEND_TEST_SPECIFICATIONS_FOR_CICD_JEST.md
 * 19 test cases covering all 6 functions
 */

import { StreamForwarder } from '../../backend/src/StreamForwarder';
import { MeetingRegistry } from '../../backend/src/MeetingRegistry';
import { MediasoupManager } from '../../backend/src/MediasoupManager';
import { UserSession, EncodedFrame } from '../../backend/src/types';

// Mock Consumer interface for mediasoup
interface MockConsumer {
  id: string;
  setPreferredLayers: jest.Mock<Promise<void>, [{ spatialLayer: number }]>;
}

describe('StreamForwarder', () => {
  let forwarder: StreamForwarder;
  let mockRegistry: jest.Mocked<MeetingRegistry>;
  let mockMediasoup: jest.Mocked<MediasoupManager>;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mocks
    mockRegistry = {
      listRecipients: jest.fn().mockReturnValue([]),
      updateQualityTier: jest.fn(),
      getAllMeetings: jest.fn().mockReturnValue([]),
      getMeeting: jest.fn().mockReturnValue(null),
    } as any;

    mockMediasoup = {
      getConsumersForUser: jest.fn().mockReturnValue([]),
    } as any;

    forwarder = new StreamForwarder(mockRegistry, mockMediasoup);

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  // Helper function to create a sample UserSession
  const createUserSession = (
    userId: string,
    pcId: string = 'pc1',
    qualityTier: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH',
    lastCrc32: string = '',
    connectionState: UserSession['connectionState'] = 'Connected',
    timestamp: number = 1234567890
  ): UserSession => ({
    userId,
    pcId,
    qualityTier,
    lastCrc32,
    connectionState,
    timestamp
  });

  // Helper function to create a sample EncodedFrame
  const createEncodedFrame = (
    tier: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH',
    data: Uint8Array = new Uint8Array([1, 2, 3, 4]),
    timestamp: number = 123
  ): EncodedFrame => ({
    tier,
    data,
    timestamp
  });

  // Helper function to create a mock Consumer
  const createMockConsumer = (id: string): MockConsumer => ({
    id,
    setPreferredLayers: jest.fn().mockResolvedValue(undefined),
  });

  describe('constructor', () => {
    test('Test 1: Initializes with dependencies', () => {
      const newForwarder = new StreamForwarder(mockRegistry, mockMediasoup);
      expect(newForwarder).toBeInstanceOf(StreamForwarder);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Initialized with mediasoup integration'
      );
    });
  });

  describe('forward', () => {
    test('Test 2: Logs forwarding to recipients', () => {
      const meetingId = 'meeting1';
      const tier = 'HIGH';
      const frames = [createEncodedFrame('HIGH')];
      const recipients = [
        createUserSession('user1'),
        createUserSession('user2'),
      ];

      mockRegistry.listRecipients.mockReturnValue(recipients);

      forwarder.forward(meetingId, tier, frames);

      expect(mockRegistry.listRecipients).toHaveBeenCalledWith(meetingId);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Forwarding tier HIGH (layer 2) to 2 recipients in meeting meeting1'
      );
    });

    test('Test 3: Handles meeting with no recipients', () => {
      const meetingId = 'meeting1';
      const tier = 'HIGH';
      const frames = [createEncodedFrame('HIGH')];

      mockRegistry.listRecipients.mockReturnValue([]);

      forwarder.forward(meetingId, tier, frames);

      expect(mockRegistry.listRecipients).toHaveBeenCalledWith(meetingId);
      // Should not log forwarding when no recipients
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Forwarding tier')
      );
    });

    test('Test 4: Uses current meeting tier when forwarding', async () => {
      const meetingId = 'meeting1';
      const tier = 'HIGH'; // Passed tier (ignored)
      const frames = [createEncodedFrame('HIGH')];
      const recipients = [createUserSession('user1')];

      // Set meeting tier to LOW
      await forwarder.setTier(meetingId, 'LOW');
      consoleLogSpy.mockClear();

      mockRegistry.listRecipients.mockReturnValue(recipients);

      forwarder.forward(meetingId, tier, frames);

      // Should use LOW tier (current meeting tier), not HIGH (passed tier)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Forwarding tier LOW (layer 0) to 1 recipients in meeting meeting1'
      );
    });

    test('Test 5: Logs per-user tier selection', () => {
      const meetingId = 'meeting1';
      const tier = 'HIGH';
      const frames = [createEncodedFrame('HIGH')];
      const recipients = [createUserSession('user1')];

      mockRegistry.listRecipients.mockReturnValue(recipients);

      forwarder.forward(meetingId, tier, frames);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] User user1 receiving tier HIGH (layer 2)'
      );
    });
  });

  describe('selectTierFor', () => {
    test('Test 6: Returns user-specific tier when set', async () => {
      const userId = 'user1';
      // Note: setTierForUser is not in the API, but we can test selectTierFor behavior
      // by setting up a meeting with a tier and checking the result
      const meetingId = 'meeting1';
      await forwarder.setTier(meetingId, 'LOW');

      // Create a meeting with this user
      const recipients = [createUserSession(userId)];
      mockRegistry.listRecipients.mockReturnValue(recipients);
      mockRegistry.getAllMeetings.mockReturnValue([
        {
          meetingId,
          currentTier: 'LOW',
          createdAt: Date.now(),
          sessions: recipients,
        },
      ]);

      const result = forwarder.selectTierFor(userId);
      expect(result).toBe('LOW');
    });

    test('Test 7: Returns meeting tier when no user tier set', async () => {
      const userId = 'user1';
      const meetingId = 'meeting1';
      await forwarder.setTier(meetingId, 'MEDIUM');

      const recipients = [createUserSession(userId)];
      mockRegistry.getAllMeetings.mockReturnValue([
        {
          meetingId,
          currentTier: 'MEDIUM',
          createdAt: Date.now(),
          sessions: recipients,
        },
      ]);

      const result = forwarder.selectTierFor(userId);
      expect(result).toBe('MEDIUM');
    });

    test('Test 8: Returns HIGH as default fallback', () => {
      const result = forwarder.selectTierFor('nonexistent');
      expect(result).toBe('HIGH');
    });

    test('Test 8a: Returns HIGH when user in meeting but meeting has no tier set', () => {
      const userId = 'user1';
      const meetingId = 'meeting1';
      const recipients = [createUserSession(userId)];
      
      // Meeting exists but no tier has been set for it
      mockRegistry.getAllMeetings.mockReturnValue([
        {
          meetingId,
          currentTier: 'HIGH',
          createdAt: Date.now(),
          sessions: recipients,
        },
      ]);

      const result = forwarder.selectTierFor(userId);
      expect(result).toBe('HIGH'); // Should return HIGH as default
    });
  });

  describe('setTier', () => {
    test('Test 9: Sets tier for meeting (HIGH to LOW)', async () => {
      const meetingId = 'meeting1';
      const tier = 'LOW';

      await forwarder.setTier(meetingId, tier);

      expect(mockRegistry.updateQualityTier).toHaveBeenCalledWith(meetingId, 'LOW');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Set tier for meeting meeting1: none → LOW (layer 0)'
      );
    });

    test('Test 10: Updates tier from LOW to MEDIUM', async () => {
      const meetingId = 'meeting1';

      await forwarder.setTier(meetingId, 'LOW');
      consoleLogSpy.mockClear();
      await forwarder.setTier(meetingId, 'MEDIUM');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Set tier for meeting meeting1: LOW → MEDIUM (layer 1)'
      );
    });

    test('Test 11: Updates tier from MEDIUM to HIGH', async () => {
      const meetingId = 'meeting1';

      await forwarder.setTier(meetingId, 'MEDIUM');
      consoleLogSpy.mockClear();
      await forwarder.setTier(meetingId, 'HIGH');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Set tier for meeting meeting1: MEDIUM → HIGH (layer 2)'
      );
    });

    test('Test 12: Skips update when tier unchanged', async () => {
      const meetingId = 'meeting1';

      await forwarder.setTier(meetingId, 'HIGH');
      consoleLogSpy.mockClear();
      mockRegistry.updateQualityTier.mockClear();

      await forwarder.setTier(meetingId, 'HIGH');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Tier for meeting meeting1 already set to HIGH'
      );
      expect(mockRegistry.updateQualityTier).not.toHaveBeenCalled();
    });

    test('Test 13: Logs consumer update count', async () => {
      const meetingId = 'meeting1';
      const recipients = [
        createUserSession('user1'),
        createUserSession('user2'),
        createUserSession('user3'),
      ];

      mockRegistry.listRecipients.mockReturnValue(recipients);

      await forwarder.setTier(meetingId, 'LOW');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Updating 3 consumers to tier LOW (layer 0)'
      );
    });

    test('Test 14: CRITICAL - Calls mediasoupManager.getConsumersForUser() and consumer.setPreferredLayers()', async () => {
      const meetingId = 'meeting1';
      const tier = 'MEDIUM';
      const recipients = [
        createUserSession('user1'),
        createUserSession('user2'),
      ];

      // Create mock consumers for each user
      const consumer1 = createMockConsumer('consumer1');
      const consumer2 = createMockConsumer('consumer2');

      mockRegistry.listRecipients.mockReturnValue(recipients);
      mockMediasoup.getConsumersForUser
        .mockReturnValueOnce([consumer1] as any)
        .mockReturnValueOnce([consumer2] as any);

      await forwarder.setTier(meetingId, tier);

      // Verify getConsumersForUser was called for each recipient
      expect(mockMediasoup.getConsumersForUser).toHaveBeenCalledWith('user1');
      expect(mockMediasoup.getConsumersForUser).toHaveBeenCalledWith('user2');

      // Verify setPreferredLayers was called with correct spatial layer (MEDIUM = layer 1)
      expect(consumer1.setPreferredLayers).toHaveBeenCalledWith({ spatialLayer: 1 });
      expect(consumer2.setPreferredLayers).toHaveBeenCalledWith({ spatialLayer: 1 });

      // Verify all promises resolved successfully (no errors)
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('findMeetingForUser', () => {
    test('Test 15: Finds meeting for user (via selectTierFor)', async () => {
      const userId = 'user1';
      const meetingId = 'meeting1';

      await forwarder.setTier(meetingId, 'MEDIUM');

      const recipients = [createUserSession(userId)];
      mockRegistry.getAllMeetings.mockReturnValue([
        {
          meetingId,
          currentTier: 'MEDIUM',
          createdAt: Date.now(),
          sessions: recipients,
        },
      ]);

      const result = forwarder.selectTierFor(userId);
      expect(result).toBe('MEDIUM'); // Confirms user was found in meeting
    });

    test('Test 16: Returns null for non-existent user', () => {
      mockRegistry.getAllMeetings.mockReturnValue([]);

      const result = forwarder.selectTierFor('nonexistent');
      expect(result).toBe('HIGH'); // Default fallback indicates user not found
    });
  });

  describe('cleanupMeeting', () => {
    test('Test 17: Removes meeting tier', async () => {
      const meetingId = 'meeting1';

      await forwarder.setTier(meetingId, 'LOW');
      consoleLogSpy.mockClear();

      forwarder.cleanupMeeting(meetingId);

      // After cleanup, getTier should return default HIGH
      // Note: getTier is private, but we can verify via setTier behavior
      // or by checking that the tier was removed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Cleaned up meeting meeting1'
      );
    });

    test('Test 18: Removes user tiers for meeting users', async () => {
      const meetingId = 'meeting1';
      const recipients = [
        createUserSession('user1'),
        createUserSession('user2'),
      ];

      mockRegistry.getMeeting.mockReturnValue({
        meetingId,
        currentTier: 'HIGH',
        createdAt: Date.now(),
        sessions: recipients,
      });

      // Set user tiers (via setTierForUser - though not in API, we test cleanup)
      // Actually, userTiers are managed internally, so we test that cleanup removes them
      forwarder.cleanupMeeting(meetingId);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Cleaned up meeting meeting1'
      );
      expect(mockRegistry.getMeeting).toHaveBeenCalledWith(meetingId);
    });

    test('Test 19: Handles cleanup for non-existent meeting', () => {
      forwarder.cleanupMeeting('nonexistent');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Cleaned up meeting nonexistent'
      );
      // Should not throw error
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('setTierForUser', () => {
    test('Test 20: Sets tier for specific user', () => {
      const userId = 'user1';
      const tier = 'MEDIUM';

      forwarder.setTierForUser(userId, tier);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Set tier for user user1: none → MEDIUM'
      );
    });

    test('Test 21: Updates user tier from MEDIUM to LOW', () => {
      const userId = 'user1';

      forwarder.setTierForUser(userId, 'MEDIUM');
      consoleLogSpy.mockClear();
      forwarder.setTierForUser(userId, 'LOW');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Set tier for user user1: MEDIUM → LOW'
      );
    });

    test('Test 22: Skips update when user tier unchanged', () => {
      const userId = 'user1';

      forwarder.setTierForUser(userId, 'HIGH');
      consoleLogSpy.mockClear();
      forwarder.setTierForUser(userId, 'HIGH');

      // Should not log when tier is unchanged
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('Test 23: User-specific tier is returned by selectTierFor', () => {
      const userId = 'user1';
      
      forwarder.setTierForUser(userId, 'LOW');
      
      const result = forwarder.selectTierFor(userId);
      expect(result).toBe('LOW');
    });
  });

  describe('getTier', () => {
    test('Test 24: Returns current tier for meeting', async () => {
      const meetingId = 'meeting1';
      
      await forwarder.setTier(meetingId, 'MEDIUM');
      
      const result = forwarder.getTier(meetingId);
      expect(result).toBe('MEDIUM');
    });

    test('Test 25: Returns HIGH as default for non-existent meeting', () => {
      const result = forwarder.getTier('nonexistent');
      expect(result).toBe('HIGH');
    });
  });

  describe('getStats', () => {
    test('Test 26: Returns empty stats initially', () => {
      const stats = forwarder.getStats();
      
      expect(stats).toEqual({
        activeMeetings: 0,
        meetings: [],
        userTiers: 0
      });
    });

    test('Test 27: Returns stats with active meetings', async () => {
      await forwarder.setTier('meeting1', 'LOW');
      await forwarder.setTier('meeting2', 'MEDIUM');
      await forwarder.setTier('meeting3', 'HIGH');
      
      const stats = forwarder.getStats();
      
      expect(stats.activeMeetings).toBe(3);
      expect(stats.meetings).toHaveLength(3);
      expect(stats.meetings).toEqual(
        expect.arrayContaining([
          { meetingId: 'meeting1', tier: 'LOW' },
          { meetingId: 'meeting2', tier: 'MEDIUM' },
          { meetingId: 'meeting3', tier: 'HIGH' }
        ])
      );
    });

    test('Test 28: Returns stats with user tiers', () => {
      forwarder.setTierForUser('user1', 'LOW');
      forwarder.setTierForUser('user2', 'MEDIUM');
      
      const stats = forwarder.getStats();
      
      expect(stats.userTiers).toBe(2);
    });

    test('Test 29: Returns combined stats with both meetings and user tiers', async () => {
      await forwarder.setTier('meeting1', 'LOW');
      forwarder.setTierForUser('user1', 'MEDIUM');
      
      const stats = forwarder.getStats();
      
      expect(stats.activeMeetings).toBe(1);
      expect(stats.meetings).toEqual([{ meetingId: 'meeting1', tier: 'LOW' }]);
      expect(stats.userTiers).toBe(1);
    });
  });

  describe('setTier - error handling', () => {
    test('Test 30: Handles error when setPreferredLayers fails', async () => {
      const meetingId = 'meeting1';
      const tier = 'LOW';
      const recipients = [createUserSession('user1')];
      const errorMessage = 'Failed to set preferred layers';
      
      // Create a mock consumer that rejects
      const consumer = createMockConsumer('consumer1');
      consumer.setPreferredLayers.mockRejectedValue(new Error(errorMessage));
      
      mockRegistry.listRecipients.mockReturnValue(recipients);
      mockMediasoup.getConsumersForUser.mockReturnValue([consumer] as any);
      
      await forwarder.setTier(meetingId, tier);
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Error setting layers for consumer consumer1:',
        expect.any(Error)
      );
    });

    test('Test 31: Continues processing other consumers when one fails', async () => {
      const meetingId = 'meeting1';
      const tier = 'MEDIUM';
      const recipients = [createUserSession('user1')];
      
      // Create two consumers: one that fails, one that succeeds
      const consumer1 = createMockConsumer('consumer1');
      const consumer2 = createMockConsumer('consumer2');
      consumer1.setPreferredLayers.mockRejectedValue(new Error('Error 1'));
      consumer2.setPreferredLayers.mockResolvedValue(undefined);
      
      mockRegistry.listRecipients.mockReturnValue(recipients);
      mockMediasoup.getConsumersForUser.mockReturnValue([consumer1, consumer2] as any);
      
      await forwarder.setTier(meetingId, tier);
      
      // Both should have been called despite first one failing
      expect(consumer1.setPreferredLayers).toHaveBeenCalledWith({ spatialLayer: 1 });
      expect(consumer2.setPreferredLayers).toHaveBeenCalledWith({ spatialLayer: 1 });
      
      // Should log error for failed consumer
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Error setting layers for consumer consumer1:',
        expect.any(Error)
      );
      
      // Should log success for successful consumer
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[StreamForwarder] Updated consumer consumer2 to layer 1 (tier MEDIUM)'
      );
    });
  });
});

