import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { feature } from 'topojson-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const oceansPath = path.join(__dirname, 'public/topojson/oceans/oceans.json');

console.log('Parsing oceans.json (TopoJSON) and separating into individual oceans...\n');

try {
  const topoData = JSON.parse(fs.readFileSync(oceansPath, 'utf8'));
  
  console.log('Format: TopoJSON');
  
  if (topoData.objects && topoData.objects['oceans-seas.geo']) {
    const geometryCollection = topoData.objects['oceans-seas.geo'];
    console.log('Geometries count:', geometryCollection.geometries?.length);
    
    // Extract and group by ocean name
    const oceanMap = new Map();
    
    geometryCollection.geometries?.forEach((geom, idx) => {
      try {
        // Convert single geometry to feature
        const geoFeature = feature(topoData, geom);
        
        if (geoFeature && geoFeature.geometry) {
          const oceanName = geom.properties?.NAME || geom.properties?.name || `Ocean_${idx}`;
          
          if (!oceanMap.has(oceanName)) {
            oceanMap.set(oceanName, []);
          }
          
          oceanMap.get(oceanName).push({
            type: 'Feature',
            geometry: geoFeature.geometry,
            properties: geom.properties || { name: oceanName }
          });
        }
      } catch (e) {
        console.warn(`Skipped geometry ${idx}`);
      }
    });
    
    console.log(`\nExtracted ${oceanMap.size} unique oceans:\n`);
    
    let oceanNumber = 1;
    oceanMap.forEach((features, oceanName) => {
      console.log(`${oceanNumber}. ${oceanName}`);
      console.log(`   Features: ${features.length}`);
      oceanNumber++;
    });
    
    // Create separate files
    console.log('\n\nCreating individual ocean files...\n');
    
    const oceansDir = path.join(__dirname, 'public/topojson/oceans');
    
    oceanMap.forEach((features, oceanName) => {
      const fileName = oceanName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      
      const oceanFile = path.join(oceansDir, `${fileName}.json`);
      
      const oceanFeatureCollection = {
        type: 'FeatureCollection',
        features: features
      };
      
      fs.writeFileSync(oceanFile, JSON.stringify(oceanFeatureCollection, null, 2));
      console.log(`✓ Created: ${fileName}.json (${features.length} features)`);
    });
    
    console.log('\n\n✅ Done! Individual ocean files have been created in public/topojson/oceans/');
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
