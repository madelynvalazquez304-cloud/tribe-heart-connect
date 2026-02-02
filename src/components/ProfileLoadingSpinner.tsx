import React from 'react';

interface ProfileLoadingSpinnerProps {
  color?: string;
}

const ProfileLoadingSpinner: React.FC<ProfileLoadingSpinnerProps> = ({ color = '#E07B4C' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {/* Spiral loader */}
      <div className="relative w-24 h-24">
        {/* Outer ring */}
        <div 
          className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
          style={{ 
            borderColor: `${color}40`,
            borderTopColor: 'transparent',
            animationDuration: '1.5s'
          }}
        />
        
        {/* Middle ring */}
        <div 
          className="absolute inset-2 rounded-full border-4 border-t-transparent"
          style={{ 
            borderColor: `${color}70`,
            borderTopColor: 'transparent',
            animation: 'spin 1.2s linear infinite reverse'
          }}
        />
        
        {/* Inner ring */}
        <div 
          className="absolute inset-4 rounded-full border-4 border-t-transparent animate-spin"
          style={{ 
            borderColor: color,
            borderTopColor: 'transparent',
            animationDuration: '0.9s'
          }}
        />
        
        {/* Center dot */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
        >
          <div 
            className="w-4 h-4 rounded-full animate-pulse"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
      
      {/* Loading text */}
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-lg">Loading</span>
        <span className="flex gap-1">
          <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
          <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
        </span>
      </div>
    </div>
  );
};

export default ProfileLoadingSpinner;
