import { LocationData, VerifiedWeatherData, ChatDebugInfo } from '../types';

export interface GeocodeResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

/**
 * Safely parse JSON response with defensive fallback against HTML error pages (e.g., Nginx 502/504)
 */
async function parseJsonResponse<T = any>(res: Response, defaultMessage: string): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();

  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
    throw new Error('Weather service is connecting. Please click "Try Again" in a moment.');
  }

  try {
    const data = JSON.parse(text);
    if (!res.ok) {
      throw new Error(data.error || data.reply || data.details || defaultMessage);
    }
    return data as T;
  } catch (err: any) {
    if (err.message && !err.message.includes('Unexpected token') && !err.message.includes('JSON')) {
      throw err;
    }
    throw new Error(defaultMessage);
  }
}

export async function fetchWeather(
  location: { latitude: number; longitude: number; name: string; state?: string; country?: string },
  model?: string
): Promise<VerifiedWeatherData> {
  const params = new URLSearchParams({
    lat: location.latitude.toString(),
    lon: location.longitude.toString(),
    name: location.name,
    state: location.state || '',
    country: location.country || '',
    model: model || 'best_match',
  });

  const res = await fetch(`/api/weather?${params.toString()}`);
  const json = await parseJsonResponse<{ data: VerifiedWeatherData }>(
    res,
    'Unable to retrieve live weather data right now. Please try again.'
  );

  return json.data;
}

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
    const json = await parseJsonResponse<{ results: GeocodeResult[] }>(
      res,
      'Unable to search locations.'
    );
    return json.results || [];
  } catch {
    return [];
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationData | null> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lon=${longitude}`);
    if (!res.ok) return null;
    const json = await parseJsonResponse<{ location: LocationData }>(
      res,
      'Unable to reverse geocode.'
    );
    return json.location || null;
  } catch {
    return null;
  }
}

export async function sendChatMessage(
  message: string,
  location: LocationData,
  language: string = 'en',
  lastLocation?: LocationData | null,
  lastActivity?: string | null,
  deviceCoords?: { latitude: number; longitude: number } | null,
  history?: Array<{ sender: 'user' | 'assistant'; text: string }>,
  lastTimeframe?: string | null,
  lastTimeOfDay?: string | null,
  model?: string
): Promise<{
  reply: string;
  source: string;
  forecastModel?: string;
  modelIdentifier?: string;
  generationTimeMs?: number;
  elevation?: number;
  updated: string;
  location: LocationData;
  intent?: any;
  weatherData?: any;
  debug?: ChatDebugInfo;
  routeAction?: { origin: string; destination: string; departureTime?: string };
}> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      location: location.name,
      language,
      model: model || 'best_match',
      lastLocation: lastLocation
        ? {
            name: lastLocation.name,
            latitude: lastLocation.latitude,
            longitude: lastLocation.longitude,
            state: lastLocation.state,
            country: lastLocation.country,
          }
        : undefined,
      lastActivity: lastActivity || undefined,
      deviceCoords: deviceCoords || undefined,
      history: history || undefined,
      lastTimeframe: lastTimeframe || undefined,
      lastTimeOfDay: lastTimeOfDay || undefined,
      coords: {
        lat: location.latitude,
        lon: location.longitude,
        state: location.state,
        country: location.country,
      },
    }),
  });

  return await parseJsonResponse(
    res,
    'Unable to retrieve live weather data right now. Please try again.'
  );
}

export async function fetchHourlyExplanation(
  locationName: string,
  hourData: any,
  language: string = 'en'
): Promise<string> {
  try {
    const res = await fetch('/api/weather/hourly-explanation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: locationName,
        hourData,
        language,
      }),
    });

    const json = await parseJsonResponse<{ explanation?: string }>(
      res,
      'Failed to generate explanation.'
    );
    return json.explanation || '';
  } catch {
    // Return a smart fallback explanation based on the numbers
    const time = hourData.formattedHour || hourData.hour;
    if (hourData.rainProbability >= 60) {
      return `Rain is very likely around ${time} (${hourData.rainProbability}% chance). Carrying an umbrella is advised.`;
    }
    if (hourData.rainProbability >= 30) {
      return `Rain is possible around ${time}, but the probability remains moderate (${hourData.rainProbability}%).`;
    }
    if (hourData.temperature >= 34) {
      return `Warm conditions around ${time} (${hourData.temperature}°C). Stay hydrated.`;
    }
    return `Expect settled conditions around ${time} with ${hourData.condition?.toLowerCase() || 'fair skies'}.`;
  }
}

/**
 * Sends recorded audio data to the server for transcription via Gemini AI
 */
export async function transcribeAudioApi(
  audioBase64: string,
  mimeType: string,
  language: string
): Promise<string> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio: audioBase64,
      mimeType,
      language,
    }),
  });

  const json = await parseJsonResponse<{ transcript?: string }>(
    res,
    'Failed to transcribe audio.'
  );

  return json.transcript || '';
}
