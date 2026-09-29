import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Plane,
  Wind,
  Gauge,
  Cloud,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Mic,
  MicOff,
} from 'lucide-react';
import { OccupationDashboardProps } from './types';
import { useLanguage } from '../../i18n/LanguageContext';
import { SPEECH_LANG } from '../../i18n/briefLabels';
import { transcribeAudioApi } from '../../services/api';

export const AviationDashboard: React.FC<OccupationDashboardProps> = ({
  currentLocation,
  weatherData,
  onBackToSelector,
  onChangeMode,
  onOpenChatWithPrompt,
}) => {
  const { t, language } = useLanguage();
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
  const temp = current ? Math.round(current.temperature) : null;
  const humidity = current ? current.humidity : null;
  const rainProb = current ? current.rainProbability : 0;
  const visibility = current?.visibility; // km from Open-Meteo
  const weatherCode = current?.weatherCode ?? 0;

  // Dew point estimation from temp & humidity (Magnus formula approximation)
  const dewPoint =
    temp !== null && humidity !== null
      ? Math.round(temp - (100 - humidity) / 5)
      : null;

  // Flight Category: derived from real visibility and weather code (no fabrication)
  // VFR: visibility >5km, no significant precipitation
  // MVFR: visibility 3-5km or moderate rain
  // IFR: visibility <3km or heavy rain/thunderstorm
  let flightCategory = 'UNKNOWN';
  let flightCategoryColor = 'text-slate-400 bg-slate-800/50 border-slate-600/30';
  let flightCategoryDesc = 'Insufficient data for flight category assessment';

  if (current) {
    const hasThunder = [95, 96, 99].includes(weatherCode);
    const hasHeavyRain = [65, 67, 82].includes(weatherCode);
    const hasRain = rainProb > 60 || [61, 63, 65, 80, 81, 82].includes(weatherCode);
    const visKm = visibility;

    if (hasThunder || hasHeavyRain || (visKm !== undefined && visKm < 1.6)) {
      flightCategory = 'IFR';
      flightCategoryColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      flightCategoryDesc = 'Instrument Flight Rules — Low visibility or severe weather. Contact ATC and check NOTAMs.';
    } else if (hasRain || (windKnots !== null && windKnots > 25) || (visKm !== undefined && visKm < 5)) {
      flightCategory = 'MVFR';
      flightCategoryColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      flightCategoryDesc = 'Marginal VFR — Exercise caution. Check official weather briefing.';
    } else {
      flightCategory = 'VFR';
      flightCategoryColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      flightCategoryDesc = 'Visual Flight Rules conditions. Verify with official pre-flight briefing.';
    }
  }

  // Density altitude deviation (approximate: +118 ft per °C above ISA 15°C)
  const isaDeviation = temp !== null ? temp - 15 : null;
  const densityAltitudeOffset = isaDeviation !== null ? Math.round(isaDeviation * 120) : null;

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
        }),
      });
      const data = await res.json();
      setAiAnswer(data.reply || 'No response received.');
    } catch {
      setAiAnswer('Unable to connect to AI. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const getCardinal = (angle: number | null) => {
    if (angle === null) return '—';
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(angle / 45) % 8];
  };

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
          <button
            type="button"
            onClick={() => onChangeMode('maritime')}
            className="text-slate-400 hover:text-sky-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ⚓ {t('maritime')}
          </button>
          <span className="font-semibold text-indigo-400 bg-indigo-950/40 border border-indigo-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
            ✈️ {t('aviation')}
          </span>
        </div>
      </div>

      {/* Main Mode Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-950/30 to-slate-900/90 border border-indigo-500/30 p-3 sm:p-4 shadow-md backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Plane className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2 truncate">
              <span>{t('aviationTitle')}</span>
              <span className="text-[10px] font-semibold text-indigo-400">· {currentLocation.name}</span>
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              Real Open-Meteo weather data · For planning reference only — always verify with official ATC/met briefing
            </p>
          </div>
        </div>

        {/* Flight Category Banner */}
        {current ? (
          <div className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-2 ${flightCategoryColor}`}>
            <div className="flex items-center gap-2">
              {flightCategory === 'VFR' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-bold">
                  Flight Category: {flightCategory} — {current.condition}
                </div>
                <div className="text-[10px] text-slate-300">{flightCategoryDesc}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 p-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs">
            Weather data loading…
          </div>
        )}
      </div>

      {/* Disclaimer — no synthetic METAR */}
      <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300">
        ⚠️ <strong>Official METAR/ATIS not available.</strong> The data below is from Open-Meteo NWP models.
        Always obtain official METAR, TAF, SIGMET and NOTAM from your national aviation authority before flight.
      </div>

      {/* Aviation Telemetry Grid — Real Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
        {/* Surface Wind */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Wind className="w-3.5 h-3.5" />
            <span>Surface Wind</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {windKnots !== null ? `${windKnots} kts ${getCardinal(windDirection)}` : 'UNAVAILABLE'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {windKmh !== null ? `${windKmh} km/h · ${windDirection}°` : '—'}
          </p>
        </div>

        {/* Visibility */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Gauge className="w-3.5 h-3.5" />
            <span>Visibility</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {visibility !== undefined ? `${visibility} km` : 'UNAVAILABLE'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">Horizontal visibility</p>
        </div>

        {/* Temperature / Dew Point */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <Cloud className="w-3.5 h-3.5" />
            <span>Temp / Dew</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {temp !== null ? `${temp}°C` : 'UNAVAILABLE'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Dew: {dewPoint !== null ? `${dewPoint}°C` : '—'} · RH: {humidity ?? '—'}%
          </p>
        </div>

        {/* Density Altitude Offset */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ISA Deviation</span>
          </div>
          <div className="text-base font-bold text-white tabular-nums">
            {densityAltitudeOffset !== null
              ? `${densityAltitudeOffset >= 0 ? '+' : ''}${densityAltitudeOffset} ft`
              : 'UNAVAILABLE'}
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            ISA dev: {isaDeviation !== null ? `${isaDeviation >= 0 ? '+' : ''}${isaDeviation}°C` : '—'}
          </p>
        </div>
      </div>

      {/* AI Chat for Aviation Questions */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Ask AI About Aviation Weather</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
          {[
            `What are the wind and visibility conditions for flying near ${currentLocation.name}?`,
            `Is there any thunderstorm or severe weather risk near ${currentLocation.name} today?`,
            `What is the cloud cover and precipitation forecast for ${currentLocation.name}?`,
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleAskAI(prompt)}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-indigo-950/40 border border-slate-700 hover:border-indigo-500/40 text-left text-[11px] text-slate-300 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              "{prompt}"
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleStartVoice}
            className={`px-2.5 py-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/50'
                : 'bg-slate-800 border border-slate-700 text-indigo-400 hover:bg-slate-750'
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
            placeholder={isRecording ? 'Listening… Speak now' : 'Ask an aviation weather question…'}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => handleAskAI(aiQuestion)}
            disabled={aiLoading || !aiQuestion.trim()}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ask'}
          </button>
        </div>

        {(aiLoading || aiAnswer) && (
          <div className="mt-3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/20">
            {aiLoading ? (
              <div className="flex items-center gap-2 text-xs text-indigo-300">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Generating aviation weather analysis…</span>
              </div>
            ) : (
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">{aiAnswer}</p>
            )}
          </div>
        )}
      </div>

      <div className="text-[10px] text-slate-500 text-center pb-1">
        Data: Open-Meteo Forecast API · AI: Gemini (grounded on verified data) · Not for official navigation use
      </div>
    </div>
  );
};
