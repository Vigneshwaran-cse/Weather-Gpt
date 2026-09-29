import React, { useState, useEffect, useRef } from 'react';
import { Map, CloudRain, Wind, Thermometer, Navigation, ExternalLink, Loader2 } from 'lucide-react';
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
  const [mapLoaded, setMapLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const layers = [
    { id: 'radar' as const, label: 'Satellite', icon: CloudRain },
    { id: 'wind' as const, label: 'Wind', icon: Wind },
    { id: 'temp' as const, label: 'Temperature', icon: Thermometer },
  ];

  const { latitude: lat, longitude: lon, name } = currentLocation;

  // Build OpenStreetMap iframe URL — free, keyless, shows the exact location with a pin
  // Using OpenStreetMap embed which is reliable and free
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${(lon - 0.5).toFixed(4)}%2C${(lat - 0.35).toFixed(4)}%2C${(lon + 0.5).toFixed(4)}%2C${(lat + 0.35).toFixed(4)}&layer=mapnik&marker=${lat.toFixed(4)}%2C${lon.toFixed(4)}`;

  // Windy.com embed links for different layers (free, no API key needed for embed)
  const windyLayer = {
    radar: `https://embed.windy.com/embed2.html?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&detailLat=${lat.toFixed(2)}&detailLon=${lon.toFixed(2)}&width=650&height=450&zoom=9&level=surface&overlay=rain&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`,
    wind: `https://embed.windy.com/embed2.html?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&detailLat=${lat.toFixed(2)}&detailLon=${lon.toFixed(2)}&width=650&height=450&zoom=9&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`,
    temp: `https://embed.windy.com/embed2.html?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&detailLat=${lat.toFixed(2)}&detailLon=${lon.toFixed(2)}&width=650&height=450&zoom=9&level=surface&overlay=temp&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`,
  };

  // Reset load state when location or layer changes
  useEffect(() => {
    setMapLoaded(false);
  }, [lat, lon, activeLayer]);

  const openInOSM = () => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=12/${lat}/${lon}`, '_blank');
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden space-y-3 p-0.5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-2.5 sm:p-3 shadow-sm backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Map className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Weather Map</span>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30">
                LIVE
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              {name} · {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
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

      {/* Map Tabs */}
      <div className="flex gap-2 text-[11px] text-slate-400">
        <span className="font-semibold text-teal-400">Windy.com weather overlay — {layers.find(l => l.id === activeLayer)?.label}</span>
        <button onClick={openInOSM} className="ml-auto hover:text-teal-300 flex items-center gap-1 cursor-pointer">
          <ExternalLink className="w-3 h-3" /> Open in OpenStreetMap
        </button>
      </div>

      {/* Windy.com Weather Layer Embed */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 flex-1 min-h-[400px] bg-slate-950">
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-950/80">
            <div className="flex flex-col items-center gap-2 text-teal-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Loading weather map…</span>
            </div>
          </div>
        )}
        <iframe
          key={`${activeLayer}-${lat.toFixed(3)}-${lon.toFixed(3)}`}
          ref={iframeRef}
          src={windyLayer[activeLayer]}
          title={`Weather map — ${name} — ${activeLayer}`}
          width="100%"
          height="100%"
          style={{ minHeight: 400, border: 'none', display: 'block' }}
          allowFullScreen
          onLoad={() => setMapLoaded(true)}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>

      {/* OSM Static Location Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <div className="px-3 py-2 text-[11px] font-semibold text-slate-300 border-b border-slate-800 flex items-center gap-1.5">
          <Map className="w-3 h-3 text-teal-400" />
          Location Map — OpenStreetMap
        </div>
        <iframe
          src={osmUrl}
          title={`Location map — ${name}`}
          width="100%"
          height="260"
          style={{ border: 'none', display: 'block' }}
          allowFullScreen
        />
        <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-800">
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors
        </div>
      </div>

      {/* Route Planner CTA */}
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
