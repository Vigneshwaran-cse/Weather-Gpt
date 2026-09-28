import React, { useState } from 'react';
import { Sprout, Anchor, Plane, ArrowRight, CheckCircle2 } from 'lucide-react';
import { OccupationMode } from './types';
import { useLanguage } from '../../i18n/LanguageContext';

interface OccupationSelectorProps {
  onSelectMode: (mode: OccupationMode) => void;
  selectedMode?: OccupationMode | null;
}

export const OccupationSelector: React.FC<OccupationSelectorProps> = ({
  onSelectMode,
  selectedMode: currentSelected = null,
}) => {
  const { t } = useLanguage();
  const [activeMode, setActiveMode] = useState<OccupationMode | null>(currentSelected);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleSelect = (mode: OccupationMode) => {
    setActiveMode(mode);
    setIsTransitioning(true);
    // Smooth visual feedback before entering the dedicated dashboard
    setTimeout(() => {
      onSelectMode(mode);
    }, 240);
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col justify-start md:justify-center py-2 px-1 max-w-4xl mx-auto overflow-y-auto scrollbar-none">
      {/* Header Section */}
      <div className="text-center mb-4 sm:mb-6 shrink-0 pt-1">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white mb-1.5">
          {t('chooseOccupation')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          {t('chooseOccupationSubtitle')}
        </p>
      </div>

      {/* 3 Large Selectable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 w-full shrink-0">
        {/* 1. 🌾 FARMING MODE */}
        <button
          type="button"
          onClick={() => handleSelect('farming')}
          disabled={isTransitioning}
          className={`group relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
            activeMode === 'farming'
              ? 'bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-950/60 ring-2 ring-emerald-400/50'
              : 'bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-400/50 hover:bg-emerald-950/30 hover:shadow-lg hover:shadow-emerald-950/30'
          }`}
        >
          {/* Card Top / Icons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl select-none" role="img" aria-label="Farming">
                  🌾
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Sprout className="w-5 h-5" />
                </div>
              </div>
              {activeMode === 'farming' && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('selected')}</span>
                </div>
              )}
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-emerald-300 transition-colors">
              {t('farmingTitle')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {t('farmingDesc')}
            </p>
            <p className="text-[11px] text-emerald-300/80 mt-2 font-medium">
              {t('farmingHighlights')}
            </p>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs font-semibold text-emerald-400">
            <span>{t('enterFarmingMode')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 2. ⚓ MARITIME / FISHING MODE */}
        <button
          type="button"
          onClick={() => handleSelect('maritime')}
          disabled={isTransitioning}
          className={`group relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
            activeMode === 'maritime'
              ? 'bg-sky-950/40 border-sky-400 shadow-lg shadow-sky-950/60 ring-2 ring-sky-400/50'
              : 'bg-sky-950/15 border-sky-500/25 hover:border-sky-400/50 hover:bg-sky-950/30 hover:shadow-lg hover:shadow-sky-950/30'
          }`}
        >
          {/* Card Top / Icons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl select-none" role="img" aria-label="Maritime">
                  ⚓
                </span>
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Anchor className="w-5 h-5" />
                </div>
              </div>
              {activeMode === 'maritime' && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('selected')}</span>
                </div>
              )}
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-sky-300 transition-colors">
              {t('maritimeTitle')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {t('maritimeDesc')}
            </p>
            <p className="text-[11px] text-sky-300/80 mt-2 font-medium">
              {t('maritimeHighlights')}
            </p>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-sky-500/20 flex items-center justify-between text-xs font-semibold text-sky-400">
            <span>{t('enterMaritimeMode')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* 3. ✈️ AVIATION MODE */}
        <button
          type="button"
          onClick={() => handleSelect('aviation')}
          disabled={isTransitioning}
          className={`group relative text-left p-4 sm:p-5 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between border ${
            activeMode === 'aviation'
              ? 'bg-indigo-950/40 border-indigo-400 shadow-lg shadow-indigo-950/60 ring-2 ring-indigo-400/50'
              : 'bg-indigo-950/15 border-indigo-500/25 hover:border-indigo-400/50 hover:bg-indigo-950/30 hover:shadow-lg hover:shadow-indigo-950/30'
          }`}
        >
          {/* Card Top / Icons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl select-none" role="img" aria-label="Aviation">
                  ✈️
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Plane className="w-5 h-5" />
                </div>
              </div>
              {activeMode === 'aviation' && (
                <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('selected')}</span>
                </div>
              )}
            </div>

            {/* Title & Subtitle */}
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-indigo-300 transition-colors">
              {t('aviationTitle')}
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {t('aviationDesc')}
            </p>
            <p className="text-[11px] text-indigo-300/80 mt-2 font-medium">
              {t('aviationHighlights')}
            </p>
          </div>

          {/* Action Footer */}
          <div className="mt-4 pt-3 border-t border-indigo-500/20 flex items-center justify-between text-xs font-semibold text-indigo-400">
            <span>{t('enterAviationMode')}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="mt-4 sm:mt-6 text-center text-[11px] text-slate-500 shrink-0">
        {t('chooseOccupationSubtitle')}
      </div>
    </div>
  );
};
