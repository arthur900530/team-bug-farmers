# Team Bug Farmers - WebRTC Audio Conference Demo

A modern, real-time audio conferencing application built with React, TypeScript, and mediasoup SFU, featuring adaptive quality control, audio delivery verification, and comprehensive participant management.

[![Run Frontend Tests](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-frontend-tests.yml/badge.svg)](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-frontend-tests.yml)
[![Run Backend Tests](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-backend-tests.yml/badge.svg)](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-backend-tests.yml)

## 🚀 What Makes This Special

- **🎙️ Real-time Audio Conferencing**: Built with mediasoup SFU for scalable, low-latency audio
- **📊 Adaptive Quality Control**: Automatically adjusts bitrate based on network conditions
- **✅ Audio Delivery Verification**: CRC32 fingerprinting to verify audio reception
- **🎨 Modern UI**: Beautiful, accessible interface with Radix UI and Tailwind CSS
- **📡 Full-Stack TypeScript**: End-to-end type safety from client to server
- **☁️ Production Deployed**: Live on AWS (EC2 + Amplify) with SSL/TLS encryption
- **🔧 Production-Ready Architecture**: Modular, testable, and well-documented

---

## 🎯 Features

This application implements three core user stories for reliable real-time audio communication:

### **User Story 11: Establishing Initial Audio Connection**
> "As a user, I want my audio to be transmitted seamlessly from my device through the server to other participants so that my voice is heard clearly during the call."

**What it does:**
- Seamless WebRTC connection establishment
- Real-time audio packet transmission
- Low-latency audio delivery (<200ms end-to-end)
- Visual connection status indicators

### **User Story 3: Real-Time Audio Feedback**
> "As a user, I want real-time feedback showing that other participants can hear me so that I can confidently speak without having to ask 'can you hear me?' every call."

**What it does:**
- **ACK Indicator**: Shows who can hear you in real-time
- CRC32 fingerprint verification for audio integrity
- Visual feedback with success rate percentage
- Expandable panel showing per-participant delivery status

### **User Story 8: Adaptive Quality Management**
> "As a user, I want the call to automatically adjust the sender's audio quality to match the worst receiver's connection so that all participants experience consistent quality."

**What it does:**
- **Quality Indicator**: Displays current audio tier (LOW/MEDIUM/HIGH)
- Automatic bitrate adjustment (16/32/64 kbps)
- RTCP-based network monitoring
- Dynamic quality adaptation every 5 seconds
- Color-coded quality status

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arthur900530/team-bug-farmers.git
   cd team-bug-farmers
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

### Running the Application

You need to run **both backend and frontend** servers:

#### **Terminal 1 - Backend Server**
```bash
cd backend
npm run build
WS_PORT=8080 USE_SSL=false npm start
```

#### **Terminal 2 - Frontend Server**
```bash
VITE_WS_URL=ws://localhost:8080 npm run dev
```

#### **Access the Application (Local Development)**

- **Main App**: http://localhost:5173 (or http://localhost:5174 if 5173 is in use)
- **Simple Audio Test**: http://localhost:5173/audio-test.html

---

## 🌐 Production Deployment

The application is deployed in production on AWS infrastructure:

### **Live Application**

- **Frontend (AWS Amplify)**: Hosted on AWS Amplify with automatic CI/CD from GitHub
- **Backend (AWS EC2)**: Running on EC2 instance with SSL/TLS encryption

### **Backend Deployment (EC2 + PM2)**

The backend is deployed on AWS EC2 and managed with PM2 for process management and auto-restart.

#### **PM2 Commands**

```bash
# Start the backend with PM2
cd backend
npm run build
pm2 start dist/server.js --name "webrtc-backend" -i 1

# View logs
pm2 logs webrtc-backend

# Monitor status
pm2 status

# Restart the backend
pm2 restart webrtc-backend

# Stop the backend
pm2 stop webrtc-backend

# Delete from PM2
pm2 delete webrtc-backend

# Save PM2 configuration (persist across reboots)
pm2 save
pm2 startup
```

#### **SSL/TLS Configuration**

The EC2 instance is configured with:
- **SSL Certificates**: Let's Encrypt or AWS Certificate Manager
- **Secure WebSocket**: `wss://` (WebSocket Secure) for encrypted signaling
- **HTTPS**: Backend health endpoints served over HTTPS
- **Auto-renewal**: Certificate auto-renewal configured

#### **Environment Variables (Production)**

Set these on the EC2 instance:

```bash
# Backend Configuration
export WS_PORT=8080
export USE_SSL=true
export SSL_CERT_PATH=/path/to/cert.pem
export SSL_KEY_PATH=/path/to/key.pem
```

### **Frontend Deployment (AWS Amplify)**

The frontend is automatically deployed to AWS Amplify:

1. **GitHub Integration**: Automatic builds on push to `main` branch
2. **Build Settings**: Vite build configuration optimized for production
3. **Environment Variables**: `VITE_WS_URL` configured to point to backend WSS URL
4. **CDN Distribution**: Global content delivery via AWS CloudFront
5. **HTTPS**: Automatic SSL certificate and HTTPS enforcement

#### **Amplify Build Configuration**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### **Production Architecture**

```
┌─────────────────────────────────────────────────────┐
│          Users (Browser Clients)                    │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
   HTTPS/WSS                     HTTPS/WSS
        │                            │
┌───────▼──────────┐        ┌────────▼────────────┐
│  AWS Amplify     │        │    AWS EC2          │
│  (Frontend)      │        │    (Backend)        │
│  • React App     │        │    • Node.js        │
│  • CloudFront    │        │    • mediasoup      │
│  • Auto-deploy   │        │    • PM2 managed    │
│  • SSL enabled   │        │    • SSL/TLS        │
└──────────────────┘        └─────────────────────┘
```

### **Deployment Checklist**

#### Backend (EC2) Deployment
- [ ] Launch EC2 instance (Ubuntu 20.04+ recommended)
- [ ] Install Node.js 18+ and npm
- [ ] Install PM2 globally: `npm install -g pm2`
- [ ] Clone repository and install dependencies
- [ ] Configure SSL certificates (Let's Encrypt recommended)
- [ ] Set environment variables (`WS_PORT`, `USE_SSL`, cert paths)
- [ ] Build backend: `npm run build`
- [ ] Start with PM2: `pm2 start dist/server.js --name webrtc-backend`
- [ ] Save PM2 config: `pm2 save && pm2 startup`
- [ ] Configure security group (allow ports 8080, 443, 22)
- [ ] Test WebSocket connection: `wscat -c wss://your-domain:8080`

#### Frontend (Amplify) Deployment
- [ ] Connect GitHub repository to AWS Amplify
- [ ] Configure build settings (see Amplify Build Configuration above)
- [ ] Set environment variable: `VITE_WS_URL=wss://your-backend-domain:8080`
- [ ] Enable automatic deployments from `main` branch
- [ ] Add custom domain (optional)
- [ ] Verify HTTPS is enabled
- [ ] Test connection to backend from deployed frontend

---

### Available Scripts

#### Frontend Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend development server with hot reload |
| `npm run build` | Build frontend for production (TypeScript + Vite) |
| `npm run preview` | Preview frontend production build locally |
| `npm run lint` | Run ESLint to check code quality |

#### Backend Scripts
| Command | Description |
|---------|-------------|
| `npm run build` | Build backend TypeScript to JavaScript |
| `npm start` | Start backend WebSocket server |
| `npm run dev` | Start backend with hot reload (development) |

---

### Run Tests Locally

Follow these one-line commands to run tests locally. Perfect for a quick check.

- Install dependencies:

```bash
npm i
```

- Run all tests:

```bash
npm run test
```

- Run only frontend tests (tests/frontend):

```bash
npm run test:frontend
```

- Run only backend tests (tests/backend):

```bash
npm run test:backend
```

- Run coverage (generates coverage report in `coverage/`):

```bash
npm run coverage
```

Each command above runs synchronously and prints results to your terminal.


## 🛠️ Tech Stack

### **Frontend**

| Technology | Purpose |
|------------|---------|
| **React 18** | Core UI framework |
| **TypeScript 5.2** | Type-safe development |
| **Vite 5.0** | Fast build tool and dev server |
| **Tailwind CSS 3.3** | Utility-first styling |
| **Radix UI** | Accessible, unstyled UI primitives |
| **Lucide React** | Modern icon library |
| **class-variance-authority** | Component variant management |

### **WebRTC & Audio**

| Technology | Purpose |
|------------|---------|
| **WebRTC** | Real-time media transport (ICE, DTLS, SRTP) |
| **mediasoup-client** | Client-side Device API for SFU integration |
| **Web Audio API** | Microphone capture and speaker playback |
| **Opus Codec** | High-quality audio encoding (48kHz) |
| **RTP/RTCP** | Real-time transport and quality feedback |

### **Backend (Implemented)**

| Technology | Purpose | Status |
|------------|---------|--------|
| **Node.js** | Signaling server runtime | ✅ Running |
| **WebSocket** | Real-time bidirectional communication | ✅ Implemented |
| **mediasoup** | Selective Forwarding Unit (SFU) | ✅ Integrated |
| **TypeScript** | Type-safe backend development | ✅ Full coverage |

### **Infrastructure (Deployed)**

| Technology | Purpose | Status |
|------------|---------|--------|
| **AWS EC2** | Backend server hosting | ✅ Deployed |
| **AWS Amplify** | Frontend hosting and CI/CD | ✅ Deployed |
| **PM2** | Process management and monitoring | ✅ Configured |
| **SSL/TLS (Let's Encrypt)** | Secure WebSocket (WSS) and HTTPS | ✅ Enabled |
| **CloudFront** | Global CDN for frontend assets | ✅ Active |

### **Infrastructure (Planned)**

| Technology | Purpose |
|------------|---------|
| **Docker + Kubernetes** | Containerization and orchestration |
| **Load Balancer** | Multi-instance backend distribution |
| **Prometheus + Grafana** | Monitoring and metrics visualization |

---

## 📁 Project Structure

```
team-bug-farmers/
├── backend/                            # Backend server (Node.js + mediasoup)
│   ├── src/
│   │   ├── server.ts                   # Main server entry point
│   │   ├── SignalingServer.ts          # WebSocket signaling + mediasoup
│   │   ├── MediasoupManager.ts         # mediasoup Worker/Router/Transport
│   │   ├── StreamForwarder.ts          # Audio stream management
│   │   ├── FingerprintVerifier.ts      # Audio fingerprint verification
│   │   ├── RtcpCollector.ts            # RTCP metrics collection
│   │   └── QualityController.ts        # Adaptive quality management
│   ├── dist/                           # Compiled JavaScript output
│   ├── package.json                    # Backend dependencies
│   └── tsconfig.json                   # Backend TypeScript config
├── src/                                # Frontend source code
│   ├── components/
│   │   ├── meeting/                    # Meeting-specific components
│   │   │   ├── AckIndicator.tsx        # Audio delivery feedback
│   │   │   ├── ConnectionStatus.tsx    # Connection state display
│   │   │   ├── MeetingToolbar.tsx      # Bottom control bar
│   │   │   ├── ParticipantList.tsx     # Participant management
│   │   │   └── QualityIndicator.tsx    # Audio quality display
│   │   ├── settings/                   # Settings panels
│   │   │   ├── AudioSettingsSection.tsx
│   │   │   ├── GeneralSettingsSection.tsx
│   │   │   ├── ScreenShareSettingsSection.tsx
│   │   │   └── VideoSettingsSection.tsx
│   │   ├── common/                     # Reusable components
│   │   │   ├── DraggableModal.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── WindowControls.tsx
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   └── ... (30+ UI components)
│   │   ├── AllSettings.tsx             # Main settings modal
│   │   ├── AudioSettings.tsx           # Audio quick settings
│   │   ├── ConnectionErrorModal.tsx    # Error handling
│   │   ├── JoinMeetingModal.tsx        # Meeting join screen
│   │   ├── MeetingView.tsx             # Main meeting interface
│   │   └── ZoomWorkspace.tsx           # Background workspace
│   ├── services/                       # Client-side services
│   │   ├── UserClient.ts               # Main client orchestrator
│   │   ├── MediasoupClient.ts          # mediasoup-client Device API wrapper
│   │   ├── SignalingClient.ts          # WebSocket communication
│   │   ├── AudioCapture.ts             # Microphone capture
│   │   └── AudioPlayer.ts              # Audio playback
│   ├── types/
│   │   └── index.ts                    # TypeScript type definitions
│   ├── styles/
│   │   └── globals.css                 # Global styles and Tailwind
│   ├── App.tsx                         # Main application component
│   └── main.tsx                        # Application entry point
├── public/
│   └── audio-test.html                 # Simple mediasoup-client test page
├── assets/
│   ├── dev_specs/                      # Development specifications
│   │   ├── diagrams/                   # Architecture diagrams
│   │   ├── APIs.md                     # API documentation
│   │   ├── architecture.md             # System architecture
│   │   ├── classes.md                  # Class diagrams
│   │   ├── data_schemas.md             # Data structure definitions
│   │   ├── flow_charts.md              # Process flow diagrams
│   │   ├── public_interfaces.md        # Public API interfaces
│   │   ├── state_diagrams.md           # State machine diagrams
│   │   ├── tech_stack.md               # Technology stack details
│   │   └── user_stories.md             # User story specifications
│   └── mockups/                        # UI mockup designs
├── index.html                          # HTML entry point
├── package.json                        # Frontend dependencies
├── tsconfig.json                       # Frontend TypeScript configuration
├── vite.config.ts                      # Vite configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
└── README.md                           # This file
```

### **Key Directories Explained**

- **`backend/src/`** - Node.js + mediasoup server implementation
- **`src/components/meeting/`** - Core meeting functionality components
- **`src/services/`** - Client-side WebRTC and signaling services
- **`src/components/ui/`** - shadcn/ui components (buttons, dialogs, etc.)
- **`src/types/`** - TypeScript type definitions matching Dev Spec
- **`assets/dev_specs/`** - Comprehensive technical documentation

---

## 🎨 UI Components

### **Meeting Components**

| Component | Purpose |
|-----------|---------|
| **QualityIndicator** | Shows current audio quality tier (HIGH/MEDIUM/LOW) with bitrate |
| **AckIndicator** | Displays who can hear you with real-time delivery feedback |
| **ParticipantList** | Lists all meeting participants with their connection status |
| **ConnectionStatus** | Shows WebRTC connection state (Connecting, Signaling, Streaming, etc.) |
| **MeetingToolbar** | Bottom control bar with mic, video, screen share, etc. |

### **Modal Components**

| Component | Purpose |
|-----------|---------|
| **JoinMeetingModal** | User entry point - input userId, meetingId, displayName |
| **ConnectionErrorModal** | Handles connection failures with retry logic |
| **AudioDeviceErrorModal** | Manages audio device disconnection errors |
| **AllSettings** | Comprehensive settings panel |

---

## 🔄 Current Implementation Status

### ✅ **Completed**

#### Frontend
- ✅ Full UI implementation matching Dev Spec
- ✅ TypeScript type system for all data models
- ✅ Connection state machine (11 states)
- ✅ Quality tier indicators (LOW/MEDIUM/HIGH)
- ✅ ACK/NACK feedback display
- ✅ Participant list with status
- ✅ Responsive design with Tailwind CSS
- ✅ Accessible UI with Radix components
- ✅ mediasoup-client integration
- ✅ Real audio capture and playback
- ✅ WebSocket signaling client
- ✅ Audio fingerprinting (sender & receiver)

#### Backend
- ✅ Node.js + TypeScript server
- ✅ WebSocket signaling server
- ✅ mediasoup SFU integration
- ✅ Worker/Router/Transport management
- ✅ Producer/Consumer creation
- ✅ Stream forwarding logic
- ✅ RTCP metrics collection
- ✅ Quality controller (adaptive bitrate)
- ✅ Fingerprint verification

#### Deployment & Infrastructure
- ✅ AWS EC2 backend deployment
- ✅ AWS Amplify frontend deployment
- ✅ PM2 process management
- ✅ SSL/TLS encryption (WSS + HTTPS)
- ✅ CloudFront CDN distribution
- ✅ Production-ready configuration

---

## 📊 Data Flow

```
User Input (Join Modal)
    ↓
UserClient.joinMeeting()
    ↓
SignalingClient (WebSocket) ← → SignalingServer (Backend)
    ↓
MediasoupClient.initialize()
    ↓
Get Router RTP Capabilities
    ↓
Create Send/Recv Transports (DTLS handshake)
    ↓
AudioCapture → Producer (send audio)
    ↓
Backend: Create Consumer for other participants
    ↓
Consumer → AudioPlayer (receive & play audio)
    ↓
RTCP Reports (quality metrics) → Backend
    ↓
Quality Controller (adaptive bitrate)
    ↓
State Updates → UI Components Render
```

### **Real-Time Communication**

The application uses:
- **WebSocket** for signaling (SDP, ICE, commands)
- **WebRTC/mediasoup** for audio transport (RTP/SRTP)
- **RTCP** for quality metrics (every 5 seconds)
- **Fingerprints** for audio delivery verification (50 fps)
- **Adaptive Quality** adjusts bitrate based on network conditions

---

## 🧪 Testing the Application

### **Production Testing**

The application is live in production! You can test it directly without any local setup.

**Note**: Replace the URLs below with your actual production URLs:
- **Frontend**: `https://your-amplify-app.amplifyapp.com`
- **Backend WebSocket**: `wss://your-ec2-domain.com:8080`

### **Local Development Testing**

### **Prerequisites**

1. **Start both servers** (see "Running the Application" section above)
2. **Use Chrome or Edge** (best WebRTC support)
3. **Allow microphone access** when prompted

### **Option A: Main Application Test**

1. **Open TWO browser tabs** to `http://localhost:5173` (or 5174)

2. **Tab 1 - First User**
   - Enter User ID: `alice`
   - Enter Meeting ID: `test`
   - Enter Display Name: `Alice`
   - Click "Join"
   - Grant microphone permission

3. **Tab 2 - Second User**
   - Enter User ID: `bob`
   - Enter Meeting ID: `test`
   - Enter Display Name: `Bob`
   - Click "Join"
   - Grant microphone permission

4. **Expected Behavior**
   - See connection status change: Connecting → Signaling → Streaming
   - See participant list update with both users
   - See "Audio active" indicator (green)
   - Speak into microphone and listen for audio in other tab

### **Option B: Simple Audio Test (Recommended for Debugging)**

1. **Open TWO browser tabs** to `http://localhost:5173/audio-test.html`

2. **Tab 1**
   - User ID: `Alice`
   - Meeting ID: `test`
   - Click "Join & Start Audio"

3. **Tab 2**
   - User ID: `Bob`
   - Meeting ID: `test`
   - Click "Join & Start Audio"

4. **Check Console Logs**
   - Should see: "✅ Device loaded"
   - Should see: "✅ Producer created"
   - Should see: "🔊🔊🔊 AUDIO PLAYING!"

### **Troubleshooting**

#### Local Development
- **No audio?** Check browser console for errors
- **AudioContext suspended?** Click anywhere on the page
- **No microphone?** Check system settings and browser permissions
- **Connection failed?** Ensure backend is running on port 8080

#### Production Deployment
- **WSS connection failed?** Verify SSL certificates are valid
- **Backend not responding?** Check PM2 status: `pm2 status`
- **View backend logs**: `pm2 logs webrtc-backend`
- **Restart backend**: `pm2 restart webrtc-backend`
- **Frontend build issues?** Check AWS Amplify build logs
- **CORS errors?** Verify backend CORS configuration for your Amplify domain

---

## 🎓 Development Guidelines

### **Code Style**

- Use **TypeScript** for all new files
- Follow **React hooks** patterns
- Use **Tailwind CSS** utility classes
- Leverage **Radix UI** for accessible components
- Add types from `src/types/index.ts`

### **Component Organization**

- **Keep components small** and focused
- **Extract reusable logic** into custom hooks
- **Use composition** over prop drilling
- **Follow atomic design** principles

### **State Management**

- Currently using **local state** in `App.tsx`
- Plan to migrate to **Zustand** for global state
- Keep state **close to where it's used**

---

## 🏗️ Architecture Overview

### **Backend Components**

```
┌─────────────────────────────────────────────────────┐
│                   SignalingServer                   │
│  • WebSocket connections (ws://)                    │
│  • SDP negotiation (Offer/Answer)                   │
│  • mediasoup protocol handlers                      │
│  • Producer/Consumer orchestration                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                  MediasoupManager                   │
│  • Worker management (C++ processes)                │
│  • Router creation (RTP capabilities)               │
│  • Transport creation (WebRTC endpoints)            │
│  • Producer/Consumer lifecycle                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│                   StreamForwarder                   │
│  • Audio stream routing (SFU logic)                 │
│  • Participant tracking                             │
│  • Consumer creation for new producers              │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│         RtcpCollector + QualityController          │
│  • RTCP metrics aggregation                         │
│  • Network quality analysis                         │
│  • Adaptive bitrate decisions                       │
└─────────────────────────────────────────────────────┘
```

### **Frontend Components**

```
┌─────────────────────────────────────────────────────┐
│                     UserClient                      │
│  • High-level orchestration                         │
│  • State management                                 │
│  • Event coordination                               │
└─────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────┬──────────────────────────────┐
│   SignalingClient    │     MediasoupClient          │
│  • WebSocket comm    │  • Device API wrapper        │
│  • Message routing   │  • Transport management      │
│  • Protocol handlers │  • Producer/Consumer         │
└──────────────────────┴──────────────────────────────┘
                        ↓
┌──────────────────────┬──────────────────────────────┐
│    AudioCapture      │       AudioPlayer            │
│  • Microphone input  │  • Speaker output            │
│  • Audio constraints │  • AudioContext              │
│  • MediaStream       │  • Volume control            │
└──────────────────────┴──────────────────────────────┘
```

---

## 📖 Documentation

Comprehensive technical documentation is available in `assets/dev_specs/`:

- **`architecture.md`** - System architecture overview
- **`APIs.md`** - API specifications (client and server)
- **`classes.md`** - Class diagrams and relationships
- **`data_schemas.md`** - Data structure definitions
- **`flow_charts.md`** - Process flow diagrams
- **`state_diagrams.md`** - State machine diagrams
- **`public_interfaces.md`** - Public API contracts
- **`user_stories.md`** - User story specifications

---

## 📝 License

This project is part of the CMU coursework for Fall 2025.

---


