/**
 * MeetingRegistry - From dev_specs/APIs.md lines 143-152
 * Purpose: Manages meeting state and active user sessions
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - registerUser(meetingId, session)
 * - removeUser(meetingId, userId)
 * - listRecipients(meetingId, excludeUserId?)
 * - getMeeting(meetingId)
 * - updateQualityTier(meetingId, tier)
 */

import { Meeting, UserSession } from './types';

export class MeetingRegistry {
  // In-memory storage: Map<meetingId, Meeting>
  // From data_schemas.md: "In-memory maps and structs (per SFU instance)"
  private meetings: Map<string, Meeting> = new Map();

  /**
   * Register a user in a meeting
   * From flow_charts.md line 40: "MeetingRegistry.registerUser<br>meetingId, UserSession"
   */
  registerUser(meetingId: string, session: UserSession): void {
    let meeting = this.meetings.get(meetingId);

    if (!meeting) {
      // Create new meeting if it doesn't exist
      // From data_schemas.md DS-02: Meeting structure
      meeting = {
        meetingId,
        currentTier: 'HIGH', // Default tier from flow_charts.md line 41
        createdAt: Date.now(),
        sessions: []
      };
      this.meetings.set(meetingId, meeting);
    }

    // Add or update user session
    const existingIndex = meeting.sessions.findIndex(s => s.userId === session.userId);
    if (existingIndex >= 0) {
      meeting.sessions[existingIndex] = session;
    } else {
      meeting.sessions.push(session);
    }

    console.log(`[MeetingRegistry] User ${session.userId} registered in meeting ${meetingId}`);
  }

  /**
   * Remove a user from a meeting
   * From flow_charts.md: Meeting teardown flow
   */
  removeUser(meetingId: string, userId: string): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      console.warn(`[MeetingRegistry] Meeting ${meetingId} not found`);
      return;
    }

    meeting.sessions = meeting.sessions.filter(s => s.userId !== userId);

    // If no users left, delete the meeting
    // From flow_charts.md line 227: "Last user? → Delete Meeting"
    if (meeting.sessions.length === 0) {
      this.meetings.delete(meetingId);
      console.log(`[MeetingRegistry] Meeting ${meetingId} deleted (no users remaining)`);
    } else {
      console.log(`[MeetingRegistry] User ${userId} removed from meeting ${meetingId}`);
    }
  }

  /**
   * List all recipients in a meeting, optionally excluding a user
   * From APIs.md: Used by StreamForwarder to know who to forward to
   */
  listRecipients(meetingId: string, excludeUserId?: string): UserSession[] {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      return [];
    }

    if (excludeUserId) {
      return meeting.sessions.filter(s => s.userId !== excludeUserId);
    }

    return meeting.sessions;
  }

  /**
   * Get meeting metadata
   * Returns null if meeting doesn't exist
   */
  getMeeting(meetingId: string): Meeting | null {
    return this.meetings.get(meetingId) || null;
  }

  /**
   * Update the quality tier for a meeting
   * From APIs.md: Used by QualityController (User Story 8 - NOT IMPLEMENTED YET)
   */
  updateQualityTier(meetingId: string, tier: 'LOW' | 'MEDIUM' | 'HIGH'): void {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      console.warn(`[MeetingRegistry] Cannot update tier: Meeting ${meetingId} not found`);
      return;
    }

    meeting.currentTier = tier;
    console.log(`[MeetingRegistry] Meeting ${meetingId} tier updated to ${tier}`);
  }

  /**
   * Get a specific user session
   * Helper method for checking if user is in meeting
   */
  getUserSession(meetingId: string, userId: string): UserSession | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      return null;
    }

    return meeting.sessions.find(s => s.userId === userId) || null;
  }

  /**
   * Get all active meetings
   * Useful for debugging/monitoring
   */
  getAllMeetings(): Meeting[] {
    return Array.from(this.meetings.values());
  }
}

