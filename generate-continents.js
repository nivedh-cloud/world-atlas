#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as topojson from 'topojson-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read countries info to get continent mapping
const countriesInfo = JSON.parse(fs.readFileSync(path.join(__dirname, 'src/data/countries-info.json'), 'utf8'));
const countryTopoDir = path.join(__dirname, 'public/topojson');
const continentDir = path.join(__dirname, 'public/topojson/continents');

// Create continents directory if it doesn't exist
if (!fs.existsSync(continentDir)) {
  fs.mkdirSync(continentDir, { recursive: true });
}

// Map country code to country name (for file lookup)
const codeToName = {};
countriesInfo.forEach(c => {
  codeToName[c.code] = c.name;
});

// Group countries by continent
const continentCountries = {};
countriesInfo.forEach(c => {
  if (!continentCountries[c.continent]) {
    continentCountries[c.continent] = [];
  }
  continentCountries[c.continent].push(c);
});

console.log('Continents found:', Object.keys(continentCountries));

// For each continent, merge all country topofiles
Object.entries(continentCountries).forEach(([continent, countries]) => {
  const allFeatures = [];
  let sourceCount = 0;
  let featureCount = 0;

  countries.forEach(country => {
    const filename = country.name.toLowerCase() + '.json';
    const filePath = path.join(countryTopoDir, filename);

    if (fs.existsSync(filePath)) {
      try {
        const topoData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Convert TopoJSON to GeoJSON using topojson-client
        if (topoData.objects) {
          Object.keys(topoData.objects).forEach(key => {
            const geoJSON = topojson.feature(topoData, topoData.objects[key]);
            if (geoJSON && geoJSON.features) {
              geoJSON.features.forEach(feat => {
                feat.properties = feat.properties || {};
                feat.properties.country = country.name;
                feat.properties.code = country.code;
                feat.properties.continent = continent;
                allFeatures.push(feat);
                featureCount++;
              });
            }
          });
        }
        sourceCount++;
      } catch (e) {
        console.warn(`  Warning: Failed to parse ${filename}: ${e.message}`);
      }
    }
  });

  // Create a GeoJSON feature collection for this continent
  const continentGeoJSON = {
    type: 'FeatureCollection',
    features: allFeatures,
  };

  // Save as GeoJSON
  const continentName = continent.toLowerCase().replace(/\s+/g, '-');
  const geoJsonPath = path.join(continentDir, `${continentName}.json`);
  
  fs.writeFileSync(geoJsonPath, JSON.stringify(continentGeoJSON, null, 2));
  console.log(`✓ ${continent}: ${sourceCount} countries → ${featureCount} features → ${geoJsonPath}`);
});

console.log('\nDone! Continent geofences generated in', continentDir);
