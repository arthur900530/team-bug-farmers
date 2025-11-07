# Test Specification: App.tsx

## Functions in App.tsx

1. `navigateToScreen(screen: Screen)` - Updates the current screen state
2. `handleJoinMeeting(userId: string, meetingId: string, name: string)` - Async function that manages the meeting connection flow
3. `handleRetryConnection()` - Async function that retries a failed connection
4. `handleMicToggle()` - Toggles microphone muted state based on current screen
5. `handleMicSettings()` - Navigates to audio settings menu
6. `handleCloseAudioDeviceError()` - Closes audio device error modal and returns to previous meeting state
7. `renderCurrentScreen()` - Returns the appropriate React component based on current screen state
8. `App()` - Main application component that manages all state and renders UI

## Test Table for App.tsx

| Test # | Function | Test Purpose | Test Inputs | Expected Output |
|--------|----------|--------------|-------------|-----------------|
| 1 | `navigateToScreen` | Verify screen navigation to join screen | `screen: 'join'` | `currentScreen` state is set to `'join'` |
| 2 | `navigateToScreen` | Verify screen navigation to meeting screen | `screen: 'meeting'` | `currentScreen` state is set to `'meeting'` |
| 3 | `navigateToScreen` | Verify screen navigation to audio menu | `screen: 'audio-menu'` | `currentScreen` state is set to `'audio-menu'` |
| 4 | `handleJoinMeeting` | First connection attempt should fail and show error | `userId: 'user@test.com'`, `meetingId: 'meeting123'`, `name: 'Test User'`, `hasTriedConnecting: false` | `connectionState` becomes `'Disconnected'`, `currentScreen` is `'connection-error'`, `hasTriedConnecting` is `true` |
| 5 | `handleJoinMeeting` | Second connection attempt should succeed | `userId: 'user@test.com'`, `meetingId: 'meeting123'`, `name: 'Test User'`, `hasTriedConnecting: true` | `connectionState` transitions through `'Connecting'` → `'Signaling'` → `'Offering'` → `'ICE_Gathering'` → `'Waiting_Answer'` → `'Connected'` → `'Streaming'`, final `currentScreen` is `'meeting'` |
| 6 | `handleJoinMeeting` | Should store user information correctly | `userId: 'john@example.com'`, `meetingId: 'abc-123'`, `name: 'John Doe'` | `currentUserId` is `'john@example.com'`, `currentMeetingId` is `'abc-123'`, `displayName` is `'John Doe'` |
| 7 | `handleJoinMeeting` | Should initialize mock participants data | `userId: 'user@test.com'`, `meetingId: 'meeting123'`, `name: 'Test User'`, `hasTriedConnecting: true` | `participants` array contains 3 UserSession objects with userIds: `'user@test.com'`, `'alice@example.com'`, `'bob@example.com'` |
| 8 | `handleJoinMeeting` | Should initialize ACK summary with all users acknowledged | `userId: 'user@test.com'`, `meetingId: 'meeting123'`, `name: 'Test User'`, `hasTriedConnecting: true` | `ackSummary.ackedUsers` contains `['alice@example.com', 'bob@example.com']`, `ackSummary.missingUsers` is empty array `[]` |
| 9 | `handleJoinMeeting` | Should set initial quality tier to HIGH | `userId: 'user@test.com'`, `meetingId: 'meeting123'`, `name: 'Test User'`, `hasTriedConnecting: true` | `currentTier` is `'HIGH'` (before interval updates) |
| 10 | `handleRetryConnection` | Should retry with stored credentials | `currentUserId: 'test@example.com'`, `currentMeetingId: 'room-456'`, `displayName: 'Tester'` | Calls `handleJoinMeeting` with parameters `('test@example.com', 'room-456', 'Tester')` |
| 11 | `handleRetryConnection` | Should not retry if userId is null | `currentUserId: null`, `currentMeetingId: 'room-456'` | `handleJoinMeeting` is not called |
| 12 | `handleRetryConnection` | Should not retry if meetingId is null | `currentUserId: 'test@example.com'`, `currentMeetingId: null` | `handleJoinMeeting` is not called |
| 13 | `handleMicToggle` | Should mute microphone when in meeting screen | `currentScreen: 'meeting'` | `micMuted` becomes `true`, `micLocked` becomes `true`, `currentScreen` becomes `'muted'` |
| 14 | `handleMicToggle` | Should unmute and show banner when in muted screen | `currentScreen: 'muted'` | `micMuted` becomes `false`, `micLocked` becomes `false`, `showBanner` becomes `true`, `currentScreen` becomes `'unmuted-banner'` |
| 15 | `handleMicToggle` | Should mute microphone when in meeting-clean screen | `currentScreen: 'meeting-clean'` | `micMuted` becomes `true`, `micLocked` becomes `true`, `currentScreen` becomes `'muted'` |
| 16 | `handleMicToggle` | Banner should auto-hide after 3 seconds | `currentScreen: 'muted'` (trigger toggle) | After 3000ms delay: `showBanner` becomes `false`, `currentScreen` becomes `'meeting-clean'` |
| 17 | `handleMicSettings` | Should navigate to audio menu | No parameters | `currentScreen` becomes `'audio-menu'` |
| 18 | `handleCloseAudioDeviceError` | Should return to muted screen when mic is muted | `micMuted: true` | `currentScreen` becomes `'muted'` |
| 19 | `handleCloseAudioDeviceError` | Should return to meeting-clean screen when mic is not muted | `micMuted: false` | `currentScreen` becomes `'meeting-clean'` |
| 20 | `renderCurrentScreen` | Should render JoinMeetingModal for join screen | `currentScreen: 'join'` | Returns `JoinMeetingModal` component with correct props |
| 21 | `renderCurrentScreen` | Should render ConnectionErrorModal for connection-error screen | `currentScreen: 'connection-error'` | Returns `ConnectionErrorModal` component with `onRetry` prop |
| 22 | `renderCurrentScreen` | Should render MeetingView for meeting screen | `currentScreen: 'meeting'` | Returns `MeetingView` component with all required props |
| 23 | `renderCurrentScreen` | Should render MeetingView with AudioDeviceErrorModal overlay | `currentScreen: 'audio-device-error'` | Returns fragment containing `MeetingView` and `AudioDeviceErrorModal` |
| 24 | `renderCurrentScreen` | Should render MeetingView with AudioSettings overlay | `currentScreen: 'audio-menu'` | Returns fragment containing `MeetingView`, backdrop div, and `AudioSettings` |
| 25 | `renderCurrentScreen` | Should render MeetingView with AllSettings overlay | `currentScreen: 'all-settings'` | Returns div containing `MeetingView` and `AllSettings` |
| 26 | `renderCurrentScreen` | Should render MeetingView with ScreenShareSettings overlay | `currentScreen: 'screen-share-settings'` | Returns div containing `MeetingView` and `ScreenShareSettings` |
| 27 | `renderCurrentScreen` | Should return null for unknown screen | `currentScreen: 'unknown-screen'` (as any) | Returns `null` |
| 28 | `App` | Should initialize with default state values | Component mount | `currentScreen` is `'join'`, `micMuted` is `false`, `cameraOn` is `false`, `connectionState` is `'Disconnected'`, `currentTier` is `'HIGH'` |
| 29 | `App` | Should show ZoomWorkspace on join screen | `currentScreen: 'join'` | ZoomWorkspace component is rendered |
| 30 | `App` | Should show ZoomWorkspace on connection-error screen | `currentScreen: 'connection-error'` | ZoomWorkspace component is rendered |
| 31 | `App` | Should not show ZoomWorkspace on meeting screen | `currentScreen: 'meeting'` | ZoomWorkspace component is not rendered |

## Notes on Test Implementation

- Tests involving async functions (`handleJoinMeeting`, `handleRetryConnection`) should use `async/await` or promise-based testing
- Timer-based tests (e.g., banner auto-hide, interval updates) should use Jest's fake timers (`jest.useFakeTimers()`)
- Component rendering tests should use React Testing Library's `render` and `screen` utilities
- State verification requires testing library queries or state inspection via React hooks

