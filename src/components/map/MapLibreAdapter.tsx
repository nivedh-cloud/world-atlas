/**
 * MapLibre GL JS Adapter
 * Free and open-source map implementation
 */

import React, { useEffect, useRef, useState } from 'react';
import type { IMapAdapter, MapAdapterProps, GeoJSON, MapCoordinates } from '../../types/mapAdapter';

// Dynamically check if MapLibre is available
let maplibregl: any = null;
if (typeof window !== 'undefined') {
  try {
    maplibregl = (window as any).maplibregl;
  } catch (error) {
    console.warn('MapLibre GL JS not available globally');
  }
}

/**
 * MapLibre Adapter Class
 * Implements the IMapAdapter interface for MapLibre GL JS
 */
class MapLibreAdapter implements IMapAdapter {
  private map: any = null;
  private geoJsonSource: string = 'geojson-data';
  private geoJsonLayer: string = 'geojson-layer';

  async initialize(container: HTMLElement): Promise<void> {
    if (this.map) {
      console.warn('MapLibre map already initialized');
      return;
    }

    if (!maplibregl) {
      throw new Error('MapLibre GL JS is not installed. Install it with: npm install maplibre-gl');
    }

    // Default to OpenStreetMap style
    const style = 'https://demotiles.maplibre.org/style.json';

    this.map = new maplibregl.Map({
      container,
      style,
      center: [0, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
    });

    // Add navigation controls
    this.map.addControl(new maplibregl.NavigationControl(), 'top-left');

    // Add a source for GeoJSON data
    this.map.on('load', () => {
      this.map!.addSource(this.geoJsonSource, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add layer for country borders
      this.map!.addLayer({
        id: this.geoJsonLayer,
        type: 'line',
        source: this.geoJsonSource,
        paint: {
          'line-color': '#088',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });

      // Add fill layer for countries
      this.map!.addLayer({
        id: `${this.geoJsonLayer}-fill`,
        type: 'fill',
        source: this.geoJsonSource,
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.1,
        },
      });
    });
  }

  async setView(center: MapCoordinates, zoom: number, animate: boolean = true): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    if (animate) {
      (this.map as any).flyTo({
        center: [center.lng, center.lat],
        zoom,
        duration: 2000,
        essential: true,
      });
    } else {
      this.map.setCenter([center.lng, center.lat]);
      this.map.setZoom(zoom);
    }
  }

  async setGeoJson(geoJson: GeoJSON | null): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    try {
      const source = this.map.getSource(this.geoJsonSource) as any;
      if (source) {
        source.setData(geoJson || { type: 'FeatureCollection', features: [] });
      }
    } catch (error) {
      console.error('Error setting GeoJSON data:', error);
    }
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    // MapLibre doesn't have built-in theme switching
    // You can implement custom style switching here if needed
    console.log(`Switching to ${theme} theme`);
  }

  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}

/**
 * React Component Wrapper for MapLibre Adapter
 */
export const MapLibreComponent: React.FC<MapAdapterProps> = ({
  center,
  zoom,
  geoJson,
  theme,
  onMapReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapLibreAdapter | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize map on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initializeMap = async () => {
      try {
        const adapter = new MapLibreAdapter();
        await adapter.initialize(containerRef.current!);
        adapterRef.current = adapter;
        setIsReady(true);
        onMapReady?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Failed to initialize MapLibre:', err);
        onError?.(err);
      }
    };

    initializeMap();

    // Cleanup on unmount
    return () => {
      if (adapterRef.current) {
        adapterRef.current.destroy();
        adapterRef.current = null;
      }
    };
  }, [onMapReady, onError]);

  // Update view when center or zoom changes
  useEffect(() => {
    if (!isReady || !adapterRef.current) return;

    adapterRef.current.setView(center, zoom, true).catch((error) => {
      console.error('Error setting map view:', error);
      onError?.(error);
    });
  }, [center, zoom, isReady, onError]);

  // Update GeoJSON when it changes
  useEffect(() => {
    if (!isReady || !adapterRef.current) return;

    adapterRef.current.setGeoJson(geoJson).catch((error) => {
      console.error('Error setting GeoJSON:', error);
      onError?.(error);
    });
  }, [geoJson, isReady, onError]);

  // Update theme when it changes
  useEffect(() => {
    if (!isReady || !adapterRef.current) return;

    adapterRef.current.setTheme(theme).catch((error) => {
      console.error('Error setting theme:', error);
      onError?.(error);
    });
  }, [theme, isReady, onError]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full rounded-lg overflow-hidden shadow-md"
      style={{ minHeight: '300px' }}
    />
  );
};
