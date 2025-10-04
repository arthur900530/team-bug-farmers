import React from 'react';
import { Mic, Volume2, Settings, Monitor } from 'lucide-react';

interface AudioSettingsProps {
  showFullSettings?: boolean;
  onNavigateToSettings?: () => void;
  onNavigateToScreenShare?: () => void;
  onClose: () => void;
}

export function AudioSettings({ showFullSettings = false, onNavigateToSettings, onNavigateToScreenShare, onClose }: AudioSettingsProps) {
  if (showFullSettings) {
    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl">Audio Settings</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
          </div>

          <div className="space-y-6">
            {/* Microphone Settings */}
            <div>
              <h3 className="text-lg mb-4 flex items-center">
                <Mic className="w-5 h-5 mr-2" />
                Microphone
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Microphone Device</label>
                  <select className="w-full border rounded px-3 py-2">
                    <option>MacBook Pro Microphone</option>
                    <option>External Microphone</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Input Volume</label>
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-4 h-4" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-full"></div>
                    </div>
                    <span className="text-sm">Max</span>
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

            {/* Speaker Settings */}
            <div>
              <h3 className="text-lg mb-4 flex items-center">
                <Volume2 className="w-5 h-5 mr-2" />
                Speaker
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Speaker Device</label>
                  <select className="w-full border rounded px-3 py-2">
                    <option>MacBook Pro Speakers</option>
                    <option>External Speakers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Output Volume</label>
                  <div className="flex items-center space-x-3">
                    <Volume2 className="w-4 h-4" />
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-3/4"></div>
                    </div>
                    <span className="text-sm">75%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button 
                onClick={onNavigateToScreenShare}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-500"
              >
                Configure Screen Sharing
              </button>
              <button 
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Audio menu dropdown - positioned above the toolbar
  return (
    <div className="fixed bottom-24 left-4 sm:left-8 md:left-16 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-2 min-w-64 z-[60]">
      <div className="space-y-1">
        <button 
          className="w-full text-left text-white text-sm px-3 py-2 hover:bg-gray-700 rounded flex items-center transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Could add microphone level test functionality here
          }}
        >
          <div className="w-4 h-4 mr-3 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          Microphone level
        </button>
        
        <button 
          className="w-full text-left text-white text-sm px-3 py-2 hover:bg-gray-700 rounded flex items-center transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Could add speaker test functionality here
          }}
        >
          <Volume2 className="w-4 h-4 mr-3" />
          Test speaker
        </button>

        <div className="border-t border-gray-600 my-1"></div>
        
        <div className="text-gray-400 text-xs px-3 py-1">Microphone</div>
        <button 
          className="w-full text-left text-white text-sm px-3 py-1 hover:bg-gray-700 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Could add microphone selection functionality here
          }}
        >
          MacBook Pro Microphone
        </button>

        <div className="text-gray-400 text-xs px-3 py-1 mt-2">Speaker</div>
        <button 
          className="w-full text-left text-white text-sm px-3 py-1 hover:bg-gray-700 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            // Could add speaker selection functionality here
          }}
        >
          MacBook Pro Speakers
        </button>

        <div className="border-t border-gray-600 my-1"></div>
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (onNavigateToSettings) {
              onNavigateToSettings();
            }
          }}
          className="w-full text-left text-white text-sm px-3 py-2 hover:bg-gray-700 rounded transition-colors"
        >
          More settings...
        </button>
      </div>
    </div>
  );
}
