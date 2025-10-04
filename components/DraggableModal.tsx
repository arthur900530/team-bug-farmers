import React, { useState, useRef, useEffect } from 'react';

interface DraggableModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export function DraggableModal({ children, onClose }: DraggableModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header
    const target = e.target as HTMLElement;
    if (!target.closest('[data-drag-handle]')) return;

    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartPos.current.x;
    const newY = e.clientY - dragStartPos.current.y;

    // Boundary checking
    if (modalRef.current) {
      const modalRect = modalRef.current.getBoundingClientRect();
      const maxX = window.innerWidth - modalRect.width;
      const maxY = window.innerHeight - modalRect.height;

      setPosition({
        x: Math.max(-modalRect.width / 2, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position]);

  // Mobile fullscreen style
  if (isMobile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end md:items-center justify-center z-50">
        <div className="bg-white rounded-t-lg md:rounded-lg w-full md:w-auto max-h-[90vh] md:max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  // Desktop draggable style
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-2xl"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        onMouseDown={handleMouseDown}
      >
        {children}
      </div>
    </div>
  );
}
