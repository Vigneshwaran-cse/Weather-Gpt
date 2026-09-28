import React, { useState } from 'react';
import { Map, CloudRain, Wind, Thermometer, Layers, Navigation, ExternalLink } from 'lucide-react';
import { LocationData } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface MapWeatherViewProps {
  currentLocation: LocationData;
  onOpenRoutePlanner?: () => void;
}

export const MapWeatherView: React.FC<MapWeatherViewProps> = ({
  currentLocation,
  onOpenRoutePlanner,
}) => {
  const { t } = useLanguage();
  const [activeLayer, setActiveLayer] = useState<'radar' | 'wind' | 'temp'>('radar');

  const layers = [
    { id: 'radar' as const, label: t('radarLayer'), icon: CloudRain },
    { id: 'wind' as const, label: t('windLayer'), icon: Wind },
    { id: 'temp' as const, label: t('thermalLayer'), icon: Thermometer },
  ];

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden space-y-2 p-0.5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-2.5 sm:p-3 shadow-sm backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Map className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>{t('weatherMapRadarTitle')}</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                {t('slotReady')}
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              {t('mapOverlaysFor', { location: currentLocation.name })}
            </p>
          </div>
        </div>

        {/* Layer selector tabs */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
          {layers.map((layer) => {
            const isActive = activeLayer === layer.id;
            const Icon = layer.icon;

            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => setActiveLayer(layer.id)}
                className={`h-6 px-2 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Canvas Visual Placeholder (Flex-1 fills remaining available height!) */}
      <div className="flex-1 min-h-[140px] relative rounded-2xl bg-slate-950/80 border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-3 text-center shadow-inner">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 max-w-xs flex flex-col items-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-teal-400 mb-2 shadow-md">
            <Layers className="w-5 h-5" />
          </div>

          <h3 className="font-bold text-xs text-white">
            {t('googleMapsOverlaySlot')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {currentLocation.name} ({currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°)
          </p>

          <span className="mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-teal-400">
            {t('activeLayerLabel', { layer: activeLayer.toUpperCase() })}
          </span>
        </div>
      </div>

      {/* Connection to Route Planner */}
      {onOpenRoutePlanner && (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Navigation className="w-4 h-4 text-teal-400 shrink-0" />
            <div className="truncate">
              <div className="font-bold text-xs text-white truncate">{t('launchRouteMap')}</div>
              <div className="text-[10px] text-slate-300 truncate">{t('launchRouteMapDesc')}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenRoutePlanner}
            className="h-7 px-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[11px] rounded-lg transition flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>{t('open')}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
