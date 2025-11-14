import { AlertTriangle, Headphones } from 'lucide-react';

interface AudioDeviceErrorModalProps {
  onClose: () => void;
}

export function AudioDeviceErrorModal({ onClose }: AudioDeviceErrorModalProps) {
  const handleClose = () => {
    try {
      onClose();
    } catch (error) {
      console.error('Error closing audio device error modal:', error);
    }
  };

  const handleTroubleshoot = () => {
    try {
      console.log('Opening troubleshooting guide...');
    } catch (error) {
      console.error('Error opening troubleshooting:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto w-full md:w-[500px] mx-4">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Headphones className="w-16 h-16 text-red-600" />
              <AlertTriangle className="w-8 h-8 text-red-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
            </div>
          </div>
          
          <h2 className="mb-4">Audio Device Error</h2>
          
          <div className="text-red-600 bg-red-50 border border-red-200 rounded p-3 text-left mb-6">
            <p className="mb-2">
              Your audio device is not responding. This may be caused by:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Headphones were disconnected</li>
              <li>Audio driver malfunction</li>
              <li>Device is being used by another application</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6 text-left">
            <h3 className="text-blue-900 mb-2">Recommended Actions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Check if your headphones are properly connected</li>
              <li>Close other applications using audio</li>
              <li>Try selecting a different audio device</li>
            </ol>
          </div>

          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <button 
              onClick={handleTroubleshoot}
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 hover:shadow-md active:bg-gray-400 focus:ring-gray-400 px-6"
            >
              Troubleshoot
            </button>
            <button 
              onClick={handleClose}
              className="rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 hover:shadow-md active:bg-blue-700 focus:ring-blue-500 px-6"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
