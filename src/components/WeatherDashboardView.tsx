import React from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  Cloud,
  AlertTriangle,
  Sparkles,
  Volume2,
  TrendingUp,
  Calendar,
  ShieldCheck,
  MapPin,
  ExternalLink,
  Sprout,
  Anchor,
  BarChart2,
  ShieldAlert,
  Mic,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { VerifiedWeatherData, LocationData, HourlyForecast, DailyForecast } from '../types';
import { WeatherIntelligenceBrief, RiskLevel } from '../../services/briefTypes';
import { getWeatherIcon } from '../utils/weatherIcons';
import { useLanguage } from '../i18n/LanguageContext';

interface WeatherDashboardViewProps {
  currentLocation: LocationData;
  weatherData: VerifiedWeatherData | null;
  brief: WeatherIntelligenceBrief | null;
  isLoading: boolean;
  onOpenMap: () => void;
  onOpenFarming: () => void;
  onOpenMarine: () => void;
  onOpenClimate: () => void;
  onOpenDisaster: () => void;
  onStartVoice: () => void;
  onRefresh: () => void;
  onSelectHourForecast?: (hour: HourlyForecast) => void;
  selectedHourForecast?: HourlyForecast | null;
}

const RISK_STYLE: Record<RiskLevel, string> = {
  LOW: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  MODERATE: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  HIGH: 'bg-orange-500/20 text-orange-800 dark:text-orange-300 border-orange-500/40',
  EXTREME: 'bg-rose-600/25 text-rose-800 dark:text-rose-200 border-rose-500/50',
};

export const WeatherDashboardView: React.FC<WeatherDashboardViewProps> = ({
  currentLocation,
  weatherData,
  brief,
  isLoading,
  onOpenMap,
  onOpenFarming,
  onOpenMarine,
  onOpenClimate,
  onOpenDisaster,
  onStartVoice,
  onRefresh,
  onSelectHourForecast,
  selectedHourForecast,
}) => {
  const { t, tCondition } = useLanguage();

  const current = weatherData?.current;
  const todayForecast = weatherData?.daily?.[0];
  const hourlyItems = weatherData?.hourly?.slice(0, 10) || [];
  const dailyItems = weatherData?.daily?.slice(0, 5) || [];
  const officialWarnings = brief?.officialWarnings;

  // Active temperature display
  const activeTemp = selectedHourForecast
    ? selectedHourForecast.temperature
    : current
    ? current.temperature
    : 35;
  const activeFeelsLike = selectedHourForecast
    ? selectedHourForecast.apparentTemperature
    : current
    ? current.feelsLike
    : 38;
  const activeCondition = selectedHourForecast
    ? selectedHourForecast.condition
    : current
    ? current.condition
    : 'Light drizzle';
  const activeWeatherCode = selectedHourForecast
    ? selectedHourForecast.weatherCode
    : current
    ? current.weatherCode
    : 51;
  const activeWindSpeed = selectedHourForecast
    ? selectedHourForecast.windSpeed
    : current
    ? current.windSpeed
    : 7;
  const activeHumidity = selectedHourForecast
    ? selectedHourForecast.humidity
    : current
    ? current.humidity
    : 76;
  const activeRainProb = selectedHourForecast
    ? selectedHourForecast.rainProbability
    : current
    ? current.rainProbability
    : 76;
  const activePrecip = selectedHourForecast
    ? selectedHourForecast.precipitation
    : current
    ? current.precipitation
    : 1.1;

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="w-full space-y-6">
      {/* Loading Bar Overlay if refreshing */}
      {isLoading && !weatherData && (
        <div className="w-full p-4 rounded-2xl bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-sky-300 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span>Fetching live meteorological data from Open-Meteo & IMD...</span>
        </div>
      )}

      {/* Main Grid: Left/Center Column (approx 70%) & Right Sidebar (approx 30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ==================== LEFT / CENTER MAIN COLUMN (8 cols out of 12) ==================== */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ROW 1: 3 HERO CARDS (Current Weather | IMD Warning | WeatherGPT Says) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* CARD 1: Current Weather Card (Sky Gradient Background) matching Reference */}
            <div className="sm:col-span-1 bg-gradient-to-br from-[#1D89F5] via-[#2563EB] to-[#1E40AF] text-white rounded-3xl p-4 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]">
              {/* Top location header */}
              <div>
                <div className="flex items-center justify-between text-xs text-sky-100 font-medium">
                  <div className="flex items-center gap-1 font-semibold truncate">
                    <MapPin className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                    <span className="truncate">{currentLocation.name}{currentLocation.state ? `, ${currentLocation.state}` : ''}</span>
                  </div>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium shrink-0">Current</span>
                </div>

                {/* Main Temperature & Weather Icon */}
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums">
                        {Math.round(activeTemp)}
                      </span>
                      <span className="text-lg font-light text-sky-200">°C</span>
                    </div>
                    <div className="text-xs text-sky-100 font-medium mt-0.5">
                      Feels like {Math.round(activeFeelsLike)}°C
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      {tCondition(activeCondition)}
                    </div>
                  </div>

                  {/* Weather Icon */}
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                    {getWeatherIcon(activeWeatherCode, true, 'w-9 h-9')}
                  </div>
                </div>
              </div>

              {/* Bottom Weather Metrics Row matching Reference */}
              <div className="mt-4 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-[11px] text-sky-100">
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                  <span>{activeWindSpeed} km/h Wind</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                  <span>{activeHumidity}% Humidity</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                  <span>{activePrecip} mm Rain</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                  <span>{activeRainProb}% Cloud/Rain</span>
                </div>
              </div>
            </div>

            {/* CARD 2: Official IMD Warning Card (Amber Light Card) matching Reference */}
            <div className="sm:col-span-1 bg-[#FEF9C3] dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Official IMD Warning</span>
                  </div>
                  {officialWarnings?.available && officialWarnings.warnings.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-amber-950 font-extrabold text-[10px] tracking-wider uppercase">
                      {officialWarnings.warnings[0].level || 'YELLOW'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-extrabold text-[10px] tracking-wider">
                      CLEAR
                    </span>
                  )}
                </div>

                {officialWarnings?.available && officialWarnings.warnings.length > 0 ? (
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-amber-950 dark:text-amber-100 text-sm leading-snug">
                      {officialWarnings.warnings[0].title || 'Rain and Thunderstorm'}
                    </h3>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300">
                      Valid: {officialWarnings.warnings[0].validFrom ? new Date(officialWarnings.warnings[0].validFrom).toLocaleDateString() : 'Today'} - {officialWarnings.warnings[0].validTo ? new Date(officialWarnings.warnings[0].validTo).toLocaleDateString() : 'Tomorrow'}
                    </p>
                    <p className="text-xs text-amber-900 dark:text-amber-200 line-clamp-3 leading-relaxed mt-1">
                      {officialWarnings.warnings[0].message}
                    </p>
                  </div>
                ) : (
                  <div className="py-2 space-y-1">
                    <h3 className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                      No Active IMD Warnings
                    </h3>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Official weather advisories for {currentLocation.name} indicate normal seasonal conditions.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-amber-300/60 dark:border-amber-800/60 text-[10px] text-amber-800 dark:text-amber-400 flex items-center justify-between">
                <span>Source: IMD (India Meteorological Dept)</span>
                <ExternalLink className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              </div>
            </div>

            {/* CARD 3: WeatherGPT Says Card (Soft Sky-Blue Card) matching Reference */}
            <div className="sm:col-span-1 bg-[#EFF6FF] dark:bg-slate-800/90 border border-sky-200/90 dark:border-slate-700 rounded-3xl p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 text-xs">
                    <Sparkles className="w-4 h-4 text-[#1D89F5] dark:text-sky-400 shrink-0" />
                    <span>WeatherGPT Says</span>
                  </div>
                  {brief?.summary?.riskLevel && (
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${RISK_STYLE[brief.summary.riskLevel]}`}>
                      {brief.summary.riskLevel}
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug mb-1.5">
                  {brief?.summary?.headline || `Weather conditions in ${currentLocation.name} are expected to stay moderate.`}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                  {brief?.summary?.whatItMeans || 'Stay tuned to hourly forecasts and follow recommended precautions for your daily activities.'}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-sky-200/70 dark:border-slate-700 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => speakText(`${brief?.summary?.headline || ''} ${brief?.summary?.whatItMeans || ''}`)}
                  className="text-[11px] font-semibold text-[#1D89F5] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Read aloud</span>
                </button>
                <span className="text-[10px] text-slate-400">AI summary</span>
              </div>
            </div>

          </div>

          {/* ROW 2: FORECASTS (Hourly Forecast & 5-Day Forecast) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Hourly Forecast (Next 24 hours) - 7 cols */}
            <div className="md:col-span-7 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                  <TrendingUp className="w-4 h-4 text-[#1D89F5]" />
                  <span>Hourly Forecast</span>
                  <span className="text-xs text-slate-500 font-normal">(Next 24 hours)</span>
                </div>
              </div>

              {/* Horizontal Scroll Row of 8 Hours */}
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-2">
                {hourlyItems.map((h, i) => {
                  const isSelected = selectedHourForecast?.time === h.time;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onSelectHourForecast && onSelectHourForecast(h)}
                      className={`flex flex-col items-center justify-between min-w-[62px] p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/40 border-[#1D89F5] text-blue-700 dark:text-sky-300 font-bold shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {i === 0 ? 'Now' : h.formattedHour || h.hour}
                      </span>
                      <div className="my-1.5 text-blue-500">
                        {getWeatherIcon(h.weatherCode, h.period !== 'night', 'w-6 h-6')}
                      </div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {Math.round(h.temperature)}°
                      </span>
                      <span className="text-[10px] text-blue-600 dark:text-sky-400 font-semibold mt-1 flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5" />
                        {h.rainProbability}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5-Day Forecast - 5 cols */}
            <div className="md:col-span-5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                    <Calendar className="w-4 h-4 text-[#1D89F5]" />
                    <span>5-Day Forecast</span>
                  </div>
                  <button type="button" onClick={onOpenClimate} className="text-xs font-semibold text-[#1D89F5] hover:underline cursor-pointer flex items-center gap-0.5">
                    <span>View more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 5 Columns layout matching Reference */}
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {dailyItems.map((d, i) => (
                    <div key={i} className="flex flex-col items-center justify-between p-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700">
                      <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {i === 0 ? 'Today' : d.dayOfWeek.slice(0, 3)}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {d.date ? d.date.split('-').slice(1).join('/') : ''}
                      </div>
                      <div className="my-1 text-blue-500">
                        {getWeatherIcon(d.weatherCode, true, 'w-5 h-5')}
                      </div>
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100">
                        {Math.round(d.tempMax)}° / {Math.round(d.tempMin)}°
                      </div>
                      <div className="text-[9px] text-blue-600 font-semibold mt-0.5 flex items-center gap-0.5">
                        <Droplets className="w-2.5 h-2.5" />
                        {d.rainProbabilityMax}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* ROW 3: ACTIONS (What Should I Do?) & DATA SOURCES */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* What Should I Do? Card - 7 cols */}
            <div className="md:col-span-7 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm mb-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>What Should I Do?</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(brief?.actions && brief.actions.length >= 4 ? brief.actions.slice(0, 4) : [
                  'Carry rain protection',
                  'Plan travel earlier',
                  'Avoid open areas during thunderstorms',
                  'Follow latest IMD advisory',
                ] as string[]).map((actionText: string, idx: number) => {
                  const icons = ['☂️', '🚗', '⚡', '📑'];
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-200 text-xs font-semibold flex flex-col items-center text-center justify-center gap-1.5 min-h-[84px]"
                    >
                      <span className="text-lg">{icons[idx % icons.length]}</span>
                      <span className="leading-tight text-[11px]">{actionText}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Data Sources Card - 5 cols */}
            <div className="md:col-span-5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#1D89F5]" />
                  <span>Data Sources</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      India Meteorological Department (IMD)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/60 dark:border-slate-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Open-Meteo (ECMWF blend)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-200/80 dark:border-slate-700 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Verified meteorological data</span>
                <span>Updated: {weatherData?.updated || 'Recently'}</span>
              </div>
            </div>

          </div>

        </div>

        {/* ==================== RIGHT SIDE PANEL (4 cols out of 12) ==================== */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* CARD 1: RADAR MAP WIDGET matching Reference */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-4 shadow-xs relative overflow-hidden group">
            <div className="relative w-full h-44 sm:h-48 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              {/* Simulated / Real Map Background Image with Radar Overlay matching reference */}
              <iframe
                title="Weather Radar Map Preview"
                src={`https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}&z=9&output=embed`}
                className="w-full h-full border-0 pointer-events-none opacity-85 filter brightness-95 contrast-105"
                loading="lazy"
              />
              {/* Location Marker Overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white font-bold text-[10px] shadow-lg">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>{currentLocation.name}</span>
              </div>

              {/* View Map Action Button overlay at bottom right */}
              <button
                type="button"
                onClick={onOpenMap}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-800/95 hover:bg-white text-slate-900 dark:text-white font-bold text-xs shadow-md border border-slate-200/80 dark:border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#1D89F5]" />
                <span>View Map →</span>
              </button>
            </div>
          </div>

          {/* CARD 2: QUICK ACCESS GRID matching Reference */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-3xl p-5 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm mb-4">
              <Sprout className="w-4 h-4 text-emerald-500" />
              <span>Quick Access</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1. Farming Advisories */}
              <button
                type="button"
                onClick={onOpenFarming}
                className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-200/80 dark:border-emerald-800/60 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 min-h-[95px]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Sprout className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Farming Advisories</span>
              </button>

              {/* 2. Marine Conditions */}
              <button
                type="button"
                onClick={onOpenMarine}
                className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-800/60 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 min-h-[95px]"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Anchor className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Marine Conditions</span>
              </button>

              {/* 3. Climate Insights */}
              <button
                type="button"
                onClick={onOpenClimate}
                className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 border border-sky-200/80 dark:border-sky-800/60 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 min-h-[95px]"
              >
                <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Climate Insights</span>
              </button>

              {/* 4. Disaster Information */}
              <button
                type="button"
                onClick={onOpenDisaster}
                className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-800/60 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98 min-h-[95px]"
              >
                <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight">Disaster Information</span>
              </button>
            </div>
          </div>

          {/* CARD 3: VOICE ASSISTANT CARD matching Reference */}
          <div className="bg-[#EFF6FF] dark:bg-slate-800 border border-sky-200/90 dark:border-slate-700 rounded-3xl p-5 shadow-xs text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-[#1D89F5]/10 text-[#1D89F5] flex items-center justify-center mx-auto">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Voice Assistant
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Ask by voice, get spoken answers in your language
              </p>
            </div>

            {/* Tap to Speak Big Blue Button matching Reference */}
            <button
              type="button"
              onClick={onStartVoice}
              className="w-full py-3 px-4 rounded-full bg-[#1D89F5] hover:bg-blue-600 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Tap to Speak</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
