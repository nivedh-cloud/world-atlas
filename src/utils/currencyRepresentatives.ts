import countriesInfo from "../data/countries-info.json";

type InfoRow = {
  name: string;
  code: string;
  population?: number;
  currencies?: Array<{ code?: string }>;
};

function titleCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Highest-population issuer per ISO 4217 code (EUR → typical Eurozone heavyweight, etc.). */
function buildRepresentatives(): Map<string, { cca2: string; population: number; slugName: string }> {
  const byCurr = new Map<string, { cca2: string; population: number; slugName: string }>();

  for (const c of countriesInfo as InfoRow[]) {
    const cur = c.currencies?.[0]?.code?.trim()?.toUpperCase();
    if (!cur) continue;
    const pop = typeof c.population === "number" ? c.population : 0;
    const slugName = typeof c.name === "string" ? c.name : c.code;
    const prev = byCurr.get(cur);
    if (!prev || pop > prev.population) {
      byCurr.set(cur, {
        cca2: String(c.code).toUpperCase().slice(0, 2),
        population: pop,
        slugName,
      });
    }
  }

  return byCurr;
}

const representatives = buildRepresentatives();

/** Country used for flag / tap-to-map when multiple states share a currency */
export function getRepresentativeCountryForCurrency(
  iso4217: string,
): { cca2: string; displayName: string } | null {
  const u = iso4217.trim().toUpperCase();
  const hit = representatives.get(u);
  if (!hit) return null;
  return {
    cca2: hit.cca2,
    displayName: titleCase(hit.slugName),
  };
}
