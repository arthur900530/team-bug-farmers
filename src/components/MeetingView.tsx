import React from 'react';
import { WindowControls } from './common/WindowControls';
import { MeetingToolbar } from './meeting/MeetingToolbar';

interface MeetingViewProps {
  micMuted: boolean;
  micLocked: boolean;
  showBanner: boolean;
  cameraOn: boolean;
  username?: string;
  onMicToggle: () => void;
  onMicSettings: () => void;
}

export function MeetingView({ 
  micMuted, 
  micLocked, 
  showBanner, 
  cameraOn,
  username = 'User',
  onMicToggle, 
  onMicSettings 
}: MeetingViewProps) {
  return (
    <div className="absolute inset-0 bg-black">
      {/* Window Controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 bg-gray-800 z-10">
        <WindowControls showDots={true} />
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

      {/* Banner for headphone notification */}
      {showBanner && (
        <div className="absolute top-12 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-center z-10">
          <span>You have been unmuted due to external headphones</span>
        </div>
      )}

      {/* Main Video Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl mb-4">{username}</div>
        </div>

        {/* Participant Name in Bottom Left */}
        <div className="absolute bottom-24 left-4 text-white bg-black bg-opacity-50 px-2 py-1 rounded">
          {username}
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
