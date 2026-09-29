import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Anchor,
  Compass,
  Wind,
  Waves,
  Eye,
  ShieldAlert,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  Mic,
  MicOff,
} from 'lucide-react';
import { OccupationDashboardProps } from './types';
import { useLanguage } from '../../i18n/LanguageContext';
import { SPEECH_LANG } from '../../i18n/briefLabels';
import { transcribeAudioApi } from '../../services/api';

interface MarineData {
  waveHeightM: number | null;
  swellHeightM: number | null;
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  seaSurfaceTempC: number | null;
  oceanCurrentKmh: number | null;
  windKmh: number | null;
  time: string;
  isSea: boolean;
  hourly?: Array<{
    time: string;
    waveHeightM: number | null;
    swellHeightM: number | null;
    wavePeriodS: number | null;
  }>;
}

export const MaritimeDashboard: React.FC<OccupationDashboardProps> = ({
  currentLocation,
  weatherData,
  onBackToSelector,
  onChangeMode,
  onOpenChatWithPrompt,
}) => {
  const { t, language } = useLanguage();
  const [marineData, setMarineData] = useState<MarineData | null>(null);
  const [marineLoading, setMarineLoading] = useState(true);
  const [marineError, setMarineError] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Voice Assistant with Web Speech API and Gemini audio transcription fallback
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
          setAiQuestion(text.trim());
          handleAskAI(text.trim());
        }
      };
      r.onerror = () => setIsRecording(false);
      r.onend = () => setIsRecording(false);
      setIsRecording(true);
      r.start();
      return;
    }
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
              setAiQuestion(transcript.trim());
              handleAskAI(transcript.trim());
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

  const current = weatherData?.current;
  const windKmh = current ? Math.round(current.windSpeed) : null;
  const windKnots = windKmh !== null ? Math.round(windKmh * 0.539957) : null;
  const windDirection = current ? current.windDirection : null;
  const humidity = current ? current.humidity : null;

  const fetchMarineData = async () => {
    setMarineLoading(true);
    setMarineError(null);
    try {
      const res = await fetch(
        `/api/marine?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&name=${encodeURIComponent(currentLocation.name)}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Marine API error ${res.status}`);
      }
      const data: MarineData = await res.json();
      setMarineData(data);
    } catch (e: any) {
      setMarineError(e.message || 'Marine data unavailable for this location.');
    } finally {
      setMarineLoading(false);
    }
  };

  useEffect(() => {
    fetchMarineData();
  }, [currentLocation.latitude, currentLocation.longitude]);

  const getCardinal = (angle: number | null) => {
    if (angle === null) return '—';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  };

  const handleAskAI = async (question: string) => {
    if (!question.trim()) return;
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          location: currentLocation.name,
          language,
          coords: {
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
            state: currentLocation.state,
            country: currentLocation.country,
          },
          marine: true,
        }),
      });
      const data = await res.json();
      setAiAnswer(data.reply || 'No response received.');
    } catch (e: any) {
      setAiAnswer('Unable to connect to AI. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  // Beaufort scale from real wave height (if available) or wind knots
  const getBeaufort = (wh: number | null, wk: number | null): { force: number; desc: string } => {
    if (wk !== null) {
      if (wk < 1) return { force: 0, desc: 'Calm' };
      if (wk <= 3) return { force: 1, desc: 'Light air' };
      if (wk <= 6) return { force: 2, desc: 'Light breeze' };
      if (wk <= 10) return { force: 3, desc: 'Gentle breeze' };
      if (wk <= 16) return { force: 4, desc: 'Moderate breeze' };
      if (wk <= 21) return { force: 5, desc: 'Fresh breeze' };
      if (wk <= 27) return { force: 6, desc: 'Strong breeze' };
      if (wk <= 33) return { force: 7, desc: 'Near gale' };
      if (wk <= 40) return { force: 8, desc: 'Gale' };
      return { force: 9, desc: 'Strong gale' };
    }
    return { force: 3, desc: 'Gentle breeze' };
  };

  const beaufort = getBeaufort(marineData?.waveHeightM ?? null, windKnots);
  const smallCraftAdvisory = windKnots !== null && windKnots >= 18;
  const fogRisk = humidity !== null && humidity > 85;

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto scrollbar-none space-y-3 p-0.5">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onBackToSelector}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('changeMode')}</span>
        </button>

        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-slate-500 hidden sm:inline">{t('activeModeLabel')}:</span>
          <button
            type="button"
            onClick={() => onChangeMode('farming')}
            className="text-slate-400 hover:text-emerald-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            🌾 {t('farming')}
          </button>
          <span className="font-semibold text-sky-400 bg-sky-950/40 border border-sky-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
            ⚓ {t('maritime')}
          </span>
          <button
            type="button"
            onClick={() => onChangeMode('aviation')}
            className="text-slate-400 hover:text-indigo-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✈️ {t('aviation')}
          </button>
        </div>
      </div>

      {/* Main Mode Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-950/30 to-slate-900/90 border border-sky-500/30 p-3 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <Anchor className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>{t('maritimeTitle')}</span>
              <span className="text-[10px] font-semibold text-sky-400">· {currentLocation.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Real-time Open-Meteo Marine data · {currentLocation.latitude.toFixed(2)}°, {currentLocation.longitude.toFixed(2)}°
            </p>
          </div>
        </div>

        {/* Wind / Craft Advisory */}
        {windKnots !== null && (
          <div
            className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
              smallCraftAdvisory
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {smallCraftAdvisory ? (
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <Compass className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold">
                  {smallCraftAdvisory
                    ? `Small Craft Advisory — ${windKnots} kts (${getCardinal(windDirection)})`
                    : `Wind: ${windKnots} kts (${getCardinal(windDirection)})`}
                </div>
                <div className="text-[10px] text-slate-300">
                  Beaufort Force {beaufort.force} — {beaufort.desc}
                  {fogRisk ? ' · Reduced visibility possible' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Marine Data Grid */}
      {marineLoading ? (
        <div className="flex items-center justify-center p-8 text-sky-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Fetching Open-Meteo Marine data…</span>
        </div>
      ) : marineError ? (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-semibold">Marine Data Unavailable</span>
          </div>
          <p className="text-[11px] text-slate-400">{marineError}</p>
          <p className="text-[10px] text-slate-500">
            Open-Meteo Marine API only covers ocean/coastal grid points. This location may be inland.
          </p>
          <button
            type="button"
            onClick={fetchMarineData}
            className="mt-1 flex items-center gap-1.5 mx-auto px-3 py-1 bg-sky-800 hover:bg-sky-700 text-white text-xs rounded-lg cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      ) : marineData && !marineData.isSea ? (
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-center">
          <div className="text-xs text-amber-400 font-semibold mb-1">INLAND LOCATION</div>
          <p className="text-[11px] text-slate-400">
            Marine data (wave height, swell, etc.) is not applicable for inland locations.
            Switch to a coastal or ocean location to see marine conditions.
          </p>
        </div>
      ) : marineData ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          {/* Wave Height */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
              <Waves className="w-3.5 h-3.5" />
              <span>Wave Height</span>
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              {marineData.waveHeightM !== null ? `${marineData.waveHeightM.toFixed(1)} m` : 'UNAVAILABLE'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {marineData.wavePeriodS !== null ? `Period: ${marineData.wavePeriodS.toFixed(0)}s` : '—'}
            </p>
          </div>

          {/* Swell */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
              <Waves className="w-3.5 h-3.5" />
              <span>Swell Height</span>
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              {marineData.swellHeightM !== null ? `${marineData.swellHeightM.toFixed(1)} m` : 'UNAVAILABLE'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Dir: {getCardinal(marineData.waveDirectionDeg)}
            </p>
          </div>

          {/* Sea Surface Temp */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
              <Eye className="w-3.5 h-3.5" />
              <span>Sea Temp</span>
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              {marineData.seaSurfaceTempC !== null ? `${marineData.seaSurfaceTempC.toFixed(1)}°C` : 'UNAVAILABLE'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Sea surface</p>
          </div>

          {/* Ocean Current */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-semibold mb-1">
              <Wind className="w-3.5 h-3.5" />
              <span>Current</span>
            </div>
            <div className="text-base font-bold text-white tabular-nums">
              {marineData.oceanCurrentKmh !== null ? `${marineData.oceanCurrentKmh.toFixed(1)} km/h` : 'UNAVAILABLE'}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Ocean current velocity</p>
          </div>
        </div>
      ) : null}

      {/* Hourly Marine Forecast (next 12h) */}
      {marineData?.hourly && marineData.hourly.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0 overflow-x-auto">
          <div className="text-xs font-bold text-sky-300 mb-2">12-Hour Wave Forecast</div>
          <div className="flex gap-2 min-w-max">
            {marineData.hourly.slice(0, 12).map((h, idx) => {
              const timeLabel = h.time.split('T')[1]?.slice(0, 5) || '';
              return (
                <div key={idx} className="flex flex-col items-center gap-0.5 text-center min-w-[44px]">
                  <span className="text-[10px] text-slate-400">{timeLabel}</span>
                  <span className="text-xs font-bold text-white">
                    {h.waveHeightM !== null ? `${h.waveHeightM.toFixed(1)}m` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {h.swellHeightM !== null ? `${h.swellHeightM.toFixed(1)}s` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Chat for Marine Questions */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Ask AI About Marine Conditions</span>
        </div>

        {/* Quick prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {[
            `What are the current wave conditions at ${currentLocation.name}?`,
            `Is it safe to fish near ${currentLocation.name} today?`,
            `What is the weather forecast for fishermen at ${currentLocation.name}?`,
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAskAI(prompt)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-sky-950/40 border border-slate-700 hover:border-sky-500/40 text-left text-[11px] text-slate-300 hover:text-sky-300 transition-colors cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* Custom question */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleStartVoice}
            className={`px-2.5 py-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/50'
                : 'bg-slate-800 border border-slate-700 text-sky-400 hover:bg-slate-750'
            }`}
            title={isRecording ? 'Listening… tap to stop' : 'Ask by voice (Gemini Voice Assistant)'}
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5 text-white" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <input
            type="text"
            value={aiQuestion}
            onChange={(e) => setAiQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskAI(aiQuestion)}
            placeholder={isRecording ? 'Listening… Speak now' : 'Ask a marine weather question…'}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
          />
          <button
            type="button"
            onClick={() => handleAskAI(aiQuestion)}
            disabled={aiLoading || !aiQuestion.trim()}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ask'}
          </button>
        </div>

        {/* AI Answer */}
        {(aiLoading || aiAnswer) && (
          <div className="mt-3 p-3 rounded-lg bg-sky-950/30 border border-sky-500/20">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-sky-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating marine weather analysis…</span>
              </div>
            ) : (
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{aiAnswer}</p>
            )}
          </div>
        )}
      </div>

      {/* Data Source Notice */}
      <div className="text-[10px] text-slate-500 text-center pb-1">
        Marine data: Open-Meteo Marine API · Weather: Open-Meteo Forecast API · AI: Gemini (grounded on verified data)
      </div>
    </div>
  );
};
