import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, ChevronDown, User } from 'lucide-react';
import { WindowControls } from './common/WindowControls';

interface JoinMeetingModalProps {
  micOn: boolean;
  cameraOn: boolean;
  onJoin: (username: string) => void;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  defaultUsername?: string;
}

export function JoinMeetingModal({ 
  micOn, 
  cameraOn, 
  onJoin, 
  onMicToggle, 
  onCameraToggle,
  defaultUsername = ''
}: JoinMeetingModalProps) {
  const [username, setUsername] = useState<string>(defaultUsername);
  const [error, setError] = useState<string>('');

  const handleMicToggle = () => {
    try {
      onMicToggle();
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  };

  const handleCameraToggle = () => {
    try {
      onCameraToggle();
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  const handleJoin = () => {
    try {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        setError('Please enter your name');
        return;
      }
      if (trimmedUsername.length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }
      if (trimmedUsername.length > 30) {
        setError('Name must be less than 30 characters');
        return;
      }
      onJoin(trimmedUsername);
    } catch (error) {
      console.error('Error joining meeting:', error);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (error) setError('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-600 shadow-2xl">
        {/* Window Controls */}
        <div className="flex items-center justify-between mb-4">
          <WindowControls showDots={true} />
          <span className="text-gray-300">Join Meeting</span>
          <button 
            className="text-gray-400 hover:text-gray-200 hover:bg-gray-700 px-2 py-1 rounded transition-all"
            aria-label="More options"
          >
            ⋯
          </button>
        </div>

        {/* Username Input */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm mb-2 font-medium">
            Your Name
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={handleUsernameChange}
              placeholder="Enter your name"
              className={`w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded border ${
                error ? 'border-red-500' : 'border-gray-600'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
              maxLength={30}
              autoFocus
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs mt-1">{error}</p>
          )}
        </div>

        {/* Video Preview Area */}
        <div className="bg-black rounded-lg mb-6 h-48 flex items-center justify-center relative">
          <div className="text-center">
            <div className="text-white text-2xl mb-2">
              {username.trim() || 'Enter your name'}
            </div>
          </div>
        </div>

        {/* Audio/Video Controls */}
        <div className="flex items-center justify-center gap-8 mb-6">
          <div className="flex flex-col items-center">
            <button
              onClick={handleMicToggle}
              className={`rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 ${
                micOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
              }`}
              aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micOn ? (
                <Mic className="w-6 h-6 text-white" />
              ) : (
                <MicOff className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-gray-300 mt-1">Audio</span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={handleCameraToggle}
              className={`rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 ${
                cameraOn ? 'bg-gray-600 hover:bg-gray-500' : 'bg-red-600 hover:bg-red-500'
              }`}
              aria-label={cameraOn ? 'Stop video' : 'Start video'}
            >
              {cameraOn ? (
                <Video className="w-6 h-6 text-white" />
              ) : (
                <VideoOff className="w-6 h-6 text-white" />
              )}
            </button>
            <span className="text-gray-300 mt-1">Video</span>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoin}
          disabled={!username.trim()}
          className={`w-full rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 text-white text-lg ${
            username.trim()
              ? 'bg-blue-600 hover:bg-blue-500 hover:shadow-md active:bg-blue-700 focus:ring-blue-500 hover:shadow-lg cursor-pointer'
              : 'bg-gray-600 cursor-not-allowed opacity-50'
          }`}
        >
          Join Meeting
        </button>

        {/* Additional Options */}
        <div className="mt-4 flex items-center justify-between text-gray-400">
          <button className="hover:text-gray-200 flex items-center gap-1 transition-colors">
            <span>Audio Settings</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="hover:text-gray-200 flex items-center gap-1 transition-colors">
            <span>Video Settings</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
