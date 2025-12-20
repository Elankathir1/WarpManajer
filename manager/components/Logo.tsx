
import React from 'react';
import clsx from 'clsx';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ className, size = 'md', showText = false }) => {
  const sizes = {
    sm: 'w-8 h-8 md:w-10 md:h-10',
    md: 'w-12 h-12 md:w-14 md:h-14',
    lg: 'w-24 h-24 md:w-32 md:h-32',
  };

  return (
    <div className={clsx("flex items-center gap-2 md:gap-3", className)}>
      <div className={clsx("relative shrink-0", sizes[size])}>
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
          {/* Main Dark Circle Badge */}
          <circle cx="45" cy="50" r="40" fill="#0F172A" />
          
          {/* Motion Streaks / Lines */}
          <path d="M 55 35 L 90 28" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          <path d="M 60 45 L 95 40" stroke="#38BDF8" strokeWidth="3" strokeLinecap="round" />
          <path d="M 62 55 L 85 55" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 60 65 L 92 72" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
          
          {/* Stylized 'W' */}
          <path 
            d="M 22 35 L 34 70 L 46 45 L 58 70 L 70 35" 
            stroke="white" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Detail lines on W for 'speed' look */}
          <path d="M 68 35 L 82 35" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
          <path d="M 66 45 L 78 45" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <span className={clsx(
          "font-black tracking-tighter text-slate-900 whitespace-nowrap",
          size === 'sm' ? 'text-lg' : size === 'md' ? 'text-xl md:text-2xl' : 'text-4xl md:text-6xl'
        )}>
          WarpManager
        </span>
      )}
    </div>
  );
};

export default Logo;
