import React from 'react';
import { Calendar, CloudRain } from 'lucide-react';
import { DailyForecast } from '../types';
import { getWeatherIcon } from '../utils/weatherIcons';
import { useLanguage } from '../i18n/LanguageContext';

interface ForecastSectionProps {
  daily: DailyForecast[];
  source: string;
  forecastModel?: string;
}

export const ForecastSection: React.FC<ForecastSectionProps> = ({ daily, source, forecastModel }) => {
  const { t, tCondition } = useLanguage();

  const formatDayLabel = (dayOfWeek: string, idx: number) => {
    if (idx === 0) return t('today') || 'Today';
    if (idx === 1) return t('tomorrow') || 'Tomorrow';
    const d = dayOfWeek.toLowerCase();
    if (d.startsWith('mon')) return t('mon') || 'Mon';
    if (d.startsWith('tue')) return t('tue') || 'Tue';
    if (d.startsWith('wed')) return t('wed') || 'Wed';
    if (d.startsWith('thu')) return t('thu') || 'Thu';
    if (d.startsWith('fri')) return t('fri') || 'Fri';
    if (d.startsWith('sat')) return t('sat') || 'Sat';
    if (d.startsWith('sun')) return t('sunDay') || 'Sun';
    return dayOfWeek.slice(0, 3);
  };

  return (
    <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-2.5 sm:p-3 shadow-md backdrop-blur-xl">
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <h2 className="text-xs font-bold text-white tracking-tight">
            {t('forecastTitle') || '7-Day Forecast'}
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <span className="text-sky-300 font-medium">
            {forecastModel ? forecastModel.split('(')[0].trim() : 'ECMWF/GFS'}
          </span>
          <span className="text-slate-600">·</span>
          <span>{source || 'Open-Meteo'}</span>
        </div>
      </div>

      {/* Horizontal Forecast Strip/Carousel */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {daily.map((day, idx) => {
          const isToday = idx === 0;

          return (
            <div
              key={day.date}
              className={`shrink-0 min-w-[58px] py-1.5 px-1.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                isToday
                  ? 'bg-sky-500/15 border-sky-500/40 text-white'
                  : 'bg-slate-800/50 border-slate-800/80 text-slate-300'
              }`}
            >
              {/* Day Label */}
              <span className={`text-[10px] font-bold ${isToday ? 'text-sky-300' : 'text-slate-300'}`}>
                {formatDayLabel(day.dayOfWeek, idx)}
              </span>

              {/* Weather Icon */}
              <div className="my-1 text-sky-400 flex items-center justify-center">
                {getWeatherIcon(day.weatherCode, true, 'w-5 h-5')}
              </div>

              {/* Temp High / Low */}
              <div className="text-[10px] font-bold text-white tabular-nums">
                {Math.round(day.tempMax)}° <span className="font-normal text-slate-400">{Math.round(day.tempMin)}°</span>
              </div>

              {/* Rain Chance */}
              <div className="flex items-center gap-0.5 text-[9px] text-sky-400 font-medium mt-0.5">
                <CloudRain className="w-2.5 h-2.5" />
                <span>{day.rainProbabilityMax}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
