import type { MarineSnapshot } from './briefTypes.ts';

export async function getMarine(lat: number, lon: number): Promise<MarineSnapshot> {
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period,ocean_current_velocity,sea_surface_temperature&timezone=auto&forecast_days=3`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Open-Meteo Marine returned ${res.status}`);
  const j: any = await res.json();
  const h = j.hourly;
  if (!h?.time?.length) throw new Error('No marine data for this point');
  const now = Date.now();
  let i = h.time.findIndex((t: string) => new Date(t).getTime() >= now - 3600e3);
  if (i < 0) i = 0;
  const g = (k: string, idx = i) => (typeof h[k]?.[idx] === 'number' ? (h[k][idx] as number) : null);
  const isSea = g('wave_height') !== null;
  const hourly = h.time.slice(0, 72).map((t: string, idx: number) => ({ time: t, waveHeightM: g('wave_height', idx), swellHeightM: g('swell_wave_height', idx), wavePeriodS: g('wave_period', idx) }));
  return {
    waveHeightM: g('wave_height'), swellHeightM: g('swell_wave_height'), wavePeriodS: g('wave_period'),
    waveDirectionDeg: g('wave_direction'), seaSurfaceTempC: g('sea_surface_temperature'),
    oceanCurrentKmh: g('ocean_current_velocity'), windKmh: null, time: h.time[i], hourly, isSea,
  };
}
