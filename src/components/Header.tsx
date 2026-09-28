import React from 'react';
import { LanguageSelector } from './LanguageSelector';

interface HeaderProps {
  onBrandClick?: () => void;
  onFarmerModeClick?: () => void;
  isFarmerModeActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onBrandClick,
  onFarmerModeClick,
  isFarmerModeActive = false,
}) => {
  return (
    <header className="shrink-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl safe-top">
      {/* Main application header: Farmer Mode quick access on Left, [LOGO] WeatherGPT centered, Language selector at top right */}
      <div className="w-full max-w-[1440px] mx-auto h-11 sm:h-12 lg:h-16 px-2.5 sm:px-6 lg:px-10 xl:px-14 relative flex items-center justify-between">
        {/* Left: 🌾 FARMER MODE Quick Entry Button */}
        {onFarmerModeClick && (
          <button
            type="button"
            onClick={onFarmerModeClick}
            className={`h-7 lg:h-9 px-2 xs:px-2.5 lg:px-3 rounded-lg border text-[11px] lg:text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
              isFarmerModeActive
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50'
                : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 hover:text-emerald-200'
            }`}
            title="Open Dedicated Farmer Mode Dashboard"
            aria-label="Farmer Mode"
          >
            <span>🌾</span>
            <span className="hidden xs:inline">FARMER MODE</span>
            <span className="xs:hidden">FARM</span>
          </button>
        )}

        {/* Centered branding group: [ATTACHED LOGO] + WeatherGPT in STARDOM font */}
        <button
          type="button"
          onClick={onBrandClick}
          className="focus:outline-none cursor-pointer group flex items-center justify-center gap-1.5 select-none transition-opacity hover:opacity-90 active:scale-[0.98] mx-auto"
          aria-label="WeatherGPT Home"
        >
          <img
            src="/assets/weathergpt-logo.svg"
            alt="WeatherGPT Logo"
            className="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 lg:w-8 lg:h-8 rounded-full object-contain shrink-0 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/weathergpt-logo.png';
            }}
          />
          <span className="font-stardom text-base sm:text-lg lg:text-2xl text-white tracking-wide leading-none">
            WeatherGPT
          </span>
        </button>

        {/* Top Right: Language selector positioned independently */}
        <div className="flex items-center">
          <LanguageSelector />
        </div>
      </div>
    </header>
  );
};
