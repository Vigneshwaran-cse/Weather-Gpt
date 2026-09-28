/** Tiny in-memory TTL cache (no database). */
const store = new Map<string, { v: unknown; exp: number }>();
const MAX = 500;

export function cacheGet<T>(key: string, allowStale = false): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (!allowStale && Date.now() > e.exp) return undefined;
  return e.v as T;
}
export function cacheSet<T>(key: string, v: T, ttlMs: number): T {
  if (store.size >= MAX) store.delete(store.keys().next().value as string);
  store.set(key, { v, exp: Date.now() + ttlMs });
  return v;
}
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<{ value: T; fromCache: boolean; stale: boolean }> {
  const hit = cacheGet<T>(key);
  if (hit !== undefined) return { value: hit, fromCache: true, stale: false };
  try {
    return { value: cacheSet(key, await fn(), ttlMs), fromCache: false, stale: false };
  } catch (err) {
    const stale = cacheGet<T>(key, true);
    if (stale !== undefined) return { value: stale, fromCache: true, stale: true };
    throw err;
  }
}
export const TTL = { geocode: 24 * 3600e3, weather: 10 * 60e3, warnings: 5 * 60e3, marine: 30 * 60e3, climate: 24 * 3600e3, brief: 5 * 60e3 };
export const coordKey = (lat: number, lon: number) => `${lat.toFixed(2)},${lon.toFixed(2)}`;
