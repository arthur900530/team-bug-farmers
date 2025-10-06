import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Volume2 } from 'lucide-react';

interface AudioSettingsProps {
  showFullSettings?: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToScreenShare?: () => void;
  onClose: () => void;
}

export function AudioSettings({ 
  onNavigateToSettings, 
  onClose 
}: AudioSettingsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (popupRef.current && !initialized) {
      try {
        const rect = popupRef.current.getBoundingClientRect();
        const centerX = (window.innerWidth - rect.width) / 2 - rect.left;
        const centerY = (window.innerHeight - rect.height) / 2 - rect.top;
        setPosition({ x: centerX, y: centerY });
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing popup position:', error);
      }
    }
  }, [initialized]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    try {
      if (!popupRef.current) return;

      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;

      const rect = popupRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    } catch (error) {
      console.error('Error during drag:', error);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    try {
      setIsDragging(false);
    } catch (error) {
      console.error('Error ending drag:', error);
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent) => {
    try {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    } catch (error) {
      console.error('Error starting drag:', error);
    }
  };

  const handleMoreSettings = (e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      if (onNavigateToSettings) {
        onNavigateToSettings();
      }
    } catch (error) {
      console.error('Error navigating to settings:', error);
    }
  };

  return (
    <div 
      ref={popupRef}
      className="absolute bg-gray-800 text-white rounded-lg shadow-xl p-4 min-w-[300px] z-[60] cursor-grab active:cursor-grabbing"
      style={{
        transform: initialized ? `translate(${position.x}px, ${position.y}px)` : 'translate(0, 0)',
        position: 'fixed',
        bottom: '6rem',
        left: '1rem',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        visibility: initialized ? 'visible' : 'hidden',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="space-y-1">
        <button 
          className="flex items-center justify-between py-2 hover:bg-gray-700 px-3 rounded cursor-pointer transition-colors w-full"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Testing microphone level...');
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
            <span>Microphone level</span>
          </div>
        </button>
        
        <button 
          className="flex items-center justify-between py-2 hover:bg-gray-700 px-3 rounded cursor-pointer transition-colors w-full"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Testing speaker...');
          }}
        >
          <div className="flex items-center gap-3 flex-1">
            <Volume2 className="w-4 h-4" />
            <span>Test speaker</span>
          </div>
        </button>

        <div className="border-t border-gray-600 my-1" />
        
        <div className="text-gray-400 px-3 py-1">Microphone</div>
        <button 
          className="flex items-center justify-between py-2 hover:bg-gray-700 px-3 rounded cursor-pointer transition-colors w-full"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Selecting microphone...');
          }}
        >
          <span className="flex-1 text-left">MacBook Pro Microphone</span>
        </button>

        <div className="text-gray-400 px-3 py-1 mt-2">Speaker</div>
        <button 
          className="flex items-center justify-between py-2 hover:bg-gray-700 px-3 rounded cursor-pointer transition-colors w-full"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Selecting speaker...');
          }}
        >
          <span className="flex-1 text-left">MacBook Pro Speakers</span>
        </button>

        <div className="border-t border-gray-600 my-1" />
        
        <button 
          onClick={handleMoreSettings}
          className="flex items-center justify-between py-2 hover:bg-gray-700 px-3 rounded cursor-pointer transition-colors w-full"
        >
          <span className="flex-1 text-left">More settings...</span>
        </button>
      </div>
    </div>
  );
}
