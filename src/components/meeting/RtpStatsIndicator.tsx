/**
 * RtpStatsIndicator - Real-time audio delivery feedback
 * 
 * Shows connection quality stats in user-friendly terms
 * Updates every 5 seconds based on reporting interval
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';

export interface RtpStats {
  lossPct: number;
  jitterMs: number;
  rttMs: number;
  packetsSent: number;
  packetsReceived: number;
}

interface RtpStatsIndicatorProps {
  stats: RtpStats | null;
  className?: string;
}

export function RtpStatsIndicator({ stats, className = '' }: RtpStatsIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // No stats yet - show waiting state
  if (!stats) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/80 ${className}`}>
        <div className="w-3 h-3 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-gray-400 text-xs">Checking connection...</span>
      </div>
    );
  }

  // Color classes for each health status
  const colorClassesMap = {
    green: { bg: 'bg-green-900/30', text: 'text-green-400', dot: 'bg-green-500' },
    yellow: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
    red: { bg: 'bg-red-900/30', text: 'text-red-400', dot: 'bg-red-500' }
  } as const;

  type HealthColor = keyof typeof colorClassesMap;

  // Determine health status based on loss and jitter
  const getHealthStatus = (): { color: HealthColor; label: string; icon: typeof Wifi } => {
    if (stats.lossPct > 0.05 || stats.jitterMs > 50) {
      return { color: 'red', label: 'Poor', icon: WifiOff };
    }
    if (stats.lossPct > 0.01 || stats.jitterMs > 20) {
      return { color: 'yellow', label: 'Fair', icon: Wifi };
    }
    return { color: 'green', label: 'Good', icon: Wifi };
  };

  const health = getHealthStatus();
  const Icon = health.icon;
  const colorClasses = colorClassesMap[health.color];

  return (
    <div className={`rounded-lg ${colorClasses.bg} ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClasses.text}`} />
          <div className="flex flex-col items-start">
            <span className={`text-sm font-medium ${colorClasses.text}`}>
              Audio Delivery: {health.label}
            </span>
            <span className="text-xs text-gray-400">
              {(stats.lossPct * 100).toFixed(1)}% loss · {stats.rttMs.toFixed(0)}ms delay
            </span>
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
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-400">Data Loss</span>
              <span className={colorClasses.text}>{(stats.lossPct * 100).toFixed(2)}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400">Stability</span>
              <span className={colorClasses.text}>{stats.jitterMs.toFixed(1)}ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400">Delay</span>
              <span className={colorClasses.text}>{stats.rttMs.toFixed(0)}ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400">Sent</span>
              <span className="text-white">{stats.packetsSent.toLocaleString()}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-gray-400">Received</span>
              <span className="text-white">{stats.packetsReceived.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

