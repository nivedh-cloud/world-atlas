import React, { useState, useEffect } from "react";
import { useAppSettings } from "../context/appSettingsContext";
import { CurrencyConverterPanel } from "./CurrencyConverterPanel";
import { getCountryInfo } from "../utils/countryData";
import type { CountryInfo } from "../utils/countryData";
import { getDrivingSide } from "../utils/drivingSide";
import drivingData from "../data/driving-data.json";
import militaryDetailed from "../data/military-powers-detailed.json";
import "./CountryInfoCard.css";

// ── Premium gate flag (set to false to show locked UI) ──
const isPaid = true;

interface MilitaryData {
  name: string;
  power_index: number;
  neutral_status?: string;
  manpower: {
    active: string;
    reserved: string;
    paramilitary: string;
  };
  land_strength: {
    tanks: number;
    armored_vehicles: number;
    self_propelled_artillery: number;
  };
  air_strength: {
    total_aircraft: number;
    fighters: number;
    attack_helicopters: number;
  };
  naval_strength: {
    total_assets: number;
    aircraft_carriers: number;
    submarines: number;
    destroyers: number;
  };
  strategic: {
    nuclear_warheads: number;
    missile_capability: string;
    defense_system: string;
  };
}

interface CountryInfoCardProps {
  countryCode: string | null;
  emblemOpen?: boolean;
  onEmblemOpenChange?: (open: boolean) => void;
}

// ── Palette for distribution bars ──
const BAR_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6",
];

// Parse "Islam 60%, Christianity 25%, Other 15%" → segments
function parsePercentages(text: string): Array<{ label: string; pct: number }> {
  const regex = /([^,]+?)\s+(\d+(?:\.\d+)?)\s*%/g;
  const results: Array<{ label: string; pct: number }> = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const label = match[1].trim().replace(/\s*\(.*?\)\s*/g, " ").trim();
    const pct = parseFloat(match[2]);
    if (label && !isNaN(pct) && pct > 0) results.push({ label, pct });
  }
  return results;
}

// Horizontal bar chart — percentage left, proportional bar (multicolor), label right
const HorizontalBars: React.FC<{ text: string }> = ({ text }) => {
  const segs = parsePercentages(text);
  if (segs.length < 1) return <p className="cic-plain-value">{text}</p>;
  const max = Math.max(...segs.map(s => s.pct));
  return (
    <div className="cic-hbar-list">
      {segs.map((s, i) => (
        <div key={i} className="cic-hbar-row">
          <span className="cic-hbar-pct">{s.pct}%</span>
          <div className="cic-hbar-track">
            <div
              className="cic-hbar-fill"
              style={{ width: `${(s.pct / max) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
          <span className="cic-hbar-lbl">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

// Horizontal progress bar for numeric metrics
const ProgressBar: React.FC<{ value: string; max?: number; color?: string }> = ({
  value, max = 100, color = "#6366f1",
}) => {
  const num = parseFloat(value.match(/[\d.]+/)?.[0] ?? "");
  const pct = isNaN(num) ? null : Math.min((num / max) * 100, 100);
  return (
    <div className="cic-progress">
      {pct !== null && (
        <div className="cic-progress-track">
          <div className="cic-progress-fill" style={{ width: `${pct}%`, background: color }} />
        </div>
      )}
      <span className="cic-progress-val">{value}</span>
    </div>
  );
};

// Language / keyword pills
const TagList: React.FC<{ text: string }> = ({ text }) => {
  const items = text.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
  return (
    <div className="cic-tags">
      {items.map((item, i) => <span key={i} className="cic-tag">{item}</span>)}
    </div>
  );
};

// Industry keyword chips (comma-split)
const IndustryChips: React.FC<{ text: string }> = ({ text }) => {
  const items = text.split(/,/).map(t => t.trim()).filter(Boolean);
  return (
    <div className="cic-industry-chips">
      {items.map((item, i) => <span key={i} className="cic-industry-chip">{item}</span>)}
    </div>
  );
};

// Section wrapper
const Section: React.FC<{
  icon: string; title: string; accent: string; children: React.ReactNode;
}> = ({ icon, title, accent, children }) => (
  <div className="cic-section" style={{ "--section-accent": accent } as React.CSSProperties}>
    <div className="cic-section-header">
      <span className="cic-section-icon">{icon}</span>
      <span className="cic-section-title">{title}</span>
    </div>
    <div className="cic-section-body">{children}</div>
  </div>
);

// Generic labeled field
const Field: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({
  icon, label, children,
}) => (
  <div className="cic-field">
    <div className="cic-field-header">
      <span className="cic-field-icon">{icon}</span>
      <span className="cic-field-label">{label}</span>
    </div>
    <div className="cic-field-content">{children}</div>
  </div>
);

// Simple row value
const FieldText: React.FC<{ icon: string; label: string; value: string | undefined | null }> = ({
  icon, label, value,
}) => {
  if (!value || value === "Information not available" || value === "N/A") return null;
  return (
    <Field icon={icon} label={label}>
      <p className="cic-plain-value">{value}</p>
    </Field>
  );
};

export const CountryInfoCard: React.FC<CountryInfoCardProps> = ({ countryCode, emblemOpen = false, onEmblemOpenChange }) => {
  const { settings } = useAppSettings();
  const [countryInfo, setCountryInfo] = useState<CountryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEmblemOpen = (open: boolean) => onEmblemOpenChange?.(open);

  useEffect(() => {
    if (!countryCode) {
      setCountryInfo(null);
      setError(null);
      return;
    }

    const loadCountryInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const info = await getCountryInfo(countryCode);
        if (info) {
          setCountryInfo(info);
        } else {
          setError("Country data not found");
        }
      } catch (err) {
        console.error("Error loading country info:", err);
        setError("Failed to load country data");
      } finally {
        setLoading(false);
      }
    };

    loadCountryInfo();
  }, [countryCode]);

  if (!countryCode) return null;

  if (loading) {
    return (
      <div className="cic-loading">
        <div className="cic-spinner" />
        <p>Loading country information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cic-error">
        <span>⚠️</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!countryInfo) return null;

  const has = (v: string | string[] | undefined | null | boolean): boolean => {
    if (v === undefined || v === null) return false;
    if (typeof v === "boolean") return true;
    if (Array.isArray(v)) return v.length > 0 && !v.every((x) => x === "N/A");
    return v !== "" && v !== "Information not available" && v !== "N/A";
  };

  const currencyDisplay =
    has(countryInfo.currency)
      ? countryInfo.currencySymbol
        ? `${countryInfo.currency} (${countryInfo.currencySymbol})`
        : countryInfo.currency
      : null;


  const drivingEntry = countryInfo.cca2
    ? (drivingData as Record<string, { side: string; signs: string | string[] }>)[countryInfo.cca2]
    : null;
  const drivingSideStr = drivingEntry?.side
    ? `${drivingEntry.side.charAt(0).toUpperCase()}${drivingEntry.side.slice(1)}`
    : countryInfo.cca2
    ? getDrivingSide(countryInfo.cca2)
    : countryInfo.drivingSide
    ? `${countryInfo.drivingSide.charAt(0).toUpperCase()}${countryInfo.drivingSide.slice(1)}`
    : null;
  const drivingText = drivingSideStr ? `${drivingSideStr}-hand traffic` : undefined;
  const carSign: string | null = drivingEntry?.signs
    ? Array.isArray(drivingEntry.signs)
      ? drivingEntry.signs.filter(Boolean).join(" / ")
      : (drivingEntry.signs as string) || null
    : null;

  const hasPeople =
    has(countryInfo.religion) || has(countryInfo.ethnicGroups) ||
    has(countryInfo.language) || has(countryInfo.lifeExpectancy) ||
    has(countryInfo.literacyActual) || has(countryInfo.literacyRate) ||
    has(countryInfo.medianAge) || has(countryInfo.populationGrowth) ||
    has(countryInfo.urbanization) || has(countryInfo.birthRate) ||
    has(countryInfo.infantMortality) || has(countryInfo.obesity) ||
    has(countryInfo.healthExpenditure) || has(countryInfo.physicianDensity);

  const hasEconomy =
    has(countryInfo.gdp) || has(countryInfo.gdpPerCapita) ||
    has(countryInfo.gdpGrowth) || has(countryInfo.industries) ||
    has(countryInfo.unemployment) || has(countryInfo.inflation) ||
    has(countryInfo.povertyRate) || has(countryInfo.publicDebt) ||
    has(countryInfo.exportPartners) || has(countryInfo.exportCommodities) ||
    has(countryInfo.importCommodities) || has(countryInfo.laborForce);

  const hasGeography =
    has(countryInfo.continent) || has(countryInfo.coordinates) ||
    typeof countryInfo.landlocked === "boolean" || has(countryInfo.timezone) ||
    has(countryInfo.neighbors) || has(countryInfo.climate) ||
    has(countryInfo.terrain) || has(countryInfo.coastline) ||
    has(countryInfo.naturalResources) || has(countryInfo.naturalHazards);

  const hasDetails =
    has(countryInfo.government) || has(countryInfo.independence) ||
    has(countryInfo.nationalHoliday) || has(countryInfo.nationalAnthem) ||
    has(countryInfo.callingCode) || has(countryInfo.tld);

  const hasMilitary =
    has(countryInfo.militarySpending) || has(countryInfo.militaryBranches) ||
    has(countryInfo.militaryPersonnel) || has(countryInfo.militaryServiceAge) ||
    has(countryInfo.militaryDeployments) || (countryInfo.militarySpendingHistory && Object.keys(countryInfo.militarySpendingHistory).length > 0);

  return (
    <div className="cic-container">

      {/* ── Flag Hero + Emblem Badge ── */}
      {countryInfo.flag ? (
        <div className="cic-flag-wrap">
          <div className="cic-flag-hero">
            <img src={countryInfo.flag} alt={`Flag of ${countryInfo.name}`} className="cic-flag-img" />
            <div className="cic-flag-gradient" />
            <div className="cic-flag-text">
              <h1 className="cic-country-name">{countryInfo.name}</h1>
              {countryInfo.officialName && countryInfo.officialName !== countryInfo.name && (
                <p className="cic-official-name">{countryInfo.officialName}</p>
              )}
            </div>
          </div>
          {countryInfo.coatOfArms && (
            <button className="cic-emblem-badge" onClick={() => setEmblemOpen(true)} aria-label="View coat of arms">
              <img src={countryInfo.coatOfArms} alt={`Coat of arms of ${countryInfo.name}`} className="cic-emblem-badge-img" />
            </button>
          )}
        </div>
      ) : (
        <div className="cic-no-flag">
          <h1 className="cic-country-name-plain">{countryInfo.name}</h1>
          {countryInfo.officialName && countryInfo.officialName !== countryInfo.name && (
            <p className="cic-official-name-plain">{countryInfo.officialName}</p>
          )}
        </div>
      )}

      {/* ── Priority Info Strip ── */}
      {(has(countryInfo.language) || has(currencyDisplay)) && (
        <div className="cic-priority-strip">
          {has(countryInfo.language) && (
            <div className="cic-priority-row">
              <span className="cic-priority-icon">🗣️</span>
              <div className="cic-priority-content">
                <span className="cic-priority-label">Languages</span>
                <span className="cic-priority-value">{countryInfo.language}</span>
              </div>
            </div>
          )}
          {has(currencyDisplay) && (
            <div className="cic-priority-row">
              <span className="cic-priority-icon">💵</span>
              <div className="cic-priority-content">
                <span className="cic-priority-label">Currency</span>
                <span className="cic-priority-value">{currencyDisplay}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Stats ── */}
      <div className="cic-stats-grid">
        {has(countryInfo.population) && (
          <div className="cic-stat">
            <span className="cic-stat-icon">👥</span>
            <span className="cic-stat-value">{countryInfo.population}</span>
            <span className="cic-stat-label">Population</span>
          </div>
        )}
        {has(countryInfo.area) && (
          <div className="cic-stat">
            <span className="cic-stat-icon">📐</span>
            <span className="cic-stat-value">{countryInfo.area}</span>
            <span className="cic-stat-label">Area</span>
          </div>
        )}
        {has(countryInfo.capital) && (
          <div className="cic-stat">
            <span className="cic-stat-icon">🏛️</span>
            <span className="cic-stat-value">{countryInfo.capital}</span>
            <span className="cic-stat-label">Capital</span>
          </div>
        )}
        {has(countryInfo.continent || countryInfo.region) && (
          <div className="cic-stat">
            <span className="cic-stat-icon">🌍</span>
            <span className="cic-stat-value">{countryInfo.continent || countryInfo.region}</span>
            <span className="cic-stat-label">Continent</span>
          </div>
        )}
        {has(drivingText) && (
          <div className="cic-stat">
            <span className="cic-stat-icon">{drivingText?.startsWith('Left') ? '🛣️⬅️' : '🛣️➡️'}</span>
            <span className="cic-stat-value">{drivingText}</span>
            <span className="cic-stat-label">Driving Side</span>
          </div>
        )}
        {carSign && (
          <div className="cic-stat">
            <span className="cic-stat-icon">🏷️</span>
            <span className="cic-stat-value">{carSign}</span>
            <span className="cic-stat-label">Vehicle registration code</span>
          </div>
        )}
      </div>

      <CurrencyConverterPanel
        referenceCountryCca2={settings.referenceCurrencyCountryCode}
        viewedCountryCca2={countryInfo.cca2 ?? null}
        viewedCountryLabel={countryInfo.name}
        viewedCurrencyCode={countryInfo.currencyCode ?? null}
      />

      {/* ── Military Power (Detailed) — Premium ── */}
      {(() => {
        const milData = countryInfo.cca2
          ? (militaryDetailed as Record<string, MilitaryData>)[countryInfo.cca2]
          : null;
        if (!milData) return null;

        const isNeutral = milData.power_index === 9999;

        return (
          <div className="cic-section cic-mil-premium-section" style={{ "--section-accent": "#dc2626" } as React.CSSProperties}>
            <div className="cic-section-header">
              <span className="cic-section-icon">🎖️</span>
              <span className="cic-section-title">Military Power Index</span>
              {!isPaid && <span className="cic-premium-badge">🔒 Premium</span>}
            </div>

            {/* Neutral countries */}
            {isNeutral ? (
              <div className="cic-mil-neutral">
                <span className="cic-mil-neutral-icon">🕊️</span>
                <div>
                  <div className="cic-mil-neutral-label">No Active Military</div>
                  <div className="cic-mil-neutral-reason">{milData.neutral_status}</div>
                </div>
              </div>
            ) : (
              <div className={`cic-mil-premium-body ${!isPaid ? 'cic-mil-locked' : ''}`}>

                {/* Power Index badge */}
                <div className="cic-mil-pi-row">
                  <div className="cic-mil-pi-badge">
                    <span className="cic-mil-pi-num">{milData.power_index?.toFixed(4)}</span>
                    <span className="cic-mil-pi-lbl">Global Power Index</span>
                    <span className="cic-mil-pi-note">Lower = Stronger</span>
                  </div>
                </div>

                {/* Manpower */}
                {milData.manpower && (
                  <div className="cic-mil-block">
                    <div className="cic-mil-block-title">👥 Manpower</div>
                    <div className="cic-mil-stat-row">
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.manpower.active ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Active</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.manpower.reserved ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Reserve</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.manpower.paramilitary ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Paramilitary</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Land Strength */}
                {milData.land_strength && (
                  <div className="cic-mil-block">
                    <div className="cic-mil-block-title">🪖 Land Strength</div>
                    <div className="cic-mil-stat-row">
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.land_strength.tanks?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Tanks</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.land_strength.armored_vehicles?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">AFVs</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.land_strength.self_propelled_artillery?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">SPAs</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Air Strength */}
                {milData.air_strength && (
                  <div className="cic-mil-block">
                    <div className="cic-mil-block-title">✈️ Air Strength</div>
                    <div className="cic-mil-stat-row">
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.air_strength.total_aircraft?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Total</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.air_strength.fighters?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Fighters</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.air_strength.attack_helicopters?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Helos</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Naval Strength */}
                {milData.naval_strength && (
                  <div className="cic-mil-block">
                    <div className="cic-mil-block-title">⚓ Naval Strength</div>
                    <div className="cic-mil-stat-row">
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.naval_strength.total_assets?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Total</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.naval_strength.aircraft_carriers?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Carriers</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.naval_strength.submarines?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Subs</span>
                      </div>
                      <div className="cic-mil-stat-card">
                        <span className="cic-mil-stat-val">{milData.naval_strength.destroyers?.toLocaleString() ?? '—'}</span>
                        <span className="cic-mil-stat-lbl">Destroyers</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strategic */}
                {milData.strategic && (
                  <div className="cic-mil-block">
                    <div className="cic-mil-block-title">☢️ Strategic Capability</div>
                    <div className="cic-mil-strategic">
                      {milData.strategic.nuclear_warheads != null && milData.strategic.nuclear_warheads > 0 && (
                        <div className="cic-mil-strategic-row">
                          <span className="cic-mil-strategic-icon">☢️</span>
                          <span className="cic-mil-strategic-lbl">Nuclear Warheads</span>
                          <span className="cic-mil-strategic-val">{milData.strategic.nuclear_warheads.toLocaleString()}</span>
                        </div>
                      )}
                      {milData.strategic.missile_capability && milData.strategic.missile_capability !== 'None' && (
                        <div className="cic-mil-strategic-row">
                          <span className="cic-mil-strategic-icon">🚀</span>
                          <span className="cic-mil-strategic-lbl">Missiles</span>
                          <span className="cic-mil-strategic-val">{milData.strategic.missile_capability}</span>
                        </div>
                      )}
                      {milData.strategic.defense_system && milData.strategic.defense_system !== 'None' && (
                        <div className="cic-mil-strategic-row">
                          <span className="cic-mil-strategic-icon">🛡️</span>
                          <span className="cic-mil-strategic-lbl">Defense Systems</span>
                          <span className="cic-mil-strategic-val">{milData.strategic.defense_system}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lock overlay when not paid */}
                {!isPaid && (
                  <div className="cic-mil-lock-overlay">
                    <div className="cic-mil-lock-box">
                      <span className="cic-mil-lock-icon">🔒</span>
                      <div className="cic-mil-lock-title">Premium Feature</div>
                      <div className="cic-mil-lock-sub">Upgrade to access detailed military power data</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── People & Society ── */}
      {hasPeople && (
        <Section icon="👥" title="People & Society" accent="#6366f1">

          {has(countryInfo.ethnicGroups) && (
            <Field icon="👥" label="Ethnic Groups">
              <HorizontalBars text={countryInfo.ethnicGroups!} />
            </Field>
          )}

          {has(countryInfo.religion) && (
            <Field icon="🙏" label="Religion">
              <HorizontalBars text={countryInfo.religion!} />
            </Field>
          )}

          {has(countryInfo.lifeExpectancy) && (
            <Field icon="❤️" label="Life Expectancy">
              <ProgressBar value={countryInfo.lifeExpectancy!} max={90} color="#10b981" />
            </Field>
          )}

          {has(countryInfo.literacyActual) && (
            <Field icon="📚" label="Literacy Rate">
              <ProgressBar value={countryInfo.literacyActual!} max={100} color="#f59e0b" />
            </Field>
          )}

          {!has(countryInfo.literacyActual) && has(countryInfo.literacyRate) && (
            <Field icon="📚" label="School Life Expectancy">
              <ProgressBar value={countryInfo.literacyRate!} max={20} color="#f59e0b" />
            </Field>
          )}

          {has(countryInfo.medianAge) && (
            <Field icon="🧑" label="Median Age">
              <ProgressBar value={countryInfo.medianAge!} max={60} color="#8b5cf6" />
            </Field>
          )}

          {has(countryInfo.urbanization) && (
            <Field icon="🏙️" label="Urbanization">
              <ProgressBar value={countryInfo.urbanization!} max={100} color="#0ea5e9" />
            </Field>
          )}

          {has(countryInfo.populationGrowth) && (
            <FieldText icon="📈" label="Population Growth" value={countryInfo.populationGrowth} />
          )}
          {has(countryInfo.birthRate) && (
            <FieldText icon="👶" label="Birth Rate" value={countryInfo.birthRate} />
          )}
          {has(countryInfo.deathRate) && (
            <FieldText icon="🚪" label="Death Rate" value={countryInfo.deathRate} />
          )}
          {has(countryInfo.infantMortality) && (
            <FieldText icon="🏥" label="Infant Mortality" value={countryInfo.infantMortality} />
          )}
          {has(countryInfo.obesity) && (
            <FieldText icon="🍔" label="Obesity Rate" value={countryInfo.obesity} />
          )}
          {has(countryInfo.healthExpenditure) && (
            <FieldText icon="💰" label="Health Expenditure" value={countryInfo.healthExpenditure} />
          )}
          {has(countryInfo.physicianDensity) && (
            <FieldText icon="👨‍⚕️" label="Physicians" value={countryInfo.physicianDensity} />
          )}

        </Section>
      )}

      {/* ── Economy ── */}
      {hasEconomy && (
        <Section icon="💰" title="Economy" accent="#10b981">

          {(has(countryInfo.gdp) || has(countryInfo.gdpPerCapita) || has(countryInfo.gdpGrowth)) && (
            <div className="cic-econ-grid">
              {has(countryInfo.gdp) && (
                <div className="cic-econ-card">
                  <span className="cic-econ-icon">📊</span>
                  <span className="cic-econ-label">GDP (PPP)</span>
                  <span className="cic-econ-value">{countryInfo.gdp}</span>
                </div>
              )}
              {has(countryInfo.gdpPerCapita) && (
                <div className="cic-econ-card">
                  <span className="cic-econ-icon">💳</span>
                  <span className="cic-econ-label">Per Capita</span>
                  <span className="cic-econ-value">{countryInfo.gdpPerCapita}</span>
                </div>
              )}
              {has(countryInfo.gdpGrowth) && (
                <div className="cic-econ-card">
                  <span className="cic-econ-icon">📉</span>
                  <span className="cic-econ-label">Growth Rate</span>
                  <span className="cic-econ-value">{countryInfo.gdpGrowth}</span>
                </div>
              )}
            </div>
          )}

          {has(countryInfo.industries) && (
            <Field icon="🏭" label="Major Industries">
              <IndustryChips text={countryInfo.industries!} />
            </Field>
          )}

          {has(countryInfo.agriculturalProducts) && (
            <Field icon="🌾" label="Agricultural Products">
              <IndustryChips text={countryInfo.agriculturalProducts!} />
            </Field>
          )}

          {has(countryInfo.unemployment) && (
            <Field icon="📊" label="Unemployment">
              <ProgressBar value={countryInfo.unemployment!} max={30} color="#f59e0b" />
            </Field>
          )}

          {has(countryInfo.inflation) && (
            <FieldText icon="📉" label="Inflation Rate" value={countryInfo.inflation} />
          )}
          {has(countryInfo.publicDebt) && (
            <FieldText icon="🏦" label="Public Debt (% GDP)" value={countryInfo.publicDebt} />
          )}
          {has(countryInfo.povertyRate) && (
            <FieldText icon="⚠️" label="Below Poverty Line" value={countryInfo.povertyRate} />
          )}
          {has(countryInfo.laborForce) && (
            <FieldText icon="👷" label="Labor Force" value={countryInfo.laborForce} />
          )}
          {has(countryInfo.exportPartners) && (
            <FieldText icon="📤" label="Export Partners" value={countryInfo.exportPartners} />
          )}
          {has(countryInfo.exportCommodities) && (
            <FieldText icon="📦" label="Export Goods" value={countryInfo.exportCommodities} />
          )}
          {has(countryInfo.importPartners) && (
            <FieldText icon="📥" label="Import Partners" value={countryInfo.importPartners} />
          )}
          {has(countryInfo.importCommodities) && (
            <FieldText icon="🛂" label="Import Goods" value={countryInfo.importCommodities} />
          )}

        </Section>
      )}

      {/* ── Geography & Nature ── */}
      {hasGeography && (
        <Section icon="🗺️" title="Geography & Nature" accent="#0ea5e9">

          <div className="cic-geo-chips">
            {has(countryInfo.continent) && (
              <div className="cic-geo-chip">
                <span className="cic-geo-chip-icon">🌐</span>
                <span className="cic-geo-chip-val">{countryInfo.continent}</span>
                <span className="cic-geo-chip-lbl">Continent</span>
              </div>
            )}
            {typeof countryInfo.landlocked === "boolean" && (
              <div className="cic-geo-chip">
                <span className="cic-geo-chip-icon">{countryInfo.landlocked ? "🏔️" : "🌊"}</span>
                <span className="cic-geo-chip-val">{countryInfo.landlocked ? "Landlocked" : "Coastal"}</span>
                <span className="cic-geo-chip-lbl">Access</span>
              </div>
            )}
            {has(countryInfo.timezone) && (
              <div className="cic-geo-chip">
                <span className="cic-geo-chip-icon">🕐</span>
                <span className="cic-geo-chip-val">{countryInfo.timezone}</span>
                <span className="cic-geo-chip-lbl">Timezone</span>
              </div>
            )}
          </div>

          <FieldText icon="🌏" label="Coordinates" value={countryInfo.coordinates} />
          <FieldText icon="🤝" label="Borders" value={countryInfo.neighbors} />
          <FieldText icon="🌡️" label="Climate" value={countryInfo.climate} />
          <FieldText icon="⛰️" label="Terrain" value={countryInfo.terrain} />
          <FieldText icon="🏖️" label="Coastline" value={countryInfo.coastline} />
          <FieldText icon="💎" label="Natural Resources" value={countryInfo.naturalResources} />
          <FieldText icon="⚡" label="Natural Hazards" value={countryInfo.naturalHazards} />

        </Section>
      )}

      {/* ── Government & Details ── */}
      {hasDetails && (
        <Section icon="🏛️" title="Government & Details" accent="#f59e0b">

          <FieldText icon="⚖️" label="Government Type" value={countryInfo.government} />
          <FieldText icon="📅" label="Independence" value={countryInfo.independence} />
          <FieldText icon="🎉" label="National Holiday" value={countryInfo.nationalHoliday} />
          <FieldText icon="🎵" label="National Anthem" value={countryInfo.nationalAnthem} />

          <div className="cic-detail-chips">
            {has(countryInfo.callingCode) && (
              <div className="cic-detail-chip">
                <span className="cic-detail-chip-icon">📞</span>
                <span className="cic-detail-chip-lbl">Calling Code</span>
                <span className="cic-detail-chip-val">{countryInfo.callingCode}</span>
              </div>
            )}
            {has(countryInfo.tld) && (
              <div className="cic-detail-chip">
                <span className="cic-detail-chip-icon">🌐</span>
                <span className="cic-detail-chip-lbl">Domain</span>
                <span className="cic-detail-chip-val">{countryInfo.tld}</span>
              </div>
            )}
          </div>

        </Section>
      )}

      {/* ── Military & Security ── */}
      {hasMilitary && (
        <Section icon="⚔️" title="Military & Security" accent="#ef4444">

          {/* Stat mini-grid */}
          {(has(countryInfo.militaryPersonnel) || has(countryInfo.militarySpending) || has(countryInfo.militaryServiceAge)) && (
            <div className="cic-mil-grid">
              {has(countryInfo.militaryPersonnel) && (
                <div className="cic-mil-card">
                  <span className="cic-mil-icon">🪖</span>
                  <span className="cic-mil-label">Active Personnel</span>
                  <span className="cic-mil-value">{countryInfo.militaryPersonnel}</span>
                </div>
              )}
              {has(countryInfo.militarySpending) && (
                <div className="cic-mil-card">
                  <span className="cic-mil-icon">💸</span>
                  <span className="cic-mil-label">Spending (GDP %)</span>
                  <span className="cic-mil-value">{countryInfo.militarySpending}</span>
                </div>
              )}
              {has(countryInfo.militaryServiceAge) && (
                <div className="cic-mil-card">
                  <span className="cic-mil-icon">📋</span>
                  <span className="cic-mil-label">Service Age</span>
                  <span className="cic-mil-value">{countryInfo.militaryServiceAge}</span>
                </div>
              )}
            </div>
          )}

          {has(countryInfo.militaryBranches) && (
            <Field icon="⚔️" label="Branches">
              <TagList text={countryInfo.militaryBranches!} />
            </Field>
          )}

          <FieldText icon="🏁" label="Deployments" value={countryInfo.militaryDeployments} />

        </Section>
      )}

      {/* ── Society & Digital ── */}
      {has(countryInfo.internetUsers) && (
        <Section icon="🌐" title="Society & Digital" accent="#8b5cf6">
          {has(countryInfo.internetUsers) && (
            <Field icon="📶" label="Internet Users">
              <ProgressBar value={countryInfo.internetUsers!} max={100} color="#8b5cf6" />
            </Field>
          )}
        </Section>
      )}

      <div className="cic-bottom-spacer" />

      {/* ── Emblem Modal ── */}
      {emblemOpen && countryInfo.coatOfArms && (
        <div className="cic-emblem-modal-overlay" onClick={() => setEmblemOpen(false)}>
          <div className="cic-emblem-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cic-emblem-modal-header">
              <span className="cic-emblem-modal-title">National Emblem</span>
              <button className="cic-emblem-modal-close" onClick={() => setEmblemOpen(false)} aria-label="Close">✕</button>
            </div>
            <div className="cic-emblem-modal-body">
              <img
                src={countryInfo.coatOfArms}
                alt={`Coat of arms of ${countryInfo.name}`}
                className="cic-emblem-modal-img"
              />
            </div>
            <p className="cic-emblem-modal-caption">{countryInfo.name}</p>
          </div>
        </div>
      )}
    </div>
  );
};