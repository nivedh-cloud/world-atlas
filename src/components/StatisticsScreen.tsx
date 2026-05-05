import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { ensureStatsCountryFacts, getStatsCountryFactsSync } from '../utils/statsCountryFactsCache';
import militaryPowers from '../data/military-powers.json';
import gmiStats from '../data/gmi-stats.json';
import socialIndex from '../data/social-index.json';
import economyStats from '../data/economy-stats.json';
import demographicsStats from '../data/demographics-stats.json';
import educationStats from '../data/education-stats.json';
import governanceStats from '../data/governance-stats.json';
import energyStats from '../data/energy-stats.json';
import geographyStats from '../data/geography-stats.json';
import gdpStats from '../data/gdp-stats.json';
import './StatisticsScreen.css';

export type StatMetric =
  | 'population' | 'area' | 'defence' | 'health' | 'social'
  | 'economy' | 'demographics' | 'education' | 'governance' | 'energy' | 'geography' | 'gdp';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  metric: StatMetric | null;
  onCountrySelect?: (code: string) => void;
}

const METRIC_CONFIG: Record<StatMetric, { label: string; icon: string; unit: string; desc: string }> = {
  population: { label: 'Population',       icon: '👥', unit: '',      desc: 'Most populous countries' },
  area:        { label: 'Area',             icon: '🌍', unit: 'km²',  desc: 'Largest countries by land area' },
  defence:     { label: 'Defence Strength', icon: '🛡️', unit: '',      desc: 'Military power index ranking' },
  health:      { label: 'Health',           icon: '🏥', unit: 'yrs',   desc: 'Life expectancy at birth (years)' },
  social:      { label: 'Social Index',     icon: '🌱', unit: 'HDI',    desc: 'Human Development Index — quality of life ranking' },
  economy:     { label: 'Economy',          icon: '💰', unit: 'PPP $',  desc: 'GDP per capita (PPP) — prosperity ranking' },
  demographics:{ label: 'Demographics',     icon: '👶', unit: 'yrs',    desc: 'Median age & fertility rate by country' },
  education:   { label: 'Education',        icon: '🎓', unit: '%',      desc: 'Literacy rate & education spending' },
  governance:  { label: 'Governance',       icon: '🏛️', unit: '/10',    desc: 'Democracy index & political freedom' },
  energy:      { label: 'Energy',           icon: '⚡', unit: '% renew', desc: 'Renewable energy share & CO₂ emissions' },
  geography:   { label: 'Geography',        icon: '🌳', unit: '% forest', desc: 'Forest cover & protected areas' },
  gdp:         { label: 'GDP',              icon: '📊', unit: '$B',       desc: 'Gross Domestic Product ranking (IMF 2024)' },
};

type MilitaryEntry = {
  military_rank: number;
  active_personnel: number;
  defense_budget: string;
};

type GMIEntry = { name: string; gmi: number; hw: number; milexp: number; milper: number };
type GDPEntry = { ppp_total: number; ppp_pc: number; nom_total: number; nom_pc: number };

type GDPTab = 'ppp_total' | 'ppp_pc' | 'nom_total' | 'nom_pc';

const GDP_TABS: { value: GDPTab; label: string; desc: string; unit: string }[] = [
  { value: 'ppp_total', label: 'PPP (Total)',       desc: 'GDP by Purchasing Power Parity — total (billions Int$)',    unit: 'B Int$' },
  { value: 'ppp_pc',    label: 'PPP (Per Capita)',  desc: 'GDP by Purchasing Power Parity — per person (Int$)',        unit: 'Int$'   },
  { value: 'nom_total', label: 'Nominal (Total)',   desc: 'Nominal GDP at current prices — total (billions USD)',      unit: 'B USD'  },
  { value: 'nom_pc',    label: 'Nominal (Per Cap)', desc: 'Nominal GDP at current prices — per person (USD)',          unit: 'USD'    },
];

type DefenceTab = 'power' | 'gmi' | 'milexp' | 'milper' | 'hw';

const DEFENCE_TABS: { value: DefenceTab; label: string; desc: string }[] = [
  { value: 'power',  label: 'Power Index',   desc: 'Overall military power ranking' },
  { value: 'gmi',    label: 'GMI',           desc: 'Global Militarization Index' },
  { value: 'milexp', label: 'Expenditure',   desc: 'Military Expenditure Index' },
  { value: 'milper', label: 'Personnel',     desc: 'Military Personnel Index' },
  { value: 'hw',     label: 'Heavy Weapons', desc: 'Heavy Weapons Index' },
];

type SocialEntry = {
  hdi: number;
  life_exp: number;
  happiness: number | null;
};

type EconomyEntry   = { gdp_pc: number; gini: number };
type DemographyEntry = { median_age: number; fertility: number };
type EducationEntry  = { literacy: number; edu_spend: number };
type GovernanceEntry = { democracy: number; freedom: string };
type EnergyEntry     = { renewable_pct: number; co2_pc: number };
type GeographyEntry  = { forest_pct: number; protected_pct: number };

function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

function formatArea(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M km²';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K km²';
  return n.toLocaleString() + ' km²';
}

interface RankedRow {
  code: string;
  name: string;
  flag: string;
  value: number;
  displayValue: string;
  subLabel?: string;
}

function flagUrl(code: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/+$/, '')}/flags/${code.toLowerCase()}.svg`;
}

export const StatisticsScreen: React.FC<Props> = ({ isOpen, onClose, metric, onCountrySelect }) => {
  const [statsData, setStatsData] = useState<
    Record<string, { code: string; gecCode: string; name: string; population: number; area: number }> | null
  >(() => getStatsCountryFactsSync());

  // Warm cache at mount + share work with App idle preload (single-flight in ensureStatsCountryFacts).
  useEffect(() => {
    let cancelled = false;
    ensureStatsCountryFacts()
      .then((data) => {
        if (!cancelled) setStatsData(data);
      })
      .catch((err) => {
        console.error("Failed to load statistics country facts:", err);
        if (!cancelled) setStatsData({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = statsData === null;

  const [defenceTab, setDefenceTab] = useState<DefenceTab>('power');
  const [gdpTab, setGdpTab] = useState<GDPTab>('ppp_total');

  const rows = useMemo<RankedRow[]>(() => {
    if (!metric || !statsData) return [];

    const mp  = militaryPowers   as Record<string, MilitaryEntry>;
    const gm  = gmiStats         as Record<string, GMIEntry>;
    const gd  = gdpStats         as Record<string, GDPEntry>;
    const si  = socialIndex      as Record<string, SocialEntry>;
    const eco = economyStats     as Record<string, EconomyEntry>;
    const dem = demographicsStats as Record<string, DemographyEntry>;
    const edu = educationStats   as Record<string, EducationEntry>;
    const gov = governanceStats  as Record<string, GovernanceEntry>;
    const ene = energyStats      as Record<string, EnergyEntry>;
    const geo = geographyStats   as Record<string, GeographyEntry>;

    if (metric === 'population') {
      return Object.values(statsData)
        .filter(c => c.population > 0)
        .sort((a, b) => b.population - a.population)
        .map(c => ({
          code: c.code,
          name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
          flag: flagUrl(c.code),
          value: c.population,
          displayValue: formatPopulation(c.population),
        }));
    }

    if (metric === 'area') {
      return Object.values(statsData)
        .filter(c => c.area > 0)
        .sort((a, b) => b.area - a.area)
        .map(c => ({
          code: c.code,
          name: c.name.charAt(0).toUpperCase() + c.name.slice(1),
          flag: flagUrl(c.code),
          value: c.area,
          displayValue: formatArea(c.area),
        }));
    }

    if (metric === 'defence') {
      const getName = (code: string, fallback: string) => {
        const c = statsData[code];
        const n = c?.name || fallback;
        return n.charAt(0).toUpperCase() + n.slice(1);
      };

      if (defenceTab === 'power') {
        return Object.entries(mp)
          .sort(([, a], [, b]) => a.military_rank - b.military_rank)
          .map(([code, entry]) => ({
            code,
            name: getName(code, code),
            flag: flagUrl(code),
            value: entry.active_personnel,
            displayValue: entry.active_personnel >= 1_000_000
              ? (entry.active_personnel / 1_000_000).toFixed(2) + 'M troops'
              : entry.active_personnel >= 1_000
              ? (entry.active_personnel / 1_000).toFixed(0) + 'K troops'
              : entry.active_personnel + ' troops',
            subLabel: entry.defense_budget,
          }));
      }

      if (defenceTab === 'gmi') {
        return Object.entries(gm)
          .sort(([, a], [, b]) => b.gmi - a.gmi)
          .map(([code, entry]) => ({
            code,
            name: getName(code, entry.name),
            flag: flagUrl(code),
            value: entry.gmi,
            displayValue: entry.gmi.toFixed(1),
            subLabel: 'GMI Score',
          }));
      }

      if (defenceTab === 'milexp') {
        return Object.entries(gm)
          .filter(([, e]) => e.milexp > 0)
          .sort(([, a], [, b]) => b.milexp - a.milexp)
          .map(([code, entry]) => ({
            code,
            name: getName(code, entry.name),
            flag: flagUrl(code),
            value: entry.milexp,
            displayValue: entry.milexp.toFixed(2),
            subLabel: 'Expenditure Index',
          }));
      }

      if (defenceTab === 'milper') {
        return Object.entries(gm)
          .filter(([, e]) => e.milper > 0)
          .sort(([, a], [, b]) => b.milper - a.milper)
          .map(([code, entry]) => ({
            code,
            name: getName(code, entry.name),
            flag: flagUrl(code),
            value: entry.milper,
            displayValue: entry.milper.toFixed(2),
            subLabel: 'Personnel Index',
          }));
      }

      if (defenceTab === 'hw') {
        return Object.entries(gm)
          .filter(([, e]) => e.hw > 0)
          .sort(([, a], [, b]) => b.hw - a.hw)
          .map(([code, entry]) => ({
            code,
            name: getName(code, entry.name),
            flag: flagUrl(code),
            value: entry.hw,
            displayValue: entry.hw.toFixed(2),
            subLabel: 'Heavy Weapons Index',
          }));
      }

      return [];
    }

    if (metric === 'health') {
      return Object.entries(si)
        .filter(([, e]) => e.life_exp > 0)
        .sort(([, a], [, b]) => b.life_exp - a.life_exp)
        .map(([code, entry]) => {
          const country = statsData[code];
          const name = country?.name || code;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.life_exp,
            displayValue: entry.life_exp.toFixed(1) + ' yrs',
          };
        });
    }

    if (metric === 'economy') {
      return Object.entries(eco)
        .sort(([, a], [, b]) => b.gdp_pc - a.gdp_pc)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          const gdpFmt = entry.gdp_pc >= 1000
            ? '$' + (entry.gdp_pc / 1000).toFixed(0) + 'K'
            : '$' + entry.gdp_pc;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.gdp_pc,
            displayValue: gdpFmt,
            subLabel: `Gini: ${entry.gini.toFixed(1)}`,
          };
        });
    }

    if (metric === 'demographics') {
      return Object.entries(dem)
        .filter(([k]) => k !== 'CN_KP')
        .sort(([, a], [, b]) => b.median_age - a.median_age)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.median_age,
            displayValue: entry.median_age.toFixed(1) + ' yrs',
            subLabel: `Fertility: ${entry.fertility.toFixed(1)} per woman`,
          };
        });
    }

    if (metric === 'education') {
      return Object.entries(edu)
        .sort(([, a], [, b]) => b.literacy - a.literacy)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.literacy,
            displayValue: entry.literacy.toFixed(1) + '%',
            subLabel: `Edu spend: ${entry.edu_spend.toFixed(1)}% of GDP`,
          };
        });
    }

    if (metric === 'governance') {
      return Object.entries(gov)
        .sort(([, a], [, b]) => b.democracy - a.democracy)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          const freedomIcon = entry.freedom === 'Free' ? '🟢' : entry.freedom === 'Partly Free' ? '🟡' : '🔴';
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.democracy,
            displayValue: entry.democracy.toFixed(2) + '/10',
            subLabel: `${freedomIcon} ${entry.freedom}`,
          };
        });
    }

    if (metric === 'energy') {
      return Object.entries(ene)
        .sort(([, a], [, b]) => b.renewable_pct - a.renewable_pct)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.renewable_pct,
            displayValue: entry.renewable_pct.toFixed(1) + '%',
            subLabel: `CO₂: ${entry.co2_pc.toFixed(1)} t/capita`,
          };
        });
    }

    if (metric === 'geography') {
      return Object.entries(geo)
        .sort(([, a], [, b]) => b.forest_pct - a.forest_pct)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.forest_pct,
            displayValue: entry.forest_pct.toFixed(1) + '%',
            subLabel: `Protected: ${entry.protected_pct.toFixed(1)}%`,
          };
        });
    }

    if (metric === 'social') {
      return Object.entries(si)
        .sort(([, a], [, b]) => b.hdi - a.hdi)
        .map(([code, entry]) => {
          const country = statsData?.[code];
          const name = country?.name || code;
          const happinessPart = entry.happiness != null ? ` · 😊 ${entry.happiness.toFixed(2)}` : '';
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: entry.hdi,
            displayValue: entry.hdi.toFixed(3),
            subLabel: `Life: ${entry.life_exp} yrs${happinessPart}`,
          };
        });
    }

    if (metric === 'gdp') {
      const fmtBillion = (v: number) =>
        v >= 1000 ? `$${(v / 1000).toFixed(2)}T` : `$${v.toFixed(0)}B`;
      const fmtPc = (v: number) =>
        v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`;

      return Object.entries(gd)
        .filter(([, e]) => e[gdpTab] > 0)
        .sort(([, a], [, b]) => b[gdpTab] - a[gdpTab])
        .map(([code, entry]) => {
          const country = statsData[code];
          const name = country?.name || code;
          const val = entry[gdpTab];
          const isTotal = gdpTab === 'ppp_total' || gdpTab === 'nom_total';
          return {
            code,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            flag: flagUrl(code),
            value: val,
            displayValue: isTotal ? fmtBillion(val) : fmtPc(val),
          };
        });
    }

    return [];
  }, [metric, statsData, defenceTab, gdpTab]);

  /* defenceTab/gdpTab/search reset when metric changes: App.tsx uses key={statsMetric} */
  const [search, setSearch] = useState('');

  // ── Swipe to change tab ──────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return; // ignore small movements

    const dir = delta < 0 ? 1 : -1; // swipe left = next, swipe right = prev

    if (metric === 'defence') {
      const tabs = DEFENCE_TABS.map(t => t.value);
      const idx = tabs.indexOf(defenceTab);
      const next = tabs[Math.max(0, Math.min(tabs.length - 1, idx + dir))];
      if (next !== defenceTab) { setDefenceTab(next); setSearch(''); }
    }

    if (metric === 'gdp') {
      const tabs = GDP_TABS.map(t => t.value);
      const idx = tabs.indexOf(gdpTab);
      const next = tabs[Math.max(0, Math.min(tabs.length - 1, idx + dir))];
      if (next !== gdpTab) { setGdpTab(next); setSearch(''); }
    }
  }, [metric, defenceTab, gdpTab]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    return rows
      .map((r, i) => ({ ...r, rank: i + 1 }))
      .filter(r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q));
  }, [rows, search]);

  const maxValue = rows.length > 0 ? rows[0].value : 1;
  const cfg = metric ? METRIC_CONFIG[metric] : null;

  if (!isOpen || !metric || !cfg) return null;

  // Show loading state while fetching factbook data
  if (loading || !statsData) {
    return (
      <div className="stat-backdrop">
        <div className="stat-sheet">
          <div className="stat-header">
            <button className="stat-back" onClick={onClose} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="stat-header-center">
              <span className="stat-header-icon">{cfg.icon}</span>
              <div>
                <div className="stat-header-title">{cfg.label}</div>
                <div className="stat-header-desc">Loading...</div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            Loading country data…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stat-backdrop">
      <div
        className="stat-sheet"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <div className="stat-header">
          <button className="stat-back" onClick={onClose} aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="stat-header-center">
            <span className="stat-header-icon">{cfg.icon}</span>
            <div>
              <div className="stat-header-title">{cfg.label}</div>
              <div className="stat-header-desc">
                {metric === 'defence'
                  ? DEFENCE_TABS.find(t => t.value === defenceTab)?.desc ?? cfg.desc
                  : metric === 'gdp'
                  ? GDP_TABS.find(t => t.value === gdpTab)?.desc ?? cfg.desc
                  : cfg.desc}
              </div>
            </div>
          </div>
        </div>

        {/* Defence chips */}
        {metric === 'defence' && (
          <div className="stat-defence-chips">
            {DEFENCE_TABS.map(tab => (
              <button
                key={tab.value}
                className={`stat-defence-chip ${defenceTab === tab.value ? 'stat-defence-chip-active' : ''}`}
                onClick={() => { setDefenceTab(tab.value); setSearch(''); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* GDP chips */}
        {metric === 'gdp' && (
          <div className="stat-defence-chips">
            {GDP_TABS.map(tab => (
              <button
                key={tab.value}
                className={`stat-defence-chip ${gdpTab === tab.value ? 'stat-defence-chip-active' : ''}`}
                onClick={() => { setGdpTab(tab.value); setSearch(''); }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Search + count bar */}
        <div className="stat-search-bar">
          <div className="stat-search-wrap">
            <svg className="stat-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="stat-search-input"
              type="text"
              placeholder="Search country…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="stat-search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>
          <span className="stat-count-badge">
            {search ? `${visibleRows.length} / ${rows.length}` : `${rows.length} countries`}
          </span>
        </div>

        {/* List */}
        <div className="stat-list">
          {visibleRows.length === 0 ? (
            <div className="stat-no-results">No countries match "{search}"</div>
          ) : (
            visibleRows.map(row => (
              <div
                key={row.code}
                className="stat-row"
                onClick={() => onCountrySelect?.(row.code)}
                style={{ cursor: onCountrySelect ? 'pointer' : 'default' }}
              >
                <span className={`stat-rank ${row.rank <= 3 ? `stat-rank-top${row.rank}` : ''}`}>
                  {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                </span>
                <img
                  className="stat-flag"
                  src={row.flag}
                  alt={row.name}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="stat-info">
                  <div className="stat-name">{row.name}</div>
                  {row.subLabel && <div className="stat-sub">{row.subLabel}</div>}
                  <div className="stat-bar-track">
                    <div
                      className="stat-bar-fill"
                      style={{ width: `${Math.max((row.value / maxValue) * 100, 2)}%` }}
                    />
                  </div>
                </div>
                <span className="stat-value">{row.displayValue}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
