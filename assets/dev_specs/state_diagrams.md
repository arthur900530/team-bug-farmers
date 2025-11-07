# State Diagrams

These state diagrams describe how the system manages user session lifecycle, tier-based quality control, simulcast stream forwarding, CRC-based audio verification, client-side audio processing, and active meeting membership.

Together, they visualize the end-to-end pipeline of:

- joining a meeting  
- establishing WebRTC signaling  
- streaming simulcast audio  
- adjusting tier quality  
- verifying end-to-end CRC32 delivery  
- maintaining meeting membership and session state  

---

## 1. User Session State Diagram

**Image:**  
![User Session State Diagram](diagrams/user_session_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> Connecting: joinMeeting()
    Connecting --> Signaling: WebSocket connected
    Signaling --> Offering: sendOffer()
    Offering --> ICE_Gathering: SDP generated
    ICE_Gathering --> Waiting_Answer: ICE candidates sent
    Waiting_Answer --> Connected: receiveAnswer()
    
    Connected --> Streaming: Media flowing
    Streaming --> Streaming: Receive tier change
    Streaming --> Degraded: Network issues detected
    Degraded --> Streaming: Network recovered
    Degraded --> Reconnecting: Connection lost
    
    Connected --> Disconnecting: Leave meeting
    Streaming --> Disconnecting: Leave meeting
    Degraded --> Disconnecting: Leave meeting
    Reconnecting --> Connected: Reconnected
    Reconnecting --> Disconnected: Reconnect failed
    Disconnecting --> Disconnected: Cleanup complete
    
    Disconnected --> [*]
````

---

## 2. Quality Controller State Diagram

**Image:**
![Quality Controller State Diagram](diagrams/quality_controller_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Collecting: Meeting started
    Collecting --> Analyzing: RTCP reports received
    Analyzing --> High_Quality: worstLoss < lowThresh
    Analyzing --> Medium_Quality: lowThresh ≤ worstLoss < medThresh
    Analyzing --> Low_Quality: worstLoss ≥ medThresh
    
    High_Quality --> Collecting: Next interval
    Medium_Quality --> Collecting: Next interval
    Low_Quality --> Collecting: Next interval
    
    High_Quality --> Medium_Quality: Quality degraded
    High_Quality --> Low_Quality: Quality degraded
    Medium_Quality --> High_Quality: Quality improved
    Medium_Quality --> Low_Quality: Quality degraded
    Low_Quality --> Medium_Quality: Quality improved
    Low_Quality --> High_Quality: Quality improved
    
    High_Quality --> Idle: Meeting ended
    Medium_Quality --> Idle: Meeting ended
    Low_Quality --> Idle: Meeting ended
    Collecting --> Idle: Meeting ended
    
    Idle --> [*]
    
    note right of Analyzing
        decideTier(worstLoss)
        broadcastTier(meetingId, tier)
    end note
```

---

## 3. Stream Forwarder State Diagram

**Image:**
![Stream Forwarder State Diagram](diagrams/stream_forwarder_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Waiting_Streams: Meeting created
    Waiting_Streams --> Forwarding_High: Tier set to HIGH
    Waiting_Streams --> Forwarding_Medium: Tier set to MEDIUM
    Waiting_Streams --> Forwarding_Low: Tier set to LOW
    
    Forwarding_High --> Forwarding_High: Forward high tier packets
    Forwarding_Medium --> Forwarding_Medium: Forward medium tier packets
    Forwarding_Low --> Forwarding_Low: Forward low tier packets
    
    Forwarding_High --> Forwarding_Medium: Downgrade to MEDIUM
    Forwarding_High --> Forwarding_Low: Downgrade to LOW
    Forwarding_Medium --> Forwarding_High: Upgrade to HIGH
    Forwarding_Medium --> Forwarding_Low: Downgrade to LOW
    Forwarding_Low --> Forwarding_Medium: Upgrade to MEDIUM
    Forwarding_Low --> Forwarding_High: Upgrade to HIGH
    
    Forwarding_High --> Idle: Meeting ended
    Forwarding_Medium --> Idle: Meeting ended
    Forwarding_Low --> Idle: Meeting ended
    Waiting_Streams --> Idle: Meeting ended
    
    Idle --> [*]
```

---

## 4. Fingerprint Verification State Diagram

**Image:**
![Fingerprint Verification State Diagram](diagrams/fingerprint_verification_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Idle
    
    Idle --> Waiting_Sender: Frame captured
    Waiting_Sender --> Waiting_Receiver: Sender CRC32 received
    Waiting_Receiver --> Comparing: Receiver CRC32 received
    
    Comparing --> Match: CRC32 match
    Comparing --> Mismatch: CRC32 mismatch
    
    Match --> Notifying_ACK: onMatch(userId)
    Mismatch --> Notifying_NACK: onMismatch(userId)
    
    Notifying_ACK --> Idle: ACK sent to aggregator
    Notifying_NACK --> Idle: NACK sent to aggregator
    
    Waiting_Sender --> Timeout: Sender timeout
    Waiting_Receiver --> Timeout: Receiver timeout
    Timeout --> Idle: Discard frame
    
    Idle --> [*]
    
    note right of Comparing
        compare(senderCRC, receiverCRC)
    end note
```

---

## 5. Audio Pipeline State Diagram (Client)

**Image:**
![Audio Pipeline State Diagram](diagrams/audio_pipeline_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Stopped
    
    Stopped --> Capturing: start()
    Capturing --> Encoding: PCM frame ready
    Encoding --> Sending: 3 tiers encoded
    Sending --> Computing_CRC: RTP packets sent
    Computing_CRC --> Capturing: CRC32 computed & sent
    
    Capturing --> Stopped: stop()
    Encoding --> Stopped: stop()
    Sending --> Stopped: stop()
    Computing_CRC --> Stopped: stop()
    
    Stopped --> [*]
    
    note right of Encoding
        Simulcast: 16/32/64 kbps
    end note
```

---

## 6. Meeting Registry State Diagram

**Image:**
![Meeting Registry State Diagram](diagrams/meeting_registry_state.png)

### Mermaid (Source)

```mermaid
stateDiagram-v2
    [*] --> Empty
    
    Empty --> Active: registerUser()
    Active --> Active: registerUser()
    Active --> Active: removeUser() [users remain]
    Active --> Empty: removeUser() [last user]
    
    state Active {
        [*] --> Updating_Sessions
        Updating_Sessions --> Providing_Recipients: Query recipients
        Providing_Recipients --> Updating_Sessions: Response sent
        Updating_Sessions --> Notifying: User joined/left
        Notifying --> Updating_Sessions: Notification sent
    }
    
    Empty --> [*]
```

