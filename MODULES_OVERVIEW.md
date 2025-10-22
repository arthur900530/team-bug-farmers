# Application Modules Overview

## 🏗️ Architecture

This is a **full-stack Zoom-like meeting demo** with:
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Real Audio:** Web Audio API

---

## 📦 Frontend Modules

### **1. Core Application (`src/App.tsx`)**
**Purpose:** Main application orchestrator

**Responsibilities:**
- State management (user, mic, camera, audio levels)
- Screen navigation (join → error → meeting)
- Integration between services and UI components
- localStorage persistence
- Backend connectivity

**Key State:**
```typescript
- username, userId          // User identity
- micMuted, audioLevel      // Audio state
- availableDevices          // Audio devices
- backendConnected          // API status
- currentScreen             // UI flow
```

**Flow:**
```
User enters name → Create user in DB → Show connection error 
→ Retry → Initialize mic → Update device info → Meeting view
```

---

### **2. Services Layer**

#### **`src/services/audioService.ts`**
**Purpose:** Microphone & audio management (Web Audio API)

**Key Functions:**
```typescript
initialize(deviceId?)           // Get mic access
mute() / unmute()               // Control audio tracks
getAudioLevel()                 // Real-time audio monitoring
getAudioDevices()               // List available mics
switchMicrophone(deviceId)      // Change input device
verifyMuteState()               // Hardware check
```

**How it works:**
```
getUserMedia() → AudioContext → AnalyserNode 
→ Monitor frequencies → Return 0-100% level
```

**Real Browser APIs:**
- ✅ `navigator.mediaDevices.getUserMedia()`
- ✅ `AudioContext` & `AnalyserNode`
- ✅ `track.enabled = false` for mute

---

#### **`src/services/backendService.ts`**
**Purpose:** Backend API client

**Key Functions:**
```typescript
updateUserState()         // Create/update full user state
updateMuteStatus()        // PATCH mute only
updateDevice()            // PATCH device only
getUserState()            // GET user by ID
getRoomUsers()            // GET all users in room
checkBackendHealth()      // Health check
```

**API Base URL:**
```typescript
import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
```

---

### **3. UI Components**

#### **Modal Components**
```
JoinMeetingModal           → Username input & initial setup
ConnectionErrorModal       → Simulated connection failure
AudioDeviceErrorModal      → Device disconnection warnings
AllSettings               → Full settings modal
AudioSettings             → Quick audio dropdown
ScreenShareSettings       → Screen share config
```

#### **Meeting Components**
```
MeetingView               → Main video area & participant display
MeetingToolbar            → Bottom controls (mic, camera, share)
ZoomWorkspace             → Background UI
```

#### **Common Components**
```
DraggableModal           → Reusable draggable container
FormSelect               → Custom select inputs
IconButton               → Reusable button component
WindowControls           → macOS-style window buttons
```

#### **UI Library (shadcn/ui)**
```
Button, Select, Checkbox, Dropdown, etc.
Located in: src/components/ui/
```

---

### **4. Component Hierarchy**

```
App.tsx (Root)
├── JoinMeetingModal
│   ├── Username input
│   ├── Mic/Camera controls
│   └── Join button
│
├── ConnectionErrorModal
│   └── Retry button
│
├── MeetingView
│   ├── WindowControls
│   ├── Username display (center)
│   ├── Participant label (bottom-left)
│   └── MeetingToolbar
│       ├── Mic button (with dropdown)
│       ├── Camera button
│       ├── Share button
│       ├── Participants
│       ├── Chat
│       └── More options
│
├── AudioSettings (dropdown)
│   └── Device selectors
│
├── AllSettings (modal)
│   ├── AudioSettingsSection
│   ├── VideoSettingsSection
│   ├── GeneralSettingsSection
│   └── ScreenShareSettingsSection
│
└── Dev Controls (bottom-right)
    ├── Username display
    ├── Backend status
    ├── Audio level meter
    ├── Device simulator
    └── Mic selector dropdown
```

---

## 🔧 Backend Modules

### **1. Server (`backend/server.js`)**
**Purpose:** Express REST API server

**Endpoints:**
```javascript
GET  /api/health                    // Health check
GET  /api/users                     // Get all users
GET  /api/users/:userId             // Get specific user
POST /api/users/:userId/state       // Create/update full state
PATCH /api/users/:userId/mute       // Update mute status
PATCH /api/users/:userId/device     // Update device
GET  /api/rooms/:roomId/users       // Get users in room
DELETE /api/users/:userId           // Delete user
```

**Middleware:**
- CORS (allow frontend)
- JSON body parser
- Request logging

---

### **2. Database (`backend/database.js`)**
**Purpose:** SQLite database operations

**Schema:**
```sql
CREATE TABLE user_states (
  userId TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  isMuted INTEGER NOT NULL,
  deviceId TEXT,
  deviceLabel TEXT,
  roomId TEXT,
  lastUpdated TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
```

**Indexes:**
```sql
idx_roomId      → Fast room queries
idx_lastUpdated → Sort by activity
idx_username    → Search by name
```

**Key Functions:**
```javascript
initDatabase()              // Setup schema & migration
getUserState(userId)        // Get one user
getAllUserStates()          // Get all users
createOrUpdateUserState()   // Upsert user
deleteUserState()           // Delete user
getUsersByRoom()            // Filter by room
cleanupOldEntries(days)     // Remove inactive
```

---

### **3. Helper Scripts**

#### **`backend/check-db.js`**
```bash
node check-db.js
```
**Output:**
```
1. 👤 Alice
   User ID: alice-x7k2m9
   Status: 🔇 Muted
   Device: MacBook Pro Microphone
   Room: default-room
   Last Updated: ...
```

#### **`backend/clear-db.js`**
```bash
node clear-db.js
```
Deletes all user entries (with confirmation).

#### **`backend/cleanup-inactive.js`**
```bash
node cleanup-inactive.js 30  # Remove users inactive >30 days
```
Prevents database bloat.

---

## 🔄 Data Flow

### **1. User Join Flow**
```
┌─────────────┐
│ User enters │
│    name     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ createUserId()      │
│ "Alice" → alice-123 │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ localStorage.setItem │
│ Save user locally    │
└──────┬───────────────┘
       │
       ▼
┌─────────────────────────┐
│ updateUserState()       │
│ POST to backend         │
│ {username, isMuted:...} │
└──────┬──────────────────┘
       │
       ▼
┌──────────────────────┐
│ Database: INSERT     │
│ User created in DB   │
└──────────────────────┘
```

---

### **2. Microphone Control Flow**
```
┌──────────────┐
│ User clicks  │
│  Mic button  │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ handleMicToggle()   │
│ App.tsx             │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ audioService.mute() │
│ track.enabled=false │
└──────┬──────────────┘
       │
       ▼
┌──────────────────────┐
│ updateMuteStatus()   │
│ PATCH /users/.../mute│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Database: UPDATE     │
│ isMuted = 1          │
└──────────────────────┘
```

---

### **3. Device Switching Flow**
```
┌─────────────────┐
│ User selects    │
│ new microphone  │
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ handleMicrophoneSwitch() │
│ App.tsx                  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ audioService.            │
│ switchMicrophone()       │
└────────┬─────────────────┘
         │
         ├─► Stop old stream
         ├─► getUserMedia(new deviceId)
         ├─► Preserve mute state
         └─► Restart monitoring
         │
         ▼
┌──────────────────────┐
│ updateDevice()       │
│ PATCH /.../device    │
└────────┬─────────────┘
         │
         ▼
┌─────────────────────┐
│ Database: UPDATE    │
│ deviceId, label     │
└─────────────────────┘
```

---

### **4. Real-Time Audio Monitoring**
```
┌───────────────────┐
│ getUserMedia()    │
│ Get mic access    │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ AudioContext      │
│ Create context    │
└────────┬──────────┘
         │
         ▼
┌───────────────────────┐
│ AnalyserNode          │
│ Frequency analysis    │
└────────┬──────────────┘
         │
         ▼ (every 100ms)
┌────────────────────────┐
│ getByteFrequencyData() │
│ Read audio levels      │
└────────┬───────────────┘
         │
         ▼
┌────────────────────┐
│ Calculate average  │
│ 0-255 → 0-100%     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ setAudioLevel()    │
│ Update UI          │
└────────────────────┘
```

---

## 🗂️ File Structure

```
team-bug-farmers/
│
├── src/                          # Frontend
│   ├── App.tsx                   # Main app (orchestrator)
│   ├── main.tsx                  # React entry point
│   │
│   ├── components/               # UI Components
│   │   ├── JoinMeetingModal.tsx
│   │   ├── ConnectionErrorModal.tsx
│   │   ├── AudioDeviceErrorModal.tsx
│   │   ├── MeetingView.tsx
│   │   ├── AllSettings.tsx
│   │   ├── AudioSettings.tsx
│   │   ├── ScreenShareSettings.tsx
│   │   ├── ZoomWorkspace.tsx
│   │   │
│   │   ├── meeting/
│   │   │   └── MeetingToolbar.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── AudioSettingsSection.tsx
│   │   │   ├── VideoSettingsSection.tsx
│   │   │   ├── GeneralSettingsSection.tsx
│   │   │   └── ScreenShareSettingsSection.tsx
│   │   │
│   │   ├── common/
│   │   │   ├── DraggableModal.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── WindowControls.tsx
│   │   │
│   │   └── ui/                   # shadcn/ui components
│   │       ├── button.tsx
│   │       ├── select.tsx
│   │       └── ...
│   │
│   ├── services/                 # Business Logic
│   │   ├── audioService.ts       # Microphone control
│   │   ├── backendService.ts     # API client
│   │   └── README.md             # Service docs
│   │
│   ├── styles/
│   │   └── globals.css           # Tailwind CSS
│   │
│   └── vite-env.d.ts            # TypeScript definitions
│
├── backend/                      # Backend
│   ├── server.js                 # Express API
│   ├── database.js               # SQLite operations
│   ├── package.json              # Dependencies
│   ├── .gitignore                # Ignore node_modules, .db
│   │
│   ├── check-db.js              # Helper: View DB
│   ├── clear-db.js              # Helper: Clear DB
│   ├── cleanup-inactive.js      # Helper: Remove old users
│   │
│   ├── audio-states.db          # SQLite database (gitignored)
│   └── README.md                # Backend API docs
│
├── public/                       # Static assets
├── node_modules/                 # Frontend dependencies
│
├── Configuration Files
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite config
├── tsconfig.json                 # TypeScript config
├── tailwind.config.js            # Tailwind config
├── postcss.config.js             # PostCSS config
├── .gitignore                    # Git ignore rules
│
└── Documentation
    ├── README.md                      # Main readme
    ├── ARCHITECTURE.md                # System architecture
    ├── IMPLEMENTATION.md              # Implementation details
    ├── MICROPHONE_SWITCHING.md        # Device switching
    ├── BACKEND_INTEGRATION.md         # API integration
    ├── DATABASE_GUIDE.md              # Database management
    ├── USERNAME_FEATURE.md            # Username feature
    └── MODULES_OVERVIEW.md            # This file
```

---

## 🧩 Module Dependencies

### **Frontend Dependencies**
```
App.tsx
  ├─ audioService.ts          (Real mic control)
  ├─ backendService.ts        (API calls)
  ├─ JoinMeetingModal
  ├─ MeetingView
  └─ All other components

audioService.ts
  └─ Web Audio API (browser)

backendService.ts
  └─ fetch API → Backend

Components
  ├─ Lucide React (icons)
  ├─ Radix UI (primitives)
  └─ Tailwind CSS (styling)
```

### **Backend Dependencies**
```
server.js
  ├─ Express (HTTP server)
  ├─ CORS (cross-origin)
  └─ database.js

database.js
  └─ better-sqlite3 (SQLite driver)

Helper Scripts
  └─ database.js
```

---

## 🔍 Key Technologies

### **Frontend**
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Radix UI | Headless primitives |
| Lucide React | Icon library |
| Web Audio API | Real microphone access |
| MediaDevices API | Device enumeration |

### **Backend**
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | Web framework |
| SQLite | Embedded database |
| better-sqlite3 | Sync SQLite driver |
| CORS | Cross-origin requests |

---

## 🎯 What's Real vs Mocked

### ✅ **Real (Fully Functional)**
- Microphone access & control
- Mute/unmute functionality
- Audio level monitoring (0-100%)
- Device switching
- Backend API with database
- User state persistence
- localStorage persistence

### ❌ **Mocked (UI Only)**
- Video camera
- Screen sharing
- WebRTC connections
- Actual meeting rooms with peers
- Audio/video transmission
- Chat functionality
- Participants list

---

## 🚀 Running the App

### **Development Mode**
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
npm run dev

# Open: http://localhost:5173
```

### **Production Build**
```bash
# Build frontend
npm run build

# Preview
npm run preview
```

---

## 📊 Module Communication

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  ┌──────────────────────────────────────────┐  │
│  │              App.tsx                      │  │
│  │         (State Management)                │  │
│  └────┬──────────────────┬─────────────┬────┘  │
│       │                  │             │        │
│       ▼                  ▼             ▼        │
│  ┌─────────┐     ┌──────────────┐  ┌────────┐ │
│  │ audio   │     │  backend     │  │ React  │ │
│  │ Service │     │  Service     │  │  UI    │ │
│  └────┬────┘     └──────┬───────┘  └────────┘ │
│       │                  │                      │
└───────┼──────────────────┼──────────────────────┘
        │                  │
        │                  │ HTTP/REST
        ▼                  ▼
  ┌───────────┐    ┌──────────────┐
  │  Browser  │    │   Backend    │
  │ Web Audio │    │  Express API │
  │    API    │    └──────┬───────┘
  └───────────┘           │
                          ▼
                  ┌──────────────┐
                  │   SQLite     │
                  │   Database   │
                  └──────────────┘
```

---

## 🎓 Summary

This application is a **modular, full-stack prototype** demonstrating:

1. **Real browser APIs** (Web Audio, MediaDevices)
2. **Clean separation** of concerns (UI, services, backend)
3. **RESTful API** design with proper CRUD operations
4. **Persistent storage** (localStorage + SQLite)
5. **Modern tooling** (React, TypeScript, Vite)
6. **Professional architecture** (services, components, database)

Each module has a **single responsibility** and communicates through **well-defined interfaces**, making the codebase maintainable, testable, and extensible.

