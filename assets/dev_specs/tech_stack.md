# Technology Stack

This system runs on a modern **WebRTC-based real-time audio pipeline** using Opus simulcast on the client, a **Node.js signaling server**, and an **SFU (mediasoup / Janus / Pion)** for scalable multi-participant audio forwarding.  

Client audio is captured through the Web Audio API and validated end-to-end using **CRC32 fingerprints**, while the SFU dynamically adjusts audio tiers based on **RTCP feedback** to ensure stable quality under varying network conditions.

The platform is deployed using **Docker + Kubernetes**, fronted by **Nginx/HAProxy**, and monitored through **Prometheus + Grafana** for operational and RTCP-level insight.

---

## Technology Stack Overview

| **Layer**          | **Component**        | **Technology**                         | **Purpose** |
|-------------------|-----------------------|-----------------------------------------|-------------|
| **Client**        | Audio I/O             | Web Audio API                           | Microphone capture and speaker playback |
|                   | Audio Codec           | Opus + Simulcast                        | Multi-tier encoding (16/32/64 kbps) |
|                   | Transport             | WebRTC (RTP/RTCP)                       | Low-latency real-time media delivery |
|                   | Signaling             | WebSocket                               | SDP/ICE negotiation |
|                   | UI Framework          | **React 18 + TypeScript**               | Core frontend framework |
|                   | UI Components         | **Radix UI + lucide-react icons**       | Accessible primitives & iconography |
|                   | Styling               | **Tailwind CSS + CVA + clsx**           | Utility-first styling & variant system |
|                   | Build Tool            | **Vite + @vitejs/plugin-react**         | Fast dev server and bundler |
|                   | Fingerprinting        | CRC32                                   | End-to-end audio integrity verification |
| **Server**        | Signaling             | Node.js + ws / Socket.IO                | WebSocket signaling layer |
|                   | SFU Core              | mediasoup / Janus / Pion                | Selective Forwarding Unit (audio routing) |
|                   | Meeting State         | Redis / In-memory                       | Session & meeting management |
|                   | Quality Control       | Custom logic                            | Adaptive bitrate & tier selection |
|                   | Protocol Layer        | WebRTC (SRTP/SRTCP)                     | Secure encrypted media transport |
| **Infrastructure** | Load Balancer        | Nginx / HAProxy                         | Traffic distribution & SSL termination |
|                   | Monitoring            | Prometheus + Grafana                    | RTCP metrics and operational dashboards |
|                   | Deployment            | Docker + Kubernetes                     | Containerization & orchestration |

---

## Key Protocols

- **WebRTC** – Connection establishment (ICE), encryption (DTLS), secure transport (SRTP)
- **RTP** – Real-time audio packet transport
- **RTCP** – Receivers reports, sender reports, and extended statistics (RR, SR, XR)
- **SDP** – Capability negotiation and session description for codec & transport setup
