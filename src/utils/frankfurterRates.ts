/** Public Frankfurter API (v2). See https://www.frankfurter.app/docs/ */
const FRANKFURTER_BASE = "https://api.frankfurter.dev/v2";

type CachedRatePayload = {
  /** Local-calendar date (YYYY-MM-DD) this cache belongs to */
  calendarDay: string;
  /** API rate: 1 × `from` = `rate` × `to` (same semantics as Frankfurter `rate`). */
  rate: number;
};

export function frankfurterLocalCalendarDay(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** User-facing label for **this device's** calendar date (shown in FX UI instead of upstream quote stamps). */
export function frankfurterTodayDisplayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function lsKey(day: string, from: string, to: string): string {
  return `frankfurter_rate_${day}_${from.toUpperCase()}_${to.toUpperCase()}`;
}

/**
 * Latest spot rate FROM → TO, cached once per **local calendar day**
 * in localStorage (`frankfurter_rate_*`). Uses `/rate/...` with no historical `date=` — always current published rate.
 */
export async function getFrankfurterRate(fromIso: string, toIso: string): Promise<number> {
  const from = fromIso.toUpperCase().trim();
  const to = toIso.toUpperCase().trim();
  if (from === to) return 1;

  const day = frankfurterLocalCalendarDay();
  const key = lsKey(day, from, to);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedRatePayload;
      if (
        parsed
        && parsed.calendarDay === day
        && typeof parsed.rate === "number"
        && parsed.rate > 0
      ) {
        return parsed.rate;
      }
    }
  } catch {
    /* ignore bad cache */
  }

  const url = `${FRANKFURTER_BASE}/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Frankfurter HTTP ${res.status} ${errBody}`.slice(0, 200));
  }

  const data = (await res.json()) as { rate?: number };
  const rate = data.rate;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Invalid Frankfurter response");
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify({ calendarDay: day, rate } satisfies CachedRatePayload),
    );
  } catch {
    /* quota / privacy mode */
  }

  return rate;
}

/** One row from `GET /v2/rates?base=USD` — how many units of `quote` equal 1 USD. */
export type FrankfurterUsdQuoteRow = {
  date: string;
  base: string;
  quote: string;
  rate: number;
};

type CachedUsdTablePayload = {
  calendarDay: string;
  rates: Record<string, number>;
};

const USD_TABLE_LS_PREFIX = "frankfurter_usd_quotes_";

function usdTableLsKey(day: string): string {
  return `${USD_TABLE_LS_PREFIX}${day}`;
}

/**
 * Latest blended USD table (`GET /v2/rates?base=USD`, no `date=`). Cached per local calendar day.
 * Rows may carry upstream fixing metadata; the app shows **today** only via {@link frankfurterTodayDisplayLabel}.
 */
export async function getFrankfurterUsdQuoteRates(): Promise<{ rates: Record<string, number> }> {
  const day = frankfurterLocalCalendarDay();
  const key = usdTableLsKey(day);
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as CachedUsdTablePayload & { apiDate?: string };
      if (
        parsed
        && parsed.calendarDay === day
        && parsed.rates
        && typeof parsed.rates === "object"
        && Object.keys(parsed.rates).length > 0
      ) {
        return { rates: parsed.rates };
      }
    }
  } catch {
    /* ignore */
  }

  const url = `${FRANKFURTER_BASE}/rates?base=USD`;
  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Frankfurter HTTP ${res.status} ${errBody}`.slice(0, 200));
  }

  const data = (await res.json()) as FrankfurterUsdQuoteRow[] | unknown;
  if (!Array.isArray(data)) {
    throw new Error("Invalid Frankfurter rates response");
  }

  const rates: Record<string, number> = {};
  for (const row of data) {
    if (
      !row
      || typeof row !== "object"
      || row.base !== "USD"
      || typeof row.quote !== "string"
      || typeof row.rate !== "number"
      || !Number.isFinite(row.rate)
      || row.rate <= 0
    ) {
      continue;
    }
    const q = row.quote.toUpperCase();
    rates[q] = row.rate;
  }

  if (Object.keys(rates).length === 0) {
    throw new Error("No USD rates in response");
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify({ calendarDay: day, rates } satisfies CachedUsdTablePayload),
    );
  } catch {
    /* ignore */
  }

  return { rates };
}
