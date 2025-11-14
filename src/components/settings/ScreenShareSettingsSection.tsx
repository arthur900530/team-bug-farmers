import { useState } from 'react';
import { Monitor } from 'lucide-react';

export function ScreenShareSettingsSection() {
  const [enableSharing, setEnableSharing] = useState(true);
  const [optimizeVideo, setOptimizeVideo] = useState(false);
  const [showBorder, setShowBorder] = useState(true);

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 mb-4">
        <Monitor className="w-5 h-5" />
        Share Screen
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
            checked={optimizeVideo}
            onChange={(e) => setOptimizeVideo(e.target.checked)}
            className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
          />
          <span>Optimize screen share for video clip</span>
        </label>
        
        <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input 
            type="checkbox" 
            checked={showBorder}
            onChange={(e) => setShowBorder(e.target.checked)}
            className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
          />
          <span>Show green border when sharing</span>
        </label>
      </div>
    </div>
  );
}
