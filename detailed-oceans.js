import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Detailed inspection of NEW oceans.json...\n');

try {
  const data = JSON.parse(fs.readFileSync(oceansPath, 'utf8'));
  
  if (data.objects?.oceans) {
    const oceans = data.objects.oceans;
    console.log('Oceans object:');
    console.log('- Type:', oceans.type);
    console.log('- Geometries:', oceans.geometries?.length);
    
    if (oceans.geometries && oceans.geometries.length > 0) {
      console.log('\nGeometry details:');
      oceans.geometries.forEach((geom, idx) => {
        console.log(`\n${idx + 1}. Geometry:`);
        console.log('   - Type:', geom.type);
        console.log('   - Properties:', JSON.stringify(geom.properties, null, 2));
        
        if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
          console.log('   - Arcs:', JSON.stringify(geom.arcs).substring(0, 100) + '...');
        }
      });
    }
  }
  
  // Also check arc info
  console.log('\n\nArc information:');
  console.log('- Total arcs:', data.arcs?.length);
  console.log('- Transform:', data.transform);
  
} catch (error) {
  console.error('Error:', error.message);
}
