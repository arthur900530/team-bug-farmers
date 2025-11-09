/**
 * RtcpCollector - From dev_specs/APIs.md lines 169-181
 * Purpose: Collect RTCP reports and compute worst receiver metrics
 * 
 * From dev_specs/classes.md C2.4.1:
 * "Collects RTCP reports and computes worst loss/jitter"
 * 
 * From dev_specs/public_interfaces.md lines 282-285:
 * - Aggregates loss, jitter, RTT from all receivers
 * - Computes worst receiver loss per meeting
 * 
 * From dev_specs/data_schemas.md DS-03:
 * - Sliding window of last 10 reports per user
 * - Map<userId, RtcpReport[]>
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - collect(report: RtcpReport): void
 * - getWorstLoss(meetingId: string): number
 * - getMetrics(meetingId: string): { avgLoss, avgJitter, avgRtt, worstLoss }
 */

import type { RtcpReport } from './types';
import { MeetingRegistry } from './MeetingRegistry';

/**
 * Sliding window size: last 10 reports per user
 * From dev_specs/data_schemas.md line 71: "Sliding window of last 10 reports per user"
 */
const SLIDING_WINDOW_SIZE = 10;

export class RtcpCollector {
  private meetingRegistry: MeetingRegistry;
  
  // Map<userId, RtcpReport[]> - Sliding window per user
  // From dev_specs/data_schemas.md line 70: "Mapping: Map<userId, RtcpReport[]>"
  private userReports: Map<string, RtcpReport[]> = new Map();
  
  // Map<meetingId, Set<userId>> - Track users per meeting for aggregation
  private meetingUsers: Map<string, Set<string>> = new Map();

  constructor(meetingRegistry: MeetingRegistry) {
    this.meetingRegistry = meetingRegistry;
  }

  /**
   * Collect RTCP report from a receiver
   * From dev_specs/APIs.md line 173: "collect(report: RtcpReport): void"
   * 
   * Maintains sliding window of last 10 reports per user
   * From dev_specs/data_schemas.md line 71: "Sliding window of last 10 reports per user"
   */
  collect(report: RtcpReport): void {
    const { userId } = report;
    
    // Get or create reports array for this user
    let reports = this.userReports.get(userId);
    if (!reports) {
      reports = [];
      this.userReports.set(userId, reports);
    }
    
    // Add new report
    reports.push(report);
    
    // Maintain sliding window: keep only last 10 reports
    if (reports.length > SLIDING_WINDOW_SIZE) {
      reports.shift(); // Remove oldest report
    }
    
    // Update meeting-to-users mapping
    // Find which meeting this user belongs to
    const meeting = this.meetingRegistry.getAllMeetings().find(m => 
      m.sessions.some(s => s.userId === userId)
    );
    
    if (meeting) {
      let userIds = this.meetingUsers.get(meeting.meetingId);
      if (!userIds) {
        userIds = new Set();
        this.meetingUsers.set(meeting.meetingId, userIds);
      }
      userIds.add(userId);
    }
    
    console.log(`[RtcpCollector] Collected RTCP report from user ${userId}: loss=${(report.lossPct * 100).toFixed(2)}%, jitter=${report.jitterMs.toFixed(2)}ms, rtt=${report.rttMs.toFixed(2)}ms`);
  }

  /**
   * Get worst loss percentage across all receivers in a meeting
   * From dev_specs/APIs.md line 174: "getWorstLoss(meetingId: string): number"
   * 
   * From dev_specs/flow_charts.md line 135: "SELECT MAX loss% FROM reports"
   * From dev_specs/public_interfaces.md line 285: "Computes worst receiver loss per meeting"
   */
  getWorstLoss(meetingId: string): number {
    const userIds = this.meetingUsers.get(meetingId);
    if (!userIds || userIds.size === 0) {
      return 0; // No receivers, no loss
    }
    
    let worstLoss = 0;
    
    // Find maximum loss across all receivers in this meeting
    for (const userId of userIds) {
      const reports = this.userReports.get(userId);
      if (reports && reports.length > 0) {
        // Get most recent report's loss (or average if multiple reports)
        // For worst loss, we use the maximum loss from all reports
        const maxLoss = Math.max(...reports.map(r => r.lossPct));
        if (maxLoss > worstLoss) {
          worstLoss = maxLoss;
        }
      }
    }
    
    return worstLoss;
  }

  /**
   * Get aggregated metrics for a meeting
   * From dev_specs/APIs.md lines 175-180:
   * "getMetrics(meetingId: string): { avgLoss, avgJitter, avgRtt, worstLoss }"
   */
  getMetrics(meetingId: string): {
    avgLoss: number;
    avgJitter: number;
    avgRtt: number;
    worstLoss: number;
  } {
    const userIds = this.meetingUsers.get(meetingId);
    if (!userIds || userIds.size === 0) {
      return {
        avgLoss: 0,
        avgJitter: 0,
        avgRtt: 0,
        worstLoss: 0,
      };
    }
    
    let totalLoss = 0;
    let totalJitter = 0;
    let totalRtt = 0;
    let reportCount = 0;
    let worstLoss = 0;
    
    // Aggregate metrics across all receivers in this meeting
    for (const userId of userIds) {
      const reports = this.userReports.get(userId);
      if (reports && reports.length > 0) {
        for (const report of reports) {
          totalLoss += report.lossPct;
          totalJitter += report.jitterMs;
          totalRtt += report.rttMs;
          reportCount++;
          
          if (report.lossPct > worstLoss) {
            worstLoss = report.lossPct;
          }
        }
      }
    }
    
    // Compute averages
    const avgLoss = reportCount > 0 ? totalLoss / reportCount : 0;
    const avgJitter = reportCount > 0 ? totalJitter / reportCount : 0;
    const avgRtt = reportCount > 0 ? totalRtt / reportCount : 0;
    
    return {
      avgLoss,
      avgJitter,
      avgRtt,
      worstLoss,
    };
  }

  /**
   * Cleanup reports for a user when they leave
   * Called by SignalingServer when user leaves meeting
   */
  cleanupUser(userId: string): void {
    this.userReports.delete(userId);
    
    // Remove user from meeting mappings
    for (const [meetingId, userIds] of this.meetingUsers.entries()) {
      userIds.delete(userId);
      if (userIds.size === 0) {
        this.meetingUsers.delete(meetingId);
      }
    }
    
    console.log(`[RtcpCollector] Cleaned up reports for user ${userId}`);
  }

  /**
   * Cleanup all reports for a meeting
   * Called when meeting ends
   */
  cleanupMeeting(meetingId: string): void {
    const userIds = this.meetingUsers.get(meetingId);
    if (userIds) {
      for (const userId of userIds) {
        this.userReports.delete(userId);
      }
      this.meetingUsers.delete(meetingId);
    }
    
    console.log(`[RtcpCollector] Cleaned up reports for meeting ${meetingId}`);
  }
}

