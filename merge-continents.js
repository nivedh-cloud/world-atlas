import fs from 'fs';
import path from 'path';

const continentsDir = './public/topojson/continents';
const files = ['africa.json', 'antarctica.json', 'asia.json', 'europe.json', 'north-america.json', 'oceania.json', 'south-america.json'];

const mergedFeatures = [];

files.forEach(file => {
  const filePath = path.join(continentsDir, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (data.features) {
      mergedFeatures.push(...data.features);
    }
  }
});

const continentsJSON = {
  type: 'FeatureCollection',
  features: mergedFeatures
};

fs.writeFileSync(path.join(continentsDir, 'continents.json'), JSON.stringify(continentsJSON, null, 2));
console.log(`✓ Merged ${files.length} continent files into continents.json with ${mergedFeatures.length} features`);
