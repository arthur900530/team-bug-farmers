import React, { useState } from 'react';
import { Video } from 'lucide-react';
import { FormSelect } from '../common/FormSelect';

interface VideoDevice {
  value: string;
  label: string;
  disabled?: boolean;
}

interface VideoSettingsSectionProps {
  selectedCamera?: string;
  onCameraChange?: (value: string) => void;
}

export function VideoSettingsSection({
  selectedCamera = 'macbook-camera',
  onCameraChange
}: VideoSettingsSectionProps) {
  const [cameraError, setCameraError] = useState<string>('');
  const [autoStartVideo, setAutoStartVideo] = useState(false);
  const [hdVideo, setHdVideo] = useState(true);

  const cameraDevices: VideoDevice[] = [
    { value: 'macbook-camera', label: 'MacBook Pro Camera' },
    { value: 'external-camera', label: 'External Camera' },
    { value: 'usb-camera', label: 'USB Webcam' },
  ];

  const handleCameraChange = (value: string) => {
    try {
      setCameraError('');
      if (!value) {
        throw new Error('Please select a valid camera');
      }
      if (onCameraChange) {
        onCameraChange(value);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change camera';
      setCameraError(errorMessage);
      console.error('Camera change error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 mb-4">
        <Video className="w-5 h-5" />
        Video
      </h3>
      
      <div className="space-y-3">
        <FormSelect
          label="Camera"
          value={selectedCamera}
          options={cameraDevices}
          onChange={handleCameraChange}
          error={cameraError}
        />

        <div className="space-y-3">
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input 
              type="checkbox" 
              checked={autoStartVideo}
              onChange={(e) => setAutoStartVideo(e.target.checked)}
              className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
            />
            <span>Turn on my video when joining a meeting</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input 
              type="checkbox" 
              checked={hdVideo}
              onChange={(e) => setHdVideo(e.target.checked)}
              className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
            />
            <span>HD video</span>
          </label>
        </div>
      </div>
    </div>
  );
}
