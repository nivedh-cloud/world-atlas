/**
 * CIA World Factbook Data Loader
 * Loads and parses country data from local factbook.json files
 */

import { getGecCode } from "./gecMapping";

export interface FactbookData {
  Introduction?: {
    Background?: { text?: string };
  };
  Geography?: {
    Location?: { text?: string };
    "Geographic coordinates"?: { text?: string };
    Area?: { "total "?: { text?: string }; land?: { text?: string } };
    Coastline?: { text?: string };
    "Land boundaries"?: { total?: { text?: string }; "border countries"?: { text?: string } };
    Climate?: { text?: string };
    Terrain?: { text?: string };
    "Natural resources"?: { text?: string };
    "Natural hazards"?: { text?: string };
  };
  Environment?: {
    "Environmental issues"?: { text?: string };
    Climate?: { text?: string };
  };
  "People and Society"?: {
    Population?: { total?: { text?: string } };
    "Ethnic groups"?: { text?: string };
    Languages?: { Languages?: { text?: string } };
    Religions?: { text?: string };
    "Age structure"?: Record<string, { text?: string }>;
    "Population growth rate"?: { text?: string };
    "Birth rate"?: { text?: string };
    "Death rate"?: { text?: string };
    "Net migration rate"?: { text?: string };
    "Median age"?: { total?: { text?: string } };
    Urbanization?: { "urban population"?: { text?: string } };
    "Life expectancy at birth"?: { "total population"?: { text?: string } };
    "School life expectancy (primary to tertiary education)"?: { total?: { text?: string } };
    Literacy?: { "total population"?: { text?: string } };
    "Infant mortality rate"?: { total?: { text?: string } };
    "Obesity - adult prevalence rate"?: { text?: string };
    "Health expenditure"?: { "Health expenditure (as % of GDP)"?: { text?: string } };
    "Physician density"?: { text?: string };
    "Education expenditure"?: { "Education expenditure (% GDP)"?: { text?: string } };
    "Alcohol consumption per capita"?: { total?: { text?: string } };
    "Tobacco use"?: { total?: { text?: string } };
  };
  Government?: {
    "Government type"?: { text?: string };
    Independence?: { text?: string };
    "National holiday"?: { text?: string };
    Capital?: { name?: { text?: string }; "time difference"?: { text?: string } };
    "National anthem(s)"?: { title?: { text?: string } };
    "National symbol(s)"?: { text?: string };
    "National color(s)"?: { text?: string };
    Suffrage?: { text?: string };
  };
  Economy?: {
    "Real GDP (purchasing power parity)"?: Record<string, { text?: string }>;
    "Real GDP per capita"?: Record<string, { text?: string }>;
    "Real GDP growth rate"?: Record<string, { text?: string }>;
    "GDP (official exchange rate)"?: { text?: string };
    "Inflation rate (consumer prices)"?: Record<string, { text?: string }>;
    Industries?: { text?: string };
    "Agricultural products"?: { text?: string };
    "Unemployment rate"?: Record<string, { text?: string }>;
    "Population below poverty line"?: { text?: string };
    "Public debt"?: Record<string, { text?: string }>;
    "Exports - partners"?: { text?: string };
    "Exports - commodities"?: { text?: string };
    "Imports - partners"?: { text?: string };
    "Imports - commodities"?: { text?: string };
    "GDP - composition, by sector of origin"?: {
      agriculture?: { text?: string };
      industry?: { text?: string };
      services?: { text?: string };
    };
    "Labor force"?: { text?: string };
  };
  Communications?: {
    "Internet users"?: { "percent of population"?: { text?: string } };
    "Broadcast media"?: { text?: string };
    "Telephones - mobile cellular"?: { "subscriptions per 100 inhabitants"?: { text?: string } };
  };
  "Military and Security"?: {
    "Military expenditures"?: Record<string, { text?: string }>;
    "Military and security forces"?: { text?: string };
    "Military and security service personnel strengths"?: { text?: string };
    "Military service age and obligation"?: { text?: string };
    "Military deployments"?: { text?: string };
    "Military equipment inventories and acquisitions"?: { text?: string };
    "Military - note"?: { text?: string };
  };
  Transportation?: {
    Airports?: { text?: string };
    Railways?: { total?: { text?: string } };
    Roadways?: { total?: { text?: string } };
  };
}

const factbookCache: Record<string, FactbookData> = {};

function withBaseUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

/**
 * Extract text safely from factbook data structures
 */
function extractText(obj: any): string | undefined {
  if (!obj) return undefined;
  if (typeof obj === "string") return obj;
  if (obj.text) return obj.text;
  return undefined;
}

/**
 * Extract the most recent year value from a keyed-by-year object
 * e.g. { "Real GDP 2024": { text: "$51B" }, "Real GDP 2023": { text: "$49B" } }
 */
function extractLatestYear(obj: Record<string, any> | undefined): string | undefined {
  if (!obj) return undefined;
  const keys = Object.keys(obj).filter((k) => /\d{4}/.test(k));
  if (keys.length === 0) return extractText(obj);
  keys.sort((a, b) => {
    const ya = parseInt(a.match(/\d{4}/)?.[0] ?? "0");
    const yb = parseInt(b.match(/\d{4}/)?.[0] ?? "0");
    return yb - ya;
  });
  return extractText(obj[keys[0]]);
}

/**
 * Extract multi-year military spending data
 * e.g. { "Military Expenditures 2024": { text: "2% of GDP" }, "Military Expenditures 2023": { text: "2.3% of GDP" } }
 */
function extractMilitarySpendingHistory(mil: Record<string, any> | undefined): Record<string, string> | undefined {
  if (!mil) return undefined;
  
  const spending = mil["Military expenditures"] || mil["Military Expenditures"];
  if (!spending) return undefined;
  
  const history: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(spending)) {
    const yearMatch = key.match(/(\d{4})/);
    if (yearMatch && value && typeof value === "object" && "text" in value) {
      const year = yearMatch[1];
      const text = extractText(value);
      if (text) {
        // Extract percentage, e.g., "2%" from "2% of GDP (2024 est.)"
        const percentMatch = text.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
          history[year] = percentMatch[1] + "%";
        }
      }
    }
  }
  
  return Object.keys(history).length > 0 ? history : undefined;
}

/**
 * Load factbook data for a country
 */
export async function loadFactbookData(countryName: string): Promise<FactbookData | null> {
  try {
    const gecCode = getGecCode(countryName);
    if (!gecCode) {
      console.warn(`No GEC code found for country: ${countryName}`);
      return null;
    }

    // Check cache first
    if (factbookCache[gecCode]) {
      return factbookCache[gecCode];
    }

    const filePath = withBaseUrl(`factbook.json-master/${gecCode}.json`);

    const response = await fetch(filePath);
    
    if (!response.ok) {
      console.warn(`Factbook file not found for ${countryName} at ${filePath}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json") && !contentType.includes("text/json")) {
      console.warn(`Factbook: received non-JSON response for ${countryName} (${filePath})`);
      return null;
    }

    const data: FactbookData = await response.json();
    factbookCache[gecCode] = data;

    return data;
  } catch (error) {
    console.error(`Error loading factbook data for ${countryName}:`, error);
    return null;
  }
}

/**
 * Extract key information from factbook data
 */
export function extractFactbookInfo(data: FactbookData) {
  if (!data) return {};

  const people = data["People and Society"] || {};
  const gov = data.Government || {};
  const econ = data.Economy || {};
  const mil = data["Military and Security"] || {};
  const geo = data.Geography || {};
  const env = data.Environment || {};
  const comms = data.Communications || {};

  return {
    // ── People & Society ──
    religion:        extractText(people.Religions),
    ethnicGroups:    extractText(people["Ethnic groups"]),
    language:        extractText(people.Languages?.Languages),
    lifeExpectancy:  extractText(people["Life expectancy at birth"]?.["total population"]),
    literacyRate:    extractText(people["School life expectancy (primary to tertiary education)"]?.total),
    literacyActual:  extractText(people.Literacy?.["total population"]),
    medianAge:       extractText(people["Median age"]?.total),
    populationGrowth: extractText(people["Population growth rate"]),
    birthRate:       extractText(people["Birth rate"]),
    deathRate:       extractText(people["Death rate"]),
    netMigration:    extractText(people["Net migration rate"]),
    urbanization:    extractText(people.Urbanization?.["urban population"]),
    infantMortality: extractText(people["Infant mortality rate"]?.total),
    obesity:         extractText(people["Obesity - adult prevalence rate"]),
    healthExpenditure: extractText(people["Health expenditure"]?.["Health expenditure (as % of GDP)"]),
    physicianDensity: extractText(people["Physician density"]),
    educationExpenditure: extractText(people["Education expenditure"]?.["Education expenditure (% GDP)"]),

    // ── Government ──
    government:     extractText(gov["Government type"]),
    independence:   extractText(gov.Independence),
    nationalHoliday: extractText(gov["National holiday"]),
    nationalAnthem: extractText(gov["National anthem(s)"]?.title),
    nationalSymbol: extractText(gov["National symbol(s)"]),
    suffrage:       extractText(gov.Suffrage),

    // ── Economy (nested year keys) ──
    gdp:         extractLatestYear(econ["Real GDP (purchasing power parity)"]),
    gdpPerCapita: extractLatestYear(econ["Real GDP per capita"]),
    gdpGrowth:   extractLatestYear(econ["Real GDP growth rate"]),
    inflation:   extractLatestYear(econ["Inflation rate (consumer prices)"]),
    unemployment: extractLatestYear(econ["Unemployment rate"]),
    publicDebt:  extractLatestYear(econ["Public debt"]),
    industries:  extractText(econ.Industries),
    agriculturalProducts: extractText(econ["Agricultural products"]),
    povertyRate: extractText(econ["Population below poverty line"]),
    exportPartners: extractText(econ["Exports - partners"]),
    exportCommodities: extractText(econ["Exports - commodities"]),
    importPartners: extractText(econ["Imports - partners"]),
    importCommodities: extractText(econ["Imports - commodities"]),
    laborForce:  extractText(econ["Labor force"]),

    // ── Military ──
    militarySpending:  extractLatestYear(mil["Military expenditures"]),
    militarySpendingHistory: extractMilitarySpendingHistory(mil),
    militaryBranches:  extractText(mil["Military and security forces"]),
    militaryPersonnel: extractText(mil["Military and security service personnel strengths"]),
    militaryServiceAge: extractText(mil["Military service age and obligation"]),
    militaryDeployments: extractText(mil["Military deployments"]),

    // ── Communications ──
    internetUsers: extractText(comms["Internet users"]?.["percent of population"]),

    // ── Geography ──
    location:        extractText(geo.Location),
    coordinates:     extractText(geo["Geographic coordinates"]),
    coastline:       extractText(geo.Coastline),
    naturalResources: extractText(geo["Natural resources"]),
    naturalHazards:  extractText(geo["Natural hazards"]),
    climate:         extractText(geo.Climate) || extractText(env.Climate),
    terrain:         extractText(geo.Terrain),
  };
}

/**
 * Extract population number from factbook text
 * e.g., "1,419,316,933 (2025 est.)" → 1419316933
 */
export function extractPopulationNumber(text: string | undefined): number {
  if (!text) return 0;
  const match = text.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ""), 10);
  }
  return 0;
}

/**
 * Extract area number from factbook text  
 * e.g., "9,596,961 sq km" → 9596961
 */
export function extractAreaNumber(text: string | undefined): number {
  if (!text) return 0;
  const match = text.match(/[\d,]+/);
  if (match) {
    return parseInt(match[0].replace(/,/g, ""), 10);
  }
  return 0;
}

/**
 * Get population from factbook data
 */
export function getPopulation(data: FactbookData): number {
  const text = data["People and Society"]?.Population?.total?.text;
  return extractPopulationNumber(text);
}

/**
 * Get area from factbook data
 */
export function getArea(data: FactbookData): number {
  const text = data.Geography?.Area?.["total "]?.text || data.Geography?.Area?.["total "]?.text;
  return extractAreaNumber(text);
}

/**
 * Batch load all countries' population and area data from factbook
 */
export async function loadAllCountriesStats(): Promise<Record<string, { code: string; population: number; area: number }>> {
  const stats: Record<string, { code: string; population: number; area: number }> = {};
  // getAllGecCodes doesn't exist in gecMapping, return empty stats
  return stats;
}

