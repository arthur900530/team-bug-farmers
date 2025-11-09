/**
 * Type definitions from dev_specs/data_schemas.md and dev_specs/public_interfaces.md
 * These types MUST match the specification exactly
 */

// From data_schemas.md - DS-01
export interface UserSession {
  userId: string;
  pcId: string;
  qualityTier: 'LOW' | 'MEDIUM' | 'HIGH';
  lastCrc32: string;
  connectionState: ConnectionState;
  timestamp: number;
}

// From data_schemas.md - DS-02
export interface Meeting {
  meetingId: string;
  currentTier: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: number;
  sessions: UserSession[];
}

// From state_diagrams.md - Section 1
export type ConnectionState =
  | 'Disconnected'
  | 'Connecting'
  | 'Signaling'
  | 'Offering'
  | 'ICE_Gathering'
  | 'Waiting_Answer'
  | 'Connected'
  | 'Streaming'
  | 'Degraded'
  | 'Reconnecting'
  | 'Disconnecting';

// From data_schemas.md - DS-07
export interface IceCandidate {
  type: 'host' | 'srflx' | 'relay';
  address: string;
  port: number;
  priority?: number;
}

// From public_interfaces.md - Client → Server Messages
export interface JoinMessage {
  type: 'join';
  meetingId: string;
  userId: string;
  displayName: string;
}

export interface OfferMessage {
  type: 'offer';
  meetingId: string;
  sdp: string;
}

export interface AnswerMessage {
  type: 'answer';
  meetingId: string;
  sdp: string;
}

export interface IceCandidateMessage {
  type: 'ice-candidate';
  meetingId: string;
  candidate: string;
  sdpMid: string;
  sdpMLineIndex: number;
}

export interface LeaveMessage {
  type: 'leave';
  meetingId: string;
  userId: string;
}

// From public_interfaces.md - Server → Client Messages
export interface JoinedMessage {
  type: 'joined';
  meetingId: string;
  userId: string;
  success: boolean;
  participants: string[];
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  code: number;
  message: string;
}

// Union type for all client messages
export type ClientMessage =
  | JoinMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | LeaveMessage
  | FingerprintMessage  // User Story 3: Frame fingerprint messages
  | RtcpReportMessage;  // User Story 8: RTCP report messages

// Union type for all server messages
export type ServerMessage =
  | JoinedMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | ErrorMessage
  | AckSummaryMessage  // User Story 3: ACK summary messages
  | TierChangeMessage; // User Story 8: Tier change messages

// From dev_specs/APIs.md lines 300-307: EncodedFrame
export interface EncodedFrame {
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  data: Uint8Array;
  timestamp: number;
}

// From data_schemas.md - DS-04: FrameFingerprint
// Runtime Location: FingerprintVerifier
// Mapping: Map<frameId, FrameFingerprint>
// TTL: 15 seconds
export interface FrameFingerprint {
  frameId: string;        // hex, 16 chars (from data_schemas.md line 101)
  crc32: string;          // hex, 8 chars (from data_schemas.md line 102)
  senderUserId: string;   // UUID (from data_schemas.md line 103)
  receiverCrc32s?: Map<string, string>;  // map<userId, crc32> (from data_schemas.md line 104)
  timestamp: number;      // int64 (from data_schemas.md line 105)
}

// From data_schemas.md - DS-05: AckSummary
// Runtime Location: AckAggregator
// Persistence: Ephemeral; discarded after sending to UI
export interface AckSummary {
  meetingId: string;       // UUID (from data_schemas.md line 125)
  ackedUsers: string[];   // Successful receivers (from data_schemas.md line 126)
  missingUsers: string[]; // Failed/timed-out receivers (from data_schemas.md line 127)
  timestamp: number;     // int64 (from data_schemas.md line 128)
}

// From public_interfaces.md - Client → Server Message
// Fingerprint message sent via WebSocket
export interface FingerprintMessage {
  type: 'frame-fingerprint';
  frameId: string;
  crc32: string;
  senderUserId?: string;   // For sender fingerprints
  receiverUserId?: string; // For receiver fingerprints
  timestamp: number;
  rtpTimestamp?: number;   // For frame matching (approximation approach)
}

// From public_interfaces.md - Server → Client Message
// ACK summary message (line 124: "ack-summary")
export interface AckSummaryMessage {
  type: 'ack-summary';
  meetingId: string;
  ackedUsers: string[];
  missingUsers: string[];
  timestamp: number;
}

// From data_schemas.md - DS-03: RtcpReport
// Runtime Location: RtcpCollector
// Mapping: Map<userId, RtcpReport[]>
// Retention: Sliding window of last 10 reports per user
export interface RtcpReport {
  userId: string;        // UUID (from data_schemas.md line 75)
  lossPct: number;       // float32 (from data_schemas.md line 76)
  jitterMs: number;      // float32 (from data_schemas.md line 77)
  rttMs: number;         // float32 (from data_schemas.md line 78)
  timestamp: number;     // int64 (from data_schemas.md line 79)
}

// From public_interfaces.md - Client → Server Message
// RTCP report message sent via WebSocket
export interface RtcpReportMessage {
  type: 'rtcp-report';
  userId: string;
  lossPct: number;       // 0.0 to 1.0
  jitterMs: number;      // milliseconds
  rttMs: number;         // milliseconds
  timestamp: number;     // Unix milliseconds
}

// From public_interfaces.md - Server → Client Message
// Tier change message (line 124: "tier-change")
export interface TierChangeMessage {
  type: 'tier-change';
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: number;
}

