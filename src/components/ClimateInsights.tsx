import React, { useState } from 'react';
import {
  TrendingUp,
  CloudRain,
  Wind,
  Droplets,
  Sun,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { VerifiedWeatherData, HourlyForecast } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface ClimateInsightsProps {
  weather: VerifiedWeatherData;
}

export const ClimateInsights: React.FC<ClimateInsightsProps> = ({ weather }) => {
  const { t } = useLanguage();
  const { hourly, daily, location } = weather;
  const hours = hourly.slice(0, 24);

  const [hoveredHourIndex, setHoveredHourIndex] = useState<number | null>(null);

  // Calculate min and max temperatures for scaling SVG
  const temps = hours.map((h) => h.temperature);
  const minTemp = Math.min(...temps, 10);
  const maxTemp = Math.max(...temps, 35);
  const tempRange = Math.max(maxTemp - minTemp, 1);

  // SVG dimensions
  const svgWidth = 720;
  const svgHeight = 160;
  const paddingX = 20;
  const paddingY = 25;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Build points for temperature curve
  const points = hours.map((h, i) => {
    const x = paddingX + (i / Math.max(hours.length - 1, 1)) * chartWidth;
    const y = svgHeight - paddingY - ((h.temperature - minTemp) / tempRange) * chartHeight;
    return { x, y, hour: h };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x},${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1]?.x || 0},${svgHeight - paddingY} L ${points[0]?.x || 0},${svgHeight - paddingY} Z`;

  const activeHover = hoveredHourIndex !== null ? hours[hoveredHourIndex] : null;

  return (
    <div className="space-y-6">
      {/* Primary Climate Card */}
      <div className="rounded-3xl bg-slate-900/80 border border-slate-800/90 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {t('climateIntelligenceTitle')}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('climateHourlyPatterns', { location: location.name })}
            </p>
          </div>

          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-xl border border-emerald-900/40">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('empiricalTelemetry')}
          </span>
        </div>

        {/* 1. 24-Hour Temperature Curve Chart */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>{t('tempTrajectory')}</span>
            </div>
            {activeHover ? (
              <span className="text-sky-300 font-mono font-medium">
                {activeHover.formattedHour || activeHover.hour}:{' '}
                <strong className="text-white">{activeHover.temperature}°C</strong> ({t('feelsLike')} {activeHover.apparentTemperature}°C)
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-[11px]">{t('hoverToInspect')}</span>
            )}
          </div>

          {/* SVG Line / Area Chart */}
          <div className="relative w-full overflow-x-auto scrollbar-none">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-44 sm:h-48 overflow-visible"
            >
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={svgWidth - paddingX}
                y2={paddingY}
                stroke="#334155"
                strokeDasharray="4 4"
                strokeWidth="0.8"
              />
              <line
                x1={paddingX}
                y1={svgHeight - paddingY}
                x2={svgWidth - paddingX}
                y2={svgHeight - paddingY}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Area fill */}
              <path d={areaD} fill="url(#tempGradient)" />

              {/* Spline Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Interactive Points */}
              {points.map((pt, idx) => {
                const isHovered = hoveredHourIndex === idx;
                const isKeyHour = idx % 4 === 0 || idx === points.length - 1;

                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredHourIndex(idx)}
                    onMouseLeave={() => setHoveredHourIndex(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 6 : isKeyHour ? 3.5 : 2}
                      className={`transition-all duration-150 ${
                        isHovered
                          ? 'fill-white stroke-sky-400 stroke-2'
                          : 'fill-sky-400 stroke-slate-900 stroke-1'
                      }`}
                    />
                    {isKeyHour && (
                      <text
                        x={pt.x}
                        y={svgHeight - 6}
                        textAnchor="middle"
                        className="text-[10px] fill-slate-500 font-mono"
                      >
                        {pt.hour.formattedHour || pt.hour.hour}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* 2. Precipitation Probability & Rain Volume Bars */}
        <div className="mt-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs mb-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <CloudRain className="w-4 h-4 text-blue-400" />
              <span>{t('precipLikelihoodTitle')}</span>
            </div>
            <span className="text-slate-400 text-[11px] font-mono">{t('horizon24Hour')}</span>
          </div>

          <div className="grid grid-cols-12 sm:grid-cols-24 gap-1 sm:gap-1.5 items-end h-28 pt-4">
            {hours.map((h, i) => {
              const prob = h.rainProbability;
              const barHeight = Math.max(prob, 4);

              return (
                <div
                  key={i}
                  className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  title={`${h.formattedHour || h.hour}: ${prob}% ${t('rain')} (${h.precipitation} mm)`}
                >
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      prob > 50
                        ? 'bg-rose-500 group-hover:bg-rose-400'
                        : prob > 25
                        ? 'bg-amber-400 group-hover:bg-amber-300'
                        : 'bg-sky-500/70 group-hover:bg-sky-400'
                    }`}
                    style={{ height: `${barHeight}%` }}
                  />
                  <span className="text-[9px] text-slate-500 font-mono mt-1 hidden sm:block">
                    {i % 4 === 0 ? h.hour.split(':')[0] : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Climate Telemetry Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Droplets className="w-4 h-4 text-blue-400" />
              <span>{t('atmosphericHumidityProfile')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">
              {weather.current.humidity}%
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('humidityInsight')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Wind className="w-4 h-4 text-teal-400" />
              <span>{t('windDynamics')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">
              {weather.current.windSpeed} km/h
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('windInsight', { dir: weather.current.windDirection })}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>{t('solarRadiation')}</span>
            </div>
            <div className="text-xl font-bold text-white tabular-nums mt-1">
              {weather.current.uvIndex ?? 6.2} {t('uvIndex')}
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('solarInsight')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
