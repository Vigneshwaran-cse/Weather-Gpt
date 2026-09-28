import { Type } from '@google/genai';
import { getVerifiedWeatherData, type VerifiedWeatherData } from './weatherService.ts';
import { getAiClient } from './geminiService.ts';
import { getOfficialWarnings, getImdMarineAdvisory } from './imdService.ts';
import { getMarine } from './marineService.ts';
import { analyzeHazards } from './hazardEngine.ts';
import { cached, TTL, coordKey } from './cacheService.ts';
import type { BriefSource, OfficialWarningsResult, RiskLevel, WeatherIntelligenceBrief, MarineSnapshot } from './briefTypes.ts';

const LANGS: Record<string, string> = { en: 'English', hi: 'Hindi (Devanagari)', ta: 'Tamil (Tamil script)', te: 'Telugu (Telugu script)', ml: 'Malayalam (Malayalam script)', kn: 'Kannada (Kannada script)', mr: 'Marathi (Devanagari)' };

export interface IntelligenceRequest {
  location: { name: string; state?: string; country?: string; latitude: number; longitude: number };
  question?: string;
  language?: string;
  marine?: boolean;
  farming?: { crop: string } | null;
  skipAi?: boolean;
}

/** Deterministic date-intent extraction (today / tomorrow / day after) in supported languages. */
export function detectFocusOffset(q = ''): number {
  const s = q.toLowerCase();
  if (/day after tomorrow|parso|परसों|நாளை மறுநாள்|ఎల్లుండి|മറ്റന്നാൾ|ನಾಡಿದ್ದು/.test(s)) return 2;
  if (/tomorrow|kal\b|कल|நாளை|రేపు|നാളെ|ನಾಳೆ|उद्या/.test(s)) return 1;
  return 0;
}

function levelTitle(l: RiskLevel) { return l === 'EXTREME' ? 'EXTREME RISK' : l === 'HIGH' ? 'HIGH RISK' : l === 'MODERATE' ? 'MODERATE RISK' : 'LOW RISK'; }

// A credential-free deployment should remain usable for demos; production operators
// can opt into live provider status with DEMO_MODE=false.
const demoMode = () => process.env.DEMO_MODE?.trim().toLowerCase() !== 'false';

function demoWarnings(): OfficialWarningsResult {
  return {
    available: true,
    fetchedAt: new Date().toISOString(),
    warnings: [{
      source: 'DEMO',
      title: 'Simulated district advisory',
      level: 'YELLOW',
      message: 'Demo data: scattered rain and thunderstorms are possible. Check official IMD updates before making safety decisions.',
    }],
  };
}

function buildDeterministic(focusLabel: string, f: NonNullable<WeatherIntelligenceBrief['forecast']>, level: RiskLevel, hazardLabels: string[], officialPresent: boolean) {
  const head = `${focusLabel}: ${f.condition}, ${Math.round(f.tempMin)}–${Math.round(f.tempMax)}°C, rain chance ${f.rainProbabilityMax}% (${f.precipitationSum.toFixed(1)} mm).`;
  const means = hazardLabels.length
    ? `Detected: ${hazardLabels.join(', ')}. ${officialPresent ? 'An official warning is also in effect — follow it first.' : 'This is a WeatherGPT calculation, not an official warning.'}`
    : 'No significant weather hazard is indicated by the forecast data.';
  return { headline: head, whatItMeans: means, riskLevel: level };
}

async function explainWithGemini(ctx: unknown, question: string, language: string, actionsIn: string[]) {
  const ai = getAiClient();
  if (!ai) return null;
  try {
    const resp = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: `VERIFIED CONTEXT (JSON, the ONLY source of numbers):\n${JSON.stringify(ctx)}\n\nUSER QUESTION: ${question || 'What is happening around me and what should I do?'}`,
      config: {
        systemInstruction: `You are WeatherGPT's explainer. Answer ONLY from the verified context. NEVER invent or alter any weather number, warning, or date; if data is missing say it is unavailable. Do not merge or rewrite official IMD warning text; refer to it as "the official IMD warning". Never say it is "safe to sail". Keep it simple, 1-2 sentences for summary and whatItMeans, 3-5 short actions (you may rephrase the provided baseline actions). Write in ${LANGS[language] || 'English'}. Baseline actions: ${JSON.stringify(actionsIn)}`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: { summary: { type: Type.STRING }, whatItMeans: { type: Type.STRING }, actions: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ['summary', 'whatItMeans', 'actions'],
        },
        temperature: 0.2,
      },
    });
    const j = JSON.parse(resp.text || '{}');
    const nums = (t: string) => (t.match(/\d+(?:\.\d+)?/g) || []);
    const allowed = new Set<string>();
    nums(JSON.stringify(ctx)).forEach((n) => { allowed.add(n); allowed.add(String(Math.round(parseFloat(n)))); });
    const used = nums([j.summary, j.whatItMeans, ...(Array.isArray(j.actions) ? j.actions : [])].join(' '));
    if (used.some((n) => !allowed.has(n) && !allowed.has(String(Math.round(parseFloat(n)))))) { console.warn('Gemini output rejected: contains numbers not in verified context'); return null; }
    if (typeof j.summary === 'string' && typeof j.whatItMeans === 'string' && Array.isArray(j.actions) && j.actions.length) {
      return { summary: j.summary as string, whatItMeans: j.whatItMeans as string, actions: j.actions.map(String).slice(0, 6) };
    }
  } catch (e) { console.warn('Gemini explanation failed, using deterministic output:', (e as Error).message); }
  return null;
}

function farmingBrief(crop: string, f: NonNullable<WeatherIntelligenceBrief['forecast']>, cur: WeatherIntelligenceBrief['current'], humidity?: number) {
  const wind = Math.max(f.windMax, cur?.windSpeed ?? 0);
  const noSpray = f.rainProbabilityMax >= 50 || wind >= 25;
  return {
    crop,
    weatherLine: `Rain probability ${f.rainProbabilityMax}%, ${Math.round(f.tempMin)}–${Math.round(f.tempMax)}°C, wind up to ${Math.round(wind)} km/h${humidity != null ? `, humidity ${Math.round(humidity)}%` : ''}.`,
    impact: noSpray ? (f.rainProbabilityMax >= 50 ? 'Rain is likely, which can wash off sprays and affect spraying activities.' : 'Strong wind can cause spray drift.') : 'Forecast conditions look reasonable for spraying based on rain and wind only.',
    action: noSpray ? 'Consider a drier, calmer period for spraying.' : 'If you spray, prefer early morning or late evening and re-check the forecast first.',
    label: 'WeatherGPT-generated suggestion from forecast data only. No soil moisture or crop measurements are used.',
  };
}

export async function buildBrief(req: IntelligenceRequest): Promise<WeatherIntelligenceBrief> {
  const { location: loc } = req;
  const language = req.language && LANGS[req.language] ? req.language : 'en';
  const key = coordKey(loc.latitude, loc.longitude);
  const sources: BriefSource[] = [];
  const now = new Date().toISOString();

  // 1) NWP forecast (Open-Meteo) — cached, stale fallback
  let weather: VerifiedWeatherData | null = null;
  try {
    const r = await cached(`wx:${key}`, TTL.weather, () => getVerifiedWeatherData(loc.latitude, loc.longitude, loc.name, loc.state, loc.country, 'best_match'));
    weather = r.value;
    sources.push({ name: 'Open-Meteo Forecast (NWP)', status: r.stale ? 'cached' : 'ok', updated: weather.updated, note: r.stale ? 'Served from cache; may be outdated.' : weather.forecastModel });
  } catch { sources.push({ name: 'Open-Meteo Forecast (NWP)', status: 'unavailable' }); }

  // 2) IMD official warnings
  const warnings: OfficialWarningsResult = demoMode()
    ? demoWarnings()
    : (await cached(`imd:${key}`, TTL.warnings, () => getOfficialWarnings({ place: loc.name, district: loc.name }))).value;
  sources.push({ name: demoMode() ? 'Demo warning data' : 'IMD Official Warnings', status: 'ok', updated: warnings.fetchedAt, note: demoMode() ? 'Simulated for prototype demonstration; not an official warning.' : undefined });

  // 3) Marine (only when requested)
  let marine: MarineSnapshot | null = null; let marineError: string | undefined;
  if (req.marine) {
    try { marine = (await cached(`marine:${key}`, TTL.marine, () => getMarine(loc.latitude, loc.longitude))).value; if (marine && weather) marine.windKmh = weather.current.windSpeed; sources.push({ name: 'Open-Meteo Marine', status: 'ok', updated: marine.time }); }
    catch (e: any) { marineError = e?.message || 'Marine data unavailable'; sources.push({ name: 'Open-Meteo Marine', status: 'unavailable', note: marineError }); }
  } else sources.push({ name: 'Open-Meteo Marine', status: 'skipped', note: 'Marine context not requested' });

  if (!weather) {
    const hazards = analyzeHazards({ current: null, hourly: [], daily: [], warnings });
    return { location: loc, generatedAt: now, status: 'UNAVAILABLE', disasterMode: hazards.officialWarningPresent, question: req.question, summary: { headline: 'Weather information is temporarily unavailable.', whatItMeans: warnings.available && warnings.warnings.length ? 'Official warnings are shown below. Forecast data could not be retrieved.' : 'No verified data could be retrieved. Please try again shortly.', riskLevel: hazards.overallLevel, sourceNote: 'No forecast data available', aiGenerated: false, language }, current: null, forecast: null, hazards, officialWarnings: warnings, actions: hazards.actions.filter((a) => a.includes('official')), sources, message: 'Weather information is temporarily unavailable.' };
  }

  // 4) Focus day + hazards
  const offset = Math.min(detectFocusOffset(req.question), weather.daily.length - 1);
  const day = weather.daily[offset];
  const focusLabel = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day.dayOfWeek;
  const hazards = analyzeHazards({ current: weather.current, hourly: weather.hourly, daily: weather.daily, warnings, focusDate: day.date, marine });
  const hrsFocus = weather.hourly.filter((h) => h.time.startsWith(day.date));
  const forecast: WeatherIntelligenceBrief['forecast'] = {
    focusLabel, focusDate: day.date, rainProbabilityMax: day.rainProbabilityMax, precipitationSum: day.precipitationSum,
    tempMin: day.tempMin, tempMax: day.tempMax, windMax: Math.max(0, ...hrsFocus.map((h) => h.windSpeed)), condition: day.condition,
    hourly: hrsFocus.map((h) => ({ time: h.time, hour: h.formattedHour || h.hour, temperature: h.temperature, rainProbability: h.rainProbability, precipitation: h.precipitation, windSpeed: h.windSpeed })),
    daily: weather.daily.slice(0, 7).map((d) => ({ date: d.date, dayOfWeek: d.dayOfWeek, tempMin: d.tempMin, tempMax: d.tempMax, rainProbabilityMax: d.rainProbabilityMax, precipitationSum: d.precipitationSum, condition: d.condition })),
    model: weather.forecastModel,
  };
  const c = weather.current;
  const current = { temperature: c.temperature, feelsLike: c.feelsLike, humidity: c.humidity, windSpeed: c.windSpeed, precipitation: c.precipitation, rainProbability: c.rainProbability, condition: c.condition, timestamp: c.timestamp };

  // 5) Explanation (Gemini, fallback deterministic)
  const det = buildDeterministic(focusLabel, forecast, hazards.overallLevel, hazards.hazards.map((h) => h.label), hazards.officialWarningPresent);
  const ctx = { location: loc.name, focus: focusLabel, current, forecast: { ...forecast, hourly: undefined, daily: undefined }, calculatedHazards: hazards.hazards.map((h) => ({ hazard: h.label, level: h.level, reason: h.reason })), overallCalculatedLevel: hazards.overallLevel, officialIMDWarnings: warnings.available ? warnings.warnings.map((w) => ({ level: w.level, title: w.title, validTo: w.validTo })) : 'UNAVAILABLE', marine: marine && marine.isSea ? { waveHeightM: marine.waveHeightM, swellHeightM: marine.swellHeightM, wavePeriodS: marine.wavePeriodS } : undefined };
  const ai = req.skipAi ? null : await explainWithGemini(ctx, req.question || '', language, hazards.actions);
  const summary = ai
    ? { headline: ai.summary, whatItMeans: ai.whatItMeans, riskLevel: hazards.overallLevel, sourceNote: 'Explained by AI from verified weather data', aiGenerated: true, language }
    : { ...det, sourceNote: 'Based on verified weather data (AI explanation unavailable)', aiGenerated: false, language };
  sources.push({ name: 'Gemini (explanation only)', status: ai ? 'ok' : 'unavailable', note: ai ? undefined : 'Deterministic summary used' });

  const status: WeatherIntelligenceBrief['status'] = sources.some((s) => s.status === 'unavailable' && s.name.startsWith('IMD')) ? 'PARTIAL' : 'LIVE';
  const brief: WeatherIntelligenceBrief = {
    location: loc, generatedAt: now, status, question: req.question,
    disasterMode: !demoMode() && (hazards.officialWarningPresent && warnings.warnings.some((w) => w.level === 'ORANGE' || w.level === 'RED') || hazards.overallLevel === 'HIGH' || hazards.overallLevel === 'EXTREME'),
    demoMode: demoMode(),
    summary, current, forecast, hazards, officialWarnings: warnings, actions: ai ? ai.actions : hazards.actions, sources,
  };
  if (req.marine) {
    const m = marine;
    brief.marine = {
      snapshot: m, officialAdvisory: await getImdMarineAdvisory(),
      interpretation: m && m.isSea ? `Waves about ${m.waveHeightM} m with swell ${m.swellHeightM ?? 'n/a'} m (period ${m.wavePeriodS ?? 'n/a'} s). ${hazards.hazards.some((h) => h.type.startsWith('marine') || h.type === 'strong_swell') ? 'Sea conditions may be rough.' : 'No sea-state hazard flagged by the model data.'}` : 'Marine model data is not available for this point (it may be inland or too close to shore).',
      disclaimer: 'Check the latest official fisherman advisory before departure. WeatherGPT does not certify any sea conditions as safe.', error: marineError,
    };
  }
  if (req.farming?.crop) brief.farming = farmingBrief(req.farming.crop.slice(0, 60), forecast, current, c.humidity);
  return brief;
}
