import fs from 'fs';
import path from 'path';

const continentsDir = './public/topojson/continents';
const outputFile = './public/topojson/continents/continents.json';

// Map filename to continent name
const filenameToContinentMap = {
  'africa.json': 'Africa',
  'antarctica.json': 'Antarctica',
  'asia.json': 'Asia',
  'australia.json': 'Australia',
  'europe.json': 'Europe',
  'north-america.json': 'North America',
  'oceania.json': 'Oceania',
  'south-america.json': 'South America',
};

try {
  // Create the main FeatureCollection
  const mergedData = {
    type: 'FeatureCollection',
    features: [],
  };

  // Read and merge each continent file
  Object.entries(filenameToContinentMap).forEach(([filename, continentName]) => {
    const filePath = path.join(continentsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filename}`);
      return;
    }

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      // Handle single feature or FeatureCollection
      if (data.type === 'Feature') {
        // Add continent property
        data.properties = data.properties || {};
        data.properties.continent = continentName;
        mergedData.features.push(data);
      } else if (data.type === 'FeatureCollection' && data.features) {
        // Add continent property to all features
        data.features.forEach((feature) => {
          feature.properties = feature.properties || {};
          feature.properties.continent = continentName;
          mergedData.features.push(feature);
        });
      }

      console.log(`✓ Merged ${filename}: ${data.features ? data.features.length : 1} feature(s)`);
    } catch (error) {
      console.error(`✗ Error reading ${filename}:`, error.message);
    }
  });

  // Write the merged file
  fs.writeFileSync(outputFile, JSON.stringify(mergedData, null, 2));
  console.log(`\n✅ Successfully created ${outputFile} with ${mergedData.features.length} total features`);
  console.log(`\nContinents included:`);
  const continentsSet = new Set(mergedData.features.map(f => f.properties?.continent));
  continentsSet.forEach(c => console.log(`  - ${c}`));
} catch (error) {
  console.error('Error merging continents:', error);
}
