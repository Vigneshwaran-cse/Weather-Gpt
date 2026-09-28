import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
} from 'lucide-react';

export function getWeatherIcon(code: number, isDay = true, className = 'w-6 h-6'): React.ReactNode {
  // Clear sky
  if (code === 0) {
    return isDay ? (
      <Sun className={`${className} text-amber-500`} />
    ) : (
      <Moon className={`${className} text-indigo-300`} />
    );
  }

  // Mainly clear / partly cloudy
  if (code === 1 || code === 2) {
    return isDay ? (
      <CloudSun className={`${className} text-amber-400`} />
    ) : (
      <CloudMoon className={`${className} text-slate-300`} />
    );
  }

  // Overcast
  if (code === 3) {
    return <Cloud className={`${className} text-slate-400`} />;
  }

  // Fog
  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-slate-400`} />;
  }

  // Drizzle
  if ([51, 53, 55, 56, 57].includes(code)) {
    return <CloudDrizzle className={`${className} text-sky-400`} />;
  }

  // Rain
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return <CloudRain className={`${className} text-blue-500`} />;
  }

  // Snow
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return <CloudSnow className={`${className} text-indigo-200`} />;
  }

  // Thunderstorm
  if ([95, 96, 99].includes(code)) {
    return <CloudLightning className={`${className} text-amber-500`} />;
  }

  return isDay ? (
    <CloudSun className={`${className} text-slate-400`} />
  ) : (
    <CloudMoon className={`${className} text-slate-400`} />
  );
}
