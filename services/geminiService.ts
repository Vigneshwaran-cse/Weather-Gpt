/**
 * Gemini AI Service for WeatherGPT
 * Uses Google Gemini (@google/genai) for intent extraction and natural language weather decision-support.
 * Strictly adheres to verified data grounding: never hallucinate or invent weather data; all answers ground strictly in Open-Meteo verified metrics.
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { VerifiedWeatherData, WeatherAlert, HourlyForecast, DailyForecast } from './weatherService.ts';

export interface ConversationTurn {
  sender: 'user' | 'assistant';
  text: string;
}

export interface IntentExtractionResult {
  detectedLocation: string | null;
  timeframe: 'current' | 'today' | 'tomorrow' | 'specific_day' | 'weekly' | 'general';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'all_day' | 'specific_hours';
  specificHours?: string;
  specificDayName?: string;
  focusMetric: 'rain' | 'temperature' | 'wind' | 'clothing' | 'umbrella' | 'outdoor' | 'travel' | 'alerts' | 'event' | 'general';
  confidence: number;
  intentType: 'outdoor_activity' | 'travel_route' | 'weather_forecast' | 'umbrella_clothing' | 'event_planning' | 'contextual_followup' | 'current_observation';
  activity?: string;
  isTravelQuery?: boolean;
  originLocation?: string;
  destinationLocation?: string;
  isContextualFollowup?: boolean;
  isDeviceLocationQuery?: boolean;
  querySummary?: string;
}

export interface WindowMetrics {
  timeLabel: string;
  targetDate: string;
  condition: string;
  tempMin: number;
  tempMax: number;
  feelsLikeAvg: number;
  peakRainProbability: number;
  peakRainHours: string;
  totalPrecipitationMm: number;
  maxWindSpeed: number;
  humidityAvg: number;
  visibilityMin?: number;
  uvIndexMax?: number;
  hasThunder: boolean;
  hasHeavyRain: boolean;
  isHighHeat: boolean;
  activeAlerts: WeatherAlert[];
}

const SYSTEM_INSTRUCTION = `You are WeatherGPT, an intelligent weather decision-support assistant.
Your core mission is to help people make informed decisions about their plans, travel, outdoor activities, clothing, and safety based strictly on verified meteorological data.

DO NOT simply return raw numbers or act like a meteorological data dump.
DO NOT fabricate, guess, or invent any weather data.

You follow a strict 10-point internal decision-support pipeline:

1. UNDERSTAND THE QUERY
- Accurately grasp what the user is asking:
  * Rain / Umbrella intent ("Will I need an umbrella?", "Will it rain tomorrow?")
  * Travel & Commute intent ("Can I travel to Chennai tomorrow evening?", "Is it safe to drive?")
  * Outdoor sports & activities ("Can I play football tomorrow evening?", "Going for a run")
  * Outdoor event planning ("Will my outdoor wedding/party be affected?")
  * Clothing / Temperature / Wind / Heat ("What should I wear?", "Is it too hot?")
- Respect the requested location and specific time window (e.g. "tomorrow evening", "between 5–8 PM", "this afternoon", "on Saturday").

2. GET RELEVANT WEATHER DATA (SOURCE OF TRUTH)
- Ground every single statement strictly in the provided verified Open-Meteo meteorological metrics.
- Never invent numbers or make up forecasts.
- If data is unavailable or uncertain, state so honestly.

3. CONTEXTUAL ANALYSIS (DECISION SUPPORT)
- Don't just repeat numbers like "Temperature: 29°C. Rain probability: 70%."
- Interpret what the weather means for the user's specific question:
  * User: "Can I travel to Chennai tomorrow evening?"
  * Good: "Travel is possible, but rain is likely tomorrow evening in Chennai. The highest chance of rainfall is between 5–8 PM, so consider leaving earlier and carrying rain protection."

4. PROVIDE ACTIONABLE INFORMATION
When appropriate, address:
- What is likely to happen?
- How severe is it?
- When will it happen (specific time window)?
- What does it mean for the user?
- What should the user consider doing (timing adjustments, umbrella, footwear, rain gear, hydration)?

5. SEVERE WEATHER PRIORITY
If an official severe-weather warning exists in the active alerts:
- Prioritize the official warning at the very top.
- Clearly display the severity (Warning / Severe / Advisory).
- Explain what it means in simple everyday language.
- Give appropriate safety-oriented guidance (stay indoors, avoid open fields, delay travel).
- Identify the official source (Open-Meteo Meteorological Model).
- Do NOT downgrade or contradict an official warning.

6. COMMUNICATE UNCERTAINTY HONESTLY
- Weather forecasts are predictions, not guarantees.
- Communicate precipitation probabilities and limitations naturally (e.g. "with a 70% chance of rain", "only a slight 20% possibility"). Never present uncertain forecasts as absolute certainties.

7. CONVERSATIONAL BEHAVIOR & CONTEXT MEMORY
- Remember the ongoing conversation context. If the user asks a follow-up like "What about in the evening?", understand that it refers to the previously discussed location and timeframe (e.g. tomorrow in Chennai) without asking them to repeat.

8. NATURAL & SIMPLE LANGUAGE
- Speak naturally, warmly, and clearly like a knowledgeable human advisor.
- First sentence MUST directly answer the user's specific question.
- Do NOT dump large tables or bullet lists of numbers unless the user explicitly requested detailed data.
- Translate wind, rain, and heat into everyday meaning.

9. REMOVE TECHNICAL / DEBUG JARGON
- Do not output telemetry, system steps, or internal debug markers in conversational answers.

10. NWP MODEL PROVENANCE & TRANSPARENCY
- Weather data is retrieved from Open-Meteo, which computes forecasts using Numerical Weather Prediction (NWP) models (specifically ECMWF IFS and NOAA GFS operational models).
- If the user asks where the forecast comes from, which model is used, or about forecast accuracy, truthfully identify the data source (Open-Meteo) and NWP models (ECMWF IFS / NOAA GFS).
- Never claim that we run direct in-house supercomputer simulations (like raw WRF/GFS runs) unless retrieved via the verified Open-Meteo model API.
- Always communicate forecast uncertainty honestly.

11. NATIVE LANGUAGE FIDELITY
- Respond in authentic native script for Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), Marathi (मराठी), or English.`;

export function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिन्दी) in authentic Devanagari script',
  ta: 'Tamil (தமிழ்) in authentic Tamil script',
  te: 'Telugu (తెలుగు) in authentic Telugu script',
  ml: 'Malayalam (മലയാളം) in authentic Malayalam script',
  kn: 'Kannada (ಕನ್ನಡ) in authentic Kannada script',
  mr: 'Marathi (मराठी) in authentic Marathi script',
};

/**
 * Step 1: Extract location, time window, and intent from user query using Gemini
 */
export async function extractIntentAndLocation(
  userQuery: string,
  fallbackLocation: string,
  contextLocation?: string,
  contextActivity?: string,
  contextTimeframe?: string,
  contextTimeOfDay?: string,
  history?: ConversationTurn[]
): Promise<IntentExtractionResult> {
  const ai = getAiClient();
  if (!ai) {
    return fallbackIntentExtraction(
      userQuery,
      fallbackLocation,
      contextLocation,
      contextActivity,
      contextTimeframe,
      contextTimeOfDay
    );
  }

  try {
    const historyText =
      history && history.length > 0
        ? history
            .slice(-4)
            .map((h) => `${h.sender === 'user' ? 'User' : 'Assistant'}: "${h.text.slice(0, 150)}"`)
            .join('\n')
        : 'None';

    const prompt = `Analyze this weather question from a user: "${userQuery}".
Currently active selected location: "${fallbackLocation}".
Previous conversation location: "${contextLocation || 'none'}".
Previous conversation timeframe: "${contextTimeframe || 'none'}".
Previous conversation time of day: "${contextTimeOfDay || 'none'}".
Previous conversation activity: "${contextActivity || 'none'}".

Recent Conversation Turns:
${historyText}

CONVERSATIONAL CONTEXT RULES:
- If user asks a follow-up like "What about in the evening?", "How about tomorrow?", "And there?", they are continuing the previous topic.
  * For "What about in the evening?", set detectedLocation to "${contextLocation || fallbackLocation}", timeframe to "${contextTimeframe || 'today'}", and timeOfDay to "evening".
  * For "What about tomorrow?", set detectedLocation to "${contextLocation || fallbackLocation}", timeframe to "tomorrow".
- If user mentions travel ("travel to Chennai tomorrow evening", "can I drive to Kochi"), set isTravelQuery to true, extract destinationLocation, timeframe, and timeOfDay.

Extract the following JSON fields:
1. "detectedLocation": Explicit place name mentioned (e.g. "Chennai", "Manakunnam, Kochi", "Bangalore"). If user refers to "there" or asks a time follow-up without specifying a new location, set detectedLocation to "${contextLocation || ''}". If none, empty string.
2. "timeframe": "current" | "today" | "tomorrow" | "specific_day" | "weekly" | "general"
3. "timeOfDay": "morning" | "afternoon" | "evening" | "night" | "all_day" | "specific_hours"
4. "specificHours": e.g. "5–8 PM", "after 6 PM", or empty string
5. "specificDayName": Name of specific day if asked (e.g. "Monday", "Saturday", "weekend"), or empty string
6. "focusMetric": "rain" | "temperature" | "wind" | "clothing" | "umbrella" | "outdoor" | "travel" | "alerts" | "event" | "general"
7. "intentType": "outdoor_activity" | "travel_route" | "weather_forecast" | "umbrella_clothing" | "event_planning" | "contextual_followup" | "current_observation"
8. "activity": Any sport, travel, or event mentioned (e.g. "Travel", "Football", "Cricket", "Running", "Picnic", "Outdoor event"), or empty string
9. "isTravelQuery": Boolean, true if user asks about travel, driving, commuting, road trip, flying
10. "originLocation": Starting place if route mentioned, or empty string
11. "destinationLocation": Destination place if traveling, or empty string
12. "isContextualFollowup": Boolean, true if user refers to previous context ("there", "in the evening", "what about tomorrow")
13. "isDeviceLocationQuery": Boolean, true if user asks "near me", "my location", "here"`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLocation: {
              type: Type.STRING,
              description: 'City, town, village, or place name if mentioned, or empty string.',
            },
            timeframe: {
              type: Type.STRING,
              description: 'Timeframe: current, today, tomorrow, specific_day, weekly, general',
            },
            timeOfDay: {
              type: Type.STRING,
              description: 'Time of day: morning, afternoon, evening, night, all_day, specific_hours',
            },
            specificHours: {
              type: Type.STRING,
              description: 'Specific hours mentioned like 5-8 PM, or empty string',
            },
            specificDayName: {
              type: Type.STRING,
              description: 'Name of day if requested, e.g. Saturday, or empty string',
            },
            focusMetric: {
              type: Type.STRING,
              description: 'rain, temperature, wind, clothing, umbrella, outdoor, travel, alerts, event, general',
            },
            intentType: {
              type: Type.STRING,
              description: 'outdoor_activity, travel_route, weather_forecast, umbrella_clothing, event_planning, contextual_followup, current_observation',
            },
            activity: {
              type: Type.STRING,
              description: 'Activity name like Football, Cricket, Travel, Running, or empty string',
            },
            isTravelQuery: {
              type: Type.BOOLEAN,
              description: 'True if user asks about travel, driving, or route feasibility',
            },
            originLocation: {
              type: Type.STRING,
              description: 'Starting location if mentioned',
            },
            destinationLocation: {
              type: Type.STRING,
              description: 'Destination city if mentioned',
            },
            isContextualFollowup: {
              type: Type.BOOLEAN,
              description: 'True if user asks relative follow-up',
            },
            isDeviceLocationQuery: {
              type: Type.BOOLEAN,
              description: 'True if user asks for near me or my location',
            },
          },
          required: ['timeframe', 'focusMetric'],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const rawLoc = parsed.detectedLocation && parsed.detectedLocation.trim() !== '' ? parsed.detectedLocation.trim() : null;
    const isContextual =
      Boolean(parsed.isContextualFollowup) ||
      /\b(?:there|that place|that city|in the evening|in the morning|tomorrow evening|what about|how about)\b/i.test(userQuery);

    const resolvedLoc = rawLoc || (isContextual && contextLocation ? contextLocation : null);

    const detectedActivity =
      parsed.activity && parsed.activity.trim() !== ''
        ? parsed.activity.trim()
        : isContextual && contextActivity
        ? contextActivity
        : undefined;

    return {
      detectedLocation: resolvedLoc,
      timeframe: (parsed.timeframe as any) || (isContextual && contextTimeframe ? (contextTimeframe as any) : 'today'),
      timeOfDay: (parsed.timeOfDay as any) || (isContextual && contextTimeOfDay ? (contextTimeOfDay as any) : undefined),
      specificHours: parsed.specificHours || undefined,
      specificDayName: parsed.specificDayName || undefined,
      focusMetric: (parsed.focusMetric as any) || (detectedActivity ? 'outdoor' : 'general'),
      confidence: 0.95,
      intentType: (parsed.intentType as any) || (parsed.isTravelQuery ? 'travel_route' : detectedActivity ? 'outdoor_activity' : 'weather_forecast'),
      activity: detectedActivity,
      isTravelQuery: Boolean(parsed.isTravelQuery),
      originLocation: parsed.originLocation && parsed.originLocation.trim() !== '' ? parsed.originLocation.trim() : undefined,
      destinationLocation: parsed.destinationLocation && parsed.destinationLocation.trim() !== '' ? parsed.destinationLocation.trim() : undefined,
      isContextualFollowup: isContextual,
      isDeviceLocationQuery: Boolean(parsed.isDeviceLocationQuery),
    };
  } catch (err) {
    console.warn('Gemini intent extraction failed, using heuristic extraction:', err);
    return fallbackIntentExtraction(
      userQuery,
      fallbackLocation,
      contextLocation,
      contextActivity,
      contextTimeframe,
      contextTimeOfDay
    );
  }
}

/**
 * Deterministic fallback intent extraction
 */
export function fallbackIntentExtraction(
  query: string,
  fallbackLocation: string,
  contextLocation?: string,
  contextActivity?: string,
  contextTimeframe?: string,
  contextTimeOfDay?: string
): IntentExtractionResult {
  const lower = query.toLowerCase().trim();

  // 1. Detect activities
  const activityPatterns = [
    { name: 'Travel', regex: /\b(?:travel|traveling|travelling|trip|road trip|drive|driving|commute|fly|flight)\b/i },
    { name: 'Football', regex: /\b(?:football|soccer)\b/i },
    { name: 'Cricket', regex: /\bcricket\b/i },
    { name: 'Running', regex: /\b(?:running|jogging)\b/i },
    { name: 'Walking', regex: /\b(?:walking|walk)\b/i },
    { name: 'Tennis', regex: /\btennis\b/i },
    { name: 'Badminton', regex: /\bbadminton\b/i },
    { name: 'Cycling', regex: /\b(?:cycling|biking|ride a bike)\b/i },
    { name: 'Swimming', regex: /\bswimming\b/i },
    { name: 'Hiking', regex: /\b(?:hiking|trekking)\b/i },
    { name: 'Picnic', regex: /\bpicnic\b/i },
    { name: 'Outdoor event', regex: /\b(?:event|wedding|party|gathering|function|ceremony)\b/i },
    { name: 'Outdoor sports', regex: /\b(?:outdoor sports?|play outdoors?|play outside|outdoor game|play a match)\b/i },
  ];

  let detectedActivity: string | undefined = undefined;
  for (const act of activityPatterns) {
    if (act.regex.test(query)) {
      detectedActivity = act.name;
      break;
    }
  }

  // 2. Timeframe detection
  let timeframe: IntentExtractionResult['timeframe'] = 'current';
  if (lower.includes('tomorrow')) timeframe = 'tomorrow';
  else if (lower.includes('today') || lower.includes('tonight')) timeframe = 'today';
  else if (lower.includes('week') || lower.includes('7 day') || lower.includes('forecast')) timeframe = 'weekly';
  else if (lower.includes('now') || lower.includes('currently') || lower.includes('right now')) timeframe = 'current';
  else if (contextTimeframe && (lower.includes('evening') || lower.includes('morning') || lower.includes('afternoon') || lower.includes('night'))) {
    timeframe = contextTimeframe as any;
  } else {
    timeframe = 'today';
  }

  // 3. Time of day detection
  let timeOfDay: IntentExtractionResult['timeOfDay'] = undefined;
  let specificHours: string | undefined = undefined;

  if (/\b(?:evening|sunset|dusk)\b/i.test(query)) {
    timeOfDay = 'evening';
  } else if (/\b(?:morning|dawn|early morning|breakfast)\b/i.test(query)) {
    timeOfDay = 'morning';
  } else if (/\b(?:afternoon|noon|midday|lunchtime)\b/i.test(query)) {
    timeOfDay = 'afternoon';
  } else if (/\b(?:night|tonight|late night|bedtime)\b/i.test(query)) {
    timeOfDay = 'night';
  } else if (contextTimeOfDay && /\b(?:what about|how about|and)\b/i.test(query)) {
    timeOfDay = contextTimeOfDay as any;
  }

  const hoursMatch = query.match(/\b([0-9]{1,2})\s*[-–to]\s*([0-9]{1,2})\s*(?:pm|am)?\b/i);
  if (hoursMatch) {
    specificHours = `${hoursMatch[1]}–${hoursMatch[2]} PM`;
  }

  // 4. Travel detection
  const isTravelQuery = detectedActivity === 'Travel' || /\b(?:travel to|drive to|trip to|road trip to|flight to|going to)\b/i.test(query);

  // 5. Device location check
  const isDeviceLocationQuery = /\b(?:near me|my location|around me|where i am|here|nearby)\b/i.test(query);

  // 6. Contextual follow-up check
  const isContextualFollowup =
    /\b(?:there|that place|that city|in the evening|in the morning|in the afternoon|what about|how about|and the evening)\b/i.test(query);

  if (!detectedActivity && contextActivity && isContextualFollowup) {
    detectedActivity = contextActivity;
  }

  // 7. Explicit location extraction
  let detectedLocation: string | null = null;
  const stopWords = [
    'the', 'a', 'an', 'my', 'your', 'our', 'this', 'next', 'tomorrow', 'today', 'now',
    'me', 'here', 'there', 'that', 'football', 'cricket', 'soccer', 'sports', 'game',
    'play', 'match', 'running', 'morning', 'evening', 'night', 'afternoon', 'travel',
    'rain', 'raining', 'shower', 'showers', 'weather', 'temp', 'temperature', 'wind', 'storm'
  ];

  if (!isDeviceLocationQuery) {
    const travelToMatch = query.match(/\b(?:travel to|drive to|trip to|road trip to|flying to|flight to|going to)\s+([A-Za-z\u00C0-\u024F\s,–-]+?)(?:\s+(?:tomorrow|today|tonight|morning|evening|afternoon)|[?.!,\s]*$)/i);
    if (travelToMatch && travelToMatch[1]) {
      const cand = travelToMatch[1].trim();
      if (!['the', 'a', 'an', 'work', 'office', 'home', 'play'].includes(cand.toLowerCase())) {
        detectedLocation = cand;
      }
    }

    if (!detectedLocation) {
      const prepMatch = query.match(/\b(?:in|at|for|around|of)\s+([A-Za-z\u00C0-\u024F\s,–-]+?)(?:\s+(?:tomorrow|today|tonight|now|this|what|how|can|is|will|with|do|does|should)|[?.!,\s]*$)/i);
      if (prepMatch && prepMatch[1]) {
        let candidate = prepMatch[1].trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
        if (/\b(?:in|at)\s+/i.test(candidate)) {
          candidate = candidate.split(/\b(?:in|at)\s+/i).pop()!.trim().replace(/^[,.\s]+|[,.\s]+$/g, '');
        }
        if (!stopWords.includes(candidate.toLowerCase())) {
          detectedLocation = candidate;
        }
      }
    }

    if (isContextualFollowup && contextLocation && !detectedLocation) {
      detectedLocation = contextLocation;
    }
  }

  // 8. Focus metric
  let focus: IntentExtractionResult['focusMetric'] = 'general';
  if (isTravelQuery) focus = 'travel';
  else if (detectedActivity) focus = 'outdoor';
  else if (lower.includes('umbrella')) focus = 'umbrella';
  else if (lower.includes('rain') || lower.includes('shower')) focus = 'rain';
  else if (lower.includes('hot') || lower.includes('cold') || lower.includes('temp')) focus = 'temperature';
  else if (lower.includes('wind') || lower.includes('storm')) focus = 'wind';
  else if (lower.includes('wear') || lower.includes('cloth') || lower.includes('jacket')) focus = 'clothing';
  else if (lower.includes('alert') || lower.includes('warning')) focus = 'alerts';
  else if (lower.includes('event') || lower.includes('wedding') || lower.includes('party')) focus = 'event';

  // 9. Intent type
  let intentType: IntentExtractionResult['intentType'] = 'weather_forecast';
  if (isTravelQuery) intentType = 'travel_route';
  else if (detectedActivity) intentType = 'outdoor_activity';
  else if (focus === 'umbrella' || focus === 'clothing') intentType = 'umbrella_clothing';
  else if (focus === 'event') intentType = 'event_planning';
  else if (isContextualFollowup) intentType = 'contextual_followup';
  else if (timeframe === 'current') intentType = 'current_observation';

  return {
    detectedLocation,
    timeframe,
    timeOfDay,
    specificHours,
    focusMetric: focus,
    confidence: detectedLocation ? 0.9 : 0.7,
    intentType,
    activity: detectedActivity,
    isTravelQuery,
    isContextualFollowup,
    isDeviceLocationQuery,
  };
}

/**
 * Step 2: Slice and analyze verified weather data for the exact target time window
 */
export function analyzeWeatherForDecisionSupport(
  weather: VerifiedWeatherData,
  intent: IntentExtractionResult
): WindowMetrics {
  const isTomorrow = intent.timeframe === 'tomorrow';
  const targetDayIdx = isTomorrow && weather.daily.length > 1 ? 1 : 0;
  const targetDay: DailyForecast = weather.daily[targetDayIdx] || weather.daily[0];
  const targetDate = targetDay?.date || '';
  const dayLabel = isTomorrow ? 'Tomorrow' : 'Today';

  // Filter hourly data for the target date
  let candidateHours: HourlyForecast[] = [];
  if (targetDate) {
    candidateHours = weather.hourly.filter((h) => h.time.startsWith(targetDate));
  }
  if (candidateHours.length === 0) {
    if (isTomorrow && weather.hourly.length >= 24) {
      candidateHours = weather.hourly.slice(24, 48);
    } else {
      candidateHours = weather.hourly.slice(0, 24);
    }
  }

  // Filter for specific time of day
  let filteredHours = candidateHours;
  let timeLabel = dayLabel;

  if (intent.timeOfDay === 'morning') {
    filteredHours = candidateHours.filter((h) => (h.hourNumber ?? 0) >= 6 && (h.hourNumber ?? 0) < 12);
    timeLabel = `${dayLabel} Morning (6 AM – 12 PM)`;
  } else if (intent.timeOfDay === 'afternoon') {
    filteredHours = candidateHours.filter((h) => (h.hourNumber ?? 0) >= 12 && (h.hourNumber ?? 0) < 17);
    timeLabel = `${dayLabel} Afternoon (12 PM – 5 PM)`;
  } else if (intent.timeOfDay === 'evening') {
    filteredHours = candidateHours.filter((h) => (h.hourNumber ?? 0) >= 17 && (h.hourNumber ?? 0) < 22);
    timeLabel = `${dayLabel} Evening (5 PM – 9 PM)`;
  } else if (intent.timeOfDay === 'night') {
    filteredHours = candidateHours.filter((h) => (h.hourNumber ?? 0) >= 21 || (h.hourNumber ?? 0) < 6);
    timeLabel = `${dayLabel} Night`;
  } else if (intent.timeframe === 'current') {
    filteredHours = candidateHours.slice(0, 4);
    timeLabel = 'Right Now & Next Few Hours';
  }

  if (filteredHours.length === 0) {
    filteredHours = candidateHours;
  }

  // Compute metrics in the target window
  const temps = filteredHours.map((h) => h.temperature);
  const tempMin = Math.round(temps.length > 0 ? Math.min(...temps) : targetDay?.tempMin ?? weather.current.temperature);
  const tempMax = Math.round(temps.length > 0 ? Math.max(...temps) : targetDay?.tempMax ?? weather.current.temperature);

  const apparentTemps = filteredHours.map((h) => h.apparentTemperature);
  const feelsLikeAvg = Math.round(
    apparentTemps.length > 0
      ? apparentTemps.reduce((a, b) => a + b, 0) / apparentTemps.length
      : weather.current.feelsLike
  );

  const rainProbs = filteredHours.map((h) => h.rainProbability);
  const peakRainProbability =
    rainProbs.length > 0
      ? Math.max(...rainProbs)
      : isTomorrow
      ? targetDay?.rainProbabilityMax ?? 0
      : weather.current.rainProbability;

  // Identify peak rain timing window (e.g. "between 5–8 PM")
  let peakRainHours = '';
  if (peakRainProbability >= 35) {
    const highRainItems = filteredHours.filter((h) => h.rainProbability >= Math.max(35, peakRainProbability - 15));
    if (highRainItems.length > 0) {
      const firstHour = highRainItems[0].hourNumber ?? 17;
      const lastHour = (highRainItems[highRainItems.length - 1].hourNumber ?? 20) + 1;
      const formatH = (h: number) => {
        const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
        const num = h % 12 === 0 ? 12 : h % 12;
        return `${num} ${ampm}`;
      };
      if (firstHour === lastHour - 1) {
        peakRainHours = `around ${formatH(firstHour)}`;
      } else {
        const startNum = firstHour % 12 === 0 ? 12 : firstHour % 12;
        const endFormatted = formatH(lastHour);
        peakRainHours = `between ${startNum}–${endFormatted}`;
      }
    }
  }

  const precipAmounts = filteredHours.map((h) => h.precipitation);
  const totalPrecipitationMm =
    Math.round((precipAmounts.reduce((a, b) => a + b, 0) || targetDay?.precipitationSum || 0) * 10) / 10;

  const windSpeeds = filteredHours.map((h) => h.windSpeed);
  const maxWindSpeed = Math.round(
    windSpeeds.length > 0 ? Math.max(...windSpeeds) : weather.current.windSpeed
  );

  const humidities = filteredHours.map((h) => h.humidity);
  const humidityAvg = Math.round(
    humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : weather.current.humidity
  );

  const visibilities = filteredHours.map((h) => h.visibility).filter((v): v is number => typeof v === 'number');
  const visibilityMin = visibilities.length > 0 ? Math.min(...visibilities) : weather.current.visibility;

  // Dominant condition
  const conditions = filteredHours.map((h) => h.condition);
  const hasThunder = conditions.some((c) => /thunder|storm/i.test(c));
  const hasHeavyRain = conditions.some((c) => /heavy rain/i.test(c)) || totalPrecipitationMm >= 15;
  const isHighHeat = tempMax >= 36 || feelsLikeAvg >= 38;

  let condition = targetDay?.condition || weather.current.condition;
  if (hasThunder) condition = 'Thunderstorm';
  else if (hasHeavyRain) condition = 'Heavy Rain';
  else if (conditions.some((c) => /moderate rain/i.test(c))) condition = 'Moderate Rain';
  else if (conditions.some((c) => /light rain|drizzle/i.test(c))) condition = 'Light Rain';
  else if (conditions.length > 0) condition = conditions[Math.floor(conditions.length / 2)];

  const activeAlerts = (weather.alerts || []).filter((a) => {
    if (isTomorrow) {
      return !/today/i.test(a.validity) || /next 24 hours|next 48 hours|tomorrow/i.test(a.validity);
    }
    return true;
  });

  return {
    timeLabel,
    targetDate,
    condition,
    tempMin,
    tempMax,
    feelsLikeAvg,
    peakRainProbability,
    peakRainHours,
    totalPrecipitationMm,
    maxWindSpeed,
    humidityAvg,
    visibilityMin,
    hasThunder,
    hasHeavyRain,
    isHighHeat,
    activeAlerts,
  };
}

/**
 * Sanitizes any raw technical artifacts, debug lines, or data labels from conversational responses.
 */
export function sanitizeConversationalResponse(rawText: string): string {
  if (!rawText) return '';
  let cleaned = rawText;

  // Strip debug lines
  cleaned = cleaned.replace(/^[*\s]*(?:Source|Data source|Weather data source)[\s:*].*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*(?:Updated|Last updated|Retrieved at|Observed at)[\s:*].*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*(?:🛠️\s*)?(?:Grounding|Grounding status|Debug|Telemetry)[\s:*].*$/gim, '');

  // Strip raw metric bullet lists
  cleaned = cleaned.replace(/^[*\s]*[🌧️🌦️]*\s*(?:Rain probability|Precipitation probability|बारिश की संभावना|மழை வாய்ப்பு|వర్షం అవకాశం|മഴ സാധ്യത|ಮಳೆಯ ಸಾಧ್ಯತೆ|पावसाची शक्यता)[\s:*]+[0-9]+%[\s*]*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[💨🍃]*\s*(?:Wind|Wind speed|हवा|காற்று|గాలి|കാറ്റ്|ಗಾಳಿ|वारे)[\s:*]+[0-9.]+\s*(?:km\/h|kts|m\/s)[\s*]*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[🌤️☁️☀️]*\s*(?:Conditions|Condition|मौसम की स्थिति|வானிலை நிலை|పరిస్థితి|അവസ്ഥ|ಹವಾಮಾನ ಸ್ಥಿತಿ|हवामानाची स्थिती)[\s:*]+.*$/gim, '');
  cleaned = cleaned.replace(/^[*\s]*[🌡️]*\s*(?:Temperature|तापमान|வெப்பநிலை|ఉష్ణోగ్రత|താപനില|ತಾಪಮಾನ|तापमान)[\s:*]+[0-9.]+\s*°C\s*\([^)]*\)[\s*]*$/gim, '');

  // Strip inline "(Feels like XX°C)"
  cleaned = cleaned.replace(/\s*\([Ff]eels like\s+[0-9.]+°?C?\)/g, '');

  // Collapse consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

/**
 * Step 3: Ask Gemini to generate a warm, human decision-support response strictly grounded in verified data
 */
export async function generateWeatherExplanation(
  userQuery: string,
  weather: VerifiedWeatherData,
  intent: IntentExtractionResult,
  language: string = 'en',
  history?: ConversationTurn[],
  cropContext?: string,
  isFarmerMode?: boolean
): Promise<string> {
  const targetLang = LANGUAGE_NAMES[language] || 'English';
  const metrics = analyzeWeatherForDecisionSupport(weather, intent);

  const ai = getAiClient();
  if (!ai) {
    return generateDeterministicFallbackResponse(userQuery, weather, intent, language, metrics, cropContext, isFarmerMode);
  }

  try {
    const historyText =
      history && history.length > 0
        ? history
            .slice(-4)
            .map((h) => `${h.sender === 'user' ? 'User' : 'Assistant'}: "${h.text.slice(0, 150)}"`)
            .join('\n')
        : 'None';

    const alertsText =
      metrics.activeAlerts.length > 0
        ? metrics.activeAlerts.map((a) => `[${a.severity}] ${a.type}: ${a.description} (Source: ${a.source})`).join('; ')
        : 'None';

    const prompt = `User Question: "${userQuery}"

Verified Location: ${weather.location.name}${weather.location.state ? `, ${weather.location.state}` : ''}${weather.location.country ? `, ${weather.location.country}` : ''}
Data Source: ${weather.source || 'Open-Meteo'}
Forecast NWP Model: ${weather.forecastModel || 'ECMWF IFS / NOAA GFS (Open-Meteo Blend)'}
Model Calculation Time: ${weather.generationTimeMs !== undefined ? `${weather.generationTimeMs}ms` : 'Operational run'}
Terrain Elevation: ${weather.elevation !== undefined ? `${weather.elevation}m` : 'Surface level'}
Forecast Ingestion Timestamp: ${weather.updated}
Target Time Window: ${metrics.timeLabel}

Verified Meteorological Data (Source of Truth):
- Primary Condition: ${metrics.condition}
- Temperature: ${metrics.tempMin === metrics.tempMax ? `${metrics.tempMax}°C` : `${metrics.tempMin}°C to ${metrics.tempMax}°C`} (Feels like ~${metrics.feelsLikeAvg}°C)
- Current Soil Temperature (0-6cm): ${weather.current.soilTemperature !== undefined ? `${weather.current.soilTemperature}°C` : 'Data unavailable from weather model'}
- Rain Probability: Peak ${metrics.peakRainProbability}%${metrics.peakRainHours ? ` (Highest likelihood: ${metrics.peakRainHours})` : ''}
- Expected Precipitation: ${metrics.totalPrecipitationMm} mm
- Wind: Max ${metrics.maxWindSpeed} km/h (Current: ${weather.current.windSpeed} km/h)
- Humidity: ~${metrics.humidityAvg}%
- Visibility: ${metrics.visibilityMin !== undefined ? `${metrics.visibilityMin} km` : 'Good'}
- Active Severe Alerts: ${alertsText}

User Query Context:
- Focus: ${intent.focusMetric} (${intent.intentType})
- Activity: ${intent.activity || 'None mentioned'}
- Travel query: ${intent.isTravelQuery ? 'YES (evaluating travel safety / driving conditions)' : 'NO'}
- Farmer Mode Active: ${isFarmerMode ? 'YES' : 'NO'}
- Farm Crop Selection: ${cropContext || 'General Crops'}
- Target language: ${targetLang}
- Recent Conversation:
${historyText}

YOUR TASK (Weather Decision-Support Assistant):
Write a warm, natural, human conversational answer in ${targetLang} (authentic native script).
Follow the 10-step decision-support principles:
1. FIRST SENTENCE: Direct, clear answer to the user's specific question.
   - For travel (e.g. "Can I travel to Chennai tomorrow evening?"): State feasibility immediately, e.g.: "Travel is possible, but rain is likely tomorrow evening in Chennai."
   - For umbrella (e.g. "Should I carry an umbrella?"): Direct answer e.g.: "Yes, carrying an umbrella would be wise..."
   - For sports/outdoor (e.g. "Can I play football tomorrow evening?"): Direct answer e.g.: "Playing football tomorrow evening is possible, but rain is likely..."

   SPECIAL AGRICULTURAL RULES IF FARMER MODE IS ACTIVE:
   - Always speak directly to the farmer about their selected location (${weather.location.name}) and selected crop (${cropContext || 'crop'}). Never force the farmer to repeat their crop or location.
   - Question: "Will it rain today/tomorrow?": Check actual forecast. Tell whether rain is expected, approximate time window (e.g., "${metrics.peakRainHours || metrics.timeLabel}"), exact probability (${metrics.peakRainProbability}%), and explain simply.
   - Question: "Should I water my crops today?" / Irrigation: Consider upcoming rainfall, probability, expected precipitation amount (${metrics.totalPrecipitationMm} mm), temperature, and selected crop. If rain is expected (e.g., >50% and several mm), recommend holding off on irrigation (e.g., "Rain is likely tomorrow and around 12 mm of rainfall is expected, so you may not need to irrigate today"). Clearly distinguish weather-based guidance from professional agricultural advice.
   - Question: "Can I spray pesticides/fertilizer today?": Check rain probability, rainfall timing, and wind speed (${weather.current.windSpeed} km/h). If rain is expected soon, explain that rain can wash away the spray. If wind is strong (>15-20 km/h), warn of wind drift and reduced efficacy. Give simple recommendation ("Conditions are not ideal for spraying today because rain is expected within the next few hours" OR "Weather conditions appear more suitable for spraying right now, but check the product label and local agricultural guidance before applying"). Never claim a specific pesticide is safe or unsafe.

2. DECISION SUPPORT & CONTEXTUAL MEANING:
   - Interpret what the weather means for their plan.
   - Specify the exact timing window (e.g., "${metrics.peakRainHours || metrics.timeLabel} with a ${metrics.peakRainProbability}% probability of rain").
   - Address practical impacts (e.g., wet roads, visibility, wet grounds, heat, wind, field drainage).
3. ACTIONABLE GUIDANCE:
   - Provide concrete, practical recommendations (e.g., "consider leaving earlier and carrying rain protection", "stay hydrated", "wear footwear with good grip", "irrigate in the early morning").
4. SEVERE WEATHER:
   - If severe alerts are active, state the official warning, severity, source, and safety advice upfront.
5. COMMUNICATE UNCERTAINTY:
   - State probabilities naturally without presenting forecasts as guaranteed 100% facts.
6. NO RAW DATA TABLES:
   - Do NOT dump raw metric tables ("Temperature: 29°C, Humidity: 82%"). Embed numbers naturally into flowing sentences.`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return generateDeterministicFallbackResponse(userQuery, weather, intent, language, metrics, cropContext, isFarmerMode);
    }

    return sanitizeConversationalResponse(reply);
  } catch (error) {
    console.error('Gemini explanation generation error:', error);
    return generateDeterministicFallbackResponse(userQuery, weather, intent, language, metrics, cropContext, isFarmerMode);
  }
}

/**
 * Natural language deterministic decision-support generator
 */
export function generateDeterministicFallbackResponse(
  _userQuery: string,
  weather: VerifiedWeatherData,
  intent: IntentExtractionResult,
  language: string = 'en',
  precomputedMetrics?: WindowMetrics,
  cropContext?: string,
  isFarmerMode?: boolean
): string {
  const metrics = precomputedMetrics || analyzeWeatherForDecisionSupport(weather, intent);
  const locName = weather.location.name;
  const lang = (language || 'en').toLowerCase();
  const timeDesc = metrics.timeLabel.toLowerCase();
  const rainProb = metrics.peakRainProbability;
  const rainHours = metrics.peakRainHours;
  const temp = metrics.tempMax;
  const feelsLike = metrics.feelsLikeAvg;
  const isTravel = Boolean(intent.isTravelQuery);
  const isActivity = Boolean(intent.activity || intent.intentType === 'outdoor_activity');
  const activityName = intent.activity || (isTravel ? 'Travel' : 'outdoor activities');
  const isUmbrella = intent.focusMetric === 'umbrella' || /umbrella/i.test(_userQuery);
  const isSourceQuery = /\b(?:model|data source|forecast model|nwp|gfs|ecmwf|wrf|where.*(?:forecast|data)|how.*weather.*calculated)\b/i.test(_userQuery);
  const isGreetingOrIntro = /\b(?:introduce|who are you|what are you|what can you do|about you|hello|hi\b|hey\b|vanakkam|namaste|greetings)\b/i.test(_userQuery);

  // 0. Handle greetings & self-introductions
  if (isGreetingOrIntro) {
    if (lang === 'ta') {
      return `👋 வணக்கம்! நான் WeatherGPT, உங்கள் நிகழ்நேர வானிலை முடிவெடுக்கும் AI உதவியாளர். ${locName} பகுதிக்கான தற்போதைய வானிலை ${weather.current.temperature}°C, ${weather.current.condition} மற்றும் ${weather.current.rainProbability}% மழை வாய்ப்பு உள்ளது. மழை, பயணப் பாதைகள், விவசாயம் அல்லது வெளிப்புறத் திட்டங்கள் குறித்த உங்கள் கேள்விகளைக் கேட்கலாம்.`;
    }
    if (lang === 'hi') {
      return `👋 नमस्ते! मैं WeatherGPT हूँ, आपका मौसम निर्णय-समर्थन AI सहायक। ${locName} में वर्तमान तापमान ${weather.current.temperature}°C (${weather.current.condition}) और बारिश की संभावना ${weather.current.rainProbability}% है। आप मुझसे बारिश, यात्रा, खेती या आउटडोर योजनाओं के बारे में कोई भी प्रश्न पूछ सकते हैं।`;
    }
    return `👋 Hello! I am WeatherGPT, your conversational weather decision-support assistant. Currently in ${locName}, it is ${weather.current.temperature}°C with ${weather.current.condition.toLowerCase()} and a ${weather.current.rainProbability}% chance of rain. You can ask me about upcoming rainfall, travel feasibility, farming guidance, or severe weather conditions. How can I help you today?`;
  }

  // 0.5. Handle questions about the weather data source / forecast model
  if (isSourceQuery) {
    const modelName = weather.forecastModel || 'ECMWF IFS / NOAA GFS (Open-Meteo Blend)';
    if (lang === 'hi') {
      return `📊 यह मौसम पूर्वानुमान Open-Meteo मौसम विज्ञान सेवा से प्राप्त किया गया है, जो संख्यात्मक मौसम भविष्यवाणी (NWP) मॉडल जैसे ECMWF IFS (0.25°) और NOAA GFS का उपयोग करता है।\n\n- डेटा स्रोत: Open-Meteo API\n- पूर्वानुमान मॉडल: ${modelName}\n- अंतिम अपडेट: ${weather.updated}`;
    }
    if (lang === 'ta') {
      return `📊 இந்த வானிலை முன்னறிவிப்பு Open-Meteo வானிலை சேவையிலிருந்து பெறப்பட்டது, இது ECMWF IFS மற்றும் NOAA GFS போன்ற எண் கணித வானிலை முன்னறிவிப்பு (NWP) மாதிரிகளைப் பயன்படுத்துகிறது.\n\n- தரவு ஆதாரம்: Open-Meteo\n- மாதிரி: ${modelName}\n- புதுப்பிக்கப்பட்டது: ${weather.updated}`;
    }
    return `📊 This forecast is generated using verified Numerical Weather Prediction (NWP) model data retrieved from Open-Meteo, which ingests and computes operational forecasts from ECMWF IFS (European Centre for Medium-Range Weather Forecasts) and NOAA GFS (Global Forecast System).\n\n- Data Source: Open-Meteo Weather API\n- Forecast Model: ${modelName}\n- Grid Elevation: ${weather.elevation ? `${weather.elevation}m` : 'Surface level'}\n- Ingestion Time: ${weather.generationTimeMs ? `${weather.generationTimeMs}ms` : 'Operational run'}\n- Last Updated: ${weather.updated}`;
  }

  // 1. Check severe alerts (only when explicitly asked or if severe storm/cyclone risk is active)
  const isAlertQuery = intent.focusMetric === 'alerts' || /\b(?:alert|warning|threat|danger|cyclone|flood|storm)\b/i.test(_userQuery);
  const hasSevereAlert = metrics.activeAlerts.some((a) => a.severity === 'Severe');
  if ((isAlertQuery || hasSevereAlert) && metrics.activeAlerts.length > 0) {
    const alert = metrics.activeAlerts[0];
    if (lang === 'hi') {
      return `⚠️ आधिकारिक चेतावनी: ${locName} के लिए ${alert.type} (${alert.severity}) जारी की गई है।\n\n${alert.description}\n\nसुरक्षा सलाह: अनावश्यक यात्रा से बचें, खुले मैदानों से दूर रहें और मौसम सामान्य होने तक सुरक्षित स्थान पर रहें। (स्रोत: ${alert.source})`;
    }
    if (lang === 'ta') {
      return `⚠️ அதிகாரப்பூர்வ எச்சரிக்கை: ${locName} பகுதிக்கு ${alert.type} (${alert.severity}) விடுக்கப்பட்டுள்ளது.\n\n${alert.description}\n\nபாதுகாப்பு வழிகாட்டல்: தேவையின்றி வெளியில் செல்வதைத் தவிர்க்கவும், பாதுகாப்பான இடங்களில் இருக்கவும். (ஆதாரம்: ${alert.source})`;
    }
    return `⚠️ Official Weather Alert: ${alert.type} (${alert.severity}) issued for ${locName}.\n\n${alert.description}\n\nSafety guidance: It is strongly recommended to stay indoors, avoid non-essential travel, and take shelter in sturdy structures. (Source: ${alert.source})`;
  }

  // 1.5 Agricultural / Farmer Mode Specific Queries
  const isRainQuestion = /\b(?:rain|raining|rainfall|barish|varsham|mazhai|precipitation)\b/i.test(_userQuery);
  const isWaterQuestion = /\b(?:water|irrigate|irrigation|paani|thanni|neellu)\b/i.test(_userQuery);
  const isSprayQuestion = /\b(?:spray|spraying|pesticide|fertilizer|chemical|dawa|marundhu|mandhu)\b/i.test(_userQuery);

  if (isFarmerMode || isWaterQuestion || isSprayQuestion) {
    const crops = cropContext || 'crops';

    // Farmer Question 2: "Should I water my crops today?"
    if (isWaterQuestion) {
      if (rainProb >= 60 || metrics.totalPrecipitationMm >= 8) {
        return `🌧️ Rain is likely ${timeDesc} in ${locName} with around ${metrics.totalPrecipitationMm || 'a notable amount of'} mm of rainfall expected (${rainProb}% chance)${rainHours ? `, particularly ${rainHours}` : ''}, so you may not need to irrigate your ${crops} today.\n\nNatural rainfall will replenish soil moisture. Re-check the field condition after the rainfall event before scheduling further irrigation. (Note: Weather-based guidance; adjust according to your specific soil drainage).`;
      }
      return `💧 Rain probability is low (${rainProb}%) ${timeDesc} in ${locName} with daytime temperatures reaching ${temp}°C. You can proceed with standard irrigation for your ${crops} based on your routine soil moisture schedule, preferably during early morning or evening hours to minimize evaporation losses.`;
    }

    // Farmer Question 3: "Can I spray pesticides/fertilizer today?"
    if (isSprayQuestion) {
      const windSpeed = weather.current.windSpeed;
      if (rainProb >= 50) {
        return `⚠️ Conditions are not ideal for spraying ${crops} today because rain is expected ${rainHours ? `${rainHours} ` : ''}with a ${rainProb}% likelihood. Rain can wash away freshly applied sprays and reduce their effectiveness.\n\nWe recommend waiting until drier weather conditions settle. Check the product label and local agricultural guidance before applying.`;
      }
      if (windSpeed >= 18) {
        return `💨 Conditions are not ideal for spraying ${crops} right now because wind speeds are elevated at ${Math.round(windSpeed)} km/h. High winds cause spray drift and uneven droplet coverage.\n\nConsider spraying during early morning when winds are typically calmest. Check product labels for maximum allowable wind thresholds.`;
      }
      return `🧪 Weather conditions appear suitable for spraying right now in ${locName}. Wind speeds are moderate at ${Math.round(windSpeed)} km/h and rain probability is low (${rainProb}%).\n\nCheck the product label and local agricultural guidance before applying, and wear appropriate protective gear.`;
    }

    // Farmer Question 1: "Will it rain today/tomorrow?"
    if (isRainQuestion) {
      if (rainProb >= 50) {
        return `🌧️ Rain is likely ${timeDesc} in ${locName}${rainHours ? ` ${rainHours}` : ''}, with a ${rainProb}% chance of precipitation. Approximately ${metrics.totalPrecipitationMm} mm of rainfall is expected. Plan your field and harvesting operations accordingly.`;
      }
      return `☀️ No significant rain is expected ${timeDesc} in ${locName} (rain chance is only ${rainProb}%). Skies are expected to remain predominantly dry with temperatures around ${temp}°C.`;
    }
  }

  // 2. Travel Decision-Support (User Example)
  if (isTravel) {
    if (lang === 'hi') {
      if (rainProb >= 50) {
        return `🚗 ${timeDesc} में ${locName} की यात्रा संभव है, लेकिन बारिश की काफी संभावना है।\n\nबारिश की सबसे अधिक संभावना ${rainHours || 'शाम के समय'} (लगभग ${rainProb}%) है, इसलिए समय से थोड़ा पहले निकलें और रेन प्रोटेक्शन या छाता साथ रखें। गीली सड़कों पर वाहन सावधानी से चलाएं।`;
      }
      return `🚗 ${timeDesc} में ${locName} की यात्रा के लिए मौसम अनुकूल है।\n\nबारिश की संभावना बहुत कम है और हवाएं भी सामान्य रहेंगी। तापमान लगभग ${temp}°C रहने का अनुमान है। सुरक्षित यात्रा करें!`;
    }
    if (lang === 'ta') {
      if (rainProb >= 50) {
        return `🚗 ${timeDesc} ${locName} பயணிக்க முடியும், ஆனால் மழை பெய்ய வாய்ப்புள்ளது.\n\nமழை பெய்வதற்கான அதிக வாய்ப்பு ${rainHours || 'நேரத்தில்'} (சுமார் ${rainProb}%) உள்ளது, எனவே முன்கூட்டியே புறப்படுவதோடு மழைக் கவசங்களையும் உடன் எடுத்துச் செல்லவும். சாலைகளில் கவனமாக வாகனம் ஓட்டவும்.`;
      }
      return `🚗 ${timeDesc} ${locName} பயணிக்க வானிலை சாதகமாக உள்ளது.\n\nமழைக்கு வாய்ப்பில்லை, சாலைப் போக்குவரத்து சீராக இருக்கும். வெப்பநிலை சுமார் ${temp}°C ஆக இருக்கும். பாதுகாப்பான பயணம் அமைய வாழ்த்துகள்!`;
    }
    // English Travel Decision
    if (rainProb >= 50) {
      return `🚗 Travel is possible, but rain is likely ${timeDesc} in ${locName}.\n\nThe highest chance of rainfall is ${rainHours || 'during the evening'} with a ${rainProb}% probability, so consider leaving earlier and carrying rain protection. Roads may be slippery, so maintain safe driving distances.`;
    }
    return `🚗 Weather conditions look favorable for traveling ${timeDesc} in ${locName}.\n\nRain is very unlikely, winds will remain moderate, and temperatures will be around ${temp}°C. Have a safe journey!`;
  }

  // 3. Umbrella Decision-Support
  if (isUmbrella) {
    if (lang === 'hi') {
      if (rainProb >= 50) {
        return `☂️ हाँ, ${timeDesc} में ${locName} में छाता साथ रखना समझदारी होगी।\n\nबारिश की संभावना लगभग ${rainProb}% है${rainHours ? ` (विशेषकर ${rainHours})` : ''}। हल्की से मध्यम बारिश हो सकती है।`;
      }
      return `☀️ नहीं, ${timeDesc} में ${locName} में छाते की जरूरत नहीं पड़ेगी।\n\nबारिश की संभावना केवल ${rainProb}% है और मौसम ज्यादातर सूखा ही रहेगा।`;
    }
    if (lang === 'ta') {
      if (rainProb >= 50) {
        return `☂️ ஆம், ${timeDesc} ${locName} பகுதியில் குடை எடுத்துச் செல்வது நல்லது.\n\nமழை பெய்வதற்கான வாய்ப்பு சுமார் ${rainProb}% ஆக உள்ளது${rainHours ? ` (${rainHours})` : ''}.`;
      }
      return `☀️ இல்லை, ${timeDesc} ${locName} பகுதியில் குடை தேவையில்லை.\n\nமழைக்கான வாய்ப்பு ${rainProb}% மட்டுமே, வானிலை உலர்ந்ததாகவே காணப்படும்.`;
    }
    // English Umbrella
    if (rainProb >= 50) {
      return `☂️ Yes, carrying an umbrella would be a good idea ${timeDesc} in ${locName}.\n\nRain is likely with around a ${rainProb}% probability${rainHours ? `, particularly ${rainHours}` : ''}. Expected precipitation could reach ${metrics.totalPrecipitationMm} mm.`;
    }
    return `☀️ You probably won't need an umbrella ${timeDesc} in ${locName}.\n\nRain probability is low (around ${rainProb}%) and conditions should stay predominantly dry.`;
  }

  // 4. Outdoor Activity / Sports Decision-Support (e.g. Football)
  if (isActivity) {
    if (lang === 'hi') {
      if (metrics.hasThunder) {
        return `⛈️ ${locName} में तूफान और बिजली गिरने की संभावना है, इसलिए अभी ${activityName} खेलना सुरक्षित नहीं है।\n\nमौसम साफ होने तक खुले मैदान से दूर रहें और सुरक्षित स्थान पर रहें।`;
      }
      if (rainProb >= 50) {
        return `⚽ ${timeDesc} में ${locName} में ${activityName} खेलना संभव है, लेकिन बारिश की संभावना (लगभग ${rainProb}%) काफी अधिक है।\n\nमैदान गीला और फिसलन भरा हो सकता है${rainHours ? ` (विशेषकर ${rainHours})` : ''}। अच्छी ग्रिप वाले जूते पहनें या समय से थोड़ा पहले खेलें।`;
      }
      return `⚽ ${timeDesc} में ${locName} में ${activityName} खेलने के लिए मौसम बहुत अच्छा है।\n\nबारिश की संभावना नहीं है, हवाएं हल्की रहेंगी और तापमान लगभग ${temp}°C रहेगा। पर्याप्त पानी साथ रखें!`;
    }
    if (lang === 'ta') {
      if (metrics.hasThunder) {
        return `⛈️ ${locName} இல் இடி மின்னலுடன் கூடிய மழைக்கு வாய்ப்புள்ளதால், இப்போது ${activityName} விளையாடுவது பாதுகாப்பானது அல்ல.\n\nவானிலை சீராகும் வரை திறந்த மைதானங்களைத் தவிர்க்கவும்.`;
      }
      if (rainProb >= 50) {
        return `⚽ ${timeDesc} ${locName} இல் ${activityName} விளையாட முடியும், ஆனால் மழை பெய்ய வாய்ப்புள்ளது (${rainProb}%).\n\nமைதானம் ஈரமாகவும் வழுக்கலாகவும் இருக்கக்கூடும்${rainHours ? ` (${rainHours})` : ''}. நல்ல பிடிப்புள்ள காலணிகளை அணியவும்.`;
      }
      return `⚽ ${timeDesc} ${locName} இல் ${activityName} விளையாடுவதற்கு வானிலை மிகவும் சாதகமாக உள்ளது.\n\nமழை வாய்ப்பு இல்லை, காற்று மென்மையாக வீசும். வெப்பம் சுமார் ${temp}°C ஆக இருக்கும்.`;
    }
    // English Sports
    if (metrics.hasThunder) {
      return `⛈️ Thunderstorms are detected near ${locName}, so playing ${activityName.toLowerCase()} outdoors is not safe.\n\nPlease stay indoors until convective activity completely clears.`;
    }
    if (rainProb >= 50) {
      return `⚽ Playing ${activityName.toLowerCase()} ${timeDesc} in ${locName} is possible, but rain is likely.\n\nThe highest likelihood of rainfall is ${rainHours || 'during this period'} with a ${rainProb}% chance, meaning the turf or ground may be wet and slippery. Consider playing earlier or wearing shoes with good traction.`;
    }
    if (metrics.isHighHeat) {
      return `⚽ Playing ${activityName.toLowerCase()} ${timeDesc} in ${locName} is fine, but temperatures will be hot around ${temp}°C (feels like ${feelsLike}°C).\n\nStay well hydrated, take frequent breaks, and avoid continuous direct sun exposure.`;
    }
    return `⚽ Conditions look great for ${activityName.toLowerCase()} ${timeDesc} in ${locName}.\n\nRain is very unlikely (around ${rainProb}%), winds are gentle at ${metrics.maxWindSpeed} km/h, and temperatures will sit around ${temp}°C. Have a great game!`;
  }

  // 5. General Weather Forecast
  if (lang === 'hi') {
    if (rainProb >= 50) {
      return `🌧️ ${timeDesc} में ${locName} में बारिश होने की काफी संभावना है।\n\nबारिश की सबसे अधिक संभावना ${rainHours || 'समय के दौरान'} (लगभग ${rainProb}%) है। तापमान ${metrics.tempMin}°C से ${temp}°C के बीच रहेगा। बाहर निकलते समय छाता साथ रखें।`;
    }
    return `☀️ ${timeDesc} में ${locName} में बारिश की संभावना नहीं है, इसलिए आप आराम से बाहर जा सकते हैं।\n\nआसमान ज्यादातर साफ रहेगा और तापमान लगभग ${temp}°C रहेगा।`;
  }
  if (lang === 'ta') {
    if (rainProb >= 50) {
      return `🌧️ ${timeDesc} ${locName} பகுதியில் மழை பெய்வதற்கு அதிக வாய்ப்புள்ளது.\n\nமழை வாய்ப்பு ${rainHours || 'நேரத்தில்'} சுமார் ${rainProb}% ஆக இருக்கும். வெளியில் செல்லும்போது குடை அல்லது ரெயின்கோட் எடுத்துச் செல்வது நல்லது.`;
    }
    return `☀️ ${timeDesc} ${locName} பகுதியில் மழைக்கு வாய்ப்பில்லை, நீங்கள் தாராளமாக வெளியில் செல்லலாம்.\n\nவானம் பெரும்பாலும் தெளிவாக இருக்கும், வெப்பநிலை சுமார் ${temp}°C ஆக இருக்கும்.`;
  }
  // English General
  if (rainProb >= 50) {
    return `🌧️ Rain is likely ${timeDesc} in ${locName}, with a ${rainProb}% chance of precipitation.\n\nThe highest chance of rainfall is ${rainHours || 'during this window'}. If you are heading out around that time, carrying an umbrella would be a good idea.`;
  }
  return `☀️ No rain is expected ${timeDesc} in ${locName}, so you should be fine to go out.\n\nSkies will stay mostly clear and winds will be light at around ${metrics.maxWindSpeed} km/h, with temperatures near ${temp}°C.`;
}

export interface HourlyDataForExplanation {
  time: string;
  hour: string;
  formattedHour?: string;
  temperature: number;
  apparentTemperature: number;
  rainProbability: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  condition: string;
}

/**
 * Generates a concise natural language explanation for a specific hour on the timeline
 */
export async function generateHourlyExplanation(
  locationName: string,
  hourData: HourlyDataForExplanation,
  language: string = 'en'
): Promise<string> {
  const targetLang = LANGUAGE_NAMES[language] || 'English';
  const displayTime = hourData.formattedHour || hourData.hour;
  const temp = Math.round(hourData.temperature);

  const prompt = `You are WeatherGPT. Produce a concise, friendly natural-language decision explanation (1 to 2 sentences max) describing what the weather at ${displayTime} means for someone in ${locationName}.
Write the explanation in ${targetLang} (using authentic native script).

Conditions at ${displayTime}:
- Temperature: around ${temp}°C
- Rain probability: ${hourData.rainProbability}%
- Wind: ${hourData.windSpeed < 15 ? 'light winds' : hourData.windSpeed <= 35 ? 'fairly windy' : 'strong winds'}
- Condition: ${hourData.condition}

Rules:
- Directly explain what these conditions mean in plain human terms (e.g. pleasant skies, carrying an umbrella, or afternoon heat).
- Do NOT output raw metric lists, "Source: Open-Meteo", "(Feels like X°C)", or "Wind: 9.4 km/h".
- Keep under 30 words.`;

  try {
    const ai = getAiClient();
    if (!ai) {
      return generateDeterministicHourlyExplanation(hourData, language);
    }

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      return generateDeterministicHourlyExplanation(hourData, language);
    }
    return sanitizeConversationalResponse(reply);
  } catch (error) {
    return generateDeterministicHourlyExplanation(hourData, language);
  }
}

function generateDeterministicHourlyExplanation(h: HourlyDataForExplanation, language: string = 'en'): string {
  const time = h.formattedHour || h.hour;
  const lang = (language || 'en').toLowerCase();
  const temp = Math.round(h.temperature);

  if (lang === 'hi') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} के आसपास बारिश की बहुत अधिक संभावना है। यदि बाहर जा रहे हैं तो छाता साथ रखें।`;
    }
    if (h.rainProbability >= 30) {
      return `${time} के आसपास हल्की बारिश हो सकती है, मौसम थोड़ा नम रहेगा।`;
    }
    if (temp >= 34) {
      return `${time} के आसपास धूप और गर्मी तेज रहेगी (लगभग ${temp}°C)। खूब पानी पिएं।`;
    }
    return `${time} के आसपास मौसम सुखद और शांत रहेगा, लगभग ${temp}°C तापमान के साथ।`;
  }

  if (lang === 'ta') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} மணியளவில் மழை பெய்ய அதிக வாய்ப்புள்ளது, குடை எடுத்துச் செல்வது நல்லது.`;
    }
    if (h.rainProbability >= 30) {
      return `${time} மணியளவில் லேசான சாரல் மழை பெய்யக்கூடும்.`;
    }
    if (temp >= 34) {
      return `${time} மணியளவில் வெப்பம் அதிகமாக இருக்கும் (சுமார் ${temp}°C). போதுமான தண்ணீர் குடிக்கவும்.`;
    }
    return `${time} மணியளவில் இனிமையான வானிலை நிலவும் (சுமார் ${temp}°C).`;
  }

  if (lang === 'te') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} సమయంలో వర్షం పడే అవకాశం చాలా ఎక్కువగా ఉంది, గొడుగు వెంట ఉంచుకోండి.`;
    }
    if (h.rainProbability >= 30) {
      return `${time} సమయంలో తేలికపాటి వర్షం కురిసే అవకాశం ఉంది.`;
    }
    if (temp >= 34) {
      return `${time} సమయంలో ఎండ తీవ్రత ఎక్కువగా ఉంటుంది (సుమారు ${temp}°C). నీరు బాగా త్రాగండి.`;
    }
    return `${time} సమయంలో ఆహ్లాదకరమైన వాతావరణం ఉంటుంది (సుమారు ${temp}°C).`;
  }

  if (lang === 'ml') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} സമയത്ത് മഴ പെയ്യാൻ കൂടുതൽ സാധ്യതയുണ്ട്, കുട കയ്യിൽ കരുതുക.`;
    }
    if (h.rainProbability >= 30) {
      return `${time} സമയത്ത് നേരിയ മഴയ്ക്ക് സാധ്യതയുണ്ട്.`;
    }
    if (temp >= 34) {
      return `${time} സമയത്ത് ചൂട് കൂടുതലായിരിക്കും (ഏകദേശം ${temp}°C). ധാരാളം വെള്ളം കുടിക്കുക.`;
    }
    return `${time} സമയത്ത് സുഖകരമായ കാലാവസ്ഥ പ്രതീക്ഷിക്കാം (ഏകദേശം ${temp}°C).`;
  }

  if (lang === 'kn') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} ಸಮಯದಲ್ಲಿ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆ ಹೆಚ್ಚಿದೆ, ಛತ್ರಿ ಜೊತೆಗಿಟ್ಟುಕೊಳ್ಳಿ.`;
    }
    if (h.rainProbability >= 30) {
      return `${time} ಸಮಯದಲ್ಲಿ ಸಣ್ಣ ತುಂತುರು ಮಳೆಯ ಸಾಧ್ಯತೆಯಿದೆ.`;
    }
    if (temp >= 34) {
      return `${time} ಸಮಯದಲ್ಲಿ ಬಿಸಿಲಿನ ತಾಪಮಾನ ಹೆಚ್ಚಿರಲಿದೆ (ಸುಮಾರು ${temp}°C). ನೀರು ಕುಡಿಯಿರಿ.`;
    }
    return `${time} ಸಮಯದಲ್ಲಿ ಹಿತಕರವಾದ ಹವಾಮಾನವಿರುತ್ತದೆ (ಸುಮಾರು ${temp}°C).`;
  }

  if (lang === 'mr') {
    if (h.rainProbability >= 60 || h.precipitation > 1.0) {
      return `${time} च्या सुमारास पाऊस पडण्याची दाट शक्यता आहे, छत्री सोबत ठेवा.`;
    }
    if (h.rainProbability >= 30) {
      return `${time} च्या सुमारास हलक्या पावसाची शक्यता आहे.`;
    }
    if (temp >= 34) {
      return `${time} च्या सुमारास ऊन जास्त जाणवेल (सुमारे ${temp}°C). भरपूर पाणी प्या.`;
    }
    return `${time} च्या सुमारास हवामान आल्हाददायक राहील (सुमारे ${temp}°C).`;
  }

  // English
  if (h.rainProbability >= 60 || h.precipitation > 1.0) {
    return `Rain is very likely around ${time}. Carrying an umbrella or raincoat is recommended.`;
  }
  if (h.rainProbability >= 30) {
    return `A passing shower is possible around ${time}, with mostly cloudy skies.`;
  }
  if (temp >= 34) {
    return `Expect hot conditions around ${time} (around ${temp}°C). Stay hydrated and seek shade outdoors.`;
  }
  if (temp <= 15) {
    return `Cool conditions around ${time} (around ${temp}°C). A light jacket will keep you comfortable.`;
  }
  return `Pleasant and settled conditions around ${time} with temperatures near ${temp}°C.`;
}

/**
 * Transcribes spoken audio using Gemini Multimodal Audio (gemini-3.8-flash)
 */
export async function transcribeAudio(
  base64Audio: string,
  mimeType: string = 'audio/webm',
  language: string = 'en'
): Promise<string> {
  const ai = getAiClient();
  if (!ai) {
    throw new Error('Gemini AI client is not initialized');
  }

  const targetLang = LANGUAGE_NAMES[language] || 'English';
  const cleanMimeType = mimeType.split(';')[0].trim() || 'audio/webm';

  try {
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType,
                data: base64Audio,
              },
            },
            {
              text: `Please transcribe the spoken words in this audio into text. Target language: ${targetLang}. Return ONLY the verbatim transcribed words in authentic script without commentary, markdown, or quotation marks. If no clear speech is heard, return an empty string.`,
            },
          ],
        },
      ],
    });

    const text = response.text?.trim() || '';
    return text.replace(/^["']|["']$/g, '').trim();
  } catch (err: any) {
    console.error('Gemini audio transcription error:', err);
    throw err;
  }
}
