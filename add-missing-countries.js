import fs from 'fs';

// Read existing countries data
const countriesInfo = JSON.parse(fs.readFileSync('./src/data/countries-info.json', 'utf8'));

// New countries to add (26 missing ones)
const newCountries = [
  {"name": "barbados", "code": "BB", "capital": "Bridgetown", "population": 287025, "area": 430, "continent": "North America", "landlocked": false, "currencies": [{"code": "BBD", "name": "Barbadian dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Barbadian", "timezones": ["UTC−04:00"]},
  {"name": "cape verde", "code": "CV", "capital": "Praia", "population": 597051, "area": 4033, "continent": "Africa", "landlocked": false, "currencies": [{"code": "CVE", "name": "Cape Verdean escudo", "symbol": "$"}], "languages": {"pov": "Cape Verdean Creole", "por": "Portuguese"}, "demonym": "Cape Verdean", "timezones": ["UTC−01:00"]},
  {"name": "comoros", "code": "KM", "capital": "Moroni", "population": 869601, "area": 2235, "continent": "Africa", "landlocked": false, "currencies": [{"code": "KMF", "name": "Comorian franc", "symbol": "Fr"}], "languages": {"ara": "Arabic", "fra": "French", "zdj": "Comorian"}, "demonym": "Comoran", "timezones": ["UTC+03:00"]},
  {"name": "dominica", "code": "DM", "capital": "Roseau", "population": 71293, "area": 751, "continent": "North America", "landlocked": false, "currencies": [{"code": "XCD", "name": "East Caribbean dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Dominican", "timezones": ["UTC−04:00"]},
  {"name": "grenada", "code": "GD", "capital": "Saint George's", "population": 125438, "area": 344, "continent": "North America", "landlocked": false, "currencies": [{"code": "XCD", "name": "East Caribbean dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Grenadian", "timezones": ["UTC−04:00"]},
  {"name": "liechtenstein", "code": "LI", "capital": "Vaduz", "population": 39327, "area": 160, "continent": "Europe", "landlocked": true, "currencies": [{"code": "CHF", "name": "Swiss franc", "symbol": "₣"}], "languages": {"deu": "German"}, "demonym": "Liechtensteiner", "timezones": ["UTC+01:00"]},
  {"name": "maldives", "code": "MV", "capital": "Malé", "population": 540542, "area": 300, "continent": "Asia", "landlocked": false, "currencies": [{"code": "MVR", "name": "Maldivian rufiyaa", "symbol": "Rf"}], "languages": {"div": "Dhivehi"}, "demonym": "Maldivian", "timezones": ["UTC+05:00"]},
  {"name": "marshall islands", "code": "MH", "capital": "Majuro", "population": 42050, "area": 181, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "USD", "name": "United States dollar", "symbol": "$"}], "languages": {"mah": "Marshallese", "eng": "English"}, "demonym": "Marshallese", "timezones": ["UTC+12:00"]},
  {"name": "mauritius", "code": "MU", "capital": "Port Louis", "population": 1299803, "area": 2040, "continent": "Africa", "landlocked": false, "currencies": [{"code": "MUR", "name": "Mauritian rupee", "symbol": "₨"}], "languages": {"mfe": "Mauritian Creole", "eng": "English", "fra": "French"}, "demonym": "Mauritian", "timezones": ["UTC+04:00"]},
  {"name": "micronesia", "code": "FM", "capital": "Palikir", "population": 116254, "area": 702, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "USD", "name": "United States dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Micronesian", "timezones": ["UTC+11:00"]},
  {"name": "monaco", "code": "MC", "capital": "Monaco", "population": 36469, "area": 2.02, "continent": "Europe", "landlocked": false, "currencies": [{"code": "EUR", "name": "Euro", "symbol": "€"}], "languages": {"fra": "French"}, "demonym": "Monégasque", "timezones": ["UTC+01:00"]},
  {"name": "nauru", "code": "NR", "capital": "Yaren", "population": 10900, "area": 21, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "AUD", "name": "Australian dollar", "symbol": "$"}], "languages": {"nau": "Nauruan", "eng": "English"}, "demonym": "Nauruan", "timezones": ["UTC+12:00"]},
  {"name": "palau", "code": "PW", "capital": "Ngerulmud", "population": 18055, "area": 459, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "USD", "name": "United States dollar", "symbol": "$"}], "languages": {"pau": "Palauan", "eng": "English"}, "demonym": "Palauan", "timezones": ["UTC+09:00"]},
  {"name": "saint kitts and nevis", "code": "KN", "capital": "Basseterre", "population": 47000, "area": 261, "continent": "North America", "landlocked": false, "currencies": [{"code": "XCD", "name": "East Caribbean dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Kittitian or Nevisian", "timezones": ["UTC−04:00"]},
  {"name": "saint lucia", "code": "LC", "capital": "Castries", "population": 181889, "area": 616, "continent": "North America", "landlocked": false, "currencies": [{"code": "XCD", "name": "East Caribbean dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Saint Lucian", "timezones": ["UTC−04:00"]},
  {"name": "saint vincent and the grenadines", "code": "VC", "capital": "Kingstown", "population": 110520, "area": 389, "continent": "North America", "landlocked": false, "currencies": [{"code": "XCD", "name": "East Caribbean dollar", "symbol": "$"}], "languages": {"eng": "English"}, "demonym": "Saint Vincentian", "timezones": ["UTC−04:00"]},
  {"name": "samoa", "code": "WS", "capital": "Apia", "population": 219998, "area": 2842, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "WST", "name": "Samoan tālā", "symbol": "T"}], "languages": {"smo": "Samoan", "eng": "English"}, "demonym": "Samoan", "timezones": ["UTC−11:00"]},
  {"name": "san marino", "code": "SM", "capital": "San Marino", "population": 34453, "area": 61, "continent": "Europe", "landlocked": true, "currencies": [{"code": "EUR", "name": "Euro", "symbol": "€"}], "languages": {"ita": "Italian"}, "demonym": "Sammarinese", "timezones": ["UTC+01:00"]},
  {"name": "sao tome and principe", "code": "ST", "capital": "São Tomé", "population": 230418, "area": 964, "continent": "Africa", "landlocked": false, "currencies": [{"code": "STN", "name": "São Tomean dobra", "symbol": "Db"}], "languages": {"por": "Portuguese"}, "demonym": "São Toméan", "timezones": ["UTC+00:00"]},
  {"name": "seychelles", "code": "SC", "capital": "Victoria", "population": 98462, "area": 455, "continent": "Africa", "landlocked": false, "currencies": [{"code": "SCR", "name": "Seychellois rupee", "symbol": "₨"}], "languages": {"sea": "Seychellois Creole", "eng": "English", "fra": "French"}, "demonym": "Seychellois", "timezones": ["UTC+04:00"]},
  {"name": "singapore", "code": "SG", "capital": "Singapore", "population": 5917600, "area": 728.3, "continent": "Asia", "landlocked": false, "currencies": [{"code": "SGD", "name": "Singapore dollar", "symbol": "$"}], "languages": {"zho": "Chinese", "eng": "English", "msa": "Malay", "tam": "Tamil"}, "demonym": "Singaporean", "timezones": ["UTC+08:00"]},
  {"name": "timor-leste", "code": "TL", "capital": "Dili", "population": 1341296, "area": 14874, "continent": "Asia", "landlocked": false, "currencies": [{"code": "USD", "name": "United States dollar", "symbol": "$"}], "languages": {"tet": "Tetum", "por": "Portuguese"}, "demonym": "East Timorese", "timezones": ["UTC+09:00"]},
  {"name": "tonga", "code": "TO", "capital": "Nuku'alofa", "population": 99900, "area": 747, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "TOP", "name": "Tongan paʻanga", "symbol": "T$"}], "languages": {"ton": "Tongan", "eng": "English"}, "demonym": "Tongan", "timezones": ["UTC+13:00"]},
  {"name": "tuvalu", "code": "TV", "capital": "Funafuti", "population": 12500, "area": 26, "continent": "Oceania", "landlocked": false, "currencies": [{"code": "AUD", "name": "Australian dollar", "symbol": "$"}], "languages": {"tvl": "Tuvaluan", "eng": "English"}, "demonym": "Tuvaluan", "timezones": ["UTC+12:00"]},
  {"name": "vatican city", "code": "VA", "capital": "Vatican City", "population": 801, "area": 0.44, "continent": "Europe", "landlocked": true, "currencies": [{"code": "EUR", "name": "Euro", "symbol": "€"}], "languages": {"ita": "Italian", "lat": "Latin"}, "demonym": "Vatican", "timezones": ["UTC+01:00"]},
];

// Find countries that already exist to avoid duplicates
const existingNames = new Set(countriesInfo.map(c => c.name.toLowerCase()));
const toAdd = newCountries.filter(country => !existingNames.has(country.name.toLowerCase()));

console.log(`\n📋 ADDING MISSING COUNTRIES TO DROPDOWN\n`);
console.log(`Existing countries: ${countriesInfo.length}`);
console.log(`New countries to add: ${toAdd.length}`);

// Add new countries
countriesInfo.push(...toAdd);

// Sort by name
countriesInfo.sort((a, b) => a.name.localeCompare(b.name));

// Write back to file
fs.writeFileSync('./src/data/countries-info.json', JSON.stringify(countriesInfo, null, 2));

console.log(`✅ Updated countries-info.json`);
console.log(`✨ Total countries: ${countriesInfo.length}`);
