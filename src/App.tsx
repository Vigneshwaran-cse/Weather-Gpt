/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { SidebarNav, NavTab } from './components/SidebarNav';
import { TopHeaderBar } from './components/TopHeaderBar';
import { HeroBanner } from './components/HeroBanner';
import { WeatherDashboardView } from './components/WeatherDashboardView';
import { RoutePlanner } from './components/RoutePlanner';
import { ClimateInsights } from './components/ClimateInsights';
import { OccupationalView } from './components/OccupationalView';
import { SavedLocationsView } from './components/SavedLocationsView';
import { MapWeatherView } from './components/MapWeatherView';
import { FarmerModeDashboard } from './components/FarmerModeDashboard';
import { LocationData, VerifiedWeatherData, HourlyForecast } from './types';
import { WeatherIntelligenceBrief } from '../services/briefTypes';
import { fetchWeather, reverseGeocode, sendChatMessage } from './services/api';
import { AlertCircle, RefreshCw, X, Sparkles, Volume2 } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

const INITIAL_LOCATION: LocationData = {
  name: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  latitude: 13.0827,
  longitude: 80.2707,
};

const SAVER_KEY = 'weathergpt_data_saver';

interface AiAnswerState {
  question: string;
  answer: string;
  loading: boolean;
}

export default function App() {
  const { language, t } = useLanguage();

  // Active navigation tab (default: 'home' matching reference interface)
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Theme state: default 'light' matching attached reference image
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('weathergpt_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  // Data Saver state
  const [dataSaver, setDataSaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SAVER_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Location state
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
  const [brief, setBrief] = useState<WeatherIntelligenceBrief | null>(null);
  const [aiAnswer, setAiAnswer] = useState<AiAnswerState | null>(null);
  const [selectedHourForecast, setSelectedHourForecast] = useState<HourlyForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Route Planner modal state
  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [routeOrigin, setRouteOrigin] = useState<string>(INITIAL_LOCATION.name);
  const [routeDestination, setRouteDestination] = useState<string>('Pondicherry');
  const [routeAutoExecute, setRouteAutoExecute] = useState<boolean>(false);

  // Sync theme class & attribute to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    root.dataset.theme = theme;
    try {
      localStorage.setItem('weathergpt_theme', theme);
    } catch {}
  }, [theme]);

  // Sync Data Saver attribute to HTML root
  useEffect(() => {
    document.documentElement.dataset.saver = dataSaver ? 'on' : 'off';
    try {
      localStorage.setItem(SAVER_KEY, dataSaver ? '1' : '0');
    } catch {}
  }, [dataSaver]);

  // One-time automatic location detection
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
          console.info('Auto location access denied:', err.message);
        },
        { timeout: 7000, maximumAge: 300000, enableHighAccuracy: false }
      );
    }
  }, []);

  // Fetch weather data & intelligence brief
  const loadWeatherData = useCallback(
    async (loc: LocationData, userQuestion?: string) => {
      setIsLoading(true);
      setErrorMessage(null);
      setSelectedHourForecast(null);

      try {
        // 1. Fetch raw weather metrics from Open-Meteo
        const data = await fetchWeather(loc);
        setWeatherData(data);

        // 2. Fetch intelligence brief from server
        try {
          const res = await fetch('/api/intelligence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: loc,
              question: userQuestion || undefined,
              language,
              skipAi: dataSaver,
            }),
          });
          if (res.ok) {
            const b = (await res.json()) as WeatherIntelligenceBrief;
            setBrief(b);
          }
        } catch (briefErr) {
          console.warn('Intelligence brief fetch failed:', briefErr);
        }
      } catch (err: any) {
        console.error('Failed to load weather:', err);
        setErrorMessage(err.message || t('weatherError') || 'Unable to retrieve weather data.');
      } finally {
        setIsLoading(false);
      }
    },
    [language, dataSaver, t]
  );

  useEffect(() => {
    loadWeatherData(currentLocation);
  }, [currentLocation, loadWeatherData]);

  const handleSelectLocation = (newLoc: LocationData) => {
    setCurrentLocation(newLoc);
    setAiAnswer(null);
    try {
      localStorage.setItem('weathergpt_current_location', JSON.stringify(newLoc));
    } catch {}
  };

  const handleRefresh = () => {
    loadWeatherData(currentLocation);
  };

  // Handle user asking an AI question
  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;

    setAiAnswer({
      question: questionText,
      answer: 'Analyzing weather conditions and generating response...',
      loading: true,
    });

    try {
      const chatRes = await sendChatMessage(questionText, currentLocation, language);
      setAiAnswer({
        question: questionText,
        answer: chatRes.reply || 'No response returned.',
        loading: false,
      });

      // Also refresh intelligence brief
      loadWeatherData(currentLocation, questionText);
    } catch (err: any) {
      setAiAnswer({
        question: questionText,
        answer: err.message || 'Unable to retrieve AI weather answer right now.',
        loading: false,
      });
    }
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleToggleDataSaver = () => {
    setDataSaver((prev) => !prev);
  };

  const handleOpenRoutePlanner = (origin?: string, dest?: string, autoExec: boolean = false) => {
    setRouteOrigin(origin || currentLocation.name);
    setRouteDestination(dest || 'Pondicherry');
    setRouteAutoExecute(autoExec);
    setIsRouteModalOpen(true);
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN';
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F4FA] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-blue-500 selection:text-white">
      {/* 1. LEFT SIDEBAR NAVIGATION matching Reference Image */}
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dataSaver={dataSaver}
        onToggleDataSaver={handleToggleDataSaver}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Controls Bar */}
        <TopHeaderBar
          location={currentLocation}
          updatedTime={weatherData?.updated}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {/* Global Error Notice if any */}
        {errorMessage && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* MAIN BODY CONTENT BASED ON ACTIVE TAB */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {/* TAB 1: HOME (WEATHER INTELLIGENCE DASHBOARD matching reference image) */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Hero Banner Section */}
              <HeroBanner
                currentLocation={currentLocation}
                onSelectLocation={handleSelectLocation}
                onAskQuestion={handleAskQuestion}
                isLoading={isLoading || (aiAnswer?.loading ?? false)}
              />

              {/* Interactive AI Answer Banner Box (when user asks a question) */}
              {aiAnswer && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-lg space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>WeatherGPT AI Answer</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiAnswer(null)}
                      className="p-1 rounded-full hover:bg-white/20 text-white/80 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <div className="text-xs text-sky-200 font-semibold mb-1">
                      Question: "{aiAnswer.question}"
                    </div>
                    {aiAnswer.loading ? (
                      <div className="flex items-center gap-2 text-xs text-sky-100 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Generating grounded answer for {currentLocation.name}...</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-white">
                        {aiAnswer.answer}
                      </p>
                    )}
                  </div>

                  {!aiAnswer.loading && (
                    <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-sky-100">
                      <button
                        type="button"
                        onClick={() => speakText(aiAnswer.answer)}
                        className="flex items-center gap-1.5 font-bold hover:underline cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4 text-amber-300" />
                        <span>Listen to Answer</span>
                      </button>
                      <span>📍 {currentLocation.name}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Disaster Mode Alert Banner (if severe disaster alert active) */}
              {brief?.disasterMode && (
                <div role="alert" className="p-4 rounded-3xl bg-rose-600 text-white font-extrabold text-base flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <span>🚨 Disaster Mode Active for {currentLocation.name}. Emergency precautions in effect.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('marine')}
                    className="px-4 py-1.5 rounded-full bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 cursor-pointer"
                  >
                    View Emergency Details
                  </button>
                </div>
              )}

              {/* Main Weather Dashboard Grid (3 Row Layout + Right Panel) */}
              <WeatherDashboardView
                currentLocation={currentLocation}
                weatherData={weatherData}
                brief={brief}
                isLoading={isLoading}
                onOpenMap={() => setActiveTab('map')}
                onOpenFarming={() => setActiveTab('farming')}
                onOpenMarine={() => setActiveTab('marine')}
                onOpenClimate={() => setActiveTab('climate')}
                onOpenDisaster={() => setActiveTab('marine')}
                onStartVoice={() => {
                  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  if (SR) {
                    const r = new SR();
                    r.lang = 'en-IN';
                    r.onresult = (ev: any) => {
                      const text = ev.results[0][0].transcript;
                      handleAskQuestion(text);
                    };
                    r.start();
                  } else {
                    alert('Voice recognition is not supported in this browser.');
                  }
                }}
                onRefresh={handleRefresh}
                selectedHourForecast={selectedHourForecast}
                onSelectHourForecast={setSelectedHourForecast}
              />
            </div>
          )}

          {/* TAB 2: FARMING (Dedicated Farmer Mode Dashboard) */}
          {activeTab === 'farming' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2"
              >
                ← Return to Home Dashboard
              </button>
              <FarmerModeDashboard
                currentLocation={currentLocation}
                weatherData={weatherData}
                onSelectFarmLocation={handleSelectLocation}
                onExitFarmerMode={() => setActiveTab('home')}
              />
            </div>
          )}

          {/* TAB 3: MARINE & OCCUPATIONAL VIEW */}
          {activeTab === 'marine' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2"
              >
                ← Return to Home Dashboard
              </button>
              <OccupationalView
                currentLocation={currentLocation}
                weatherData={weatherData}
                onOpenChatWithPrompt={() => setActiveTab('home')}
                onSelectLocation={handleSelectLocation}
              />
            </div>
          )}

          {/* TAB 4: CLIMATE INSIGHTS */}
          {activeTab === 'climate' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2"
              >
                ← Return to Home Dashboard
              </button>
              {weatherData && <ClimateInsights weather={weatherData} />}
            </div>
          )}

          {/* TAB 5: INTERACTIVE MAP & ROUTE PLANNER */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2"
              >
                ← Return to Home Dashboard
              </button>
              <MapWeatherView
                currentLocation={currentLocation}
                onOpenRoutePlanner={() => handleOpenRoutePlanner(currentLocation.name, 'Pondicherry', false)}
              />
            </div>
          )}

          {/* TAB 6: SAVED LOCATIONS */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2"
              >
                ← Return to Home Dashboard
              </button>
              <SavedLocationsView
                currentLocation={currentLocation}
                onSelectLocation={(loc) => {
                  handleSelectLocation(loc);
                  setActiveTab('home');
                }}
                onViewWeatherDashboard={() => setActiveTab('home')}
              />
            </div>
          )}
        </main>
      </div>

      {/* Floating Weather-Aware Route Planner Modal */}
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
