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
  | LeaveMessage;

// Union type for all server messages
export type ServerMessage =
  | JoinedMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | ErrorMessage;

// From dev_specs/APIs.md lines 300-307: EncodedFrame
export interface EncodedFrame {
  tier: 'LOW' | 'MEDIUM' | 'HIGH';
  data: Uint8Array;
  timestamp: number;
}

