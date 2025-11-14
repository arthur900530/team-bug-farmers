import { useState } from 'react';
import { Monitor, Smartphone, Settings, Check, X } from 'lucide-react';
import { DraggableModal } from './common/DraggableModal';
import { WindowControls } from './common/WindowControls';
import { FormSelect } from './common/FormSelect';

interface ScreenShareSettingsProps {
  onClose: () => void;
}

export function ScreenShareSettings({ onClose }: ScreenShareSettingsProps) {
  const [enableSharing, setEnableSharing] = useState(true);
  const [allowParticipants, setAllowParticipants] = useState(true);
  const [remoteControl, setRemoteControl] = useState(false);
  const [optimizeVideo, setOptimizeVideo] = useState(true);
  const [allowMobileSharing, setAllowMobileSharing] = useState(true);
  const [mobileAudio, setMobileAudio] = useState(false);
  const [qualityError, setQualityError] = useState<string>('');

  const [quality, setQuality] = useState('auto');
  const [frameRate, setFrameRate] = useState('auto');

  const qualityOptions = [
    { value: 'auto', label: 'Auto (Recommended)' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const frameRateOptions = [
    { value: 'auto', label: 'Auto' },
    { value: '30', label: '30 fps' },
    { value: '15', label: '15 fps' },
    { value: '5', label: '5 fps' },
  ];

  const handleSave = () => {
    try {
      console.log('Screen sharing settings saved');
      onClose();
    } catch (error) {
      console.error('Error saving screen share settings:', error);
    }
  };

  const handleCancel = () => {
    try {
      onClose();
    } catch (error) {
      console.error('Error canceling settings:', error);
    }
  };

  const handleQualityChange = (value: string) => {
    try {
      setQualityError('');
      setQuality(value);
      console.log('Quality changed to:', value);
    } catch (error) {
      setQualityError('Failed to change quality setting');
      console.error('Error changing quality:', error);
    }
  };

  const handleFrameRateChange = (value: string) => {
    try {
      setFrameRate(value);
      console.log('Frame rate changed to:', value);
    } catch (error) {
      console.error('Error changing frame rate:', error);
    }
  };

  return (
    <DraggableModal onClose={onClose} width="w-full md:w-[500px]">
      {/* Header - Sticky */}
      <div className="flex items-center justify-between p-6 border-b bg-gray-50 cursor-move select-none transition-colors hover:bg-gray-100 rounded-t-lg" data-drag-handle>
        <div className="flex items-center gap-2">
          <div className="hidden md:block">
            <WindowControls showDots={true} />
          </div>
          <h2>Screen Sharing Settings</h2>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Permission Settings */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 mb-4">
            <Monitor className="w-5 h-5" />
            Screen Sharing Permissions
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span>Screen Recording</span>
              </div>
              <span className="text-green-600">Allowed</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span>Camera Access</span>
              </div>
              <span className="text-green-600">Allowed</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span>Microphone Access</span>
              </div>
              <span className="text-green-600">Allowed</span>
            </div>
          </div>
        </div>

        {/* Sharing Options */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5" />
            Sharing Options
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={enableSharing}
                onChange={(e) => setEnableSharing(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Enable screen sharing</span>
            </label>
            
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={allowParticipants}
                onChange={(e) => setAllowParticipants(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Allow participants to share screen</span>
            </label>
            
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={remoteControl}
                onChange={(e) => setRemoteControl(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Enable remote control</span>
            </label>
            
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={optimizeVideo}
                onChange={(e) => setOptimizeVideo(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Optimize for video clip sharing</span>
            </label>
          </div>
        </div>

        {/* Quality Settings */}
        <div className="space-y-4">
          <h3>Quality Settings</h3>
          
          <div className="space-y-3">
            <FormSelect
              label="Screen Share Quality"
              value={quality}
              options={qualityOptions}
              onChange={handleQualityChange}
              error={qualityError}
            />

            <FormSelect
              label="Frame Rate"
              value={frameRate}
              options={frameRateOptions}
              onChange={handleFrameRateChange}
            />
          </div>
        </div>

        {/* Mobile Device Settings */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5" />
            Mobile Device Sharing
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={allowMobileSharing}
                onChange={(e) => setAllowMobileSharing(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Allow mobile screen sharing</span>
            </label>
            
            <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
              <input 
                type="checkbox" 
                checked={mobileAudio}
                onChange={(e) => setMobileAudio(e.target.checked)}
                className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
              />
              <span>Enable audio sharing from mobile</span>
            </label>
          </div>
        </div>
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
          Save Settings
        </button>
      </div>
    </DraggableModal>
  );
}
