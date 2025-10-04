import React from 'react';
import { Monitor, Smartphone, Settings, Check, X } from 'lucide-react';

interface ScreenShareSettingsProps {
  onClose: () => void;
}

export function ScreenShareSettings({ onClose }: ScreenShareSettingsProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg md:rounded-lg w-full md:w-[500px] max-h-[90vh] md:max-h-[80vh] overflow-y-auto shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gray-50">
          <h2 className="text-xl">Screen Sharing Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          {/* Permission Settings */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              Screen Sharing Permissions
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm">Screen Recording</span>
                </div>
                <span className="text-xs text-green-600">Allowed</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm">Camera Access</span>
                </div>
                <span className="text-xs text-green-600">Allowed</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-center">
                  <Check className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm">Microphone Access</span>
                </div>
                <span className="text-xs text-green-600">Allowed</span>
              </div>
            </div>
          </div>

          {/* Sharing Options */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Sharing Options
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span className="text-sm">Enable screen sharing</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span className="text-sm">Allow participants to share screen</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-sm">Enable remote control</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span className="text-sm">Optimize for video clip sharing</span>
              </label>
            </div>
          </div>

          {/* Quality Settings */}
          <div>
            <h3 className="text-lg mb-4">Quality Settings</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Screen Share Quality</label>
                <select className="w-full border rounded px-3 py-2 bg-white">
                  <option>Auto (Recommended)</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Frame Rate</label>
                <select className="w-full border rounded px-3 py-2 bg-white">
                  <option>Auto</option>
                  <option>30 fps</option>
                  <option>15 fps</option>
                  <option>5 fps</option>
                </select>
              </div>
            </div>
          </div>

          {/* Mobile Device Settings */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Mobile Device Sharing
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-3" />
                <span className="text-sm">Allow mobile screen sharing</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="mr-3" />
                <span className="text-sm">Enable audio sharing from mobile</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse md:flex-row space-y-reverse space-y-3 md:space-y-0 md:space-x-3 pt-4">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
