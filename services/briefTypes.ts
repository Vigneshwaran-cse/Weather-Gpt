export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';

export interface HazardItem {
  type: string; // heavy_rain | thunderstorm | lightning | high_wind | extreme_heat | poor_visibility | cyclone_warning | marine_high_waves | strong_swell
  label: string;
  level: RiskLevel;
  reason: string;
}

export interface HazardResult {
  overallLevel: RiskLevel;
  hazards: HazardItem[];
  reasons: string[];
  actions: string[];
  officialWarningPresent: boolean;
  /** Calculated by WeatherGPT. NOT an official warning. */
  calculated: true;
}

export interface OfficialWarning {
  source: 'IMD' | 'DEMO';
  title: string;
  level?: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'UNKNOWN';
  issued?: string;
  validFrom?: string;
  validTo?: string;
  message: string;
}

export interface OfficialWarningsResult {
  available: boolean;
  warnings: OfficialWarning[];
  unavailableReason?: string;
  fetchedAt: string;
}

export interface MarineSnapshot {
  waveHeightM: number | null;
  swellHeightM: number | null;
  wavePeriodS: number | null;
  waveDirectionDeg: number | null;
  seaSurfaceTempC: number | null;
  oceanCurrentKmh: number | null;
  windKmh: number | null;
  time: string;
  hourly: { time: string; waveHeightM: number | null; swellHeightM: number | null; wavePeriodS: number | null }[];
  isSea: boolean;
}

export interface ClimateInsight {
  rangeYears: number;
  yearly: { year: number; rainfallMm: number; meanTempC: number }[];
  monthName: string;
  thisMonth: { rainfallMm: number; meanTempC: number } | null;
  normalMonth: { rainfallMm: number; meanTempC: number } | null;
  rainfallChangePct: number | null;
  tempDeltaC: number | null;
  explanation: string;
}

export interface BriefSource { name: string; status: 'ok' | 'unavailable' | 'cached' | 'skipped'; updated?: string; note?: string }

export interface WeatherIntelligenceBrief {
  location: { name: string; state?: string; country?: string; latitude: number; longitude: number };
  generatedAt: string;
  status: 'LIVE' | 'PARTIAL' | 'UNAVAILABLE';
  disasterMode: boolean;
  demoMode?: boolean;
  question?: string;
  summary: {
    headline: string;
    whatItMeans: string;
    riskLevel: RiskLevel;
    sourceNote: string;
    aiGenerated: boolean;
    language: string;
  };
  current: {
    temperature: number; feelsLike: number; humidity: number; windSpeed: number;
    precipitation: number; rainProbability: number; condition: string; timestamp: string;
  } | null;
  forecast: {
    focusLabel: string;
    focusDate: string;
    rainProbabilityMax: number;
    precipitationSum: number;
    tempMin: number;
    tempMax: number;
    windMax: number;
    condition: string;
    hourly: { time: string; hour: string; temperature: number; rainProbability: number; precipitation: number; windSpeed: number }[];
    daily: { date: string; dayOfWeek: string; tempMin: number; tempMax: number; rainProbabilityMax: number; precipitationSum: number; condition: string }[];
    model: string;
  } | null;
  hazards: HazardResult;
  officialWarnings: OfficialWarningsResult;
  actions: string[];
  sources: BriefSource[];
  marine?: { snapshot: MarineSnapshot | null; officialAdvisory: string; interpretation: string; disclaimer: string; error?: string };
  farming?: { crop: string; weatherLine: string; impact: string; action: string; label: string };
  message?: string;
}
