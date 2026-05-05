import fs from 'fs';
import path from 'path';

// Read countries from countries-info.json
const countriesData = JSON.parse(
  fs.readFileSync('./src/data/countries-info.json', 'utf8')
);

// Get all country names
const countryNames = countriesData.map(c => c.name.toLowerCase());

// Get all TopoJSON files
const topojsonDir = './public/topojson';
const files = fs.readdirSync(topojsonDir);
const topoJsonFiles = files
  .filter(f => f.endsWith('.json') && f !== 'continents')
  .map(f => f.replace('.json', '').toLowerCase());

console.log(`\n📊 GEOFENCE DATA ANALYSIS\n`);
console.log(`Total countries in countries-info.json: ${countryNames.length}`);
console.log(`Total TopoJSON files: ${topoJsonFiles.length}`);

// Find missing countries
const missing = countryNames.filter(c => !topoJsonFiles.includes(c));
const notNeeded = topoJsonFiles.filter(f => !countryNames.includes(f));

console.log(`\n❌ MISSING GEOFENCE DATA (${missing.length} countries):`);
if (missing.length > 0) {
  missing.forEach((c, i) => {
    const country = countriesData.find(x => x.name.toLowerCase() === c);
    console.log(`  ${i + 1}. ${country.name} (${country.code})`);
  });
} else {
  console.log('  ✅ All countries have geofence data!');
}

console.log(`\n⚠️  EXTRA FILES NOT IN COUNTRIES LIST (${notNeeded.length}):`);
if (notNeeded.length > 0) {
  notNeeded.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f}.json`);
  });
} else {
  console.log('  ✅ No extra files');
}

// Show coverage
const coverage = ((countryNames.length - missing.length) / countryNames.length * 100).toFixed(2);
console.log(`\n📈 Coverage: ${coverage}% (${countryNames.length - missing.length}/${countryNames.length})`);
