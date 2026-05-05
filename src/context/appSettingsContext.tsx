import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { detectCountryCodeFromDeviceLocation } from '../utils/maptilerGeocodeCountry';
import { hasActivePremiumEntitlement } from '../utils/premiumSubscription';

export type MapStyle = 'default' | 'base' | 'ocean' | 'landscape' | 'streets' | 'topo';

interface AppSettings {
  darkMode: boolean;
  mapStyle: MapStyle;
  /** ISO alpha-2; drives “your” currency via countries-info dataset. Auto-filled from geolocation when unset. */
  referenceCurrencyCountryCode?: string;
  /** When true, banner + interstitial ads are not initialized (native). */
  premiumAdFree?: boolean;
  /** `play`: verified via store sync or purchase; `local`: QA / simulator only — not cleared by Play entitlement sync when absent */
  premiumSource?: 'play' | 'local';
}

interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  toggleDarkMode: () => void;
  setMapStyle: (style: MapStyle) => void;
}

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'countrys_geofences_settings';

const getDefaultSettings = (): AppSettings => ({
  darkMode: false,
  mapStyle: 'default',
  premiumAdFree: false,
});

const loadSettingsFromStorage = (): AppSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...getDefaultSettings(), ...parsed };
    }
  } catch (error) {
    console.error('Failed to load settings from localStorage:', error);
  }
  return getDefaultSettings();
};

export const AppSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, [settings]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { referenceCurrencyCountryCode?: string };
        if (
          typeof p.referenceCurrencyCountryCode === 'string'
          && p.referenceCurrencyCountryCode.length >= 2
        ) {
          return;
        }
      }
    } catch {
      /* continue */
    }
    let cancelled = false;
    void (async () => {
      const code = await detectCountryCodeFromDeviceLocation();
      if (cancelled) return;
      const cca = (code || 'us').toUpperCase();
      setSettings(prev =>
        (prev.referenceCurrencyCountryCode?.length ?? 0) >= 2
          ? prev
          : { ...prev, referenceCurrencyCountryCode: cca },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    void (async () => {
      try {
        const active = await hasActivePremiumEntitlement();
        if (cancelled) return;
        setSettings(prev => {
          if (active) {
            return { ...prev, premiumAdFree: true, premiumSource: 'play' };
          }
          if (prev.premiumSource === 'play') {
            return { ...prev, premiumAdFree: false, premiumSource: undefined };
          }
          return prev;
        });
      } catch {
        /* billing errors — keep cached settings */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleDarkMode = () => {
    updateSettings({ darkMode: !settings.darkMode });
  };

  const setMapStyle = (style: MapStyle) => {
    updateSettings({ mapStyle: style });
  };

  return (
    <AppSettingsContext.Provider value={{ settings, updateSettings, toggleDarkMode, setMapStyle }}>
      {children}
    </AppSettingsContext.Provider>
  );
};

export const useAppSettings = () => {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
};

// Map style URLs
export const MAP_STYLES: Record<MapStyle, string> = {
  base: 'https://demotiles.maplibre.org/style.json',
  default: 'https://api.maptiler.com/maps/base-v4/style.json?key=9rUTis0cKnTtAS2nbbFd',
  ocean: 'https://api.maptiler.com/maps/ocean-v4/style.json?key=9rUTis0cKnTtAS2nbbFd',
  landscape: 'https://api.maptiler.com/maps/landscape-v4/style.json?key=9rUTis0cKnTtAS2nbbFd',
  streets: 'https://api.maptiler.com/maps/streets-v4/style.json?key=9rUTis0cKnTtAS2nbbFd',
  topo: 'https://api.maptiler.com/maps/topo-v4/style.json?key=9rUTis0cKnTtAS2nbbFd',
};

export const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  default: 'Default',
  base: 'Tiles',
  ocean: 'Ocean',
  landscape: 'Landscape',
  streets: 'Streets',
  topo: 'Topo',
};
