import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users, 
  MessageSquare, 
  Heart, 
  Share, 
  Shield, 
  Info, 
  MoreHorizontal, 
  X,
  ChevronUp,
  Lock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface MeetingToolbarProps {
  micMuted: boolean;
  micLocked: boolean;
  cameraOn: boolean;
  onMicToggle: () => void;
  onMicSettings: () => void;
}

export function MeetingToolbar({ 
  micMuted, 
  micLocked, 
  cameraOn, 
  onMicToggle, 
  onMicSettings 
}: MeetingToolbarProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleMicToggle = () => {
    try {
      onMicToggle();
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  };

  const handleMicSettings = () => {
    try {
      onMicSettings();
    } catch (error) {
      console.error('Error opening mic settings:', error);
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-800 px-4 py-3 z-20">
      <div className="flex items-center justify-between">
        {/* Left Controls - Microphone and Video */}
        <div className="flex items-center gap-4">
          {/* Microphone */}
          <div className="flex items-center">
            <button
              onClick={handleMicToggle}
              className={`relative rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 ${
                micMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {micMuted ? (
                <MicOff className="w-6 h-6 text-white" />
              ) : (
                <Mic className="w-6 h-6 text-white" />
              )}
              {micLocked && (
                <Lock className="w-4 h-4 text-white absolute -top-1 -right-1 bg-gray-700 rounded-full p-1" data-testid="mic-lock-icon" />
              )}
            </button>
            <button
              onClick={handleMicSettings}
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white"
              aria-label="Microphone settings"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="text-white hidden sm:block">
            <div>Audio</div>
            <div className="text-gray-400">{micMuted ? 'Muted' : 'Unmuted'}</div>
          </div>

          {/* Video */}
          <div className="flex items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95"
              aria-label="Start video"
            >
              <VideoOff className="w-6 h-6 text-white" />
            </button>
            <button className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white" aria-label="Video settings">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="text-white hidden sm:block">
            <div>Video</div>
            <div className="text-gray-400">{cameraOn ? 'On' : 'Off'}</div>
          </div>
        </div>

        {/* Center Controls */}
        <div className="flex items-center gap-6">
          {/* Share Screen */}
          <div className="flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-green-600 hover:bg-green-500 hover:scale-105 active:scale-95"
              aria-label="Share screen"
            >
              <Share className="w-6 h-6 text-white" />
            </button>
            <button className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white mt-1 hidden sm:block">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-white mt-1 hidden sm:block">Share</span>
          </div>

          {/* Participants - Hidden on small screens */}
          <div className="hidden md:flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95 relative"
              aria-label="View participants"
            >
              <Users className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                1
              </span>
            </button>
            <button className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white mt-1">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-white mt-1">Participants</span>
          </div>

          {/* Chat - Hidden on small screens */}
          <div className="hidden md:flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95"
              aria-label="Open chat"
            >
              <MessageSquare className="w-6 h-6 text-white" />
            </button>
            <button className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white mt-1">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-white mt-1">Chat</span>
          </div>

          {/* React - Hidden on medium and small screens */}
          <div className="hidden lg:flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95"
              aria-label="Send reaction"
            >
              <Heart className="w-6 h-6 text-white" />
            </button>
            <button className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 p-1 rounded hover:bg-gray-700 text-white mt-1">
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-white mt-1">React</span>
          </div>

          {/* Host Tools - Hidden on medium and small screens */}
          <div className="hidden lg:flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95"
              aria-label="Host tools"
            >
              <Shield className="w-6 h-6 text-white" />
            </button>
            <span className="text-white mt-1">Host tools</span>
          </div>

          {/* Meeting Info - Hidden on medium and small screens */}
          <div className="hidden lg:flex flex-col items-center">
            <button 
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95"
              aria-label="Meeting info"
            >
              <Info className="w-6 h-6 text-white" />
            </button>
            <span className="text-white mt-1">Meeting info</span>
          </div>

          {/* More Menu */}
          <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
            <DropdownMenuTrigger asChild>
              <div className="flex flex-col items-center cursor-pointer">
                <button 
                  className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-gray-600 hover:bg-gray-500 hover:scale-105 active:scale-95"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-6 h-6 text-white" />
                </button>
                <span className="text-white mt-1 hidden sm:block">More</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-700 text-white border-gray-600 mb-2">
              <DropdownMenuItem className="md:hidden hover:bg-gray-600 focus:bg-gray-600 cursor-pointer transition-colors">
                <Users className="w-4 h-4 mr-2" />
                Participants
              </DropdownMenuItem>
              <DropdownMenuItem className="md:hidden hover:bg-gray-600 focus:bg-gray-600 cursor-pointer transition-colors">
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600 cursor-pointer transition-colors">
                <Heart className="w-4 h-4 mr-2" />
                React
              </DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600 cursor-pointer transition-colors">
                <Shield className="w-4 h-4 mr-2" />
                Host tools
              </DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600 cursor-pointer transition-colors">
                <Info className="w-4 h-4 mr-2" />
                Meeting info
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right Controls - End Meeting */}
        <div className="flex items-center">
          <button 
            className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 hover:scale-105 active:scale-95"
            aria-label="End meeting"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <span className="text-white ml-2 hidden sm:inline">End</span>
        </div>
      </div>
    </div>
  );
}
