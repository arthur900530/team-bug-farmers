# Flow Charts

The flowcharts illustrate the full lifecycle of a real-time audio session—from joining a meeting, establishing signaling and media paths, and streaming audio, to adaptive quality adjustment, fingerprint-based delivery verification, and meeting teardown.

They also detail:

- media flow from capture → playback  
- reactions to changing network conditions  
- ACK-based integrity verification  
- reliable session setup and teardown  

---

## 1. Meeting Join & Connection Setup

**Image:**  
![Meeting Join & Connection Setup](diagrams/meeting_join_setup.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([User clicks Join Meeting]) --> Init[UserClient.joinMeeting<br>meetingId, userId]
    Init --> WSConnect[SignalingClient.connect<br>WebSocket URL]
    WSConnect --> SendJoin[SignalingClient.sendJoin<br>meetingId, userId]
    SendJoin --> Auth{SignalingServer.authenticate<br>userId, token}
    
    Auth -->|Failed| AuthError[Return 401 Unauthorized]
    AuthError --> End1([Connection Failed])
    
    Auth -->|Success| CreateOffer[UserClient.createOffer<br>Generate SDP]
    CreateOffer --> GatherICE[Gather ICE candidates]
    GatherICE --> SendOffer[SignalingClient.sendOffer<br>SDP + ICE candidates]
    SendOffer --> RelayOffer[SignalingServer.relayOffer<br>to other participants]
    
    RelayOffer --> CreateAnswer[Other participants<br>create SDP answer]
    CreateAnswer --> SendAnswer[SignalingServer.relayAnswer<br>back to sender]
    SendAnswer --> HandleAnswer[UserClient.handleAnswer<br>Set remote description]
    
    HandleAnswer --> RegisterUser[MeetingRegistry.registerUser<br>meetingId, UserSession]
    RegisterUser --> StoreSession[Create UserSession<br>userId, pcId, qualityTier: HIGH]
    StoreSession --> NotifyOthers[SignalingServer.notify<br>User joined event]
    
    NotifyOthers --> Connected([Connection Established<br>Ready for media])
````

---

## 2. Audio Transmission Pipeline (Sender)

**Image:**
![Audio Transmission Pipeline](diagrams/audio_transmission_sender.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([Media Stream Active]) --> Capture[AudioCapture.start<br>Open microphone]
    Capture --> ReadFrame[AudioCapture.readFrame<br>Get PCM frame 20ms]
    
    ReadFrame --> Encode[SimulcastEncoder.encode<br>frame → 3 tiers]
    Encode --> Low[Low tier: 16 kbps]
    Encode --> Med[Medium tier: 32 kbps]
    Encode --> High[High tier: 64 kbps]
    
    Low --> ComputeCRC[UserClient.computeCrc32<br>encoded frame]
    Med --> ComputeCRC
    High --> ComputeCRC
    
    ComputeCRC --> CreateFP[Create FrameFingerprint<br>frameId, crc32]
    CreateFP --> SendRTP["RtpSender.send<br>frames: EncodedFrame[3]"]
    
    SendRTP --> ToSFU[RTP packets → StreamForwarder<br>All 3 tiers]
    ToSFU --> SendSR[RtpSender.sendRtcpSr<br>Sender Report]
    
    SendSR --> SendFingerprint[Send FrameFingerprint<br>to FingerprintVerifier]
    SendFingerprint --> CheckStop{AudioCapture.stop<br>called?}
    
    CheckStop -->|No| ReadFrame
    CheckStop -->|Yes| Cleanup[Close microphone<br>Stop encoding]
    Cleanup --> End([Transmission Stopped])
```

---

## 3. Audio Reception Pipeline (Receiver)

**Image:**
![Audio Reception Pipeline](diagrams/audio_reception_receiver.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([RTP Packet Received]) --> OnRTP[RtpReceiver.onRtp<br>EncodedFrame]
    OnRTP --> CheckTier{Verify tier<br>matches current<br>quality setting}
    
    CheckTier -->|Wrong tier| Drop[Drop packet]
    Drop --> End1([Packet Discarded])
    
    CheckTier -->|Correct tier| Decode[AudioDecoder.decode<br>EncodedFrame → PCMFrame]
    Decode --> Play[AudioPlayer.play<br>PCMFrame to speakers]
    
    Play --> ComputeCRC[UserClient.computeCrc32<br>decoded frame]
    ComputeCRC --> CreateFP[Create FrameFingerprint<br>frameId, crc32]
    CreateFP --> SendFingerprint[Send decoded CRC32<br>to FingerprintVerifier]
    
    SendFingerprint --> UpdateStats[Update reception stats<br>packets received, jitter]
    UpdateStats --> SendRTCP[RtpReceiver.onRtcp<br>Generate RTCP RR]
    
    SendRTCP --> CreateReport[Create RtcpReport<br>userId, lossPct, jitterMs, rttMs]
    CreateReport --> ToCollector[Send to RtcpCollector]
    
    ToCollector --> CheckNext{More packets?}
    CheckNext -->|Yes| OnRTP
    CheckNext -->|No| End2([Reception Complete])
```

---

## 4. Adaptive Quality Control Loop

**Image:**
![Adaptive Quality Control Loop](diagrams/adaptive_quality_control.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([RTCP Interval Triggered<br>Every 5 seconds]) --> Collect[RtcpCollector.collect<br>Gather all RtcpReports]
    
    Collect --> GetContext[MeetingRegistry<br>provides meeting context]
    GetContext --> Aggregate[Aggregate reports<br>for meetingId]
    
    Aggregate --> ComputeWorst[RtcpCollector.getWorstLoss<br>SELECT MAX loss% FROM reports]
    ComputeWorst --> ToController[Send worstLoss<br>to QualityController]
    
    ToController --> Decide{QualityController.decideTier<br>worstLoss}
    
    Decide -->|loss < 2%| SelectHigh[Select HIGH tier<br>64 kbps]
    Decide -->|2% ≤ loss < 5%| SelectMed[Select MEDIUM tier<br>32 kbps]
    Decide -->|loss ≥ 5%| SelectLow[Select LOW tier<br>16 kbps]
    
    SelectHigh --> CheckChange{Tier changed<br>from current?}
    SelectMed --> CheckChange
    SelectLow --> CheckChange
    
    CheckChange -->|No| NoAction[No action needed]
    NoAction --> End1([Wait next interval])
    
    CheckChange -->|Yes| UpdateMeeting[Update Meeting.currentTier<br>in MeetingRegistry]
    UpdateMeeting --> SetForwarder[QualityController.broadcastTier<br>Set StreamForwarder tier]
    
    SetForwarder --> NotifyClients[SignalingServer.notify<br>Tier change to all participants]
    NotifyClients --> UpdateSessions[Update UserSession.qualityTier<br>for all users]
    
    UpdateSessions --> ForwardNew[StreamForwarder.forward<br>Start forwarding new tier]
    ForwardNew --> End2([Quality Adjusted])
```

---

## 5. Fingerprint Verification & ACK Flow

**Image:**
![Fingerprint Verification Flow](diagrams/fingerprint_verification_flow.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([Fingerprints Received]) --> ReceiveSender[Receive sender's<br>encoded FrameFingerprint]
    ReceiveSender --> ReceiveReceivers[Receive all receivers'<br>decoded FrameFingerprints]
    
    ReceiveReceivers --> LoopStart{For each receiver}
    LoopStart --> Compare[FingerprintVerifier.compare<br>sender.crc32 vs receiver.crc32]
    
    Compare --> Match{CRC32 match?}
    
    Match -->|Yes| OnMatch[FingerprintVerifier.onMatch<br>userId]
    OnMatch --> RecordACK[AckAggregator.onDecodeAck<br>userId: ACK]
    
    Match -->|No| OnMismatch[FingerprintVerifier.onMismatch<br>userId]
    OnMismatch --> RecordNACK[Record userId: NACK]
    
    RecordACK --> NextUser{More receivers?}
    RecordNACK --> NextUser
    
    NextUser -->|Yes| LoopStart
    NextUser -->|No| GenerateSummary[AckAggregator.summaryForSpeaker<br>meetingId]
    
    GenerateSummary --> CreateSummary["Create AckSummary<br>ackedUsers, missingUsers"]
    CreateSummary --> SendViaSignaling[Send via SignalingClient<br>to speaker's UserClient]
    
    SendViaSignaling --> DisplayUI["UserClient displays UI<br>✓ User A, User B<br>✗ User C connection issue"]
    
    DisplayUI --> End([Feedback Complete])
```

---

## 6. Meeting Teardown

**Image:**
![Meeting Teardown Flowchart](diagrams/meeting_teardown.png)

### Mermaid (Source)

```mermaid
flowchart TD
    Start([User clicks Leave]) --> LeaveRequest[UserClient initiates<br>disconnect]
    LeaveRequest --> StopCapture{Is sender?}
    
    StopCapture -->|Yes| StopAudio[AudioCapture.stop<br>Close microphone]
    StopAudio --> StopPlayer
    StopCapture -->|No| StopPlayer[AudioPlayer.stop<br>Close speakers]
    
    StopPlayer --> CloseRTP[Close RtpSender<br>and RtpReceiver]
    CloseRTP --> SendLeave[SignalingClient sends<br>leave notification]
    
    SendLeave --> ServerReceive[SignalingServer receives<br>leave event]
    ServerReceive --> Unregister[MeetingRegistry.removeUser<br>meetingId, userId]
    
    Unregister --> RemoveSession[Delete UserSession<br>from Meeting]
    RemoveSession --> CheckLast{Last user<br>in meeting?}
    
    CheckLast -->|Yes| DeleteMeeting[Delete Meeting object<br>from registry]
    DeleteMeeting --> StopForwarder[StreamForwarder cleanup<br>for meetingId]
    
    CheckLast -->|No| UpdateRecipients[Update recipient list<br>for remaining users]
    UpdateRecipients --> StopForwarder
    
    StopForwarder --> NotifyOthers[SignalingServer.notify<br>User left event to others]
    NotifyOthers --> RecalcQuality{Recalculate quality<br>needed?}
    
    RecalcQuality -->|Yes| TriggerQC[Trigger QualityController<br>with updated metrics]
    TriggerQC --> CloseWS
    RecalcQuality -->|No| CloseWS[Close WebSocket connection]
    
    CloseWS --> ClientCleanup[UserClient cleanup<br>Free resources]
    ClientCleanup --> End([Disconnected])
```
