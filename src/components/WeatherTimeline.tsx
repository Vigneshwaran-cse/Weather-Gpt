import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plane,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Sparkles,
  Loader2,
  Clock,
} from 'lucide-react';
import { HourlyForecast, LocationData } from '../types';
import { getWeatherIcon } from '../utils/weatherIcons';
import { fetchHourlyExplanation } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface WeatherTimelineProps {
  hourly: HourlyForecast[];
  location: LocationData;
  onHourSelect?: (hourData: HourlyForecast) => void;
}

export const WeatherTimeline: React.FC<WeatherTimelineProps> = ({
  hourly,
  location,
  onHourSelect,
}) => {
  const { t, tCondition, language } = useLanguage();
  const hours = hourly.slice(0, 24);

  const [selectedHour, setSelectedHour] = useState<number>(() => {
    const currentHour = new Date().getHours();
    return Math.min(Math.max(currentHour, 0), hours.length > 0 ? hours.length - 1 : 23);
  });

  const [explanationsCache, setExplanationsCache] = useState<{ [hour: number]: string }>({});
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setExplanationsCache({});
  }, [language]);

  const activeHourData: HourlyForecast | undefined = hours[selectedHour] || hours[0];

  useEffect(() => {
    if (activeHourData && onHourSelect) {
      onHourSelect(activeHourData);
    }
  }, [activeHourData, onHourSelect]);

  const formatHourDisplay = (hourIdx: number) => {
    const h = hours[hourIdx];
    if (h?.formattedHour) return h.formattedHour;
    const hourNum = hourIdx % 24;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
    return `${displayHour} ${ampm}`;
  };

  const triggerExplanationFetch = useCallback(
    (hourIdx: number, hourData: HourlyForecast) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (explanationsCache[hourIdx]) {
        return;
      }

      setIsLoadingExplanation(true);

      debounceTimerRef.current = setTimeout(async () => {
        try {
          const explanation = await fetchHourlyExplanation(location.name, hourData, language);
          setExplanationsCache((prev) => ({
            ...prev,
            [hourIdx]: explanation,
          }));
        } catch (err) {
          console.error('Explanation fetch failed:', err);
        } finally {
          setIsLoadingExplanation(false);
        }
      }, 400);
    },
    [location.name, explanationsCache, language]
  );

  useEffect(() => {
    if (activeHourData) {
      triggerExplanationFetch(selectedHour, activeHourData);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedHour, activeHourData, triggerExplanationFetch]);

  const handleSelectHour = (idx: number) => {
    setSelectedHour(idx);
    if (scrollContainerRef.current) {
      const card = scrollContainerRef.current.children[idx] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  };

  const handlePrevHour = () => {
    handleSelectHour(Math.max(0, selectedHour - 1));
  };

  const handleNextHour = () => {
    handleSelectHour(Math.min(hours.length - 1, selectedHour + 1));
  };

  return (
    <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-2.5 sm:p-3 shadow-md backdrop-blur-xl">
      {/* Header with Title & Quick Controls */}
      <div className="flex items-center justify-between gap-2 mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-sky-400 transform -rotate-45" />
          <h2 className="text-xs font-bold text-white tracking-tight">
            {t('timelineTitle') || '24-Hour Forecast'}
          </h2>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 bg-slate-800/60 border border-slate-700/60 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={handlePrevHour}
            disabled={selectedHour === 0}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700/60 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
            aria-label={t('previousHour')}
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-bold text-white px-1 font-mono">
            {formatHourDisplay(selectedHour)}
          </span>
          <button
            type="button"
            onClick={handleNextHour}
            disabled={selectedHour >= hours.length - 1}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-700/60 disabled:opacity-30 text-slate-300 transition-colors cursor-pointer"
            aria-label={t('nextHour')}
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Horizontally Scrollable 24-Hour Cards */}
      <div
        ref={scrollContainerRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5 snap-x focus:outline-none"
        tabIndex={0}
      >
        {hours.map((h, idx) => {
          const isSelected = idx === selectedHour;
          const isNow = idx === new Date().getHours();
          const hourNum = h.hourNumber ?? idx;
          const isDay = hourNum >= 6 && hourNum < 18;

          return (
            <button
              key={`${h.time}-${idx}`}
              type="button"
              onClick={() => handleSelectHour(idx)}
              className={`snap-center shrink-0 min-w-[54px] py-1.5 px-1 rounded-xl border flex flex-col items-center justify-between text-center transition-all cursor-pointer select-none active:scale-95 ${
                isSelected
                  ? 'bg-sky-500/20 border-sky-400 text-white shadow-xs'
                  : 'bg-slate-800/50 border-slate-800 text-slate-300'
              }`}
            >
              <span className={`text-[10px] font-bold whitespace-nowrap ${isSelected ? 'text-sky-300' : 'text-slate-400'}`}>
                {isNow && idx === selectedHour ? t('now') : formatHourDisplay(idx)}
              </span>

              <div className="my-0.5 flex items-center justify-center text-sky-400">
                {getWeatherIcon(h.weatherCode, isDay, 'w-5 h-5')}
              </div>

              <span className="text-xs font-bold text-white tabular-nums">
                {Math.round(h.temperature)}°
              </span>

              <div className="flex items-center gap-0.5 text-[9px] text-sky-400 font-medium">
                <CloudRain className="w-2 h-2" />
                <span>{h.rainProbability}%</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Hour Insight Strip */}
      {activeHourData && (
        <div className="mt-1.5 p-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
            <span className="font-bold text-white shrink-0 font-mono">
              {formatHourDisplay(selectedHour)}:
            </span>
            <span className="truncate">
              {explanationsCache[selectedHour] ||
                `${activeHourData.temperature}°C, ${tCondition(activeHourData.condition)}, ${activeHourData.rainProbability}% ${t('rain')}.`}
            </span>
          </div>

          {isLoadingExplanation && (
            <Loader2 className="w-3 h-3 animate-spin text-sky-400 shrink-0" />
          )}
        </div>
      )}
    </div>
  );
};
