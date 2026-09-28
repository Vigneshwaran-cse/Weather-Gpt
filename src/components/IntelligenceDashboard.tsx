import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CloudRain, Droplets, Mic, MicOff, Search, Sprout, Thermometer, Volume2, Waves, Wind, WifiOff, Zap, RefreshCw, MapPin, BarChart3, Sparkles } from 'lucide-react';
import type { WeatherIntelligenceBrief, ClimateInsight, RiskLevel } from '../../services/briefTypes';
import type { LocationData } from '../types';
import { searchLocations, type GeocodeResult } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { briefLabels, SPEECH_LANG } from '../i18n/briefLabels';

interface Props {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onOpenLegacyChat: () => void;
}
type Ctx = 'general' | 'farming' | 'marine' | 'climate';

const CACHE_KEY = 'weathergpt_latest_brief';
const SAVER_KEY = 'weathergpt_data_saver';
const RISK_STYLE: Record<RiskLevel, string> = { LOW: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', MODERATE: 'bg-amber-500/15 text-amber-300 border-amber-500/40', HIGH: 'bg-orange-500/20 text-orange-300 border-orange-500/50', EXTREME: 'bg-rose-600/25 text-rose-200 border-rose-500/60' };
const EXAMPLES = ['Will it rain tomorrow?', 'Is there any warning near me?', 'How will the weather affect travel?', 'What should I prepare for?'];

const fmtTime = (iso?: string) => { try { return iso ? new Date(iso).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '—'; } catch { return '—'; } };
const sameSpot = (b: WeatherIntelligenceBrief | null, l: { latitude: number; longitude: number }) => !!b && Math.abs(b.location.latitude - l.latitude) < 0.05 && Math.abs(b.location.longitude - l.longitude) < 0.05;
const readCache = (l?: { latitude: number; longitude: number }): WeatherIntelligenceBrief | null => { try { const b = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return !l || sameSpot(b, l) ? b : null; } catch { return null; } };
type DataState = 'LIVE' | 'RECENT' | 'CACHED' | 'STALE' | 'OFFLINE';
const STATE_STYLE: Record<DataState, string> = { LIVE: 'bg-emerald-600 text-white', RECENT: 'bg-sky-600 text-white', CACHED: 'bg-amber-600 text-white', STALE: 'bg-orange-700 text-white', OFFLINE: 'bg-slate-600 text-white' };
/** LIVE: just retrieved from sources. RECENT: fetched <3h ago. CACHED: saved copy (refresh failed / source served cache). STALE: >6h old. OFFLINE: no connection. */
function dataState(b: WeatherIntelligenceBrief, online: boolean, fromCache: boolean): DataState {
  const age = Date.now() - new Date(b.generatedAt).getTime();
  if (!online) return 'OFFLINE';
  if (age > 6 * 3600e3) return 'STALE';
  if (fromCache || b.sources.some((x) => x.status === 'cached')) return 'CACHED';
  if (age < 15 * 60e3) return 'LIVE';
  return 'RECENT';
}

export const IntelligenceDashboard: React.FC<Props> = ({ currentLocation, onSelectLocation, onOpenLegacyChat }) => {
  const { language } = useLanguage();
  const L = briefLabels(language);
  const [question, setQuestion] = useState('');
  const [brief, setBrief] = useState<WeatherIntelligenceBrief | null>(() => readCache(currentLocation));
  const [fromCache, setFromCache] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [weak, setWeak] = useState(false);
  const [saver, setSaver] = useState(() => localStorage.getItem(SAVER_KEY) === '1');
  const [ctx, setCtx] = useState<Ctx>('general');
  const [crop, setCrop] = useState('');
  const [listening, setListening] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [climate, setClimate] = useState<ClimateInsight | null>(null);
  const [climateGo, setClimateGo] = useState(false);
  const [climateErr, setClimateErr] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    const conn = (navigator as any).connection;
    const upd = () => setWeak(!!conn && (['slow-2g', '2g'].includes(conn.effectiveType) || conn.saveData === true));
    upd(); conn?.addEventListener?.('change', upd);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); conn?.removeEventListener?.('change', upd); };
  }, []);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = SPEECH_LANG[language] || 'en-IN';
    window.speechSynthesis.speak(u);
  }, [language]);

  const load = useCallback(async (q: string, opts: { speakIt?: boolean; skipAi?: boolean } = {}) => {
    if (!navigator.onLine) {
      const c = readCache(currentLocation); setBrief(c); setFromCache(true);
      setError(c ? null : 'You are offline and no verified data is saved yet.'); return;
    }
    inflight.current?.abort(); const ac = new AbortController(); inflight.current = ac;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: currentLocation, question: q || undefined, language, marine: ctx === 'marine', farming: ctx === 'farming' && crop.trim() ? { crop: crop.trim() } : null, skipAi: opts.skipAi ?? saver }),
        signal: AbortSignal.any([ac.signal, AbortSignal.timeout(30000)]),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Weather information is temporarily unavailable.');
      const b = data as WeatherIntelligenceBrief;
      setBrief(b); setFromCache(false);
      if (b.status !== 'UNAVAILABLE') { try { localStorage.setItem(CACHE_KEY, JSON.stringify(b)); } catch { /* quota */ } }
      if (opts.speakIt) speak(`${b.summary.headline} ${b.summary.whatItMeans}`);
    } catch (e: any) {
      if (ac.signal.aborted) return;
      const c = readCache(currentLocation);
      if (c) { setBrief(c); setFromCache(true); }
      setError(c ? 'Could not refresh — showing last verified information.' : (e?.message || 'Weather information is temporarily unavailable.'));
    } finally { setLoading(false); }
  }, [currentLocation, language, ctx, crop, saver, speak]);

  // Auto-load on location/language/context change, unless Data Saver is on (then user refreshes manually)
  useEffect(() => { if (!saver && ctx !== 'climate' && (ctx !== 'farming' || crop.trim())) load(''); /* eslint-disable-next-line */ }, [currentLocation.latitude, currentLocation.longitude, language, ctx]);
  useEffect(() => { if (saver && !brief) load('', { skipAi: true }); /* eslint-disable-next-line */ }, []);
  useEffect(() => { document.documentElement.dataset.saver = saver ? 'on' : 'off'; }, [saver]);

  useEffect(() => {
    if (ctx !== 'climate' || !online || (saver && !climateGo)) return;
    setClimate(null); setClimateErr(null);
    fetch(`/api/climate?lat=${currentLocation.latitude}&lon=${currentLocation.longitude}&range=5`).then((r) => r.json().then((j) => (r.ok ? setClimate(j) : setClimateErr(j.error)))).catch(() => setClimateErr('Climate data unavailable.'));
  }, [ctx, currentLocation.latitude, currentLocation.longitude, online, climateGo]);

  useEffect(() => {
    if (search.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => searchLocations(search).then(setResults).catch(() => setResults([])), 350);
    return () => clearTimeout(t);
  }, [search]);

  const toggleSaver = () => { const v = !saver; setSaver(v); localStorage.setItem(SAVER_KEY, v ? '1' : '0'); };

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setError('Voice input is not supported in this browser.'); return; }
    if (listening) { recRef.current?.stop(); return; }
    const r = new SR(); r.lang = SPEECH_LANG[language] || 'en-IN'; r.interimResults = false;
    r.onresult = (ev: any) => { const text = ev.results[0][0].transcript; setQuestion(text); load(text, { speakIt: true }); };
    r.onerror = () => setListening(false); r.onend = () => setListening(false);
    recRef.current = r; setListening(true); r.start();
  };

  const b = sameSpot(brief, currentLocation) ? brief : null;
  const isOffline = !online;
  const disaster = !!b?.disasterMode;
  const official = b?.officialWarnings;

  const OfficialBlock = () => (
    <section aria-label={L.official} className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 space-y-1.5">
      {official?.available && official.warnings.length ? official.warnings.map((w, i) => (
        <div key={i} className="text-xs space-y-0.5">
          <div className="font-extrabold text-rose-200 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />{L.official}{w.level && w.level !== 'UNKNOWN' ? ` — ${w.level}` : ''}</div>
          <div className="text-slate-300">Source: IMD</div>
          {w.issued && <div className="text-slate-300">Issued: {fmtTime(w.issued)}</div>}
          {(w.validTo || w.validFrom) && <div className="text-slate-300">Valid: {w.validFrom ? fmtTime(w.validFrom) + ' → ' : 'until '}{fmtTime(w.validTo)}</div>}
          <div className="text-slate-100 font-semibold">{w.title}: {w.message}</div>
        </div>
      )) : <div className="text-xs text-slate-300">{official?.available ? L.noWarn : `IMD unavailable — ${official?.unavailableReason ?? 'not reachable'}. Showing forecast-based analysis only.`}</div>}
    </section>
  );
  const Interp = () => b && (
    <section aria-label={L.interp} className="rounded-xl border border-sky-500/30 bg-slate-900/70 p-3 space-y-2 text-sm">
      <div className="flex items-center justify-between gap-2"><h3 className="text-[11px] font-extrabold tracking-wider text-sky-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{L.interp}</h3><span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${RISK_STYLE[b.summary.riskLevel]}`}>{b.summary.riskLevel}</span></div>
      <p className="font-semibold text-slate-100">{b.summary.headline}</p>
      <div><div className="text-[10px] font-bold tracking-wider text-slate-400">{L.means}</div><p className="text-slate-200">{b.summary.whatItMeans}</p></div>
      <p className="text-[10px] text-slate-500">{b.summary.sourceNote}. WeatherGPT risk is calculated, not an official warning.</p>
      <button type="button" onClick={() => speak(`${b.summary.headline} ${b.summary.whatItMeans}`)} className="text-[11px] flex items-center gap-1 text-sky-300 hover:text-sky-200 cursor-pointer"><Volume2 className="w-3.5 h-3.5" />Read aloud</button>
    </section>
  );
  const Actions = () => b && (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><h3 className="text-[11px] font-extrabold tracking-wider text-emerald-300 mb-1.5">{L.actions}</h3><ul className="space-y-1 text-sm text-slate-200 list-disc pl-4">{b.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></section>
  );
  const Footer = () => b && (
    <section className="text-[10px] text-slate-400 space-y-1 pt-1">
      <div className="font-bold tracking-wider text-slate-300">{L.sources}</div>
      <div className="flex flex-wrap gap-1">{b.sources.filter((s) => s.status !== 'skipped').map((s) => <span key={s.name} title={s.note} className={`px-1.5 py-0.5 rounded border ${s.status === 'ok' ? 'border-emerald-600/50 text-emerald-300' : s.status === 'cached' ? 'border-amber-600/50 text-amber-300' : 'border-rose-600/50 text-rose-300'}`}>{s.name}{s.status === 'unavailable' ? ' ✕' : ''}</span>)}</div>
      <div>{L.updated}: {fmtTime(b.generatedAt)}</div>
    </section>
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none space-y-2.5 pb-3 pr-0.5" data-saver={saver}>
      {/* Status strip */}
      {(isOffline || weak) && (
        <div role="status" className="rounded-lg border border-amber-500/50 bg-amber-950/60 p-2 text-[11px] text-amber-200 flex items-start gap-1.5"><WifiOff className="w-4 h-4 shrink-0" />
          <div>{isOffline ? <><b>{L.offline}</b> — {b ? <>Last verified: {fmtTime(b.generatedAt)}. This information may be outdated.</> : 'No saved verified data yet.'}</> : <><b>Weak network</b> — consider Data Saver.</>}</div></div>
      )}
      {b && <div className="flex items-center gap-1.5 text-[10px]"><span className={`px-2 py-0.5 rounded-full font-bold ${STATE_STYLE[dataState(b, online, fromCache)]}`}>{dataState(b, online, fromCache)}</span><span className="text-slate-400">Last verified {fmtTime(b.generatedAt)}</span>{loading && <RefreshCw className="w-3 h-3 animate-spin text-sky-300" />}</div>}
      {b && b.sources.some((source) => source.name.startsWith('Gemini') && source.status === 'unavailable') && (
        <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-2 text-[11px] text-amber-200">
          Gemini AI is not configured. Showing verified weather data with a local explanation. Add <code className="font-mono">GEMINI_API_KEY</code> to the server environment for AI answers.
        </div>
      )}
      {/* Top: location + search */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0"><div className="text-[10px] text-slate-400 font-bold tracking-wider">WEATHERGPT</div><div className="flex items-center gap-1 text-sm font-bold text-slate-100 truncate"><MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />{currentLocation.name}{currentLocation.state ? `, ${currentLocation.state}` : ''}</div></div>
        <button type="button" onClick={toggleSaver} aria-pressed={saver} className={`text-[10px] px-2 py-1 rounded-lg border cursor-pointer ${saver ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-600 text-slate-300'}`}>DATA SAVER {saver ? 'ON' : 'OFF'}</button>
      </div>
      <div className="relative">
        <input aria-label="Search location" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Change location (e.g. Nagercoil)" className="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500" />
        {results.length > 0 && <ul className="absolute z-20 mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg overflow-hidden text-xs shadow-xl">{results.slice(0, 6).map((r, i) => <li key={i}><button type="button" className="w-full text-left px-3 py-1.5 hover:bg-slate-800 cursor-pointer" onClick={() => { onSelectLocation({ name: r.name, state: r.admin1, country: r.country, latitude: r.latitude, longitude: r.longitude }); setSearch(''); setResults([]); }}>{r.name}{r.admin1 ? `, ${r.admin1}` : ''}{r.country ? ` · ${r.country}` : ''}</button></li>)}</ul>}
      </div>
      {/* Ask */}
      <form onSubmit={(e) => { e.preventDefault(); load(question.trim()); }} className="flex items-center gap-1.5">
        <div className="flex-1 relative"><Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" /><input aria-label="Ask WeatherGPT" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={L.ask} className="w-full bg-slate-900/80 border border-sky-700/50 rounded-xl pl-8 pr-2 py-2 text-xs text-slate-100 placeholder-slate-500" /></div>
        <button type="button" onClick={startVoice} aria-label="Voice input" className={`p-2 rounded-xl border cursor-pointer ${listening ? 'bg-rose-600 border-rose-400 animate-pulse' : 'bg-slate-900 border-slate-600'}`}>{listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
        <button type="submit" disabled={loading} className="px-3 py-2 rounded-xl bg-sky-500 text-slate-950 text-xs font-bold disabled:opacity-50 cursor-pointer">{loading ? '…' : 'Ask'}</button>
      </form>
      <div className="flex flex-wrap gap-1">{EXAMPLES.map((e) => <button key={e} type="button" onClick={() => { setQuestion(e); load(e); }} className="text-[10px] px-2 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:border-sky-500 cursor-pointer">{e}</button>)}</div>
      {/* Context chips */}
      <div className="flex gap-1 text-[11px]" role="tablist">{([['general', 'General', null], ['farming', 'Farming', Sprout], ['marine', 'Marine', Waves], ['climate', 'Climate', BarChart3]] as const).map(([k, label, Icon]) => <button key={k} type="button" role="tab" aria-selected={ctx === k} onClick={() => setCtx(k)} className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${ctx === k ? 'bg-sky-600 border-sky-400 text-white' : 'bg-slate-900/70 border-slate-700 text-slate-300'}`}>{Icon && <Icon className="w-3.5 h-3.5" />}{label}</button>)}</div>
      {ctx === 'farming' && (
        <div className="flex gap-1.5"><input aria-label="Crop" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="Crop (e.g. Rice)" className="flex-1 bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs" /><button type="button" onClick={() => load(question.trim())} disabled={!crop.trim()} className="px-3 rounded-lg bg-emerald-600 text-xs font-bold disabled:opacity-40 cursor-pointer">Go</button></div>
      )}
      {saver && <div className="text-[10px] text-emerald-300 flex items-center gap-1.5"><Zap className="w-3 h-3" />Data Saver: text-first, no automatic AI requests.<button type="button" onClick={() => load(question.trim(), { skipAi: true })} className="underline cursor-pointer">Refresh</button></div>}
      {error && <div role="alert" className="text-xs rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-200 p-2">{error}</div>}
      {loading && !b && <div className="text-xs text-slate-400 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" />Retrieving verified data…</div>}

      {ctx === 'climate' && (
        <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3 space-y-2"><h3 className="text-[11px] font-extrabold tracking-wider text-sky-300">CLIMATE INSIGHT</h3>
          {climateErr && <div className="text-xs text-rose-300">{climateErr}</div>}
          {!climate && !climateErr && (saver && !climateGo ? <button type="button" onClick={() => setClimateGo(true)} className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 cursor-pointer">Load climate insight (Data Saver)</button> : <div className="text-xs text-slate-400">Loading historical data…</div>)}
          {climate && <>
            <p className="text-sm text-slate-200">{climate.explanation}</p>
            <svg viewBox="0 0 300 110" className="w-full" role="img" aria-label="Yearly rainfall chart">{(() => { const mx = Math.max(1, ...climate.yearly.map((y) => y.rainfallMm)); const w = 300 / climate.yearly.length; return climate.yearly.map((y, i) => { const h = (y.rainfallMm / mx) * 80; return <g key={y.year}><rect x={i * w + 6} y={90 - h} width={w - 12} height={h} rx="3" fill="#38bdf8" /><text x={i * w + w / 2} y={102} textAnchor="middle" fontSize="9" fill="#94a3b8">{y.year}</text><text x={i * w + w / 2} y={86 - h} textAnchor="middle" fontSize="8" fill="#e2e8f0">{y.rainfallMm}</text></g>; }); })()}</svg>
            <p className="text-[10px] text-slate-500">Yearly rainfall (mm). Source: Open-Meteo Historical. Simple averages, not a climate projection.</p>
          </>}
        </section>
      )}

      {b && ctx !== 'climate' && (
        disaster ? (
          /* ===== DISASTER MODE: simplified, emergency info first ===== */
          <div className="space-y-2.5">
            <div role="alert" className="rounded-xl bg-rose-700 text-white p-3 font-extrabold text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5" />🚨 {L.disaster}</div>
            <section className="rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm space-y-1"><div className="text-[10px] font-bold tracking-wider text-slate-400">{L.happening}</div><div className="text-slate-100 font-semibold">{b.summary.headline}</div><div className="text-[10px] font-bold tracking-wider text-slate-400 pt-1">WHERE?</div><div className="text-slate-100">📍 {b.location.name}{b.location.state ? `, ${b.location.state}` : ''}</div></section>
            <OfficialBlock />
            <Interp />
            <Actions />
            <Footer />
          </div>
        ) : (
          <div className="space-y-2.5">
            <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-3"><h3 className="text-[11px] font-extrabold tracking-wider text-sky-300 mb-2">{L.current}{b.forecast ? ` · ${b.forecast.focusLabel.toUpperCase()}` : ''}</h3>
              {b.current ? <div className="grid grid-cols-2 gap-2 text-sm text-slate-100">
                <div className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-orange-300" />{Math.round(b.current.temperature)}°C <span className="text-[10px] text-slate-400">{b.forecast ? `(${Math.round(b.forecast.tempMin)}–${Math.round(b.forecast.tempMax)}°)` : ''}</span></div>
                <div className="flex items-center gap-1.5"><CloudRain className="w-4 h-4 text-sky-300" />{b.forecast ? b.forecast.rainProbabilityMax : b.current.rainProbability}% rain</div>
                <div className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-teal-300" />{Math.round(b.current.windSpeed)} km/h</div>
                <div className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-blue-300" />{Math.round(b.current.humidity)}%</div>
                <div className="col-span-2 text-slate-300">{b.current.condition}</div></div> : <div className="text-xs text-slate-400">{b.message}</div>}
            </section>
            <div><h3 className="text-[11px] font-extrabold tracking-wider text-rose-300 mb-1">{L.warnings}</h3><OfficialBlock /></div>
            {b.hazards.hazards.length > 0 && <div className="flex flex-wrap gap-1">{b.hazards.hazards.map((h, i) => <span key={i} title={h.reason} className={`text-[10px] px-2 py-0.5 rounded-full border ${RISK_STYLE[h.level]}`}>{h.label}</span>)}</div>}
            <Interp />
            <Actions />
            {b.farming && <section className="rounded-xl border border-emerald-600/40 bg-emerald-950/30 p-3 text-sm space-y-1"><h3 className="text-[11px] font-extrabold tracking-wider text-emerald-300">FARMING WEATHER BRIEF</h3><div>Crop: <b>{b.farming.crop}</b></div><div>Weather: {b.farming.weatherLine}</div><div>Impact: {b.farming.impact}</div><div>Action: {b.farming.action}</div><p className="text-[10px] text-slate-400">{b.farming.label}</p></section>}
            {b.marine && <section className="rounded-xl border border-cyan-600/40 bg-cyan-950/30 p-3 text-sm space-y-1"><h3 className="text-[11px] font-extrabold tracking-wider text-cyan-300">MARINE WEATHER BRIEF</h3>
              {b.marine.snapshot?.isSea ? <div className="grid grid-cols-2 gap-1"><div>Wave: {b.marine.snapshot.waveHeightM ?? '—'} m</div><div>Swell: {b.marine.snapshot.swellHeightM ?? '—'} m</div><div>Period: {b.marine.snapshot.wavePeriodS ?? '—'} s</div><div>Wind: {b.marine.snapshot.windKmh != null ? Math.round(b.marine.snapshot.windKmh) : '—'} km/h</div></div> : <div className="text-slate-300">{b.marine.error || 'No marine data at this point (inland?). Pick a coastal location.'}</div>}
              <div><b>Official advisory:</b> {b.marine.officialAdvisory}</div><div><b>WeatherGPT interpretation:</b> {b.marine.interpretation}</div><p className="text-[10px] text-amber-300">{b.marine.disclaimer}</p></section>}
            {b.forecast && <details className="rounded-xl border border-slate-700 bg-slate-900/50 p-2 text-xs"><summary className="cursor-pointer text-slate-300 font-semibold">7-day forecast ({b.forecast.model})</summary><div className="mt-1 space-y-0.5">{b.forecast.daily.map((d) => <div key={d.date} className="flex justify-between text-slate-300"><span>{d.dayOfWeek}</span><span>{Math.round(d.tempMin)}–{Math.round(d.tempMax)}°C</span><span>{d.rainProbabilityMax}% · {d.precipitationSum.toFixed(1)} mm</span></div>)}</div></details>}
            <Footer />
          </div>
        )
      )}
      <div className="flex items-center justify-between pt-1">
        <button type="button" onClick={onOpenLegacyChat} className="text-[10px] text-slate-400 underline cursor-pointer">Open full chat</button>
      </div>
    </div>
  );
};
