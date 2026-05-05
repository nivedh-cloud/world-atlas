import { gecToCountryMapping } from "./gecMapping";
import { loadFactbookData, getPopulation, getArea } from "./factbookLoader";

/** One row per ISO2 from factbook — used for population/area rankings and display names on other stat tabs. */
export type StatsCountryFactRow = {
  code: string;
  gecCode: string;
  name: string;
  population: number;
  area: number;
};

let cache: Record<string, StatsCountryFactRow> | null = null;
let pending: Promise<Record<string, StatsCountryFactRow>> | null = null;

/** Parallelism cap — balances speed vs overwhelming the browser / HTTP queue. */
const FETCH_BATCH = 14;

async function buildStatsCountryFacts(): Promise<Record<string, StatsCountryFactRow>> {
  const pairs = Object.entries(gecToCountryMapping);
  const stats: Record<string, StatsCountryFactRow> = {};

  for (let i = 0; i < pairs.length; i += FETCH_BATCH) {
    const batch = pairs.slice(i, i + FETCH_BATCH);
    await Promise.all(
      batch.map(async ([gecCode, mapping]) => {
        try {
          const data = await loadFactbookData(mapping.countryName);
          if (!data) return;
          stats[mapping.iso2] = {
            code: mapping.iso2,
            gecCode,
            name: mapping.countryName,
            population: getPopulation(data),
            area: getArea(data),
          };
        } catch {
          /* omit failed countries */
        }
      }),
    );
  }

  return stats;
}

/** After a successful load — for initial React state. */
export function getStatsCountryFactsSync(): Record<string, StatsCountryFactRow> | null {
  return cache;
}

/**
 * Single-flight: fetch all factbook-derived country rows (heavy on first run).
 * Subsequent calls resolve immediately from cache.
 */
export function ensureStatsCountryFacts(): Promise<Record<string, StatsCountryFactRow>> {
  if (cache) return Promise.resolve(cache);

  pending ??= buildStatsCountryFacts()
    .then((data) => {
      cache = data;
      pending = null;
      return data;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });

  return pending;
}
