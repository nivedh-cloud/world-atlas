import { loadFactbookData, extractFactbookInfo } from "./factbookLoader";
import { formatCountryName, getCountryCodeFromName } from "./geojsonLoader";
import countriesInfo from "../data/countries-info.json";
import countriesMeta from "../../countries_meta.json";

export interface CountryInfo {
  name: string;
  officialName?: string;
  cca2?: string;
  flag?: string | null;
  coatOfArms?: string | null;
  capital?: string;
  mainCities?: string[];
  population?: string;
  religion?: string;
  area?: string;
  language?: string;
  currency?: string;
  currencySymbol?: string;
  /** Primary ISO 4217 code when known (REST countries data). */
  currencyCode?: string;
  government?: string;
  independence?: string;
  region?: string;
  continent?: string;
  gdp?: string;
  neighbors?: string;
  timezone?: string;
  ethnicGroups?: string;
  lifeExpectancy?: string;
  gdpPerCapita?: string;
  literacyRate?: string;
  callingCode?: string;
  tld?: string;
  landlocked?: boolean;
  coordinates?: string;
  drivingSide?: string;

  // Additional factbook data
  medianAge?: string;
  populationGrowth?: string;
  birthRate?: string;
  deathRate?: string;
  netMigration?: string;
  urbanization?: string;
  infantMortality?: string;
  obesity?: string;
  healthExpenditure?: string;
  physicianDensity?: string;
  educationExpenditure?: string;
  literacyActual?: string;
  gdpGrowth?: string;
  inflation?: string;
  unemployment?: string;
  publicDebt?: string;
  povertyRate?: string;
  laborForce?: string;
  industries?: string;
  agriculturalProducts?: string;
  exportPartners?: string;
  exportCommodities?: string;
  importPartners?: string;
  importCommodities?: string;
  militarySpending?: string;
  militarySpendingHistory?: Record<string, string>;
  militaryBranches?: string;
  militaryPersonnel?: string;
  militaryServiceAge?: string;
  militaryDeployments?: string;
  internetUsers?: string;
  nationalHoliday?: string;
  nationalAnthem?: string;
  nationalSymbol?: string;
  location?: string;
  coastline?: string;
  naturalResources?: string;
  naturalHazards?: string;
  climate?: string;
  terrain?: string;
}

const countryCache: Record<string, CountryInfo> = {};

type LocalCountryInfo = {
  name: string;
  code: string;
  capital?: string;
  population?: number;
  area?: number;
  continent?: string;
  landlocked?: boolean;
  currencies?: Array<{ code: string; name: string; symbol?: string }>;
  languages?: Record<string, string | undefined>;
  demonym?: string;
  timezones?: string[];
};

const countryInfoByName = new Map<string, LocalCountryInfo>(
  countriesInfo.map((entry) => [entry.name.toLowerCase(), entry])
);

const countryInfoByCode = new Map<string, LocalCountryInfo>(
  countriesInfo.map((entry) => [entry.code.toLowerCase(), entry])
);

type CountryMetaEntry = {
  cca2: string;
  coatOfArms?: {
    png?: string;
    svg?: string;
  };
  flags?: {
    png?: string;
    svg?: string;
    alt?: string;
  };
  name?: {
    common?: string;
    official?: string;
    nativeName?: Record<string, { official?: string; common?: string }>;
  };
};

const countryMetaByCode = new Map<string, CountryMetaEntry>(
  (countriesMeta as CountryMetaEntry[])
    .filter((entry) => entry.cca2)
    .map((entry) => [entry.cca2.toUpperCase(), entry])
);

function withBaseUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

const getCoatOfArmsUrl = (countryCode: string | undefined | null): string | null => {
  if (!countryCode) return null;
  const normalized = countryCode.trim().toUpperCase();
  const meta = countryMetaByCode.get(normalized);
  if (!meta?.coatOfArms) return null;
  return meta.coatOfArms.svg || meta.coatOfArms.png || null;
};

const getLocalCountryInfo = (countryName: string): LocalCountryInfo | undefined => {
  const normalized = countryName.trim().toLowerCase();
  if (countryInfoByName.has(normalized)) {
    return countryInfoByName.get(normalized);
  }

  const code = getCountryCodeFromName(countryName);
  if (code && countryInfoByCode.has(code.toLowerCase())) {
    return countryInfoByCode.get(code.toLowerCase());
  }

  return undefined;
};

export const getCountryInfo = async (countryName: string): Promise<CountryInfo | null> => {
  try {
    const cacheKey = countryName.toLowerCase();
    if (countryCache[cacheKey]) {
      return countryCache[cacheKey];
    }

    const countryCode = getCountryCodeFromName(countryName);
    const localInfo = getLocalCountryInfo(countryName);
    const factbookData = await loadFactbookData(countryName);
    const factbookInfo = factbookData ? extractFactbookInfo(factbookData) : {} as ReturnType<typeof extractFactbookInfo>;

    const population = localInfo?.population
      ? localInfo.population.toLocaleString()
      : factbookData?.["People and Society"]?.Population?.total?.text || "Information not available";

    const area = localInfo?.area
      ? `${localInfo.area.toLocaleString()} km²`
      : factbookData?.Geography?.Area?.["total "]?.text || "Information not available";

    const language = localInfo?.languages
      ? Object.values(localInfo.languages).join(", ")
      : factbookInfo.language || "Information not available";

    const currency = localInfo?.currencies?.length
      ? localInfo.currencies.map((c) => c.name).join(", ")
      : "Information not available";

    const currencySymbol = localInfo?.currencies?.[0]?.symbol;
    const currencyCode = localInfo?.currencies?.[0]?.code?.trim()?.toUpperCase();

    const capital = localInfo?.capital || "Information not available";
    const mainCities = localInfo?.capital ? [localInfo.capital] : ["N/A"];
    const continent = localInfo?.continent || "Information not available";
    const landlocked = typeof localInfo?.landlocked === "boolean" ? localInfo.landlocked : false;
    const timezone = Array.isArray(localInfo?.timezones) ? localInfo.timezones[0] : "Information not available";

    const countryInfo: CountryInfo = {
      name: formatCountryName(countryName),
      officialName: localInfo?.name ? formatCountryName(localInfo.name) : formatCountryName(countryName),
      cca2: countryCode?.toUpperCase(),
      flag: countryCode ? withBaseUrl(`flags/${countryCode}.svg`) : undefined,
      coatOfArms: getCoatOfArmsUrl(countryCode),
      capital,
      mainCities,
      population,
      religion: factbookInfo.religion || "Information not available",
      area,
      language,
      currency,
      currencySymbol,
      currencyCode,
      government: factbookInfo.government || "Information not available",
      independence: factbookInfo.independence || "Information not available",
      region: continent,
      continent,
      gdp: factbookInfo.gdp || "Information not available",
      neighbors: "Information not available",
      timezone,
      ethnicGroups: factbookInfo.ethnicGroups || "Information not available",
      lifeExpectancy: factbookInfo.lifeExpectancy || "Information not available",
      gdpPerCapita: factbookInfo.gdpPerCapita || "Information not available",
      literacyRate: factbookInfo.literacyRate || "Information not available",
      callingCode: undefined,
      tld: undefined,
      landlocked,
      coordinates: factbookInfo.coordinates,
      drivingSide: undefined,

      medianAge: factbookInfo.medianAge,
      populationGrowth: factbookInfo.populationGrowth,
      birthRate: factbookInfo.birthRate,
      deathRate: factbookInfo.deathRate,
      netMigration: factbookInfo.netMigration,
      urbanization: factbookInfo.urbanization,
      infantMortality: factbookInfo.infantMortality,
      obesity: factbookInfo.obesity,
      healthExpenditure: factbookInfo.healthExpenditure,
      physicianDensity: factbookInfo.physicianDensity,
      educationExpenditure: factbookInfo.educationExpenditure,
      literacyActual: factbookInfo.literacyActual,
      gdpGrowth: factbookInfo.gdpGrowth,
      inflation: factbookInfo.inflation,
      unemployment: factbookInfo.unemployment,
      publicDebt: factbookInfo.publicDebt,
      povertyRate: factbookInfo.povertyRate,
      laborForce: factbookInfo.laborForce,
      industries: factbookInfo.industries,
      agriculturalProducts: factbookInfo.agriculturalProducts,
      exportPartners: factbookInfo.exportPartners,
      exportCommodities: factbookInfo.exportCommodities,
      importPartners: factbookInfo.importPartners,
      importCommodities: factbookInfo.importCommodities,
      militarySpending: factbookInfo.militarySpending,
      militarySpendingHistory: factbookInfo.militarySpendingHistory,
      militaryBranches: factbookInfo.militaryBranches,
      militaryPersonnel: factbookInfo.militaryPersonnel,
      militaryServiceAge: factbookInfo.militaryServiceAge,
      militaryDeployments: factbookInfo.militaryDeployments,
      internetUsers: factbookInfo.internetUsers,
      nationalHoliday: factbookInfo.nationalHoliday,
      nationalAnthem: factbookInfo.nationalAnthem,
      nationalSymbol: factbookInfo.nationalSymbol,
      location: factbookInfo.location,
      coastline: factbookInfo.coastline,
      naturalResources: factbookInfo.naturalResources,
      naturalHazards: factbookInfo.naturalHazards,
      climate: factbookInfo.climate,
      terrain: factbookInfo.terrain,
    };

    countryCache[cacheKey] = countryInfo;
    return countryInfo;
  } catch (error) {
    console.error(`Error getting country info for ${countryName}:`, error);
    return null;
  }
};

/** Primary ISO 4217 for a territory by alpha-2 (e.g. `IN` → `INR`). */
export function getCurrencyIsoForCca2(cca2: string): string | null {
  const row = countryInfoByCode.get(cca2.trim().toLowerCase());
  const raw = row?.currencies?.[0]?.code?.trim();
  return raw ? raw.toUpperCase() : null;
}
