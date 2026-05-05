/**
 * Convert all GeoJSON files to TopoJSON format
 * TopoJSON is 40-50% smaller than GeoJSON
 */

import fs from 'fs';
import path from 'path';
import * as topojson from 'topojson-server';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geojsonDir = path.join(__dirname, 'public', 'geojson');
const topojsonDir = path.join(__dirname, 'public', 'topojson');

// Create topojson directory if it doesn't exist
if (!fs.existsSync(topojsonDir)) {
  fs.mkdirSync(topojsonDir, { recursive: true });
  console.log(`✓ Created ${topojsonDir}`);
}

// Get all GeoJSON files
const files = fs.readdirSync(geojsonDir).filter(f => f.endsWith('.geojson'));
console.log(`Found ${files.length} GeoJSON files to convert\n`);

let converted = 0;
let failed = 0;
let totalOriginalSize = 0;
let totalCompressedSize = 0;

files.forEach((file, index) => {
  try {
    const inputPath = path.join(geojsonDir, file);
    const outputPath = path.join(topojsonDir, file.replace('.geojson', '.json'));
    
    // Read GeoJSON
    const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
    
    // Convert to TopoJSON
    const topo = topojson.topology({ collection: geojson }, 1e5);
    
    // Write TopoJSON
    const topoJsonString = JSON.stringify(topo);
    fs.writeFileSync(outputPath, topoJsonString, 'utf-8');
    
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const reduction = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);
    
    totalOriginalSize += originalSize;
    totalCompressedSize += compressedSize;
    
    console.log(
      `[${index + 1}/${files.length}] ${file} → ${(compressedSize / 1024).toFixed(1)}KB (-${reduction}%)`
    );
    
    converted++;
  } catch (error) {
    console.error(`✗ Failed to convert ${file}:`, error.message);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`✓ Conversion complete!`);
console.log(`  Converted: ${converted} files`);
console.log(`  Failed: ${failed} files`);
console.log(`  Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Total compressed size: ${(totalCompressedSize / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Overall reduction: ${(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100).toFixed(1)}%`);
console.log('='.repeat(60));
