import React, { useState } from 'react';
import { Accessibility, Eye, Volume2, Sliders } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export const AccessibilityView: React.FC = () => {
  const { t } = useLanguage();
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeText, setLargeText] = useState(false);

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto scrollbar-none space-y-2 p-0.5 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-3 shadow-md backdrop-blur-xl relative overflow-hidden shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Accessibility className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{t('accessibilityTitle')}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {t('slotReady')}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">
              {t('accessibilitySubtitle')}
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          {t('accessibilityNote')}
        </p>
      </div>

      {/* Accessible Preference Toggles (Interactive Placeholder Sliders) */}
      <div className="space-y-2 shrink-0">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">{t('highContrastDisplay')}</div>
              <div className="text-[10px] text-slate-400">{t('highContrastDesc')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHighContrast(!highContrast)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              highContrast ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                highContrast ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">{t('reducedMotionTitle')}</div>
              <div className="text-[10px] text-slate-400">{t('reducedMotionDesc')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReducedMotion(!reducedMotion)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              reducedMotion ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                reducedMotion ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
              <Volume2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">{t('screenReaderPrompts')}</div>
              <div className="text-[10px] text-slate-400">{t('screenReaderDesc')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLargeText(!largeText)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
              largeText ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                largeText ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
