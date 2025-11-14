import { useState } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { AckSummary } from '../../types';

interface AckIndicatorProps {
  summary: AckSummary | null;
  className?: string;
}

export function AckIndicator({ summary, className = '' }: AckIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!summary) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 ${className}`}>
        <div className="w-4 h-4 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-sm text-gray-400">Checking audio delivery...</span>
      </div>
    );
  }

  const totalParticipants = summary.ackedUsers.length + summary.missingUsers.length;
  const successRate = totalParticipants > 0 
    ? Math.round((summary.ackedUsers.length / totalParticipants) * 100) 
    : 0;

  const getStatusColor = () => {
    if (successRate === 100) return { text: 'text-green-500', bg: 'bg-green-500/20' };
    if (successRate >= 80) return { text: 'text-yellow-500', bg: 'bg-yellow-500/20' };
    return { text: 'text-red-500', bg: 'bg-red-500/20' };
  };

  const { text, bg } = getStatusColor();

  return (
    <div className={`rounded-lg ${bg} ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Check className={`w-4 h-4 ${text}`} />
          <div className="flex flex-col items-start">
            <span className={`text-sm font-medium ${text}`}>
              {summary.ackedUsers.length}/{totalParticipants} hearing you
            </span>
            <span className="text-xs text-gray-400">{successRate}% delivery</span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-600/50 pt-2 mt-1">
          {summary.ackedUsers.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Connected:</div>
              {summary.ackedUsers.map((userId) => (
                <div key={userId} className="flex items-center gap-2 text-sm">
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-gray-300">{userId}</span>
                </div>
              ))}
            </div>
          )}

          {summary.missingUsers.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Issues:</div>
              {summary.missingUsers.map((userId) => (
                <div key={userId} className="flex items-center gap-2 text-sm">
                  <X className="w-3 h-3 text-red-500" />
                  <span className="text-gray-300">{userId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

