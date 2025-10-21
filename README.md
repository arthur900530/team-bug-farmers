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
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

After running `npm run dev`, open your browser to:
```
http://localhost:5173/
```

## 🎮 Using the Demo

### Initial Flow
1. **Join Meeting Modal**: Start by clicking "Join Meeting" 
2. **Connection Error**: The first attempt will fail (by design) - click "Retry"
3. **Meeting View**: You'll enter the main meeting interface

### Testing Features

#### Mute Verification
- Click the microphone button to mute/unmute
- When muted, a green checkmark appears indicating verification
- The system checks both hardware and software mute states

#### Audio Device Error Testing
- Look for the **"Dev Controls"** panel in the bottom-right corner
- Uncheck **"Audio Device Connected"** to simulate device disconnection
- Try to unmute - you'll see an error modal
- Re-check the box to restore the device

#### Settings Access
- Click the settings icon (gear/cog) in the meeting toolbar
- Explore audio, video, general, and screen share settings
- Click the dropdown arrow next to the microphone button for quick audio settings

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

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Radix UI** - Headless UI primitives
- **Lucide React** - Icon library

## 📚 Documentation

Detailed development specifications are available in the `assets/` directory:

- `assets/user_story1/mute_verification_dev_spec.md` - Mute verification feature spec
- `assets/user_story_2/story_2_dev_spec.pdf` - Audio device error handling spec
- `assets/user_story_3/In-Call Device Switching – Development Specification.pdf`

## 🐛 Development Controls

The application includes a **Dev Controls** panel (bottom-right) for testing:

- **Audio Device Connected**: Toggle to simulate device connection/disconnection
- This is only visible in development and should be removed for production

## 📝 Notes

- This is a **prototype/mockup** - it doesn't actually connect to real meetings
- Audio and video functionality is simulated
- The UI flow demonstrates the intended user experience for the three user stories
- Error states and edge cases are intentionally triggered for demonstration purposes

## 🔧 Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build optimized production bundle
npm run preview  # Preview production build locally
npm run lint     # Run ESLint for code quality checks
```

## 🤝 Contributing

This project was developed by **Team Bug Farmers** for CMU Fall 2025 AI Tool course.

## 📄 License

See `Attributions.md` for third-party library attributions.

