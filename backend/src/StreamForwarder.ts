/**
 * StreamForwarder - From dev_specs/APIs.md lines 157-164
 * Purpose: Routes RTP packets and selects a single quality tier based on worst receiver
 * 
 * From dev_specs/classes.md M2.3 (C2.3.1):
 * "Routes RTP packets and selects a single quality tier based on worst receiver"
 * 
 * From dev_specs/flow_charts.md line 73:
 * "RTP packets → StreamForwarder - All 3 tiers"
 * 
 * From dev_specs/public_interfaces.md lines 216-221:
 * - SFU forwards only one tier at a time (LOW/MED/HIGH)
 * - Chosen by Quality Controller
 * - SFU rewrites SSRCs for per-receiver mapping
 * 
 * Required Methods (from dev_specs/APIs.md):
 * - forward(meetingId, tier, frames): void
 * - selectTierFor(userId): string
 * - setTier(meetingId, tier): void
 * 
 * Implementation Status: INTEGRATED WITH MEDIASOUP
 * With mediasoup, RTP forwarding is handled automatically by Producer/Consumer.
 * StreamForwarder's role:
 * - Track tier selection per meeting (from QualityController)
 * - Configure which simulcast layer mediasoup forwards (via Consumer.setPreferredLayers)
 * - Coordinate tier changes across all consumers
 * 
 * Note: mediasoup handles SSRC rewriting automatically
 */

import { MeetingRegistry } from './MeetingRegistry';
import { MediasoupManager } from './MediasoupManager';
import type { EncodedFrame } from './types';

type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';

// Map tier to simulcast spatial layer
// From dev_specs/public_interfaces.md line 198: "16/32/64 kbps"
// LOW = 16 kbps (layer 0), MEDIUM = 32 kbps (layer 1), HIGH = 64 kbps (layer 2)
const TIER_TO_LAYER: Record<QualityTier, number> = {
  'LOW': 0,
  'MEDIUM': 1,
  'HIGH': 2
};

/**
 * StreamForwarder implementation (MEDIASOUP INTEGRATED)
 * From dev_specs/APIs.md lines 159-164
 */
export class StreamForwarder {
  private meetingRegistry: MeetingRegistry;
  private mediasoupManager: MediasoupManager;
  
  // Track current tier for each meeting
  // From public_interfaces.md: "SFU forwards only one tier at a time"
  private meetingTiers: Map<string, QualityTier> = new Map();
  
  // Track per-user tier selection (for adaptive quality per receiver)
  // From public_interfaces.md: "SFU rewrites SSRCs for per-receiver mapping"
  private userTiers: Map<string, QualityTier> = new Map();

  constructor(meetingRegistry: MeetingRegistry, mediasoupManager: MediasoupManager) {
    this.meetingRegistry = meetingRegistry;
    this.mediasoupManager = mediasoupManager;
    console.log('[StreamForwarder] Initialized with mediasoup integration');
  }

  /**
   * Forward RTP packets to all recipients in a meeting
   * From dev_specs/APIs.md line 161: "forward(meetingId: string, tier: string, frames: EncodedFrame[]): void"
   * From dev_specs/flow_charts.md line 73: "RTP packets → StreamForwarder - All 3 tiers"
   * 
   * With mediasoup:
   * - RTP forwarding is handled automatically by Producer/Consumer
   * - This method is called to notify when frames are sent
   * - We ensure the correct tier/layer is being forwarded
   * - mediasoup handles SSRC rewriting automatically
   */
  forward(meetingId: string, tier: QualityTier, frames: EncodedFrame[]): void {
    // Get current tier for this meeting
    const currentTier = this.meetingTiers.get(meetingId) || 'HIGH';
    
    // Get all recipients for this meeting
    // From dev_specs/classes.md line 202: "MeetingRegistry --> StreamForwarder : provides recipients"
    const recipients = this.meetingRegistry.listRecipients(meetingId);
    
    if (recipients.length === 0) {
      // No recipients yet, RTP will be forwarded when they join
      return;
    }
    
    // With mediasoup, frames are received from Producer and forwarded via Consumers
    // The actual forwarding is handled by mediasoup automatically
    // We just need to ensure the correct spatial layer is selected
    
    // From public_interfaces.md line 218: "SFU forwards only one tier at a time"
    const spatialLayer = TIER_TO_LAYER[currentTier];
    
    console.log(`[StreamForwarder] Forwarding tier ${currentTier} (layer ${spatialLayer}) to ${recipients.length} recipients in meeting ${meetingId}`);
    
    // For each recipient, ensure their consumer is set to the correct layer
    // This configures mediasoup to forward the selected simulcast layer
    recipients.forEach(recipient => {
      const userTier = this.selectTierFor(recipient.userId);
      const userLayer = TIER_TO_LAYER[userTier];
      
      // Note: In mediasoup, you'd call consumer.setPreferredLayers({ spatialLayer: userLayer })
      // We'll implement this when Consumers are fully tracked
      console.log(`[StreamForwarder] User ${recipient.userId} receiving tier ${userTier} (layer ${userLayer})`);
    });
    
    // mediasoup automatically:
    // 1. Receives RTP from Producer (all 3 simulcast layers)
    // 2. Forwards selected layer to each Consumer
    // 3. Rewrites SSRCs per Consumer (per-receiver mapping)
    // 4. Handles RTCP feedback
  }

  /**
   * Select quality tier for a specific user
   * From dev_specs/APIs.md line 162: "selectTierFor(userId: string): string"
   * 
   * Current Implementation (STUB):
   * - Returns user-specific tier if set, otherwise meeting tier
   * 
   * Future Implementation (mediasoup):
   * - Query QualityController for user's network conditions
   * - Select appropriate tier based on receiver's connection quality
   * - May differ per user (adaptive quality per receiver)
   */
  selectTierFor(userId: string): QualityTier {
    // Check if user has specific tier assigned
    if (this.userTiers.has(userId)) {
      return this.userTiers.get(userId)!;
    }
    
    // Default to meeting tier
    // In future, this would query QualityController for user-specific tier
    const meetingId = this.findMeetingForUser(userId);
    if (meetingId) {
      return this.meetingTiers.get(meetingId) || 'HIGH';
    }
    
    return 'HIGH'; // Default fallback
  }

  /**
   * Set quality tier for a meeting
   * From dev_specs/APIs.md line 163: "setTier(meetingId: string, tier: 'LOW' | 'MEDIUM' | 'HIGH'): void"
   * From dev_specs/classes.md line 206: "QualityController --> StreamForwarder : sets tier"
   * 
   * This is called by QualityController when adaptive quality changes
   * From public_interfaces.md line 219: "Chosen by Quality Controller"
   * 
   * With mediasoup:
   * - Changes the spatial layer that Consumers receive
   * - mediasoup handles smooth transition between layers
   * 
   * From USER_STORY_8_IMPLEMENTATION_GUIDE.md: Now implements actual layer switching
   */
  async setTier(meetingId: string, tier: QualityTier): Promise<void> {
    const previousTier = this.meetingTiers.get(meetingId);
    
    if (previousTier === tier) {
      console.log(`[StreamForwarder] Tier for meeting ${meetingId} already set to ${tier}`);
      return;
    }
    
    this.meetingTiers.set(meetingId, tier);
    const spatialLayer = TIER_TO_LAYER[tier];
    
    console.log(`[StreamForwarder] Set tier for meeting ${meetingId}: ${previousTier || 'none'} → ${tier} (layer ${spatialLayer})`);
    
    // Update MeetingRegistry
    // From dev_specs/APIs.md: MeetingRegistry.updateQualityTier
    this.meetingRegistry.updateQualityTier(meetingId, tier);
    
    // Update all consumers in this meeting to use the new tier
    // From dev_specs/public_interfaces.md: "SFU forwards only one tier at a time"
    const recipients = this.meetingRegistry.listRecipients(meetingId);
    
    console.log(`[StreamForwarder] Updating ${recipients.length} consumers to tier ${tier} (layer ${spatialLayer})`);
    
    // Update all consumers in this meeting to use the new tier
    // From USER_STORY_8_IMPLEMENTATION_GUIDE.md: Use setPreferredLayers() to switch layers
    const updatePromises: Promise<void>[] = [];
    
    for (const recipient of recipients) {
      const consumers = this.mediasoupManager.getConsumersForUser(recipient.userId);
      for (const consumer of consumers) {
        updatePromises.push(
          consumer.setPreferredLayers({ spatialLayer })
            .then(() => {
              console.log(`[StreamForwarder] Updated consumer ${consumer.id} to layer ${spatialLayer} (tier ${tier})`);
            })
            .catch((error) => {
              console.error(`[StreamForwarder] Error setting layers for consumer ${consumer.id}:`, error);
            })
        );
      }
    }
    
    // Wait for all layer updates to complete
    await Promise.all(updatePromises);
    
    // mediasoup handles:
    // 1. Smooth layer transition (no glitches)
    // 2. Keyframe requests if needed
    // 3. RTCP feedback to sender
  }

  /**
   * Set tier for a specific user (for per-user adaptive quality)
   * This is a helper method for future per-user quality control
   * Not in dev_specs APIs.md, but useful for mediasoup integration
   */
  setTierForUser(userId: string, tier: QualityTier): void {
    const previousTier = this.userTiers.get(userId);
    
    if (previousTier === tier) {
      return;
    }
    
    this.userTiers.set(userId, tier);
    console.log(`[StreamForwarder] Set tier for user ${userId}: ${previousTier || 'none'} → ${tier}`);
    
    // STUB: In real implementation, this would:
    // 1. Update mediasoup Consumer for this user
    // 2. Switch to appropriate simulcast layer
    // 3. Maintain smooth transition
  }

  /**
   * Get current tier for a meeting
   * Helper method
   */
  getTier(meetingId: string): QualityTier {
    return this.meetingTiers.get(meetingId) || 'HIGH';
  }

  /**
   * Find meeting ID for a user
   * Helper method to locate user's meeting
   */
  private findMeetingForUser(userId: string): string | null {
    const meetings = this.meetingRegistry.getAllMeetings();
    
    for (const meeting of meetings) {
      const userSession = meeting.sessions.find(s => s.userId === userId);
      if (userSession) {
        return meeting.meetingId;
      }
    }
    
    return null;
  }

  /**
   * Cleanup meeting data when meeting ends
   * Called when last user leaves a meeting
   */
  cleanupMeeting(meetingId: string): void {
    this.meetingTiers.delete(meetingId);
    
    // Clean up user tiers for users in this meeting
    const meeting = this.meetingRegistry.getMeeting(meetingId);
    if (meeting) {
      meeting.sessions.forEach(session => {
        this.userTiers.delete(session.userId);
      });
    }
    
    console.log(`[StreamForwarder] Cleaned up meeting ${meetingId}`);
  }

  /**
   * Get statistics for monitoring
   * Useful for debugging and metrics
   */
  getStats(): {
    activeMeetings: number;
    meetings: Array<{ meetingId: string; tier: QualityTier }>;
    userTiers: number;
  } {
    return {
      activeMeetings: this.meetingTiers.size,
      meetings: Array.from(this.meetingTiers.entries()).map(([meetingId, tier]) => ({
        meetingId,
        tier
      })),
      userTiers: this.userTiers.size
    };
  }
}

