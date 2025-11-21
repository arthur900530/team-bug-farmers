import { useState, useEffect, useRef } from 'react';
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

  // New state from Dev Spec
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentMeetingId, setCurrentMeetingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('Disconnected');
  const [currentTier, setCurrentTier] = useState<QualityTier>('HIGH');
  const [participants, setParticipants] = useState<UserSession[]>([]);
  const [_ackSummary, _setAckSummary] = useState<AckSummary | null>(null);
  
  // UserClient instance for real backend connection
  const userClientRef = useRef<UserClient | null>(null);

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
      
      // Set up participant tracking from remote tracks
      userClient.setOnRemoteTrack((track) => {
        console.log('[App] Received remote track:', track.id);
        // When we receive a track, add that user to participants if not already there
        // Note: We'll use the track ID as a proxy for user identification
        // In a full implementation, the server should send user info with the track
      });
      
      // Track participants from user-joined events
      const signalingClient = (userClient as any).signalingClient;
      if (signalingClient) {
        signalingClient.onUserJoined((userJoinedMsg: any) => {
          console.log('[App] User joined:', userJoinedMsg.userId);
          setParticipants(prev => {
            if (prev.some(p => p.userId === userJoinedMsg.userId)) {
              return prev;
            }
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
        
        // Also populate initial participants from JOINED message
        signalingClient.onJoined((joinedMsg: any) => {
          console.log('[App] Initial participants:', joinedMsg.participants);
          const participantSessions = joinedMsg.participants
            .map((pid: string) => ({
              userId: pid,
              pcId: `pc-${pid}`,
              qualityTier: 'HIGH' as const,
              lastCrc32: '',
              connectionState: 'Streaming' as const,
              timestamp: Date.now()
            }));
          setParticipants(participantSessions);
        });
      }
      
      // User Story 8: Set up tier change callback
      // From dev_specs/flow_charts.md line 154: "SignalingServer.notify Tier change to all participants"
      // From dev_specs/APIs.md line 25: "onTierChange(callback)"
      userClient.setOnTierChange((tier: QualityTier) => {
        setCurrentTier(tier);
        console.log('[App] Tier changed to:', tier);
        
        // Update all participants' quality tier to match meeting tier
        // From dev_specs/flow_charts.md line 155: "Update UserSession.qualityTier for all users"
        setParticipants(prev => prev.map(p => ({
          ...p,
          qualityTier: tier
        })));
      });
      
      // Join meeting using UserClient
      await userClient.joinMeeting();
      
      // Expose UserClient globally for browser console debugging (Phase 4 testing)
      // This allows verification scripts to access UserClient instance
      (window as any).userClient = userClient;
      console.log('[App] UserClient exposed globally as window.userClient (for Phase 4 testing)');
    
      // Update connection state (UserClient will update via callback)
      setConnectionState(userClient.getConnectionState());
      
    } catch (error) {
      console.error('[App] Failed to join meeting:', error);
      setConnectionState('Disconnected');
      setCurrentScreen('connection-error');
    }
  };

  const handleRetryConnection = async () => {
    // Retry the connection with stored credentials
    if (currentUserId && currentMeetingId) {
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
              ackSummary={null}
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
            ackSummary={null}
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
              ackSummary={null}
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
              ackSummary={null}
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
              ackSummary={null}
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
