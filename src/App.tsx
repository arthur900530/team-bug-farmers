import React, { useState, useEffect } from 'react';
import { ZoomWorkspace } from './components/ZoomWorkspace';
import { JoinMeetingModal } from './components/JoinMeetingModal';
import { ConnectionErrorModal } from './components/ConnectionErrorModal';
import { AudioDeviceErrorModal } from './components/AudioDeviceErrorModal';
import { MeetingView } from './components/MeetingView';
import { AudioSettings } from './components/AudioSettings';
import { AllSettings } from './components/AllSettings';
import { ScreenShareSettings } from './components/ScreenShareSettings';
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

  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleJoinMeeting = async (userId: string, meetingId: string, name: string) => {
    // Store user info
    setCurrentUserId(userId);
    setCurrentMeetingId(meetingId);
    setDisplayName(name);
    
    // Simulate connection process with state transitions
    setConnectionState('Connecting');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setConnectionState('Signaling');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setConnectionState('Offering');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setConnectionState('ICE_Gathering');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setConnectionState('Waiting_Answer');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // First attempt fails for demo
    if (!hasTriedConnecting) {
      setConnectionState('Disconnected');
      setCurrentScreen('connection-error');
      setHasTriedConnecting(true);
      return;
    }
    
    // Second attempt succeeds
    setConnectionState('Connected');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setConnectionState('Streaming');
    setCurrentScreen('meeting');
    
    // Mock participants data
    const mockParticipants: UserSession[] = [
      {
        userId: userId,
        pcId: `pc-${userId}`,
        qualityTier: 'HIGH',
        lastCrc32: '',
        connectionState: 'Streaming',
        timestamp: Date.now()
      },
      {
        userId: 'alice@example.com',
        pcId: 'pc-alice',
        qualityTier: 'HIGH',
        lastCrc32: '',
        connectionState: 'Streaming',
        timestamp: Date.now()
      },
      {
        userId: 'bob@example.com',
        pcId: 'pc-bob',
        qualityTier: 'MEDIUM',
        lastCrc32: '',
        connectionState: 'Streaming',
        timestamp: Date.now()
      }
    ];
    setParticipants(mockParticipants);
    
    // Mock ACK summary
    setAckSummary({
      meetingId: meetingId,
      ackedUsers: ['alice@example.com', 'bob@example.com'],
      missingUsers: []
    });
    
    // Simulate dynamic quality changes every 10 seconds
    const qualityInterval = setInterval(() => {
      const tiers: QualityTier[] = ['HIGH', 'MEDIUM', 'LOW'];
      const randomTier = tiers[Math.floor(Math.random() * tiers.length)];
      setCurrentTier(randomTier);
    }, 10000);
    
    // Simulate ACK updates every 2 seconds
    const ackInterval = setInterval(() => {
      const shouldHaveIssue = Math.random() > 0.8; // 20% chance of delivery issue
      setAckSummary({
        meetingId: meetingId,
        ackedUsers: shouldHaveIssue ? ['alice@example.com'] : ['alice@example.com', 'bob@example.com'],
        missingUsers: shouldHaveIssue ? ['bob@example.com'] : []
      });
    }, 2000);
    
    // Cleanup on unmount (in a real app, this would be in useEffect)
    return () => {
      clearInterval(qualityInterval);
      clearInterval(ackInterval);
    };
  };

  const handleRetryConnection = async () => {
    // Retry the connection with stored credentials
    if (currentUserId && currentMeetingId) {
      await handleJoinMeeting(currentUserId, currentMeetingId, displayName);
    }
  };

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
