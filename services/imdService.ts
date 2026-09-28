import type { OfficialWarning, OfficialWarningsResult } from './briefTypes.ts';

/**
 * IMD official warning layer (never fabricates data).
 *
 * Configure in .env:
 *   IMD_WARNINGS_URL   URL template; {district} is replaced by the IMD district obj_id
 *                      default: https://mausam.imd.gov.in/api/warnings_district_api.php?id={district}
 *   IMD_DISTRICT_MAP   JSON {"nagercoil":"30", ...} lowercase place/district -> IMD district obj_id
 *   IMD_API_KEY        optional; sent as "Authorization: Bearer <key>" and "x-api-key"
 *   IMD_MARINE_URL     optional endpoint returning IMD sea-area / fisherman advisory (JSON or text)
 *
 * Anything that is unreachable, non-JSON, or has an unrecognised structure => available:false
 * ("IMD unavailable"). A recognised response with no warnings => available:true, warnings:[].
 */
const DEFAULT_URL = 'https://mausam.imd.gov.in/api/warnings_district_api.php?id={district}';
const DEFAULT_DISTRICT_MAP: Record<string, string> = {
  // Official IMD WFS district_warnings_india record: KANYAKUMARI, Obj_id 30.
  nagercoil: '30',
  kanyakumari: '30',
};
type Level = NonNullable<OfficialWarning['level']>;

const COLOR_LEVEL: Record<string, Level> = { '1': 'RED', '2': 'ORANGE', '3': 'YELLOW', '4': 'GREEN' };
const WARNING_CODE_LABELS: Record<string, string> = {
  '1': 'No warning',
  '2': 'Heavy rain',
  '3': 'Heavy snow',
  '4': 'Thunderstorms and lightning or squall',
  '5': 'Hailstorm',
  '6': 'Dust storm',
  '7': 'Dust-raising winds',
  '8': 'No warning',
  '13': 'Cold day',
  '14': 'Ground frost',
  '15': 'Fog',
  '16': 'Very heavy rain',
  '17': 'Extremely heavy rain',
};
const strOf = (v: unknown) => (v == null ? undefined : String(v).trim() || undefined);

function dayValue(row: Record<string, unknown>, day: number, suffix: string) {
  return row[`Day_${day}${suffix}`] ?? row[`Day${day}${suffix}`];
}

function warningCodes(value: unknown): string[] {
  return String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

/** Parses the documented IMD district payload. Returns null for another payload shape. */
export function parseImd(raw: any): OfficialWarning[] | null {
  const rows: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : raw && typeof raw === 'object' ? [raw] : [];
  const row = rows.find((candidate) => candidate && typeof candidate === 'object' && dayValue(candidate, 1, '') !== undefined && dayValue(candidate, 1, '_Color') !== undefined);
  if (!row) return null;
  const out: OfficialWarning[] = [];
  for (let day = 1; day <= 5; day += 1) {
    const level = COLOR_LEVEL[String(dayValue(row, day, '_Color'))];
    if (!level || level === 'GREEN') continue;
    const codes = warningCodes(dayValue(row, day, ''));
    const text = strOf(dayValue(row, day, '_text'));
    const labels = codes.filter((code) => WARNING_CODE_LABELS[code] && WARNING_CODE_LABELS[code] !== 'No warning').map((code) => WARNING_CODE_LABELS[code]);
    if (!labels.length && !text) continue;
    out.push({
      source: 'IMD',
      title: `IMD district warning (Day ${day})`,
      level,
      issued: strOf(row.updated_at ?? row.Date),
      validTo: strOf(row[`Day${day}_date`] ?? row[`Day_${day}_date`]),
      message: text || `Official IMD ${level} color alert${labels.length ? `: ${labels.join(', ')}` : ''}.`,
    });
  }
  return out;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (process.env.IMD_API_KEY) { h.Authorization = `Bearer ${process.env.IMD_API_KEY}`; h['x-api-key'] = process.env.IMD_API_KEY; }
  return h;
}

export async function getOfficialWarnings(opts: { district?: string; place: string }): Promise<OfficialWarningsResult> {
  const fetchedAt = new Date().toISOString();
  const tpl = (process.env.IMD_WARNINGS_URL || DEFAULT_URL).trim();
  let map: Record<string, string> = { ...DEFAULT_DISTRICT_MAP };
  try {
    const configured = JSON.parse(process.env.IMD_DISTRICT_MAP || '{}');
    if (configured && typeof configured === 'object' && !Array.isArray(configured)) map = { ...map, ...configured };
  } catch { /* ignore bad JSON */ }
  const name = (opts.district || opts.place).trim();
  const id = map[name.toLowerCase()];
  if (tpl.includes('{district}') && !id) {
    return { available: false, warnings: [], unavailableReason: `IMD district obj_id for "${name}" is not configured (IMD_DISTRICT_MAP).`, fetchedAt };
  }
  try {
    const res = await fetch(tpl.replace('{district}', encodeURIComponent(id ?? name)), { signal: AbortSignal.timeout(8000), headers: headers() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (!text || text.startsWith('<')) throw new Error('non-JSON response');
    const parsed = parseImd(JSON.parse(text));
    if (parsed === null) throw new Error('unrecognised response format');
    return { available: true, warnings: parsed, fetchedAt };
  } catch (e: any) {
    return { available: false, warnings: [], unavailableReason: `IMD unavailable (${e?.name === 'TimeoutError' ? 'timeout' : e?.message || 'error'}).`, fetchedAt };
  }
}

/** Official marine/fisherman advisory text when configured; otherwise an honest "not available". */
export async function getImdMarineAdvisory(): Promise<string> {
  const url = process.env.IMD_MARINE_URL?.trim();
  const fallback = 'Official IMD marine advisory unavailable. Check the latest official fisherman advisory before departure.';
  if (!url) return fallback;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: headers() });
    if (!res.ok) throw new Error(String(res.status));
    const t = (await res.text()).trim();
    if (!t || t.startsWith('<')) throw new Error('empty');
    return t.slice(0, 600);
  } catch { return fallback; }
}
