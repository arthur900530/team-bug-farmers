import React from 'react';

interface WindowControlsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  showDots?: boolean;
}

export function WindowControls({ 
  onClose, 
  onMinimize, 
  onMaximize,
  showDots = true 
}: WindowControlsProps) {
  const handleClose = () => {
    try {
      if (onClose) onClose();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  const handleMinimize = () => {
    try {
      if (onMinimize) onMinimize();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  const handleMaximize = () => {
    try {
      if (onMaximize) onMaximize();
    } catch (error) {
      console.error('Error maximizing window:', error);
    }
  };

  if (!showDots) return null;

  return (
    <div className="flex gap-2">
      <div 
        className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 cursor-pointer" 
        onClick={handleClose}
        role="button"
        aria-label="Close window"
      />
      <div 
        className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 cursor-pointer" 
        onClick={handleMinimize}
        role="button"
        aria-label="Minimize window"
      />
      <div 
        className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 cursor-pointer" 
        onClick={handleMaximize}
        role="button"
        aria-label="Maximize window"
      />
    </div>
  );
}
