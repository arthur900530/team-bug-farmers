# API Specification

This API surface defines the complete client–server interface for joining meetings, transporting audio, and coordinating adaptive quality control and integrity verification.

Client-side APIs cover signaling, simulcast encoding, RTP send/receive, and CRC fingerprint submission.  
Server-side APIs manage signaling messages, session state, adaptive tier selection, stream forwarding, RTCP aggregation, and ACK summarization.

---

# Client-Side APIs

## `SignalingClient`

```ts
class SignalingClient {
  connect(url: string): Promise<void>
  sendJoin(meetingId: string, userId: string): void
  sendOffer(sdp: string): void
  sendAnswer(sdp: string): void
  sendIceCandidate(candidate: IceCandidate): void

  // Events
  onAnswer(callback: (sdp: string) => void): void
  onIceCandidate(callback: (candidate: IceCandidate) => void): void
  onTierChange(callback: (tier: string) => void): void
  onAckSummary(callback: (summary: AckSummary) => void): void
}
````

---

## `UserClient`

```ts
class UserClient {
  constructor(userId: string, meetingId: string)

  joinMeeting(): Promise<void>
  leaveMeeting(): void
  createOffer(): Promise<string>
  handleAnswer(sdp: string): void
  sendRtcpSr(): void
  computeCrc32(frame: AudioFrame): string
}
```

---

## `AudioCapture`

```ts
interface AudioCapture extends AudioProcessor {
  start(): Promise<MediaStream>
  stop(): void
  readFrame(): PCMFrame
}
```

---

## `SimulcastEncoder`

```ts
interface SimulcastEncoder extends AudioProcessor {
  bitrates: [16000, 32000, 64000]
  encode(frame: PCMFrame): EncodedFrame[]
}
```

---

## `RtpSender / RtpReceiver`

```ts
interface RtpSender extends RtpEndpoint {
  send(frames: EncodedFrame[]): void
}

interface RtpReceiver extends RtpEndpoint {
  onRtp(frame: EncodedFrame): void
  onRtcp(report: RtcpReport): void
}
```

---

# Server-Side APIs

## WebSocket Signaling Messages

### ✅ Incoming (client → server)

| Type            | Description                     |
| --------------- | ------------------------------- |
| `join`          | User requests to join a meeting |
| `offer`         | SDP offer from client           |
| `answer`        | SDP answer from client          |
| `ice-candidate` | ICE candidate from client       |
| `leave`         | User leaving meeting            |

**JSON Schemas**

```jsonc
{ "type": "join", "meetingId": "...", "userId": "...", "displayName": "..." }
{ "type": "offer", "sdp": "...", "userId": "..." }
{ "type": "answer", "sdp": "...", "userId": "..." }
{ "type": "ice-candidate", "candidate": { ... }, "userId": "..." }
{ "type": "leave", "meetingId": "...", "userId": "..." }
```

**Note:** User authentication is performed via JWT token in the WebSocket connection upgrade headers, not in the message body.

---

### ✅ Outgoing (server → client)

| Type            | Description                         |
| --------------- | ----------------------------------- |
| `joined`        | Join confirmation, participant list |
| `offer`         | Forwarded offer                     |
| `answer`        | Forwarded answer                    |
| `ice-candidate` | Forwarded candidate                 |
| `tier-change`   | Adaptive quality tier update        |
| `ack-summary`   | CRC32 integrity results             |
| `user-joined`   | New participant joined              |
| `user-left`     | Participant left                    |

**JSON Schemas**

```jsonc
{ "type": "joined", "meetingId": "...", "userId": "...", "success": true, "participants": ["u1","u2"], "timestamp": 123 }
{ "type": "offer", "sdp": "...", "fromUserId": "..." }
{ "type": "answer", "sdp": "...", "fromUserId": "..." }
{ "type": "ice-candidate", "candidate": { ... }, "fromUserId": "..." }
{ "type": "tier-change", "tier": "LOW", "timestamp": 123 }
{ "type": "ack-summary", "ackedUsers": ["A","B"], "missingUsers": ["C"], "timestamp": 123 }
{ "type": "user-joined", "userId": "..." }
{ "type": "user-left", "userId": "..." }
```

---

## `MeetingRegistry`

```ts
class MeetingRegistry {
  registerUser(meetingId: string, session: UserSession): void
  removeUser(meetingId: string, userId: string): void
  listRecipients(meetingId: string, excludeUserId?: string): UserSession[]
  getMeeting(meetingId: string): Meeting | null
  updateQualityTier(meetingId: string, tier: string): void
}
```

---

## `StreamForwarder`

```ts
class StreamForwarder {
  forward(meetingId: string, tier: string, frames: EncodedFrame[]): void
  selectTierFor(userId: string): string
  setTier(meetingId: string, tier: 'LOW' | 'MEDIUM' | 'HIGH'): void
}
```

---

## `RtcpCollector`

```ts
class RtcpCollector {
  collect(report: RtcpReport): void
  getWorstLoss(meetingId: string): number
  getMetrics(meetingId: string): {
    avgLoss: number
    avgJitter: number
    avgRtt: number
    worstLoss: number
  }
}
```

---

## `QualityController`

```ts
class QualityController {
  lowThresh: number = 0.02   // 2%
  medThresh: number = 0.05   // 5%

  decideTier(worstLoss: number): 'LOW' | 'MEDIUM' | 'HIGH'
  broadcastTier(meetingId: string, tier: string): void
}
```

---

## `FingerprintVerifier`

```ts
class FingerprintVerifier {
  compare(sender: FrameFingerprint, receiver: FrameFingerprint): boolean
  onMatch(userId: string): void
  onMismatch(userId: string): void
}
```

---

## `AckAggregator`

```ts
class AckAggregator {
  onDecodeAck(userId: string, matched: boolean): void
  summaryForSpeaker(meetingId: string): AckSummary
  reset(meetingId: string): void
}
```

---

# Data Models

## FrameFingerprint

```ts
interface FrameFingerprint {
  frameId: string
  crc32: string
}
```

---

## IceCandidate

```ts
interface IceCandidate {
  type: 'host' | 'srflx' | 'relay'
  address: string
  port: number
}
```

---

## UserSession

```ts
interface UserSession {
  userId: string
  pcId: string
  qualityTier: 'LOW' | 'MEDIUM' | 'HIGH'
  lastCrc32: string
}
```

---

## RtcpReport

```ts
interface RtcpReport {
  userId: string
  lossPct: number
  jitterMs: number
  rttMs: number
  timestamp: number
}
```

---

## AckSummary

```ts
interface AckSummary {
  meetingId: string
  ackedUsers: string[]
  missingUsers: string[]
}
```

---

## PCMFrame

```ts
interface PCMFrame {
  samples: Float32Array
  sampleRate: number
  channels: number
}
```

---

## EncodedFrame

```ts
interface EncodedFrame {
  tier: 'LOW' | 'MEDIUM' | 'HIGH'
  data: Uint8Array
  timestamp: number
}
```