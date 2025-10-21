# Zoom Meeting Demo - Team Bug Farmers

A React-based prototype demonstrating Zoom-like meeting features with a focus on audio device management and mute verification.

## 🎯 Features

This application demonstrates three main user stories:

### 1. **Microphone Mute Verification** (User Story 1)
- Visual feedback when microphone is properly muted (green checkmark)
- Real-time verification of hardware and software mute states
- Banner notifications when mute state conflicts are detected

### 2. **Audio Device Error Handling** (User Story 2)
- Detection of audio device disconnections
- Modal warnings when audio devices become unavailable
- Guidance for resolving audio device issues

### 3. **In-Call Device Switching** (User Story 3)
- Settings interface for audio, video, and screen share
- Device selection and configuration options

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm (comes with Node.js)

---

## 📦 Complete Setup Guide

### **Step 1: Clone the Repository**

```bash
git clone https://github.com/arthur900530/team-bug-farmers.git
cd team-bug-farmers
```

---

### **Step 2: Frontend Setup**

```bash
# Install frontend dependencies
npm install

# Start frontend development server
npm run dev
```

The frontend will run on **http://localhost:5173/**

---

### **Step 3: Backend Setup**

Open a **new terminal window** (keep frontend running):

```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Start backend server
npm start
```

The backend API will run on **http://localhost:3001/**

**Backend endpoints:**
- Health check: http://localhost:3001/api/health
- Users API: http://localhost:3001/api/users

---

### **Step 4: Database Setup**

The SQLite database is created automatically when you start the backend!

**Location:** `backend/audio-states.db`

**Check database contents:**
```bash
cd backend
node check-db.js
```

**Clear database (optional):**
```bash
cd backend
node clear-db.js
```

---

## ✅ Verify Setup

### **1. Check Frontend**
- Open browser: http://localhost:5173/
- Should see the join meeting screen

### **2. Check Backend**
- Open browser: http://localhost:3001/api/health
- Should see: `{"status":"ok",...}`

### **3. Check Database**
```bash
cd backend
node check-db.js
```

### **4. Test Integration**
1. Click "Join Meeting" in frontend
2. Click "Retry" to join
3. Allow microphone permission
4. Mute/unmute or switch devices
5. Check database again:
   ```bash
   cd backend
   node check-db.js
   ```
6. You should see your user data!

---

## 🏃‍♂️ Quick Start (Both Servers)

**Terminal 1 (Frontend):**
```bash
npm run dev
```

**Terminal 2 (Backend):**
```bash
cd backend && npm start
```

**Then open:** http://localhost:5173/

---

## 📝 Environment Configuration (Optional)

Create `.env` file in project root:
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 🔧 Available Scripts

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Backend
```bash
cd backend
npm start        # Start production server
npm run dev      # Start with auto-reload (nodemon)
node check-db.js # View database contents
node clear-db.js # Clear all database data
```

## 🎮 Using the Demo

### Initial Flow
1. **Join Meeting Modal**: Start by clicking "Join Meeting" 
2. **Connection Error**: The first attempt will fail (by design) - click "Retry"
3. **Microphone Permission**: Allow browser to access your microphone
4. **Meeting View**: You'll enter the main meeting interface with real audio!

---

## 🧪 Testing Features

### **1. Real Microphone Mute/Unmute**
```
1. Click the microphone button in the toolbar
2. Watch the audio level drop to 0% when muted
3. See the green checkmark appear ✅
4. Check database: cd backend && node check-db.js
5. Your mute status is saved!
```

### **2. Device Switching**
```
1. Look at "Dev Controls" panel (bottom-right)
2. Open the "Microphone:" dropdown
3. Select a different device
4. Audio switches seamlessly (mute state preserved)
5. Database updates with new device
```

### **3. Real-Time Audio Monitoring**
```
1. Keep microphone unmuted
2. Speak or make noise
3. Watch "Audio Level" in Dev Controls change
4. Values from 0-100% in real-time
```

### **4. Backend Integration**
```
1. Check "Connection Status" in Dev Controls
2. Should show: ● API (green = connected)
3. All actions sync to database automatically
4. View your User ID in Dev Controls
```

### **5. Audio Device Error Simulation**
```
1. Uncheck "Audio Device Connected" in Dev Controls
2. Try to unmute - you'll see an error modal
3. Re-check the box to restore
```

### **6. Settings Access**
```
- Click settings icon (gear) in toolbar
- Explore audio, video, general settings
- Click dropdown arrow next to mic button for quick audio settings
```

## 🏗️ Project Structure

```
src/
├── App.tsx                          # Main application with state management
├── main.tsx                         # React entry point
├── components/
│   ├── JoinMeetingModal.tsx        # Initial join screen
│   ├── ConnectionErrorModal.tsx    # Connection failure handling
│   ├── AudioDeviceErrorModal.tsx   # Audio device error handling
│   ├── MeetingView.tsx             # Main meeting interface
│   ├── AllSettings.tsx             # Settings modal
│   ├── AudioSettings.tsx           # Audio settings dropdown
│   ├── ScreenShareSettings.tsx     # Screen share configuration
│   ├── ZoomWorkspace.tsx           # Background workspace UI
│   ├── meeting/
│   │   └── MeetingToolbar.tsx     # Meeting controls
│   ├── settings/
│   │   ├── AudioSettingsSection.tsx
│   │   ├── VideoSettingsSection.tsx
│   │   ├── GeneralSettingsSection.tsx
│   │   └── ScreenShareSettingsSection.tsx
│   ├── common/
│   │   ├── DraggableModal.tsx     # Draggable modal component
│   │   ├── FormSelect.tsx         # Custom select input
│   │   ├── IconButton.tsx         # Reusable icon button
│   │   └── WindowControls.tsx     # Window control buttons
│   └── ui/                         # shadcn/ui component library
└── styles/
    └── globals.css                 # Global styles and Tailwind config
```

## 🎨 Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library
- **Web Audio API** - Real microphone access

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **better-sqlite3** - Fast SQLite database
- **CORS** - Cross-origin resource sharing

### Database
- **SQLite** - File-based SQL database
- **File:** `backend/audio-states.db`
- **Schema:** user_states table with indexes

## 📚 Documentation

Detailed development specifications are available in the `assets/` directory:

- `assets/user_story1/mute_verification_dev_spec.md` - Mute verification feature spec
- `assets/user_story_2/story_2_dev_spec.pdf` - Audio device error handling spec
- `assets/user_story_3/In-Call Device Switching – Development Specification.pdf`

## 🐛 Development Controls

The application includes a **Dev Controls** panel (bottom-right) for testing:

- **Connection Status**: `● API` (connected) or `○ Offline` (backend unavailable)
- **User ID**: Auto-generated unique identifier
- **Audio Device Connected**: Toggle to simulate device disconnection
- **Audio Status**: Real-time mute status and audio levels
- **Microphone Selector**: Dropdown to switch between devices

**Features:**
- Live audio level visualization
- Device switching without disconnection
- Backend connectivity indicator

## 📝 Notes

### What's Real:
- ✅ Microphone access and control
- ✅ Mute/unmute functionality
- ✅ Audio level monitoring
- ✅ Device switching
- ✅ Backend API with database
- ✅ State persistence

### What's Still Mocked:
- ❌ Video camera functionality
- ❌ WebRTC peer connections
- ❌ Actual meeting rooms with other users
- ❌ Audio/video transmission to other participants

This is a **fully functional prototype** of the audio control system with real backend integration.

## 🗄️ Database Management

### View Database Contents
```bash
cd backend
node check-db.js
```

**Output shows:**
- User ID
- Mute status (🔇 Muted / 🎤 Unmuted)
- Current device
- Room assignment
- Timestamps

### Clear Database
```bash
cd backend
node clear-db.js
```

### SQL Queries
```bash
cd backend
sqlite3 audio-states.db "SELECT * FROM user_states;"
```

### API Access (while backend is running)
```bash
# Get all users
curl http://localhost:3001/api/users

# Get specific user
curl http://localhost:3001/api/users/user-abc123
```

**See `DATABASE_GUIDE.md` for complete database documentation.**

---

## 📚 Additional Documentation

- **`ARCHITECTURE.md`** - System architecture with Mermaid diagrams
- **`IMPLEMENTATION.md`** - Implementation details for microphone features
- **`MICROPHONE_SWITCHING.md`** - Device switching guide
- **`BACKEND_INTEGRATION.md`** - API integration guide
- **`DATABASE_GUIDE.md`** - Database management guide
- **`backend/README.md`** - Backend API documentation

## 🤝 Contributing

This project was developed by **Team Bug Farmers** for CMU Fall 2025 AI Tool course.

## 📄 License

See `Attributions.md` for third-party library attributions.

