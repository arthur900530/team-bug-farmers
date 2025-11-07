/**
 * ServerAudioIndicator - Visual indicator for audio transmission through server
 * 
 * Purpose: Shows whether audio is being transmitted through the server (SFU)
 * Simple binary switch/gauge to verify User Story 11 requirement:
 * "audio transmitted from my device through the server to other participants"
 * 
 * From dev_specs/user_stories.md line 7:
 * "As a user, I want my audio to be transmitted seamlessly from my device 
 *  through the server to other participants"
 */

import React from 'react';
import type { ConnectionState } from '../../types';

interface ServerAudioIndicatorProps {
  connectionState: ConnectionState;
  micMuted: boolean;
}

/**
 * Simple binary switch indicator
 * Green = Audio transmitting through server
 * Red = Not transmitting
 */
export function ServerAudioIndicator({ connectionState, micMuted }: ServerAudioIndicatorProps) {
  // Audio is transmitting through server when:
  // 1. Connection state is 'Streaming' (connected to server)
  // 2. Microphone is not muted
  const isTransmitting = connectionState === 'Streaming' && !micMuted;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80">
      <div className="flex items-center gap-2">
        {/* Binary Switch Indicator */}
        <div className="relative">
          {/* Background circle */}
          <div 
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              isTransmitting ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {/* Pulsing animation when transmitting */}
            {isTransmitting && (
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
            )}
          </div>
        </div>
        
        {/* Label */}
        <span className="text-white text-xs font-medium">
          {isTransmitting ? 'Server TX' : 'No TX'}
        </span>
      </div>
      
      {/* Optional: Simple gauge/meter */}
      <div className="flex items-center gap-1">
        <div 
          className={`h-2 w-8 rounded transition-all duration-300 ${
            isTransmitting 
              ? 'bg-green-500' 
              : 'bg-gray-600'
          }`}
          style={{
            width: isTransmitting ? '32px' : '8px'
          }}
        />
      </div>
    </div>
  );
}

