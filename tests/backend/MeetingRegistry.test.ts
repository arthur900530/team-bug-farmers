/**
 * MeetingRegistry Test Suite
 * 
 * Test specifications from BACKEND_TEST_SPECIFICATIONS_FOR_CICD_JEST.md
 * 25 test cases covering all 7 functions
 */

import { MeetingRegistry } from '../../backend/src/MeetingRegistry';
import { UserSession, Meeting } from '../../backend/src/types';

describe('MeetingRegistry', () => {
  let registry: MeetingRegistry;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    registry = new MeetingRegistry();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
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

  describe('registerUser', () => {
    test('Test 1: Creates new meeting when registering first user', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1', 'pc1', 'HIGH', '', 'Connected', 1234567890);

      registry.registerUser(meetingId, session);

      const meeting = registry.getMeeting(meetingId);
      expect(meeting).not.toBeNull();
      expect(meeting?.meetingId).toBe(meetingId);
      expect(meeting?.currentTier).toBe('HIGH');
      expect(meeting?.sessions).toHaveLength(1);
      expect(meeting?.sessions[0]).toEqual(session);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] User user1 registered in meeting meeting1'
      );
    });

    test('Test 2: Adds second user to existing meeting', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2', 'pc2');

      registry.registerUser(meetingId, session1);
      registry.registerUser(meetingId, session2);

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.sessions).toHaveLength(2);
      expect(meeting?.sessions[0].userId).toBe('user1');
      expect(meeting?.sessions[1].userId).toBe('user2');
    });

    test('Test 3: Updates existing user session', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1', 'pc1', 'HIGH');
      const session1Updated = createUserSession('user1', 'pc1-new', 'LOW');

      registry.registerUser(meetingId, session1);
      const meetingBefore = registry.getMeeting(meetingId);
      expect(meetingBefore?.sessions).toHaveLength(1);

      registry.registerUser(meetingId, session1Updated);

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.sessions).toHaveLength(1); // Length remains same
      expect(meeting?.sessions[0].pcId).toBe('pc1-new');
      expect(meeting?.sessions[0].qualityTier).toBe('LOW');
    });

    test('Test 4: Sets default tier to HIGH for new meeting', () => {
      const meetingId = 'meeting2';
      const session = createUserSession('user3');

      registry.registerUser(meetingId, session);

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.currentTier).toBe('HIGH');
    });

    test('Test 5: Records creation timestamp', () => {
      const meetingId = 'meeting3';
      const session = createUserSession('user4');
      const beforeTime = Date.now();

      registry.registerUser(meetingId, session);

      const afterTime = Date.now();
      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(meeting?.createdAt).toBeLessThanOrEqual(afterTime);
      expect(typeof meeting?.createdAt).toBe('number');
    });
  });

  describe('removeUser', () => {
    test('Test 6: Removes user from meeting', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');

      registry.registerUser(meetingId, session1);
      registry.registerUser(meetingId, session2);
      registry.removeUser(meetingId, 'user1');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.sessions).toHaveLength(1);
      expect(meeting?.sessions[0].userId).toBe('user2');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] User user1 removed from meeting meeting1'
      );
    });

    test('Test 7: Deletes meeting when last user leaves', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);
      registry.removeUser(meetingId, 'user1');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] Meeting meeting1 deleted (no users remaining)'
      );
    });

    test('Test 8: Handles removing non-existent user gracefully', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);
      const meetingBefore = registry.getMeeting(meetingId);
      expect(meetingBefore?.sessions).toHaveLength(1);

      registry.removeUser(meetingId, 'nonexistent');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.sessions).toHaveLength(1); // Unchanged
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('Test 9: Handles removing from non-existent meeting', () => {
      registry.removeUser('nonexistent', 'user1');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] Meeting nonexistent not found'
      );
    });
  });

  describe('listRecipients', () => {
    test('Test 10: Returns all users in meeting', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');
      const session3 = createUserSession('user3');

      registry.registerUser(meetingId, session1);
      registry.registerUser(meetingId, session2);
      registry.registerUser(meetingId, session3);

      const recipients = registry.listRecipients(meetingId);
      expect(recipients).toHaveLength(3);
      expect(recipients.map(r => r.userId)).toEqual(['user1', 'user2', 'user3']);
    });

    test('Test 11: Excludes specified user from list', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');
      const session3 = createUserSession('user3');

      registry.registerUser(meetingId, session1);
      registry.registerUser(meetingId, session2);
      registry.registerUser(meetingId, session3);

      const recipients = registry.listRecipients(meetingId, 'user1');
      expect(recipients).toHaveLength(2);
      expect(recipients.map(r => r.userId)).toEqual(['user2', 'user3']);
    });

    test('Test 12: Returns empty array for non-existent meeting', () => {
      const recipients = registry.listRecipients('nonexistent');
      expect(recipients).toEqual([]);
    });

    test('Test 13: Returns empty array when only excluded user in meeting', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);

      const recipients = registry.listRecipients(meetingId, 'user1');
      expect(recipients).toEqual([]);
    });
  });

  describe('getMeeting', () => {
    test('Test 14: Returns meeting object for existing meeting', () => {
      const meetingId = 'meeting1';
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');

      registry.registerUser(meetingId, session1);
      registry.registerUser(meetingId, session2);

      const meeting = registry.getMeeting(meetingId);
      expect(meeting).not.toBeNull();
      expect(meeting?.meetingId).toBe(meetingId);
      expect(meeting?.currentTier).toBeDefined();
      expect(meeting?.createdAt).toBeDefined();
      expect(meeting?.sessions).toHaveLength(2);
    });

    test('Test 15: Returns null for non-existent meeting', () => {
      const meeting = registry.getMeeting('nonexistent');
      expect(meeting).toBeNull();
    });
  });

  describe('updateQualityTier', () => {
    test('Test 16: Updates tier for existing meeting', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);
      registry.updateQualityTier(meetingId, 'LOW');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.currentTier).toBe('LOW');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] Meeting meeting1 tier updated to LOW'
      );
    });

    test('Test 17: Changes tier from LOW to MEDIUM', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);
      registry.updateQualityTier(meetingId, 'LOW');
      registry.updateQualityTier(meetingId, 'MEDIUM');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.currentTier).toBe('MEDIUM');
    });

    test('Test 18: Changes tier from MEDIUM to HIGH', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);
      registry.updateQualityTier(meetingId, 'MEDIUM');
      registry.updateQualityTier(meetingId, 'HIGH');

      const meeting = registry.getMeeting(meetingId);
      expect(meeting?.currentTier).toBe('HIGH');
    });

    test('Test 19: Handles update for non-existent meeting', () => {
      registry.updateQualityTier('nonexistent', 'LOW');

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[MeetingRegistry] Cannot update tier: Meeting nonexistent not found'
      );
    });
  });

  describe('getUserSession', () => {
    test('Test 20: Returns session for existing user in meeting', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1', 'pc1', 'HIGH', '', 'Connected', 1234567890);

      registry.registerUser(meetingId, session);

      const userSession = registry.getUserSession(meetingId, 'user1');
      expect(userSession).not.toBeNull();
      expect(userSession?.userId).toBe('user1');
      expect(userSession?.pcId).toBe('pc1');
      expect(userSession?.qualityTier).toBe('HIGH');
      expect(userSession?.connectionState).toBe('Connected');
      expect(userSession?.timestamp).toBe(1234567890);
    });

    test('Test 21: Returns null for non-existent user', () => {
      const meetingId = 'meeting1';
      const session = createUserSession('user1');

      registry.registerUser(meetingId, session);

      const userSession = registry.getUserSession(meetingId, 'nonexistent');
      expect(userSession).toBeNull();
    });

    test('Test 22: Returns null for non-existent meeting', () => {
      const userSession = registry.getUserSession('nonexistent', 'user1');
      expect(userSession).toBeNull();
    });
  });

  describe('getAllMeetings', () => {
    test('Test 23: Returns all active meetings', () => {
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');
      const session3 = createUserSession('user3');

      registry.registerUser('meeting1', session1);
      registry.registerUser('meeting2', session2);
      registry.registerUser('meeting3', session3);

      const meetings = registry.getAllMeetings();
      expect(meetings).toHaveLength(3);
      expect(meetings.map(m => m.meetingId).sort()).toEqual(['meeting1', 'meeting2', 'meeting3']);
    });

    test('Test 24: Returns empty array when no meetings', () => {
      const meetings = registry.getAllMeetings();
      expect(meetings).toEqual([]);
    });

    test('Test 25: Returns updated list after meeting deletion', () => {
      const session1 = createUserSession('user1');
      const session2 = createUserSession('user2');
      const session3 = createUserSession('user3');

      registry.registerUser('meeting1', session1);
      registry.registerUser('meeting2', session2);
      registry.registerUser('meeting3', session3);

      let meetings = registry.getAllMeetings();
      expect(meetings).toHaveLength(3);

      registry.removeUser('meeting2', 'user2');

      meetings = registry.getAllMeetings();
      expect(meetings).toHaveLength(2);
      expect(meetings.map(m => m.meetingId).sort()).toEqual(['meeting1', 'meeting3']);
    });
  });
});

