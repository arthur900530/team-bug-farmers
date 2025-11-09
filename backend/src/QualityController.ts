/**
 * QualityController - From dev_specs/APIs.md lines 186-195
 * Purpose: Decide quality tier based on worst receiver loss
 * 
 * From dev_specs/classes.md C2.4.2:
 * "Decides tier based on worst receiver loss"
 * 
 * From dev_specs/public_interfaces.md lines 287-291:
 * - Reads worst-loss metrics
 * - Selects tier: LOW / MEDIUM / HIGH
 * - Instructs Stream Forwarder to switch tiers
 * 
 * From dev_specs/flow_charts.md lines 140-142:
 * - loss < 2% → HIGH tier (64 kbps)
 * - 2% ≤ loss < 5% → MEDIUM tier (32 kbps)
 * - loss ≥ 5% → LOW tier (16 kbps)
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - decideTier(worstLoss: number): 'LOW' | 'MEDIUM' | 'HIGH'
 * - broadcastTier(meetingId: string, tier: string): void
 */

import { RtcpCollector } from './RtcpCollector';
import { StreamForwarder } from './StreamForwarder';
import { MeetingRegistry } from './MeetingRegistry';

type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';

export class QualityController {
  private rtcpCollector: RtcpCollector;
  private streamForwarder: StreamForwarder;
  private meetingRegistry: MeetingRegistry;
  
  // Thresholds from dev_specs/APIs.md lines 190-191
  lowThresh: number = 0.02;   // 2%
  medThresh: number = 0.05;   // 5%
  
  // Hysteresis to prevent rapid tier changes (Decision 3 from implementation guide)
  hysteresis: number = 0.02;  // 2%

  constructor(
    rtcpCollector: RtcpCollector,
    streamForwarder: StreamForwarder,
    meetingRegistry: MeetingRegistry
  ) {
    this.rtcpCollector = rtcpCollector;
    this.streamForwarder = streamForwarder;
    this.meetingRegistry = meetingRegistry;
  }

  /**
   * Decide quality tier based on worst receiver loss
   * From dev_specs/APIs.md line 193: "decideTier(worstLoss: number): 'LOW' | 'MEDIUM' | 'HIGH'"
   * 
   * From dev_specs/flow_charts.md lines 140-142:
   * - loss < 2% → HIGH tier (64 kbps)
   * - 2% ≤ loss < 5% → MEDIUM tier (32 kbps)
   * - loss ≥ 5% → LOW tier (16 kbps)
   * 
   * Hysteresis Implementation (Decision 3):
   * - Apply 2% hysteresis to prevent rapid tier changes
   * - If currently HIGH: only downgrade to MEDIUM if loss ≥ 4% (2% + 2% hysteresis)
   * - If currently MEDIUM: downgrade to LOW if loss ≥ 5%, upgrade to HIGH if loss < 2%
   * - If currently LOW: only upgrade to MEDIUM if loss < 3% (5% - 2% hysteresis)
   */
  decideTier(worstLoss: number, currentTier?: QualityTier): QualityTier {
    // If no current tier, use simple thresholds
    if (!currentTier) {
      if (worstLoss < this.lowThresh) {
        return 'HIGH';
      } else if (worstLoss < this.medThresh) {
        return 'MEDIUM';
      } else {
        return 'LOW';
      }
    }
    
    // Apply hysteresis based on current tier
    switch (currentTier) {
      case 'HIGH':
        // Only downgrade to MEDIUM if loss ≥ 4% (2% + 2% hysteresis)
        if (worstLoss >= this.lowThresh + this.hysteresis) {
          // Check if should downgrade to LOW
          if (worstLoss >= this.medThresh) {
            return 'LOW';
          }
          return 'MEDIUM';
        }
        return 'HIGH';
        
      case 'MEDIUM':
        // Downgrade to LOW if loss ≥ 5%
        if (worstLoss >= this.medThresh) {
          return 'LOW';
        }
        // Upgrade to HIGH if loss < 2%
        if (worstLoss < this.lowThresh) {
          return 'HIGH';
        }
        return 'MEDIUM';
        
      case 'LOW':
        // Only upgrade to MEDIUM if loss < 3% (5% - 2% hysteresis)
        if (worstLoss < this.medThresh - this.hysteresis) {
          // Check if should upgrade to HIGH
          if (worstLoss < this.lowThresh) {
            return 'HIGH';
          }
          return 'MEDIUM';
        }
        return 'LOW';
        
      default:
        // Fallback to simple thresholds
        if (worstLoss < this.lowThresh) {
          return 'HIGH';
        } else if (worstLoss < this.medThresh) {
          return 'MEDIUM';
        } else {
          return 'LOW';
        }
    }
  }

  /**
   * Evaluate meeting and update tier if needed
   * Called periodically (every 5 seconds) from SignalingServer
   * From dev_specs/flow_charts.md lines 130-159: Adaptive Quality Control Loop
   */
  async evaluateMeeting(meetingId: string): Promise<void> {
    const meeting = this.meetingRegistry.getMeeting(meetingId);
    if (!meeting) {
      console.warn(`[QualityController] Cannot evaluate: Meeting ${meetingId} not found`);
      return;
    }
    
    // Get worst loss from RtcpCollector
    const worstLoss = this.rtcpCollector.getWorstLoss(meetingId);
    
    // Get current tier
    const currentTier = meeting.currentTier;
    
    // Decide new tier
    const newTier = this.decideTier(worstLoss, currentTier);
    
    // Only update if tier changed
    if (newTier !== currentTier) {
      console.log(`[QualityController] Tier change for meeting ${meetingId}: ${currentTier} → ${newTier} (worstLoss: ${(worstLoss * 100).toFixed(2)}%)`);
      
      // Update StreamForwarder (async - switches mediasoup Consumer layers)
      await this.streamForwarder.setTier(meetingId, newTier);
      
      // Update MeetingRegistry
      this.meetingRegistry.updateQualityTier(meetingId, newTier);
      
      // Broadcast tier change (will be handled by SignalingServer)
      // Note: broadcastTier is called by SignalingServer after this method
    } else {
      console.log(`[QualityController] No tier change for meeting ${meetingId}: ${currentTier} (worstLoss: ${(worstLoss * 100).toFixed(2)}%)`);
    }
  }

  /**
   * Broadcast tier change to all participants
   * From dev_specs/APIs.md line 194: "broadcastTier(meetingId: string, tier: string): void"
   * 
   * Note: This method is called by SignalingServer to send tier-change messages
   * The actual WebSocket broadcasting is handled by SignalingServer
   */
  broadcastTier(meetingId: string, tier: QualityTier): void {
    // This method is a placeholder - actual broadcasting is done by SignalingServer
    // It's kept here for API compatibility with dev_specs/APIs.md
    console.log(`[QualityController] Tier ${tier} broadcast requested for meeting ${meetingId}`);
  }
}

