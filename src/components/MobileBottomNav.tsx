import React from 'react';
import { Briefcase, Bookmark, Bot, Map, Accessibility } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type NavItem = 'occupational' | 'saved' | 'ai' | 'map' | 'access';

interface MobileBottomNavProps {
  activeNav: NavItem;
  onSelectNav: (item: NavItem) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNav,
  onSelectNav,
}) => {
  const { t } = useLanguage();

  return (
    <nav
      aria-label="Bottom Navigation Bar"
      className="shrink-0 z-30 w-full max-w-[1440px] mx-auto bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/90 safe-bottom select-none"
    >
      <div className="h-13 sm:h-14 px-1.5 xs:px-2 flex items-center justify-between gap-0.5">
        {/* 1. OCCUPATIONAL (Leftmost) */}
        <button
          type="button"
          onClick={() => onSelectNav('occupational')}
          className={`flex-1 flex flex-col items-center justify-center h-full py-0.5 rounded-xl transition-all duration-150 cursor-pointer group active:scale-95 ${
            activeNav === 'occupational'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t('navOccupational')}
          aria-label={t('navOccupational')}
        >
          <div className="relative flex items-center justify-center">
            <Briefcase
              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-150 ${
                activeNav === 'occupational' ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
              }`}
            />
            {activeNav === 'occupational' && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span
            className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 truncate max-w-[58px] ${
              activeNav === 'occupational' ? 'text-sky-300 font-semibold' : 'text-slate-400'
            }`}
          >
            {t('navOccupational')}
          </span>
        </button>

        {/* 2. SAVED LOCATIONS (Left) */}
        <button
          type="button"
          onClick={() => onSelectNav('saved')}
          className={`flex-1 flex flex-col items-center justify-center h-full py-0.5 rounded-xl transition-all duration-150 cursor-pointer group active:scale-95 ${
            activeNav === 'saved'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t('navSaved')}
          aria-label={t('navSaved')}
        >
          <div className="relative flex items-center justify-center">
            <Bookmark
              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-150 ${
                activeNav === 'saved' ? 'scale-110 fill-sky-400/20 stroke-[2.3]' : 'stroke-[1.8]'
              }`}
            />
            {activeNav === 'saved' && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span
            className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 truncate max-w-[50px] ${
              activeNav === 'saved' ? 'text-sky-300 font-semibold' : 'text-slate-400'
            }`}
          >
            {t('navSaved')}
          </span>
        </button>

        {/* 3. AI CHATBOT (CENTER / MAIN - PROMINENT & ELEVATED) */}
        <div className="flex-1 flex flex-col items-center justify-center relative -top-1.5 xs:-top-2">
          <button
            type="button"
            onClick={() => onSelectNav('ai')}
            className={`relative flex items-center justify-center w-10 h-10 xs:w-11 xs:h-11 rounded-full transition-all duration-200 cursor-pointer shadow-md active:scale-95 ${
              activeNav === 'ai'
                ? 'bg-gradient-to-tr from-sky-500 via-blue-600 to-indigo-600 text-white shadow-sky-500/40 ring-2 ring-sky-300/80 animate-subtle-float'
                : 'bg-gradient-to-tr from-slate-900 to-slate-800 text-sky-400 hover:text-white border border-sky-500/30'
            }`}
            title="WeatherGPT AI"
            aria-label={t('navAi')}
          >
            <Bot className="w-5 h-5 stroke-[2.2]" />
          </button>
          <span
            className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 font-bold ${
              activeNav === 'ai' ? 'text-sky-300' : 'text-slate-300'
            }`}
          >
            {t('navAi')}
          </span>
        </div>

        {/* 4. MAP WEATHER (Right) */}
        <button
          type="button"
          onClick={() => onSelectNav('map')}
          className={`flex-1 flex flex-col items-center justify-center h-full py-0.5 rounded-xl transition-all duration-150 cursor-pointer group active:scale-95 ${
            activeNav === 'map'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t('navMap')}
          aria-label={t('navMap')}
        >
          <div className="relative flex items-center justify-center">
            <Map
              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-150 ${
                activeNav === 'map' ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
              }`}
            />
            {activeNav === 'map' && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span
            className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 truncate max-w-[50px] ${
              activeNav === 'map' ? 'text-sky-300 font-semibold' : 'text-slate-400'
            }`}
          >
            {t('navMap')}
          </span>
        </button>

        {/* 5. ACCESSIBILITY (Rightmost) */}
        <button
          type="button"
          onClick={() => onSelectNav('access')}
          className={`flex-1 flex flex-col items-center justify-center h-full py-0.5 rounded-xl transition-all duration-150 cursor-pointer group active:scale-95 ${
            activeNav === 'access'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={t('navAccess')}
          aria-label={t('navAccess')}
        >
          <div className="relative flex items-center justify-center">
            <Accessibility
              className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-150 ${
                activeNav === 'access' ? 'scale-110 stroke-[2.3]' : 'stroke-[1.8]'
              }`}
            />
            {activeNav === 'access' && (
              <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-400" />
            )}
          </div>
          <span
            className={`text-[9px] xs:text-[10px] tracking-tight mt-0.5 truncate max-w-[50px] ${
              activeNav === 'access' ? 'text-sky-300 font-semibold' : 'text-slate-400'
            }`}
          >
            {t('navAccess')}
          </span>
        </button>
      </div>
    </nav>
  );
};
