import React, { useState, useRef, useEffect, useCallback, ReactNode } from 'react';

interface DraggableModalProps {
  children: ReactNode;
  onClose?: () => void;
  width?: string;
  className?: string;
}

export function DraggableModal({ 
  children, 
  onClose, 
  width = 'w-full md:w-[600px]',
  className = ''
}: DraggableModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const checkMobile = () => {
      try {
        setIsMobile(window.innerWidth < 768);
      } catch (error) {
        console.error('Error checking mobile state:', error);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    try {
      if (!modalRef.current) return;

      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;

      const modalRect = modalRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - modalRect.width;
      const maxY = window.innerHeight - modalRect.height;

      setPosition({
        x: Math.max(-modalRect.width / 2, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    } catch (error) {
      console.error('Error in mouse move handler:', error);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    try {
      setIsDragging(false);
    } catch (error) {
      console.error('Error in mouse up handler:', error);
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
      if (isMobile) return;
      
      const target = e.target as HTMLElement;
      const header = target.closest('[data-drag-handle]');
      if (!header) return;

      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    } catch (error) {
      console.error('Error in mouse down handler:', error);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    try {
      if (e.target === e.currentTarget && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error in backdrop click handler:', error);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center" 
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-white rounded-lg shadow-2xl max-h-[90vh] flex flex-col ${width} mx-4 ${className}`}
        style={!isMobile ? {
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        } : {}}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}
