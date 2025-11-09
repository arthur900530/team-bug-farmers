/**
 * AckAggregator - From dev_specs/classes.md lines 326-327
 * Purpose: Aggregates CRC32 match results and produces per-meeting ACK summary
 * 
 * From dev_specs/APIs.md lines 212-219:
 * class AckAggregator {
 *   onDecodeAck(userId: string, matched: boolean): void
 *   summaryForSpeaker(meetingId: string): AckSummary
 *   reset(meetingId: string): void
 * }
 * 
 * From dev_specs/flow_charts.md lines 181-192:
 * - Receives ACK/NACK from FingerprintVerifier
 * - Records per receiver: userId: ACK or userId: NACK
 * - After all receivers processed, calls summaryForSpeaker(meetingId)
 * - Creates AckSummary with ackedUsers and missingUsers
 * - Sends to sender via SignalingServer
 */

import { AckSummary } from './types';
import { MeetingRegistry } from './MeetingRegistry';

export class AckAggregator {
  // Store ACK/NACK results per meeting (Map<meetingId, Map<senderUserId, Map<userId, boolean>>>)
  // Structure: meetingId -> senderUserId -> receiverUserId -> matched (true=ACK, false=NACK)
  private ackResults: Map<string, Map<string, Map<string, boolean>>> = new Map();
  
  // Summary window (how often to generate summaries)
  // From dev_specs/public_interfaces.md line 203: RTCP SR interval is "every 5 seconds"
  // We'll generate summaries more frequently (every 2 seconds) for better UX
  private readonly SUMMARY_WINDOW_MS = 2000; // 2 seconds
  
  // Track last summary time per meeting+sender
  private lastSummaryTime: Map<string, number> = new Map(); // key: `${meetingId}:${senderUserId}`
  
  // Callback to SignalingServer for sending summaries
  private onSummaryCallback?: (meetingId: string, senderUserId: string, summary: AckSummary) => void;
  
  // Dependency: MeetingRegistry to get participants
  private meetingRegistry: MeetingRegistry;
  
  constructor(meetingRegistry: MeetingRegistry) {
    this.meetingRegistry = meetingRegistry;
  }
  
  /**
   * Record ACK/NACK result for a receiver
   * From flow_charts.md line 181: "AckAggregator.onDecodeAck"
   * From APIs.md line 216: "onDecodeAck(userId: string, matched: boolean): void"
   * 
   * Note: APIs.md signature uses userId and matched, but we need meetingId and senderUserId
   * We'll extend the signature to include these parameters
   */
  onDecodeAck(
    meetingId: string,
    senderUserId: string,
    receiverUserId: string,
    matched: boolean
  ): void {
    console.log(`[AckAggregator] Recording ACK/NACK: meeting=${meetingId}, sender=${senderUserId}, receiver=${receiverUserId}, matched=${matched}`);
    
    // Initialize meeting map if needed
    if (!this.ackResults.has(meetingId)) {
      this.ackResults.set(meetingId, new Map());
    }
    const meetingResults = this.ackResults.get(meetingId)!;
    
    // Initialize sender map if needed
    if (!meetingResults.has(senderUserId)) {
      meetingResults.set(senderUserId, new Map());
    }
    const senderResults = meetingResults.get(senderUserId)!;
    
    // Record ACK/NACK for this receiver
    senderResults.set(receiverUserId, matched);
    
    // Check if we should generate summary now
    // From flow_charts.md line 190: "AckAggregator.summaryForSpeaker"
    const summaryKey = `${meetingId}:${senderUserId}`;
    const lastSummary = this.lastSummaryTime.get(summaryKey) || 0;
    const now = Date.now();
    
    if (now - lastSummary >= this.SUMMARY_WINDOW_MS) {
      // Generate summary
      const summary = this.summaryForSpeaker(meetingId, senderUserId);
      
      // Send summary via callback
      if (this.onSummaryCallback) {
        this.onSummaryCallback(meetingId, senderUserId, summary);
      }
      
      // Update last summary time
      this.lastSummaryTime.set(summaryKey, now);
      
      // Reset results for this sender (start fresh for next window)
      // From APIs.md line 218: "reset(meetingId: string): void"
      // We reset per sender, not per meeting
      senderResults.clear();
    }
  }
  
  /**
   * Generate ACK summary for a speaker
   * From flow_charts.md line 190: "AckAggregator.summaryForSpeaker"
   * From APIs.md line 217: "summaryForSpeaker(meetingId: string): AckSummary"
   * 
   * Note: APIs.md signature only has meetingId, but we need senderUserId
   * We'll extend the signature to include senderUserId
   */
  summaryForSpeaker(meetingId: string, senderUserId: string): AckSummary {
    console.log(`[AckAggregator] Generating summary: meeting=${meetingId}, sender=${senderUserId}`);
    
    // Get meeting participants
    const meeting = this.meetingRegistry.getMeeting(meetingId);
    if (!meeting) {
      console.warn(`[AckAggregator] Meeting not found: ${meetingId}`);
      return {
        meetingId,
        ackedUsers: [],
        missingUsers: [],
        timestamp: Date.now()
      };
    }
    
    // Get ACK results for this sender
    const meetingResults = this.ackResults.get(meetingId);
    if (!meetingResults) {
      // No results yet - all users are missing
      const allUserIds = meeting.sessions.map(s => s.userId).filter(id => id !== senderUserId);
      return {
        meetingId,
        ackedUsers: [],
        missingUsers: allUserIds,
        timestamp: Date.now()
      };
    }
    
    const senderResults = meetingResults.get(senderUserId);
    if (!senderResults || senderResults.size === 0) {
      // No results yet - all users are missing
      const allUserIds = meeting.sessions.map(s => s.userId).filter(id => id !== senderUserId);
      return {
        meetingId,
        ackedUsers: [],
        missingUsers: allUserIds,
        timestamp: Date.now()
      };
    }
    
    // Separate ACKed and missing users
    // From flow_charts.md line 192: "Create AckSummary ackedUsers, missingUsers"
    const ackedUsers: string[] = [];
    const missingUsers: string[] = [];
    
    // Get all participants (excluding sender)
    const allParticipants = meeting.sessions
      .map(s => s.userId)
      .filter(id => id !== senderUserId);
    
    allParticipants.forEach(userId => {
      const matched = senderResults.get(userId);
      if (matched === true) {
        // ACK: CRC32 matched
        ackedUsers.push(userId);
      } else if (matched === false) {
        // NACK: CRC32 mismatched
        missingUsers.push(userId);
      } else {
        // No result yet: timeout or not received
        missingUsers.push(userId);
      }
    });
    
    const summary: AckSummary = {
      meetingId,
      ackedUsers,
      missingUsers,
      timestamp: Date.now()
    };
    
    console.log(`[AckAggregator] Summary generated: ${ackedUsers.length} ACKed, ${missingUsers.length} missing`);
    return summary;
  }
  
  /**
   * Reset ACK results for a meeting
   * From APIs.md line 218: "reset(meetingId: string): void"
   */
  reset(meetingId: string): void {
    console.log(`[AckAggregator] Resetting results for meeting: ${meetingId}`);
    
    this.ackResults.delete(meetingId);
    
    // Also reset last summary times for this meeting
    const keysToDelete: string[] = [];
    this.lastSummaryTime.forEach((time, key) => {
      if (key.startsWith(`${meetingId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.lastSummaryTime.delete(key));
  }
  
  /**
   * Set callback for summary generation
   * This callback will be called by SignalingServer to send summaries to clients
   */
  setOnSummaryCallback(
    callback: (meetingId: string, senderUserId: string, summary: AckSummary) => void
  ): void {
    this.onSummaryCallback = callback;
  }
  
  /**
   * Get ACK results for a meeting (for testing/debugging)
   */
  getAckResults(meetingId: string): Map<string, Map<string, boolean>> | undefined {
    return this.ackResults.get(meetingId);
  }
}

