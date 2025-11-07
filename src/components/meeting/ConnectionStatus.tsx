import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '../../types';

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ state, className = '' }: ConnectionStatusProps) {
  const getStatusInfo = () => {
    switch (state) {
      case 'Disconnected':
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bg: 'bg-gray-500/20',
          label: 'Disconnected',
          showSpinner: false
        };
      case 'Connecting':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/20',
          label: 'Connecting...',
          showSpinner: true
        };
      case 'Signaling':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/20',
          label: 'Establishing connection...',
          showSpinner: true
        };
      case 'Offering':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/20',
          label: 'Negotiating...',
          showSpinner: true
        };
      case 'ICE_Gathering':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/20',
          label: 'Finding best route...',
          showSpinner: true
        };
      case 'Waiting_Answer':
        return {
          icon: Loader2,
          color: 'text-blue-500',
          bg: 'bg-blue-500/20',
          label: 'Waiting for response...',
          showSpinner: true
        };
      case 'Connected':
        return {
          icon: CheckCircle,
          color: 'text-green-500',
          bg: 'bg-green-500/20',
          label: 'Connected',
          showSpinner: false
        };
      case 'Streaming':
        return {
          icon: Wifi,
          color: 'text-green-500',
          bg: 'bg-green-500/20',
          label: 'Streaming',
          showSpinner: false
        };
      case 'Degraded':
        return {
          icon: AlertCircle,
          color: 'text-yellow-500',
          bg: 'bg-yellow-500/20',
          label: 'Poor Connection',
          showSpinner: false
        };
      case 'Reconnecting':
        return {
          icon: Loader2,
          color: 'text-orange-500',
          bg: 'bg-orange-500/20',
          label: 'Reconnecting...',
          showSpinner: true
        };
      case 'Disconnecting':
        return {
          icon: Loader2,
          color: 'text-gray-500',
          bg: 'bg-gray-500/20',
          label: 'Disconnecting...',
          showSpinner: true
        };
    }
  };

  const { icon: Icon, color, bg, label, showSpinner } = getStatusInfo();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bg} ${className}`}>
      <Icon
        className={`w-4 h-4 ${color} ${showSpinner ? 'animate-spin' : ''}`}
      />
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  );
}

