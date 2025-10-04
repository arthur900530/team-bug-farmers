import React from 'react';
import { Mic, Volume2, Monitor, Video, Settings, X } from 'lucide-react';

interface AllSettingsProps {
  onClose: () => void;
  onNavigateToScreenShare?: () => void;
}

export function AllSettings({ onClose, onNavigateToScreenShare }: AllSettingsProps) {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg md:rounded-lg w-full md:w-[600px] max-h-[90vh] md:max-h-[80vh] overflow-y-auto shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gray-50">
          <h2 className="text-xl">Settings</h2>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 md:space-y-8">
          {/* Audio Section */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Mic className="w-5 h-5 mr-2" />
              Audio
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Microphone</label>
                <select className="w-full border rounded px-3 py-2 bg-white">
                  <option>MacBook Pro Microphone</option>
                  <option>External Microphone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Speaker</label>
                <select className="w-full border rounded px-3 py-2 bg-white">
                  <option>MacBook Pro Speakers</option>
                  <option>External Speakers</option>
                  <option>Headphones</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">Input Volume</label>
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-4 h-4" />
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
                  </div>
                  <span className="text-sm">75%</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Automatically adjust microphone volume</span>
                </label>
                
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">Suppress background noise</span>
                </label>
              </div>
            </div>
          </div>

          {/* Video Section */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Video className="w-5 h-5 mr-2" />
              Video
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2">Camera</label>
                <select className="w-full border rounded px-3 py-2 bg-white">
                  <option>MacBook Pro Camera</option>
                  <option>External Camera</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Turn on my video when joining a meeting</span>
                </label>
                
                <label className="flex items-center">
                  <input type="checkbox" defaultChecked className="mr-2" />
                  <span className="text-sm">HD video</span>
                </label>
              </div>
            </div>
          </div>

          {/* Share Screen Section */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              Share Screen
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Enable screen sharing</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Optimize screen share for video clip</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Show green border when sharing</span>
              </label>
            </div>
          </div>

          {/* General Section */}
          <div>
            <h3 className="text-lg mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              General
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Start Zoom when I start Windows</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Use dual monitors</span>
              </label>
              
              <label className="flex items-center">
                <input type="checkbox" defaultChecked className="mr-2" />
                <span className="text-sm">Enter full screen when a participant shares screen</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse md:flex-row justify-end space-y-reverse space-y-3 md:space-y-0 md:space-x-3 p-4 md:p-6 border-t bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
