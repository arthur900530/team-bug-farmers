import { useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { FormSelect } from '../common/FormSelect';

interface AudioDevice {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AudioSettingsSectionProps {
  selectedMicrophone?: string;
  selectedSpeaker?: string;
  onMicrophoneChange?: (value: string) => void;
  onSpeakerChange?: (value: string) => void;
}

export function AudioSettingsSection({
  selectedMicrophone = 'macbook-mic',
  selectedSpeaker = 'macbook-speakers',
  onMicrophoneChange,
  onSpeakerChange
}: AudioSettingsSectionProps) {
  const [micError, setMicError] = useState<string>('');
  const [speakerError, setSpeakerError] = useState<string>('');
  const [autoAdjust, setAutoAdjust] = useState(true);
  const [suppressNoise, setSuppressNoise] = useState(true);

  const microphoneDevices: AudioDevice[] = [
    { value: 'macbook-mic', label: 'MacBook Pro Microphone' },
    { value: 'external-mic', label: 'External Microphone' },
    { value: 'headset-mic', label: 'Headset Microphone' },
  ];

  const speakerDevices: AudioDevice[] = [
    { value: 'macbook-speakers', label: 'MacBook Pro Speakers' },
    { value: 'external-speakers', label: 'External Speakers' },
    { value: 'headphones', label: 'Headphones' },
  ];

  const handleMicrophoneChange = (value: string) => {
    try {
      setMicError('');
      if (!value) {
        throw new Error('Please select a valid microphone');
      }
      if (onMicrophoneChange) {
        onMicrophoneChange(value);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change microphone';
      setMicError(errorMessage);
      console.error('Microphone change error:', error);
    }
  };

  const handleSpeakerChange = (value: string) => {
    try {
      setSpeakerError('');
      if (!value) {
        throw new Error('Please select a valid speaker');
      }
      if (onSpeakerChange) {
        onSpeakerChange(value);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to change speaker';
      setSpeakerError(errorMessage);
      console.error('Speaker change error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 mb-4">
        <Mic className="w-5 h-5" />
        Audio
      </h3>
      
      <div className="space-y-3">
        <FormSelect
          label="Microphone"
          value={selectedMicrophone}
          options={microphoneDevices}
          onChange={handleMicrophoneChange}
          error={micError}
        />

        <FormSelect
          label="Speaker"
          value={selectedSpeaker}
          options={speakerDevices}
          onChange={handleSpeakerChange}
          error={speakerError}
        />

        <div>
          <label className="block mb-2">Input Volume</label>
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full w-3/4 transition-all" />
            </div>
            <span>75%</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input 
              type="checkbox" 
              checked={autoAdjust}
              onChange={(e) => setAutoAdjust(e.target.checked)}
              className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
            />
            <span>Automatically adjust microphone volume</span>
          </label>
          
          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
            <input 
              type="checkbox" 
              checked={suppressNoise}
              onChange={(e) => setSuppressNoise(e.target.checked)}
              className="mr-3 cursor-pointer hover:scale-110 transition-transform" 
            />
            <span>Suppress background noise</span>
          </label>
        </div>
      </div>
    </div>
  );
}
