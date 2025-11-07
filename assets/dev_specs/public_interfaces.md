# Public Interfaces

The Public Interfaces define the **contract between system components**—including message formats, error codes, transport guarantees, and performance expectations—so that teams can integrate reliably.

These interfaces cover:
- **Client ↔ Signaling Server (WebSocket)**
- **Client ↔ SFU (RTP/RTCP media path)**
- **Internal SFU component APIs**

---

# Client ↔ Signaling Server (WebSocket)

The signaling channel establishes the meeting session, negotiates WebRTC parameters, and communicates tier changes and ACK summaries. All messages are exchanged via **JSON over secure WebSocket (WSS)**.

## Connection

| Property | Value |
|----------|--------|
| **Endpoint** | `wss://server.example.com/signaling` |
| **Protocol** | WebSocket over TLS |
| **Authentication** | JWT included in WebSocket upgrade request |
| **Message Format** | JSON messages |

The server validates the JWT **before accepting** the WebSocket connection.

**Note:** Authentication token is passed in the WebSocket upgrade request headers, NOT in the join message body.

---

## Client → Server Messages

Used to initiate the call, send SDP offers, and exchange ICE candidates.

### **Join Meeting**

```jsonc
{
  "type": "join",
  "meetingId": "string",
  "userId": "string",
  "displayName": "string"
}
````

### **SDP Offer**

```jsonc
{
  "type": "offer",
  "meetingId": "string",
  "sdp": "string"
}
```

### **SDP Answer** (if client acts as answerer)

```jsonc
{
  "type": "answer",
  "meetingId": "string",
  "sdp": "string"
}
```

### **ICE Candidate**

```jsonc
{
  "type": "ice-candidate",
  "meetingId": "string",
  "candidate": "string",
  "sdpMid": "string",
  "sdpMLineIndex": 0
}
```

---

## Server → Client Messages

Used to acknowledge operations, provide signaling responses, and notify of meeting state changes.

### **Join Acknowledgement**

```jsonc
{
  "type": "joined",
  "meetingId": "string",
  "userId": "string",
  "success": true,
  "participants": ["user1", "user2"],
  "timestamp": 1234567890
}
```

### **SDP Answer (from SFU)**

```jsonc
{
  "type": "answer",
  "sdp": "string"
}
```

### **ICE Candidate (from SFU)**

```jsonc
{
  "type": "ice-candidate",
  "candidate": "string",
  "sdpMid": "string",
  "sdpMLineIndex": 0
}
```

### **Error**

```jsonc
{
  "type": "error",
  "code": 403,
  "message": "Meeting full"
}
```

#### Error Codes

| Code    | Meaning                  |
| ------- | ------------------------ |
| **400** | Malformed message        |
| **401** | Invalid/expired JWT      |
| **403** | Meeting full (>10 users) |
| **404** | Meeting not found        |
| **503** | Server overloaded        |

---

## Signaling Flow

1. Client opens WebSocket with JWT
2. Client sends **join** → Server returns **joined**
3. Client sends **offer** (includes all 3 simulcast tiers)
4. Server (via SFU) returns **answer**
5. ICE negotiation continues via **ice-candidate** messages
6. Once ICE succeeds → Media flows over RTP/RTCP
7. WebSocket remains open for:

   * tier-change notifications
   * ACK/NACK summaries
   * participant join/leave events

---

## Error Handling

* **Connection closed:**
  Client retries with exponential backoff → 1s → 2s → 4s → 8s max

* **Invalid message:**
  Server sends error → then closes connection

* **Timeout (30s inactivity):**
  Client transitions to **Reconnecting** state

---

## Performance Guarantees

| Metric                   | Target                        |
| ------------------------ | ----------------------------- |
| **Signaling latency**    | < 500ms round-trip            |
| **WebSocket keep-alive** | Ping/pong every 30s           |
| **Max message size**     | 64 KB (SDP + ICE fits safely) |

---

# Client ↔ SFU (Media Path)

The media plane carries **RTP audio**, **RTCP feedback**, and **CRC32 fingerprints**.
Transport occurs over the ICE-negotiated UDP path.

## Media Transport

| Property     | Value                  |
| ------------ | ---------------------- |
| **Protocol** | RTP/RTCP over UDP      |
| **Security** | DTLS-SRTP (encrypted)  |
| **Ports**    | Dynamic (ICE-selected) |

---

## Client → SFU (RTP + RTCP SR)

### **Audio (RTP)**

* 3 simulcast tiers (LOW / MEDIUM / HIGH)
* 20ms Opus frames → **50 packets/sec per tier**
* Total from sender: **150 pkts/sec**

### **RTCP Sender Report (SR)**

Interval: **every 5 seconds**

Includes:

* SSRC
* NTP timestamp
* RTP timestamp
* Packet count
* Octet count
* **CRC32 of last encoded frame** (custom extension)

---

## SFU → Client (RTP)

* SFU forwards **only one tier** at a time (LOW/MED/HIGH)
* Chosen by Quality Controller
* Opus payload type: **111**
* SFU **rewrites SSRCs** for per-receiver mapping

---

## Client → SFU (RTCP RR)

Interval: **every 5 seconds**

Receiver Report fields:

* Fraction lost (0–255)
* Cumulative lost packets
* Interarrival jitter
* Last SR timestamp
* RTT estimate

---

## Client → SFU (RTCP XR)

Interval: **per-frame**

Custom XR block:

* **CRC32 of decoded frame**
* Timestamp-aligned with sender SR

This enables frame-level integrity verification.

---

## Media Error Handling

* **Packet loss:** handled by jitter buffer and Opus FEC
* **SSRC collision:** regenerate SSRC → send BYE
* **DTLS failure:** fatal → renegotiate via signaling
* **Late packets (>200ms):** dropped

---

## Media Performance Targets

| Metric                 | Value                           |
| ---------------------- | ------------------------------- |
| **End-to-end latency** | < 200ms                         |
| **Jitter tolerance**   | up to 50ms                      |
| **Bandwidth**          | 16–64 kbps + ~5% RTCP           |
| **Packet rate**        | 150 pkts/sec (sender simulcast) |

---

# Internal SFU Components (Non-Public)

These components communicate via **in-memory function calls**.
They do **not** expose public network APIs.

## Meeting Registry

* Maps **meeting_id → user sessions**
* Tracks participants, quality tier, and active streams

## RTCP Collector

* Aggregates loss, jitter, RTT from **all receivers**
* Computes **worst receiver loss** per meeting

## Quality Controller

* Reads worst-loss metrics
* Selects tier: **LOW / MEDIUM / HIGH**
* Instructs Stream Forwarder to switch tiers

## Stream Forwarder

* Receives RTP from senders (all 3 tiers)
* Forwards **only the selected tier**
* Queries registry for active recipients

## Fingerprint Verifier

* Collects CRC32 from sender (**RTCP SR**)
* Collects CRC32 from receivers (**RTCP XR**)
* Compares fingerprints per timestamp
* Emits ACK/NACK to Signaling layer for UI feedback
```
