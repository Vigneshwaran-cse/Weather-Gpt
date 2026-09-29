import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Sprout,
  Check,
  X,
  Droplets,
  Thermometer,
  Wind,
  CloudRain,
  AlertTriangle,
  Bot,
  Send,
  Sparkles,
  Compass,
  ArrowLeft,
  ChevronDown,
  Info,
  Clock,
  ExternalLink,
  Layers,
  RefreshCw,
  Mic,
  MicOff,
} from 'lucide-react';
import { LocationData, VerifiedWeatherData, ChatMessage } from '../types';
import { CropInfo, getRegionalCrops } from '../data/regionalCrops';
import { searchLocations, reverseGeocode, sendChatMessage, transcribeAudioApi } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { SPEECH_LANG } from '../i18n/briefLabels';

interface FarmerModeDashboardProps {
  currentLocation: LocationData;
  weatherData: VerifiedWeatherData | null;
  onSelectFarmLocation: (loc: LocationData) => void;
  onExitFarmerMode: () => void;
}

export const FarmerModeDashboard: React.FC<FarmerModeDashboardProps> = ({
  currentLocation,
  weatherData,
  onSelectFarmLocation,
  onExitFarmerMode,
}) => {
  const { t, language } = useLanguage();

  // ----------------------------------------------------
  // 1. FARM LOCATION MODAL & PIN DROP STATE
  // ----------------------------------------------------
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Map pin interactive location state
  const [mapPinCoords, setMapPinCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLocation.latitude,
    lng: currentLocation.longitude,
  });
  const [mapPinPlaceName, setMapPinPlaceName] = useState<string>(currentLocation.name);
  const [isResolvingPin, setIsResolvingPin] = useState(false);

  useEffect(() => {
    setMapPinCoords({
      lat: currentLocation.latitude,
      lng: currentLocation.longitude,
    });
    setMapPinPlaceName(currentLocation.name);
  }, [currentLocation]);

  // Search places in modal
  useEffect(() => {
    if (!locationSearchQuery.trim() || locationSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const results = await searchLocations(locationSearchQuery.trim());
        setSearchResults(results);
      } catch (err) {
        console.error('Farmer location search error:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [locationSearchQuery]);

  // GPS Current Location for Farm
  const handleUseCurrentGps = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const rev = await reverseGeocode(latitude, longitude);
          const newLoc: LocationData = {
            name: rev?.name || `Farm (${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°)`,
            state: rev?.state,
            country: rev?.country || 'India',
            latitude,
            longitude,
          };
          onSelectFarmLocation(newLoc);
          setMapPinCoords({ lat: latitude, lng: longitude });
          setMapPinPlaceName(newLoc.name);
          setIsLocationModalOpen(false);
        } catch (err) {
          console.error('Reverse geocode error:', err);
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        console.warn('GPS position error:', err);
        setIsDetectingGps(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSelectSearchResult = (res: any) => {
    const newLoc: LocationData = {
      name: res.name,
      state: res.admin1 || res.state,
      country: res.country || 'India',
      latitude: res.latitude,
      longitude: res.longitude,
    };
    onSelectFarmLocation(newLoc);
    setMapPinCoords({ lat: res.latitude, lng: res.longitude });
    setMapPinPlaceName(res.name);
    setIsLocationModalOpen(false);
    setLocationSearchQuery('');
  };

  // Adjust map pin slightly (interactive pin mover simulation on visual mini-map)
  const handleMoveMapPin = async (dLat: number, dLng: number) => {
    const nextLat = Math.round((mapPinCoords.lat + dLat) * 1000) / 1000;
    const nextLng = Math.round((mapPinCoords.lng + dLng) * 1000) / 1000;
    setMapPinCoords({ lat: nextLat, lng: nextLng });
    setIsResolvingPin(true);
    try {
      const rev = await reverseGeocode(nextLat, nextLng);
      if (rev && rev.name) {
        setMapPinPlaceName(rev.name);
      } else {
        setMapPinPlaceName(`Field Coordinates (${nextLat.toFixed(3)}°, ${nextLng.toFixed(3)}°)`);
      }
    } catch {
      setMapPinPlaceName(`Field Coordinates (${nextLat.toFixed(3)}°, ${nextLng.toFixed(3)}°)`);
    } finally {
      setIsResolvingPin(false);
    }
  };

  const handleConfirmPinLocation = () => {
    const newLoc: LocationData = {
      name: mapPinPlaceName,
      state: currentLocation.state,
      country: currentLocation.country,
      latitude: mapPinCoords.lat,
      longitude: mapPinCoords.lng,
    };
    onSelectFarmLocation(newLoc);
    setIsLocationModalOpen(false);
  };

  // ----------------------------------------------------
  // 2. LOCATION-RELEVANT CROP SELECTION
  // ----------------------------------------------------
  const regionalData = useMemo(() => {
    return getRegionalCrops(currentLocation.state, currentLocation.country);
  }, [currentLocation.state, currentLocation.country]);

  // Selected crops state (can select one or multiple crops)
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('farmer_mode_crops');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    // Default to first regional crop (e.g. Rice)
    return [regionalData.crops[0]?.id || 'rice-paddy'];
  });

  const [cropSearchQuery, setCropSearchQuery] = useState('');
  const [isCropDropdownOpen, setIsCropDropdownOpen] = useState(false);

  // Persist selected crops
  const toggleCropSelection = (cropId: string) => {
    setSelectedCropIds((prev) => {
      let next: string[];
      if (prev.includes(cropId)) {
        if (prev.length === 1) return prev; // Keep at least one
        next = prev.filter((id) => id !== cropId);
      } else {
        next = [...prev, cropId];
      }
      try {
        localStorage.setItem('farmer_mode_crops', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const filteredCrops = useMemo(() => {
    if (!cropSearchQuery.trim()) return regionalData.crops;
    const q = cropSearchQuery.toLowerCase();
    return regionalData.crops.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }, [regionalData.crops, cropSearchQuery]);

  const activeSelectedCrops = useMemo(() => {
    return regionalData.crops.filter((c) => selectedCropIds.includes(c.id));
  }, [regionalData.crops, selectedCropIds]);

  // ----------------------------------------------------
  // 3. UPCOMING RAIN COUNTDOWN (> 90% THRESHOLD ONLY)
  // ----------------------------------------------------
  interface RainCountdownData {
    targetTime: Date;
    formattedTime: string;
    rainProbability: number;
    hoursRemaining: number;
    minutesRemaining: number;
    intensity: string;
  }

  const upcomingSignificantRain = useMemo<RainCountdownData | null>(() => {
    if (!weatherData?.hourly || weatherData.hourly.length === 0) return null;

    const now = new Date();
    // Look ahead through available hours for rainfall probability > 90%
    const thresholdHour = weatherData.hourly.find((h) => {
      const hDate = new Date(h.time);
      return hDate > now && h.rainProbability > 90;
    });

    if (!thresholdHour) return null;

    const targetDate = new Date(thresholdHour.time);
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return null;

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let ampm = targetDate.getHours() >= 12 ? 'PM' : 'AM';
    let hour12 = targetDate.getHours() % 12 === 0 ? 12 : targetDate.getHours() % 12;
    let minStr = targetDate.getMinutes().toString().padStart(2, '0');
    let formattedTime = `${hour12}:${minStr} ${ampm}`;

    return {
      targetTime: targetDate,
      formattedTime,
      rainProbability: thresholdHour.rainProbability,
      hoursRemaining: hours,
      minutesRemaining: minutes,
      intensity: thresholdHour.precipitation >= 5 ? 'Heavy rain' : 'Significant rain',
    };
  }, [weatherData]);

  // Dynamic live countdown tick
  const [countdownString, setCountdownString] = useState<string>('00h 00m');
  useEffect(() => {
    if (!upcomingSignificantRain) return;

    const updateTimer = () => {
      const diffMs = upcomingSignificantRain.targetTime.getTime() - Date.now();
      if (diffMs <= 0) {
        setCountdownString('Now');
        return;
      }
      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      setCountdownString(`${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [upcomingSignificantRain]);

  // ----------------------------------------------------
  // 4. FOUR WEATHER TILES (RAIN %, TEMP, SOIL TEMP, WIND)
  // ----------------------------------------------------
  const currentRainProb = weatherData?.current?.rainProbability ?? 0;
  const currentTemp = weatherData?.current?.temperature !== undefined ? `${Math.round(weatherData.current.temperature)}°C` : '—';
  const currentWind = weatherData?.current?.windSpeed !== undefined ? `${Math.round(weatherData.current.windSpeed)} km/h` : '—';
  const currentSoilTempDisplay =
    weatherData?.current?.soilTemperature !== undefined
      ? `${Math.round(weatherData.current.soilTemperature)}°C`
      : 'Data unavailable';

  // ----------------------------------------------------
  // 5. AI FARMER CHATBOT WITH CONTEXT AWARENESS
  // ----------------------------------------------------
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'farm-welcome',
      sender: 'assistant',
      text: `Namaste! I am WeatherGPT for your farm in ${currentLocation.name}. I'm continuously monitoring live weather, rainfall predictions, soil temperatures, and wind conditions for your crops (${activeSelectedCrops.map((c) => c.name.split('(')[0].trim()).join(', ')}). How can I assist you with your field operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Assistant with Web Speech API and Gemini multimodal transcription fallback
  const handleStartVoice = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = SPEECH_LANG[language] || 'en-IN';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (ev: any) => {
        const text = ev.results[0][0].transcript;
        if (text?.trim()) {
          setChatInput(text.trim());
          handleSendFarmerQuery(text.trim());
        }
      };
      r.onerror = () => setIsRecording(false);
      r.onend = () => setIsRecording(false);
      setIsRecording(true);
      r.start();
      return;
    }
    // Fallback: MediaRecorder + Gemini Audio Transcription API
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
            if (transcript?.trim()) {
              setChatInput(transcript.trim());
              handleSendFarmerQuery(transcript.trim());
            } else {
              alert('Could not transcribe voice. Please type your query.');
            }
          } catch {
            alert('Voice transcription failed. Please type your query.');
          }
        };
        reader.readAsDataURL(blob);
        setIsRecording(false);
      };
      mr.start();
      setIsRecording(true);
      setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 8000);
    } catch {
      alert('Microphone access denied. Please allow microphone permissions and try again.');
    }
  };

  // Auto-scroll chat to bottom
  const scrollToChatBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToChatBottom();
  }, [chatMessages, isAiResponding]);

  const handleSendFarmerQuery = async (queryText?: string) => {
    const textToSend = (queryText || chatInput).trim();
    if (!textToSend || isAiResponding) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiResponding(true);

    try {
      const cropContextString = activeSelectedCrops.map((c) => c.name).join(', ');
      const history = [...chatMessages, userMsg].slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Call conversational endpoint with farmer context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          location: currentLocation.name,
          language,
          isFarmerMode: true,
          cropContext: cropContextString,
          history,
          coords: {
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            state: currentLocation.state,
            country: currentLocation.country,
          },
        }),
      });

      const data = await response.json();
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Weather conditions received for your farm.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source || 'Open-Meteo',
        forecastModel: data.forecastModel || 'ECMWF IFS / NOAA GFS',
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Farmer chat error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to reach the weather system right now. Please verify your connection.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiResponding(false);
    }
  };

  // ----------------------------------------------------
  // 6. WEATHER-BASED FARM ALERTS
  // ----------------------------------------------------
  const farmAlerts = useMemo(() => {
    if (!weatherData) return [];
    const list: Array<{ id: string; icon: string; title: string; desc: string; severity: 'Warning' | 'Severe' | 'Advisory'; source: string }> = [];

    // Official active severe alerts
    if (weatherData.alerts && weatherData.alerts.length > 0) {
      weatherData.alerts.forEach((a) => {
        list.push({
          id: a.id,
          icon: '⚠️',
          title: a.type.toUpperCase(),
          desc: a.description,
          severity: a.severity,
          source: a.source || 'Open-Meteo Meteorological Model',
        });
      });
    }

    // Heavy Rain Alert
    const maxRainProb = Math.max(weatherData.current.rainProbability, weatherData.daily?.[0]?.rainProbabilityMax ?? 0);
    const expectedPrecip = weatherData.daily?.[0]?.precipitationSum ?? 0;
    if (expectedPrecip >= 20 || maxRainProb >= 85) {
      if (!list.some((a) => a.title.includes('RAIN'))) {
        list.push({
          id: 'farm-rain-alert',
          icon: '🌧️',
          title: 'HEAVY RAIN EXPECTED',
          desc: `Significant rainfall (${expectedPrecip} mm, ${maxRainProb}% chance) is expected near your farm within the next 24 to 36 hours. Ensure adequate field drainage and secure harvested crops.`,
          severity: 'Warning',
          source: 'Open-Meteo Meteorological Model',
        });
      }
    }

    // Extreme Heat Alert
    const maxTemp = weatherData.daily?.[0]?.tempMax ?? weatherData.current.temperature;
    if (maxTemp >= 38) {
      if (!list.some((a) => a.title.includes('HEAT'))) {
        list.push({
          id: 'farm-heat-alert',
          icon: '🔥',
          title: 'EXTREME HEAT ADVISORY',
          desc: `Temperatures are expected to reach ${maxTemp}°C today. Increased crop evapotranspiration risk; irrigate during early morning or late evening hours to reduce water stress.`,
          severity: 'Warning',
          source: 'Open-Meteo Meteorological Model',
        });
      }
    }

    // Strong Wind Alert
    if (weatherData.current.windSpeed >= 35) {
      if (!list.some((a) => a.title.includes('WIND'))) {
        list.push({
          id: 'farm-wind-alert',
          icon: '💨',
          title: 'STRONG WINDS WARNING',
          desc: `Current wind speeds of ${Math.round(weatherData.current.windSpeed)} km/h detected. Chemical spraying is strongly discouraged due to high spray drift hazards. Support young stalks or banana plants.`,
          severity: 'Warning',
          source: 'Open-Meteo Meteorological Model',
        });
      }
    }

    return list;
  }, [weatherData]);

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto scrollbar-none space-y-3.5 pb-6 px-1 select-none">
      {/* ========================================================================= */}
      {/* TOP HEADER: FARMER MODE TITLE & EXIT BUTTON */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 shrink-0 pt-0.5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 border border-emerald-400/50 flex items-center justify-center text-xl shadow-md shadow-emerald-950/60">
            🌾
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5 leading-none">
              <span>FARMER MODE</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                FIELD ACTIVE
              </span>
            </h1>
            <p className="text-[11px] text-emerald-300/80 font-medium mt-0.5">
              Live Weather & Agricultural Decision Support
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitFarmerMode}
          className="h-8 px-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. FARM LOCATION SELECTOR */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-950 border border-emerald-500/30 p-3.5 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>📍 Farm Location</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-white truncate">
              {currentLocation.name}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 truncate">
              {currentLocation.state ? `${currentLocation.state}, ` : ''}{currentLocation.country || 'India'}
              <span className="ml-1 text-[11px] font-mono text-emerald-400/90">
                ({currentLocation.latitude.toFixed(3)}°N, {currentLocation.longitude.toFixed(3)}°E)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/30 active:scale-95 transition-all shrink-0 mt-0.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Change Location</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CROP SELECTION */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-3.5 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <Sprout className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>🌱 What are you growing?</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCropDropdownOpen(!isCropDropdownOpen)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isCropDropdownOpen ? 'Close list' : 'Browse crops'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCropDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Selected Crop Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          {activeSelectedCrops.map((crop) => (
            <div
              key={crop.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold shadow-xs"
            >
              <span>{crop.icon}</span>
              <span>{crop.name}</span>
              {activeSelectedCrops.length > 1 && (
                <button
                  type="button"
                  onClick={() => toggleCropSelection(crop.id)}
                  className="w-4 h-4 rounded-full hover:bg-emerald-800/60 flex items-center justify-center text-emerald-400 hover:text-white cursor-pointer ml-0.5"
                  title="Remove crop"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Region Basis Indicator */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 leading-snug">
          <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            {regionalData.isExactRegion
              ? `Showing crops commonly cultivated in ${regionalData.regionName} (${regionalData.crops.length} options)`
              : `List based on commonly cultivated crops for the ${regionalData.regionName} region`}
          </span>
        </div>

        {/* Expandable Crop Selector / Search Area */}
        {isCropDropdownOpen && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
            {/* Search Input for Crop */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={cropSearchQuery}
                onChange={(e) => setCropSearchQuery(e.target.value)}
                placeholder="Search crop (e.g. Rice, Cotton, Banana, Sugarcane)..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
              {cropSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCropSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Scrollable Crop List (up to 100 relevant crops) */}
            <div className="max-h-56 overflow-y-auto scrollbar-none divide-y divide-slate-800/60 rounded-xl border border-slate-800 bg-slate-950/80">
              {filteredCrops.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No crops matching "{cropSearchQuery}".
                </div>
              ) : (
                filteredCrops.map((crop) => {
                  const isSelected = selectedCropIds.includes(crop.id);
                  return (
                    <button
                      key={crop.id}
                      type="button"
                      onClick={() => toggleCropSelection(crop.id)}
                      className={`w-full p-2.5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-950/40 text-emerald-200'
                          : 'hover:bg-slate-900 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <span className="text-xl shrink-0">{crop.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-bold text-white truncate">{crop.name}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{crop.category}</span>
                            <span>·</span>
                            <span>Water: {crop.waterNeed}</span>
                            <span>·</span>
                            <span>{crop.temperatureTolerance}</span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-700 bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. UPCOMING RAIN COUNTDOWN (ONLY APPEARS WHEN RAIN PROBABILITY > 90%) */}
      {/* ========================================================================= */}
      {upcomingSignificantRain && (
        <div className="w-full rounded-2xl bg-gradient-to-r from-blue-950/90 via-sky-900/80 to-blue-900/90 border-2 border-sky-400/80 p-3 sm:p-4 shadow-lg shadow-sky-950/80 shrink-0 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-2xl shrink-0 animate-pulse">
                🌧️
              </div>
              <div>
                <div className="text-xs font-extrabold tracking-wider text-sky-300 uppercase flex items-center gap-1.5">
                  <span>RAIN APPROACHING</span>
                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-sky-400/30 text-sky-200">
                    {upcomingSignificantRain.rainProbability}% Chance
                  </span>
                </div>
                <div className="text-xs text-sky-100 font-medium mt-0.5">
                  {upcomingSignificantRain.intensity} expected around{' '}
                  <span className="font-bold text-white">{upcomingSignificantRain.formattedTime}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-sky-800/60">
              <div className="text-right">
                <div className="text-[10px] text-sky-300/80 uppercase font-semibold">Expected in</div>
                <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight leading-none">
                  {countdownString}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FOUR WEATHER TILES (2 × 2 GRID ON MOBILE) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2.5 shrink-0">
        {/* Tile 1: 🌧️ RAIN PROBABILITY */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
              <span>🌧️</span>
              <span>Rain</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Probability</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums leading-tight">
            {currentRainProb}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {currentRainProb > 70 ? 'High rain likelihood' : currentRainProb > 30 ? 'Moderate chance' : 'Predominantly dry'}
          </div>
        </div>

        {/* Tile 2: 🌡️ TEMPERATURE */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
              <span>🌡️</span>
              <span>Temperature</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Ambient</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums leading-tight">
            {currentTemp}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {weatherData?.current?.condition || 'Real-time observation'}
          </div>
        </div>

        {/* Tile 3: 🌱 SOIL TEMPERATURE */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
              <span>🌱</span>
              <span>Soil Temp</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">0–6 cm</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums leading-tight">
            {currentSoilTempDisplay}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {currentSoilTempDisplay !== 'Data unavailable' ? 'Verified Open-Meteo' : 'Sensor offline'}
          </div>
        </div>

        {/* Tile 4: 💨 WIND */}
        <div className="rounded-2xl bg-slate-900/85 border border-slate-800 p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
              <span>💨</span>
              <span>Wind</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Speed</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums leading-tight">
            {currentWind}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {weatherData?.current?.windSpeed && weatherData.current.windSpeed > 20 ? 'Breezy / Drift risk' : 'Gentle breeze'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. AI FARMER CHATBOT */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl shrink-0 flex flex-col">
        {/* Chatbot Header */}
        <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-sm font-bold">
              🤖
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">
                Ask WeatherGPT about your farm
              </h2>
              <p className="text-[10px] text-emerald-400/90">
                Grounds in {currentLocation.name} · {activeSelectedCrops.map((c) => c.name.split('(')[0].trim()).join(', ')}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div className="max-h-72 min-h-36 overflow-y-auto scrollbar-none p-3 space-y-2.5 bg-slate-950/40">
          {chatMessages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-2 max-w-[94%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-semibold ${
                    isUser
                      ? 'bg-emerald-600 text-white'
                      : msg.isError
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 border border-slate-700 text-emerald-400'
                  }`}
                >
                  {isUser ? '👨‍🌾' : '🤖'}
                </div>
                <div
                  className={`rounded-2xl p-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-xs'
                      : msg.isError
                      ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200 rounded-tl-xs'
                      : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                  <div className="mt-1 text-[9px] text-slate-400 text-right">{msg.timestamp}</div>
                </div>
              </div>
            );
          })}

          {isAiResponding && (
            <div className="flex gap-2 mr-auto max-w-[85%]">
              <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 shrink-0 flex items-center justify-center text-xs">
                🤖
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 text-xs text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] text-slate-400 ml-1">Analyzing farm telemetry...</span>
              </div>
            </div>
          )}
          <div ref={chatMessagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-2 border-t border-slate-800 bg-slate-950/80 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleStartVoice}
            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/50'
                : 'bg-slate-900 border border-slate-700/80 text-emerald-400 hover:bg-slate-800'
            }`}
            title={isRecording ? 'Listening… tap to stop' : 'Ask by voice (Gemini Voice Assistant)'}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4" />}
          </button>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendFarmerQuery();
              }
            }}
            placeholder={isRecording ? 'Listening… Speak now' : 'Ask about rain timing, irrigation, or spraying...'}
            className="flex-1 h-9 px-3 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={() => handleSendFarmerQuery()}
            disabled={!chatInput.trim() || isAiResponding}
            className="h-9 w-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 flex items-center justify-center cursor-pointer transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. SUGGESTED FARMER QUESTIONS */}
      {/* ========================================================================= */}
      <div className="space-y-2 shrink-0">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          💡 Common Questions
        </div>

        <div className="grid grid-cols-1 gap-2">
          {/* Question 1: Will it rain? */}
          <button
            type="button"
            onClick={() => handleSendFarmerQuery('Will it rain today or tomorrow?')}
            className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🌧️</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  "Will it rain today or tomorrow?"
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Forecast timing window, peak probability & rain amount
                </div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 opacity-80 group-hover:opacity-100" />
          </button>

          {/* Question 2: Should I water crops? */}
          <button
            type="button"
            onClick={() =>
              handleSendFarmerQuery(
                `Should I water my ${activeSelectedCrops[0]?.name.split('(')[0].trim() || 'crops'} today?`
              )
            }
            className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">💧</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  "Should I water my crops today?"
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Considers upcoming rainfall, expected mm, temperature & soil moisture
                </div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 opacity-80 group-hover:opacity-100" />
          </button>

          {/* Question 3: Can I spray pesticides/fertilizer? */}
          <button
            type="button"
            onClick={() => handleSendFarmerQuery('Can I spray pesticides or fertilizer today?')}
            className="w-full p-3 rounded-2xl bg-slate-900/80 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🧪</span>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  "Can I spray pesticides / fertilizer today?"
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Checks rainfall timing wash-off risk & wind drift speed
                </div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 opacity-80 group-hover:opacity-100" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. WEATHER-BASED FARM ALERTS */}
      {/* ========================================================================= */}
      {farmAlerts.length > 0 && (
        <div className="space-y-2 shrink-0 pt-1">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            ⚠️ Weather-Based Farm Alerts
          </div>

          <div className="space-y-2">
            {farmAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 shadow-md"
              >
                <span className="text-2xl shrink-0">{alert.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold text-amber-300 uppercase tracking-wide">
                      {alert.title}
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                    {alert.desc}
                  </p>
                  <div className="text-[10px] text-amber-400/80 font-mono mt-1.5">
                    Official source: {alert.source}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOCATION SELECTOR MODAL (MAP PIN & SEARCH) */}
      {/* ========================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Select Exact Farm Location</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto scrollbar-none space-y-3.5 pt-3">
              {/* Option A: Use Current GPS */}
              <button
                type="button"
                onClick={handleUseCurrentGps}
                disabled={isDetectingGps}
                className="w-full p-3 rounded-2xl bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Crosshair className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? 'Detecting farm GPS...' : 'Use Current Device Location'}</span>
              </button>

              {/* Option B: Search City / Village / District */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Search Location or Village
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Search e.g. Velachery, Thanjavur, Madurai..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  {isSearchingLocation && (
                    <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 divide-y divide-slate-800">
                    {searchResults.map((res, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full p-2.5 text-left text-xs text-white hover:bg-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-bold">{res.name}</span>
                          <span className="text-slate-400 ml-1.5">
                            {res.admin1 ? `${res.admin1}, ` : ''}{res.country || 'India'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono shrink-0 ml-2">
                          {res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Option C: Map-Based Location Selection with Moveable Pin */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span>Map Pin Positioning</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Micro-adjust farm coordinates</span>
                </div>

                {/* Interactive Map Visual Tile */}
                <div className="relative h-32 rounded-xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-slate-800 overflow-hidden flex flex-col items-center justify-center text-center p-2">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center animate-bounce">
                    <span className="text-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">📍</span>
                  </div>

                  <div className="relative z-10 font-bold text-xs text-white mt-1 truncate max-w-[90%]">
                    {isResolvingPin ? 'Resolving field...' : mapPinPlaceName}
                  </div>
                  <div className="relative z-10 text-[10px] font-mono text-emerald-400 mt-0.5">
                    {mapPinCoords.lat.toFixed(3)}°N, {mapPinCoords.lng.toFixed(3)}°E
                  </div>
                </div>

                {/* Directional Nudge Buttons to move pin to exact farm acreage */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleMoveMapPin(0.005, 0)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 cursor-pointer text-center"
                  >
                    ⬆️ North
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMapPin(-0.005, 0)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 cursor-pointer text-center"
                  >
                    ⬇️ South
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMapPin(0, -0.005)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 cursor-pointer text-center"
                  >
                    ⬅️ West
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveMapPin(0, 0.005)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-200 cursor-pointer text-center"
                  >
                    ➡️ East
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmPinLocation}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Use This Pin Location for Farm</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
