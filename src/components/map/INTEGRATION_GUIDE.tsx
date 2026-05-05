/**
 * Integration Guide: Using MapProvider System in Your App
 * 
 * This file demonstrates how to integrate the map system into your existing React app.
 */

import React, { useState, useEffect } from 'react';
import { MapView } from './MapView';
import { useMapConfig } from '../../config/mapConfig';
import type { MapCoordinates, GeoJSON } from '../../types/mapAdapter';

/**
 * Step 1: Define Country Data Type
 */
interface CountryData {
  name: string;
  center: MapCoordinates;
  zoom: number;
  geoJson: GeoJSON | null;
  details: {
    capital?: string;
    population?: string;
    area?: string;
    languages?: string;
    continent?: string;
    gdp?: string;
  };
}

/**
 * Step 2: Create Country Details Component
 */
interface CountryDetailsProps {
  country: CountryData;
  isLoading?: boolean;
}

const CountryDetails: React.FC<CountryDetailsProps> = ({ country, isLoading }) => {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-5 bg-gray-100 rounded w-32"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{country.name}</h1>
        <p className="text-gray-600">Explore detailed information about this country</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {country.details.capital && (
          <div className="border-l-4 border-blue-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Capital</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.capital}</p>
          </div>
        )}

        {country.details.population && (
          <div className="border-l-4 border-green-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Population</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.population}</p>
          </div>
        )}

        {country.details.area && (
          <div className="border-l-4 border-purple-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Area</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.area}</p>
          </div>
        )}

        {country.details.continent && (
          <div className="border-l-4 border-orange-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Continent</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.continent}</p>
          </div>
        )}

        {country.details.languages && (
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">Languages</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.languages}</p>
          </div>
        )}

        {country.details.gdp && (
          <div className="border-l-4 border-indigo-500 pl-4">
            <p className="text-gray-600 text-sm font-medium mb-1">GDP</p>
            <p className="text-lg font-semibold text-gray-900">{country.details.gdp}</p>
          </div>
        )}
      </div>

      {/* Add more sections as needed */}
      <div className="pt-4 border-t border-gray-200">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          View on Wikipedia
        </button>
      </div>
    </div>
  );
};

/**
 * Step 3: Create Country Selector Component
 */
interface CountrySelectorProps {
  countries: CountryData[];
  selectedCountry: CountryData;
  onSelectCountry: (country: CountryData) => void;
}

const CountrySelector: React.FC<CountrySelectorProps> = ({
  countries,
  selectedCountry,
  onSelectCountry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-full p-4 bg-white border-b border-gray-200">
      <input
        type="text"
        placeholder="Search countries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-32 overflow-y-auto">
        {filtered.map((country) => (
          <button
            key={country.name}
            onClick={() => onSelectCountry(country)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              selectedCountry.name === country.name
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {country.name}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Step 4: Create Main App Integration
 */
export const AppWithMapProvider: React.FC = () => {
  const config = useMapConfig();
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [isLoadingGeoJson, setIsLoadingGeoJson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const countries: CountryData[] = [
    {
      name: 'Australia',
      center: { lat: -25.2744, lng: 133.7751 },
      zoom: 4,
      geoJson: null,
      details: {
        capital: 'Canberra',
        population: '26,068,792',
        area: '7,692,024 km²',
        languages: 'English',
        continent: 'Oceania',
        gdp: '$1.376 trillion',
      },
    },
    {
      name: 'United States',
      center: { lat: 37.0902, lng: -95.7129 },
      zoom: 3,
      geoJson: null,
      details: {
        capital: 'Washington, D.C.',
        population: '338,289,857',
        area: '9,833,517 km²',
        languages: 'English',
        continent: 'North America',
        gdp: '$26.7 trillion',
      },
    },
    {
      name: 'Germany',
      center: { lat: 51.1657, lng: 10.4515 },
      zoom: 5,
      geoJson: null,
      details: {
        capital: 'Berlin',
        population: '84,405,000',
        area: '357,022 km²',
        languages: 'German',
        continent: 'Europe',
        gdp: '$4.6 trillion',
      },
    },
  ];

  // Initialize with first country
  useEffect(() => {
    if (!selectedCountry && countries.length > 0) {
      setSelectedCountry(countries[0]);
    }
  }, [selectedCountry]);

  // Load GeoJSON when country changes
  useEffect(() => {
    if (!selectedCountry) return;

    const loadGeoJson = async () => {
      setIsLoadingGeoJson(true);
      setError(null);

      try {
        // Replace with your actual GeoJSON file path
        const response = await fetch(
          `/geojson/${selectedCountry.name.toLowerCase().replace(/\s+/g, '-')}.geojson`
        );

        if (!response.ok) {
          throw new Error(`Failed to load GeoJSON: ${response.statusText}`);
        }

        const geoJson = await response.json();

        // Update selected country with GeoJSON
        setSelectedCountry((prev) =>
          prev ? { ...prev, geoJson } : null
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error loading GeoJSON:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoadingGeoJson(false);
      }
    };

    loadGeoJson();
  }, [selectedCountry?.name]);

  const handleSelectCountry = (country: CountryData) => {
    setSelectedCountry(country);
  };

  if (!selectedCountry) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      {/* Header with provider info */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Country Explorer</h1>
          <div className="text-sm text-gray-600">
            Using: <span className="font-semibold text-blue-600">{config.provider}</span>
          </div>
        </div>
      </div>

      {/* Country Selector */}
      <CountrySelector
        countries={countries}
        selectedCountry={selectedCountry}
        onSelectCountry={handleSelectCountry}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Map and Details */}
      <div className="flex-1 overflow-hidden">
        <MapView
          geoJson={selectedCountry.geoJson}
          center={selectedCountry.center}
          zoom={selectedCountry.zoom}
          theme="light"
          detailsContent={
            <CountryDetails
              country={selectedCountry}
              isLoading={isLoadingGeoJson}
            />
          }
          mapClassName="shadow-md"
          detailsClassName="bg-white"
        />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 text-center text-sm text-gray-600">
        <p>
          Built with React + Capacitor + MapProvider System
          {config.enableDebug && ' (Debug Mode Enabled)'}
        </p>
      </div>
    </div>
  );
};

export default AppWithMapProvider;
