import React from 'react';
import {
  ArrowLeft,
  Anchor,
  Compass,
  Wind,
  Waves,
  Eye,
  ShieldAlert,
  Sparkles,
  Fish,
  CheckCircle2,
} from 'lucide-react';
import { OccupationDashboardProps } from './types';
import { useLanguage } from '../../i18n/LanguageContext';

export const MaritimeDashboard: React.FC<OccupationDashboardProps> = ({
  currentLocation,
  weatherData,
  onBackToSelector,
  onChangeMode,
  onOpenChatWithPrompt,
}) => {
  const { t } = useLanguage();
  const current = weatherData?.current;
  const windKmh = current ? Math.round(current.windSpeed) : 18;
  const windKnots = Math.round(windKmh * 0.539957);
  const windDirection = current ? current.windDirection : 210;
  const temp = current ? Math.round(current.temperature) : 21;
  const humidity = current ? current.humidity : 70;

  // Sea State and Beaufort calculation
  let beaufortForce = 3;
  let waveHeightMeters = '0.6m - 1.0m';

  if (windKnots < 7) {
    beaufortForce = 2;
    waveHeightMeters = '0.2m - 0.4m';
  } else if (windKnots <= 16) {
    beaufortForce = 4;
    waveHeightMeters = '0.8m - 1.4m';
  } else if (windKnots <= 21) {
    beaufortForce = 5;
    waveHeightMeters = '1.5m - 2.2m';
  } else {
    beaufortForce = 6;
    waveHeightMeters = '2.5m - 3.8m';
  }

  const smallCraftAdvisory = windKnots >= 18;
  const fogRisk = humidity > 85;
  const estimatedSeaTemp = Math.round(temp * 0.9 - 1);

  // Compass cardinal
  const getCardinal = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto scrollbar-none space-y-3 p-0.5">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBackToSelector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('changeMode')}</span>
        </button>

        {/* Quick Mode Switcher */}
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500 hidden sm:inline">{t('activeModeLabel')}:</span>
          <button
            type="button"
            onClick={() => onChangeMode('farming')}
            className="text-slate-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            🌾 {t('farming')}
          </button>
          <span className="font-semibold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
            ⚓ {t('maritime')}
          </span>
          <button
            type="button"
            onClick={() => onChangeMode('aviation')}
            className="text-slate-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✈️ {t('aviation')}
          </button>
        </div>
      </div>

      {/* Main Mode Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-950/30 to-slate-900/90 border border-sky-500/30 p-3 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <Anchor className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>{t('maritimeTitle')}</span>
              <span className="text-[10px] font-semibold text-sky-400">· {currentLocation.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {t('maritimeDesc')}
            </p>
          </div>
        </div>

        {/* Small Craft Advisory Alert */}
        <div
          className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            smallCraftAdvisory
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {smallCraftAdvisory ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold">
                {smallCraftAdvisory ? t('galeWarning') : t('noGaleWarning')}
              </div>
              <div className="text-[10px] text-slate-300">
                {t('wind')} {windKnots} kts ({getCardinal(windDirection)}) · {smallCraftAdvisory ? t('seaStateRough') : t('seaStateCalm')} ({waveHeightMeters})
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            {t('maritimeHighlights')}
          </span>
        </div>
      </div>

      {/* Maritime Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {/* Wave Height & Swell */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
            <Waves className="w-3.5 h-3.5" />
            <span>{t('waveHeight')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {waveHeightMeters}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {smallCraftAdvisory ? t('seaStateRough') : t('seaStateCalm')}
          </p>
        </div>

        {/* Marine Wind (Knots) */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
            <Wind className="w-3.5 h-3.5" />
            <span>{t('wind')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {windKnots} kts {getCardinal(windDirection)}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {windKmh} km/h · {t('windSpeed')}
          </p>
        </div>

        {/* Sea Surface Temp */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
            <Fish className="w-3.5 h-3.5" />
            <span>{t('seaSurfaceTemp')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {estimatedSeaTemp}°C
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('temperature')}
          </p>
        </div>

        {/* Horizontal Visibility / Fog */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
            <Eye className="w-3.5 h-3.5" />
            <span>{t('visibilityLabel')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {fogRisk ? '4 - 7 NM' : '> 10 NM'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {fogRisk ? t('caution') : t('routeClearTitle')}
          </p>
        </div>
      </div>

      {/* Solunar & Fishing Activity Card */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            {t('seaState')}
          </span>
          <span className="text-[11px] text-sky-400 font-bold">
            {windKnots < 15 ? t('routeClearTitle') : t('routeCautionTitle')}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {t('maritimeDesc')} · {currentLocation.name}
        </p>
      </div>

      {/* Quick AI Prompts for Maritime & Fishermen */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>{t('askAiAdvisor')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(t('askAiMaritimePrompt'))}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-sky-950/40 border border-slate-700 hover:border-sky-500/40 text-left text-[11px] text-slate-200 hover:text-sky-300 transition-colors cursor-pointer"
          >
            "{t('askAiMaritimePrompt')}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('maritime')}: ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-sky-950/40 border border-slate-700 hover:border-sky-500/40 text-left text-[11px] text-slate-200 hover:text-sky-300 transition-colors cursor-pointer"
          >
            "{t('maritime')}: {currentLocation.name}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('seaState')} · ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-sky-950/40 border border-slate-700 hover:border-sky-500/40 text-left text-[11px] text-slate-200 hover:text-sky-300 transition-colors cursor-pointer"
          >
            "{t('seaState')} · {currentLocation.name}"
          </button>
        </div>
      </div>
    </div>
  );
};
