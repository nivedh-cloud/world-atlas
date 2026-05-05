/**
 * Helpers for Currency rankings & Precious metal rankings (Frankfurter USD-based table).
 * Table keys: ISO quote → units of that currency per 1 USD (not present for USD).
 */

import { getRepresentativeCountryForCurrency } from "./currencyRepresentatives";
import { findCountrySlugByIso2, formatCountryName } from "./geojsonLoader";

/** ISO 4217 precious-metal codes supplied by Frankfurter — excluded from fiat list. */
export const PRECIOUS_METAL_ISO4217 = new Set(["XAU", "XAG", "XPT", "XPD"]);

/**
 * IMF / synthetic units — not everyday national cash. Frankfurter still quotes them vs USD.
 */
export const FIAT_SUPPLEMENTAL_EXCLUDE = new Set(["XDR"]);

/**
 * Short hints for codes that look cryptic in a list (territory pounds, etc.).
 * Map selection still uses countries-info representative country where available.
 */
const TERRITORY_OR_SPECIAL_SUBLABEL: Record<string, string> = {
  FKP: "Falkland Islands pound (pegged to GBP)",
  GGP: "Guernsey pound (local issue, pegged near GBP)",
  IMP: "Isle of Man pound (pegged near GBP)",
  JEP: "Jersey pound (pegged near GBP)",
  SHP: "St Helena / Ascension / Tristan pound (pegged near GBP)",
  GIP: "Gibraltar pound (pegged to GBP)",
  KYD: "Cayman Islands dollar",
};

function nationalSubLabel(iso: string, hasRepresentative: boolean): string {
  const q = iso.toUpperCase();
  const hint = TERRITORY_OR_SPECIAL_SUBLABEL[q];
  if (hint) return `${q} · ${hint}`;
  if (!hasRepresentative) return `${q} · No map link — regional / fund unit`;
  return q;
}

const METAL_LABEL: Record<string, string> = {
  XAU: "Gold",
  XAG: "Silver",
  XPT: "Platinum",
  XPD: "Palladium",
};

/** Units of `quote` ISO currency per **1 USD** (implicitly 1 for USD). */
export function unitsQuotePerUsd(rates: Record<string, number>, quote: string): number | null {
  const Q = quote.toUpperCase();
  if (Q === "USD") return 1;
  const x = rates[Q];
  if (typeof x !== "number" || !Number.isFinite(x) || x <= 0) return null;
  return x;
}

/** Value of 1 unit of `quoteIso` denominated in `refIso` (how many REF per 1 QUOTE). */
export function valueInRefCurrency(
  rates: Record<string, number>,
  refIso: string,
  quoteIso: string,
): number | null {
  const R = refIso.toUpperCase();
  const Q = quoteIso.toUpperCase();
  if (Q === R) return 1;

  const rPerUsd = unitsQuotePerUsd(rates, R);
  const qPerUsd = unitsQuotePerUsd(rates, Q);
  if (rPerUsd === null || qPerUsd === null) return null;
  return rPerUsd / qPerUsd;
}

export type CurrencyRankRow = {
  currency: string;
  strength: number;
  displayValue: string;
  name: string;
  subLabel: string;
  cca2: string | null;
  flag: string | null;
};

export function formatRankAmountInRef(refIso: string, x: number): string {
  const opts =
    x >= 1
      ? { minimumFractionDigits: 2, maximumFractionDigits: 3 }
      : x >= 0.01
        ? { minimumFractionDigits: 3, maximumFractionDigits: 5 }
        : { minimumFractionDigits: 4, maximumFractionDigits: 8 };
  return `≈ ${x.toLocaleString(undefined, opts)} ${refIso}`;
}

/** Fiat & standard ISO quotes only — skips metals — always includes USD / United States. */
export function buildNationalCurrencyRows(
  rates: Record<string, number>,
  effectiveRefIso: string,
): CurrencyRankRow[] {
  const eff = effectiveRefIso.toUpperCase();
  const out: CurrencyRankRow[] = [];

  for (const quote of Object.keys(rates)) {
    const q = quote.toUpperCase();
    if (PRECIOUS_METAL_ISO4217.has(q)) continue;
    if (FIAT_SUPPLEMENTAL_EXCLUDE.has(q)) continue;
    if (q === eff) continue;

    const strength = valueInRefCurrency(rates, eff, q);
    if (strength === null || strength <= 0) continue;

    const rep = getRepresentativeCountryForCurrency(q);
    const name = rep?.displayName ?? q;
    const cca2 = rep?.cca2 ?? null;

    out.push({
      currency: q,
      strength,
      displayValue: `${formatRankAmountInRef(eff, strength)} / 1 ${q}`,
      name,
      subLabel: nationalSubLabel(q, rep != null),
      cca2,
      flag: cca2 ? `/flags/${cca2.toLowerCase()}.svg` : null,
    });
  }

  /** USD never appears as a quote when base is USD — add United States explicitly. */
  if (!out.some((r) => r.currency === "USD")) {
    const strengthUsd = valueInRefCurrency(rates, eff, "USD");
    if (strengthUsd !== null && Number.isFinite(strengthUsd) && strengthUsd > 0) {
      const slug = findCountrySlugByIso2("US");
      const name = slug ? formatCountryName(slug) : "United States";
      out.push({
        currency: "USD",
        strength: strengthUsd,
        displayValue: `${formatRankAmountInRef(eff, strengthUsd)} / 1 USD`,
        name,
        subLabel: "USD · United States dollar",
        cca2: "US",
        flag: "/flags/us.svg",
      });
    }
  }

  out.sort((a, b) => b.strength - a.strength);
  return out;
}

export function buildPreciousMetalRows(
  rates: Record<string, number>,
  effectiveRefIso: string,
): CurrencyRankRow[] {
  const eff = effectiveRefIso.toUpperCase();
  const out: CurrencyRankRow[] = [];

  for (const code of PRECIOUS_METAL_ISO4217) {
    if (typeof rates[code] !== "number") continue;

    const strength = valueInRefCurrency(rates, eff, code);
    if (strength === null || strength <= 0) continue;

    const metalName = METAL_LABEL[code] ?? code;
    out.push({
      currency: code,
      strength,
      displayValue: `${formatRankAmountInRef(eff, strength)} / 1 ${code}`,
      name: metalName,
      subLabel: `${code} · 1 troy oz — ISO metal unit, not a country`,
      cca2: null,
      flag: null,
    });
  }

  out.sort((a, b) => b.strength - a.strength);
  return out;
}
