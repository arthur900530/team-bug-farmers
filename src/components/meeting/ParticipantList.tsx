import React from 'react';
import { Mic, MicOff, User, Signal } from 'lucide-react';
import type { UserSession } from '../../types';

interface ParticipantListProps {
  participants: UserSession[];
  currentUserId?: string;
  className?: string;
}

export function ParticipantList({ participants, currentUserId, className = '' }: ParticipantListProps) {
  const getConnectionStatusColor = (state: UserSession['connectionState']) => {
    switch (state) {
      case 'Connected':
      case 'Streaming':
        return 'text-green-500';
      case 'Degraded':
        return 'text-yellow-500';
      case 'Reconnecting':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

  const getTierBadgeColor = (tier: UserSession['qualityTier']) => {
    switch (tier) {
      case 'HIGH':
        return 'bg-green-500/20 text-green-500';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'LOW':
        return 'bg-orange-500/20 text-orange-500';
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">
          Participants ({participants.length})
        </h3>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {participants.map((participant) => {
          const isCurrentUser = participant.userId === currentUserId;
          
          return (
            <div
              key={participant.userId}
              className="flex items-center justify-between p-2 rounded hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>

                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm">
                      {participant.userId}
                      {isCurrentUser && (
                        <span className="text-gray-400 ml-1">(You)</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Connection Status */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <Signal
                      className={`w-3 h-3 ${getConnectionStatusColor(
                        participant.connectionState
                      )}`}
                    />
                    <span className="text-xs text-gray-400">
                      {participant.connectionState}
                    </span>
                  </div>
                </div>

                {/* Quality Tier Badge */}
                <div
                  className={`px-2 py-0.5 rounded text-xs font-medium ${getTierBadgeColor(
                    participant.qualityTier
                  )}`}
                >
                  {participant.qualityTier}
                </div>
              </div>
            </div>
          );
        })}

        {participants.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No participants yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

