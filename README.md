# Team Bug Farmers - WebRTC Audio Conference Demo

A modern, real-time audio conferencing application built with React and TypeScript, featuring adaptive quality control, audio delivery verification, and comprehensive participant management.

[![Run Frontend Tests](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-frontend-tests.yml/badge.svg)](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-frontend-tests.yml)
[![Run Backend Tests](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-backend-tests.yml/badge.svg)](https://github.com/arthur900530/team-bug-farmers/actions/workflows/run-backend-tests.yml)

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
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (TypeScript + Vite) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

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
| **WebRTC** | Peer-to-peer media foundation (ICE, DTLS, SRTP) |
| **Web Audio API** | Microphone capture and speaker playback |
| **Opus Codec** | High-quality audio encoding (16/32/64 kbps) |
| **RTP/RTCP** | Real-time transport and quality feedback |

### **Backend (Planned)**

| Technology | Purpose |
|------------|---------|
| **Node.js** | Signaling server runtime |
| **WebSocket** | Real-time bidirectional communication |
| **mediasoup / Janus** | Selective Forwarding Unit (SFU) |
| **Redis** | Session and meeting state management |

### **Infrastructure (Planned)**

| Technology | Purpose |
|------------|---------|
| **Docker + Kubernetes** | Containerization and orchestration |
| **Nginx / HAProxy** | Load balancing and SSL termination |
| **Prometheus + Grafana** | Monitoring and metrics visualization |

---

## 📁 Project Structure

```
team-bug-farmers/
├── src/
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
│   ├── types/
│   │   └── index.ts                    # TypeScript type definitions
│   ├── styles/
│   │   └── globals.css                 # Global styles and Tailwind
│   ├── App.tsx                         # Main application component
│   └── main.tsx                        # Application entry point
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
├── package.json                        # Project dependencies
├── tsconfig.json                       # TypeScript configuration
├── vite.config.ts                      # Vite configuration
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
└── README.md                           # This file
```

### **Key Directories Explained**

- **`src/components/meeting/`** - Core meeting functionality components
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

- ✅ Full UI implementation matching Dev Spec
- ✅ TypeScript type system for all data models
- ✅ Connection state machine (11 states)
- ✅ Quality tier indicators (LOW/MEDIUM/HIGH)
- ✅ ACK/NACK feedback display
- ✅ Participant list with status
- ✅ Mock data simulation for testing
- ✅ Responsive design with Tailwind CSS
- ✅ Accessible UI with Radix components

### 🚧 **In Progress / Planned**

- 🚧 WebRTC backend integration
- 🚧 Real audio capture and playback
- 🚧 WebSocket signaling implementation
- 🚧 SFU (Selective Forwarding Unit) setup
- 🚧 CRC32 fingerprint calculation
- 🚧 RTCP report collection
- 🚧 State management with Zustand
- 🚧 Unit and integration tests

---

## 📊 Data Flow

```
User Input (Join Modal)
    ↓
Connection State Machine (11 states)
    ↓
Mock Backend Simulation
    ↓
State Updates (participants, quality, ACKs)
    ↓
UI Components Render
    ↓
Dynamic Updates (every 2-10 seconds)
```

### **Mock Data Behavior**

Currently, the application simulates:
- **3 participants** (you + 2 mock users)
- **Quality tier changes** every 10 seconds
- **ACK summary updates** every 2 seconds (80% success rate)
- **Connection state transitions** during join

---

## 🧪 Testing the Application

### **Basic Flow**

1. **Join a Meeting**
   - Enter User ID (e.g., `john@example.com`)
   - Enter Meeting ID (e.g., `meeting-123`)
   - Optionally enter Display Name (e.g., `John Smith`)
   - Click "Join"

2. **First Attempt Fails** (demo behavior)
   - Connection error modal appears
   - Click "Retry Connection"

3. **Second Attempt Succeeds**
   - Meeting view loads
   - See your display name in center and bottom-left
   - Quality indicator shows "HIGH" (64 kbps)
   - ACK indicator shows "2/3 hearing you"

4. **Observe Dynamic Updates**
   - Quality tier changes every 10 seconds
   - ACK status updates every 2 seconds
   - Toggle participant list (top-right button)

5. **Test Controls**
   - Mute/unmute microphone
   - Toggle video
   - Open audio settings
   - View participants

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


