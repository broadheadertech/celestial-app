'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { ButtonProps } from '@/types';

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  onClick,
  type = 'button',
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25',
    secondary: 'bg-secondary text-white hover:bg-secondary/90 border border-white/10',
    outline: 'bg-transparent border border-primary text-primary hover:bg-primary hover:text-white',
    ghost: 'bg-transparent text-muted hover:bg-white/10 hover:text-white',
  };

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[20px]',
    sm: 'px-3 py-2 text-sm min-h-[32px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[52px]',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {children}
    </button>
  );
};

export default Button;