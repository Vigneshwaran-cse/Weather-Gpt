import type { HazardItem, HazardResult, MarineSnapshot, OfficialWarningsResult, RiskLevel } from './briefTypes.ts';

const ORDER: RiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'EXTREME'];
const max = (a: RiskLevel, b: RiskLevel) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

export interface HazardInput {
  current: { temperature: number; windSpeed: number; weatherCode: number } | null;
  hourly: { time: string; precipitation: number; rainProbability: number; windSpeed: number; weatherCode: number }[];
  daily: { date: string; tempMax: number; precipitationSum: number; rainProbabilityMax: number }[];
  warnings: OfficialWarningsResult;
  /** ISO date (YYYY-MM-DD) the user is asking about; defaults to today+tomorrow window. */
  focusDate?: string;
  marine?: MarineSnapshot | null;
}

export function analyzeHazards(inp: HazardInput): HazardResult {
  const hazards: HazardItem[] = [];
  const add = (h: HazardItem) => hazards.push(h);
  const day = inp.focusDate ? inp.daily.find((d) => d.date === inp.focusDate) : inp.daily[0];
  const hrs = inp.focusDate ? inp.hourly.filter((h) => h.time.startsWith(inp.focusDate!)) : inp.hourly.slice(0, 48);

  const rain24 = day?.precipitationSum ?? 0;
  const maxHourRain = Math.max(0, ...hrs.map((h) => h.precipitation));
  const pMax = day?.rainProbabilityMax ?? 0;
  if (rain24 >= 115 || maxHourRain >= 30) add({ type: 'heavy_rain', label: 'Very heavy rain', level: 'EXTREME', reason: `Forecast rainfall ${Math.round(rain24)} mm/day (peak ${maxHourRain.toFixed(1)} mm/h).` });
  else if (rain24 >= 65 || maxHourRain >= 15) add({ type: 'heavy_rain', label: 'Heavy rain', level: 'HIGH', reason: `Forecast rainfall ${Math.round(rain24)} mm/day, ${pMax}% chance.` });
  else if (rain24 >= 15 || (pMax >= 70 && rain24 >= 7)) add({ type: 'heavy_rain', label: 'Moderate rain', level: 'MODERATE', reason: `Forecast rainfall ${Math.round(rain24)} mm/day, ${pMax}% chance.` });

  const codes = hrs.map((h) => h.weatherCode);
  if (codes.some((c) => c >= 96)) { add({ type: 'thunderstorm', label: 'Thunderstorm with hail', level: 'HIGH', reason: 'Model forecasts thunderstorm with hail.' }); add({ type: 'lightning', label: 'Lightning', level: 'HIGH', reason: 'Thunderstorm implies lightning risk.' }); }
  else if (codes.some((c) => c === 95)) { add({ type: 'thunderstorm', label: 'Thunderstorm', level: 'MODERATE', reason: 'Model forecasts thunderstorm.' }); add({ type: 'lightning', label: 'Lightning', level: 'MODERATE', reason: 'Thunderstorm implies lightning risk.' }); }

  const wind = Math.max(inp.current?.windSpeed ?? 0, ...hrs.map((h) => h.windSpeed));
  if (wind >= 62) add({ type: 'high_wind', label: 'Damaging wind', level: 'EXTREME', reason: `Wind up to ${Math.round(wind)} km/h.` });
  else if (wind >= 40) add({ type: 'high_wind', label: 'High wind', level: 'HIGH', reason: `Wind up to ${Math.round(wind)} km/h.` });
  else if (wind >= 30) add({ type: 'high_wind', label: 'Breezy / gusty', level: 'MODERATE', reason: `Wind up to ${Math.round(wind)} km/h.` });

  const tmax = Math.max(day?.tempMax ?? -99, inp.current?.temperature ?? -99);
  if (tmax >= 45) add({ type: 'extreme_heat', label: 'Extreme heat', level: 'EXTREME', reason: `Temperature up to ${Math.round(tmax)}°C.` });
  else if (tmax >= 40) add({ type: 'extreme_heat', label: 'Heatwave-level heat', level: 'HIGH', reason: `Temperature up to ${Math.round(tmax)}°C.` });
  else if (tmax >= 37) add({ type: 'extreme_heat', label: 'Very hot', level: 'MODERATE', reason: `Temperature up to ${Math.round(tmax)}°C.` });

  if (codes.some((c) => c === 45 || c === 48)) add({ type: 'poor_visibility', label: 'Fog / poor visibility', level: 'MODERATE', reason: 'Model forecasts fog.' });

  const m = inp.marine;
  if (m?.isSea) {
    if ((m.waveHeightM ?? 0) >= 4) add({ type: 'marine_high_waves', label: 'Very rough seas', level: 'EXTREME', reason: `Wave height ${m.waveHeightM} m.` });
    else if ((m.waveHeightM ?? 0) >= 2.5) add({ type: 'marine_high_waves', label: 'High waves', level: 'HIGH', reason: `Wave height ${m.waveHeightM} m.` });
    else if ((m.waveHeightM ?? 0) >= 1.5) add({ type: 'marine_high_waves', label: 'Moderate waves', level: 'MODERATE', reason: `Wave height ${m.waveHeightM} m.` });
    if ((m.swellHeightM ?? 0) >= 2.5) add({ type: 'strong_swell', label: 'Strong swell', level: 'HIGH', reason: `Swell ${m.swellHeightM} m, period ${m.wavePeriodS ?? '?'} s.` });
  }

  let overall: RiskLevel = 'LOW';
  hazards.forEach((h) => (overall = max(overall, h.level)));
  const reasons = hazards.map((h) => h.reason);

  // Official warnings remain separate from calculated hazards.
  const official = inp.warnings.warnings.filter((w) => w.level !== 'GREEN');
  const officialPresent = official.length > 0;

  const actions: string[] = [];
  const has = (t: string) => hazards.some((h) => h.type === t);
  if (has('heavy_rain')) actions.push('Plan outdoor activity for a drier period and carry rain protection.', 'Avoid waterlogged roads and low-lying areas.');
  if (has('thunderstorm')) actions.push('Avoid open fields, tall trees and exposed areas during thunderstorms; stay indoors when lightning is near.');
  if (has('high_wind')) actions.push('Secure loose objects and avoid travel on exposed roads or bridges in strong wind.');
  if (has('extreme_heat')) actions.push('Avoid strenuous outdoor work at midday, drink water regularly and rest in shade.');
  if (has('poor_visibility')) actions.push('Drive slowly with headlights on in low visibility.');
  if (has('marine_high_waves') || has('strong_swell')) actions.push('Check the latest official fisherman advisory before departure.');
  if (officialPresent) actions.push('Follow the latest official IMD / district administration advisory.');
  if (!actions.length) actions.push('No significant hazard detected in the verified data. Keep checking updates.');

  return { overallLevel: overall, hazards, reasons, actions: [...new Set(actions)], officialWarningPresent: officialPresent, calculated: true };
}
