/**
 * Map System Usage Example
 * Shows how to integrate the MapProvider system into your app
 */

import React, { useState, useEffect } from 'react';
import { MapView } from './MapView';
import type { MapCoordinates, GeoJSON } from '../../types/mapAdapter';

/**
 * Example: Country Details Component
 */
const CountryDetailsExample: React.FC<{
  country: string;
  details?: {
    capital?: string;
    population?: string;
    area?: string;
    languages?: string;
  };
}> = ({ country, details }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">{country}</h2>

      {details && (
        <div className="grid grid-cols-2 gap-4">
          {details.capital && (
            <div>
              <p className="text-gray-600 text-sm">Capital</p>
              <p className="font-semibold text-gray-900">{details.capital}</p>
            </div>
          )}
          {details.population && (
            <div>
              <p className="text-gray-600 text-sm">Population</p>
              <p className="font-semibold text-gray-900">{details.population}</p>
            </div>
          )}
          {details.area && (
            <div>
              <p className="text-gray-600 text-sm">Area</p>
              <p className="font-semibold text-gray-900">{details.area}</p>
            </div>
          )}
          {details.languages && (
            <div>
              <p className="text-gray-600 text-sm">Languages</p>
              <p className="font-semibold text-gray-900">{details.languages}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Example: Complete Map Integration
 */
export const MapViewExample: React.FC = () => {
  const [_selectedCountry, _setSelectedCountry] = useState<string>('Australia');
  const [mapCenter, _setMapCenter] = useState<MapCoordinates>({
    lat: -25.2744,
    lng: 133.7751,
  });
  const [mapZoom, _setMapZoom] = useState(4);
  const [countryGeoJson, setCountryGeoJson] = useState<GeoJSON | null>(null);

  // Example: Load GeoJSON data
  useEffect(() => {
    const loadGeoJson = async () => {
      try {
        // Replace with actual GeoJSON file path
        const response = await fetch('/geojson/australia.geojson');
        const data = await response.json();
        setCountryGeoJson(data);
      } catch (error) {
        console.error('Failed to load GeoJSON:', error);
      }
    };

    loadGeoJson();
  }, []);

  const countryDetails = {
    capital: 'Canberra',
    population: '26,068,792',
    area: '7,692,024 km²',
    languages: 'English',
  };

  return (
    <MapView
      geoJson={countryGeoJson}
      center={mapCenter}
      zoom={mapZoom}
      theme="light"
      detailsContent={
        <CountryDetailsExample country="Australia" details={countryDetails} />
      }
      mapClassName="shadow-lg"
      detailsClassName="bg-gradient-to-b from-white to-gray-50"
    />
  );
};

export default MapViewExample;
