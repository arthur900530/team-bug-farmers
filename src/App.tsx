import React, { useState, useEffect } from 'react';
import { ZoomWorkspace } from './components/ZoomWorkspace';
import { JoinMeetingModal } from './components/JoinMeetingModal';
import { ConnectionErrorModal } from './components/ConnectionErrorModal';
import { AudioDeviceErrorModal } from './components/AudioDeviceErrorModal';
import { MeetingView } from './components/MeetingView';
import { AudioSettings } from './components/AudioSettings';
import { AllSettings } from './components/AllSettings';
import { ScreenShareSettings } from './components/ScreenShareSettings';
import { audioService } from './services/audioService';

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
  const [audioDeviceConnected, setAudioDeviceConnected] = useState(true);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Initialize audio service on component mount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      audioService.cleanup();
    };
  }, []);

  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleJoinMeeting = async () => {
    // First attempt always fails (simulated connection error)
    if (!hasTriedConnecting) {
      setCurrentScreen('connection-error');
      setHasTriedConnecting(true);
    } else {
      // Second attempt succeeds - initialize real microphone
      const initialized = await audioService.initialize();
      if (initialized) {
        setAudioInitialized(true);
        setMicMuted(false);
        
        // Start monitoring audio levels for verification
        audioService.startAudioLevelMonitoring((level) => {
          setAudioLevel(level);
        }, 100);
        
        setCurrentScreen('meeting');
      } else {
        setAudioDeviceConnected(false);
        setCurrentScreen('audio-device-error');
      }
    }
  };

  const handleRetryConnection = async () => {
    // Retry succeeds - initialize microphone
    const initialized = await audioService.initialize();
    if (initialized) {
      setAudioInitialized(true);
      setMicMuted(false);
      
      // Start monitoring audio levels
      audioService.startAudioLevelMonitoring((level) => {
        setAudioLevel(level);
      }, 100);
      
      setCurrentScreen('meeting');
    } else {
      setAudioDeviceConnected(false);
      setCurrentScreen('audio-device-error');
    }
  };

  const handleMicToggle = () => {
    if (!audioInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }

    // Check if audio device is connected
    if (!audioDeviceConnected) {
      setCurrentScreen('audio-device-error');
      return;
    }

    if (currentScreen === 'meeting') {
      // Mute the microphone using real audio service
      audioService.mute();
      setMicMuted(true);
      setMicLocked(true);
      setCurrentScreen('muted');
      
      // Verify mute after a short delay
      setTimeout(() => {
        const isVerified = audioService.verifyMuteState();
        if (!isVerified) {
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
      }, 500);
      
    } else if (currentScreen === 'muted') {
      // Unmute the microphone using real audio service
      audioService.unmute();
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
      // Mute the microphone
      audioService.mute();
      setMicMuted(true);
      setMicLocked(true);
      setCurrentScreen('muted');
      
      // Verify mute after a short delay
      setTimeout(() => {
        const isVerified = audioService.verifyMuteState();
        if (!isVerified) {
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
      }, 500);
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
      
      {/* Developer Controls - for testing */}
      <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-50 text-white text-sm">
        <div className="mb-2 font-semibold">Dev Controls:</div>
        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors">
          <input
            type="checkbox"
            checked={audioDeviceConnected}
            onChange={(e) => setAudioDeviceConnected(e.target.checked)}
            className="rounded cursor-pointer"
          />
          <span>Audio Device Connected</span>
        </label>
        {audioInitialized && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="mb-1 text-xs text-gray-400">Audio Status:</div>
            <div className="text-xs">
              <div>Muted: {micMuted ? '🔇 Yes' : '🎤 No'}</div>
              <div>Level: {audioLevel}%</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
