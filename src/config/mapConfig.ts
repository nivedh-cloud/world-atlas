/**
 * Map Configuration
 * Determines which map adapter to use: 'maplibre' or 'google'
 */

export type MapProvider = 'maplibre' | 'google';

export interface MapConfig {
  provider: MapProvider;
  theme: 'light' | 'dark';
  enableDebug: boolean;
}

// Load from environment or default to maplibre
const getMapProvider = (): MapProvider => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAP_PROVIDER) {
    return import.meta.env.VITE_MAP_PROVIDER as MapProvider;
  }
  return 'maplibre';
};

const isDebug = (): boolean => {
  if (typeof import.meta !== 'undefined') {
    return import.meta.env?.DEV ?? false;
  }
  return false;
};

export const mapConfig: MapConfig = {
  provider: getMapProvider(),
  theme: 'light',
  enableDebug: isDebug(),
};

export const useMapConfig = (): MapConfig => {
  return mapConfig;
};
