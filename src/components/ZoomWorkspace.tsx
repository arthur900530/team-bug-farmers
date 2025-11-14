import { Search, Home, Calendar, Users, FileText, MoreHorizontal, Bell, Settings } from 'lucide-react';

export function ZoomWorkspace() {
  return (
    <div className="h-full w-full bg-blue-900 relative">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-500 rounded"></div>
            <span className="text-white">zoom</span>
            <span className="text-gray-400">Workplace</span>
          </div>
          <div className="flex items-center space-x-1 bg-gray-700 rounded px-2 py-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search" 
              className="bg-transparent text-white placeholder-gray-400 outline-none text-sm"
            />
            <span className="text-xs text-gray-400">⌘F</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-1">
            <Home className="w-5 h-5" />
            <span className="text-sm">Home</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">Meetings</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-5 h-5" />
            <span className="text-sm">Workspaces</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-5 h-5" />
            <span className="text-sm">Scheduler</span>
          </div>
          <div className="flex items-center space-x-1">
            <FileText className="w-5 h-5" />
            <span className="text-sm">Whiteboards</span>
          </div>
          <MoreHorizontal className="w-5 h-5" />
        </div>
        
        <div className="flex items-center space-x-3">
          <Bell className="w-5 h-5" />
          <Settings className="w-5 h-5" />
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">N</span>
          </div>
        </div>
      </div>

      {/* Update Banner */}
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-blue-400 rounded-full flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
          <span className="text-sm">A new version of Zoom Workplace is available!</span>
          <button className="text-blue-200 underline text-sm">Update now</button>
        </div>
        <button className="text-blue-200">✕</button>
      </div>

      {/* Main Content Area */}
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-64 bg-gray-100 p-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 p-2">
              <div className="w-8 h-8 bg-orange-400 rounded-full"></div>
              <span className="text-sm">New Contact</span>
            </div>
            <div className="flex items-center space-x-2 p-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
              <span className="text-sm">Schedule a Meeting</span>
            </div>
          </div>
        </div>

        {/* Main Area */}
        <div className="flex-1 bg-gray-200 relative">
          {/* This is where meeting content will overlay */}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-white border-l">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Calendar</span>
              <button className="text-blue-500">✕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}