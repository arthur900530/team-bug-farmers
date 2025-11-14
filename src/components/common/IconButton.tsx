import { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  onClick?: () => void;
  variant?: 'active' | 'inactive' | 'special';
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function IconButton({ 
  icon: Icon, 
  onClick, 
  variant = 'active',
  className = '',
  ariaLabel,
  disabled = false
}: IconButtonProps) {
  const variantClasses = {
    active: 'bg-gray-600 hover:bg-gray-500',
    inactive: 'bg-red-600 hover:bg-red-500',
    special: 'bg-green-600 hover:bg-green-500',
  };

  const handleClick = () => {
    try {
      if (!disabled && onClick) {
        onClick();
      }
    } catch (error) {
      console.error('Error in button click handler:', error);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`rounded transition-all duration-150 outline-none focus:ring-2 focus:ring-offset-2 w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 ${variantClasses[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      aria-label={ariaLabel}
      disabled={disabled}
    >
      <Icon className="w-6 h-6 text-white" />
    </button>
  );
}
