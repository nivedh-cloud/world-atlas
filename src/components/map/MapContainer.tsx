/**
 * Map Container
 * Adapter pattern implementation that switches between map providers
 */

import React, { useMemo } from 'react';
import { useMapConfig } from '../../config/mapConfig';
import { MapLibreComponent } from './MapLibreAdapter';
import { GoogleMapsComponent } from './GoogleMapsAdapter';
import type { MapAdapterProps } from '../../types/mapAdapter';

/**
 * MapContainer Component
 * Automatically switches between MapLibre and Google Maps based on config
 */
export const MapContainer: React.FC<MapAdapterProps> = ({
  center,
  zoom,
  geoJson,
  theme,
  onMapReady,
  onError,
}) => {
  const config = useMapConfig();

  const MapComponent = useMemo(() => {
    if (config.provider === 'google') {
      return GoogleMapsComponent;
    }
    return MapLibreComponent;
  }, [config.provider]);

  if (config.enableDebug) {
    console.log(`Rendering map with provider: ${config.provider}`);
  }

  return (
    <MapComponent
      center={center}
      zoom={zoom}
      geoJson={geoJson}
      theme={theme}
      onMapReady={onMapReady}
      onError={onError}
    />
  );
};

export default MapContainer;
