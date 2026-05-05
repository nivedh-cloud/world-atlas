import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Reading oceans.json...\n');

try {
  const data = JSON.parse(fs.readFileSync(oceansPath, 'utf8'));
  
  console.log('File Structure:');
  console.log('==============');
  
  // Check if it's TopoJSON format
  if (data.objects) {
    console.log('Format: TopoJSON');
    console.log('Available objects:', Object.keys(data.objects));
    
    // Get features from objects
    Object.keys(data.objects).forEach(objName => {
      const obj = data.objects[objName];
      console.log(`\n  ${objName}:`);
      console.log(`    - Type: ${obj.type}`);
      if (Array.isArray(obj.geometries)) {
        console.log(`    - Geometries count: ${obj.geometries.length}`);
        
        // Extract ocean names from properties
        const names = new Set();
        obj.geometries.forEach((geom, idx) => {
          if (geom.properties?.name) {
            names.add(geom.properties.name);
          }
        });
        
        if (names.size > 0) {
          console.log(`    - Ocean names found:`);
          Array.from(names).forEach(name => {
            console.log(`      • ${name}`);
          });
        }
      }
    });
  }
  
  // Check if it's GeoJSON format
  if (data.type === 'FeatureCollection') {
    console.log('Format: GeoJSON FeatureCollection');
    console.log(`Features count: ${data.features?.length || 0}`);
    
    if (data.features) {
      const names = new Set();
      data.features.forEach(feature => {
        if (feature.properties?.name) {
          names.add(feature.properties.name);
        }
      });
      
      if (names.size > 0) {
        console.log('\nOcean names found:');
        Array.from(names).forEach(name => {
          console.log(`  • ${name}`);
        });
      }
    }
  }
  
  // Check file size
  const stats = fs.statSync(oceansPath);
  console.log(`\nFile size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  
} catch (error) {
  console.error('Error reading file:', error.message);
}
