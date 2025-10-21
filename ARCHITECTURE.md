# System Architecture Diagram

## High-Level Architecture

```mermaid
graph TB
    subgraph "Browser Environment"
        subgraph "User Interface Layer"
            UI[React Components]
            JoinModal[JoinMeetingModal]
            MeetingView[MeetingView]
            ToolBar[MeetingToolbar]
            Settings[Settings Components]
            ErrorModals[Error Modals]
            
            UI --> JoinModal
            UI --> MeetingView
            UI --> Settings
            UI --> ErrorModals
            MeetingView --> ToolBar
        end
        
        subgraph "State Management Layer"
            AppState[App State React Hooks]
            MicState[Microphone State]
            AudioLevel[Audio Level State]
            UIState[UI State Screen]
            
            AppState --> MicState
            AppState --> AudioLevel
            AppState --> UIState
        end
        
        subgraph "Service Layer"
            AudioService[AudioService Singleton]
            MuteControl[Mute/Unmute Control]
            LevelMonitor[Audio Level Monitor]
            Verification[Mute Verification]
            
            AudioService --> MuteControl
            AudioService --> LevelMonitor
            AudioService --> Verification
        end
        
        subgraph "Browser APIs"
            MediaDevices[navigator.mediaDevices]
            AudioContext[Web Audio API]
            GetUserMedia[getUserMedia]
            AnalyserNode[AnalyserNode]
            MediaStream[MediaStream]
            
            MediaDevices --> GetUserMedia
            AudioContext --> AnalyserNode
            GetUserMedia --> MediaStream
        end
        
        subgraph "Hardware Layer"
            Microphone[Physical Microphone]
        end
    end
    
    %% Data Flow
    UI -.->|User Actions| AppState
    AppState -.->|State Updates| UI
    AppState -->|Mute/Unmute| AudioService
    AudioService -->|Audio Levels| AppState
    AudioService -->|Initialize| MediaDevices
    AudioService -->|Analyze| AudioContext
    GetUserMedia -.->|Permission Request| User[User]
    User -.->|Allow/Deny| GetUserMedia
    MediaStream -->|Audio Data| Microphone
    AnalyserNode -->|Frequency Data| AudioService
    
    %% Styling
    classDef uiLayer fill:#90EE90,stroke:#333,stroke-width:2px
    classDef stateLayer fill:#87CEEB,stroke:#333,stroke-width:2px
    classDef serviceLayer fill:#FFD700,stroke:#333,stroke-width:2px
    classDef apiLayer fill:#FFA07A,stroke:#333,stroke-width:2px
    classDef hardwareLayer fill:#DDA0DD,stroke:#333,stroke-width:2px
    
    class UI,JoinModal,MeetingView,ToolBar,Settings,ErrorModals uiLayer
    class AppState,MicState,AudioLevel,UIState stateLayer
    class AudioService,MuteControl,LevelMonitor,Verification serviceLayer
    class MediaDevices,AudioContext,GetUserMedia,AnalyserNode,MediaStream apiLayer
    class Microphone hardwareLayer
```

---

## Detailed Component Architecture

```mermaid
graph LR
    subgraph "React Application"
        App[App.tsx<br/>Main Container]
        
        subgraph "Screen Components"
            Join[JoinMeetingModal]
            ConnErr[ConnectionErrorModal]
            Meeting[MeetingView]
            AudioErr[AudioDeviceErrorModal]
            AudioSet[AudioSettings]
            AllSet[AllSettings]
        end
        
        subgraph "UI Components"
            Toolbar[MeetingToolbar]
            IconBtn[IconButton]
            Modal[DraggableModal]
            Select[FormSelect]
        end
        
        subgraph "shadcn/ui Library"
            Button[Button]
            Dialog[Dialog]
            Dropdown[DropdownMenu]
            Switch[Switch]
            Slider[Slider]
        end
    end
    
    subgraph "Services"
        AudioSvc[audioService.ts<br/>Singleton Instance]
    end
    
    subgraph "Browser APIs"
        Navigator[navigator.mediaDevices]
        WebAudio[Web Audio API]
    end
    
    App --> Join
    App --> ConnErr
    App --> Meeting
    App --> AudioErr
    App --> AudioSet
    App --> AllSet
    
    Meeting --> Toolbar
    Toolbar --> IconBtn
    AudioSet --> Modal
    AudioSet --> Select
    
    IconBtn --> Button
    Modal --> Dialog
    Select --> Dropdown
    
    App -->|initialize| AudioSvc
    App -->|mute/unmute| AudioSvc
    App -->|getAudioLevel| AudioSvc
    
    AudioSvc -->|getUserMedia| Navigator
    AudioSvc -->|createAnalyser| WebAudio
    
    Navigator -.->|audio stream| AudioSvc
    WebAudio -.->|frequency data| AudioSvc
    
    classDef mainApp fill:#FF6B6B,stroke:#333,stroke-width:3px,color:#fff
    classDef screen fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef ui fill:#95E1D3,stroke:#333,stroke-width:2px
    classDef lib fill:#F38181,stroke:#333,stroke-width:2px
    classDef service fill:#FFA07A,stroke:#333,stroke-width:2px
    classDef api fill:#DDA0DD,stroke:#333,stroke-width:2px
    
    class App mainApp
    class Join,ConnErr,Meeting,AudioErr,AudioSet,AllSet screen
    class Toolbar,IconBtn,Modal,Select ui
    class Button,Dialog,Dropdown,Switch,Slider lib
    class AudioSvc service
    class Navigator,WebAudio api
```

---

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant UI as UI Components
    participant App as App.tsx State
    participant AS as AudioService
    participant Browser as Browser APIs
    participant HW as Microphone Hardware
    
    Note over U,HW: Initialization Flow
    U->>UI: Click "Join Meeting"
    UI->>App: handleJoinMeeting()
    App->>AS: initialize()
    AS->>Browser: getUserMedia({audio: true})
    Browser->>U: Request permission
    U->>Browser: Allow
    Browser->>HW: Access microphone
    HW-->>Browser: Audio stream
    Browser-->>AS: MediaStream
    AS->>Browser: Create AudioContext
    AS->>Browser: Create AnalyserNode
    AS-->>App: Success (true)
    App->>AS: startAudioLevelMonitoring()
    AS-->>App: Audio level callbacks
    App-->>UI: Update state & render
    
    Note over U,HW: Mute Flow
    U->>UI: Click Mute Button
    UI->>App: handleMicToggle()
    App->>AS: mute()
    AS->>Browser: track.enabled = false
    Browser->>HW: Stop audio flow
    AS->>AS: getAudioLevel() returns 0
    AS-->>App: Muted state
    App-->>UI: Show muted icon
    
    Note over U,HW: Unmute Flow
    U->>UI: Click Unmute Button
    UI->>App: handleMicToggle()
    App->>AS: unmute()
    AS->>Browser: track.enabled = true
    Browser->>HW: Resume audio flow
    HW-->>Browser: Audio data
    AS->>AS: Analyze audio levels
    AS-->>App: Audio level updates
    App-->>UI: Show unmuted icon + levels
    
    Note over U,HW: Real-time Monitoring
    loop Every 100ms
        AS->>Browser: getByteFrequencyData()
        Browser-->>AS: Frequency array
        AS->>AS: Calculate average level
        AS-->>App: callback(level)
        App-->>UI: Update audio bar
    end
```

---

## Audio Service Internal Architecture

```mermaid
graph TD
    subgraph "audioService.ts"
        Init[initialize Method]
        Mute[mute Method]
        Unmute[unmute Method]
        GetLevel[getAudioLevel Method]
        Monitor[startAudioLevelMonitoring]
        Verify[verifyMuteState Method]
        Cleanup[cleanup Method]
        
        subgraph "Internal State"
            Context[audioContext: AudioContext]
            Stream[mediaStream: MediaStream]
            Analyser[analyser: AnalyserNode]
            Mic[microphone: MediaStreamAudioSourceNode]
            MutedFlag[isMuted: boolean]
        end
    end
    
    subgraph "Browser Web Audio API"
        AC[AudioContext]
        GUM[getUserMedia]
        AN[AnalyserNode]
        MSN[MediaStreamAudioSourceNode]
    end
    
    Init -->|creates| Context
    Init -->|requests| GUM
    GUM -->|returns| Stream
    Init -->|creates| Analyser
    Context -->|createAnalyser| AN
    Init -->|creates| Mic
    Context -->|createMediaStreamSource| MSN
    
    Mute -->|updates| MutedFlag
    Mute -->|track.enabled=false| Stream
    
    Unmute -->|updates| MutedFlag
    Unmute -->|track.enabled=true| Stream
    
    GetLevel -->|reads from| Analyser
    GetLevel -->|checks| MutedFlag
    
    Monitor -->|setInterval| GetLevel
    Monitor -->|callback with| GetLevel
    
    Verify -->|uses| GetLevel
    Verify -->|checks| MutedFlag
    
    Cleanup -->|closes| Context
    Cleanup -->|stops tracks| Stream
    Cleanup -->|disconnects| Mic
    Cleanup -->|clears| Monitor
    
    classDef method fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef state fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef api fill:#FF6B6B,stroke:#333,stroke-width:2px
    
    class Init,Mute,Unmute,GetLevel,Monitor,Verify,Cleanup method
    class Context,Stream,Analyser,Mic,MutedFlag state
    class AC,GUM,AN,MSN api
```

---

## State Management Flow

```mermaid
stateDiagram-v2
    [*] --> NotInitialized: App Start
    
    NotInitialized --> Initializing: User clicks Join
    Initializing --> PermissionRequested: getUserMedia() called
    
    PermissionRequested --> PermissionGranted: User allows
    PermissionRequested --> PermissionDenied: User denies
    
    PermissionDenied --> AudioDeviceError: Show error modal
    AudioDeviceError --> [*]: User closes app
    
    PermissionGranted --> UnmutedActive: Initialize success
    UnmutedActive --> Monitoring: Start audio monitoring
    
    state Monitoring {
        [*] --> UnmutedLive
        UnmutedLive --> MutedVerified: User clicks mute
        MutedVerified --> UnmutedLive: User clicks unmute
        
        MutedVerified --> MutedUnverified: Audio detected while muted
        MutedUnverified --> MutedVerified: Audio stops
        
        state UnmutedLive {
            [*] --> Silent
            Silent --> Speaking: Audio level > 5%
            Speaking --> Silent: Audio level < 5%
        }
        
        state MutedVerified {
            note right of MutedVerified
                track.enabled = false
                Audio level = 0%
                Green checkmark shown
            end note
        }
        
        state MutedUnverified {
            note right of MutedUnverified
                Conflict detected!
                Warning banner shown
            end note
        }
    }
    
    Monitoring --> Cleanup: User leaves meeting
    Cleanup --> [*]: Resources released
```

---

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend Framework"
        React[React 18.2.0]
        TS[TypeScript 5.2.2]
        Vite[Vite 5.0.8]
    end
    
    subgraph "Styling"
        Tailwind[Tailwind CSS 3.3.6]
        Shadcn[shadcn/ui Components]
        RadixUI[Radix UI Primitives]
    end
    
    subgraph "Audio APIs"
        WebAudio[Web Audio API]
        MediaStream[MediaStream API]
        GetUserMedia[getUserMedia API]
    end
    
    subgraph "Build Tools"
        Node[Node.js 18+]
        NPM[npm Package Manager]
        PostCSS[PostCSS]
    end
    
    subgraph "UI Icons"
        Lucide[Lucide React Icons]
    end
    
    React --> TS
    TS --> Vite
    React --> Tailwind
    Tailwind --> Shadcn
    Shadcn --> RadixUI
    React --> Lucide
    
    React -.->|uses| WebAudio
    React -.->|uses| MediaStream
    WebAudio --> GetUserMedia
    
    Vite --> Node
    Node --> NPM
    Tailwind --> PostCSS
    
    classDef frontend fill:#61DAFB,stroke:#333,stroke-width:2px
    classDef styling fill:#06B6D4,stroke:#333,stroke-width:2px
    classDef audio fill:#FF6B6B,stroke:#333,stroke-width:2px
    classDef build fill:#68A063,stroke:#333,stroke-width:2px
    classDef icons fill:#FFA500,stroke:#333,stroke-width:2px
    
    class React,TS,Vite frontend
    class Tailwind,Shadcn,RadixUI styling
    class WebAudio,MediaStream,GetUserMedia audio
    class Node,NPM,PostCSS build
    class Lucide icons
```

---

## File Structure

```mermaid
graph TD
    Root[team-bug-farmers/]
    
    Root --> Src[src/]
    Root --> Assets[assets/]
    Root --> Public[public/]
    Root --> Config[Config Files]
    
    Src --> AppTsx[App.tsx]
    Src --> MainTsx[main.tsx]
    Src --> Components[components/]
    Src --> Services[services/]
    Src --> Styles[styles/]
    
    Components --> Meeting[meeting/]
    Components --> Settings[settings/]
    Components --> Common[common/]
    Components --> UI[ui/]
    Components --> Figma[figma/]
    
    Services --> AudioService[audioService.ts]
    Services --> ServiceReadme[README.md]
    
    Meeting --> Toolbar[MeetingToolbar.tsx]
    Settings --> AudioSet[AudioSettingsSection.tsx]
    Settings --> VideoSet[VideoSettingsSection.tsx]
    Settings --> GenSet[GeneralSettingsSection.tsx]
    Settings --> ScreenSet[ScreenShareSettingsSection.tsx]
    
    Common --> DragModal[DraggableModal.tsx]
    Common --> IconBtn[IconButton.tsx]
    Common --> FormSel[FormSelect.tsx]
    Common --> WinCtrl[WindowControls.tsx]
    
    UI --> Button[button.tsx]
    UI --> Dialog[dialog.tsx]
    UI --> Dropdown[dropdown-menu.tsx]
    UI --> Switch[switch.tsx]
    UI --> More[... 30+ components]
    
    Styles --> GlobalCSS[globals.css]
    
    Config --> Package[package.json]
    Config --> Vite[vite.config.ts]
    Config --> TSConfig[tsconfig.json]
    Config --> Tailwind[tailwind.config.js]
    Config --> PostCSS[postcss.config.js]
    Config --> GitIgnore[.gitignore]
    
    Assets --> Mockups[mockups/]
    Assets --> UserStory1[user_story1/]
    Assets --> UserStory2[user_story_2/]
    Assets --> UserStory3[user_story_3/]
    
    classDef folder fill:#FFA07A,stroke:#333,stroke-width:2px
    classDef file fill:#98D8C8,stroke:#333,stroke-width:2px
    classDef important fill:#FF6B6B,stroke:#333,stroke-width:3px,color:#fff
    
    class Root,Src,Components,Services,Styles,Meeting,Settings,Common,UI,Assets,Config,Public folder
    class AppTsx,AudioService important
    class MainTsx,Toolbar,AudioSet,VideoSet,GenSet,ScreenSet,DragModal,IconBtn,FormSel,WinCtrl,Button,Dialog,Dropdown,Switch,More,GlobalCSS,ServiceReadme file
    class Package,Vite,TSConfig,Tailwind,PostCSS,GitIgnore file
```

---

## Deployment Architecture

```mermaid
graph LR
    subgraph "Development"
        Dev[Developer Machine]
        Git[Git Repository]
        Dev -->|push| Git
    end
    
    subgraph "GitHub"
        Repo[GitHub Repository<br/>arthur900530/team-bug-farmers]
        Actions[GitHub Actions<br/>Optional CI/CD]
        Repo -.->|can trigger| Actions
    end
    
    subgraph "Build Process"
        NPM[npm install]
        ViteBuild[npm run build]
        Dist[dist/ folder]
        
        NPM --> ViteBuild
        ViteBuild --> Dist
    end
    
    subgraph "Deployment Options"
        Vercel[Vercel]
        Netlify[Netlify]
        Pages[GitHub Pages]
        Custom[Custom Server]
        
        Dist -.->|deploy| Vercel
        Dist -.->|deploy| Netlify
        Dist -.->|deploy| Pages
        Dist -.->|deploy| Custom
    end
    
    subgraph "User Access"
        Browser[Web Browser]
        User[End User]
        
        User -->|access| Browser
    end
    
    Git -->|clone/pull| Repo
    Repo -->|source code| NPM
    
    Vercel -.->|https| Browser
    Netlify -.->|https| Browser
    Pages -.->|https| Browser
    Custom -.->|https| Browser
    
    Browser -.->|request mic permission| User
    
    classDef dev fill:#4ECDC4,stroke:#333,stroke-width:2px
    classDef github fill:#181717,stroke:#333,stroke-width:2px,color:#fff
    classDef build fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef deploy fill:#FF6B6B,stroke:#333,stroke-width:2px
    classDef user fill:#95E1D3,stroke:#333,stroke-width:2px
    
    class Dev,Git dev
    class Repo,Actions github
    class NPM,ViteBuild,Dist build
    class Vercel,Netlify,Pages,Custom deploy
    class Browser,User user
```

---

## Security & Permissions Flow

```mermaid
graph TD
    AppStart[Application Starts]
    UserJoin[User Clicks Join]
    InitAudio[Initialize Audio Service]
    
    AppStart --> UserJoin
    UserJoin --> InitAudio
    
    InitAudio --> PermCheck{Browser<br/>Permissions<br/>Check}
    
    PermCheck -->|Previously Granted| GetStream[Get Media Stream]
    PermCheck -->|Not Yet Asked| ShowPrompt[Show Permission Prompt]
    PermCheck -->|Previously Denied| ShowError[Show Error Modal]
    
    ShowPrompt --> UserDecision{User<br/>Decision}
    
    UserDecision -->|Allow| GetStream
    UserDecision -->|Deny| ShowError
    UserDecision -->|Dismiss| ShowError
    
    GetStream --> SecureCheck{HTTPS or<br/>localhost?}
    
    SecureCheck -->|Yes| CreateContext[Create Audio Context]
    SecureCheck -->|No| SecurityError[Security Error<br/>Requires HTTPS]
    
    CreateContext --> SetupAnalyser[Setup Analyser Node]
    SetupAnalyser --> StartMonitoring[Start Audio Monitoring]
    StartMonitoring --> Success[✓ Ready to Use]
    
    SecurityError --> ShowError
    ShowError --> Failed[✗ Cannot Access Mic]
    
    Success --> UserActions{User Actions}
    UserActions -->|Mute| DisableTrack[track.enabled = false]
    UserActions -->|Unmute| EnableTrack[track.enabled = true]
    UserActions -->|Leave| Cleanup[Cleanup Resources]
    
    DisableTrack --> Muted[Muted State]
    EnableTrack --> Unmuted[Unmuted State]
    
    Muted -->|Click Unmute| UserActions
    Unmuted -->|Click Mute| UserActions
    
    Cleanup --> Release[Release Media Stream]
    Release --> Close[Close Audio Context]
    Close --> End[End]
    
    classDef start fill:#90EE90,stroke:#333,stroke-width:2px
    classDef decision fill:#FFE66D,stroke:#333,stroke-width:2px
    classDef process fill:#87CEEB,stroke:#333,stroke-width:2px
    classDef error fill:#FF6B6B,stroke:#333,stroke-width:2px
    classDef success fill:#98D8C8,stroke:#333,stroke-width:3px
    
    class AppStart,UserJoin start
    class PermCheck,UserDecision,SecureCheck,UserActions decision
    class InitAudio,GetStream,CreateContext,SetupAnalyser,StartMonitoring,DisableTrack,EnableTrack,Cleanup,Release,Close process
    class ShowError,Failed,SecurityError error
    class Success,Muted,Unmuted success
```

---

## Key Architecture Principles

### 1. **Separation of Concerns**
- UI components handle presentation only
- AudioService handles all audio logic
- App.tsx manages application state
- Browser APIs abstracted through service layer

### 2. **Single Responsibility**
- Each component has one clear purpose
- AudioService is the only interface to Web Audio API
- State management centralized in App.tsx

### 3. **Dependency Flow**
```
UI Components → App State → Audio Service → Browser APIs → Hardware
```

### 4. **Error Handling**
- Permission denied → Show error modal
- Device unavailable → Show device error
- Initialization failed → Graceful degradation

### 5. **Resource Management**
- Cleanup on component unmount
- Stop audio monitoring when not needed
- Release media streams properly
- Close audio contexts

### 6. **Real-time Updates**
- Audio levels monitored every 100ms
- React state updates trigger UI re-renders
- Visual feedback for all audio changes

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| getUserMedia | ✅ 53+ | ✅ 36+ | ✅ 11+ | ✅ 79+ |
| Web Audio API | ✅ 35+ | ✅ 25+ | ✅ 14.1+ | ✅ 79+ |
| MediaStream | ✅ 53+ | ✅ 36+ | ✅ 11+ | ✅ 79+ |
| HTTPS Required | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |

**Note:** localhost is allowed without HTTPS for development.

