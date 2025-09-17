'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'modern';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  hover = false,
}) => {
  const baseClasses = 'rounded-xl overflow-hidden';

  const variantClasses = {
    default: 'bg-secondary border border-white/10 shadow-lg',
    glass: 'glass-morphism',
    modern: 'bg-secondary/60 backdrop-blur-sm border border-white/5',
  };

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClasses = hover
    ? 'hover:border-primary/30 hover:bg-secondary/80 hover:shadow-xl transition-all duration-300'
    : '';

  const classes = `${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${hoverClasses} ${className}`;

  return (
    <div className={classes}>
      {children}
    </div>
  );
};

export default Card;