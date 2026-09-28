/**
 * Weather Service for WeatherGPT
 * Connects to Open-Meteo API to retrieve real-time weather and forecast data.
 * Validates all weather data prior to consumption.
 */

export interface GeocodedLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string; // State or province
  country_code?: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  rainProbability: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
  timestamp: string;
  visibility?: number; // In kilometers
  uvIndex?: number;
  soilTemperature?: number;
}

export interface DailyForecast {
  date: string;
  dayOfWeek: string;
  weatherCode: number;
  condition: string;
  tempMax: number;
  tempMin: number;
  rainProbabilityMax: number;
  precipitationSum: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyForecast {
  time: string;
  hour: string;
  formattedHour?: string;
  hourNumber?: number;
  period?: 'night' | 'morning' | 'afternoon' | 'evening';
  temperature: number;
  apparentTemperature: number;
  rainProbability: number;
  precipitation: number;
  weatherCode: number;
  condition: string;
  windSpeed: number;
  windDirection: number;
  humidity: number;
  visibility?: number; // In kilometers
  uvIndex?: number;
  soilTemperature?: number;
}

export interface WeatherAlert {
  id: string;
  type: string;
  severity: 'Advisory' | 'Warning' | 'Severe';
  description: string;
  validity: string;
  source: string;
}

export interface VerifiedWeatherData {
  location: {
    name: string;
    state?: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
  current: CurrentWeather;
  daily: DailyForecast[];
  hourly: HourlyForecast[];
  alerts: WeatherAlert[];
  source: string;
  forecastModel: string;
  modelIdentifier?: string;
  generationTimeMs?: number;
  elevation?: number;
  updated: string;
}

// Map WMO Weather Interpretation Codes to human descriptions
export function decodeWmoCode(code: number): string {
  switch (code) {
    case 0:
      return 'Clear sky';
    case 1:
      return 'Mainly clear';
    case 2:
      return 'Partly cloudy';
    case 3:
      return 'Overcast';
    case 45:
      return 'Fog';
    case 48:
      return 'Depositing rime fog';
    case 51:
      return 'Light drizzle';
    case 53:
      return 'Moderate drizzle';
    case 55:
      return 'Dense drizzle';
    case 56:
      return 'Light freezing drizzle';
    case 57:
      return 'Dense freezing drizzle';
    case 61:
      return 'Slight rain';
    case 63:
      return 'Moderate rain';
    case 65:
      return 'Heavy rain';
    case 66:
      return 'Light freezing rain';
    case 67:
      return 'Heavy freezing rain';
    case 71:
      return 'Slight snow fall';
    case 73:
      return 'Moderate snow fall';
    case 75:
      return 'Heavy snow fall';
    case 77:
      return 'Snow grains';
    case 80:
      return 'Slight rain showers';
    case 81:
      return 'Moderate rain showers';
    case 82:
      return 'Violent rain showers';
    case 85:
      return 'Slight snow showers';
    case 86:
      return 'Heavy snow showers';
    case 95:
      return 'Thunderstorm';
    case 96:
      return 'Thunderstorm with slight hail';
    case 99:
      return 'Thunderstorm with heavy hail';
    default:
      return 'Variable conditions';
  }
}

const rawBase = (process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1').replace(/\/+$/, '');
const OPEN_METEO_BASE = rawBase.endsWith('/v1') ? rawBase : `${rawBase}/v1`;
const GEOCODING_BASE = 'https://geocoding-api.open-meteo.com/v1';

// Known Indian & international city aliases
const CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  bombay: 'Mumbai',
  calcutta: 'Kolkata',
  madras: 'Chennai',
  cochin: 'Kochi',
  trivandrum: 'Thiruvananthapuram',
  calicut: 'Kozhikode',
  pondy: 'Pondicherry',
  puducherry: 'Pondicherry',
  banaras: 'Varanasi',
  kashi: 'Varanasi',
  gurgaon: 'Gurugram',
  baroda: 'Vadodara',
  mysore: 'Mysuru',
  mangalore: 'Mangaluru',
  belgaum: 'Belagavi',
  bellary: 'Ballari',
  hubli: 'Hubballi',
};

const geocodeCache = new Map<string, { results: GeocodedLocation[]; timestamp: number }>();
const GEO_CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

/**
 * Fetch candidates from Open-Meteo for a single search token
 */
async function queryOpenMeteoGeocoding(term: string): Promise<GeocodedLocation[]> {
  try {
    const url = `${GEOCODING_BASE}/search?name=${encodeURIComponent(term)}&count=10&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.results || !Array.isArray(data.results)) return [];

    return data.results.map((item: any) => ({
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      country: item.country || '',
      admin1: item.admin1 || '',
      country_code: item.country_code || '',
    }));
  } catch {
    return [];
  }
}

/**
 * Fallback to Nominatim OpenStreetMap for compound Indian locations (e.g. village/panchayat + city)
 */
async function queryNominatimGeocoding(query: string): Promise<GeocodedLocation[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WeatherGPT-App/2.0' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    return data.map((item: any) => {
      const parts = (item.display_name || '').split(',').map((s: string) => s.trim());
      const name = item.name || parts[0] || query;
      const admin1 = parts[parts.length - 2] || '';
      const country = parts[parts.length - 1] || 'India';

      return {
        name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        country,
        admin1,
        country_code: 'IN',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Convert place name into latitude/longitude with multi-strategy resolution:
 * 1. Alias normalization (e.g. Bangalore -> Bengaluru)
 * 2. Tokenized multi-part matching (e.g. "Manakunnam, Kochi" -> finds Manakunnam in Ernakulam/Kochi, Kerala)
 * 3. India result prioritization
 * 4. Nominatim OpenStreetMap fallback for specific panchayats/localities
 */
export async function geocodeCity(query: string | any): Promise<GeocodedLocation[]> {
  let cleanQuery =
    typeof query === 'string'
      ? query.trim()
      : query && typeof query === 'object' && query.name
      ? String(query.name).trim()
      : '';
  if (!cleanQuery) return [];

  // Check cache
  const cacheKey = cleanQuery.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GEO_CACHE_TTL_MS) {
    return cached.results;
  }

  // Check direct alias
  if (CITY_ALIASES[cleanQuery.toLowerCase()]) {
    cleanQuery = CITY_ALIASES[cleanQuery.toLowerCase()];
  }

  // Split multi-part query by commas/dashes/slashes
  const tokens = cleanQuery
    .split(/[,–\-\/]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let results: GeocodedLocation[] = [];

  // Strategy A: If compound tokens (e.g. ["Manakunnam", "Kochi"]), search primary token
  if (tokens.length > 1) {
    const primaryToken = CITY_ALIASES[tokens[0].toLowerCase()] || tokens[0];
    const candidateMatches = await queryOpenMeteoGeocoding(primaryToken);

    if (candidateMatches.length > 0) {
      // Find candidate matching secondary token (e.g. "Kochi" or "Kerala")
      const secondaryTokensLower = tokens.slice(1).map((t) => t.toLowerCase());
      const contextualMatch = candidateMatches.find((cand) => {
        const admin1Lower = (cand.admin1 || '').toLowerCase();
        const countryLower = (cand.country || '').toLowerCase();
        return secondaryTokensLower.some(
          (sec) => admin1Lower.includes(sec) || countryLower.includes(sec) || sec.includes('kochi') && admin1Lower.includes('kerala')
        );
      });

      if (contextualMatch) {
        results = [
          {
            ...contextualMatch,
            name: `${contextualMatch.name}, ${tokens[1]}`,
          },
        ];
      } else {
        // Fallback to highest priority match in India
        const inMatch = candidateMatches.find((c) => c.country_code === 'IN' || c.country === 'India');
        results = inMatch ? [inMatch] : candidateMatches;
      }
    }
  }

  // Strategy B: Direct search of full string on Open-Meteo
  if (results.length === 0) {
    const directMatches = await queryOpenMeteoGeocoding(cleanQuery);
    if (directMatches.length > 0) {
      // Prioritize India matches
      const indiaMatch = directMatches.find((c) => c.country_code === 'IN' || c.country === 'India');
      results = indiaMatch ? [indiaMatch, ...directMatches.filter((c) => c !== indiaMatch)] : directMatches;
    }
  }

  // Strategy C: If cleanQuery has multiple tokens and still not found, try Nominatim OpenStreetMap
  if (results.length === 0) {
    const osmMatches = await queryNominatimGeocoding(cleanQuery);
    if (osmMatches.length > 0) {
      results = osmMatches;
    }
  }

  // Strategy D: If still not found and tokens.length > 1, try secondary token (parent city, e.g. "Kochi")
  if (results.length === 0 && tokens.length > 1) {
    const secondaryToken = CITY_ALIASES[tokens[tokens.length - 1].toLowerCase()] || tokens[tokens.length - 1];
    const secondaryMatches = await queryOpenMeteoGeocoding(secondaryToken);
    if (secondaryMatches.length > 0) {
      results = secondaryMatches;
    }
  }

  if (results.length > 0) {
    geocodeCache.set(cacheKey, { results, timestamp: Date.now() });
  }

  return results;
}

/**
 * Retrieve and validate REAL-TIME weather data from Open-Meteo with genuine NWP model provenance.
 * Retrieves data derived from European Centre for Medium-Range Weather Forecasts (ECMWF IFS)
 * and NOAA Global Forecast System (GFS).
 */
export async function getVerifiedWeatherData(
  latitude: number,
  longitude: number,
  locationName: string,
  state?: string,
  country?: string,
  model: string = 'best_match'
): Promise<VerifiedWeatherData> {
  const modelParam = encodeURIComponent(model || 'best_match');
  const url = `${OPEN_METEO_BASE}/forecast?latitude=${latitude}&longitude=${longitude}&models=${modelParam}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,visibility&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,visibility,uv_index,soil_temperature_0cm&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=auto`;

  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo API returned status ${response.status}: ${response.statusText}`);
  }

  const raw = await response.json();

  // Validate the response integrity
  if (!raw || !raw.current || !raw.daily || !raw.hourly) {
    throw new Error('Invalid or incomplete weather data payload from Open-Meteo.');
  }

  const currentRaw = raw.current;
  const dailyRaw = raw.daily;
  const hourlyRaw = raw.hourly;

  // Validate current fields
  if (
    typeof currentRaw.temperature_2m !== 'number' ||
    typeof currentRaw.apparent_temperature !== 'number' ||
    typeof currentRaw.relative_humidity_2m !== 'number'
  ) {
    throw new Error('Critical current weather fields are missing or non-numeric.');
  }

  // Find rain probability and soil temperature for the current hour
  const now = new Date();
  const currentIsoPrefix = now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
  let currentRainProb = 0;
  let currentSoilTemp: number | undefined = undefined;
  if (Array.isArray(hourlyRaw.time) && Array.isArray(hourlyRaw.precipitation_probability)) {
    const idx = hourlyRaw.time.findIndex((t: string) => t.startsWith(currentIsoPrefix));
    if (idx !== -1 && typeof hourlyRaw.precipitation_probability[idx] === 'number') {
      currentRainProb = hourlyRaw.precipitation_probability[idx];
      if (Array.isArray(hourlyRaw.soil_temperature_0cm) && typeof hourlyRaw.soil_temperature_0cm[idx] === 'number') {
        currentSoilTemp = Math.round(hourlyRaw.soil_temperature_0cm[idx] * 10) / 10;
      }
    } else if (hourlyRaw.precipitation_probability.length > 0) {
      currentRainProb = hourlyRaw.precipitation_probability[0] || 0;
      if (Array.isArray(hourlyRaw.soil_temperature_0cm) && typeof hourlyRaw.soil_temperature_0cm[0] === 'number') {
        currentSoilTemp = Math.round(hourlyRaw.soil_temperature_0cm[0] * 10) / 10;
      }
    }
  }

  const current: CurrentWeather = {
    temperature: Math.round(currentRaw.temperature_2m * 10) / 10,
    feelsLike: Math.round(currentRaw.apparent_temperature * 10) / 10,
    humidity: Math.round(currentRaw.relative_humidity_2m),
    windSpeed: Math.round(currentRaw.wind_speed_10m * 10) / 10,
    windDirection: Math.round(currentRaw.wind_direction_10m),
    precipitation: Math.round((currentRaw.precipitation ?? 0) * 10) / 10,
    rainProbability: currentRainProb,
    weatherCode: currentRaw.weather_code ?? 0,
    condition: decodeWmoCode(currentRaw.weather_code ?? 0),
    isDay: currentRaw.is_day === 1,
    timestamp: currentRaw.time || now.toISOString(),
    visibility: typeof currentRaw.visibility === 'number' ? Math.round(currentRaw.visibility / 100) / 10 : undefined,
    uvIndex: Array.isArray(hourlyRaw.uv_index) && typeof hourlyRaw.uv_index[0] === 'number' ? Math.round(hourlyRaw.uv_index[0] * 10) / 10 : undefined,
    soilTemperature: currentSoilTemp,
  };

  // Build 7-day forecast
  const daily: DailyForecast[] = [];
  const daysCount = Math.min(dailyRaw.time?.length || 0, 7);
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < daysCount; i++) {
    const dateStr = dailyRaw.time[i];
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayNames[dateObj.getDay()];
    const code = dailyRaw.weather_code?.[i] ?? 0;

    daily.push({
      date: dateStr,
      dayOfWeek: dayLabel,
      weatherCode: code,
      condition: decodeWmoCode(code),
      tempMax: Math.round((dailyRaw.temperature_2m_max?.[i] ?? current.temperature) * 10) / 10,
      tempMin: Math.round((dailyRaw.temperature_2m_min?.[i] ?? current.temperature) * 10) / 10,
      rainProbabilityMax: dailyRaw.precipitation_probability_max?.[i] ?? 0,
      precipitationSum: Math.round((dailyRaw.precipitation_sum?.[i] ?? 0) * 10) / 10,
      sunrise: dailyRaw.sunrise?.[i] ? dailyRaw.sunrise[i].split('T')[1]?.slice(0, 5) : '',
      sunset: dailyRaw.sunset?.[i] ? dailyRaw.sunset[i].split('T')[1]?.slice(0, 5) : '',
    });
  }

  // Build next 48 hours (covers today + tomorrow for timing precision)
  const hourly: HourlyForecast[] = [];
  const hoursCount = Math.min(hourlyRaw.time?.length || 0, 48);
  for (let i = 0; i < hoursCount; i++) {
    const rawTime = hourlyRaw.time[i];
    const hourPart = rawTime.split('T')[1]?.slice(0, 5) || rawTime;
    const code = hourlyRaw.weather_code?.[i] ?? 0;

    const hourNum = parseInt(hourPart.split(':')[0], 10) || 0;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
    const formattedHour = `${displayHour12}:00 ${ampm}`;

    let period: 'night' | 'morning' | 'afternoon' | 'evening' = 'night';
    if (hourNum >= 5 && hourNum < 12) period = 'morning';
    else if (hourNum >= 12 && hourNum < 17) period = 'afternoon';
    else if (hourNum >= 17 && hourNum < 21) period = 'evening';
    else period = 'night';

    hourly.push({
      time: rawTime,
      hour: hourPart,
      formattedHour,
      hourNumber: hourNum,
      period,
      temperature: Math.round((hourlyRaw.temperature_2m?.[i] ?? 0) * 10) / 10,
      apparentTemperature: Math.round((hourlyRaw.apparent_temperature?.[i] ?? 0) * 10) / 10,
      rainProbability: hourlyRaw.precipitation_probability?.[i] ?? 0,
      precipitation: Math.round((hourlyRaw.precipitation?.[i] ?? 0) * 10) / 10,
      weatherCode: code,
      condition: decodeWmoCode(code),
      windSpeed: Math.round((hourlyRaw.wind_speed_10m?.[i] ?? 0) * 10) / 10,
      windDirection: Math.round(hourlyRaw.wind_direction_10m?.[i] ?? 0),
      humidity: Math.round(hourlyRaw.relative_humidity_2m?.[i] ?? 0),
      visibility: typeof hourlyRaw.visibility?.[i] === 'number' ? Math.round(hourlyRaw.visibility[i] / 100) / 10 : undefined,
      uvIndex: typeof hourlyRaw.uv_index?.[i] === 'number' ? Math.round(hourlyRaw.uv_index[i] * 10) / 10 : undefined,
      soilTemperature: typeof hourlyRaw.soil_temperature_0cm?.[i] === 'number' ? Math.round(hourlyRaw.soil_temperature_0cm[i] * 10) / 10 : undefined,
    });
  }

  // Derive verified weather alerts based on meteorology thresholds
  const alerts: WeatherAlert[] = [];

  // 1. Extreme Heat Check
  const maxDayTemp = daily[0]?.tempMax ?? current.temperature;
  if (maxDayTemp >= 40) {
    alerts.push({
      id: 'heat-extreme',
      type: 'Calculated: Extreme Heat Risk',
      severity: 'Severe',
      description: `Dangerously high temperatures expected to reach ${maxDayTemp}°C. Stay hydrated and avoid prolonged outdoor sun exposure between 12 PM and 4 PM.`,
      validity: 'Valid today through evening',
      source: 'WeatherGPT calculation from Open-Meteo forecast (not an official warning)',
    });
  } else if (maxDayTemp >= 36) {
    alerts.push({
      id: 'heat-advisory',
      type: 'Calculated: High Heat Risk',
      severity: 'Advisory',
      description: `Hot afternoon conditions with high temperatures of ${maxDayTemp}°C (feels like ${current.feelsLike}°C). Maintain adequate water intake.`,
      validity: 'Valid today afternoon',
      source: 'WeatherGPT calculation from Open-Meteo forecast (not an official warning)',
    });
  }

  // 2. Severe Thunderstorms Check (WMO 95, 96, 99)
  const isThunderstormToday =
    [current.weatherCode, daily[0]?.weatherCode, daily[1]?.weatherCode].some((c) =>
      [95, 96, 99].includes(c)
    );
  if (isThunderstormToday) {
    alerts.push({
      id: 'thunderstorm-warning',
      type: 'Calculated: Thunderstorm Risk',
      severity: 'Severe',
      description: 'Thunderstorms with potential gusty winds and lightning detected in regional weather model. Seek sturdy shelter if outdoors.',
      validity: 'Valid next 24 hours',
      source: 'WeatherGPT calculation from Open-Meteo forecast (not an official warning)',
    });
  }

  // 3. Heavy Rain / Flood Risk Check
  const maxRainProb = Math.max(current.rainProbability, daily[0]?.rainProbabilityMax ?? 0);
  const expectedRainfall = daily[0]?.precipitationSum ?? 0;
  if (expectedRainfall >= 25 || maxRainProb >= 80) {
    alerts.push({
      id: 'heavy-rain-warning',
      type: 'Calculated: Heavy Rain Risk',
      severity: 'Warning',
      description: `Elevated precipitation probability of ${maxRainProb}% with up to ${expectedRainfall}mm expected rainfall. Potential waterlogging in low-lying roads.`,
      validity: 'Valid for the current forecast period',
      source: 'WeatherGPT calculation from Open-Meteo forecast (not an official warning)',
    });
  }

  // 4. Gale / High Wind Check
  if (current.windSpeed >= 45 || (daily[0] && dailyRaw.wind_speed_10m_max?.[0] >= 45)) {
    alerts.push({
      id: 'wind-warning',
      type: 'Calculated: High Wind Risk',
      severity: 'Warning',
      description: `Strong gusts exceeding ${Math.round(current.windSpeed)} km/h. Secure loose outdoor objects and exercise caution while driving high-profile vehicles.`,
      validity: 'Valid currently and over next 12 hours',
      source: 'WeatherGPT calculation from Open-Meteo forecast (not an official warning)',
    });
  }

  // Format updated timestamp
  const dateFormatted = new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);

  const modelMap: Record<string, string> = {
    best_match: 'ECMWF IFS / NOAA GFS (Open-Meteo Blend)',
    ecmwf_ifs025: 'ECMWF IFS 0.25° (European Centre for Medium-Range Weather Forecasts)',
    gfs_seamless: 'NOAA GFS (Global Forecast System, NWS)',
    icon_seamless: 'DWD ICON (German Weather Service)',
  };
  const forecastModel = modelMap[model] || `NWP Model (${model})`;

  return {
    location: {
      name: locationName,
      state: state || '',
      country: country || '',
      latitude,
      longitude,
    },
    current,
    daily,
    hourly,
    alerts,
    source: 'Open-Meteo',
    forecastModel,
    modelIdentifier: model || 'best_match',
    generationTimeMs: typeof raw.generationtime_ms === 'number' ? Math.round(raw.generationtime_ms * 100) / 100 : undefined,
    elevation: typeof raw.elevation === 'number' ? Math.round(raw.elevation) : undefined,
    updated: dateFormatted,
  };
}

export interface WeatherDecisionContext {
  targetLabel: string;
  timeframe: string;
  periodOfDay?: string;
  tempMin: number;
  tempMax: number;
  apparentTempMax: number;
  peakRainProbability: number;
  peakRainHours: string;
  totalPrecipitation: number;
  maxWindSpeed: number;
  averageHumidity: number;
  lowestVisibility?: number;
  primaryCondition: string;
  hasThunderstormRisk: boolean;
  hasHeatRisk: boolean;
  hasHeavyRainRisk: boolean;
  hasHighWindRisk: boolean;
  activeAlerts: WeatherAlert[];
  hourlyTimelineSnippet: string;
  forecastConfidence: 'High' | 'Moderate' | 'Lower (extended forecast)';
  forecastModel?: string;
  source?: string;
}

/**
 * Derives a targeted decision-support context for any location, timeframe, or period of day.
 * Extracts timing windows (e.g. 5 PM - 8 PM), peak rain probability, severity, and actionable risks.
 */
export function getWeatherDecisionContext(
  weather: VerifiedWeatherData,
  timeframe: string = 'today',
  periodOfDay?: string,
  specificDayName?: string
): WeatherDecisionContext {
  const isTomorrow = timeframe === 'tomorrow' || /tomorrow/i.test(specificDayName || '');
  const dayIndex = isTomorrow ? 1 : 0;
  const targetDay = weather.daily[dayIndex] || weather.daily[0];

  // Select hourly window: today (0..23) vs tomorrow (24..47)
  const baseOffset = isTomorrow ? 24 : 0;
  let relevantHours = weather.hourly.slice(baseOffset, baseOffset + 24);
  if (relevantHours.length === 0) {
    relevantHours = weather.hourly.slice(0, 24);
  }

  // Filter by period of day if specified
  let periodFiltered = relevantHours;
  if (periodOfDay && periodOfDay !== 'full_day' && periodOfDay !== 'all_day') {
    const periodLower = periodOfDay.toLowerCase();
    const filtered = relevantHours.filter((h) => h.period === periodLower);
    if (filtered.length > 0) {
      periodFiltered = filtered;
    }
  }

  let peakRainProb = 0;
  let peakHour = '';
  let peakEndHour = '';
  let totalPrecip = 0;
  let maxWind = 0;
  let minTemp = 999;
  let maxTemp = -999;
  let maxApparent = -999;
  let lowestVis: number | undefined = undefined;
  let sumHumidity = 0;
  let hasThunder = false;

  const timelineParts: string[] = [];

  periodFiltered.forEach((h, idx) => {
    if (h.rainProbability > peakRainProb) {
      peakRainProb = h.rainProbability;
      peakHour = h.formattedHour || h.hour;
      const nextH = periodFiltered[idx + 2] || periodFiltered[idx + 1] || h;
      peakEndHour = nextH.formattedHour || nextH.hour;
    }
    totalPrecip += h.precipitation;
    maxWind = Math.max(maxWind, h.windSpeed);
    minTemp = Math.min(minTemp, h.temperature);
    maxTemp = Math.max(maxTemp, h.temperature);
    maxApparent = Math.max(maxApparent, h.apparentTemperature);
    sumHumidity += h.humidity;
    if (h.visibility !== undefined) {
      lowestVis = lowestVis === undefined ? h.visibility : Math.min(lowestVis, h.visibility);
    }
    if ([95, 96, 99].includes(h.weatherCode) || h.condition.toLowerCase().includes('thunder')) {
      hasThunder = true;
    }

    timelineParts.push(`${h.formattedHour || h.hour}: ${Math.round(h.temperature)}°C, ${h.rainProbability}% rain (${h.condition})`);
  });

  if (minTemp === 999) minTemp = targetDay.tempMin;
  if (maxTemp === -999) maxTemp = targetDay.tempMax;
  if (maxApparent === -999) maxApparent = maxTemp;
  const avgHumidity = periodFiltered.length > 0 ? Math.round(sumHumidity / periodFiltered.length) : weather.current.humidity;

  const targetLabel = `${isTomorrow ? 'Tomorrow' : 'Today'}${periodOfDay ? ` ${periodOfDay}` : ''} in ${weather.location.name}`;

  const peakRainHours = peakRainProb >= 25 && peakHour
    ? `${peakHour} – ${peakEndHour && peakEndHour !== peakHour ? peakEndHour : 'later'}`
    : 'No significant rain peak';

  const confidence: 'High' | 'Moderate' | 'Lower (extended forecast)' =
    timeframe === 'current' || timeframe === 'today'
      ? 'High'
      : timeframe === 'tomorrow'
      ? 'Moderate'
      : 'Lower (extended forecast)';

  return {
    targetLabel,
    timeframe,
    periodOfDay,
    tempMin: Math.round(minTemp),
    tempMax: Math.round(maxTemp),
    apparentTempMax: Math.round(maxApparent),
    peakRainProbability: peakRainProb,
    peakRainHours,
    totalPrecipitation: Math.round(totalPrecip * 10) / 10,
    maxWindSpeed: Math.round(maxWind),
    averageHumidity: avgHumidity,
    lowestVisibility: lowestVis,
    primaryCondition: periodFiltered[0]?.condition || targetDay.condition,
    hasThunderstormRisk: hasThunder || targetDay.condition.toLowerCase().includes('thunder'),
    hasHeatRisk: maxTemp >= 38 || maxApparent >= 40,
    hasHeavyRainRisk: totalPrecip >= 15 || peakRainProb >= 75,
    hasHighWindRisk: maxWind >= 35,
    activeAlerts: weather.alerts || [],
    hourlyTimelineSnippet: timelineParts.slice(0, 8).join('; '),
    forecastConfidence: confidence,
    forecastModel: weather.forecastModel,
    source: weather.source,
  };
}

