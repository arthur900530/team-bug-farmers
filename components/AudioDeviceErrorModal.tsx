import React from 'react';
import { AlertCircle } from 'lucide-react';

interface AudioDeviceErrorModalProps {
  onClose: () => void;
}

export function AudioDeviceErrorModal({ onClose }: AudioDeviceErrorModalProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-100 rounded-full p-3 mb-4">
            <AlertCircle className="w-12 h-12 text-red-600" />
          </div>
          
          <h2 className="text-gray-900 mb-2">Audio device not found</h2>
          
          <p className="text-gray-600 mb-6">
            Your microphone is not connected or not detected. Please connect an audio device and try again.
          </p>
          
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
