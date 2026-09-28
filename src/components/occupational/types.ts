import { LocationData, VerifiedWeatherData } from '../../types';

export type OccupationMode = 'farming' | 'maritime' | 'aviation';

export interface OccupationDashboardProps {
  currentLocation: LocationData;
  weatherData: VerifiedWeatherData | null;
  onBackToSelector: () => void;
  onChangeMode: (mode: OccupationMode) => void;
  onOpenChatWithPrompt?: (prompt: string) => void;
  onSelectFarmLocation?: (loc: LocationData) => void;
}
