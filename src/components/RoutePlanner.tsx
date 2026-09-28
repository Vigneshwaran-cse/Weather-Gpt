import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  Navigation,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Sparkles,
  RefreshCw,
  X,
  Compass,
  Mic,
  MicOff,
  CloudRain,
  Wind,
  Thermometer,
  ShieldAlert,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import type { RoutePlanResult, RouteOption, RouteWaypointWeather } from '../types';

interface RoutePlannerProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrigin?: string;
  initialDestination?: string;
  initialDepartureTime?: string;
  autoExecute?: boolean;
  embedded?: boolean;
}

// Subcomponent to manage Google Maps polyline drawing & bounds fitting
function RoutePolyline({
  path,
  status,
}: {
  path: Array<{ lat: number; lng: number }>;
  status: 'ROUTE_CLEAR' | 'WEATHER_CAUTION' | 'WEATHER_ALERT';
}) {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !mapsLib || !path || path.length === 0) return;

    // Clean up previous polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const strokeColor =
      status === 'WEATHER_ALERT'
        ? '#ef4444' // Red
        : status === 'WEATHER_CAUTION'
        ? '#f59e0b' // Amber/Yellow
        : '#10b981'; // Emerald Green

    const poly = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity: 0.9,
      strokeWeight: 6,
      map,
    });
    polylineRef.current = poly;

    // Fit map bounds to encompass the entire route
    const googleMaps = (window as any).google?.maps;
    if (googleMaps) {
      const bounds = new googleMaps.LatLngBounds();
      path.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, mapsLib, path, status]);

  return null;
}

export function RoutePlanner({
  isOpen,
  onClose,
  initialOrigin,
  initialDestination,
  initialDepartureTime,
  autoExecute,
  embedded = false,
}: RoutePlannerProps) {
  const { t, language, speechCode } = useLanguage();
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  const [origin, setOrigin] = useState<string>(initialOrigin || 'Chennai');
  const [destination, setDestination] = useState<string>(initialDestination || 'Pondicherry');
  const [departureTime, setDepartureTime] = useState<string>(initialDepartureTime || '');
  const [useNow, setUseNow] = useState<boolean>(!initialDepartureTime);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<RoutePlanResult | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [selectedWaypoint, setSelectedWaypoint] = useState<RouteWaypointWeather | null>(null);

  // Speech Recognition state for destination input
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Quick destination suggestions
  const popularDestinations = [
    'Pondicherry',
    'Mahabalipuram',
    'Bengaluru',
    'Tirupati',
    'Coimbatore',
  ];

  // Update inputs if props change
  useEffect(() => {
    if (initialOrigin) setOrigin(initialOrigin);
    if (initialDestination) setDestination(initialDestination);
    if (initialDepartureTime) {
      setDepartureTime(initialDepartureTime);
      setUseNow(false);
    }
  }, [initialOrigin, initialDestination, initialDepartureTime]);

  // Execute search
  const handleCheckRoute = async (overrideOrigin?: string, overrideDest?: string) => {
    const originToUse = (overrideOrigin ?? origin).trim();
    const destToUse = (overrideDest ?? destination).trim();

    if (!originToUse || !destToUse) {
      setErrorMessage(t('routeError'));
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSelectedWaypoint(null);

    try {
      const departurePayload = useNow ? undefined : departureTime || undefined;

      const res = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: originToUse,
          destination: destToUse,
          departureTime: departurePayload,
          language: language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t('routeError'));
      }

      const data: RoutePlanResult = await res.json();
      setRouteResult(data);
      setSelectedRouteIndex(0);
    } catch (err: any) {
      console.error('Route calculation error:', err);
      setErrorMessage(err.message || t('routeError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger autoExecute if requested
  useEffect(() => {
    if ((isOpen || embedded) && autoExecute && (initialOrigin || origin) && (initialDestination || destination)) {
      handleCheckRoute();
    }
  }, [isOpen, embedded, autoExecute]);

  // Geolocation for Starting Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        setErrorMessage('Location permission denied or unavailable.');
      }
    );
  };

  // Voice input handler for destination
  const handleToggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(t('voiceUnsupported'));
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = speechCode || 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const cleaned = transcript.replace(/[.,?!]+$/, '').trim();
          setDestination(cleaned);
        }
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    }
  };

  if (!isOpen && !embedded) return null;

  const activeRoute: RouteOption | null =
    routeResult && routeResult.routes && routeResult.routes[selectedRouteIndex]
      ? routeResult.routes[selectedRouteIndex]
      : null;

  const content = (
    <div className={`relative w-full bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl ${embedded ? '' : 'max-h-[92vh] my-auto max-w-5xl'}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              {t('routePlannerTitle')}
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30">
                Google Maps + Open-Meteo
              </span>
            </h2>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t('routePlannerSubtitle')}
            </p>
          </div>
        </div>
        {!embedded && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            aria-label={t('close')}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Input Controls Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
            {/* Origin */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>{t('origin')}</span>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-normal lowercase tracking-normal cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  {t('useCurrentLocation')}
                </button>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder={t('enterOriginPlaceholder')}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Destination */}
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('destination')}
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-400" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder={t('enterDestinationPlaceholder')}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition cursor-pointer ${
                    isListening
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  title={isListening ? t('stopListening') : t('voiceSearch')}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-teal-400" />}
                </button>
              </div>
            </div>

            {/* Departure Selector */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                {t('departureTime')}
              </label>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="useNowCheck"
                    checked={useNow}
                    onChange={(e) => setUseNow(e.target.checked)}
                    className="rounded border-slate-700 text-teal-500 focus:ring-teal-500"
                  />
                  <label htmlFor="useNowCheck" className="text-xs text-slate-300 cursor-pointer">
                    {t('leaveNow')}
                  </label>
                </div>
                {!useNow && (
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
                  />
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => handleCheckRoute()}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="truncate">{t('calculatingRoute')}</span>
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    <span className="truncate">{t('checkRouteWeather')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Destination Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">
              {t('popularDestinations')}:
            </span>
            {popularDestinations.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => {
                  setDestination(city);
                  handleCheckRoute(origin, city);
                }}
                className="text-xs px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition cursor-pointer"
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{t('unableToAnalyzeRoute')}</p>
              <p className="text-xs text-rose-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Results View */}
        {routeResult && activeRoute && (
          <div className="space-y-5">
            {/* Route Alternatives Selection Tabs */}
            {routeResult.routes.length > 1 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {t('alternativeRoutes')}:
                  </span>
                  {routeResult.routes.map((rt, idx) => {
                    const isSelected = selectedRouteIndex === idx;
                    const badgeColor =
                      rt.status === 'WEATHER_ALERT'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : rt.status === 'WEATHER_CAUTION'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => {
                          setSelectedRouteIndex(idx);
                          setSelectedWaypoint(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 text-white border-teal-500 ring-2 ring-teal-500/20'
                            : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span>{rt.name}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] border ${badgeColor}`}>
                          {rt.status === 'WEATHER_ALERT'
                            ? t('routeStatusAlert')
                            : rt.status === 'WEATHER_CAUTION'
                            ? t('routeStatusCaution')
                            : t('routeStatusClear')}
                        </span>
                        <span className="text-slate-400">· {rt.durationFormatted}</span>
                      </button>
                    );
                  })}
                </div>

                {routeResult.alternativeComparison && (
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <p>{routeResult.alternativeComparison}</p>
                  </div>
                )}
              </div>
            )}

            {/* OVERALL ROUTE STATUS BANNER */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                activeRoute.status === 'WEATHER_ALERT'
                  ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  : activeRoute.status === 'WEATHER_CAUTION'
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <div
                  className={`p-3 rounded-xl ${
                    activeRoute.status === 'WEATHER_ALERT'
                      ? 'bg-rose-500/20 text-rose-400'
                      : activeRoute.status === 'WEATHER_CAUTION'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}
                >
                  {activeRoute.status === 'WEATHER_ALERT' ? (
                    <AlertOctagon className="w-6 h-6" />
                  ) : activeRoute.status === 'WEATHER_CAUTION' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    {activeRoute.status === 'WEATHER_ALERT'
                      ? `🔴 ${t('routeAlertTitle')}`
                      : activeRoute.status === 'WEATHER_CAUTION'
                      ? `🟡 ${t('routeCautionTitle')}`
                      : `🟢 ${t('routeClearTitle')}`}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                    {activeRoute.status === 'WEATHER_ALERT'
                      ? t('routeAlertDesc')
                      : activeRoute.status === 'WEATHER_CAUTION'
                      ? t('routeCautionDesc')
                      : t('routeClearDesc')}
                  </p>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex items-center gap-3 text-xs bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800 self-start sm:self-auto font-mono">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase">{t('distance')}</p>
                  <p className="font-bold text-white">{activeRoute.distanceKm} km</p>
                </div>
                <div className="h-6 w-[1px] bg-slate-800" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase">{t('duration')}</p>
                  <p className="font-bold text-white">{activeRoute.durationFormatted}</p>
                </div>
                <div className="h-6 w-[1px] bg-slate-800" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase">{t('rain')}</p>
                  <p className="font-bold text-white">{activeRoute.highestRainProbability}%</p>
                </div>
              </div>
            </div>

            {/* INTERACTIVE GOOGLE MAP */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900">
              <APIProvider apiKey={apiKey} libraries={['routes', 'geometry']}>
                <Map
                  mapId="DEMO_MAP_ID"
                  defaultCenter={{
                    lat: routeResult.origin.latitude,
                    lng: routeResult.origin.longitude,
                  }}
                  defaultZoom={8}
                  gestureHandling="greedy"
                  fullscreenControl={true}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: embedded ? '460px' : '420px' }}
                >
                  <RoutePolyline path={activeRoute.path} status={activeRoute.status} />

                  {activeRoute.waypoints.map((wp, index) => {
                    const isSelected = selectedWaypoint?.id === wp.id;
                    const isOrigin = index === 0;
                    const isDest = index === activeRoute.waypoints.length - 1;

                    const pinBg =
                      wp.status === 'alert'
                        ? 'bg-rose-500 ring-rose-500/40 text-white'
                        : wp.status === 'caution'
                        ? 'bg-amber-500 ring-amber-500/40 text-slate-950 font-bold'
                        : 'bg-emerald-500 ring-emerald-500/40 text-white';

                    return (
                      <AdvancedMarker
                        key={wp.id}
                        position={{ lat: wp.latitude, lng: wp.longitude }}
                        onClick={() => setSelectedWaypoint(wp)}
                      >
                        <div
                          className={`group relative flex items-center justify-center cursor-pointer transition transform hover:scale-110 ${
                            isSelected ? 'scale-125 z-30' : 'z-10'
                          }`}
                        >
                          <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full shadow-lg ring-4 text-xs font-semibold ${pinBg}`}
                          >
                            {isOrigin ? (
                              <MapPin className="w-3.5 h-3.5" />
                            ) : isDest ? (
                              <Navigation className="w-3.5 h-3.5" />
                            ) : wp.status === 'alert' ? (
                              <AlertOctagon className="w-3.5 h-3.5" />
                            ) : wp.status === 'caution' ? (
                              <AlertTriangle className="w-3.5 h-3.5" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span className="font-bold">{wp.temperature}°</span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            </div>

            {/* AI DRIVING ADVICE */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-teal-300 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>{t('aiTravelRecommendation')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {routeResult.aiRecommendation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer info notice */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span>
            {t('groundedNoticeFooter')}
          </span>
        </div>
        {!embedded && (
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
          >
            {t('close')}
          </button>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      {content}
    </div>
  );
}
