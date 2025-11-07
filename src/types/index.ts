// Type definitions matching Dev Spec data_schemas.md and APIs.md

export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';

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

export interface UserSession {
  userId: string;
  pcId: string;
  qualityTier: QualityTier;
  lastCrc32: string;
  connectionState: ConnectionState;
  timestamp: number;
}

export interface Meeting {
  meetingId: string;
  currentTier: QualityTier;
  createdAt: number;
}

export interface FrameFingerprint {
  frameId: string;
  crc32: string;
}

export interface RtcpReport {
  userId: string;
  lossPct: number;
  jitterMs: number;
  rttMs: number;
  timestamp: number;
}

export interface AckSummary {
  meetingId: string;
  ackedUsers: string[];
  missingUsers: string[];
}

export interface PCMFrame {
  samples: Float32Array;
  sampleRate: number;
  channels: number;
}

export interface EncodedFrame {
  tier: QualityTier;
  data: Uint8Array;
  timestamp: number;
}

export interface IceCandidate {
  type: 'host' | 'srflx' | 'relay';
  address: string;
  port: number;
}

// WebSocket Message Types (from public_interfaces.md)
export interface JoinMessage {
  type: 'join';
  meetingId: string;
  userId: string;
  displayName: string;
}

export interface JoinedMessage {
  type: 'joined';
  meetingId: string;
  userId: string;
  success: boolean;
  participants: string[];
  timestamp: number;
}

export interface TierChangeMessage {
  type: 'tier-change';
  tier: QualityTier;
  timestamp: number;
}

export interface AckSummaryMessage {
  type: 'ack-summary';
  ackedUsers: string[];
  missingUsers: string[];
  timestamp: number;
}

export interface ErrorMessage {
  type: 'error';
  code: number;
  message: string;
}

// Error codes from public_interfaces.md
export enum ErrorCode {
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  ServerOverloaded = 503
}

