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
} from './ui/dropdown-menu';

interface MeetingViewProps {
  micMuted: boolean;
  micLocked: boolean;
  showBanner: boolean;
  cameraOn: boolean;
  onMicToggle: () => void;
  onMicSettings: () => void;
}

export function MeetingView({ micMuted, micLocked, showBanner, cameraOn, onMicToggle, onMicSettings }: MeetingViewProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  return (
    <div className="absolute inset-0 bg-black">
      {/* Window Controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 bg-gray-800 z-10">
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="bg-green-500 w-2 h-2 rounded-full"></div>
          <span className="text-white text-sm">View</span>
          <button className="text-white">▣</button>
        </div>
      </div>

      {/* Banner for headphone notification */}
      {showBanner && (
        <div className="absolute top-12 left-0 right-0 bg-blue-600 text-white px-4 py-2 text-center z-10">
          <span className="text-sm">You have been unmuted due to external headphones</span>
        </div>
      )}

      {/* Main Video Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl mb-4">ntrappe@andrew.cmu.edu</div>
        </div>

        {/* Participant Name in Bottom Left */}
        <div className="absolute bottom-24 left-4 text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          ntrappe@andrew.cmu.edu
        </div>
      </div>

      {/* Bottom Controls - Fixed to bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 px-2 sm:px-4 py-3 z-20">
        <div className="flex items-center justify-between">
          {/* Left Controls - Always visible */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Microphone */}
            <div className="flex items-center">
              <button
                onClick={onMicToggle}
                className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                  micMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {micMuted ? (
                  <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                ) : (
                  <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
                {micLocked && (
                  <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white absolute -top-1 -right-1 bg-gray-700 rounded-full p-0.5 sm:p-1" />
                )}
              </button>
              <button
                onClick={onMicSettings}
                className="ml-1 text-white hover:bg-gray-700 p-1 rounded"
              >
                <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="text-white text-xs sm:text-sm hidden sm:block">
              <div>Audio</div>
              <div className="text-xs text-gray-400">{micMuted ? 'Muted' : 'Unmuted'}</div>
            </div>

            {/* Video */}
            <div className="flex items-center">
              <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center">
                <VideoOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button className="ml-1 text-white hover:bg-gray-700 p-1 rounded">
                <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="text-white text-xs sm:text-sm hidden sm:block">
              <div>Video</div>
              <div className="text-xs text-gray-400">{cameraOn ? 'On' : 'Off'}</div>
            </div>
          </div>

          {/* Center Controls - Responsive */}
          <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
            {/* Share - Always visible */}
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center">
                <Share className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
              <button className="mt-1 text-white hover:bg-gray-700 p-1 rounded hidden sm:block">
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-white text-xs sm:text-sm mt-1 hidden sm:block">Share</span>
            </div>

            {/* Participants - Hidden on small screens */}
            <div className="hidden md:flex flex-col items-center">
              <button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center relative">
                <Users className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">1</span>
              </button>
              <button className="mt-1 text-white hover:bg-gray-700 p-1 rounded">
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-white text-sm mt-1">Participants</span>
            </div>

            {/* Chat - Hidden on small screens */}
            <div className="hidden md:flex flex-col items-center">
              <button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </button>
              <button className="mt-1 text-white hover:bg-gray-700 p-1 rounded">
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-white text-sm mt-1">Chat</span>
            </div>

            {/* React - Hidden on medium and small screens */}
            <div className="hidden lg:flex flex-col items-center">
              <button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </button>
              <button className="mt-1 text-white hover:bg-gray-700 p-1 rounded">
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-white text-sm mt-1">React</span>
            </div>

            {/* Host Tools - Hidden on medium and small screens */}
            <div className="hidden lg:flex flex-col items-center">
              <button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </button>
              <span className="text-white text-sm mt-1">Host tools</span>
            </div>

            {/* Meeting Info - Hidden on medium and small screens */}
            <div className="hidden lg:flex flex-col items-center">
              <button className="w-12 h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center">
                <Info className="w-6 h-6 text-white" />
              </button>
              <span className="text-white text-sm mt-1">Meeting info</span>
            </div>

            {/* More - Contains hidden items on smaller screens */}
            <DropdownMenu open={showMoreMenu} onOpenChange={setShowMoreMenu}>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-col items-center cursor-pointer">
                  <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-600 hover:bg-gray-500 flex items-center justify-center">
                    <MoreHorizontal className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </button>
                  <span className="text-white text-xs sm:text-sm mt-1 hidden sm:block">More</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-700 text-white border-gray-600 mb-2">
                {/* Show these items only when hidden on small screens */}
                <DropdownMenuItem className="md:hidden hover:bg-gray-600 focus:bg-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  Participants
                </DropdownMenuItem>
                <DropdownMenuItem className="md:hidden hover:bg-gray-600 focus:bg-gray-600">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </DropdownMenuItem>
                <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600">
                  <Heart className="w-4 h-4 mr-2" />
                  React
                </DropdownMenuItem>
                <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600">
                  <Shield className="w-4 h-4 mr-2" />
                  Host tools
                </DropdownMenuItem>
                <DropdownMenuItem className="lg:hidden hover:bg-gray-600 focus:bg-gray-600">
                  <Info className="w-4 h-4 mr-2" />
                  Meeting info
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Controls - Always visible */}
          <div className="flex items-center">
            <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center">
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </button>
            <span className="text-white text-xs sm:text-sm ml-2 hidden sm:inline">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}
