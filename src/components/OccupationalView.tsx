import React, { useState } from 'react';
import { LocationData, VerifiedWeatherData } from '../types';
import { OccupationMode } from './occupational/types';
import { OccupationSelector } from './occupational/OccupationSelector';
import { FarmerModeDashboard } from './FarmerModeDashboard';
import { MaritimeDashboard } from './occupational/MaritimeDashboard';
import { AviationDashboard } from './occupational/AviationDashboard';

interface OccupationalViewProps {
  currentLocation: LocationData;
  weatherData: VerifiedWeatherData | null;
  onOpenChatWithPrompt?: (prompt: string) => void;
  onSelectLocation?: (loc: LocationData) => void;
  initialMode?: OccupationMode | null;
}

export const OccupationalView: React.FC<OccupationalViewProps> = ({
  currentLocation,
  weatherData,
  onOpenChatWithPrompt,
  onSelectLocation,
  initialMode = null,
}) => {
  // Must select one of the three modes (farming, maritime, aviation) before proceeding.
  const [selectedMode, setSelectedMode] = useState<OccupationMode | null>(initialMode);

  // 1. If no mode selected yet, enforce the 3-mode selection screen
  if (!selectedMode) {
    return (
      <OccupationSelector
        onSelectMode={(mode) => setSelectedMode(mode)}
        selectedMode={selectedMode}
      />
    );
  }

  // 2. Dedicated Mode Dashboards
  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
      {selectedMode === 'farming' && (
        <FarmerModeDashboard
          currentLocation={currentLocation}
          weatherData={weatherData}
          onSelectFarmLocation={(loc) => {
            if (onSelectLocation) onSelectLocation(loc);
          }}
          onExitFarmerMode={() => setSelectedMode(null)}
        />
      )}

      {selectedMode === 'maritime' && (
        <MaritimeDashboard
          currentLocation={currentLocation}
          weatherData={weatherData}
          onBackToSelector={() => setSelectedMode(null)}
          onChangeMode={(mode) => setSelectedMode(mode)}
          onOpenChatWithPrompt={onOpenChatWithPrompt}
        />
      )}

      {selectedMode === 'aviation' && (
        <AviationDashboard
          currentLocation={currentLocation}
          weatherData={weatherData}
          onBackToSelector={() => setSelectedMode(null)}
          onChangeMode={(mode) => setSelectedMode(mode)}
          onOpenChatWithPrompt={onOpenChatWithPrompt}
        />
      )}
    </div>
  );
};
