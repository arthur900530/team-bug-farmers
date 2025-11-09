/**
 * Test script for MeetingRegistry Operations
 * Phase 2.2.1: Verify all MeetingRegistry methods work correctly
 */

import { MeetingRegistry } from '../MeetingRegistry';
import { UserSession } from '../types';

async function testMeetingRegistry() {
  console.log('[Test] Starting MeetingRegistry Operations test...');
  
  try {
    const registry = new MeetingRegistry();
    const meetingId = 'test-meeting-1';
    
    // Test 1: registerUser - creates meeting if needed
    console.log('[Test] Test 1: registerUser (creates meeting)...');
    const session1: UserSession = {
      userId: 'user-1',
      pcId: 'pc-1',
      qualityTier: 'HIGH',
      lastCrc32: '',
      connectionState: 'Streaming',
      timestamp: Date.now()
    };
    
    registry.registerUser(meetingId, session1);
    const meeting1 = registry.getMeeting(meetingId);
    
    if (!meeting1) {
      throw new Error('Meeting not created after registerUser');
    }
    
    if (meeting1.meetingId !== meetingId) {
      throw new Error('Meeting ID mismatch');
    }
    
    if (meeting1.currentTier !== 'HIGH') {
      throw new Error('Default tier should be HIGH');
    }
    
    if (meeting1.sessions.length !== 1) {
      throw new Error(`Expected 1 session, got ${meeting1.sessions.length}`);
    }
    
    console.log('[Test] ✅ registerUser creates meeting correctly');
    
    // Test 2: registerUser - adds second user
    console.log('[Test] Test 2: registerUser (adds second user)...');
    const session2: UserSession = {
      userId: 'user-2',
      pcId: 'pc-2',
      qualityTier: 'HIGH',
      lastCrc32: '',
      connectionState: 'Streaming',
      timestamp: Date.now()
    };
    
    registry.registerUser(meetingId, session2);
    const meeting2 = registry.getMeeting(meetingId);
    
    if (meeting2!.sessions.length !== 2) {
      throw new Error(`Expected 2 sessions, got ${meeting2!.sessions.length}`);
    }
    
    console.log('[Test] ✅ registerUser adds second user correctly');
    
    // Test 3: listRecipients - returns all users
    console.log('[Test] Test 3: listRecipients (all users)...');
    const allRecipients = registry.listRecipients(meetingId);
    
    if (allRecipients.length !== 2) {
      throw new Error(`Expected 2 recipients, got ${allRecipients.length}`);
    }
    
    console.log('[Test] ✅ listRecipients returns all users');
    
    // Test 4: listRecipients - excludes user
    console.log('[Test] Test 4: listRecipients (exclude user-1)...');
    const recipientsExcluding1 = registry.listRecipients(meetingId, 'user-1');
    
    if (recipientsExcluding1.length !== 1) {
      throw new Error(`Expected 1 recipient, got ${recipientsExcluding1.length}`);
    }
    
    if (recipientsExcluding1[0].userId !== 'user-2') {
      throw new Error('Excluded user still in list');
    }
    
    console.log('[Test] ✅ listRecipients excludes user correctly');
    
    // Test 5: getUserSession
    console.log('[Test] Test 5: getUserSession...');
    const userSession = registry.getUserSession(meetingId, 'user-1');
    
    if (!userSession) {
      throw new Error('getUserSession returned null');
    }
    
    if (userSession.userId !== 'user-1') {
      throw new Error('getUserSession returned wrong user');
    }
    
    console.log('[Test] ✅ getUserSession returns correct session');
    
    // Test 6: updateQualityTier
    console.log('[Test] Test 6: updateQualityTier...');
    registry.updateQualityTier(meetingId, 'MEDIUM');
    const meetingAfterUpdate = registry.getMeeting(meetingId);
    
    if (meetingAfterUpdate!.currentTier !== 'MEDIUM') {
      throw new Error(`Expected tier MEDIUM, got ${meetingAfterUpdate!.currentTier}`);
    }
    
    console.log('[Test] ✅ updateQualityTier updates meeting tier');
    
    // Test 7: removeUser - removes user but keeps meeting
    console.log('[Test] Test 7: removeUser (keeps meeting)...');
    registry.removeUser(meetingId, 'user-1');
    const meetingAfterRemove = registry.getMeeting(meetingId);
    
    if (!meetingAfterRemove) {
      throw new Error('Meeting deleted when it should remain');
    }
    
    if (meetingAfterRemove.sessions.length !== 1) {
      throw new Error(`Expected 1 session, got ${meetingAfterRemove.sessions.length}`);
    }
    
    console.log('[Test] ✅ removeUser removes user but keeps meeting');
    
    // Test 8: removeUser - deletes meeting when last user leaves
    console.log('[Test] Test 8: removeUser (deletes meeting when empty)...');
    registry.removeUser(meetingId, 'user-2');
    const meetingAfterEmpty = registry.getMeeting(meetingId);
    
    if (meetingAfterEmpty !== null) {
      throw new Error('Meeting should be deleted when empty');
    }
    
    console.log('[Test] ✅ removeUser deletes meeting when empty');
    
    // Test 9: getMeeting - returns null for non-existent meeting
    console.log('[Test] Test 9: getMeeting (non-existent meeting)...');
    const nonExistent = registry.getMeeting('non-existent');
    
    if (nonExistent !== null) {
      throw new Error('getMeeting should return null for non-existent meeting');
    }
    
    console.log('[Test] ✅ getMeeting returns null for non-existent meeting');
    
    console.log('\n[Test] ✅ ALL TESTS PASSED');
    process.exit(0);
    
  } catch (error) {
    console.error('[Test] ❌ TEST FAILED:', error);
    process.exit(1);
  }
}

testMeetingRegistry();

