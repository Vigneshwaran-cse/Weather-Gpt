import React from 'react';
import {
  ArrowLeft,
  Sprout,
  Droplets,
  Wind,
  Sun,
  Thermometer,
  CloudRain,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { OccupationDashboardProps } from './types';
import { useLanguage } from '../../i18n/LanguageContext';

export const FarmingDashboard: React.FC<OccupationDashboardProps> = ({
  currentLocation,
  weatherData,
  onBackToSelector,
  onChangeMode,
  onOpenChatWithPrompt,
}) => {
  const { t } = useLanguage();
  const current = weatherData?.current;
  const temp = current ? Math.round(current.temperature) : 22;
  const wind = current ? Math.round(current.windSpeed) : 12;
  const rainProb = current ? current.rainProbability : 15;
  const humidity = current ? current.humidity : 55;

  // Agricultural calculations
  const sprayWindowStatus =
    rainProb > 40
      ? { label: t('unfavorableRainRisk'), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', ok: false }
      : wind > 20
      ? { label: t('highDriftHazard'), color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', ok: false }
      : wind < 4
      ? { label: t('cautionInversion'), color: 'text-amber-300', bg: 'bg-amber-500/10 border-amber-500/30', ok: false }
      : { label: t('optimalSprayWindow'), color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', ok: true };

  const minTemp = weatherData?.daily?.[0]?.tempMin ?? Math.max(temp - 8, 2);
  const frostRisk = minTemp <= 3;
  const estimatedSoilTemp = Math.round(temp * 0.85 + 2);
  const estimatedET0 = (0.18 * temp * (1 - humidity / 200)).toFixed(1);

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
          <span className="font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
            🌾 {t('farming')}
          </span>
          <button
            type="button"
            onClick={() => onChangeMode('maritime')}
            className="text-slate-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ⚓ {t('maritime')}
          </button>
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
      <div className="rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900/90 border border-emerald-500/30 p-3 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <Sprout className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>{t('farmingTitle')}</span>
              <span className="text-[10px] font-semibold text-emerald-400">· {currentLocation.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {t('farmingDesc')}
            </p>
          </div>
        </div>

        {/* Spray Window Status Pill / Banner */}
        <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${sprayWindowStatus.bg}`}>
          <div className="flex items-center gap-2">
            {sprayWindowStatus.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <div className={`text-xs font-bold ${sprayWindowStatus.color}`}>
                {t('sprayWindow')}: {sprayWindowStatus.label}
              </div>
              <div className="text-[10px] text-slate-300">
                {t('wind')} {wind} km/h · {rainProb}% {t('rain')} · {humidity}% {t('humidity')}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            {t('farmingHighlights')}
          </span>
        </div>
      </div>

      {/* Agronomic Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {/* Soil Temperature */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mb-1">
            <Thermometer className="w-3.5 h-3.5" />
            <span>{t('soilTemperature')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {estimatedSoilTemp}°C
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {estimatedSoilTemp >= 15 ? t('quickSummaryPleasant') : t('feelsLike')}
          </p>
        </div>

        {/* Soil Moisture & Field Capacity */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mb-1">
            <Droplets className="w-3.5 h-3.5" />
            <span>{t('relativeMoisture')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {Math.min(95, Math.max(30, 45 + rainProb / 2))}%
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('humidity')}
          </p>
        </div>

        {/* Evapotranspiration ET0 */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mb-1">
            <Sun className="w-3.5 h-3.5" />
            <span>{t('evapotranspiration')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {estimatedET0} mm/day
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('sun')}
          </p>
        </div>

        {/* Frost / Cold Warning */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mb-1">
            <CloudRain className="w-3.5 h-3.5" />
            <span>{t('frostRisk')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {frostRisk ? t('frostRiskDetected') : t('noFrostRisk')}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('min')} {minTemp}°C
          </p>
        </div>
      </div>

      {/* Field Workability & Traction */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t('farmingHighlights')}
          </span>
          <span className="text-[11px] text-emerald-400 font-bold">
            {rainProb < 30 ? t('routeClearTitle') : t('routeCautionTitle')}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {t('farmingDesc')} · {currentLocation.name}
        </p>
      </div>

      {/* Quick AI Prompts for Farmers */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>{t('askAiAdvisor')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(t('askAiFarmingPrompt'))}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/40 text-left text-[11px] text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            "{t('askAiFarmingPrompt')}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('farming')}: ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/40 text-left text-[11px] text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            "{t('farming')}: {currentLocation.name}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('sprayWindow')} · ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/40 text-left text-[11px] text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            "{t('sprayWindow')} · {currentLocation.name}"
          </button>
        </div>
      </div>
    </div>
  );
};
