/**
 * WeatherGPT Server
 * Full-stack Express entry point powering the SIH 2026 WeatherGPT application.
 * Manages real-time Open-Meteo data fetching, data validation, and Gemini AI processing.
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  geocodeCity,
  getVerifiedWeatherData,
  type VerifiedWeatherData,
} from './services/weatherService.ts';
import {
  extractIntentAndLocation,
  generateWeatherExplanation,
  generateHourlyExplanation,
  sanitizeConversationalResponse,
  transcribeAudio,
} from './services/geminiService.ts';
import { buildBrief } from './services/intelligenceEngine.ts';
import { getOfficialWarnings } from './services/imdService.ts';
import { getMarine } from './services/marineService.ts';
import { getClimate } from './services/climateService.ts';
import { cached, TTL, coordKey } from './services/cacheService.ts';
import { computeWeatherAwareRoutePlan } from './services/routeWeatherService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '15mb' }));

export { app };

// Allow microphone permissions in browser and iframe contexts
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'microphone=*');
  next();
});

// In-memory weather cache to avoid redundant API rate limits during fast queries (30 seconds TTL)
const weatherCache = new Map<string, { data: VerifiedWeatherData; timestamp: number }>();
const CACHE_TTL_MS = 30 * 1000;

// Default city used when no location is supplied
const DEFAULT_CITY = {
  name: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  latitude: 13.0827,
  longitude: 80.2707,
};


// ===== WeatherGPT Intelligence API =====
const num = (v: unknown, lo: number, hi: number) => { const n = typeof v === 'string' ? parseFloat(v) : (v as number); return typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
const coords = (q: any) => { const lat = num(q.lat, -90, 90), lon = num(q.lon, -180, 180); return lat === null || lon === null ? null : { lat, lon }; };
const bad = (res: Response, msg: string) => res.status(400).json({ error: msg });

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString(), gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY', imd: !!process.env.IMD_WARNINGS_URL }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/location/search', async (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q.length < 2) return bad(res, 'Query "q" must be at least 2 characters.');
  try {
    const { value } = await cached(`geo:${q.toLowerCase()}`, TTL.geocode, () => geocodeCity(q));
    res.json({ results: value.slice(0, 8) });
  } catch (e: any) { res.status(503).json({ error: 'Location search unavailable.', details: e.message }); }
});

app.get('/api/warnings', async (req, res) => {
  const c = coords(req.query); if (!c) return bad(res, 'Valid lat and lon are required.');
  const place = String(req.query.name || '').slice(0, 80);
  res.json((await cached(`imd:${coordKey(c.lat, c.lon)}`, TTL.warnings, () => getOfficialWarnings({ place: place || coordKey(c.lat, c.lon), district: place }))).value);
});

app.get('/api/marine', async (req, res) => {
  const c = coords(req.query); if (!c) return bad(res, 'Valid lat and lon are required.');
  try { res.json((await cached(`marine:${coordKey(c.lat, c.lon)}`, TTL.marine, () => getMarine(c.lat, c.lon))).value); }
  catch (e: any) { res.status(503).json({ error: 'Marine data unavailable.', details: e.message }); }
});

app.get('/api/climate', async (req, res) => {
  const c = coords(req.query); if (!c) return bad(res, 'Valid lat and lon are required.');
  const range = num(req.query.range, 2, 15) ?? 5;
  try { res.json((await cached(`clim:${coordKey(c.lat, c.lon)}:${range}`, TTL.climate, () => getClimate(c.lat, c.lon, range))).value); }
  catch (e: any) { res.status(503).json({ error: 'Climate data unavailable.', details: e.message }); }
});

app.post('/api/intelligence', async (req, res) => {
  const b = req.body || {}; const l = b.location || {};
  const lat = num(l.latitude, -90, 90), lon = num(l.longitude, -180, 180);
  if (lat === null || lon === null || typeof l.name !== 'string') return bad(res, 'location {name, latitude, longitude} is required.');
  const question = typeof b.question === 'string' ? b.question.slice(0, 500) : undefined;
  try {
    const brief = await buildBrief({
      location: { name: l.name.slice(0, 80), state: typeof l.state === 'string' ? l.state.slice(0, 60) : undefined, country: typeof l.country === 'string' ? l.country.slice(0, 60) : undefined, latitude: lat, longitude: lon },
      question, language: typeof b.language === 'string' ? b.language : 'en', marine: b.marine === true,
      farming: b.farming && typeof b.farming.crop === 'string' && b.farming.crop.trim() ? { crop: b.farming.crop.trim() } : null,
      skipAi: b.skipAi === true,
    });
    res.json(brief);
  } catch (e: any) { console.error('intelligence error', e); res.status(503).json({ error: 'Weather information is temporarily unavailable.' }); }
});

/**
 * GET /api/geocode?q=Chennai
 * Returns geocoding matches from Open-Meteo
 */
app.get('/api/geocode', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    return res.status(400).json({ error: 'Search query parameter "q" is required.' });
  }

  try {
    const results = await geocodeCity(query);
    return res.json({ results });
  } catch (error: any) {
    console.error('Geocoding endpoint error:', error);
    return res.status(500).json({
      error: 'Unable to retrieve location coordinates. Please try again.',
      details: error.message,
    });
  }
});

/**
 * GET /api/reverse-geocode?lat=13.08&lon=80.27
 * Converts GPS coordinates to city, state, country
 */
const reverseCache = new Map<string, { location: any; timestamp: number }>();
app.get('/api/reverse-geocode', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Valid lat and lon parameters are required.' });
  }

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = reverseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return res.json({ location: cached.location });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WeatherGPT-App/2.0' },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const cityName =
        addr.city ||
        addr.town ||
        addr.municipality ||
        addr.suburb ||
        addr.village ||
        addr.county ||
        data.name ||
        'Current Location';
      const stateName = addr.state || addr.region || '';
      const countryName = addr.country || '';

      const loc = {
        name: cityName,
        state: stateName,
        country: countryName,
        latitude: lat,
        longitude: lon,
      };

      reverseCache.set(cacheKey, { location: loc, timestamp: Date.now() });
      return res.json({ location: loc });
    }
  } catch (err: any) {
    console.warn('Reverse geocode request failed:', err.message);
  }

  // Graceful fallback with coordinates
  const fallbackLoc = {
    name: 'Current Location',
    state: '',
    country: '',
    latitude: lat,
    longitude: lon,
  };
  return res.json({ location: fallbackLoc });
});

/**
 * GET /api/weather
 * Retrieves real-time weather from Open-Meteo
 * Params: lat, lon, name, state, country OR city
 */
app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    let lat = req.query.lat ? parseFloat(req.query.lat as string) : NaN;
    let lon = req.query.lon ? parseFloat(req.query.lon as string) : NaN;
    let name = (req.query.name as string) || '';
    let state = (req.query.state as string) || '';
    let country = (req.query.country as string) || '';
    const cityParam = (req.query.city as string) || '';
    const model = (req.query.model as string) || 'best_match';

    // If cityParam is supplied or coordinates are missing, geocode it
    if ((isNaN(lat) || isNaN(lon)) && cityParam) {
      const places = await geocodeCity(cityParam);
      if (places.length === 0) {
        return res.status(404).json({
          error: `Location "${cityParam}" could not be found. Please check spelling or select a city.`,
        });
      }
      const topMatch = places[0];
      lat = topMatch.latitude;
      lon = topMatch.longitude;
      name = topMatch.name;
      state = topMatch.admin1 || '';
      country = topMatch.country || '';
    } else if (isNaN(lat) || isNaN(lon)) {
      // Fallback to default Chennai
      lat = DEFAULT_CITY.latitude;
      lon = DEFAULT_CITY.longitude;
      name = DEFAULT_CITY.name;
      state = DEFAULT_CITY.state;
      country = DEFAULT_CITY.country;
    }

    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${model}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json({ data: cached.data, cached: true });
    }

    const weatherData = await getVerifiedWeatherData(lat, lon, name || 'Selected Location', state, country, model);
    weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

    return res.json({ data: weatherData, cached: false });
  } catch (error: any) {
    console.error('Weather endpoint error:', error);
    return res.status(503).json({
      error: 'Unable to retrieve live weather data right now. Please try again.',
      details: error.message,
    });
  }
});

/**
 * GET /api/weather/hourly
 * Returns hourly forecast data for a specific location
 */
app.get('/api/weather/hourly', async (req: Request, res: Response) => {
  try {
    let lat = req.query.latitude ? parseFloat(req.query.latitude as string) : parseFloat(req.query.lat as string);
    let lon = req.query.longitude ? parseFloat(req.query.longitude as string) : parseFloat(req.query.lon as string);
    const locationName = (req.query.location as string) || (req.query.name as string) || DEFAULT_CITY.name;
    const model = (req.query.model as string) || 'best_match';

    if (isNaN(lat) || isNaN(lon)) {
      lat = DEFAULT_CITY.latitude;
      lon = DEFAULT_CITY.longitude;
    }

    const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)},${model}`;
    let weatherData: VerifiedWeatherData;
    const cached = weatherCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      weatherData = cached.data;
    } else {
      weatherData = await getVerifiedWeatherData(lat, lon, locationName, undefined, undefined, model);
      weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
    }

    return res.json({
      location: weatherData.location.name,
      date: weatherData.daily[0]?.date || new Date().toISOString().split('T')[0],
      timezone: 'auto',
      hours: weatherData.hourly.map((h) => ({
        time: h.time,
        hour: h.hour,
        formatted_hour: h.formattedHour,
        hour_number: h.hourNumber,
        period: h.period,
        temperature: h.temperature,
        feels_like: h.apparentTemperature,
        precipitation_probability: h.rainProbability,
        precipitation: h.precipitation,
        humidity: h.humidity,
        wind_speed: h.windSpeed,
        wind_direction: h.windDirection,
        weather_code: h.weatherCode,
        condition: h.condition,
      })),
      source: weatherData.source,
      forecast_model: weatherData.forecastModel,
      retrieved_at: weatherData.updated,
    });
  } catch (error: any) {
    console.error('Hourly endpoint error:', error);
    return res.status(500).json({
      error: 'Unable to retrieve hourly forecast.',
      details: error.message,
    });
  }
});

/**
 * POST /api/weather/hourly-explanation
 * Generates a concise Gemini explanation for a selected hour from real weather data
 */
app.post('/api/weather/hourly-explanation', async (req: Request, res: Response) => {
  try {
    const { location, hourData, language } = req.body;
    if (!hourData || typeof hourData !== 'object') {
      return res.status(400).json({ error: 'Field "hourData" is required.' });
    }

    const locationName =
      typeof location === 'object' && location?.name
        ? String(location.name)
        : typeof location === 'string' && location.trim()
        ? location.trim()
        : DEFAULT_CITY.name;
    const explanation = await generateHourlyExplanation(locationName, hourData, language || 'en');

    return res.json({
      explanation,
      source: 'Open-Meteo + Gemini',
    });
  } catch (error: any) {
    console.error('Hourly explanation error:', error);
    return res.status(500).json({
      error: 'Failed to generate explanation for this hour.',
      details: error.message,
    });
  }
});

/**
 * POST /api/routes/plan
 * Weather-Aware Route Planner endpoint:
 * 1. Computes primary and alternative driving routes via Google Maps Routes API v2
 * 2. Samples 4-6 waypoints along the route polyline
 * 3. Evaluates expected travel time and checks weather at arrival time for each waypoint via Open-Meteo
 * 4. Identifies weather disturbances (Clear / Caution / Alert)
 * 5. Compares alternative routes objectively
 * 6. Generates grounded AI recommendation in the requested language
 */
app.post('/api/routes/plan', async (req: Request, res: Response) => {
  try {
    const { origin, destination, departureTime, language } = req.body;

    if (!origin || !destination) {
      return res.status(400).json({
        error: 'Both origin and destination are required to calculate route weather.',
      });
    }

    const routePlan = await computeWeatherAwareRoutePlan({
      origin,
      destination,
      departureTime,
      language: language || 'en',
    });

    return res.json(routePlan);
  } catch (error: any) {
    console.error('Route plan endpoint error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to calculate route weather conditions.',
    });
  }
});

/**
 * POST /api/chat
 * Main conversational endpoint adhering strictly to SIH 2026 rules:
 * 1. Understand question & extract intent/location with Gemini
 * 2. Retrieve REAL-TIME weather data from Open-Meteo
 * 3. Validate weather data
 * 4. Ground Gemini in verified data to generate concise, accurate response
 */
app.post('/api/chat', async (req: Request, res: Response) => {
  const {
    message,
    location,
    coords,
    language,
    lastLocation,
    lastActivity,
    deviceCoords,
    history,
    lastTimeframe,
    lastTimeOfDay,
    model: requestedModel,
    cropContext,
    isFarmerMode,
  } = req.body;
  const activeModel = typeof requestedModel === 'string' && requestedModel.trim() ? requestedModel.trim() : 'best_match';

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Field "message" is required.' });
  }

  const activeLocationName =
    typeof location === 'object' && location?.name
      ? String(location.name)
      : typeof location === 'string' && location.trim()
      ? location.trim()
      : DEFAULT_CITY.name;

  try {
    const contextLocName =
      typeof lastLocation === 'object' && lastLocation?.name
        ? String(lastLocation.name)
        : typeof lastLocation === 'string' && lastLocation.trim()
        ? lastLocation.trim()
        : undefined;

    const contextAct =
      typeof lastActivity === 'string' && lastActivity.trim()
        ? lastActivity.trim()
        : undefined;

    // 1. Analyze query: extract location, intent, activity, timeframe, and time window (Pipeline Step 1)
    const intent = await extractIntentAndLocation(
      message,
      activeLocationName,
      contextLocName,
      contextAct,
      lastTimeframe,
      lastTimeOfDay,
      Array.isArray(history) ? history : undefined
    );

    // 2. Strict Location Priority Resolution (Requirement 2 & 4)
    let targetName = '';
    let targetLat: number | undefined = undefined;
    let targetLon: number | undefined = undefined;
    let targetState = '';
    let targetCountry = '';

    // Priority 1: Explicit location mentioned in the user's current message
    if (intent.detectedLocation && typeof intent.detectedLocation === 'string' && intent.detectedLocation.trim()) {
      const explicitLoc = intent.detectedLocation.trim();
      const geoMatches = await geocodeCity(explicitLoc);
      if (geoMatches.length > 0) {
        targetName = geoMatches[0].name;
        targetLat = geoMatches[0].latitude;
        targetLon = geoMatches[0].longitude;
        targetState = geoMatches[0].admin1 || '';
        targetCountry = geoMatches[0].country || '';
      } else {
        // REQUIREMENT 4: NEVER SILENTLY FALL BACK TO CHENNAI IF LOCATION CANNOT BE CONFIDENTLY IDENTIFIED
        const lang = (language || 'en').toLowerCase();
        let unknownReply = `I couldn't identify the location "${explicitLoc}". Please verify the spelling or specify the district or state (e.g., "Manakunnam, Kochi").`;
        if (lang === 'hi') {
          unknownReply = `मुझे स्थान "${explicitLoc}" की पहचान नहीं हो सकी। कृपया वर्तनी की जांच करें या जिला/राज्य जोड़ें (जैसे "Manakunnam, Kochi")।`;
        } else if (lang === 'ta') {
          unknownReply = `"${explicitLoc}" என்ற இடத்தை அடையாளம் காண முடியவில்லை. தயவுசெய்து எழுத்துப்பிழையை சரிபார்க்கவும் அல்லது மாவட்டத்தைக் குறிப்பிடவும்.`;
        } else if (lang === 'te') {
          unknownReply = `"${explicitLoc}" స్థానాన్ని గుర్తించలేకపోయాను. దయచేసి స్పెల్లింగ్‌ను తనిఖీ చేయండి లేదా జిల్లా/రాష్ట్రాన్ని పేర్కొనండి.`;
        } else if (lang === 'ml') {
          unknownReply = `"${explicitLoc}" എന്ന സ്ഥലം തിരിച്ചറിയാൻ കഴിഞ്ഞില്ല. ദയവായി അക്ഷരവിന്യാസം പരിശോധിക്കുക അല്ലെങ്കിൽ ജില്ലയോ സംസ്ഥാനമോ വ്യക്തമാക്കുക.`;
        }

        return res.json({
          reply: unknownReply,
          location: null,
          intent,
          debug: {
            detectedLocation: explicitLoc,
            latitude: null,
            longitude: null,
            detectedIntent: 'Unresolved location query',
            activity: intent.activity,
            weatherApiLocation: 'Not resolved - query aborted before Weather API call',
            timeframe: intent.timeframe,
            source: 'Geocoding resolver',
          },
        });
      }
    }

    // Priority 2: Device location query ("near me", "my location", "here")
    else if (intent.isDeviceLocationQuery) {
      if (deviceCoords?.latitude && deviceCoords?.longitude) {
        targetLat = deviceCoords.latitude;
        targetLon = deviceCoords.longitude;
        targetName = deviceCoords.name || 'Your Location';
      } else if (coords?.lat && coords?.lon && coords?.isDeviceLocation) {
        targetLat = coords.lat;
        targetLon = coords.lon;
        targetName = coords.name || 'Your Location';
      } else {
        const lang = (language || 'en').toLowerCase();
        let deviceReply = 'To check weather near you, please grant location access or specify your city name.';
        if (lang === 'hi') {
          deviceReply = 'अपने आस-पास का मौसम देखने के लिए, कृपया स्थान अनुमति दें या अपने शहर का नाम बताएं।';
        } else if (lang === 'ta') {
          deviceReply = 'உங்கள் அருகிலுள்ள வானிலையை அறிய, இருப்பிட அனுமதியை இயக்கவும் அல்லது உங்கள் நகரத்தைக் குறிப்பிடவும்.';
        } else if (lang === 'te') {
          deviceReply = 'మీ దగ్గరి వాతావరణాన్ని తనిఖీ చేయడానికి, దయచేసి లొకేషన్ అనుమతించండి లేదా మీ నగర పేరు చెప్పండి.';
        } else if (lang === 'ml') {
          deviceReply = 'നിങ്ങൾക്ക് അടുത്തുള്ള കാലാവസ്ഥ അറിയാൻ ലൊക്കേഷൻ അനുമതി നൽകുക അല്ലെങ്കിൽ നഗരത്തിന്റെ പേര് നൽകുക.';
        }

        return res.json({
          reply: deviceReply,
          location: null,
          intent,
          debug: {
            detectedLocation: 'Device location (near me)',
            latitude: null,
            longitude: null,
            detectedIntent: 'Device location query',
            activity: intent.activity,
            weatherApiLocation: 'Awaiting device coordinates',
            timeframe: intent.timeframe,
            source: 'Client device',
          },
        });
      }
    }

    // Priority 3: Contextual query ("there", "that place")
    else if (intent.isContextualFollowup && lastLocation?.latitude && lastLocation?.longitude) {
      targetName = lastLocation.name;
      targetLat = lastLocation.latitude;
      targetLon = lastLocation.longitude;
      targetState = lastLocation.state || '';
      targetCountry = lastLocation.country || '';
    }

    // Priority 4: Explicitly selected location in the UI
    else if (coords?.lat && coords?.lon) {
      targetLat = coords.lat;
      targetLon = coords.lon;
      targetName = coords.name || activeLocationName;
      targetState = coords.state || '';
      targetCountry = coords.country || '';
    } else if (location && typeof location === 'object' && location.latitude && location.longitude) {
      targetLat = location.latitude;
      targetLon = location.longitude;
      targetName = location.name;
      targetState = location.state || '';
      targetCountry = location.country || '';
    }

    // Priority 5: Fallback to active location / Default city ONLY if no location was specified or selected
    if (targetLat === undefined || targetLon === undefined) {
      if (activeLocationName) {
        const activeMatches = await geocodeCity(activeLocationName);
        if (activeMatches.length > 0) {
          targetName = activeMatches[0].name;
          targetLat = activeMatches[0].latitude;
          targetLon = activeMatches[0].longitude;
          targetState = activeMatches[0].admin1 || '';
          targetCountry = activeMatches[0].country || '';
        }
      }
      if (targetLat === undefined || targetLon === undefined) {
        targetName = DEFAULT_CITY.name;
        targetLat = DEFAULT_CITY.latitude;
        targetLon = DEFAULT_CITY.longitude;
        targetState = DEFAULT_CITY.state;
        targetCountry = DEFAULT_CITY.country;
      }
    }

    // 3. Retrieve REAL-TIME weather data from Open-Meteo with verified NWP model
    let weatherData: VerifiedWeatherData;
    try {
      const cacheKey = `${targetLat.toFixed(3)},${targetLon.toFixed(3)},${activeModel}`;
      const cached = weatherCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        weatherData = cached.data;
      } else {
        weatherData = await getVerifiedWeatherData(
          targetLat,
          targetLon,
          targetName,
          targetState,
          targetCountry,
          activeModel
        );
        weatherCache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
      }
    } catch (weatherErr: any) {
      console.error('Failed to retrieve Open-Meteo data for chat:', weatherErr);
      return res.status(503).json({
        error: 'Unable to retrieve live weather data right now. Please try again.',
        reply: 'Unable to retrieve live weather data right now. Please try again.',
        source: 'Open-Meteo',
      });
    }

    // 4. Send verified weather data + user question to Gemini for grounded decision-support explanation
    let aiExplanation = await generateWeatherExplanation(
      message,
      weatherData,
      intent,
      language || 'en',
      Array.isArray(history) ? history : undefined,
      typeof cropContext === 'string' ? cropContext : undefined,
      Boolean(isFarmerMode)
    );

    // 5. If travel intent is detected, provide route action metadata
    let routeAction: { origin: string; destination: string; departureTime?: string } | undefined = undefined;
    if (intent.isTravelQuery) {
      const origin = intent.originLocation || activeLocationName;
      const destination = intent.destinationLocation || (intent.detectedLocation !== activeLocationName ? intent.detectedLocation : '') || '';
      routeAction = {
        origin,
        destination,
      };

      const lang = (language || 'en').toLowerCase();
      const promptNote =
        lang === 'hi'
          ? '\n\n🗺️ क्या आप अपने पूरे यात्रा मार्ग पर मौसम की स्थिति देखना चाहते हैं? इंटरएक्टिव मैप और वेपॉइंट पूर्वानुमान के लिए नीचे "मार्ग योजना बनाएं" पर क्लिक करें।'
          : lang === 'ta'
          ? '\n\n🗺️ முழு பயணப் பாதையிலும் வானிலை நிலையை ஆய்வு செய்ய விரும்புகிறீர்களா? வரைபடம் மற்றும் மாற்றுப் பாதைகளைக் காண கீழே உள்ள "எனது பயணப் பாதையைத் திட்டமிடு" பொத்தானைப் பயன்படுத்தவும்.'
          : lang === 'te'
          ? '\n\n🗺️ మొత్తం ప్రయాణ మార్గంలో వాతావరణ పరిస్థితులను తనిఖీ చేయాలనుకుంటున్నారా? ఇంటరాక్టివ్ మ్యాప్‌ను చూడటానికి క్రింద ఉన్న "నా మార్గాన్ని ప్లాన్ చేయండి" క్లిక్ చేయండి.'
          : lang === 'ml'
          ? '\n\n🗺️ യാത്രാപാതയിലെ കാലാവസ്ഥാ വിവരങ്ങൾ വിശദമായി പരിശോധിക്കാൻ താഴെയുള്ള "റൂട്ട് പ്ലാൻ ചെയ്യുക" ക്ലിക്ക് ചെയ്യുക.'
          : lang === 'kn'
          ? '\n\n🗺️ ಇಡೀ ಪ್ರಯಾಣ ಮಾರ್ಗದಲ್ಲಿ ಹವಾಮಾನ ಪರಿಸ್ಥಿತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಬಯಸುವಿರಾ? ಸಂವಾದಾತ್ಮಕ ನಕ್ಷೆಗಾಗಿ ಕೆಳಗಿನ "ಮಾರ್ಗ ಯೋಜನೆ ರೂಪಿಸಿ" ಕ್ಲಿಕ್ ಮಾಡಿ.'
          : lang === 'mr'
          ? '\n\n🗺️ संपूर्ण प्रवासाच्या मार्गावरील हवामान स्थिती तपासू इच्छिता? परस्परसंवादी नकाशासाठी खालील "मार्गाचे नियोजन करा" वर क्लिक करा.'
          : '\n\n🗺️ Would you like to inspect weather conditions along the entire route? Click "Plan My Route" below to view the interactive map, waypoint forecasts, and alternative routes.';

      aiExplanation += promptNote;
    }

    aiExplanation = sanitizeConversationalResponse(aiExplanation);

    // 6. Developer/Debug Section (Kept internally for diagnostic inspectability, not shown in user chat UI)
    const debugInfo = {
      detectedLocation: intent.detectedLocation || (intent.isContextualFollowup ? `${lastLocation?.name || 'Context location'} (contextual)` : 'None (UI selected)'),
      latitude: targetLat,
      longitude: targetLon,
      detectedIntent: intent.intentType === 'outdoor_activity'
        ? 'Outdoor activity weather assessment'
        : intent.intentType === 'travel_route'
        ? 'Travel route weather assessment'
        : intent.intentType === 'contextual_followup'
        ? 'Contextual follow-up weather assessment'
        : 'Weather forecast / observation',
      activity: intent.activity || (intent.intentType === 'outdoor_activity' ? 'Outdoor sports' : undefined),
      weatherApiLocation: `${weatherData.location.name}${weatherData.location.state ? `, ${weatherData.location.state}` : ''}${weatherData.location.country ? `, ${weatherData.location.country}` : ''}`,
      timeframe: intent.timeframe,
      source: weatherData.source,
      forecastModel: weatherData.forecastModel,
    };

    return res.json({
      reply: aiExplanation,
      location: weatherData.location,
      intent,
      debug: debugInfo,
      weatherData: {
        current: weatherData.current,
        daily: weatherData.daily,
        alerts: weatherData.alerts,
      },
      routeAction,
      source: weatherData.source,
      forecastModel: weatherData.forecastModel,
      modelIdentifier: weatherData.modelIdentifier,
      generationTimeMs: weatherData.generationTimeMs,
      elevation: weatherData.elevation,
      updated: weatherData.updated,
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return res.status(500).json({
      error: 'An unexpected error occurred while processing your weather request.',
      reply: 'An unexpected error occurred while processing your weather request. Please try again.',
      details: error.message,
    });
  }
});

/**
 * POST /api/transcribe
 * Audio speech-to-text fallback using Gemini Multimodal Audio
 */
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType, language } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }
    const transcript = await transcribeAudio(audio, mimeType || 'audio/webm', language || 'en');
    return res.json({ transcript });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    return res.status(500).json({
      error: 'Failed to transcribe audio.',
      details: error.message,
    });
  }
});

// Production or Dev Vite mounting
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static build in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WeatherGPT server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') startServer();
