import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, ArrowRight, MapPin } from 'lucide-react';
import { LocationData } from '../types';
import { searchLocations, GeocodeResult } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { SPEECH_LANG } from '../i18n/briefLabels';

interface HeroBannerProps {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onAskQuestion: (question: string) => void;
  isLoading?: boolean;
}

const EXAMPLE_PROMPTS = [
  'Will it rain tomorrow?',
  'Is there any warning near me?',
  'How will the weather affect travel?',
  'What should I prepare for?',
];

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentLocation,
  onSelectLocation,
  onAskQuestion,
  isLoading = false,
}) => {
  const { language } = useLanguage();
  const [question, setQuestion] = useState('');
  const [listening, setListening] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocationResults, setSearchLocationResults] = useState<GeocodeResult[]>([]);
  const speechRecRef = useRef<any>(null);

  // Search locations autocomplete
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchLocationResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchLocations(searchQuery)
        .then((res) => {
          setSearchLocationResults(res);
        })
        .catch(() => {
          setSearchLocationResults([]);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!question.trim()) return;
    onAskQuestion(question.trim());
  };

  const handlePromptClick = (prompt: string) => {
    setQuestion(prompt);
    onAskQuestion(prompt);
  };

  const startVoiceInput = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('Voice input is not supported in this browser.');
      return;
    }
    if (listening) {
      speechRecRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = SPEECH_LANG[language] || 'en-IN';
    rec.interimResults = false;
    rec.onresult = (ev: any) => {
      const text = ev.results[0][0].transcript;
      setQuestion(text);
      onAskQuestion(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    speechRecRef.current = rec;
    setListening(true);
    rec.start();
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-white dark:bg-[#121826] border border-slate-200/90 dark:border-slate-800/90 p-6 sm:p-8 shadow-sm">
      {/* Coastal Landscape Background Banner Vector Illustration matching Reference Image 1 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden flex items-center justify-end">
        {/* Vector Coastal Shore / Lighthouse Landmark SVG Artwork */}
        <svg
          viewBox="0 0 900 300"
          className="w-full h-full object-cover object-right opacity-40 dark:opacity-20"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#1d89f5" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="seaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Sky background layer */}
          <rect width="900" height="300" fill="url(#skyGrad)" />

          {/* Soft Clouds */}
          <path d="M500,40 Q530,20 570,35 Q610,10 660,35 Q710,20 740,50 L900,50 L900,300 L500,300 Z" fill="#ffffff" opacity="0.6" />
          <path d="M300,70 Q340,40 390,60 Q440,30 490,60 L900,60 L900,300 L300,300 Z" fill="#ffffff" opacity="0.3" />

          {/* Ocean Sea Waters */}
          <path d="M350,230 Q550,190 900,240 L900,300 L350,300 Z" fill="url(#seaGrad)" />

          {/* Sandy Beach Shore */}
          <path d="M480,260 Q650,210 900,270 L900,300 L480,300 Z" fill="#fef08a" opacity="0.5" />

          {/* Mahabalipuram / Coastal Lighthouse Landmark */}
          {/* Lighthouse Base & Tower */}
          <path d="M720,250 L728,120 L742,120 L750,250 Z" fill="#1e293b" />
          {/* Red Stripes on Lighthouse */}
          <path d="M725,180 L745,180 L743,150 L727,150 Z" fill="#ef4444" />
          <path d="M727,135 L743,135 L742,120 L728,120 Z" fill="#ef4444" />
          {/* Light Beacon Top */}
          <path d="M724,120 L746,120 L735,100 Z" fill="#f59e0b" />
          <circle cx="735" cy="110" r="6" fill="#fef08a" opacity="0.9" />

          {/* Shore Temple Silhouette */}
          <path d="M830,250 L830,190 L840,190 L840,170 L850,170 L850,140 L855,140 L855,170 L865,170 L865,190 L875,190 L875,250 Z" fill="#475569" opacity="0.7" />

          {/* Palm Trees along Coast */}
          <path d="M790,260 Q795,200 810,180" stroke="#334155" strokeWidth="4" fill="none" />
          <path d="M810,180 Q785,170 770,175 M810,180 Q830,165 845,170 M810,180 Q825,195 835,200 M810,180 Q790,195 780,190" stroke="#15803d" strokeWidth="3" fill="none" />

          <path d="M680,265 Q683,215 695,195" stroke="#334155" strokeWidth="3.5" fill="none" />
          <path d="M695,195 Q675,185 660,190 M695,195 Q715,180 730,185 M695,195 Q710,210 720,215" stroke="#15803d" strokeWidth="2.5" fill="none" />
        </svg>

        {/* Soft Gradient Overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent dark:from-[#121826] dark:via-[#121826]/80 dark:to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl space-y-4">
        {/* Title Header */}
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Hello! <br />
            <span className="text-[#1D89F5] dark:text-[#38BDF8]">Ask WeatherGPT</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium mt-1.5 max-w-xl">
            Get accurate weather information, official alerts and actionable advice in your language.
          </p>
        </div>

        {/* Change Location Input */}
        <div className="relative max-w-md">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#1D89F5] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Location: ${currentLocation.name}${currentLocation.state ? `, ${currentLocation.state}` : ''} (Type city)`}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {searchLocationResults.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-30 text-xs">
              {searchLocationResults.slice(0, 6).map((res, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectLocation({
                        name: res.name,
                        state: res.admin1,
                        country: res.country,
                        latitude: res.latitude,
                        longitude: res.longitude,
                      });
                      setSearchQuery('');
                      setSearchLocationResults([]);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span className="font-semibold">{res.name}</span>
                    <span className="text-slate-500 text-[11px] ml-1">
                      {[res.admin1, res.country].filter(Boolean).join(', ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Search & Ask Pill Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-2xl">
          <div className="relative w-full flex items-center bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 rounded-full shadow-md px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-blue-500">
            <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about weather, warnings or climate..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />

            {/* Mic Input Button */}
            <button
              type="button"
              onClick={startVoiceInput}
              title="Voice assistant input"
              className={`p-2 rounded-full transition-colors cursor-pointer mr-2 ${
                listening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Send Question Arrow Button */}
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="w-9 h-9 rounded-full bg-[#1D89F5] hover:bg-blue-600 disabled:opacity-50 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-sm"
              aria-label="Submit question"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

        {/* Quick Suggestion Question Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handlePromptClick(prompt)}
              className="px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-slate-800/90 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-sky-300 text-xs font-medium transition-all shadow-2xs cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
