import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map source file names to target file names
const countryMappings = {
  'bahrain.json': 'bahrain.json',
  'barbados.json': 'barbados.json',
  'cape_verde.json': 'cape verde.json',
  'comoros.json': 'comoros.json',
  'dominica.json': 'dominica.json',
  'grenada.json': 'grenada.json',
  'liechtenstein.json': 'liechtenstein.json',
  'maldives.json': 'maldives.json',
  'marshall_islands.json': 'marshall islands.json',
  'mauritius.json': 'mauritius.json',
  'micronesia.json': 'micronesia.json',
  'monaco.json': 'monaco.json',
  'nauru.json': 'nauru.json',
  'palau.json': 'palau.json',
  'saint_kitts_and_nevis.json': 'saint kitts and nevis.json',
  'saint_lucia.json': 'saint lucia.json',
  'saint_vincent_and_the_grenadines.json': 'saint vincent and the grenadines.json',
  'samoa.json': 'samoa.json',
  'san_marino.json': 'san marino.json',
  'sao_tome_and_principe.json': 'sao tome and principe.json',
  'seychelles.json': 'seychelles.json',
  'singapore.json': 'singapore.json',
  'east_timor.json': 'timor-leste.json',
  'tonga.json': 'tonga.json',
  'tuvalu.json': 'tuvalu.json',
  'vatican.json': 'vatican city.json',
};

const sourceDir = 'E:/CurserProjects/Countrys-Geofences/world-geojson-develop/countries';
const targetDir = './public/topojson';

console.log('📋 COPYING MISSING COUNTRIES...\n');

let copied = 0;
let failed = 0;

Object.entries(countryMappings).forEach(([sourceFile, targetFile]) => {
  try {
    const sourcePath = path.join(sourceDir, sourceFile);
    const targetPath = path.join(targetDir, targetFile);

    // Read GeoJSON file
    const geojsonData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    // Write as GeoJSON (TopoJSON-client doesn't handle conversion easily, we'll keep as GeoJSON)
    // Our loader can handle both GeoJSON and TopoJSON
    fs.writeFileSync(targetPath, JSON.stringify(geojsonData, null, 2));

    console.log(`✅ ${sourceFile} → ${targetFile}`);
    copied++;
  } catch (error) {
    console.log(`❌ ${sourceFile}: ${error.message}`);
    failed++;
  }
});

console.log(`\n✨ Complete!`);
console.log(`✅ Copied: ${copied}`);
console.log(`❌ Failed: ${failed}`);
