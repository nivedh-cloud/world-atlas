import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Analyzing oceans.json structure...\n');

try {
  const data = JSON.parse(fs.readFileSync(oceansPath, 'utf8'));
  
  if (data.objects && data.objects['oceans-seas.geo']) {
    const geometries = data.objects['oceans-seas.geo'].geometries;
    
    console.log(`Total geometries: ${geometries.length}\n`);
    
    // Check first 10 geometries
    console.log('Sample Geometries:');
    console.log('==================');
    
    for (let i = 0; i < Math.min(10, geometries.length); i++) {
      const geom = geometries[i];
      console.log(`\n${i + 1}. Geometry:`);
      console.log(`   - Type: ${geom.type}`);
      console.log(`   - Properties:`, JSON.stringify(geom.properties, null, 2));
      
      // Show arcs info if available
      if (geom.arcs) {
        console.log(`   - Arcs length: ${JSON.stringify(geom.arcs).length}`);
      }
    }
    
    // Check if there's a metadata or names array
    console.log('\n\nFile top-level keys:', Object.keys(data));
    
    if (data.names) {
      console.log('\n\nAvailable names:');
      data.names.forEach((name, idx) => {
        console.log(`${idx}: ${name}`);
      });
    }
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}
