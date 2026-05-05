/**
 * Google Maps JavaScript API Adapter
 * For future paid/premium users
 */

import React, { useEffect, useRef, useState } from 'react';
import type { IMapAdapter, MapAdapterProps, GeoJSON, MapCoordinates } from '../../types/mapAdapter';

// Declare Google Maps namespace
declare global {
  namespace google {
    namespace maps {
      class Map {
        constructor(element: HTMLElement, options: any);
        data: Data;
        setZoom(zoom: number): void;
        setCenter(center: LatLng): void;
        panTo(location: LatLng): void;
        setOptions(options: any): void;
        remove(): void;
      }
      class LatLng {
        constructor(lat: number, lng: number);
      }
      class Data {
        addGeoJson(geoJson: any): void;
        forEach(callback: (feature: any) => void): void;
        remove(feature: any): void;
        setStyle(style: any): void;
        addListener(eventName: string, callback: (event: any) => void): void;
        overrideStyle(feature: any, style: any): void;
        revertStyle(feature: any): void;
      }
      enum ControlPosition {
        BOTTOM_LEFT = 10,
      }
      interface MapTypeStyle {
        elementType?: string;
        featureType?: string;
        stylers?: Array<{ [key: string]: any }>;
      }
    }
  }
}

/**
 * Google Maps Adapter Class
 * Implements the IMapAdapter interface for Google Maps
 */
class GoogleMapsAdapter implements IMapAdapter {
  private map: google.maps.Map | null = null;
  private dataLayer: google.maps.Data | null = null;

  async initialize(container: HTMLElement): Promise<void> {
    if (this.map) {
      console.warn('Google Maps already initialized');
      return;
    }

    // Check if Google Maps API is loaded
    const gm = (window as any).google?.maps;
    if (!gm) {
      throw new Error('Google Maps API not loaded');
    }

    // Initialize the map
    this.map = new gm.Map(container, {
      zoom: 2,
      center: { lat: 20, lng: 0 },
      mapTypeControl: true,
      mapTypeControlOptions: {
        position: gm.ControlPosition.BOTTOM_LEFT,
      },
      zoomControl: true,
      fullscreenControl: true,
    });

    // Initialize Data layer for GeoJSON
    this.dataLayer = this.map!.data;

    // Style the data layer
    this.dataLayer?.setStyle({
      fillColor: '#088',
      fillOpacity: 0.1,
      strokeColor: '#088',
      strokeWeight: 2,
      strokeOpacity: 0.8,
    });

    // Hover effect
    this.dataLayer?.addListener('mouseover', (event: any) => {
      this.dataLayer!.overrideStyle(event.feature, {
        fillOpacity: 0.2,
        strokeWeight: 3,
      });
    });

    this.dataLayer?.addListener('mouseout', (event: any) => {
      this.dataLayer!.revertStyle(event.feature);
    });
  }

  async setView(center: MapCoordinates, zoom: number, animate: boolean = true): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const targetCenter = new (google.maps as any).LatLng(center.lat, center.lng);

    if (animate) {
      this.map.panTo(targetCenter);
    } else {
      this.map.setCenter(targetCenter);
    }
    this.map.setZoom(zoom);
  }

  async setGeoJson(geoJson: GeoJSON | null): Promise<void> {
    if (!this.map || !this.dataLayer) {
      throw new Error('Map not initialized');
    }

    try {
      // Clear existing data
      this.dataLayer.forEach((feature) => {
        this.dataLayer!.remove(feature);
      });

      // Load new GeoJSON
      if (geoJson) {
        this.dataLayer.addGeoJson(geoJson);
      }
    } catch (error) {
      console.error('Error setting GeoJSON data:', error);
      throw error;
    }
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    if (!this.map) {
      throw new Error('Map not initialized');
    }

    const styles: google.maps.MapTypeStyle[] =
      theme === 'dark'
        ? [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }],
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }],
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{ color: '#263c3f' }],
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#6f9e99' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{ color: '#38414e' }],
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#212a37' }],
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#9ca5b3' }],
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{ color: '#746855' }],
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{ color: '#1f2835' }],
            },
            {
              featureType: 'road.highway',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#f3751ff' }],
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{ color: '#2f3948' }],
            },
            {
              featureType: 'transit.station',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#d59563' }],
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{ color: '#17263c' }],
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#515c6d' }],
            },
            {
              featureType: 'water',
              elementType: 'labels.text.stroke',
              stylers: [{ color: '#17263c' }],
            },
          ]
        : [];

    this.map.setOptions({ styles });
  }

  destroy(): void {
    if (this.map) {
      // Clean up Google Maps
      this.map = null;
    }
  }
}

/**
 * React Component Wrapper for Google Maps Adapter
 */
export const GoogleMapsComponent: React.FC<MapAdapterProps> = ({
  center,
  zoom,
  geoJson,
  theme,
  onMapReady,
  onError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<GoogleMapsAdapter | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize map on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const initializeMap = async () => {
      try {
        // Check if Google Maps API is loaded
        const gm = (window as any).google?.maps;
        if (!gm) {
          throw new Error('Google Maps API not loaded. Make sure to include the Google Maps script tag in index.html');
        }

        const adapter = new GoogleMapsAdapter();
        await adapter.initialize(containerRef.current!);
        adapterRef.current = adapter;
        setIsReady(true);
        onMapReady?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('Failed to initialize Google Maps:', err);
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
