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
import { fetchWeather, reverseGeocode, sendChatMessage, transcribeAudioApi } from './services/api';
import { AlertCircle, RefreshCw, X, Sparkles, Volume2, MicOff, Settings, HelpCircle, Sun, Moon, Globe, Shield, Info } from 'lucide-react';
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
  const { language, t, speechCode } = useLanguage();

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('weathergpt_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  const [dataSaver, setDataSaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SAVER_KEY) === '1';
    } catch {
      return false;
    }
  });

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
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState<boolean>(false);
  const [routeOrigin, setRouteOrigin] = useState<string>(INITIAL_LOCATION.name);
  const [routeDestination, setRouteDestination] = useState<string>('Pondicherry');
  const [routeAutoExecute, setRouteAutoExecute] = useState<boolean>(false);

  // Sync theme
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
    try { localStorage.setItem('weathergpt_theme', theme); } catch {}
  }, [theme]);

  // Sync Data Saver
  useEffect(() => {
    document.documentElement.dataset.saver = dataSaver ? 'on' : 'off';
    try { localStorage.setItem(SAVER_KEY, dataSaver ? '1' : '0'); } catch {}
  }, [dataSaver]);

  // Auto location detection (one-time)
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
              try { localStorage.setItem('weathergpt_current_location', JSON.stringify(loc)); } catch {}
            }
          } catch (err) {
            console.warn('Auto location reverse geocode failed:', err);
          }
        },
        (err) => { console.info('Auto location access denied:', err.message); },
        { timeout: 7000, maximumAge: 300000, enableHighAccuracy: false }
      );
    }
  }, []);

  const loadWeatherData = useCallback(async (loc: LocationData, userQuestion?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSelectedHourForecast(null);
    try {
      const data = await fetchWeather(loc);
      setWeatherData(data);
      try {
        const res = await fetch('/api/intelligence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ location: loc, question: userQuestion || undefined, language, skipAi: dataSaver }),
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
  }, [language, dataSaver, t]);

  useEffect(() => { loadWeatherData(currentLocation); }, [currentLocation, loadWeatherData]);

  const handleSelectLocation = (newLoc: LocationData) => {
    setCurrentLocation(newLoc);
    setAiAnswer(null);
    try { localStorage.setItem('weathergpt_current_location', JSON.stringify(newLoc)); } catch {}
  };

  const handleRefresh = () => loadWeatherData(currentLocation);

  // Ask AI — always navigate to home to show answer
  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim()) return;
    setActiveTab('home');
    setAiAnswer({ question: questionText, answer: 'Analyzing weather conditions...', loading: true });
    try {
      const chatRes = await sendChatMessage(questionText, currentLocation, language);
      setAiAnswer({ question: questionText, answer: chatRes.reply || 'No response returned.', loading: false });
      loadWeatherData(currentLocation, questionText);
    } catch (err: any) {
      setAiAnswer({ question: questionText, answer: err.message || 'Unable to retrieve AI answer.', loading: false });
    }
  };

  const handleToggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const handleToggleDataSaver = () => setDataSaver((prev) => !prev);

  const handleOpenRoutePlanner = (origin?: string, dest?: string, autoExec = false) => {
    setRouteOrigin(origin || currentLocation.name);
    setRouteDestination(dest || 'Pondicherry');
    setRouteAutoExecute(autoExec);
    setIsRouteModalOpen(true);
  };

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechCode || 'en-IN';
    window.speechSynthesis.speak(u);
  };

  // Voice: Web Speech API (Chrome) or MediaRecorder + Gemini transcription
  const handleStartVoice = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = speechCode || 'en-IN';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (ev: any) => { const text = ev.results[0][0].transcript; if (text.trim()) handleAskQuestion(text); };
      r.onerror = () => setIsRecording(false);
      r.onend = () => setIsRecording(false);
      setIsRecording(true);
      r.start();
      return;
    }
    // Fallback: MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const transcript = await transcribeAudioApi(base64, mimeType, language);
            if (transcript.trim()) handleAskQuestion(transcript);
            else alert('Could not transcribe. Please type your question.');
          } catch { alert('Voice transcription failed. Please type your question.'); }
        };
        reader.readAsDataURL(blob);
        setIsRecording(false);
      };
      mr.start();
      setIsRecording(true);
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 8000);
    } catch { alert('Microphone access denied. Please allow microphone and try again.'); }
  };

  return (
    <div className="min-h-screen w-full bg-[#F0F4FA] dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row font-sans selection:bg-blue-500 selection:text-white">
      <SidebarNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        dataSaver={dataSaver}
        onToggleDataSaver={handleToggleDataSaver}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <TopHeaderBar
          location={currentLocation}
          updatedTime={weatherData?.updated}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
        />

        {errorMessage && (
          <div className="mx-4 sm:mx-6 lg:mx-8 mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="truncate">{errorMessage}</span>
            </div>
            <button type="button" onClick={handleRefresh} className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer">
              <RefreshCw className="w-3 h-3" /><span>Retry</span>
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">

          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <HeroBanner currentLocation={currentLocation} onSelectLocation={handleSelectLocation} onAskQuestion={handleAskQuestion} isLoading={isLoading || (aiAnswer?.loading ?? false)} />

              {aiAnswer && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 text-white shadow-lg space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>WeatherGPT AI Answer</span>
                    </div>
                    <button type="button" onClick={() => setAiAnswer(null)} className="p-1 rounded-full hover:bg-white/20 text-white/80 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <div className="text-xs text-sky-200 font-semibold mb-1">Question: "{aiAnswer.question}"</div>
                    {aiAnswer.loading ? (
                      <div className="flex items-center gap-2 text-xs text-sky-100 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Generating grounded answer for {currentLocation.name}...</span>
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-line text-white">{aiAnswer.answer}</p>
                    )}
                  </div>
                  {!aiAnswer.loading && (
                    <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-sky-100">
                      <button type="button" onClick={() => speakText(aiAnswer.answer)} className="flex items-center gap-1.5 font-bold hover:underline cursor-pointer">
                        <Volume2 className="w-4 h-4 text-amber-300" /><span>Listen to Answer</span>
                      </button>
                      <span>📍 {currentLocation.name}</span>
                    </div>
                  )}
                </div>
              )}

              {brief?.disasterMode && (
                <div role="alert" className="p-4 rounded-3xl bg-rose-600 text-white font-extrabold text-base flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 shrink-0" />
                    <span>🚨 Disaster Mode Active for {currentLocation.name}. Emergency precautions in effect.</span>
                  </div>
                  <button type="button" onClick={() => setActiveTab('marine')} className="px-4 py-1.5 rounded-full bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 cursor-pointer">
                    View Emergency Details
                  </button>
                </div>
              )}

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
                onStartVoice={handleStartVoice}
                onRefresh={handleRefresh}
                selectedHourForecast={selectedHourForecast}
                onSelectHourForecast={setSelectedHourForecast}
              />

              {isRecording && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-rose-600 text-white shadow-xl animate-pulse">
                  <MicOff className="w-5 h-5" />
                  <span className="text-sm font-bold">Recording… tap mic again to stop (auto-stops in 8s)</span>
                </div>
              )}
            </div>
          )}

          {/* FARMING TAB */}
          {activeTab === 'farming' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <FarmerModeDashboard currentLocation={currentLocation} weatherData={weatherData} onSelectFarmLocation={handleSelectLocation} onExitFarmerMode={() => setActiveTab('home')} />
            </div>
          )}

          {/* MARINE TAB */}
          {activeTab === 'marine' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <OccupationalView currentLocation={currentLocation} weatherData={weatherData} onOpenChatWithPrompt={handleAskQuestion} onSelectLocation={handleSelectLocation} />
            </div>
          )}

          {/* CLIMATE TAB */}
          {activeTab === 'climate' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              {weatherData && <ClimateInsights weather={weatherData} />}
            </div>
          )}

          {/* MAP TAB */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <MapWeatherView currentLocation={currentLocation} onOpenRoutePlanner={() => handleOpenRoutePlanner(currentLocation.name, 'Pondicherry', false)} />
            </div>
          )}

          {/* SAVED TAB */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <SavedLocationsView currentLocation={currentLocation} onSelectLocation={(loc) => { handleSelectLocation(loc); setActiveTab('home'); }} onViewWeatherDashboard={() => setActiveTab('home')} />
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Settings</h2>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Theme</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Currently: {theme === 'light' ? 'Light Mode' : 'Dark Mode'}</div>
                    </div>
                  </div>
                  <button type="button" onClick={handleToggleTheme} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition-colors">
                    Switch to {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Language</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Change from the globe 🌐 icon in the header bar</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">Data Saver</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Disables AI summaries and reduces network usage</div>
                  </div>
                  <button type="button" role="switch" aria-checked={dataSaver} onClick={handleToggleDataSaver}
                    className={`w-12 h-6 rounded-full p-0.5 cursor-pointer transition-colors ${dataSaver ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${dataSaver ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    <div className="text-sm font-bold text-blue-800 dark:text-blue-200">Data Sources</div>
                  </div>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• <strong>Weather:</strong> Open-Meteo Forecast API (ECMWF IFS / NOAA GFS NWP models)</li>
                    <li>• <strong>Marine:</strong> Open-Meteo Marine API (real wave, swell, ocean data)</li>
                    <li>• <strong>Geocoding:</strong> Open-Meteo Geocoding + OpenStreetMap Nominatim</li>
                    <li>• <strong>AI:</strong> Google Gemini (grounded on verified weather data only)</li>
                    <li>• <strong>Map:</strong> Windy.com weather overlays + OpenStreetMap</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* HELP TAB */}
          {activeTab === 'help' && (
            <div className="space-y-4">
              <button type="button" onClick={() => setActiveTab('home')} className="text-xs font-bold text-blue-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer mb-2">← Return to Home Dashboard</button>
              <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-6 h-6 text-blue-500" />
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Help & About WeatherGPT</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { title: '🌤️ Weather Dashboard', desc: 'Home tab shows real-time weather from Open-Meteo (ECMWF IFS / NOAA GFS) for your selected location. All data is real — no fabrication.' },
                    { title: '🤖 AI Assistant', desc: 'Ask any weather question in the search bar. Gemini AI receives verified weather data and explains it. It will never fabricate weather values.' },
                    { title: '🌊 Marine Mode', desc: 'Real wave height, swell height, wave period, direction, sea surface temp and ocean current from Open-Meteo Marine API. Inland locations will show UNAVAILABLE.' },
                    { title: '✈️ Aviation Mode', desc: 'Real wind, visibility, temp from Open-Meteo. Derived flight category (VFR/MVFR/IFR). No synthetic METAR. Always verify with official ATC/met before flight.' },
                    { title: '🌾 Farming Mode', desc: 'Crop-specific weather guidance based on real forecasts. Enter your crop name and ask AI for tailored planting, irrigation, and harvest advice.' },
                    { title: '🗺️ Interactive Map', desc: 'Live Windy.com weather overlays (rain/wind/temp) + OpenStreetMap location pin for your selected city. No API key required.' },
                    { title: '🎙️ Voice Assistant', desc: 'Tap the microphone to ask by voice. Uses Web Speech API in Chrome, or Gemini transcription as fallback. Follows the selected language.' },
                    { title: '🌙 Light/Dark Mode', desc: 'Toggle theme using the sun/moon button in the header or from Settings. Preference is saved locally.' },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">{item.title}</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{item.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-bold text-amber-800 dark:text-amber-200">Data Accuracy Note</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                    All weather data is sourced from Open-Meteo (ECMWF IFS / NOAA GFS) — real NWP model data, never fabricated.
                    The AI (Gemini) only explains verified data and never invents weather values.
                    For life-safety decisions (marine, aviation, disasters), always verify with official sources: IMD, NOAA, local coastguard, and ATC.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {isRouteModalOpen && (
        <RoutePlanner isOpen={isRouteModalOpen} onClose={() => setIsRouteModalOpen(false)} initialOrigin={routeOrigin} initialDestination={routeDestination} autoExecute={routeAutoExecute} />
      )}
    </div>
  );
}
