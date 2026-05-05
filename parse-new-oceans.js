import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Analyzing NEW oceans.json structure...\n');

try {
  const rawData = fs.readFileSync(oceansPath, 'utf8');
  const data = JSON.parse(rawData);
  
  console.log('File size:', (rawData.length / 1024 / 1024).toFixed(2), 'MB');
  console.log('\nTop-level keys:', Object.keys(data));
  console.log('Data type:', data.type);
  
  // Check if FeatureCollection
  if (data.type === 'FeatureCollection') {
    console.log('\n✓ Format: GeoJSON FeatureCollection');
    console.log('Features count:', data.features?.length);
    
    if (data.features && data.features.length > 0) {
      console.log('\n--- First 15 Features ---');
      for (let i = 0; i < Math.min(15, data.features.length); i++) {
        const feature = data.features[i];
        console.log(`\n${i + 1}. ${feature.properties?.name || feature.properties?.NAME || 'Unknown'}`);
        console.log(`   Geometry type: ${feature.geometry?.type}`);
        console.log(`   Properties:`, JSON.stringify(feature.properties, null, 2).split('\n').slice(0, 5).join('\n'));
      }
      
      // Extract all ocean names
      const oceanNames = new Set();
      data.features.forEach(f => {
        if (f.properties?.name) oceanNames.add(f.properties.name);
        if (f.properties?.NAME) oceanNames.add(f.properties.NAME);
      });
      
      if (oceanNames.size > 0) {
        console.log('\n\n--- All Ocean Names ---');
        Array.from(oceanNames).sort().forEach(name => console.log(`• ${name}`));
      }
    }
  }
  // Check if TopoJSON
  else if (data.objects) {
    console.log('\n✓ Format: TopoJSON');
    console.log('Objects:', Object.keys(data.objects));
    Object.keys(data.objects).forEach(key => {
      console.log(`  - ${key}: ${data.objects[key].geometries?.length || 0} geometries`);
    });
  }
  
} catch (error) {
  console.error('Error:', error.message);
}
