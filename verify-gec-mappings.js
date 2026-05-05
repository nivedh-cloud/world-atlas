#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Read countries data
const countriesFile = fs.readFileSync('./src/data/countries.json', 'utf8');
const countries = JSON.parse(countriesFile);

// Read GEC mappings
const gecMappingsFile = fs.readFileSync('./src/utils/gecMapping.ts', 'utf8');

// Extract gecToCountryMapping from TS file
const gecMappingMatch = gecMappingsFile.match(/export const gecToCountryMapping.*?(?=\n\n)/s);
const gecCountriesList = [];
const gecCodeMatches = gecMappingsFile.matchAll(/"([a-z]{2})": \{ gecCode: "[a-z]{2}", countryName: "([^"]+)"/g);
for (const match of gecCodeMatches) {
  gecCountriesList.push({ gecCode: match[1], countryName: match[2] });
}

// Extract countryNameAliases from TS file
const aliasesMatch = gecMappingsFile.match(/const countryNameAliases: Record<string, string> = \{([\s\S]*?)\};/);
const aliases = {};
if (aliasesMatch) {
  const aliasLines = aliasesMatch[1].split('\n');
  for (const line of aliasLines) {
    const match = line.match(/"([^"]+)":\s*"([a-z]{2})"/);
    if (match) {
      aliases[match[1].toLowerCase()] = match[2];
    }
  }
}

// Function to find GEC code for a country
function getGecCode(countryName) {
  const lower = countryName.toLowerCase();
  
  // Check aliases first
  if (aliases[lower]) {
    return aliases[lower];
  }
  
  // Direct match
  for (const item of gecCountriesList) {
    if (item.countryName.toLowerCase() === lower) {
      return item.gecCode;
    }
  }
  
  // Partial match
  for (const item of gecCountriesList) {
    if (item.countryName.toLowerCase().includes(lower) || lower.includes(item.countryName.toLowerCase())) {
      return item.gecCode;
    }
  }
  
  return null;
}

// Check each country
const results = {
  total: countries.length,
  found: [],
  missing: [],
  noFactbookFile: []
};

for (const country of countries) {
  const gecCode = getGecCode(country.name);
  
  if (!gecCode) {
    results.missing.push(country.name);
  } else {
    const factbookPath = `./public/factbook.json-master/${gecCode}.json`;
    if (!fs.existsSync(factbookPath)) {
      results.noFactbookFile.push({
        country: country.name,
        gecCode: gecCode,
        factbookFile: `${gecCode}.json`
      });
    } else {
      results.found.push({
        country: country.name,
        gecCode: gecCode
      });
    }
  }
}

// Print results
console.log('\n========== GEC MAPPING VERIFICATION REPORT ==========\n');
console.log(`Total Countries: ${results.total}`);
console.log(`Countries with valid GEC codes and factbook files: ${results.found.length}`);
console.log(`Countries missing GEC code mapping: ${results.missing.length}`);
console.log(`Countries with GEC code but missing factbook file: ${results.noFactbookFile.length}`);

if (results.missing.length > 0) {
  console.log('\n❌ MISSING GEC CODE MAPPINGS:');
  results.missing.forEach(country => console.log(`  - ${country}`));
}

if (results.noFactbookFile.length > 0) {
  console.log('\n⚠️  GEC CODE EXISTS BUT FACTBOOK FILE MISSING:');
  results.noFactbookFile.forEach(item => {
    console.log(`  - ${item.country} (GEC: ${item.gecCode}) -> missing ${item.factbookFile}`);
  });
}

if (results.missing.length === 0 && results.noFactbookFile.length === 0) {
  console.log('\n✅ ALL COUNTRIES HAVE VALID GEC CODES AND FACTBOOK FILES!');
} else {
  console.log('\n⚠️  ISSUES FOUND - Please fix the above mappings or files.');
}

console.log('\n=====================================================\n');
