'use client';

import React from 'react';
import { LucideProps } from 'lucide-react';

interface CommunityCardProps {
  name: string;
  description: string;
  icon: React.ComponentType<LucideProps>;
  href: string;
  color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  members?: string;
}

export function CommunityCard({ 
  name, 
  description, 
  icon: Icon, 
  href, 
  color,
  members
}: CommunityCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      hover: 'hover:from-blue-600 hover:to-blue-700',
      icon: 'text-blue-100',
      text: 'text-blue-50'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      hover: 'hover:from-purple-600 hover:to-purple-700',
      icon: 'text-purple-100',
      text: 'text-purple-50'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-500 to-green-600',
      hover: 'hover:from-green-600 hover:to-green-700',
      icon: 'text-green-100',
      text: 'text-green-50'
    },
    orange: {
      bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
      hover: 'hover:from-orange-600 hover:to-orange-700',
      icon: 'text-orange-100',
      text: 'text-orange-50'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-500 to-red-600',
      hover: 'hover:from-red-600 hover:to-red-700',
      icon: 'text-red-100',
      text: 'text-red-50'
    }
  };

  const colors = colorClasses[color];

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative ${colors.bg} ${colors.hover} rounded-xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
          <Icon className="w-full h-full" />
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
          <h3 className={`text-lg font-semibold ${colors.text}`}>
            {name}
          </h3>
        </div>
        
        <p className={`text-sm ${colors.text} opacity-90 mb-3`}>
          {description}
        </p>
        
        {members && (
          <div className={`text-xs ${colors.text} opacity-75 font-medium`}>
            {members}
          </div>
        )}
        
        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300 rounded-xl" />
      </div>
    </a>
  );
}