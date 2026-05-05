import React, { useEffect, useMemo, useState } from "react";
import { getCurrencyIsoForCca2 } from "../utils/countryData";
import { findCountrySlugByIso2, formatCountryName } from "../utils/geojsonLoader";
import { frankfurterTodayDisplayLabel, getFrankfurterRate } from "../utils/frankfurterRates";
import "./CurrencyConverterPanel.css";

function fmt(iso: string, n: number, maxFrac = 2): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: iso,
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toFixed(maxFrac)} ${iso}`;
  }
}

/** Currency formatter with finer decimals where useful */
function fmtLoose(iso: string, n: number, maxFrac = 6): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: iso,
      maximumFractionDigits: maxFrac,
      minimumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toFixed(Math.min(maxFrac, 8))} ${iso}`;
  }
}

type Props = {
  referenceCountryCca2: string | undefined;
  /** ISO alpha-2 of the profile country (used to reset calculator when browsing). */
  viewedCountryCca2?: string | null;
  viewedCountryLabel: string;
  viewedCurrencyCode?: string | null;
};

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="ccv-title-row">
      <span className="ccv-title-icon" aria-hidden>💱</span>
      <h3 className="ccv-title">{children}</h3>
    </div>
  );
}

/** Two stacked horizontal arrows ↔ swap notion (viewed ⇄ reference). */
function SwapArrowsIcon() {
  return (
    <svg
      className="ccv-swap-icon"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      aria-hidden
      stroke="currentColor"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 10 16 10 13 7" />
      <polyline points="20 15 9 15 12 18" />
    </svg>
  );
}

export const CurrencyConverterPanel: React.FC<Props> = ({
  referenceCountryCca2,
  viewedCountryCca2,
  viewedCountryLabel,
  viewedCurrencyCode,
}) => {
  const [viewedToBase, setViewedToBase] = useState<number | null>(null);
  const [viewedToUsd, setViewedToUsd] = useState<number | null>(null);
  const [baseToUsd, setBaseToUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /** `viewed→base`: amount in viewed currency (e.g. SAR), result in yours (INR). `base→viewed`: inverse. */
  const [amountStr, setAmountStr] = useState("100");
  const [convertViewedFirst, setConvertViewedFirst] = useState(true);

  const baseIso = useMemo(
    () => (referenceCountryCca2 ? getCurrencyIsoForCca2(referenceCountryCca2) : null),
    [referenceCountryCca2],
  );

  const viewedIso =
    viewedCurrencyCode?.trim() ? viewedCurrencyCode.trim().toUpperCase() : null;

  const refSlug = referenceCountryCca2 ? findCountrySlugByIso2(referenceCountryCca2) : null;
  const refName = refSlug ? formatCountryName(refSlug) : (referenceCountryCca2 ?? "—");

  useEffect(() => {
    setAmountStr("100");
    setConvertViewedFirst(true);
  }, [viewedCountryCca2, viewedIso]);

  useEffect(() => {
    let alive = true;

    if (!referenceCountryCca2 || !baseIso || !viewedIso) {
      setViewedToBase(null);
      setViewedToUsd(null);
      setBaseToUsd(null);
      setLoading(false);
      setErr(null);
      return undefined;
    }

    if (viewedIso === baseIso) {
      setViewedToBase(1);
      setViewedToUsd(null);
      setBaseToUsd(null);
      setLoading(true);
      setErr(null);
      void (async () => {
        try {
          const busd =
            baseIso === "USD" ? 1 : await getFrankfurterRate(baseIso, "USD");
          if (!alive) return;
          setViewedToUsd(busd);
          setBaseToUsd(busd);
        } catch (e: unknown) {
          if (!alive) return;
          setErr(e instanceof Error ? e.message : "Could not load USD rate.");
          setViewedToUsd(null);
          setBaseToUsd(null);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }

    void (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [vb, vusd, busd] = await Promise.all([
          getFrankfurterRate(viewedIso, baseIso),
          viewedIso === "USD" ? Promise.resolve(1) : getFrankfurterRate(viewedIso, "USD"),
          baseIso === "USD" ? Promise.resolve(1) : getFrankfurterRate(baseIso, "USD"),
        ]);
        if (!alive) return;
        setViewedToBase(vb);
        setViewedToUsd(vusd);
        setBaseToUsd(busd);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Could not load exchange rates.");
        setViewedToBase(null);
        setViewedToUsd(null);
        setBaseToUsd(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [referenceCountryCca2, baseIso, viewedIso]);

  if (!referenceCountryCca2) {
    return (
      <div className="ccv-panel ccv-muted">
        <PanelTitle>Currency</PanelTitle>
        <p className="ccv-lead">
          Choosing your reference country from location… Override anytime in Settings → Currency.
        </p>
      </div>
    );
  }

  if (!baseIso) {
    return (
      <div className="ccv-panel ccv-muted">
        <PanelTitle>Currency</PanelTitle>
        <p className="ccv-lead">Could not determine a currency code for reference country ({referenceCountryCca2}).</p>
      </div>
    );
  }

  if (!viewedIso) {
    return (
      <div className="ccv-panel ccv-muted">
        <PanelTitle>Currency</PanelTitle>
        <p className="ccv-lead">No ISO currency is listed for {viewedCountryLabel}, so conversions can&apos;t be shown.</p>
      </div>
    );
  }

  const amt = parseFloat(amountStr.replace(/,/g, ""));
  const sameCurrency = viewedIso === baseIso;

  /** INR per SAR (when viewed=SAR, base=INR): multiply SAR by this → INR */
  const basePerViewed = viewedToBase;
  /** SAR per INR */
  const viewedPerBase =
    basePerViewed !== null && basePerViewed > 0 ? 1 / basePerViewed : null;

  const amountInputIso =
    sameCurrency ? baseIso : (convertViewedFirst ? viewedIso : baseIso);
  const conversionOutputIso = convertViewedFirst ? baseIso : viewedIso;

  const convertedPair =
    !sameCurrency && basePerViewed !== null && Number.isFinite(amt)
      ? (convertViewedFirst ? amt * basePerViewed : amt / basePerViewed)
      : null;

  const typedAmountToUsdForward =
    !sameCurrency && convertViewedFirst && Number.isFinite(amt)
      ? viewedIso === "USD"
        ? amt
        : viewedToUsd !== null
          ? amt * viewedToUsd
          : null
      : null;

  const typedAmountToUsdReverse =
    !sameCurrency && !convertViewedFirst && Number.isFinite(amt)
      ? baseIso === "USD"
        ? amt
        : baseToUsd !== null
          ? amt * baseToUsd
          : null
      : null;

  const inUsdSameNonUsd =
    sameCurrency && baseIso !== "USD" && viewedToUsd !== null && Number.isFinite(amt)
      ? amt * viewedToUsd
      : null;

  const showUsdBlock =
    viewedToBase !== null
    && ((viewedIso !== "USD" && viewedToUsd !== null)
      || (!sameCurrency && viewedIso === "USD" && baseIso !== "USD")
      || (!sameCurrency && baseIso !== "USD" && baseToUsd !== null)
      || (sameCurrency && baseIso !== "USD" && viewedToUsd !== null));

  return (
    <div className="ccv-panel">
      <PanelTitle>Currency converter</PanelTitle>
      <p className="ccv-tagline">Midpoint rates · {frankfurterTodayDisplayLabel()}</p>
      <div className="ccv-context-strip">
        <div className="ccv-context-chunk">
          <span className="ccv-context-label">You</span>
          <span className="ccv-context-val" title={`${refName} · ${baseIso}`}>
            {refName} · {baseIso}
          </span>
        </div>
        <span className="ccv-context-divider" aria-hidden />
        <div className="ccv-context-chunk">
          <span className="ccv-context-label">Profile</span>
          <span className="ccv-context-val" title={`${viewedCountryLabel} · ${viewedIso}`}>
            {viewedCountryLabel} · {viewedIso}
          </span>
        </div>
      </div>

      {loading && <p className="ccv-status ccv-status--load">Loading rates…</p>}
      {err && <p className="ccv-error">{err}</p>}

      {!loading && !err && viewedToBase !== null && (
        <>
          {!sameCurrency && (
            <>
              <div className="ccv-swap-caption">
                <span className="ccv-ccy-pill">{viewedIso}</span>
                <button
                  type="button"
                  className="ccv-swap-btn"
                  onClick={() => setConvertViewedFirst((v) => !v)}
                  aria-label="Swap: convert viewed country currency versus your currency"
                  title="Swap direction"
                >
                  <SwapArrowsIcon />
                </button>
                <span className="ccv-ccy-pill">{baseIso}</span>
              </div>

              <div className="ccv-rate-block ccv-glass-card">
                <div className="ccv-primary-rate">
                  {convertViewedFirst ? (
                    <>
                      1 {viewedIso} ≈{" "}
                      <strong>{basePerViewed !== null ? fmtLoose(baseIso, basePerViewed) : "—"}</strong>
                    </>
                  ) : (
                    <>
                      1 {baseIso} ≈{" "}
                      <strong>{viewedPerBase !== null ? fmtLoose(viewedIso, viewedPerBase) : "—"}</strong>
                    </>
                  )}
                </div>
                <div className="ccv-subrate">
                  Tap the arrows to switch {viewedIso} → {baseIso} or {baseIso} → {viewedIso}. Midpoint
                  only — not for trading.
                </div>
              </div>

              <div className="ccv-calc-row ccv-glass-card">
                <label className="ccv-calc-label" htmlFor="ccv-foreign-amount">
                  Amount in {amountInputIso}
                </label>
                <input
                  id="ccv-foreign-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountStr}
                  className="ccv-input"
                  onChange={(e) => setAmountStr(e.target.value)}
                />
                {convertedPair !== null && Number.isFinite(amt) && (
                  <div className="ccv-result-pill">
                    <span className="ccv-result-label">≈</span>
                    <span className="ccv-result-value">{fmt(conversionOutputIso, convertedPair)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {sameCurrency && baseIso === "USD" && (
            <p className="ccv-status">Same as your reference (USD).</p>
          )}

          {sameCurrency && baseIso !== "USD" && (
            <>
              <p className="ccv-status">Same currency as your reference — USD comparison below.</p>
              <div className="ccv-calc-row ccv-glass-card">
                <label className="ccv-calc-label" htmlFor="ccv-same-amt">
                  Amount in {baseIso}
                </label>
                <input
                  id="ccv-same-amt"
                  type="number"
                  min={0}
                  step={0.01}
                  value={amountStr}
                  className="ccv-input"
                  onChange={(e) => setAmountStr(e.target.value)}
                />
                {inUsdSameNonUsd !== null && Number.isFinite(amt) && (
                  <div className="ccv-result-pill ccv-result-pill--usd">
                    <span className="ccv-result-label">≈</span>
                    <span className="ccv-result-value">${inUsdSameNonUsd.toFixed(2)} USD</span>
                  </div>
                )}
              </div>
            </>
          )}

          {showUsdBlock && (
            <div className="ccv-usd-block">
              <div className="ccv-usd-title">USD comparison</div>

              {!sameCurrency && viewedIso !== "USD" && viewedToUsd !== null && (
                <div className="ccv-usd-line">
                  1 {viewedIso} ≈ <strong>${viewedToUsd.toFixed(6)} USD</strong>
                </div>
              )}

              {!sameCurrency && baseIso !== "USD" && baseToUsd !== null && (
                <div className="ccv-usd-line">
                  1 {baseIso} ≈ <strong>${baseToUsd.toFixed(6)} USD</strong>
                </div>
              )}

              {!sameCurrency && convertViewedFirst && typedAmountToUsdForward !== null && viewedIso !== "USD" && (
                <div className="ccv-usd-line">
                  {amt} {viewedIso} ≈ <strong>${typedAmountToUsdForward.toFixed(2)} USD</strong>
                </div>
              )}

              {!sameCurrency && !convertViewedFirst && typedAmountToUsdReverse !== null && baseIso !== "USD" && (
                <div className="ccv-usd-line">
                  {amt} {baseIso} ≈ <strong>${typedAmountToUsdReverse.toFixed(2)} USD</strong>
                </div>
              )}

              {!sameCurrency && viewedIso === "USD" && baseIso !== "USD" && (
                <div className="ccv-usd-line">
                  CIA-style figures often use USD. Spot above compares your currency ({baseIso}) to USD.
                </div>
              )}

              {sameCurrency && baseIso !== "USD" && viewedToUsd !== null && (
                <div className="ccv-usd-line">
                  1 {baseIso} ≈ <strong>${viewedToUsd.toFixed(6)} USD</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="ccv-attrib">
        <span className="ccv-attrib-dot" aria-hidden />
        Rates via{" "}
        <a href="https://www.frankfurter.app/" target="_blank" rel="noreferrer">Frankfurter</a>
        · {frankfurterTodayDisplayLabel()}
      </div>
    </div>
  );
};
