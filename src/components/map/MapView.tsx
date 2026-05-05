/**
 * Map View Component
 * Complete map view with 40% map height and 60% scrollable details
 * Integrates MapContainer with country details drawer
 */

import React, { useState, useCallback } from 'react';
import MapContainer from './MapContainer';
import SafeAreaWrapper from './SafeAreaWrapper';
import type { GeoJSON, MapCoordinates } from '../../types/mapAdapter';

export interface MapViewProps {
  /**
   * Country GeoJSON data for map display
   */
  geoJson: GeoJSON | null;

  /**
   * Current map center coordinates
   */
  center: MapCoordinates;

  /**
   * Map zoom level
   */
  zoom: number;

  /**
   * Country details content for the bottom drawer
   */
  detailsContent?: React.ReactNode;

  /**
   * Map theme
   */
  theme?: 'light' | 'dark';

  /**
   * Custom className for the map section
   */
  mapClassName?: string;

  /**
   * Custom className for the details section
   */
  detailsClassName?: string;
}

/**
 * MapView Component
 * Displays map on top (40% height) and scrollable details below (60% height)
 */
export const MapView: React.FC<MapViewProps> = ({
  geoJson,
  center,
  zoom,
  detailsContent,
  theme = 'light',
  mapClassName = '',
  detailsClassName = '',
}) => {
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const handleMapReady = useCallback(() => {
    setIsMapReady(true);
    setMapError(null);
  }, []);

  const handleMapError = useCallback((error: Error) => {
    console.error('Map error:', error);
    setMapError(error.message);
  }, []);

  return (
    <SafeAreaWrapper className="flex flex-col h-screen bg-gray-50">
      {/* Map Section - 40% height */}
      <div
        className={`w-full bg-white border-b border-gray-200 overflow-hidden ${mapClassName}`}
        style={{ height: '40%' }}
      >
        {mapError ? (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <div className="text-center">
              <p className="text-red-600 font-semibold mb-2">Map Error</p>
              <p className="text-red-500 text-sm">{mapError}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            <MapContainer
              center={center}
              zoom={zoom}
              geoJson={geoJson}
              theme={theme}
              onMapReady={handleMapReady}
              onError={handleMapError}
            />
            {!isMapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Details Section - 60% height, scrollable */}
      <div
        className={`w-full overflow-y-auto flex-1 bg-white ${detailsClassName}`}
        style={{ height: '60%' }}
      >
        {detailsContent ? (
          <div className="p-4 sm:p-6 max-w-full">{detailsContent}</div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select a country to view details</p>
          </div>
        )}
      </div>
    </SafeAreaWrapper>
  );
};

export default MapView;
