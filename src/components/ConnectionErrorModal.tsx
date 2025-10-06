import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConnectionErrorModalProps {
  onRetry: () => void;
}

export function ConnectionErrorModal({ onRetry }: ConnectionErrorModalProps) {
  const handleRetry = () => {
    try {
      onRetry();
    } catch (error) {
      console.error('Error retrying connection:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto w-96">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          
          <h2 className="mb-4">Connection Failed</h2>
          
          <p className="text-gray-600 mb-6">
            Unable to connect to the meeting. Please check your internet connection and try again.
          </p>

          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleRetry}
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md active:bg-blue-700 focus:ring-blue-500 px-6"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
