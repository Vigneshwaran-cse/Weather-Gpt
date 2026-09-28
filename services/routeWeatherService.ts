import { geocodeCity } from './weatherService.js';
import { GoogleGenAI } from '@google/genai';
import type {
  RoutePlanResult,
  RouteOption,
  RouteWaypointWeather,
  RouteSegment,
  DisturbanceSeverity,
} from '../src/types.js';

// Polyline decoding utility
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

// Simple in-memory cache for reverse geocoding to keep requests fast and resilient
const reverseGeocodeCache = new Map<string, string>();

async function reverseGeocodeWaypoint(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  if (reverseGeocodeCache.has(key)) {
    return reverseGeocodeCache.get(key)!;
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          'User-Agent': 'WeatherGPT-App/1.0',
          'Accept-Language': 'en',
        },
        signal: AbortSignal.timeout(2000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const placeName =
        addr.town ||
        addr.city ||
        addr.suburb ||
        addr.village ||
        addr.county ||
        addr.state_district ||
        data.name;

      if (placeName) {
        reverseGeocodeCache.set(key, placeName);
        return placeName;
      }
    }
  } catch {
    // Fallback to coordinates
  }

  const fallback = `Point (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
  reverseGeocodeCache.set(key, fallback);
  return fallback;
}

function getConditionFromCode(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

function getPrecaution(
  status: DisturbanceSeverity,
  rainProb: number,
  precip: number,
  code: number,
  temp: number,
  wind: number,
  language: string = 'en'
): string {
  const lang = (language || 'en').toLowerCase();

  if (status === 'alert') {
    if (code >= 95) {
      if (lang === 'hi') return 'गरज के साथ तेज तूफान की संभावना। खुले रास्तों पर वाहन न रोकें और सावधानी बरतें।';
      if (lang === 'ta') return 'இடியுடன் கூடிய புயல் எச்சரிக்கை. திறந்த வெளிகளில் வாகனங்களை நிறுத்துவதை தவிர்க்கவும்.';
      if (lang === 'te') return 'ఉరుములతో కూడిన తుఫాను హెచ్చరిక. వాహనాన్ని సురక్షిత ప్రదేశంలో ఉంచండి.';
      if (lang === 'ml') return 'ഇടിമിന്നൽ സാധ്യത. തുറസ്സായ സ്ഥലങ്ങളിൽ വാഹനം നിർത്തുന്നത് ഒഴിവാക്കുക.';
      return 'Thunderstorm conditions expected. Avoid parking under trees or exposed flyovers; proceed with extreme caution.';
    }
    if (precip >= 4.0 || rainProb >= 60) {
      if (lang === 'hi') return 'भारी बारिश का पूर्वानुमान: सड़कों पर जलभराव और कम दृश्यता की संभावना। गति धीमी रखें और हेडलाइट चालू रखें।';
      if (lang === 'ta') return 'கனமழை எதிர்பார்க்கப்படுகிறது: சாலைகளில் தண்ணீர் தேங்க வாய்ப்பு. குறைந்த வேகத்தில் வாகனத்தை இயக்கவும்.';
      if (lang === 'te') return 'భారీ వర్షం పడే అవకాశం: రహదారులపై నీరు నిలిచే ప్రమాదం ఉంది. వేగం తగ్గించి డ్రైవ్ చేయండి.';
      if (lang === 'ml') return 'കനത്ത മഴ മുന്നറിയിപ്പ്: റോഡുകളിൽ വെള്ളക്കെട്ടിന് സാധ്യത. വേഗത കുറച്ച് ശ്രദ്ധയോടെ ഡ്രൈവ് ചെയ്യുക.';
      return 'Heavy rainfall expected. High risk of waterlogging and poor visibility. Maintain reduced speed and activate headlights.';
    }
    if (wind >= 50) {
      if (lang === 'hi') return 'तेज हवाओं का अलर्ट: हाईवे पर स्टीयरिंग मजबूती से पकड़ें।';
      if (lang === 'ta') return 'பலத்த காற்று எச்சரிக்கை: நெடுஞ்சாலைகளில் வாகனத்தை கவனமாக இயக்கவும்.';
      if (lang === 'te') return 'తీవ్రమైన గాలుల హెచ్చరిక: హైవేలలో జాగ్రత్తగా డ్రైవ్ చేయండి.';
      if (lang === 'ml') return 'ശക്തമായ കാറ്റ് മുന്നറിയിപ്പ്: ശ്രദ്ധയോടെ വാഹനം ഓടിക്കുക.';
      return 'Severe gusty winds. Hold vehicle steering firmly on bridges and open expressways.';
    }
  }

  if (status === 'caution') {
    if (rainProb >= 30 || precip >= 0.5) {
      if (lang === 'hi') return 'हल्की से मध्यम बारिश: गीली सड़कों पर अचानक ब्रेक लगाने से बचें और सुरक्षित दूरी बनाएं।';
      if (lang === 'ta') return 'மிதமான மழை: வழுக்கும் சாலைகளில் போதுமான இடைவெளி விட்டு வாகனத்தை இயக்கவும்.';
      if (lang === 'te') return 'మోస్తరు వర్షం: తడిసిన రోడ్లపై సురక్షిత దూరం పాటించండి.';
      if (lang === 'ml') return 'മിതമായ മഴ സാധ്യത: വഴുവഴുപ്പുള്ള റോഡുകളിൽ ജാഗ്രത പാലിക്കുക.';
      return 'Showers expected. Pavements may be slick; increase following distance and monitor wipers.';
    }
    if (temp >= 38) {
      if (lang === 'hi') return 'अत्यधिक गर्मी: यात्रा के दौरान पर्याप्त पानी पिएं और वाहन का कूलेंट चेक करें।';
      if (lang === 'ta') return 'அதிக வெப்பம்: போதுமான தண்ணீர் அருந்தவும், என்ஜின் குளிரூட்டியை சரிபார்க்கவும்.';
      if (lang === 'te') return 'తీవ్రమైన ఎండ: ప్రయాణంలో నీరు ఎక్కువగా తాగండి మరియు వాహనాన్ని చెక్ చేయండి.';
      if (lang === 'ml') return 'അത്യുഷ്ണം: യാത്രയ്ക്കിടയിൽ ധാരാളം വെള്ളം കുടിക്കുക.';
      return 'High temperatures. Ensure adequate vehicle coolant levels and carry drinking water.';
    }
    if (wind >= 35) {
      if (lang === 'hi') return 'मध्यम हवाएं: दोपहिया वाहन सावधानी से चलाएं।';
      if (lang === 'ta') return 'மிதமான காற்று: இருசக்கர வாகன ஓட்டிகள் கவனமாக செல்லவும்.';
      if (lang === 'te') return 'మోస్తరు గాలులు: ద్విచక్ర వాహనదారులు జాగ్రత్తగా ఉండండి.';
      if (lang === 'ml') return 'കാറ്റ് വീശാൻ സാധ്യത: ജാഗ്രത പാലിക്കുക.';
      return 'Brisk crosswinds possible on elevated roadways.';
    }
  }

  if (lang === 'hi') return 'अनुकूल मौसम: सामान्य गति से यात्रा करें और नियमित अपडेट चेक करते रहें।';
  if (lang === 'ta') return 'சாதகமான வானிலை: வழக்கமான பாதுகாப்புடன் பயணிக்கலாம்.';
  if (lang === 'te') return 'అనుకూల వాతావరణం: సాధారణ డ్రైవింగ్ పరిస్థితులు.';
  if (lang === 'ml') return 'അനുകൂല കാലാവസ്ഥ: സാധാരണ രീതിയിൽ യാത്ര തുടരാം.';
  return 'Favorable travel conditions. Follow regular road safety precautions and monitor conditions.';
}

export interface ComputeRoutePlanInput {
  origin: string | { name?: string; latitude: number; longitude: number };
  destination: string | { name?: string; latitude: number; longitude: number };
  departureTime?: string;
  language?: string;
}

export async function computeWeatherAwareRoutePlan(
  input: ComputeRoutePlanInput
): Promise<RoutePlanResult> {
  const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error('Google Maps Platform API key is not configured.');
  }

  // 1. Resolve Origin
  let originLat: number;
  let originLon: number;
  let originName: string;

  if (typeof input.origin === 'object' && input.origin && 'latitude' in input.origin) {
    originLat = input.origin.latitude;
    originLon = input.origin.longitude;
    originName = input.origin.name || 'Origin';
  } else {
    const originStr = String(input.origin || '').trim();
    if (!originStr) throw new Error('Origin location is required.');
    const originMatches = await geocodeCity(originStr);
    if (!originMatches || originMatches.length === 0) {
      throw new Error(`Starting location "${originStr}" could not be found.`);
    }
    originLat = originMatches[0].latitude;
    originLon = originMatches[0].longitude;
    originName = originMatches[0].name;
  }

  // 2. Resolve Destination
  let destLat: number;
  let destLon: number;
  let destName: string;

  if (typeof input.destination === 'object' && input.destination && 'latitude' in input.destination) {
    destLat = input.destination.latitude;
    destLon = input.destination.longitude;
    destName = input.destination.name || 'Destination';
  } else {
    const destStr = String(input.destination || '').trim();
    if (!destStr) throw new Error('Destination location is required.');
    const destMatches = await geocodeCity(destStr);
    if (!destMatches || destMatches.length === 0) {
      throw new Error(`Destination "${destStr}" could not be found.`);
    }
    destLat = destMatches[0].latitude;
    destLon = destMatches[0].longitude;
    destName = destMatches[0].name;
  }

  // 3. Resolve Departure Time
  const now = new Date();
  let departureDate: Date;
  if (input.departureTime) {
    const parsed = new Date(input.departureTime);
    departureDate = isNaN(parsed.getTime()) ? now : parsed;
  } else {
    departureDate = now;
  }

  // 4. Call Google Routes API REST
  const routesUrl = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  const routesBody: Record<string, any> = {
    origin: {
      location: {
        latLng: {
          latitude: originLat,
          longitude: originLon,
        },
      },
    },
    destination: {
      location: {
        latLng: {
          latitude: destLat,
          longitude: destLon,
        },
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE',
    computeAlternativeRoutes: true,
  };

  // Google Routes API requires departureTime to be in the future (if specified)
  if (departureDate.getTime() > Date.now() + 60 * 1000) {
    routesBody.departureTime = departureDate.toISOString();
  }

  const routesRes = await fetch(routesUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask':
        'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs',
    },
    body: JSON.stringify(routesBody),
  });

  if (!routesRes.ok) {
    const errText = await routesRes.text();
    console.error('Google Routes API returned error:', routesRes.status, errText);
    throw new Error(`Google Maps Routes API error (${routesRes.status}).`);
  }

  const routesData = await routesRes.json();
  const rawRoutes: any[] = routesData.routes || [];

  if (rawRoutes.length === 0) {
    throw new Error(`No drivable route found between ${originName} and ${destName}.`);
  }

  const language = input.language || 'en';

  // 5. Process each route
  const processedRoutes: RouteOption[] = [];

  for (let rIdx = 0; rIdx < rawRoutes.length; rIdx++) {
    const r = rawRoutes[rIdx];
    const encodedPoly = r.polyline?.encodedPolyline || '';
    const path = decodePolyline(encodedPoly);
    const distanceKm = Math.round((r.distanceMeters || 0) / 1000);

    // Duration in seconds (e.g. "13698s")
    const durationSeconds = parseInt(String(r.duration || '0').replace('s', ''), 10) || 0;
    const durationMinutes = Math.round(durationSeconds / 60);

    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationFormatted = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

    const isAlternative = rIdx > 0;
    const routeName = isAlternative
      ? `Alternative Route ${rIdx} (${r.description || 'Via Highway'})`
      : `Recommended Route (${r.description || 'Fastest Route'})`;

    // 6. Sample 5 to 7 Waypoints along the path
    const waypointCount = Math.min(6, Math.max(4, Math.floor(distanceKm / 40)));
    const sampledWaypoints: RouteWaypointWeather[] = [];

    for (let wIdx = 0; wIdx <= waypointCount; wIdx++) {
      const ratio = wIdx / waypointCount;
      const pointIndex = Math.min(path.length - 1, Math.floor(ratio * (path.length - 1)));
      const coord = path[pointIndex] || { lat: originLat, lng: originLon };

      const distFromStart = Math.round(distanceKm * ratio);
      const minutesFromStart = Math.round(durationMinutes * ratio);
      const arrivalTimestamp = new Date(departureDate.getTime() + minutesFromStart * 60 * 1000);

      // Name waypoint
      let pointName = '';
      if (wIdx === 0) {
        pointName = originName;
      } else if (wIdx === waypointCount) {
        pointName = destName;
      } else {
        pointName = await reverseGeocodeWaypoint(coord.lat, coord.lng);
      }

      // 7. Query Open-Meteo for exact arrival hour
      let temperature = 28;
      let apparentTemperature = 30;
      let rainProbability = 10;
      let precipitation = 0;
      let windSpeed = 12;
      let weatherCode = 1;
      let condition = 'Mainly clear';

      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat.toFixed(4)}&longitude=${coord.lng.toFixed(4)}&models=best_match&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m&timezone=auto`;
        const wRes = await fetch(weatherUrl);
        if (wRes.ok) {
          const wData = await wRes.json();
          const times: string[] = wData.hourly?.time || [];

          // Format target arrival hour as ISO prefix: "YYYY-MM-DDTHH:00"
          const pad = (n: number) => String(n).padStart(2, '0');
          const targetHourPrefix = `${arrivalTimestamp.getFullYear()}-${pad(arrivalTimestamp.getMonth() + 1)}-${pad(arrivalTimestamp.getDate())}T${pad(arrivalTimestamp.getHours())}:00`;

          let matchedIdx = times.findIndex((t) => t.startsWith(targetHourPrefix));
          if (matchedIdx === -1 && times.length > 0) {
            matchedIdx = 0;
          }

          if (matchedIdx !== -1 && wData.hourly) {
            temperature = Math.round(wData.hourly.temperature_2m[matchedIdx] ?? 28);
            apparentTemperature = Math.round(wData.hourly.apparent_temperature[matchedIdx] ?? temperature);
            rainProbability = Math.round(wData.hourly.precipitation_probability[matchedIdx] ?? 0);
            precipitation = Number((wData.hourly.precipitation[matchedIdx] ?? 0).toFixed(1));
            windSpeed = Math.round(wData.hourly.wind_speed_10m[matchedIdx] ?? 10);
            weatherCode = wData.hourly.weather_code[matchedIdx] ?? 1;
            condition = getConditionFromCode(weatherCode);
          }
        }
      } catch (err) {
        console.warn(`Weather fetch failed for waypoint ${pointName}:`, err);
      }

      // Classify Disturbance Severity
      let status: DisturbanceSeverity = 'clear';
      let statusMessage = 'Normal conditions';

      if (rainProbability >= 60 || precipitation >= 4.0 || weatherCode >= 95 || windSpeed >= 50) {
        status = 'alert';
        if (weatherCode >= 95) {
          statusMessage = 'Thunderstorm / severe storm expected';
        } else if (precipitation >= 4.0 || rainProbability >= 60) {
          statusMessage = `Heavy rainfall expected (${rainProbability}%, ${precipitation}mm)`;
        } else {
          statusMessage = `Severe winds (${windSpeed} km/h)`;
        }
      } else if (rainProbability >= 30 || precipitation >= 0.5 || windSpeed >= 35 || temperature >= 38) {
        status = 'caution';
        if (precipitation >= 0.5 || rainProbability >= 30) {
          statusMessage = `Moderate showers expected (${rainProbability}%)`;
        } else if (temperature >= 38) {
          statusMessage = `Extreme heat (${temperature}°C)`;
        } else {
          statusMessage = `Brisk winds (${windSpeed} km/h)`;
        }
      }

      const precaution = getPrecaution(
        status,
        rainProbability,
        precipitation,
        weatherCode,
        temperature,
        windSpeed,
        language
      );

      const arrivalTimeStr = arrivalTimestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      sampledWaypoints.push({
        id: `wp-${rIdx}-${wIdx}`,
        name: pointName,
        latitude: coord.lat,
        longitude: coord.lng,
        distanceFromStartKm: distFromStart,
        travelMinutesFromStart: minutesFromStart,
        estimatedArrivalTime: arrivalTimestamp.toISOString(),
        arrivalHourFormatted: arrivalTimeStr,
        temperature,
        apparentTemperature,
        rainProbability,
        precipitation,
        windSpeed,
        weatherCode,
        condition,
        status,
        statusMessage,
        precaution,
        source: 'Open-Meteo (ECMWF/GFS)',
      });
    }

    // 8. Generate segments between consecutive waypoints
    const segments: RouteSegment[] = [];
    for (let i = 0; i < sampledWaypoints.length - 1; i++) {
      const fromWp = sampledWaypoints[i];
      const toWp = sampledWaypoints[i + 1];

      // Segment severity is the higher of both endpoints
      let segStatus: DisturbanceSeverity = 'clear';
      if (fromWp.status === 'alert' || toWp.status === 'alert') {
        segStatus = 'alert';
      } else if (fromWp.status === 'caution' || toWp.status === 'caution') {
        segStatus = 'caution';
      }

      let summary = 'Normal conditions';
      if (segStatus === 'alert') {
        summary = toWp.status === 'alert' ? toWp.statusMessage : fromWp.statusMessage;
      } else if (segStatus === 'caution') {
        summary = toWp.status === 'caution' ? toWp.statusMessage : fromWp.statusMessage;
      }

      segments.push({
        fromName: fromWp.name,
        toName: toWp.name,
        status: segStatus,
        summary,
        distanceKm: toWp.distanceFromStartKm - fromWp.distanceFromStartKm,
        durationMinutes: toWp.travelMinutesFromStart - fromWp.travelMinutesFromStart,
      });
    }

    // 9. Overall route status
    const hasAlert = sampledWaypoints.some((w) => w.status === 'alert');
    const hasCaution = sampledWaypoints.some((w) => w.status === 'caution');
    const disturbanceCount = sampledWaypoints.filter((w) => w.status !== 'clear').length;

    let routeStatus: 'ROUTE_CLEAR' | 'WEATHER_CAUTION' | 'WEATHER_ALERT' = 'ROUTE_CLEAR';
    let statusText = 'ROUTE CLEAR';
    let statusDescription = 'No major weather disturbances detected along your route.';

    if (hasAlert) {
      routeStatus = 'WEATHER_ALERT';
      statusText = 'WEATHER ALERT';
      statusDescription = 'Significant weather conditions detected along your route.';
    } else if (hasCaution) {
      routeStatus = 'WEATHER_CAUTION';
      statusText = 'WEATHER CAUTION';
      statusDescription = 'Weather disturbances detected along parts of your route.';
    }

    const highestRain = Math.max(...sampledWaypoints.map((w) => w.rainProbability));
    const highestPrecip = Math.max(...sampledWaypoints.map((w) => w.precipitation));
    const maxWind = Math.max(...sampledWaypoints.map((w) => w.windSpeed));

    processedRoutes.push({
      id: `route-${rIdx}`,
      name: routeName,
      description: r.description || `Via Highway ${rIdx + 1}`,
      isAlternative,
      distanceKm,
      durationMinutes,
      durationFormatted,
      status: routeStatus,
      statusText,
      statusDescription,
      encodedPolyline: encodedPoly,
      path,
      waypoints: sampledWaypoints,
      segments,
      disturbanceCount,
      highestRainProbability: highestRain,
      highestPrecipitation: highestPrecip,
      maxWindSpeed: maxWind,
    });
  }

  // 10. Selected route is route 0 by default
  const primaryRoute = processedRoutes[0];
  const overallStatus = primaryRoute.status;

  // 11. Comparison with alternative if present
  let alternativeComparison: string | undefined = undefined;
  if (processedRoutes.length > 1) {
    const altRoute = processedRoutes[1];
    const timeDiffMin = altRoute.durationMinutes - primaryRoute.durationMinutes;
    const timeDiffText =
      timeDiffMin > 0 ? `${timeDiffMin} minutes longer` : `${Math.abs(timeDiffMin)} minutes faster`;

    if (primaryRoute.disturbanceCount > altRoute.disturbanceCount) {
      alternativeComparison = `Alternative route has fewer detected weather disturbances (${altRoute.disturbanceCount} vs ${primaryRoute.disturbanceCount}), but may take ${timeDiffText}.`;
    } else if (primaryRoute.disturbanceCount < altRoute.disturbanceCount) {
      alternativeComparison = `Recommended route has fewer detected weather disturbances than alternative route (${primaryRoute.disturbanceCount} vs ${altRoute.disturbanceCount}), and is ${timeDiffText}.`;
    } else {
      alternativeComparison = `Both routes exhibit similar weather conditions. Alternative route is ${timeDiffText}.`;
    }
  }

  // 12. Generate AI Weather-Based Recommendation
  const aiRecommendation = await generateAiRouteRecommendation(
    originName,
    destName,
    primaryRoute,
    processedRoutes[1],
    language
  );

  return {
    origin: {
      name: originName,
      latitude: originLat,
      longitude: originLon,
    },
    destination: {
      name: destName,
      latitude: destLat,
      longitude: destLon,
    },
    departureTime: departureDate.toISOString(),
    selectedRouteIndex: 0,
    routes: processedRoutes,
    overallStatus,
    aiRecommendation,
    alternativeComparison,
    source: 'Google Maps Routes API + Open-Meteo Verified Forecasts',
    updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

async function generateAiRouteRecommendation(
  origin: string,
  destination: string,
  primaryRoute: RouteOption,
  alternativeRoute?: RouteOption,
  language: string = 'en'
): Promise<string> {
  const lang = (language || 'en').toLowerCase();
  const geminiKey = process.env.GEMINI_API_KEY;

  const disturbedWaypoints = primaryRoute.waypoints.filter((w) => w.status !== 'clear');
  const disturbanceSummary = disturbedWaypoints
    .map(
      (w) =>
        `- ${w.name} (around ${w.arrivalHourFormatted}): ${w.statusMessage}, Rain ${w.rainProbability}%, ${w.temperature}°C`
    )
    .join('\n');

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `You are WeatherGPT's Route Intelligence engine. Analyze this route travel weather and produce a 2-3 sentence practical travel recommendation for a traveler going from ${origin} to ${destination}.

Language: Write in ${lang === 'hi' ? 'Hindi (हिन्दी)' : lang === 'ta' ? 'Tamil (தமிழ்)' : lang === 'te' ? 'Telugu (తెలుగు)' : lang === 'ml' ? 'Malayalam (മലയാളം)' : 'English'}.

Route meteorological summary:
- Distance: ${primaryRoute.distanceKm} km, Duration: ${primaryRoute.durationFormatted}
- Overall Status: ${primaryRoute.status}
- Detected weather disturbances along route:
${disturbanceSummary || 'None (all sampled points have clear/normal conditions)'}
${
  alternativeRoute
    ? `- Alternative Route has ${alternativeRoute.disturbanceCount} disturbances and takes ${alternativeRoute.durationFormatted}.`
    : ''
}

CRITICAL RULES:
1. Never give absolute safety guarantees (do NOT say "it is completely safe" or "guaranteed safe"). Instead use "no major weather disturbances detected" or "favorable travel conditions".
2. If rain or storm is detected, mention the specific location and arrival timeframe.
3. If an alternative route exists with fewer disturbances, mention it objectively (e.g., "Alternative route has fewer disturbances but takes X minutes longer. Let user decide.").
4. Keep it under 55 words, professional, concise.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.2,
        },
      });

      const reply = response.text?.trim();
      if (reply) return reply;
    } catch (err) {
      console.warn('Gemini route recommendation fallback triggered:', err);
    }
  }

  // Deterministic Fallback Synthesis
  if (primaryRoute.status === 'ROUTE_CLEAR') {
    if (lang === 'hi') {
      return `आपकी चुनी हुई यात्रा अवधि के लिए ${origin} से ${destination} के मार्ग में कोई बड़ा मौसम व्यवधान नहीं देखा गया है। आप मौसम के नियमित अपडेट पर नजर रखते हुए यात्रा जारी रख सकते हैं।`;
    }
    if (lang === 'ta') {
      return `${origin} முதல் ${destination} வரையிலான பயணப் பாதையில் பெரிய வானிலை மாற்றங்கள் எதுவும் இல்லை. நீங்கள் வானிலை எச்சரிக்கைகளைக் கண்காணித்தவாறு பயணத்தைத் தொடரலாம்.`;
    }
    if (lang === 'te') {
      return `${origin} నుండి ${destination} మార్గంలో ఎటువంటి ముఖ్యమైన వాతావరణ సమస్యలు లేవు. మీరు వాతావరణ అప్‌డేట్‌లను గమనిస్తూ ప్రయాణించవచ్చు.`;
    }
    if (lang === 'ml') {
      return `${origin} മുതൽ ${destination} വരെയുള്ള യാത്രാപാതയിൽ പ്രതികൂല കാലാവസ്ഥാ മുന്നറിയിപ്പുകളൊന്നുമില്ല. സുരക്ഷിതമായി യാത്ര തുടരാം.`;
    }
    return `Your selected route has no major weather disturbances detected for the expected travel period. You can proceed while continuing to monitor weather updates.`;
  }

  const worstWp = disturbedWaypoints[0] || primaryRoute.waypoints[1] || primaryRoute.waypoints[0];
  const wpName = worstWp.name;
  const wpTime = worstWp.arrivalHourFormatted;

  if (lang === 'hi') {
    return `${wpName} के आसपास अनुमानित आगमन समय (${wpTime}) पर ${worstWp.statusMessage} की संभावना है। यदि संभव हो तो वैकल्पिक मार्ग पर विचार करें अथवा अतिरिक्त सावधानी बरतें।`;
  }
  if (lang === 'ta') {
    return `உங்கள் வருகை நேரமான ${wpTime} மணியளவில் ${wpName} அருகே ${worstWp.statusMessage} எதிர்பார்க்கப்படுகிறது. மாற்றுப் பாதையை பரிசீலிக்கவும் அல்லது எச்சரிக்கையுடன் செல்லவும்.`;
  }
  if (lang === 'te') {
    return `మీరు చేరుకునే సమయానికి (${wpTime}) ${wpName} వద్ద ${worstWp.statusMessage} అవకాశం ఉంది. ప్రత్యామ్నాయ మార్గాన్ని పరిశీలించండి లేదా తగిన జాగ్రత్తలు తీసుకోండి.`;
  }
  if (lang === 'ml') {
    return `നിങ്ങൾ എത്തുന്ന സമയത്ത് (${wpTime}) ${wpName} പ്രദേശത്ത് ${worstWp.statusMessage} ഉണ്ടാകാൻ സാധ്യതയുണ്ട്. ജാഗ്രത പാലിക്കുക.`;
  }
  return `${worstWp.statusMessage} is expected near ${wpName} around your estimated arrival time (${wpTime}). Consider an alternative route or exercising additional caution.`;
}
