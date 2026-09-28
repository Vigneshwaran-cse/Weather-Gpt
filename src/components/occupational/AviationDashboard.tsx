import React from 'react';
import {
  ArrowLeft,
  Plane,
  Compass,
  Wind,
  Gauge,
  Cloud,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { OccupationDashboardProps } from './types';
import { useLanguage } from '../../i18n/LanguageContext';

export const AviationDashboard: React.FC<OccupationDashboardProps> = ({
  currentLocation,
  weatherData,
  onBackToSelector,
  onChangeMode,
  onOpenChatWithPrompt,
}) => {
  const { t } = useLanguage();
  const current = weatherData?.current;
  const windKmh = current ? Math.round(current.windSpeed) : 15;
  const windKnots = Math.round(windKmh * 0.539957);
  const windDirection = current ? current.windDirection : 240;
  const temp = current ? Math.round(current.temperature) : 22;
  const dewPoint = Math.round(temp - ((100 - (current?.humidity ?? 60)) / 5));
  const rainProb = current ? current.rainProbability : 10;

  // Flight Category determination: VFR / MVFR / IFR
  let flightCategory = 'VFR';
  let flightCategoryColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  let flightCategoryDesc = t('flightCategoryVFR');

  if (rainProb > 70 || (current?.weatherCode && current.weatherCode >= 61 && current.weatherCode <= 67)) {
    flightCategory = 'IFR';
    flightCategoryColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    flightCategoryDesc = t('flightCategoryIFR');
  } else if (rainProb > 40 || windKnots > 22) {
    flightCategory = 'MVFR';
    flightCategoryColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    flightCategoryDesc = t('aviationHighlights');
  }

  // Estimated Altimeter QNH
  const qnhHpa = 1013;
  const qnhInHg = (qnhHpa * 0.02953).toFixed(2);

  // Density altitude deviation (approx +118 ft per °C above ISA 15°C)
  const isaDeviation = temp - 15;
  const densityAltitudeOffset = Math.round(isaDeviation * 120);

  // Synthetic METAR generation for pilot briefing
  const icaoCode = currentLocation.name.slice(0, 3).toUpperCase() + 'X';
  const metarTime = '251800Z';
  const windCode = `${String(windDirection).padStart(3, '0')}${String(windKnots).padStart(2, '0')}KT`;
  const skyCondition = rainProb > 50 ? 'BKN035' : rainProb > 25 ? 'SCT045' : 'FEW050';
  const tempDewCode = `${temp >= 0 ? String(temp).padStart(2, '0') : 'M' + Math.abs(temp)}/${dewPoint >= 0 ? String(dewPoint).padStart(2, '0') : 'M' + Math.abs(dewPoint)}`;
  const syntheticMetar = `${icaoCode} ${metarTime} ${windCode} 9999 ${skyCondition} ${tempDewCode} Q${qnhHpa} NOSIG`;

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
          <button
            type="button"
            onClick={() => onChangeMode('maritime')}
            className="text-slate-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ⚓ {t('maritime')}
          </button>
          <span className="font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
            ✈️ {t('aviation')}
          </span>
        </div>
      </div>

      {/* Main Mode Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950/30 to-slate-900/90 border border-indigo-500/30 p-3 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Plane className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>{t('aviationTitle')}</span>
              <span className="text-[10px] font-semibold text-indigo-400">· {currentLocation.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {t('aviationDesc')}
            </p>
          </div>
        </div>

        {/* Flight Category Banner */}
        <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${flightCategoryColor}`}>
          <div className="flex items-center gap-2">
            {flightCategory === 'VFR' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>{t('aviationFlightConditions')}: {flightCategory}</span>
              </div>
              <div className="text-[10px] text-slate-300">
                {flightCategoryDesc}
              </div>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            ICAO {icaoCode}
          </span>
        </div>
      </div>

      {/* Synthetic METAR Card */}
      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
          <span className="font-semibold text-slate-300">{t('empiricalTelemetry')}</span>
          <span className="font-mono text-[10px] text-indigo-400">{t('live')}</span>
        </div>
        <div className="font-mono text-xs text-indigo-300 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 tracking-wide break-all">
          {syntheticMetar}
        </div>
      </div>

      {/* Aviation Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {/* Surface Winds */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Wind className="w-3.5 h-3.5" />
            <span>{t('wind')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {windDirection}° / {windKnots} kts
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('windSpeed')}: {windKmh} km/h
          </p>
        </div>

        {/* Altimeter QNH */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Gauge className="w-3.5 h-3.5" />
            <span>{t('barometricPressure')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {qnhHpa} hPa
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {t('pressure')}
          </p>
        </div>

        {/* Cloud Ceiling */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Cloud className="w-3.5 h-3.5" />
            <span>{t('cloudCeiling')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {rainProb > 40 ? '3,500 ft AGL' : '> 5,000 ft'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {skyCondition}
          </p>
        </div>

        {/* Density Altitude Offset */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>{t('crosswindRisk')}</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {densityAltitudeOffset >= 0 ? `+${densityAltitudeOffset}` : densityAltitudeOffset} ft
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {windKnots > 20 ? t('crosswindHigh') : t('crosswindNormal')}
          </p>
        </div>
      </div>

      {/* Turbulence & Shear Advisory */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            {t('aviationFlightConditions')}
          </span>
          <span className="text-[11px] text-indigo-400 font-bold">
            {windKnots < 18 ? t('routeClearTitle') : t('routeCautionTitle')}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {t('aviationDesc')} · {currentLocation.name}
        </p>
      </div>

      {/* Quick AI Prompts for Aviators */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>{t('askAiAdvisor')}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(t('askAiAviationPrompt'))}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/40 text-left text-[11px] text-slate-200 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            "{t('askAiAviationPrompt')}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('aviation')}: ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/40 text-left text-[11px] text-slate-200 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            "{t('aviation')}: {currentLocation.name}"
          </button>
          <button
            type="button"
            onClick={() => onOpenChatWithPrompt?.(`${t('cloudCeiling')} & ${t('visibilityLabel')}: ${currentLocation.name}`)}
            className="p-2.5 rounded-lg bg-slate-800/80 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/40 text-left text-[11px] text-slate-200 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            "{t('cloudCeiling')} & {t('visibilityLabel')}: ${currentLocation.name}"
          </button>
        </div>
      </div>
    </div>
  );
};
