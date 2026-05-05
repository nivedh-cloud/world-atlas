// List of all available countries
export const COUNTRIES = [
  "afghanistan",
  "albania",
  "algeria",
  "andorra",
  "angola",
  "antigua and barbuda",
  "argentina",
  "armenia",
  "australia",
  "austria",
  "azerbaijan",
  "bahamas",
  "bahrain",
  "bangladesh",
  "barbados",
  "belarus",
  "belgium",
  "belize",
  "benin",
  "bermuda",
  "bhutan",
  "bolivia",
  "bosnia and herzegovina",
  "botswana",
  "brazil",
  "brunei",
  "bulgaria",
  "burkina faso",
  "burundi",
  "cambodia",
  "cameroon",
  "canada",
  "cape verde",
  "central african republic",
  "chad",
  "chile",
  "china",
  "colombia",
  "comoros",
  "costa rica",
  "croatia",
  "cuba",
  "cyprus",
  "czech republic",
  "democratic republic of the congo",
  "denmark",
  "djibouti",
  "dominica",
  "dominican republic",
  "east timor",
  "ecuador",
  "egypt",
  "el salvador",
  "equatorial guinea",
  "eritrea",
  "estonia",
  "ethiopia",
  "falkland islands",
  "fiji",
  "finland",
  "france",
  "french guiana",
  "french southern and antarctic lands",
  "gabon",
  "gambia",
  "georgia",
  "germany",
  "ghana",
  "greece",
  "greenland",
  "grenada",
  "guatemala",
  "guinea bissau",
  "guinea",
  "guyana",
  "haiti",
  "honduras",
  "hungary",
  "iceland",
  "india",
  "indonesia",
  "iran",
  "iraq",
  "ireland",
  "israel",
  "italy",
  "ivory coast",
  "jamaica",
  "japan",
  "jordan",
  "kazakhstan",
  "kenya",
  "kiribati",
  "kosovo",
  "kuwait",
  "kyrgyzstan",
  "laos",
  "latvia",
  "lebanon",
  "lesotho",
  "liberia",
  "libya",
  "liechtenstein",
  "lithuania",
  "luxembourg",
  "macedonia",
  "madagascar",
  "malawi",
  "malaysia",
  "maldives",
  "mali",
  "malta",
  "marshall islands",
  "mauritania",
  "mauritius",
  "mexico",
  "micronesia",
  "moldova",
  "monaco",
  "mongolia",
  "montenegro",
  "morocco",
  "mozambique",
  "myanmar",
  "namibia",
  "nauru",
  "nepal",
  "netherlands",
  "new caledonia",
  "new zealand",
  "nicaragua",
  "niger",
  "nigeria",
  "north korea",
  "northern cyprus",
  "norway",
  "oman",
  "pakistan",
  "palau",
  "palestine",
  "panama",
  "papua new guinea",
  "paraguay",
  "peru",
  "philippines",
  "poland",
  "portugal",
  "puerto rico",
  "qatar",
  "republic of serbia",
  "republic of the congo",
  "romania",
  "russia",
  "rwanda",
  "saint kitts and nevis",
  "saint lucia",
  "saint vincent and the grenadines",
  "samoa",
  "san marino",
  "sao tome and principe",
  "saudi arabia",
  "senegal",
  "seychelles",
  "sierra leone",
  "singapore",
  "slovakia",
  "slovenia",
  "solomon islands",
  "somalia",
  "somaliland",
  "south africa",
  "south korea",
  "south sudan",
  "spain",
  "sri lanka",
  "sudan",
  "suriname",
  "swaziland",
  "sweden",
  "switzerland",
  "syria",
  "taiwan",
  "tajikistan",
  "tanzania",
  "thailand",
  "the bahamas",
  "timor-leste",
  "togo",
  "tonga",
  "trinidad and tobago",
  "tunisia",
  "turkey",
  "turkmenistan",
  "tuvalu",
  "uganda",
  "ukraine",
  "united arab emirates",
  "united kingdom",
  "united states",
  "uruguay",
  "uzbekistan",
  "vatican city",
  "vanuatu",
  "venezuela",
  "vietnam",
  "western sahara",
  "yemen",
  "zambia",
  "zimbabwe",
];

import countriesData from "../data/countries.json";

type CountriesJsonRow = { name: string; code: string };

function withBaseUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/** ISO 3166-1 alpha-2 (lowercase) → topojson filename slug (countries.json name). Statistics/Compare pass codes; the map uses names. */
const ISO2_CODE_TO_TOPO_SLUG: Record<string, string> = (countriesData as CountriesJsonRow[]).reduce(
  (acc, row) => {
    acc[row.code.toLowerCase()] = row.name;
    return acc;
  },
  {} as Record<string, string>,
);

export interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
  properties?: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: string;
  features: GeoJSONFeature[];
}

// Load GeoJSON file for a specific country
// Map country names to their actual GeoJSON/TopoJSON file names
const COUNTRY_FILE_MAP: Record<string, string> = {
  // Standard aliases
  'timor-leste': 'timor-leste',
  'east timor': 'timor-leste',
  'eswatini': 'eswatini',
  'swaziland': 'eswatini',
  // Recently renamed files (from the renaming script)
  'the bahamas': 'bahamas',
  'bahamas': 'bahamas',
  'republic of serbia': 'serbia',
  'serbia': 'serbia',
  'united republic of tanzania': 'tanzania',
  'tanzania': 'tanzania',
  'united states of america': 'united states',
  'united states': 'united states',
  'guinea bissau': 'guinea-bissau',
  'guinea-bissau': 'guinea-bissau',
  'macedonia': 'north macedonia',
  'north macedonia': 'north macedonia',
  // Newly added missing countries (with spaces/hyphens)
  'cape verde': 'cape verde',
  'saint kitts and nevis': 'saint kitts and nevis',
  'saint lucia': 'saint lucia',
  'saint vincent and the grenadines': 'saint vincent and the grenadines',
  'sao tome and principe': 'sao tome and principe',
  'san marino': 'san marino',
  'marshall islands': 'marshall islands',
  'vatican city': 'vatican city',
  // Territorial/Special cases (used as fallback)
  'falkland islands': 'falkland islands',
  'french guiana': 'french guiana',
  'french southern and antarctic lands': 'french southern and antarctic lands',
  'greenland': 'greenland',
  'new caledonia': 'new caledonia',
  'northern cyprus': 'northern cyprus',
  'puerto rico': 'puerto rico',
  'somaliland': 'somaliland',
  'west bank': 'west bank',
  'western sahara': 'western sahara',
  'palestine': 'palestine',
  'andorra': 'andorra',
  'antigua and barbuda': 'antigua and barbuda',
  'kiribati': 'kiribati',
};

function resolveTopoFileSlug(countryIdentifier: string): string {
  const raw = countryIdentifier.trim().toLowerCase();
  let fileName =
    /^[a-z]{2}$/.test(raw) && ISO2_CODE_TO_TOPO_SLUG[raw] ? ISO2_CODE_TO_TOPO_SLUG[raw] : raw;
  if (COUNTRY_FILE_MAP[fileName]) {
    fileName = COUNTRY_FILE_MAP[fileName];
  }
  return fileName;
}

/** ISO code or alias → canonical topo / COUNTRIES list slug (use for app state when mixing pickers). */
export function normalizeCountrySelectionKey(input: string): string {
  return resolveTopoFileSlug(input);
}

export const loadCountryGeoJSON = async (
  countryName: string
): Promise<GeoJSONFeatureCollection | null> => {
  try {
    const fileName = resolveTopoFileSlug(countryName);

    const url = withBaseUrl(`topojson/${encodeURIComponent(fileName)}.json`);
    
    console.log(`Loading GeoJSON/TopoJSON from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to load ${fileName}.json: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("text/html")) {
      console.error(
        `Got HTML instead of JSON for ${url} — usually a missing topo file or SPA fallback (requested slug: "${fileName}")`,
      );
      return null;
    }

    const data = await response.json();
    
    // Check if it's already GeoJSON format (Feature or FeatureCollection)
    if (data.type === "Feature" || data.type === "FeatureCollection") {
      console.log(`Loaded ${fileName}.json as GeoJSON (already in GeoJSON format)`);
      
      // Handle both Feature and FeatureCollection formats
      let featureCollection: GeoJSONFeatureCollection;
      
      if (data.type === "Feature") {
        // Convert single Feature to FeatureCollection
        featureCollection = {
          type: "FeatureCollection",
          features: [data as unknown as GeoJSONFeature]
        };
      } else {
        featureCollection = data as unknown as GeoJSONFeatureCollection;
      }
      
      console.log(`Successfully loaded ${fileName}.json as GeoJSON:`, featureCollection);
      return featureCollection;
    }
    
    // Otherwise, try to parse as TopoJSON
    if (data.objects && Object.keys(data.objects).length > 0) {
      console.log(`Loaded ${fileName}.json as TopoJSON, converting...`);
      
      // Dynamically import topojson-client to avoid Vite pre-optimization cache issues
      const { feature } = await import('topojson-client');
      
      // Get the first object (usually the country geometry)
      const objectKey = Object.keys(data.objects)[0];
      const geojson = feature(data, data.objects[objectKey]);
      
      // Handle both Feature and FeatureCollection formats
      let featureCollection: GeoJSONFeatureCollection;
      
      if (geojson.type === "Feature") {
        // Convert single Feature to FeatureCollection
        featureCollection = {
          type: "FeatureCollection",
          features: [geojson as unknown as GeoJSONFeature]
        };
      } else if (geojson.type === "FeatureCollection") {
        featureCollection = geojson as unknown as GeoJSONFeatureCollection;
      } else {
        console.error(`Invalid GeoJSON format for ${fileName}.json after TopoJSON conversion:`, geojson);
        return null;
      }
      
      console.log(`Successfully loaded ${fileName}.json (converted from TopoJSON):`, featureCollection);
      return featureCollection;
    }
    
    // If neither GeoJSON nor TopoJSON, it's invalid
    console.error(`Invalid format for ${fileName}.json - not GeoJSON or TopoJSON:`, data);
    return null;
  } catch (error) {
    console.error(`Error loading GeoJSON/TopoJSON for ${countryName}:`, error);
    return null;
  }
};

// Load continent GeoJSON
// Available continents with their file names
const CONTINENTS = [
  { name: 'Africa', file: 'africa.json' },
  { name: 'Antarctica', file: 'antarctica.json' },
  { name: 'Asia', file: 'asia.json' },
  { name: 'Australasia/Oceania', files: ['australia.json', 'oceania.json'] }, // Combined Australia + Oceania
  { name: 'Europe', file: 'europe.json' },
  { name: 'North America', file: 'north-america.json' },
  { name: 'South America', file: 'south-america.json' },
];

// Get list of available continents
export const getAvailableContinents = (): string[] => {
  return CONTINENTS.map(c => c.name);
};

// Available oceans - main 5 oceans
const OCEANS = [
  'Pacific Ocean',
  'Atlantic Ocean',
  'Indian Ocean',
  'Arctic Ocean',
  'Southern Ocean'
];

// Maps each ocean name to its new geofence file in the Oceans subfolder
const OCEAN_FILE_MAP: Record<string, string> = {
  'Pacific Ocean':  'Pacific',
  'Atlantic Ocean': 'Atlantic',
  'Indian Ocean':   'Indian',
  'Arctic Ocean':   'Arctic',
  'Southern Ocean': 'Southern',
};

// Get list of available oceans
export const getAvailableOceans = (): string[] => {
  return OCEANS;
};

// Load ocean GeoJSON from the new simple rectangle geofence files
export const loadOceanGeoJSON = async (
  oceanName: string
): Promise<GeoJSONFeatureCollection | null> => {
  try {
    const fileName = OCEAN_FILE_MAP[oceanName];
    if (!fileName) {
      console.error(`Unknown ocean: ${oceanName}`);
      return null;
    }

    const url = withBaseUrl(`topojson/oceans/Oceans/${fileName}.geojson`);
    console.log(`Loading ocean geofence: ${url}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to load ${fileName}.geojson: ${response.status}`);
      return null;
    }

    const data = await response.json() as GeoJSONFeatureCollection;

    if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
      // Stamp the proper ocean name onto every feature's properties
      const features: GeoJSONFeature[] = data.features.map(f => ({
        ...f,
        properties: { ...(f.properties ?? {}), name: oceanName },
      }));
      console.log(`✓ Loaded ${oceanName} (${features.length} feature(s))`);
      return { type: 'FeatureCollection', features };
    }

    console.error(`Unexpected format in ${fileName}.geojson`);
    return null;
  } catch (error) {
    console.error(`Error loading ocean GeoJSON for ${oceanName}:`, error);
    return null;
  }
};

export const loadContinentGeoJSON = async (
  continentName: string
): Promise<GeoJSONFeatureCollection | null> => {
  try {
    const continent = CONTINENTS.find(c => c.name === continentName);
    
    if (!continent) {
      console.error(`Continent not found: ${continentName}`);
      return null;
    }
    
    console.log(`Loading ${continentName} GeoJSON`);
    
    // Check if this continent has multiple files (like Australasia with Australia + Oceania)
    if (continent.files && Array.isArray(continent.files)) {
      console.log(`Loading multiple files for ${continentName}:`, continent.files);
      
      const allFeatures: GeoJSONFeature[] = [];
      
      for (const file of continent.files) {
        const url = withBaseUrl(`topojson/continents/${file}`);
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error(`Failed to load ${file}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        const data = await response.json();
        
        // Extract features from each file
        if (data.type === 'Feature') {
          allFeatures.push(data as GeoJSONFeature);
        } else if (data.type === 'FeatureCollection' && data.features) {
          allFeatures.push(...(data.features as GeoJSONFeature[]));
        }
      }
      
      if (allFeatures.length > 0) {
        const result: GeoJSONFeatureCollection = {
          type: 'FeatureCollection',
          features: allFeatures
        };
        console.log(`Successfully loaded ${allFeatures.length} features for ${continentName}`);
        return result;
      }
      
      console.error(`Failed to load features for ${continentName}`);
      return null;
    }
    
    // Single file loading (for other continents)
    const url = withBaseUrl(`topojson/continents/${continent.file}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to load ${continent.file}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    
    // Handle single Feature - wrap in FeatureCollection
    if (data.type === 'Feature') {
      const result: GeoJSONFeatureCollection = {
        type: 'FeatureCollection',
        features: [data as GeoJSONFeature]
      };
      console.log(`Successfully loaded ${continentName}`);
      return result;
    }
    
    // Handle FeatureCollection
    if (data.type === 'FeatureCollection') {
      console.log(`Successfully loaded ${data.features?.length || 0} features for ${continentName}`);
      return data as GeoJSONFeatureCollection;
    }
    
    console.error(`Invalid GeoJSON format for ${continent.file}:`, data);
    return null;
  } catch (error) {
    console.error(`Error loading continent GeoJSON for ${continentName}:`, error);
    return null;
  }
};


// Format country name for display (capitalize words)
export const formatCountryName = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Country to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  afghanistan: "🇦🇫",
  albania: "🇦🇱",
  algeria: "🇩🇿",
  angola: "🇦🇴",
  argentina: "🇦🇷",
  armenia: "🇦🇲",
  australia: "🇦🇺",
  austria: "🇦🇹",
  azerbaijan: "🇦🇿",
  bahamas: "🇧🇸",
  bahrain: "🇧🇭",
  bangladesh: "🇧🇩",
  barbados: "🇧🇧",
  belarus: "🇧🇾",
  belgium: "🇧🇪",
  belize: "🇧🇿",
  benin: "🇧🇯",
  bermuda: "🇧🇲",
  bhutan: "🇧🇹",
  bolivia: "🇧🇴",
  "bosnia and herzegovina": "🇧🇦",
  botswana: "🇧🇼",
  brazil: "🇧🇷",
  brunei: "🇧🇳",
  bulgaria: "🇧🇬",
  "burkina faso": "🇧🇫",
  burundi: "🇧🇮",
  cambodia: "🇰🇭",
  cameroon: "🇨🇲",
  canada: "🇨🇦",
  "central african republic": "🇨🇫",
  chad: "🇹🇩",
  chile: "🇨🇱",
  china: "🇨🇳",
  colombia: "🇨🇴",
  "costa rica": "🇨🇷",
  croatia: "🇭🇷",
  cuba: "🇨🇺",
  cyprus: "🇨🇾",
  "czech republic": "🇨🇿",
  "democratic republic of the congo": "🇨🇩",
  denmark: "🇩🇰",
  djibouti: "🇩🇯",
  "dominican republic": "🇩🇴",
  "east timor": "🇹🇱",
  ecuador: "🇪🇨",
  egypt: "🇪🇬",
  "el salvador": "🇸🇻",
  "equatorial guinea": "🇬🇶",
  eritrea: "🇪🇷",
  estonia: "🇪🇪",
  ethiopia: "🇪🇹",
  "falkland islands": "🇫🇰",
  fiji: "🇫🇯",
  finland: "🇫🇮",
  france: "🇫🇷",
  "french guiana": "🇬🇫",
  "french southern and antarctic lands": "🇹🇫",
  gabon: "🇬🇦",
  gambia: "🇬🇲",
  georgia: "🇬🇪",
  germany: "🇩🇪",
  ghana: "🇬🇭",
  greece: "🇬🇷",
  greenland: "🇬🇱",
  guatemala: "🇬🇹",
  "guinea bissau": "🇬🇼",
  guinea: "🇬🇳",
  guyana: "🇬🇾",
  haiti: "🇭🇹",
  honduras: "🇭🇳",
  hungary: "🇭🇺",
  iceland: "🇮🇸",
  india: "🇮🇳",
  indonesia: "🇮🇩",
  iran: "🇮🇷",
  iraq: "🇮🇶",
  ireland: "🇮🇪",
  israel: "🇮🇱",
  italy: "🇮🇹",
  "ivory coast": "🇨🇮",
  jamaica: "🇯🇲",
  japan: "🇯🇵",
  jordan: "🇯🇴",
  kazakhstan: "🇰🇿",
  kenya: "🇰🇪",
  kosovo: "🇽🇰",
  kuwait: "🇰🇼",
  kyrgyzstan: "🇰🇬",
  laos: "🇱🇦",
  latvia: "🇱🇻",
  lebanon: "🇱🇧",
  lesotho: "🇱🇸",
  liberia: "🇱🇷",
  libya: "🇱🇾",
  liechtenstein: "🇱🇮",
  lithuania: "🇱🇹",
  luxembourg: "🇱🇺",
  madagascar: "🇲🇬",
  malawi: "🇲🇼",
  malaysia: "🇲🇾",
  maldives: "🇲🇻",
  mali: "🇲🇱",
  malta: "🇲🇹",
  mauritania: "🇲🇷",
  mauritius: "🇲🇺",
  mexico: "🇲🇽",
  moldova: "🇲🇩",
  monaco: "🇲🇨",
  mongolia: "🇲🇳",
  montenegro: "🇲🇪",
  morocco: "🇲🇦",
  mozambique: "🇲🇿",
  myanmar: "🇲🇲",
  namibia: "🇳🇦",
  nepal: "🇳🇵",
  netherlands: "🇳🇱",
  "new zealand": "🇳🇿",
  nicaragua: "🇳🇮",
  niger: "🇳🇪",
  nigeria: "🇳🇬",
  "north korea": "🇰🇵",
  "north macedonia": "🇲🇰",
  norway: "🇳🇴",
  oman: "🇴🇲",
  pakistan: "🇵🇰",
  palestine: "🇵🇸",
  panama: "🇵🇦",
  "papua new guinea": "🇵🇬",
  paraguay: "🇵🇾",
  peru: "🇵🇪",
  philippines: "🇵🇭",
  poland: "🇵🇱",
  portugal: "🇵🇹",
  qatar: "🇶🇦",
  "republic of the congo": "🇨🇬",
  romania: "🇷🇴",
  russia: "🇷🇺",
  rwanda: "🇷🇼",
  "saint kitts and nevis": "🇰🇳",
  "saint lucia": "🇱🇨",
  "saint vincent and the grenadines": "🇻🇨",
  samoa: "🇼🇸",
  "san marino": "🇸🇲",
  "sao tome and principe": "🇸🇹",
  "saudi arabia": "🇸🇦",
  senegal: "🇸🇳",
  serbia: "🇷🇸",
  seychelles: "🇸🇨",
  "sierra leone": "🇸🇱",
  singapore: "🇸🇬",
  slovakia: "🇸🇰",
  slovenia: "🇸🇮",
  "solomon islands": "🇸🇧",
  somalia: "🇸🇴",
  "south africa": "🇿🇦",
  "south korea": "🇰🇷",
  "south sudan": "🇸🇸",
  spain: "🇪🇸",
  "sri lanka": "🇱🇰",
  sudan: "🇸🇩",
  suriname: "🇸🇷",
  sweden: "🇸🇪",
  switzerland: "🇨🇭",
  syria: "🇸🇾",
  taiwan: "🇹🇼",
  tajikistan: "🇹🇯",
  tanzania: "🇹🇿",
  thailand: "🇹🇭",
  togo: "🇹🇬",
  "trinidad and tobago": "🇹🇹",
  tunisia: "🇹🇳",
  turkey: "🇹🇷",
  turkmenistan: "🇹🇲",
  tuvalu: "🇹🇻",
  uganda: "🇺🇬",
  ukraine: "🇺🇦",
  "united arab emirates": "🇦🇪",
  "united kingdom": "🇬🇧",
  "united states": "🇺🇸",
  uruguay: "🇺🇾",
  uzbekistan: "🇺🇿",
  vanuatu: "🇻🇺",
  venezuela: "🇻🇪",
  vietnam: "🇻🇳",
  yemen: "🇾🇪",
  zambia: "🇿🇲",
  zimbabwe: "🇿🇼",
};

// Get country code from flag emoji (e.g., 🇺🇸 -> "us")
const COUNTRY_NAME_TO_ISO2: Record<string, string> = countriesData.reduce((acc, entry) => {
  acc[entry.name.toLowerCase()] = entry.code.toLowerCase();
  return acc;
}, {} as Record<string, string>);

Object.assign(COUNTRY_NAME_TO_ISO2, {
  "bermuda": "bm",
  "falkland islands": "fk",
  "french guiana": "gf",
  "french southern and antarctic lands": "tf",
  "greenland": "gl",
  "guinea bissau": "gw",
  "macedonia": "mk",
  "new caledonia": "nc",
  "northern cyprus": "cy",
  "puerto rico": "pr",
  "republic of serbia": "rs",
  "republic of the congo": "cg",
  "somaliland": "xsl",
  "swaziland": "sz",
  "the bahamas": "bs",
  "timor-leste": "tl",
  "west bank": "ps",
  "western sahara": "eh",
  "palestine": "ps",
  "andorra": "ad",
  "antigua and barbuda": "ag",
  "kiribati": "ki",
});

export const getCountryCodeFromName = (countryName: string): string => {
  const normalized = countryName.trim().toLowerCase();
  const overrideCode = COUNTRY_NAME_TO_ISO2[normalized];
  if (overrideCode) return overrideCode;

  const emoji = COUNTRY_FLAGS[normalized];
  if (!emoji) return normalized.substring(0, 2).toLowerCase();
  
  // Convert flag emoji to country code
  // Flag emojis are made of two regional indicator symbols
  // Regional indicator symbols are U+1F1E6 to U+1F1FF (for A-Z)
  const codePoints = Array.from(emoji).map(char => char.codePointAt(0)!);
  if (codePoints.length === 2) {
    const code = String.fromCharCode(
      codePoints[0] - 0x1F1E6 + 65,
      codePoints[1] - 0x1F1E6 + 65
    ).toLowerCase();
    return code;
  }
  
  return normalized.substring(0, 2).toLowerCase();
};

/** Lookup `COUNTRIES` slug (`united kingdom`) from ISO alpha-2 (`gb`). */
export function findCountrySlugByIso2(iso2: string): string | null {
  const needle = iso2.trim().toLowerCase();
  if (!needle) return null;
  for (const name of COUNTRIES) {
    if (getCountryCodeFromName(name) === needle) return name;
  }
  return null;
}

// Get flag emoji for a country
export const getCountryFlag = (countryName: string): string => {
  return COUNTRY_FLAGS[countryName.toLowerCase()] || "🚩";
};

// Convert GeoJSON coordinates to LatLng format for Google Maps
export const getCountryBounds = (
  features: GeoJSONFeature[]
): unknown => {
  if (!features || features.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bounds = new (window as any).google.maps.LatLngBounds();

  features.forEach((feature) => {
    const coords = feature.geometry.coordinates as number[] & number[][][] & number[][][][];
    if (feature.geometry.type === "Point") {
      bounds.extend({ lat: (coords as number[])[1], lng: (coords as number[])[0] });
    } else if (feature.geometry.type === "Polygon") {
      const ring = (coords as number[][][])[0];
      ring.forEach((coord) => {
        bounds.extend({ lat: coord[1], lng: coord[0] });
      });
    } else if (feature.geometry.type === "MultiPolygon") {
      (coords as number[][][][]).forEach((polygon) => {
        polygon[0].forEach((coord) => {
          bounds.extend({ lat: coord[1], lng: coord[0] });
        });
      });
    }
  });

  return bounds.isEmpty() ? null : bounds;
};

// Get center of country bounds
export const getCenterOfBounds = (
  bounds: unknown
): unknown => {
  return (bounds as { getCenter: () => unknown }).getCenter();
};
