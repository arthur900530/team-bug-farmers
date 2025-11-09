import React, { useState, useEffect, useRef } from 'react';
import { ZoomWorkspace } from './components/ZoomWorkspace';
import { JoinMeetingModal } from './components/JoinMeetingModal';
import { ConnectionErrorModal } from './components/ConnectionErrorModal';
import { AudioDeviceErrorModal } from './components/AudioDeviceErrorModal';
import { MeetingView } from './components/MeetingView';
import { AudioSettings } from './components/AudioSettings';
import { AllSettings } from './components/AllSettings';
import { ScreenShareSettings } from './components/ScreenShareSettings';
import { UserClient } from './services/UserClient';
import type { QualityTier, AckSummary, UserSession, ConnectionState } from './types';

type Screen = 
  | 'join' 
  | 'connection-error' 
  | 'meeting' 
  | 'muted' 
  | 'unmuted-banner' 
  | 'meeting-clean' 
  | 'audio-menu' 
  | 'all-settings' 
  | 'screen-share-settings'
  | 'audio-device-error';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('join');
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [micLocked, setMicLocked] = useState(false);
  const [hasTriedConnecting, setHasTriedConnecting] = useState(false);

  // New state from Dev Spec
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('Disconnected');
  const [currentTier, setCurrentTier] = useState<QualityTier>('HIGH');
  const [participants, setParticipants] = useState<UserSession[]>([]);
  const [ackSummary, setAckSummary] = useState<AckSummary | null>(null);
  
  // UserClient instance for real backend connection
  const userClientRef = useRef<UserClient | null>(null);

  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleJoinMeeting = async (userId: string, meetingId: string, name: string) => {
    // Store user info
    setCurrentUserId(userId);
    setCurrentMeetingId(meetingId);
    setDisplayName(name);
    
    try {
      // Create UserClient instance
      const userClient = new UserClient(userId, meetingId, name);
      userClientRef.current = userClient;
      
      // Set up connection state callback
      userClient.setOnConnectionStateChange((state) => {
        setConnectionState(state);
        if (state === 'Streaming') {
          setCurrentScreen('meeting');
        }
      });
      
      // Set up participant updates from 'joined' message
      const signalingClient = userClient.getSignalingClient();
      signalingClient.onJoined((joinedMsg) => {
        // Convert participant IDs to UserSession objects
        const participantSessions: UserSession[] = joinedMsg.participants.map((participantId: string) => ({
          userId: participantId,
          pcId: `pc-${participantId}`,
          qualityTier: 'HIGH', // Default, will be updated by QualityController (User Story 8)
          lastCrc32: '',
          connectionState: 'Streaming',
          timestamp: Date.now()
        }));
        setParticipants(participantSessions);
      });
      
      // Set up participant updates from 'user-joined' events
      signalingClient.onUserJoined((userJoinedMsg) => {
        // Add new participant to list
        setParticipants(prev => {
          // Check if participant already exists
          if (prev.some(p => p.userId === userJoinedMsg.userId)) {
            return prev;
          }
          // Add new participant
          return [...prev, {
            userId: userJoinedMsg.userId,
            pcId: `pc-${userJoinedMsg.userId}`,
            qualityTier: 'HIGH',
            lastCrc32: '',
            connectionState: 'Streaming',
            timestamp: Date.now()
          }];
        });
      });
      
      // Join meeting using UserClient
      await userClient.joinMeeting();
      
      // Update connection state (UserClient will update via callback)
      setConnectionState(userClient.getConnectionState());
      
    } catch (error) {
      console.error('[App] Failed to join meeting:', error);
      setConnectionState('Disconnected');
      setCurrentScreen('connection-error');
      setHasTriedConnecting(true);
    }
  };

  const handleRetryConnection = async () => {
    // Retry the connection with stored credentials
    if (currentUserId && currentMeetingId) {
      setHasTriedConnecting(true); // Mark as retry attempt
      await handleJoinMeeting(currentUserId, currentMeetingId, displayName);
    }
  };
  
  // Cleanup UserClient on unmount
  useEffect(() => {
    return () => {
      if (userClientRef.current) {
        userClientRef.current.leaveMeeting();
        userClientRef.current = null;
      }
    };
  }, []);

  const handleMicToggle = () => {
    if (currentScreen === 'meeting') {
      setMicMuted(true);
      setMicLocked(true);
      setCurrentScreen('muted');
    } else if (currentScreen === 'muted') {
      // Simulate headphone malfunction - unmute and show banner
      setMicMuted(false);
      setMicLocked(false);
      setShowBanner(true);
      setCurrentScreen('unmuted-banner');
      
      // Auto-hide banner after 3 seconds
      setTimeout(() => {
        setShowBanner(false);
        setCurrentScreen('meeting-clean');
      }, 3000);
    } else if (currentScreen === 'meeting-clean') {
      setMicMuted(true);
      setMicLocked(true);
      setCurrentScreen('muted');
    }
  };

  const handleMicSettings = () => {
    setCurrentScreen('audio-menu');
  };

  const handleCloseAudioDeviceError = () => {
    // Return to previous meeting state
    if (micMuted) {
      setCurrentScreen('muted');
    } else {
      setCurrentScreen('meeting-clean');
    }
  };

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'join':
        return (
          <JoinMeetingModal
            micOn={!micMuted}
            cameraOn={cameraOn}
            onJoin={handleJoinMeeting}
            onMicToggle={() => setMicMuted(!micMuted)}
            onCameraToggle={() => setCameraOn(!cameraOn)}
          />
        );
      
      case 'connection-error':
        return (
          <ConnectionErrorModal
            onRetry={handleRetryConnection}
          />
        );
      
      case 'audio-device-error':
        return (
          <>
            <MeetingView
              micMuted={micMuted}
              micLocked={micLocked}
              showBanner={false}
              cameraOn={cameraOn}
              onMicToggle={handleMicToggle}
              onMicSettings={handleMicSettings}
              currentTier={currentTier}
              ackSummary={ackSummary}
              participants={participants}
              currentUserId={currentUserId || undefined}
              connectionState={connectionState}
              displayName={displayName || currentUserId || 'User'}
            />
            <AudioDeviceErrorModal
              onClose={handleCloseAudioDeviceError}
            />
          </>
        );
      
      case 'meeting':
      case 'muted':
      case 'unmuted-banner':
      case 'meeting-clean':
        return (
          <MeetingView
            micMuted={micMuted}
            micLocked={micLocked}
            showBanner={showBanner}
            cameraOn={cameraOn}
            onMicToggle={handleMicToggle}
            onMicSettings={handleMicSettings}
            currentTier={currentTier}
            ackSummary={ackSummary}
            participants={participants}
            currentUserId={currentUserId || undefined}
            connectionState={connectionState}
            displayName={displayName || currentUserId || 'User'}
          />
        );
      
      case 'audio-menu':
        return (
          <>
            <MeetingView
              micMuted={micMuted}
              micLocked={micLocked}
              showBanner={false}
              cameraOn={cameraOn}
              onMicToggle={handleMicToggle}
              onMicSettings={handleMicSettings}
              currentTier={currentTier}
              ackSummary={ackSummary}
              participants={participants}
              currentUserId={currentUserId || undefined}
              connectionState={connectionState}
              displayName={displayName || currentUserId || 'User'}
            />
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-50" 
              onClick={() => {
                // Return to the appropriate screen state
                if (micMuted) {
                  setCurrentScreen('muted');
                } else if (showBanner) {
                  setCurrentScreen('unmuted-banner');
                } else {
                  setCurrentScreen('meeting-clean');
                }
              }}
            />
            <AudioSettings
              onNavigateToSettings={() => setCurrentScreen('all-settings')}
              onClose={() => {
                // Return to the appropriate screen state
                if (micMuted) {
                  setCurrentScreen('muted');
                } else if (showBanner) {
                  setCurrentScreen('unmuted-banner');
                } else {
                  setCurrentScreen('meeting-clean');
                }
              }}
            />
          </>
        );
      
      case 'all-settings':
        return (
          <div className="relative">
            <MeetingView
              micMuted={micMuted}
              micLocked={micLocked}
              showBanner={false}
              cameraOn={cameraOn}
              onMicToggle={handleMicToggle}
              onMicSettings={handleMicSettings}
              currentTier={currentTier}
              ackSummary={ackSummary}
              participants={participants}
              currentUserId={currentUserId || undefined}
              connectionState={connectionState}
              displayName={displayName || currentUserId || 'User'}
            />
            <AllSettings
              onNavigateToScreenShare={() => setCurrentScreen('screen-share-settings')}
              onClose={() => setCurrentScreen('muted')}
            />
          </div>
        );
      
      case 'screen-share-settings':
        return (
          <div className="relative">
            <MeetingView
              micMuted={micMuted}
              micLocked={micLocked}
              showBanner={false}
              cameraOn={cameraOn}
              onMicToggle={handleMicToggle}
              onMicSettings={handleMicSettings}
              currentTier={currentTier}
              ackSummary={ackSummary}
              participants={participants}
              currentUserId={currentUserId || undefined}
              connectionState={connectionState}
              displayName={displayName || currentUserId || 'User'}
            />
            <ScreenShareSettings
              onClose={() => setCurrentScreen('muted')}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Only show ZoomWorkspace on join and connection-error screens */}
      {(currentScreen === 'join' || currentScreen === 'connection-error') && <ZoomWorkspace />}
      {renderCurrentScreen()}
    </div>
  );
}
