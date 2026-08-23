import React, { useState } from 'react';
import appLogoImg from '../assets/images/health.png';
const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-20 h-20',
  '3xl': 'w-24 h-24',
};

export const AppLogo = ({
  size = 'md',
  className = '',
  showBorder = true,
  withText = false,
  textClassName = '',
  subtitle = false,
  darkText = false,
  alt = 'ClaimGuard AI Healthcare Fraud Intelligence'
}) => {
  const [imageError, setImageError] = useState(false);
  const sizeClasses = SIZE_MAP[size] || size;

  const renderLogoGraphic = () => {
    return (
      <div
        className={`relative rounded-full shrink-0 flex items-center justify-center overflow-hidden transition-transform duration-200 ${sizeClasses} ${
          showBorder ? 'ring-2 ring-[#0284C7]/30 shadow-xs' : ''
        } ${className}`}
      >
        {!imageError ? (
          <img
            src={appLogoImg}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover rounded-full select-none"
            loading="eager"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full rounded-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="50" cy="50" r="47" stroke="#38BDF8" strokeWidth="4" fill="#FFFFFF" />
            <circle cx="50" cy="50" r="41" stroke="#0284C7" strokeWidth="2.5" />
            <circle cx="42" cy="35" r="7.5" fill="#0B4A9C" />
            <path
              d="M24 40 C34 47 40 57 37 84 C43 70 48 55 58 40 C48 48 40 50 24 40 Z"
              fill="#0B4A9C"
            />
            <path
              d="M37 84 C41 73 45 61 52 50 C49 62 44 75 37 84 Z"
              fill="#06B6D4"
            />
            <path
              d="M52 52 C52 52 64 45 84 52 C84 72 74 85 68 90 C62 85 52 72 52 52 Z"
              fill="#0D9488"
            />
            <path
              d="M55 55 C55 55 64 49 81 55 C81 70 73 81 68 85 C63 81 55 70 55 55 Z"
              stroke="#FFFFFF"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M65 62 H71 V67 H76 V73 H71 V78 H65 V73 H60 V67 H65 V62 Z"
              fill="#FFFFFF"
            />
          </svg>
        )}
      </div>
    );
  };

  if (!withText) {
    return renderLogoGraphic();
  }

  return (
    <div className="flex items-center gap-3">
      {renderLogoGraphic()}
      <div className={textClassName}>
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-black tracking-tight ${
              darkText ? 'text-[#0A2A4A]' : 'text-white'
            } text-base sm:text-lg`}
          >
            ClaimGuard
          </span>
          <span className="font-black text-[#0284C7] text-base sm:text-lg">
            AI
          </span>
        </div>
        {subtitle && (
          <p
            className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${
              darkText ? 'text-[#627D98]' : 'text-[#93C5FD]'
            }`}
          >
            {typeof subtitle === 'string'
              ? subtitle
              : 'HEALTHCARE FRAUD INTELLIGENCE'}
          </p>
        )}
      </div>
    </div>
  );
};

export default AppLogo;
