'use client';

import React from 'react';
import { ArrowRight, LucideProps } from 'lucide-react';

interface CTACardProps {
  title: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  className?: string;
  external?: boolean;
}

export function CTACard({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  onClick, 
  variant = 'default',
  className = '',
  external = false
}: CTACardProps) {
  const baseClasses = "group relative bg-white dark:bg-gray-800 rounded-xl p-6 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1";
  
  const variantClasses = {
    default: "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600",
    primary: "border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:border-blue-300 dark:hover:border-blue-600",
    secondary: "border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 hover:border-purple-300 dark:hover:border-purple-600"
  };

  const iconColors = {
    default: "text-blue-600 dark:text-blue-400",
    primary: "text-blue-700 dark:text-blue-300",
    secondary: "text-purple-700 dark:text-purple-300"
  };

  const Component = href ? 'a' : 'button';
  const props = href ? { 
    href, 
    ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})
  } : { onClick };

  return (
    <Component
      {...props}
      className={`${baseClasses} ${variantClasses[variant]} ${className} ${href || onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-xl bg-white dark:bg-gray-700 shadow-sm group-hover:shadow-md transition-shadow ${
          variant === 'primary' ? 'bg-blue-100 dark:bg-blue-900/30' : 
          variant === 'secondary' ? 'bg-purple-100 dark:bg-purple-900/30' : ''
        }`}>
          <Icon className={`w-6 h-6 ${iconColors[variant]}`} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {description}
          </p>
        </div>
        
        {(href || onClick) && (
          <div className="flex-shrink-0">
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </div>
        )}
      </div>
      
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-xl transition-all duration-300 pointer-events-none" />
    </Component>
  );
}