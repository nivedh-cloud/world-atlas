import React, { useEffect, useMemo, useState } from "react";
import { frankfurterTodayDisplayLabel, getFrankfurterUsdQuoteRates, frankfurterLocalCalendarDay } from "../utils/frankfurterRates";
import { buildPreciousMetalRows } from "../utils/currencyRankingsShared";
import { useAppSettings } from "../context/appSettingsContext";
import { getCurrencyIsoForCca2 } from "../utils/countryData";
import { findCountrySlugByIso2, formatCountryName, getCountryCodeFromName } from "../utils/geojsonLoader";
import { detectCountryCodeFromDeviceLocation } from "../utils/maptilerGeocodeCountry";
import { CountrySelector } from "./CountrySelector";
import "./StatisticsScreen.css";
import "./CurrencyRankingsScreen.css";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export const PreciousMetalRankingsScreen: React.FC<Props> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppSettings();

  const [ratesTable, setRatesTable] = useState<Record<string, number> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [refExpanded, setRefExpanded] = useState(false);

  const refCca2 = useMemo(() => {
    const c = settings.referenceCurrencyCountryCode?.trim();
    return (c && c.length >= 2 ? c.slice(0, 2).toUpperCase() : "US") as string;
  }, [settings.referenceCurrencyCountryCode]);

  const refSlug = findCountrySlugByIso2(refCca2);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      if (cancelled) return;
      setErr(null);
      setRatesTable(null);
      try {
        const { rates } = await getFrankfurterUsdQuoteRates();
        if (cancelled) return;
        setRatesTable(rates);
      } catch (e: unknown) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Could not load exchange rates.");
        setRatesTable({});
      }
    };

    queueMicrotask(() => {
      if (!cancelled) void load();
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const rankingMeta = useMemo(() => {
    if (!ratesTable) return null;
    const configuredRef = getCurrencyIsoForCca2(refCca2) ?? "USD";
    const hasConfigured =
      configuredRef === "USD"
      || (typeof ratesTable[configuredRef] === "number"
        && ratesTable[configuredRef] > 0);
    const effectiveRefIso = hasConfigured ? configuredRef : "USD";
    const fallbackExplanation =
      !hasConfigured && configuredRef !== "USD"
        ? `No spot rate for ${configuredRef} — showing USD equivalents.`
        : null;
    const rows = buildPreciousMetalRows(ratesTable, effectiveRefIso);
    const refCountryLabel = refSlug ? formatCountryName(refSlug) : refCca2;

    return {
      rows,
      effectiveRefIso,
      fallbackExplanation,
      refCountryLabel,
    };
  }, [ratesTable, refCca2, refSlug]);

  const rows = rankingMeta?.rows ?? null;
  const effectiveRefIso = rankingMeta?.effectiveRefIso ?? "USD";
  const refCountryLabel = rankingMeta?.refCountryLabel ?? refCca2;

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!rows) return [];
    if (!q) return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    return rows
      .map((r, i) => ({ ...r, rank: i + 1 }))
      .filter((r) => r.name.toLowerCase().includes(q) || r.currency.toLowerCase().includes(q));
  }, [rows, search]);

  const maxValue = rows && rows.length > 0 ? rows[0].strength : 1;

  if (!isOpen) return null;

  return (
    <div className="stat-backdrop">
      <div className="stat-sheet">
        <div className="stat-header">
          <button type="button" className="stat-back" onClick={onClose} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="stat-header-center">
            <span className="stat-header-icon">🏅</span>
            <div>
              <div className="stat-header-title">Precious metals</div>
              <div className="stat-header-desc">
                {ratesTable === null && !err
                  ? "Loading rates…"
                  : err ?? `Gold, silver, platinum, palladium (troy oz) in ${effectiveRefIso} (${refCountryLabel}) · ${frankfurterTodayDisplayLabel()}`}
              </div>
            </div>
          </div>
        </div>

        <section className="cry-ref-section" aria-label="Reference currency">
          <div className="cry-ref-summary">
            <div className="cry-ref-chip">
              {refSlug ? (
                <img
                  className="cry-ref-flag"
                  src={`/flags/${getCountryCodeFromName(refSlug)}.svg`}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = "hidden";
                  }}
                />
              ) : (
                <span className="cry-ref-flag-fallback">🌍</span>
              )}
              <div className="cry-ref-text">
                <div className="cry-ref-label">Pricing in</div>
                <div className="cry-ref-line">
                  {refCountryLabel} · <strong>{getCurrencyIsoForCca2(refCca2) ?? "USD"}</strong>
                </div>
              </div>
            </div>
            <button type="button" className="cry-ref-change" aria-expanded={refExpanded} onClick={() => setRefExpanded((v) => !v)}>
              {refExpanded ? "Hide" : "Change"}
            </button>
          </div>
          {rankingMeta?.fallbackExplanation ? (
            <p className="cry-ref-banner">{rankingMeta.fallbackExplanation}</p>
          ) : null}
          {refExpanded ? (
            <div className="cry-ref-picker">
              <CountrySelector
                label="Country"
                selectedCountry={refSlug ?? null}
                fixedPanel
                onCountryChange={(slug) => {
                  const iso = getCountryCodeFromName(slug).toUpperCase();
                  if (iso.length >= 2) updateSettings({ referenceCurrencyCountryCode: iso });
                }}
              />
              <button
                type="button"
                className="cry-ref-location"
                onClick={() => {
                  void (async () => {
                    const code = await detectCountryCodeFromDeviceLocation();
                    if (code && code.length >= 2) updateSettings({ referenceCurrencyCountryCode: code.toUpperCase() });
                  })();
                }}
              >
                Use device location again
              </button>
              <button type="button" className="cry-ref-done" onClick={() => setRefExpanded(false)}>
                Done
              </button>
            </div>
          ) : null}
        </section>

        <div className="stat-search-bar">
          <div className="stat-search-wrap">
            <svg className="stat-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="stat-search-input"
              type="search"
              placeholder="Search metal…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!rows || rows.length === 0}
            />
            {search ? (
              <button type="button" className="stat-search-clear" onClick={() => setSearch("")}>
                ✕
              </button>
            ) : null}
          </div>
          <span className="stat-count-badge">
            {rows === null ? "…" : search ? `${visibleRows.length} / ${rows.length}` : `${rows.length} metals`}
          </span>
        </div>

        <div className="stat-list">
          {rows === null ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>Fetching spot rates…</div>
          ) : err ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>{err}</div>
          ) : visibleRows.length === 0 ? (
            <div className="stat-no-results">
              {rows.length === 0
                ? "No metal quotes returned for today."
                : `No matches for "${search}"`}
            </div>
          ) : (
            visibleRows.map((row) => (
              <div key={row.currency} className="stat-row">
                <span className={`stat-rank ${row.rank <= 3 ? `stat-rank-top${row.rank}` : ""}`}>
                  {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : `#${row.rank}`}
                </span>
                <span
                  className="stat-flag"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    lineHeight: 1,
                    fontWeight: 800,
                    background: "linear-gradient(135deg, rgba(251,191,36,0.2), rgba(156,163,175,0.15))",
                    borderRadius: 6,
                  }}
                  aria-hidden
                  title={row.currency}
                >
                  {row.currency === "XAU" ? "Au" : row.currency === "XAG" ? "Ag" : row.currency === "XPT" ? "Pt" : "Pd"}
                </span>
                <div className="stat-info">
                  <div className="stat-name">{row.name}</div>
                  <div className="stat-sub">{row.subLabel}</div>
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max((row.strength / maxValue) * 100, 2))}%`,
                      }}
                    />
                  </div>
                </div>
                <span className="stat-value" style={{ textAlign: "right", fontSize: 12 }}>
                  {row.displayValue}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="cry-footer">
          ({frankfurterLocalCalendarDay()}). Data:{" "}
          <a href="https://www.frankfurter.app/" target="_blank" rel="noreferrer">
            Frankfurter
          </a>
          .
        </div>
      </div>
    </div>
  );
};
