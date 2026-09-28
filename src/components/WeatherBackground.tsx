import React, { useEffect, useRef, useMemo } from 'react';

export interface WeatherBackgroundProps {
  weatherCode?: number;
  isDay?: boolean;
  temperature?: number;
  precipitation?: number;
  rainProbability?: number;
  conditionText?: string;
}

export type WeatherAtmosphere =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy-day'
  | 'partly-cloudy-night'
  | 'cloudy'
  | 'drizzle'
  | 'rain'
  | 'thunderstorm'
  | 'fog';

export const WeatherBackground: React.FC<WeatherBackgroundProps> = ({
  weatherCode = 0,
  isDay = true,
  temperature = 28,
  precipitation = 0,
  rainProbability = 0,
  conditionText = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine active atmosphere type based on real Open-Meteo inputs
  const atmosphere: WeatherAtmosphere = useMemo(() => {
    if (weatherCode >= 95 || conditionText.toLowerCase().includes('thunderstorm')) {
      return 'thunderstorm';
    }
    if (weatherCode === 45 || weatherCode === 48 || conditionText.toLowerCase().includes('fog')) {
      return 'fog';
    }
    if ((weatherCode >= 51 && weatherCode <= 57) || conditionText.toLowerCase().includes('drizzle')) {
      return 'drizzle';
    }
    if (
      (weatherCode >= 61 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 82) ||
      conditionText.toLowerCase().includes('rain') ||
      precipitation >= 0.8
    ) {
      return 'rain';
    }
    if (weatherCode === 3 || conditionText.toLowerCase().includes('overcast')) {
      return 'cloudy';
    }
    if (
      weatherCode === 1 ||
      weatherCode === 2 ||
      conditionText.toLowerCase().includes('partly')
    ) {
      return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
    }
    return isDay ? 'clear-day' : 'clear-night';
  }, [weatherCode, isDay, precipitation, conditionText]);

  const rainIntensity = useMemo<'light' | 'moderate' | 'heavy'>(() => {
    if (atmosphere === 'drizzle') return 'light';
    if (atmosphere === 'thunderstorm') return 'heavy';
    if (precipitation > 4.0 || rainProbability > 75) return 'heavy';
    if (precipitation > 1.2 || rainProbability > 40) return 'moderate';
    return 'light';
  }, [atmosphere, precipitation, rainProbability]);

  const isHighHeat = isDay && atmosphere === 'clear-day' && temperature >= 34;

  // Background Gradient Map - Deep Navy & Midnight Blue Palette with Meteorological Accents
  const gradientClass = useMemo(() => {
    switch (atmosphere) {
      case 'clear-day':
        return isHighHeat
          ? 'from-slate-950 via-slate-900 to-amber-950/40'
          : 'from-slate-950 via-slate-900 to-sky-950/50';
      case 'clear-night':
        return 'from-slate-950 via-slate-900 to-indigo-950/80';
      case 'partly-cloudy-day':
        return 'from-slate-950 via-slate-900 to-blue-950/40';
      case 'partly-cloudy-night':
        return 'from-slate-950 via-slate-900 to-slate-950';
      case 'cloudy':
        return 'from-slate-950 via-slate-900 to-slate-800/60';
      case 'drizzle':
        return 'from-slate-950 via-slate-900 to-sky-950/60';
      case 'rain':
        return 'from-slate-950 via-slate-900 to-cyan-950/70';
      case 'thunderstorm':
        return 'from-slate-950 via-slate-900 to-purple-950/80';
      case 'fog':
        return 'from-slate-950 via-slate-900 to-slate-800/80';
      default:
        return 'from-slate-950 via-slate-900 to-indigo-950';
    }
  }, [atmosphere, isHighHeat]);

  // Rain / Drizzle Particle Animation Canvas
  useEffect(() => {
    const isRainy = atmosphere === 'rain' || atmosphere === 'drizzle' || atmosphere === 'thunderstorm';
    if (!isRainy) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const dropCount = rainIntensity === 'heavy' ? 140 : rainIntensity === 'moderate' ? 80 : 40;
    const drops: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      opacity: number;
      windSlant: number;
    }> = [];

    const baseSlant = atmosphere === 'thunderstorm' ? 3.5 : 1.2;

    for (let i = 0; i < dropCount; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * (rainIntensity === 'heavy' ? 18 : 12) + 8,
        speed: Math.random() * (rainIntensity === 'heavy' ? 14 : 9) + 6,
        opacity: Math.random() * 0.4 + 0.15,
        windSlant: baseSlant + (Math.random() * 1.5 - 0.75),
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.windSlant, d.y + d.length);
        ctx.strokeStyle = `rgba(56, 189, 248, ${d.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();

        d.y += d.speed;
        d.x += d.windSlant;

        if (d.y > height) {
          d.y = -d.length;
          d.x = Math.random() * width;
        }
        if (d.x > width) {
          d.x = 0;
        } else if (d.x < 0) {
          d.x = width;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [atmosphere, rainIntensity]);

  // Night Stars Generation
  const stars = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 65}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      delay: `${Math.random() * 3}s`,
      duration: `${Math.random() * 2 + 2}s`,
    }));
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none transition-colors duration-1000 ease-out"
    >
      {/* 1. Base Deep Sky Gradient with smooth transition */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${gradientClass} transition-all duration-1000 ease-in-out`}
      />

      {/* 2. CLEAR / SUNNY DAY ATMOSPHERE */}
      {(atmosphere === 'clear-day' || atmosphere === 'partly-cloudy-day') && (
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
          {/* Glowing Sun Core & Radiant Halo */}
          <div className="absolute top-6 right-8 sm:top-12 sm:right-28">
            {/* Outer solar corona */}
            <div className="absolute -inset-16 sm:-inset-24 rounded-full bg-gradient-to-r from-amber-500/20 via-sky-500/10 to-transparent blur-3xl animate-sun-pulse pointer-events-none" />

            {/* Rotating sun ray aura */}
            <div
              className="w-48 h-48 sm:w-72 sm:h-72 rounded-full opacity-40 animate-sun-rotate"
              style={{
                background:
                  'radial-gradient(circle, rgba(56,189,248,0.25) 0%, rgba(245,158,11,0.15) 50%, transparent 75%)',
              }}
            />

            {/* Subtle celestial disc */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-400/80 via-yellow-200/80 to-white/90 shadow-[0_0_50px_rgba(245,158,11,0.5)] border border-amber-200/40" />
          </div>

          {isHighHeat && (
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-amber-500/10 to-transparent animate-heat-haze pointer-events-none blur-xs" />
          )}
        </div>
      )}

      {/* 3. NIGHT ATMOSPHERE */}
      {(atmosphere === 'clear-night' || atmosphere === 'partly-cloudy-night') && (
        <div className="absolute inset-0 overflow-hidden">
          {stars.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full bg-white animate-star-twinkle opacity-70"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay,
                animationDuration: star.duration,
                boxShadow: '0 0 4px rgba(255,255,255,0.7)',
              }}
            />
          ))}

          {/* Glowing Crescent Moon */}
          <div className="absolute top-8 right-12 sm:top-14 sm:right-28">
            <div className="absolute -inset-10 rounded-full bg-indigo-500/15 blur-xl animate-sun-pulse" />
            <div className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-gradient-to-tr from-slate-200 to-indigo-100 shadow-[0_0_35px_rgba(165,180,252,0.5)] flex items-center justify-center overflow-hidden">
              <div className="absolute -top-1 -right-1 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-950/90" />
            </div>
          </div>
        </div>
      )}

      {/* 4. CLOUD LAYERS */}
      {(atmosphere === 'partly-cloudy-day' ||
        atmosphere === 'partly-cloudy-night' ||
        atmosphere === 'cloudy' ||
        atmosphere === 'drizzle' ||
        atmosphere === 'rain' ||
        atmosphere === 'thunderstorm' ||
        atmosphere === 'fog') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-10 -left-1/4 w-[150%] h-80 sm:h-96 opacity-25 text-slate-800 animate-cloud-slow"
          >
            <svg
              className="w-full h-full fill-current filter drop-shadow-md"
              viewBox="0 0 1200 400"
              preserveAspectRatio="none"
            >
              <path d="M0,280 Q150,160 320,240 Q450,100 620,220 Q780,120 950,230 Q1100,140 1200,260 L1200,400 L0,400 Z" />
            </svg>
          </div>

          <div
            className="absolute top-10 -right-1/4 w-[150%] h-72 sm:h-96 opacity-30 text-slate-900 animate-cloud-fast"
          >
            <svg
              className="w-full h-full fill-current filter drop-shadow-lg"
              viewBox="0 0 1200 350"
              preserveAspectRatio="none"
            >
              <path d="M0,220 Q200,80 400,200 Q580,60 800,180 Q1000,90 1200,210 L1200,350 L0,350 Z" />
            </svg>
          </div>
        </div>
      )}

      {/* 5. FOG / MIST LAYERS */}
      {atmosphere === 'fog' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 bottom-20 h-72 bg-gradient-to-r from-slate-900/40 via-slate-800/60 to-slate-900/40 blur-2xl animate-fog-1" />
          <div className="absolute inset-x-0 top-32 h-64 bg-gradient-to-r from-slate-800/30 via-slate-900/50 to-slate-800/30 blur-2xl animate-fog-2" />
        </div>
      )}

      {/* 6. THUNDERSTORM SHEET LIGHTNING FLASH */}
      {atmosphere === 'thunderstorm' && (
        <div className="absolute inset-0 bg-indigo-500/10 animate-lightning pointer-events-none" />
      )}

      {/* 7. RAIN / DRIZZLE CANVAS PARTICLES */}
      {(atmosphere === 'rain' || atmosphere === 'drizzle' || atmosphere === 'thunderstorm') && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      {/* 8. Translucent Ambient Overlay for Readability */}
      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
    </div>
  );
};
