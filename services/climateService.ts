import type { ClimateInsight } from './briefTypes.ts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export async function getClimate(lat: number, lon: number, rangeYears = 5): Promise<ClimateInsight> {
  const years = Math.min(Math.max(Math.round(rangeYears) || 5, 2), 15);
  const end = new Date(Date.now() - 6 * 86400e3); // archive lags ~5 days
  const start = new Date(end); start.setFullYear(end.getFullYear() - years);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${f(start)}&end_date=${f(end)}&daily=temperature_2m_mean,precipitation_sum&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Open-Meteo Historical returned ${res.status}`);
  const j: any = await res.json();
  const t: string[] = j.daily?.time ?? [];
  if (!t.length) throw new Error('No historical data');
  const temp: (number | null)[] = j.daily.temperature_2m_mean;
  const rain: (number | null)[] = j.daily.precipitation_sum;
  const byYear = new Map<number, { r: number; t: number[] }>();
  const byYM = new Map<string, { r: number; t: number[] }>();
  t.forEach((d, i) => {
    const y = +d.slice(0, 4), m = +d.slice(5, 7);
    for (const [map, key] of [[byYear, y], [byYM, `${y}-${m}`]] as const) {
      const e = (map as Map<any, any>).get(key) ?? { r: 0, t: [] };
      e.r += rain[i] ?? 0; if (temp[i] != null) e.t.push(temp[i] as number);
      (map as Map<any, any>).set(key, e);
    }
  });
  const yearly = [...byYear.entries()].filter(([y]) => y < end.getFullYear() || t.some((d) => d.startsWith(`${y}-12`)) ).map(([year, e]) => ({ year, rainfallMm: Math.round(e.r), meanTempC: +avg(e.t).toFixed(1) }));
  // Latest complete month vs same calendar month in earlier years
  const ref = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const rm = ref.getMonth() + 1, ry = ref.getFullYear();
  const cur = byYM.get(`${ry}-${rm}`);
  const prev = [...byYM.entries()].filter(([k]) => +k.split('-')[1] === rm && +k.split('-')[0] < ry).map(([, v]) => v);
  const thisMonth = cur ? { rainfallMm: Math.round(cur.r), meanTempC: +avg(cur.t).toFixed(1) } : null;
  const normalMonth = prev.length ? { rainfallMm: Math.round(avg(prev.map((p) => p.r))), meanTempC: +avg(prev.map((p) => avg(p.t))).toFixed(1) } : null;
  const rainfallChangePct = thisMonth && normalMonth && normalMonth.rainfallMm > 0 ? Math.round(((thisMonth.rainfallMm - normalMonth.rainfallMm) / normalMonth.rainfallMm) * 100) : null;
  const tempDeltaC = thisMonth && normalMonth ? +(thisMonth.meanTempC - normalMonth.meanTempC).toFixed(1) : null;
  const monthName = MONTHS[rm - 1];
  let explanation = `Based on ${years} years of Open-Meteo historical data. `;
  if (rainfallChangePct !== null) explanation += `${monthName} ${ry} rainfall was ${Math.abs(rainfallChangePct)}% ${rainfallChangePct >= 0 ? 'above' : 'below'} the average for that month in earlier years. `;
  if (tempDeltaC !== null) explanation += `It was ${Math.abs(tempDeltaC)}°C ${tempDeltaC >= 0 ? 'warmer' : 'cooler'} than usual.`;
  return { rangeYears: years, yearly, monthName: `${monthName} ${ry}`, thisMonth, normalMonth, rainfallChangePct, tempDeltaC, explanation: explanation.trim() };
}
