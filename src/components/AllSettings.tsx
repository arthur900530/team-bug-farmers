import React from 'react';
import { X } from 'lucide-react';
import { DraggableModal } from './common/DraggableModal';
import { WindowControls } from './common/WindowControls';
import { AudioSettingsSection } from './settings/AudioSettingsSection';
import { VideoSettingsSection } from './settings/VideoSettingsSection';
import { ScreenShareSettingsSection } from './settings/ScreenShareSettingsSection';
import { GeneralSettingsSection } from './settings/GeneralSettingsSection';

interface AllSettingsProps {
  onClose: () => void;
  onNavigateToScreenShare?: () => void;
}

export function AllSettings({ onClose, onNavigateToScreenShare }: AllSettingsProps) {
  const handleSave = () => {
    try {
      console.log('Settings saved');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleCancel = () => {
    try {
      onClose();
    } catch (error) {
      console.error('Error canceling settings:', error);
    }
  };

  return (
    <DraggableModal onClose={onClose} width="w-full md:w-[600px]">
      {/* Header - Draggable & Sticky */}
      <div className="flex items-center justify-between p-6 border-b bg-gray-50 cursor-move select-none transition-colors hover:bg-gray-100 rounded-t-lg" data-drag-handle>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <WindowControls showDots={true} />
          </div>
          <h2>Settings</h2>
        </div>
        <button 
          onClick={handleCancel}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded p-1 transition-all"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <AudioSettingsSection />
        <VideoSettingsSection />
        <ScreenShareSettingsSection />
        <GeneralSettingsSection />
      </div>

      {/* Footer - Sticky */}
      <div className="flex justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
        <button 
          onClick={handleCancel}
          className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 hover:shadow-md active:bg-gray-400 focus:ring-gray-400"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md active:bg-blue-700 focus:ring-blue-500"
        >
          Save
        </button>
      </div>
    </DraggableModal>
  );
}
