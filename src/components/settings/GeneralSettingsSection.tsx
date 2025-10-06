import React, { useState } from 'react';
import { Settings } from 'lucide-react';

export function GeneralSettingsSection() {
  const [autoStart, setAutoStart] = useState(true);
  const [dualMonitors, setDualMonitors] = useState(false);
  const [fullScreenShare, setFullScreenShare] = useState(true);

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5" />
        General
      </h3>
      
      <div className="space-y-3">
        <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input 
            type="checkbox" 
            checked={autoStart}
            onChange={(e) => setAutoStart(e.target.checked)}
            className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
          />
          <span>Start Zoom when I start Windows</span>
        </label>
        
        <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input 
            type="checkbox" 
            checked={dualMonitors}
            onChange={(e) => setDualMonitors(e.target.checked)}
            className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
          />
          <span>Use dual monitors</span>
        </label>
        
        <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
          <input 
            type="checkbox" 
            checked={fullScreenShare}
            onChange={(e) => setFullScreenShare(e.target.checked)}
            className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
          />
          <span>Enter full screen when a participant shares screen</span>
        </label>
      </div>
    </div>
  );
}
