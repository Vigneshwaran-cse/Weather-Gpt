import React from 'react';
import {
  Droplets,
  Wind,
  CloudRain,
  Sunrise,
  Sunset,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { VerifiedWeatherData, HourlyForecast } from '../types';
import { getWeatherIcon } from '../utils/weatherIcons';
import { useLanguage } from '../i18n/LanguageContext';

interface CurrentWeatherCardProps {
  weather: VerifiedWeatherData;
  onRefresh: () => void;
  isLoading: boolean;
  selectedHourForecast?: HourlyForecast | null;
  onResetHour?: () => void;
}

export const CurrentWeatherCard: React.FC<CurrentWeatherCardProps> = ({
  weather,
  selectedHourForecast,
  onResetHour,
}) => {
  const { t, tCondition } = useLanguage();
  const { current, location, daily, updated } = weather;
  const todayForecast = daily[0];

  // Active display values
  const isPreviewingHour = !!selectedHourForecast;
  const activeTemp = isPreviewingHour ? selectedHourForecast.temperature : current.temperature;
  const activeCondition = isPreviewingHour ? selectedHourForecast.condition : current.condition;
  const activeWeatherCode = isPreviewingHour ? selectedHourForecast.weatherCode : current.weatherCode;
  const activeIsDay = isPreviewingHour
    ? selectedHourForecast.period !== 'night'
    : current.isDay;
  const activeRainProb = isPreviewingHour ? selectedHourForecast.rainProbability : current.rainProbability;
  const activeHumidity = isPreviewingHour ? selectedHourForecast.humidity : current.humidity;
  const activeWindSpeed = isPreviewingHour ? selectedHourForecast.windSpeed : current.windSpeed;
  const activeFeelsLike = isPreviewingHour ? selectedHourForecast.apparentTemperature : current.feelsLike;

  const getQuickSummary = () => {
    const cond = tCondition(activeCondition);
    if (activeRainProb >= 60) {
      return t('quickSummaryRain', { prob: activeRainProb, location: location.name });
    }
    if (activeRainProb >= 30) {
      return t('quickSummaryModerateRain', { prob: activeRainProb, condition: cond });
    }
    if (activeTemp >= 34) {
      return t('quickSummaryHot', { temp: Math.round(activeTemp) });
    }
    return t('quickSummaryPleasant', { condition: cond, wind: activeWindSpeed });
  };

  return (
    <div className="relative rounded-2xl bg-slate-900/85 border border-slate-800/90 p-3 sm:p-3.5 shadow-xl backdrop-blur-xl">
      {/* Top Strip: Location, Status & Reset */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/70">
        <div className="flex items-center gap-1.5 truncate">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight truncate">
            {location.name}
          </h1>
          <span className="text-[11px] text-slate-400 font-medium truncate hidden xs:inline">
            {[location.state, location.country].filter(Boolean).join(', ')}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
          {isPreviewingHour ? (
            <button
              type="button"
              onClick={onResetHour}
              className="h-6 px-2 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>{t('live')}</span>
            </button>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-slate-500" />
              <span>{updated}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Temperature & Weather Hero */}
      <div className="pt-2 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight tabular-nums">
              {Math.round(activeTemp)}
            </span>
            <span className="text-xl sm:text-2xl font-light text-sky-400">°C</span>
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
            {tCondition(activeCondition)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span>{t('feelsLike')} {Math.round(activeFeelsLike)}°C</span>
            {todayForecast && (
              <>
                <span className="text-slate-600">·</span>
                <span>{t('high')}: {Math.round(todayForecast.tempMax)}° {t('low')}: {Math.round(todayForecast.tempMin)}°</span>
              </>
            )}
          </div>
        </div>

        {/* Weather Icon */}
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
          {getWeatherIcon(activeWeatherCode, activeIsDay, 'w-9 h-9 sm:w-10 sm:h-10')}
        </div>
      </div>

      {/* AI Weather Summary Pill */}
      <div className="mt-2 p-2 rounded-xl bg-gradient-to-r from-sky-950/60 to-slate-800/40 border border-sky-500/20 text-[11px] text-slate-300 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="truncate">
          <strong className="text-sky-300 font-semibold">{t('navAi')}: </strong>
          {getQuickSummary()}
        </span>
      </div>

      {/* 4 Key Weather Metrics in a compact row / 2x2 grid */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {/* Rain Chance */}
        <div className="p-1.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <CloudRain className="w-3 h-3 text-sky-400" />
            <span>{t('rain')}</span>
          </div>
          <div className="text-xs font-bold text-white tabular-nums">{activeRainProb}%</div>
        </div>

        {/* Wind */}
        <div className="p-1.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Wind className="w-3 h-3 text-teal-400" />
            <span>{t('wind')}</span>
          </div>
          <div className="text-xs font-bold text-white tabular-nums">{activeWindSpeed} <span className="text-[9px] font-normal text-slate-400">km/h</span></div>
        </div>

        {/* Humidity */}
        <div className="p-1.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Droplets className="w-3 h-3 text-blue-400" />
            <span>{t('moisture')}</span>
          </div>
          <div className="text-xs font-bold text-white tabular-nums">{activeHumidity}%</div>
        </div>

        {/* Sun Schedule */}
        <div className="p-1.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mb-0.5">
            <Sunrise className="w-3 h-3 text-amber-400" />
            <span>{t('sun')}</span>
          </div>
          <div className="text-[10px] font-bold text-amber-300 truncate">
            {todayForecast?.sunrise ? todayForecast.sunrise.split(' ')[0] : t('daylight')}
          </div>
        </div>
      </div>

      {/* Verified NWP Data Source & Forecast Model Provenance Indicator */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-col xs:flex-row xs:items-center justify-between gap-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="text-slate-400">Data source: </span>
            <span className="font-semibold text-slate-200">{weather.source || 'Open-Meteo'}</span>
            <span className="mx-1 text-slate-600">·</span>
            <span className="text-slate-400">Forecast model: </span>
            <span className="font-semibold text-sky-300">
              {weather.forecastModel || 'ECMWF IFS / NOAA GFS (Open-Meteo Blend)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400 font-mono text-[9px] self-end xs:self-auto">
          <span>Updated: {weather.updated}</span>
        </div>
      </div>
    </div>
  );
};
