/**
 * Parse CIA Factbook economy strings denominated in USD (PPP / totals).
 */

function stripEstNoise(s: string): string {
  return s.replace(/\u2013|\u2014/g, "-").replace(/\s+/g, " ").trim();
}

/** Parse strings like `$53.069 trillion`, `$51 billion (2025 est.)`, `$12,340 million`. Returns total USD nominal or null if not clearly USD-scaled PPP. */
export function parseUsdScaledTotal(text: string): number | null {
  const s = stripEstNoise(text);
  const scaleMatch = s.match(
    /\$\s*([\d,]+(?:\.\d+)?)\s*(trillion|billion|million|thousand)\b/i,
  );
  if (scaleMatch) {
    const n = parseFloat(scaleMatch[1].replace(/,/g, ""));
    if (Number.isNaN(n)) return null;
    const w = scaleMatch[2].toLowerCase();
    let mult = 1;
    if (w.startsWith("trill")) mult = 1e12;
    else if (w.startsWith("bill")) mult = 1e9;
    else if (w.startsWith("mill")) mult = 1e6;
    else if (w.startsWith("thous")) mult = 1e3;
    return n * mult;
  }

  const short = s.match(/\$\s*([\d,]+(?:\.\d+)?)\s*([tTmMbB])\b/);
  if (short && /[tbm]/i.test(short[2])) {
    const n = parseFloat(short[1].replace(/,/g, ""));
    if (Number.isNaN(n)) return null;
    const c = short[2].toUpperCase();
    if (c === "T") return n * 1e12;
    if (c === "B") return n * 1e9;
    if (c === "M") return n * 1e6;
  }

  return null;
}

/** Per-capita PPP like `$18,020 (2024 est.)` → absolute USD. */
export function parseUsdAbsolute(text: string): number | null {
  const s = stripEstNoise(text);
  const m = s.match(/\$\s*([\d,]+(?:\.\d+)?)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}
