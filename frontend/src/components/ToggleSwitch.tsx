import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, disabled = false }) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <label htmlFor={id} className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          className="sr-only" // Hide default checkbox
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
        />
        {/* Line */}
        <div className={`block w-10 h-6 rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-gray-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
        {/* Dot */}
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${checked ? 'translate-x-4' : ''}`}></div>
      </div>
    </label>
  );
};

export default ToggleSwitch;