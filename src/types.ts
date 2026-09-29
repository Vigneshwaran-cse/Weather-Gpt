export interface LocationData {
  name: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
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
  visibility?: number;
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
  location: LocationData;
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

export interface ChatDebugInfo {
  detectedLocation: string;
  latitude: number | null;
  longitude: number | null;
  detectedIntent: string;
  activity?: string;
  weatherApiLocation: string;
  timeframe: string;
  source: string;
  forecastModel?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  forecastModel?: string;
  updated?: string;
  locationName?: string;
  isError?: boolean;
  debug?: ChatDebugInfo;
  routeAction?: {
    origin: string;
    destination: string;
    departureTime?: string;
  };
}

export type DisturbanceSeverity = 'clear' | 'caution' | 'alert';

export interface RouteWaypointWeather {
  id: string;
  name: string;
  locality?: string;
  latitude: number;
  longitude: number;
  distanceFromStartKm: number;
  travelMinutesFromStart: number;
  estimatedArrivalTime: string; // ISO or formatted
  arrivalHourFormatted: string; // e.g. "10:30 AM"
  temperature: number;
  apparentTemperature: number;
  rainProbability: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  status: DisturbanceSeverity;
  statusMessage: string;
  warning?: string;
  precaution: string;
  source: string;
}

export interface RouteSegment {
  fromName: string;
  toName: string;
  status: DisturbanceSeverity;
  summary: string;
  distanceKm: number;
  durationMinutes: number;
}

export interface RouteOption {
  id: string;
  name: string;
  description: string;
  isAlternative: boolean;
  distanceKm: number;
  durationMinutes: number;
  durationFormatted: string;
  status: 'ROUTE_CLEAR' | 'WEATHER_CAUTION' | 'WEATHER_ALERT';
  statusText: string;
  statusDescription: string;
  encodedPolyline: string;
  path: Array<{ lat: number; lng: number }>;
  waypoints: RouteWaypointWeather[];
  segments: RouteSegment[];
  disturbanceCount: number;
  highestRainProbability: number;
  highestPrecipitation: number;
  maxWindSpeed: number;
}

export interface RoutePlanResult {
  origin: {
    name: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    name: string;
    latitude: number;
    longitude: number;
  };
  departureTime: string;
  selectedRouteIndex: number;
  routes: RouteOption[];
  overallStatus: 'ROUTE_CLEAR' | 'WEATHER_CAUTION' | 'WEATHER_ALERT';
  aiRecommendation: string;
  alternativeComparison?: string;
  source: string;
  updatedAt: string;
}
