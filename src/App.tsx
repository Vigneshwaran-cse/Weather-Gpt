/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { MobileBottomNav, NavItem } from './components/MobileBottomNav';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { WeatherTimeline } from './components/WeatherTimeline';
import { ForecastSection } from './components/ForecastSection';
import { WeatherAlertCard } from './components/WeatherAlertCard';
import { AiChatSection } from './components/AiChatSection';
import { IntelligenceDashboard } from './components/IntelligenceDashboard';
import { WeatherBackground } from './components/WeatherBackground';
import { RoutePlanner } from './components/RoutePlanner';
import { ClimateInsights } from './components/ClimateInsights';
import { OccupationalView } from './components/OccupationalView';
import { SavedLocationsView } from './components/SavedLocationsView';
import { MapWeatherView } from './components/MapWeatherView';
import { AccessibilityView } from './components/AccessibilityView';
import { FarmerModeDashboard } from './components/FarmerModeDashboard';
import { LocationData, VerifiedWeatherData, HourlyForecast } from './types';
import { fetchWeather, reverseGeocode } from './services/api';
import { AlertCircle, RefreshCw, Sparkles, CloudSun, ShieldCheck } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

const INITIAL_LOCATION: LocationData = {
  name: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  latitude: 13.0827,
  longitude: 80.2707,
};

export default function App() {
  const { t } = useLanguage();

  // Navigation dock state: default is 'ai' (Main WeatherGPT Chatbot as central feature)
  const [activeNav, setActiveNav] = useState<NavItem>('ai');

  // Weather Overview toggle (allows viewing full weather dashboard, timeline, forecast)
  const [showWeatherDashboard, setShowWeatherDashboard] = useState<boolean>(false);

  // Dedicated Farmer Mode active state
  const [isFarmerModeActive, setIsFarmerModeActive] = useState<boolean>(false);
  const [showLegacyChat, setShowLegacyChat] = useState<boolean>(false);

  // Initialize from localStorage if previous location was saved
  const [currentLocation, setCurrentLocation] = useState<LocationData>(() => {
    try {
      const saved = localStorage.getItem('weathergpt_current_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name && parsed?.latitude && parsed?.longitude) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_LOCATION;
  });

  const [weatherData, setWeatherData] = useState<VerifiedWeatherData | null>(null);
  const [selectedHourForecast, setSelectedHourForecast] = useState<HourlyForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatic one-time current location detection without repeated prompts
  useEffect(() => {
    const hasChecked = localStorage.getItem('weathergpt_geo_prompted');
    if (!hasChecked && typeof window !== 'undefined' && 'geolocation' in navigator) {
      localStorage.setItem('weathergpt_geo_prompted', 'true');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const loc = await reverseGeocode(latitude, longitude);
            if (loc && loc.name) {
              setCurrentLocation(loc);
              try {
                localStorage.setItem('weathergpt_current_location', JSON.stringify(loc));
              } catch {}
            }
          } catch (err) {
            console.warn('Auto location reverse geocode failed:', err);
          }
        },
        (err) => {
          // Gracefully fallback without repeated prompt or annoying alert
          console.info('Auto location access denied or timeout:', err.message);
        },
        { timeout: 7000, maximumAge: 300000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Route Planner modal state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [routeOrigin, setRouteOrigin] = useState<string>(INITIAL_LOCATION.name);
  const [routeDestination, setRouteDestination] = useState<string>('Pondicherry');
  const [routeAutoExecute, setRouteAutoExecute] = useState<boolean>(false);

  const handleOpenRoutePlanner = (origin?: string, dest?: string, autoExec: boolean = false) => {
    if (origin) setRouteOrigin(origin);
    else setRouteOrigin(currentLocation.name);
    if (dest) setRouteDestination(dest);
    setRouteAutoExecute(autoExec);
    setIsRouteModalOpen(true);
  };

  const loadWeather = useCallback(async (loc: LocationData) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedHourForecast(null);
    try {
      const data = await fetchWeather(loc);
      setWeatherData(data);
    } catch (err: any) {
      console.error('Failed to load weather:', err);
      setErrorMessage(err.message || t('weatherError') || 'Unable to retrieve weather data.');
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadWeather(currentLocation);
  }, [currentLocation, loadWeather]);

  const handleSelectLocation = (newLoc: LocationData) => {
    setCurrentLocation(newLoc);
    try {
      localStorage.setItem('weathergpt_current_location', JSON.stringify(newLoc));
    } catch {}
  };

  const handleRefresh = () => {
    loadWeather(currentLocation);
  };

  // Determine active atmosphere properties for background animation
  const backgroundProps = useMemo(() => {
    if (selectedHourForecast) {
      const hourNum = selectedHourForecast.hourNumber ?? 12;
      const isDay =
        selectedHourForecast.period !== undefined
          ? selectedHourForecast.period !== 'night'
          : hourNum >= 6 && hourNum < 18;

      return {
        weatherCode: selectedHourForecast.weatherCode,
        isDay,
        temperature: selectedHourForecast.temperature,
        precipitation: selectedHourForecast.precipitation,
        rainProbability: selectedHourForecast.rainProbability,
        conditionText: selectedHourForecast.condition,
      };
    }

    if (weatherData) {
      return {
        weatherCode: weatherData.current.weatherCode,
        isDay: weatherData.current.isDay,
        temperature: weatherData.current.temperature,
        precipitation: weatherData.current.precipitation,
        rainProbability: weatherData.current.rainProbability,
        conditionText: weatherData.current.condition,
      };
    }

    return {
      weatherCode: 0,
      isDay: true,
      temperature: 28,
      precipitation: 0,
      rainProbability: 0,
      conditionText: 'Clear',
    };
  }, [selectedHourForecast, weatherData]);

  const handleNavSelect = (item: NavItem) => {
    setActiveNav(item);
    setShowWeatherDashboard(false);
    setIsFarmerModeActive(false);
  };

  const handleOpenFarmerMode = () => {
    setIsFarmerModeActive(true);
    setShowWeatherDashboard(false);
  };

  const handleExitFarmerMode = () => {
    setIsFarmerModeActive(false);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans relative selection:bg-sky-500 selection:text-white overflow-hidden overscroll-none">
      {/* Dynamic Animated Weather Background Reacting to Live Meteorological Data */}
      <WeatherBackground {...backgroundProps} />

      {/* Responsive application shell: compact on phones, wide and centered on larger screens. */}
      <div className="w-full max-w-[1440px] mx-auto h-[100dvh] max-h-[100dvh] flex flex-col relative z-10 lg:border-x lg:border-slate-800/50 lg:shadow-2xl bg-slate-950/40 backdrop-blur-xs overflow-hidden">
        {/* Clean Compact Sticky Mobile App Bar with 🌾 FARMER MODE Quick Entry */}
        <Header
          onBrandClick={() => {
            setActiveNav('ai');
            setShowWeatherDashboard(false);
            setIsFarmerModeActive(false);
          }}
          onFarmerModeClick={handleOpenFarmerMode}
          isFarmerModeActive={isFarmerModeActive}
        />

        {/* Dynamic Main Content Container: automatically calculates remaining available height between Header & Bottom Nav */}
        <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative px-2.5 xs:px-3 sm:px-6 lg:px-10 xl:px-14 py-1.5 xs:py-2 lg:py-5">
          {/* Global API Error Notice if any */}
          {errorMessage && (
            <div className="shrink-0 mb-2 p-2 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1.5 truncate">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="truncate">{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>{t('retry')}</span>
              </button>
            </div>
          )}

          {/* VIEW: DEDICATED FARMER MODE DASHBOARD */}
          {isFarmerModeActive ? (
            <FarmerModeDashboard
              currentLocation={currentLocation}
              weatherData={weatherData}
              onSelectFarmLocation={handleSelectLocation}
              onExitFarmerMode={handleExitFarmerMode}
            />
          ) : showWeatherDashboard ? (
            /* VIEW: FULL WEATHER DASHBOARD (When toggled from AI or Saved views - scrolls smoothly internally) */
            <div className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-none space-y-3 pb-3 pr-0.5 animate-in fade-in duration-200">
              {/* Back to AI Chat Button */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shrink-0">
                <div className="flex items-center gap-2 text-sky-400 font-semibold truncate">
                  <CloudSun className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('weatherDashboard')} · {currentLocation.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWeatherDashboard(false)}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{t('returnToAi')}</span>
                </button>
              </div>

              {weatherData && (
                <>
                  {/* Weather Alert Component */}
                  <WeatherAlertCard
                    alerts={weatherData.alerts}
                    source={weatherData.source}
                  />

                  {/* Hero Current Weather Card */}
                  <CurrentWeatherCard
                    weather={weatherData}
                    onRefresh={handleRefresh}
                    isLoading={isLoading}
                    selectedHourForecast={selectedHourForecast}
                    onResetHour={() => setSelectedHourForecast(null)}
                  />

                  {/* 24-Hour Weather Timeline (Horizontal Touch Carousel) */}
                  <WeatherTimeline
                    hourly={weatherData.hourly}
                    location={currentLocation}
                    onHourSelect={(hour) => setSelectedHourForecast(hour)}
                  />

                  {/* 7-Day Forecast Summary */}
                  <ForecastSection
                    daily={weatherData.daily}
                    source={weatherData.source}
                    forecastModel={weatherData.forecastModel}
                  />

                  {/* Climate Trends */}
                  <ClimateInsights weather={weatherData} />

                  {/* Footer Grounding Trust Marker */}
                  <div className="pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 text-center flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-sky-400" />
                      <span>{t('groundedNoticeFooter')}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* 1. OCCUPATIONAL (Leftmost tab) */}
              {activeNav === 'occupational' && (
                <OccupationalView
                  currentLocation={currentLocation}
                  weatherData={weatherData}
                  onOpenChatWithPrompt={() => {
                    setActiveNav('ai');
                    setShowWeatherDashboard(false);
                    setIsFarmerModeActive(false);
                  }}
                  onSelectLocation={handleSelectLocation}
                />
              )}

              {/* 2. SAVED LOCATIONS (Left tab) */}
              {activeNav === 'saved' && (
                <SavedLocationsView
                  currentLocation={currentLocation}
                  onSelectLocation={handleSelectLocation}
                  onViewWeatherDashboard={() => setShowWeatherDashboard(true)}
                />
              )}

              {/* 3. AI CHATBOT (CENTER / MAIN - PRIMARY FEATURE) */}
              {activeNav === 'ai' && (
                <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
                  {!showLegacyChat ? (
                    <IntelligenceDashboard
                      currentLocation={currentLocation}
                      onSelectLocation={handleSelectLocation}
                      onOpenLegacyChat={() => setShowLegacyChat(true)}
                    />
                  ) : (
                  <>
                  <button type="button" onClick={() => setShowLegacyChat(false)} className="shrink-0 mb-1 text-[11px] text-sky-300 underline self-start cursor-pointer">← Weather Intelligence</button>
                  <AiChatSection
                    currentLocation={currentLocation}
                    onLocationDetectedInChat={(newLoc) => setCurrentLocation(newLoc)}
                    onOpenRoutePlanner={(origin, dest) => handleOpenRoutePlanner(origin, dest, true)}
                    onGoBack={() => setShowWeatherDashboard(true)}
                    onFarmerModeClick={handleOpenFarmerMode}
                  />
                  </>
                  )}
                </div>
              )}

              {/* 4. MAP WEATHER (Right tab) */}
              {activeNav === 'map' && (
                <MapWeatherView
                  currentLocation={currentLocation}
                  onOpenRoutePlanner={() => handleOpenRoutePlanner(currentLocation.name, 'Pondicherry', false)}
                />
              )}

              {/* 5. ACCESSIBILITY (Rightmost tab) */}
              {activeNav === 'access' && <AccessibilityView />}
            </>
          )}
        </main>

        {/* Floating Persistent Instagram-Style Bottom Navigation Dock */}
        <MobileBottomNav
          activeNav={activeNav}
          onSelectNav={handleNavSelect}
        />
      </div>

      {/* Floating Route Planner Modal */}
      {isRouteModalOpen && (
        <RoutePlanner
          isOpen={isRouteModalOpen}
          onClose={() => setIsRouteModalOpen(false)}
          initialOrigin={routeOrigin}
          initialDestination={routeDestination}
          autoExecute={routeAutoExecute}
        />
      )}
    </div>
  );
}
