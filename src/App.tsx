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
import { updateMuteStatus, updateDevice, updateUserState, checkBackendHealth } from './services/backendService';

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

// Helper function to get or create userId from localStorage
const getUserFromStorage = (): { userId: string; username: string } | null => {
  try {
    const stored = localStorage.getItem('zoomDemoUser');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading user from localStorage:', error);
  }
  return null;
};

// Helper function to save userId to localStorage
const saveUserToStorage = (userId: string, username: string): void => {
  try {
    localStorage.setItem('zoomDemoUser', JSON.stringify({ userId, username }));
  } catch (error) {
    console.error('Error saving user to localStorage:', error);
  }
};

// Helper function to create userId from username
const createUserId = (username: string): string => {
  // Create a slug-like ID from username with a short random suffix for uniqueness
  const slug = username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
  const randomSuffix = Math.random().toString(36).substr(2, 6);
  return `${slug}-${randomSuffix}`;
};

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
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [backendConnected, setBackendConnected] = useState(false);

  // Initialize audio service on component mount
  useEffect(() => {
    // Try to load user from localStorage
    const storedUser = getUserFromStorage();
    if (storedUser) {
      setUserId(storedUser.userId);
      setUsername(storedUser.username);
      console.log(`👤 Welcome back, ${storedUser.username}!`);
    }

    // Check backend connectivity
    checkBackendHealth().then(isHealthy => {
      setBackendConnected(isHealthy);
      if (isHealthy) {
        console.log('✅ Backend connected');
      } else {
        console.warn('⚠️ Backend not available (running in offline mode)');
      }
    });

    return () => {
      // Cleanup on unmount
      audioService.cleanup();
    };
  }, []);

  const navigateToScreen = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleJoinMeeting = async (inputUsername?: string) => {
    // If username provided, this is the first join attempt
    if (inputUsername) {
      // Create or update user ID based on username
      const newUserId = createUserId(inputUsername);
      setUserId(newUserId);
      setUsername(inputUsername);
      saveUserToStorage(newUserId, inputUsername);
      console.log(`👤 User created: ${inputUsername} (${newUserId})`);
      
      // Create user in database immediately
      if (backendConnected) {
        await updateUserState(
          newUserId,
          inputUsername,
          false, // Not muted initially
          null,  // No device yet
          null,  // No device label yet
          'default-room'
        );
        console.log('✅ User saved to database');
      }
    }

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
        
        // Get available audio devices
        const devices = await audioService.getAudioDevices();
        setAvailableDevices(devices);
        setCurrentDeviceId(audioService.getCurrentDeviceId());
        
        // Start monitoring audio levels for verification
        audioService.startAudioLevelMonitoring((level) => {
          setAudioLevel(level);
        }, 100);
        
        // Send initial state to backend
        if (backendConnected && userId && username) {
          const device = devices.find(d => d.deviceId === audioService.getCurrentDeviceId());
          updateUserState(
            userId,
            username,
            false,
            audioService.getCurrentDeviceId(),
            device?.label || null,
            'default-room'
          );
        }
        
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
      
      // Get available audio devices
      const devices = await audioService.getAudioDevices();
      setAvailableDevices(devices);
      setCurrentDeviceId(audioService.getCurrentDeviceId());
      
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

  const handleMicrophoneSwitch = async (deviceId: string) => {
    if (!audioInitialized) {
      console.warn('Audio not initialized yet');
      return;
    }

    console.log('Switching to device:', deviceId);
    const success = await audioService.switchMicrophone(deviceId);
    
    if (success) {
      setCurrentDeviceId(deviceId);
      
      // Restart audio level monitoring
      audioService.startAudioLevelMonitoring((level) => {
        setAudioLevel(level);
      }, 100);
      
      // Get device label
      const device = availableDevices.find(d => d.deviceId === deviceId);
      const deviceLabel = device?.label || null;
      
      // Send device update to backend
      if (backendConnected) {
        updateDevice(userId, deviceId, deviceLabel);
      }
      
      console.log('✅ Microphone switched successfully');
    } else {
      console.error('❌ Failed to switch microphone');
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
      
      // Send state to backend
      if (backendConnected) {
        updateMuteStatus(userId, true);
      }
      
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
      
      // Send state to backend
      if (backendConnected) {
        updateMuteStatus(userId, false);
      }
      
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
      
      // Send state to backend
      if (backendConnected) {
        updateMuteStatus(userId, true);
      }
      
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
              username={username}
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
            username={username}
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
              username={username}
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
              username={username}
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
              username={username}
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
      <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg z-50 text-white text-sm max-w-xs">
        <div className="mb-2 font-semibold flex items-center justify-between">
          <span>Dev Controls</span>
          <span className={`text-xs ${backendConnected ? 'text-green-400' : 'text-gray-500'}`}>
            {backendConnected ? '● API' : '○ Offline'}
          </span>
        </div>
        {username && (
          <div className="text-xs text-gray-400 mb-2 truncate" title={`User ID: ${userId}`}>
            👤 {username}
          </div>
        )}
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
            <div className="text-xs space-y-2">
              <div>Muted: {micMuted ? '🔇 Yes' : '🎤 No'}</div>
              <div>Level: {audioLevel}%</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
              
              {availableDevices.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <label className="block mb-1 text-xs text-gray-400">
                    Microphone:
                  </label>
                  <select
                    value={currentDeviceId || ''}
                    onChange={(e) => handleMicrophoneSwitch(e.target.value)}
                    className="w-full text-xs bg-gray-700 text-white rounded px-2 py-1 border border-gray-600 hover:bg-gray-600 cursor-pointer"
                  >
                    {availableDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
