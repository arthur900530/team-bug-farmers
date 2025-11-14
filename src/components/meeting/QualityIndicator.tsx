import { SignalHigh, SignalLow, SignalMedium } from 'lucide-react';
import type { QualityTier } from '../../types';

interface QualityIndicatorProps {
  tier: QualityTier;
  className?: string;
}

export function QualityIndicator({ tier, className = '' }: QualityIndicatorProps) {
  const getQualityInfo = () => {
    switch (tier) {
      case 'HIGH':
        return {
          icon: SignalHigh,
          color: 'text-green-500',
          bg: 'bg-green-500/20',
          label: 'High Quality',
          bitrate: '64 kbps'
        };
      case 'MEDIUM':
        return {
          icon: SignalMedium,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/20',
          label: 'Medium Quality',
          bitrate: '32 kbps'
        };
      case 'LOW':
        return {
          icon: SignalLow,
          color: 'text-orange-500',
          bg: 'bg-orange-500/20',
          label: 'Low Quality',
          bitrate: '16 kbps'
        };
    }
  };

  const { icon: Icon, color, bg, label, bitrate } = getQualityInfo();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg} ${className}`}>
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${color}`}>{label}</span>
        <span className="text-xs text-gray-400">{bitrate}</span>
      </div>
    </div>
  );
}

