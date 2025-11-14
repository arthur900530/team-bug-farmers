import { useState } from 'react';
import { Users } from 'lucide-react';
import { WindowControls } from './common/WindowControls';
import { MeetingToolbar } from './meeting/MeetingToolbar';
import { QualityIndicator } from './meeting/QualityIndicator';
import { AckIndicator } from './meeting/AckIndicator';
import { ParticipantList } from './meeting/ParticipantList';
import { ConnectionStatus } from './meeting/ConnectionStatus';
import { ServerAudioIndicator } from './meeting/ServerAudioIndicator';
import type { QualityTier, AckSummary, UserSession, ConnectionState } from '../types';

interface MeetingViewProps {
  micMuted: boolean;
  micLocked: boolean;
  showBanner: boolean;
  cameraOn: boolean;
  onMicToggle: () => void;
  onMicSettings: () => void;
  // New props from Dev Spec
  currentTier?: QualityTier;
  ackSummary?: AckSummary | null;
  participants?: UserSession[];
  currentUserId?: string;
  connectionState?: ConnectionState;
  displayName?: string;
}

export function MeetingView({ 
  micMuted, 
  micLocked, 
  showBanner, 
  cameraOn, 
  onMicToggle, 
  onMicSettings,
  currentTier = 'HIGH',
  ackSummary = null,
  participants = [],
  currentUserId,
  connectionState = 'Streaming',
  displayName = 'User'
}: MeetingViewProps) {
  const [showParticipants, setShowParticipants] = useState(false);

  return (
    <div className="absolute inset-0 bg-black">
      {/* Window Controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 bg-gray-800 z-10">
        <WindowControls showDots={true} />
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <ConnectionStatus state={connectionState} />
          
          {/* View Controls */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-white">View</span>
            <button 
              className="text-white hover:bg-gray-700 px-2 py-1 rounded transition-colors"
              aria-label="View options"
            >
              ▣
            </button>
          </div>
        </div>
      </div>

      {/* Quality & ACK Indicators - Top Right */}
      <div className="absolute top-14 right-4 z-10 space-y-2">
        <QualityIndicator tier={currentTier} />
        <AckIndicator summary={ackSummary} />
        
        {/* Server Audio Transmission Indicator */}
        {/* Shows when audio is being transmitted through server (User Story 11) */}
        <ServerAudioIndicator 
          connectionState={connectionState}
          micMuted={micMuted}
        />
        
        {/* Participants Toggle */}
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 transition-colors"
        >
          <Users className="w-4 h-4 text-white" />
          <span className="text-white text-sm">
            {participants.length} {participants.length === 1 ? 'Participant' : 'Participants'}
          </span>
        </button>
      </div>

      {/* Participant List Panel */}
      {showParticipants && (
        <div className="absolute top-14 right-4 z-20 w-80">
          <ParticipantList 
            participants={participants} 
            currentUserId={currentUserId}
            onClose={() => setShowParticipants(false)}
          />
        </div>
      )}

      {/* Banner for headphone notification */}
      {showBanner && (
        <div className="absolute top-12 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-center z-10">
          <span>You have been unmuted due to external headphones</span>
        </div>
      )}

      {/* Main Video Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl mb-4">{displayName}</div>
        </div>

        {/* Participant Name in Bottom Left */}
        <div className="absolute bottom-24 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          {displayName}
        </div>
      </div>

      {/* Bottom Controls */}
      <MeetingToolbar
        micMuted={micMuted}
        micLocked={micLocked}
        cameraOn={cameraOn}
        onMicToggle={onMicToggle}
        onMicSettings={onMicSettings}
      />
    </div>
  );
}
