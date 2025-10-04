import React from 'react';
import { Mic, MicOff, Video, VideoOff, ChevronDown } from 'lucide-react';

interface JoinMeetingModalProps {
  micOn: boolean;
  cameraOn: boolean;
  onJoin: () => void;
  onMicToggle: () => void;
  onCameraToggle: () => void;
}

export function JoinMeetingModal({ micOn, cameraOn, onJoin, onMicToggle, onCameraToggle }: JoinMeetingModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-600">
        {/* Window Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-gray-300 text-sm">ntrappe@andrew.cmu.edu's Zoom Meeting</span>
          <button className="text-gray-400">⋯</button>
        </div>

        {/* Video Preview Area */}
        <div className="bg-black rounded-lg mb-6 h-48 flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-white text-2xl mb-2">ntrappe@andrew...</div>
          </div>
        </div>

        {/* Audio/Video Controls */}
        <div className="flex items-center justify-center space-x-8 mb-6">
          <div className="flex flex-col items-center">
            <button
              onClick={onMicToggle}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {micOn ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-gray-300 text-sm mt-1">Audio</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={onCameraToggle}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                cameraOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {cameraOn ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-gray-300 text-sm mt-1">Video</span>
          </div>

          <div className="flex flex-col items-center">
            <button className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded text-white text-sm">
              Backgrounds
            </button>
          </div>
        </div>

        {/* Device Selection */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 text-gray-400">🎤</span>
            <select className="bg-gray-700 text-white rounded px-3 py-2 flex-1 text-sm">
              <option>MacBook Pro</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 text-gray-400">📹</span>
            <select className="bg-gray-700 text-white rounded px-3 py-2 flex-1 text-sm">
              <option>MacBook Pro Camera</option>
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Settings Checkbox */}
        <div className="flex items-center space-x-2 mb-6">
          <input type="checkbox" id="preview" defaultChecked className="rounded" />
          <label htmlFor="preview" className="text-gray-300 text-sm">
            Always show this preview when joining
          </label>
          <button className="text-gray-400 text-sm">ⓘ</button>
        </div>

        {/* Join Button */}
        <button
          onClick={onJoin}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded text-center"
        >
          Join
        </button>
      </div>
    </div>
  );
}