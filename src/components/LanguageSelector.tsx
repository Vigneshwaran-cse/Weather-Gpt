import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SupportedLanguage } from '../i18n/types';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, languages, currentLanguageOption, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Selector Trigger Button: Small rounded button showing ONLY the first native character */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-8 h-8 rounded-full border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 hover:border-sky-500/50 text-slate-100 flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer active:scale-95 focus:outline-none focus:ring-1 focus:ring-sky-500 shrink-0"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Language selector. Current language: ${currentLanguageOption.name}`}
        title={t('selectLanguage')}
      >
        <span className="leading-none select-none">
          {currentLanguageOption.char}
        </span>
      </button>

      {/* Compact Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 mt-2 w-44 rounded-2xl bg-slate-900/98 border border-slate-700/80 shadow-2xl py-1 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
        >
          <div className="p-1 space-y-0.5">
            {languages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  role="option"
                  type="button"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full min-h-[38px] flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs text-left transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-bold text-slate-200 text-xs sm:text-sm">
                      {lang.char}
                    </span>
                    <span className="text-xs">
                      {lang.nativeName}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
