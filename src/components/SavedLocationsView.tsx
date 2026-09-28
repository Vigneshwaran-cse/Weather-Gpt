import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, MapPin, Plus, Trash2, ArrowRight, Check, Search, X, Loader2 } from 'lucide-react';
import { LocationData } from '../types';
import { searchLocations, GeocodeResult } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface SavedLocationsViewProps {
  currentLocation: LocationData;
  onSelectLocation: (loc: LocationData) => void;
  onViewWeatherDashboard?: () => void;
}

const STORAGE_SAVED_KEY = 'weathergpt_saved_cities';

export const SavedLocationsView: React.FC<SavedLocationsViewProps> = ({
  currentLocation,
  onSelectLocation,
  onViewWeatherDashboard,
}) => {
  const { t } = useLanguage();

  // Load saved locations strictly from localStorage with NO hardcoded default cities
  const [savedCities, setSavedCities] = useState<LocationData[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_SAVED_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Search / Add Location Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus input when Add modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
    } else {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [isAddModalOpen]);

  // Debounced search logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error('Search locations failed:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isCurrentSaved = savedCities.some(
    (c) => c.name.toLowerCase() === currentLocation.name.toLowerCase()
  );

  const saveCitiesList = (updated: LocationData[]) => {
    setSavedCities(updated);
    try {
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }
  };

  const handleToggleCurrentLocation = () => {
    if (isCurrentSaved) {
      const updated = savedCities.filter(
        (c) => c.name.toLowerCase() !== currentLocation.name.toLowerCase()
      );
      saveCitiesList(updated);
    } else {
      const updated = [currentLocation, ...savedCities];
      saveCitiesList(updated);
    }
  };

  const handleRemoveCity = (e: React.MouseEvent, cityName: string) => {
    e.stopPropagation();
    const updated = savedCities.filter(
      (c) => c.name.toLowerCase() !== cityName.toLowerCase()
    );
    saveCitiesList(updated);
  };

  const handleSelectCity = (city: LocationData) => {
    onSelectLocation(city);
    if (onViewWeatherDashboard) {
      onViewWeatherDashboard();
    }
  };

  const handleAddSearchResult = (result: GeocodeResult) => {
    const newLoc: LocationData = {
      name: result.name,
      state: result.admin1 || '',
      country: result.country || '',
      latitude: result.latitude,
      longitude: result.longitude,
    };

    // Prevent duplicate additions
    const exists = savedCities.some(
      (c) => c.name.toLowerCase() === newLoc.name.toLowerCase()
    );

    if (!exists) {
      const updated = [newLoc, ...savedCities];
      saveCitiesList(updated);
    }

    // Set as active location & close modal
    onSelectLocation(newLoc);
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden space-y-2 p-0.5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-slate-900/85 border border-slate-800/90 p-3 shadow-xs backdrop-blur-xl flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
            <Bookmark className="w-4 h-4 fill-sky-400/20" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              {t('navSaved')}
            </h2>
            <p className="text-[10px] text-slate-400">
              {t('savedLocationsSubtitle')}
            </p>
          </div>
        </div>

        {/* Top-Right Add Location Trigger */}
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="h-8 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t('addLocation')}</span>
        </button>
      </div>

      {/* Bookmark Current Location Pill */}
      <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="truncate text-slate-300">
            {t('activeLocationLabel')}: <strong className="text-white">{currentLocation.name}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleToggleCurrentLocation}
          className={`h-6.5 px-2.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
            isCurrentSaved
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30'
          }`}
        >
          {isCurrentSaved ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>{t('savedActiveLocation')}</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3 h-3 text-sky-400" />
              <span>{t('saveActiveLocation')}</span>
            </>
          )}
        </button>
      </div>

      {/* Main Content Area: Saved Cities List or Empty State */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 scrollbar-none pr-0.5">
        {savedCities.length === 0 ? (
          /* Clean Empty State when no locations are saved yet */
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800/80">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
              <Bookmark className="w-6 h-6 stroke-[1.8] text-sky-400" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              {t('noSavedLocations')}
            </h3>
            <p className="text-xs text-slate-400 max-w-[240px] mb-4">
              {t('savedLocationsSubtitle')}
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addLocation')}</span>
            </button>
          </div>
        ) : (
          <>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-1">
              {t('savedCount', { count: savedCities.length })}
            </div>

            {savedCities.map((city) => {
              const isSelected = city.name.toLowerCase() === currentLocation.name.toLowerCase();

              return (
                <div
                  key={`${city.name}-${city.latitude}`}
                  onClick={() => handleSelectCity(city)}
                  className={`min-h-[50px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isSelected
                      ? 'bg-sky-500/15 border-sky-500/40 text-white'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{city.name}</span>
                        {isSelected && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                            {t('activeLocationLabel')}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {[city.state, city.country].filter(Boolean).join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-sky-400 font-semibold flex items-center gap-0.5">
                      <span>{t('open')}</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveCity(e, city.name)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title={t('remove')}
                      aria-label={`${t('remove')} ${city.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Add Location Search Modal Sheet */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-0 sm:p-4">
          <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-700/80 w-full max-w-lg max-h-[82dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto my-2 shrink-0" />

            {/* Modal Search Header */}
            <div className="p-3 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="relative flex-1 flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchAddLocationPlaceholder')}
                  className="w-full pl-9 pr-8 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-sky-500/50 text-white placeholder-slate-400 h-9.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title={t('close')}
                aria-label={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results Section */}
            <div className="p-3 flex-1 overflow-y-auto scrollbar-none">
              {isSearching ? (
                <div className="py-8 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                  <span>{t('analyzing')}</span>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                    {t('searchResults')}
                  </div>
                  {searchResults.map((result, idx) => {
                    const alreadySaved = savedCities.some(
                      (c) => c.name.toLowerCase() === result.name.toLowerCase()
                    );

                    return (
                      <button
                        key={`${result.name}-${result.latitude}-${idx}`}
                        type="button"
                        onClick={() => handleAddSearchResult(result)}
                        className="w-full min-h-[48px] text-left px-3 py-2 rounded-xl hover:bg-slate-800/90 active:bg-slate-800 text-slate-100 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-white">{result.name}</span>
                            <span className="text-[11px] text-slate-400 ml-1.5">
                              {[result.admin1, result.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {alreadySaved && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {t('savedActiveLocation')}
                            </span>
                          )}
                          <span className="text-[11px] text-sky-400 font-semibold flex items-center gap-0.5">
                            <Plus className="w-3 h-3" />
                            <span>{t('addCityButton')}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : searchQuery.length >= 2 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {t('noResults')} &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                  <Search className="w-6 h-6 text-slate-600 mb-1" />
                  <span>{t('searchAddLocationPlaceholder')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
