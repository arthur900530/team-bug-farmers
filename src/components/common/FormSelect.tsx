import React from 'react';

interface FormSelectProps {
  label: string;
  value?: string;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  onChange?: (value: string) => void;
  error?: string;
  className?: string;
}

export function FormSelect({ 
  label, 
  value, 
  options, 
  onChange, 
  error,
  className = '' 
}: FormSelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      if (onChange) {
        const selectedValue = e.target.value;
        if (!selectedValue) {
          throw new Error('No option selected');
        }
        onChange(selectedValue);
      }
    } catch (err) {
      console.error('Error changing select value:', err);
      if (error && onChange) {
        onChange('');
      }
    }
  };

  return (
    <div className={className}>
      <label className="block mb-2">{label}</label>
      <select 
        className={`w-full border rounded px-3 py-2 bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${error ? 'border-red-500' : ''}`}
        value={value || ''}
        onChange={handleChange}
      >
        {options.length === 0 && (
          <option value="" disabled>No devices available</option>
        )}
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3 mt-2">{error}</p>
      )}
    </div>
  );
}
