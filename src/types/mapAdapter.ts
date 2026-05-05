/**
 * Map Adapter Interface
 * Defines the contract that all map implementations must follow
 */

export interface GeoJSON {
  type: string;
  features?: any[];
  geometry?: any;
  [key: string]: any;
}

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapAdapterProps {
  center: MapCoordinates;
  zoom: number;
  geoJson: GeoJSON | null;
  theme: 'light' | 'dark';
  onMapReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Abstract interface for map adapters
 * Both MapLibre and Google Maps must implement these methods
 */
export interface IMapAdapter {
  /**
   * Initialize the map with given container element
   */
  initialize(container: HTMLElement): Promise<void>;

  /**
   * Update map center and zoom
   */
  setView(center: MapCoordinates, zoom: number, animate?: boolean): Promise<void>;

  /**
   * Load and render GeoJSON data
   */
  setGeoJson(geoJson: GeoJSON | null): Promise<void>;

  /**
   * Change map theme
   */
  setTheme(theme: 'light' | 'dark'): Promise<void>;

  /**
   * Destroy the map and clean up resources
   */
  destroy(): void;
}
