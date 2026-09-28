import React from 'react';
import { MapPin, Menu, Sun, Moon } from 'lucide-react';
import { LocationData } from '../types';
import { LanguageSelector } from './LanguageSelector';

interface TopHeaderBarProps {
  location: LocationData;
  updatedTime?: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMobileMenu?: () => void;
}

export const TopHeaderBar: React.FC<TopHeaderBarProps> = ({
  location,
  updatedTime,
  theme,
  onToggleTheme,
  onOpenMobileMenu,
}) => {
  const formattedLatLon = `${location.latitude >= 0 ? 'Lat ' + location.latitude.toFixed(2) + '°N' : 'Lat ' + Math.abs(location.latitude).toFixed(2) + '°S'}, ${location.longitude >= 0 ? 'Lon ' + location.longitude.toFixed(2) + '°E' : 'Lon ' + Math.abs(location.longitude).toFixed(2) + '°W'}`;

  return (
    <header className="w-full flex items-center justify-between py-3 px-4 sm:px-6 lg:px-8 bg-transparent shrink-0">
      {/* Left: Mobile Sidebar Menu Toggle */}
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right Controls matching Reference Header */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 text-xs">
        {/* Location Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-xs leading-none">
              {location.name}{location.state ? `, ${location.state}` : ''}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              {formattedLatLon}
            </div>
          </div>
        </div>

        {/* Last Updated Pill */}
        {updatedTime && (
          <div className="hidden md:flex flex-col text-right px-2.5 py-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
              Last updated
            </span>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {updatedTime}
            </span>
          </div>
        )}

        {/* LIVE Status Badge */}
        <div className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold tracking-wider flex items-center gap-1 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>LIVE</span>
        </div>

        {/* Language Selector Dropdown */}
        <LanguageSelector />

        {/* Dark/Light Mode Theme Toggle Button */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shadow-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-slate-600" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* User Profile Circle Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-xs select-none">
          E
        </div>
      </div>
    </header>
  );
};
