import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Extracting ocean/sea names from oceans.json...\n');

try {
  const data = JSON.parse(fs.readFileSync(oceansPath, 'utf8'));
  
  if (data.objects && data.objects['oceans-seas.geo']) {
    const geometries = data.objects['oceans-seas.geo'].geometries;
    const names = new Set();
    
    geometries.forEach((geom) => {
      if (geom.properties?.name) {
        names.add(geom.properties.name);
      }
    });
    
    console.log(`Total geometries: ${geometries.length}`);
    console.log(`Unique names found: ${names.size}\n`);
    
    console.log('Ocean/Sea Names:');
    console.log('================');
    
    const sortedNames = Array.from(names).sort();
    sortedNames.forEach((name, idx) => {
      console.log(`${idx + 1}. ${name}`);
    });
  }
  
} catch (error) {
  console.error('Error reading file:', error.message);
}
