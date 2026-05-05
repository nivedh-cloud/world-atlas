import React, { useState, useMemo } from 'react';
import countriesInfo from '../data/countries-info.json';
import militaryPowers from '../data/military-powers.json';
import socialIndex from '../data/social-index.json';
import economyStats from '../data/economy-stats.json';
import demographicsStats from '../data/demographics-stats.json';
import educationStats from '../data/education-stats.json';
import governanceStats from '../data/governance-stats.json';
import energyStats from '../data/energy-stats.json';
import geographyStats from '../data/geography-stats.json';
import './CompareScreen.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCountrySelect?: (code: string) => void;
}

type CInfo = {
  name: string; code: string; capital: string | null;
  population: number; area: number; continent: string; landlocked: boolean;
};
type MilEntry    = { military_rank: number; defense_budget: string; active_personnel: number; aircraft_strength: number; tank_strength: number; nuclear_capability: boolean };
type SocialEntry = { hdi: number; life_exp: number; happiness: number | null };
type EcoEntry    = { gdp_pc: number; gini: number };
type DemEntry    = { median_age: number; fertility: number };
type EduEntry    = { literacy: number; edu_spend: number };
type GovEntry    = { democracy: number; freedom: string };
type EneEntry    = { renewable_pct: number; co2_pc: number };
type GeoEntry    = { forest_pct: number; protected_pct: number };

type CompareRow = {
  label: string;
  type: 'text' | 'num' | 'rank';
  a: string | number;
  b: string | number;
  fmt?: (v: number) => string;
  higherIsBetter?: boolean;
};
type CompareSection = { title: string; icon: string; rows: CompareRow[] };

type Category = 'all' | 'economy' | 'demographics' | 'education' | 'governance' | 'energy' | 'geography' | 'defence' | 'health' | 'social';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'all',          label: 'All Categories',    icon: '🌐' },
  { value: 'economy',      label: 'Economy',            icon: '💰' },
  { value: 'demographics', label: 'Demographics',       icon: '👶' },
  { value: 'education',    label: 'Education',          icon: '🎓' },
  { value: 'governance',   label: 'Governance',         icon: '🏛️' },
  { value: 'energy',       label: 'Energy',             icon: '⚡' },
  { value: 'geography',    label: 'Geography',          icon: '🌳' },
  { value: 'defence',      label: 'Defence Strength',   icon: '🛡️' },
  { value: 'health',       label: 'Health',             icon: '🏥' },
  { value: 'social',       label: 'Social Index',       icon: '🌱' },
];

function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

export const CompareScreen: React.FC<Props> = ({ isOpen, onClose, onCountrySelect }) => {
  const [slotA, setSlotA]           = useState<string | null>(null);
  const [slotB, setSlotB]           = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<'A' | 'B' | null>('A');
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState<Category>('all');

  const ci  = countriesInfo    as CInfo[];
  const mp  = militaryPowers   as Record<string, MilEntry>;
  const si  = socialIndex      as Record<string, SocialEntry>;
  const eco = economyStats     as Record<string, EcoEntry>;
  const dem = demographicsStats as Record<string, DemEntry>;
  const edu = educationStats   as Record<string, EduEntry>;
  const gov = governanceStats  as Record<string, GovEntry>;
  const ene = energyStats      as Record<string, EneEntry>;
  const geo = geographyStats   as Record<string, GeoEntry>;

  const sortedCountries = useMemo(() =>
    [...ci]
      .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [query, ci]
  );

  const dataA = slotA ? ci.find(c => c.code === slotA) ?? null : null;
  const dataB = slotB ? ci.find(c => c.code === slotB) ?? null : null;
  const milA  = slotA ? (mp[slotA] ?? null) : null;
  const milB  = slotB ? (mp[slotB] ?? null) : null;
  const siA   = slotA ? (si[slotA] ?? null) : null;
  const siB   = slotB ? (si[slotB] ?? null) : null;
  const ecoA  = slotA ? (eco[slotA] ?? null) : null;
  const ecoB  = slotB ? (eco[slotB] ?? null) : null;
  const demA  = slotA ? (dem[slotA] ?? null) : null;
  const demB  = slotB ? (dem[slotB] ?? null) : null;
  const eduA  = slotA ? (edu[slotA] ?? null) : null;
  const eduB  = slotB ? (edu[slotB] ?? null) : null;
  const govA  = slotA ? (gov[slotA] ?? null) : null;
  const govB  = slotB ? (gov[slotB] ?? null) : null;
  const eneA  = slotA ? (ene[slotA] ?? null) : null;
  const eneB  = slotB ? (ene[slotB] ?? null) : null;
  const geoA  = slotA ? (geo[slotA] ?? null) : null;
  const geoB  = slotB ? (geo[slotB] ?? null) : null;

  const showPicker = activeSlot !== null;

  const handleSelect = (code: string) => {
    if (activeSlot === 'A') {
      setSlotA(code);
      setActiveSlot(!slotB ? 'B' : null);
    } else {
      setSlotB(code);
      setActiveSlot(null);
    }
    setQuery('');
  };

  const reset = () => { setSlotA(null); setSlotB(null); setActiveSlot('A'); setQuery(''); };
  const handleSlotClick = (slot: 'A' | 'B') => { setActiveSlot(slot); setQuery(''); };

  // ── All section definitions ──────────────────────────────────────────────
  const basicSection: CompareSection = {
    title: 'Basic Info', icon: '🌍',
    rows: [
      { label: 'Capital',    type: 'text', a: dataA?.capital   ?? '—', b: dataB?.capital   ?? '—' },
      { label: 'Continent',  type: 'text', a: dataA?.continent ?? '—', b: dataB?.continent ?? '—' },
      { label: 'Population', type: 'num',  a: dataA?.population ?? 0,  b: dataB?.population ?? 0,  fmt: v => fmt(v),           higherIsBetter: true },
      { label: 'Area (km²)', type: 'num',  a: dataA?.area       ?? 0,  b: dataB?.area       ?? 0,  fmt: v => fmt(v) + ' km²',  higherIsBetter: true },
      { label: 'Landlocked', type: 'text', a: dataA ? (dataA.landlocked ? 'Yes' : 'No') : '—', b: dataB ? (dataB.landlocked ? 'Yes' : 'No') : '—' },
    ],
  };

  const economySection: CompareSection = {
    title: 'Economy', icon: '💰',
    rows: [
      { label: 'GDP per Capita (PPP)', type: 'num', a: ecoA?.gdp_pc ?? 0, b: ecoB?.gdp_pc ?? 0, fmt: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'K' : '$' + v, higherIsBetter: true },
      { label: 'Gini Coefficient',     type: 'num', a: ecoA?.gini   ?? 0, b: ecoB?.gini   ?? 0, fmt: v => v.toFixed(1), higherIsBetter: false },
    ],
  };

  const demographicsSection: CompareSection = {
    title: 'Demographics', icon: '👶',
    rows: [
      { label: 'Median Age',     type: 'num', a: demA?.median_age ?? 0, b: demB?.median_age ?? 0, fmt: v => v.toFixed(1) + ' yrs', higherIsBetter: false },
      { label: 'Fertility Rate', type: 'num', a: demA?.fertility  ?? 0, b: demB?.fertility  ?? 0, fmt: v => v.toFixed(1) + ' per woman', higherIsBetter: false },
    ],
  };

  const educationSection: CompareSection = {
    title: 'Education', icon: '🎓',
    rows: [
      { label: 'Literacy Rate',    type: 'num', a: eduA?.literacy  ?? 0, b: eduB?.literacy  ?? 0, fmt: v => v.toFixed(1) + '%',       higherIsBetter: true },
      { label: 'Edu Spend % GDP',  type: 'num', a: eduA?.edu_spend ?? 0, b: eduB?.edu_spend ?? 0, fmt: v => v.toFixed(1) + '% GDP',   higherIsBetter: true },
    ],
  };

  const governanceSection: CompareSection = {
    title: 'Governance', icon: '🏛️',
    rows: [
      { label: 'Democracy Index', type: 'num',  a: govA?.democracy ?? 0,  b: govB?.democracy ?? 0,  fmt: v => v.toFixed(2) + '/10', higherIsBetter: true },
      { label: 'Freedom Status',  type: 'text', a: govA ? (govA.freedom === 'Free' ? '🟢 Free' : govA.freedom === 'Partly Free' ? '🟡 Partly Free' : '🔴 Not Free') : '—',
                                                b: govB ? (govB.freedom === 'Free' ? '🟢 Free' : govB.freedom === 'Partly Free' ? '🟡 Partly Free' : '🔴 Not Free') : '—' },
    ],
  };

  const energySection: CompareSection = {
    title: 'Energy', icon: '⚡',
    rows: [
      { label: 'Renewable Energy', type: 'num', a: eneA?.renewable_pct ?? 0, b: eneB?.renewable_pct ?? 0, fmt: v => v.toFixed(1) + '%',          higherIsBetter: true },
      { label: 'CO₂ per Capita',   type: 'num', a: eneA?.co2_pc        ?? 0, b: eneB?.co2_pc        ?? 0, fmt: v => v.toFixed(1) + ' t',         higherIsBetter: false },
    ],
  };

  const geographySection: CompareSection = {
    title: 'Geography', icon: '🌳',
    rows: [
      { label: 'Forest Cover',      type: 'num', a: geoA?.forest_pct    ?? 0, b: geoB?.forest_pct    ?? 0, fmt: v => v.toFixed(1) + '%', higherIsBetter: true },
      { label: 'Protected Areas',   type: 'num', a: geoA?.protected_pct ?? 0, b: geoB?.protected_pct ?? 0, fmt: v => v.toFixed(1) + '%', higherIsBetter: true },
    ],
  };

  const defenceSection: CompareSection = {
    title: 'Defence Strength', icon: '🛡️',
    rows: [
      { label: 'Global Rank',      type: 'rank', a: milA?.military_rank      ?? 0, b: milB?.military_rank      ?? 0 },
      { label: 'Active Personnel', type: 'num',  a: milA?.active_personnel   ?? 0, b: milB?.active_personnel   ?? 0, fmt: v => fmt(v),    higherIsBetter: true },
      { label: 'Defence Budget',   type: 'text', a: milA?.defense_budget     ?? '—', b: milB?.defense_budget   ?? '—' },
      { label: 'Aircraft',         type: 'num',  a: milA?.aircraft_strength  ?? 0, b: milB?.aircraft_strength  ?? 0, fmt: v => fmt(v),    higherIsBetter: true },
      { label: 'Tanks',            type: 'num',  a: milA?.tank_strength      ?? 0, b: milB?.tank_strength      ?? 0, fmt: v => fmt(v),    higherIsBetter: true },
      { label: 'Nuclear',          type: 'text', a: milA ? (milA.nuclear_capability ? '✅ Yes' : '❌ No') : '—', b: milB ? (milB.nuclear_capability ? '✅ Yes' : '❌ No') : '—' },
    ],
  };

  const healthSection: CompareSection = {
    title: 'Health', icon: '🏥',
    rows: [
      { label: 'Life Expectancy', type: 'num', a: siA?.life_exp ?? 0, b: siB?.life_exp ?? 0, fmt: v => v > 0 ? v.toFixed(1) + ' yrs' : '—', higherIsBetter: true },
    ],
  };

  const socialSection: CompareSection = {
    title: 'Social Index', icon: '🌱',
    rows: [
      { label: 'HDI Score',        type: 'num', a: siA?.hdi       ?? 0, b: siB?.hdi       ?? 0, fmt: v => v.toFixed(3),          higherIsBetter: true },
      { label: 'Life Expectancy',  type: 'num', a: siA?.life_exp  ?? 0, b: siB?.life_exp  ?? 0, fmt: v => v.toFixed(1) + ' yrs', higherIsBetter: true },
      { label: 'Happiness Score',  type: 'num', a: siA?.happiness ?? 0, b: siB?.happiness ?? 0, fmt: v => v > 0 ? v.toFixed(2)  : '—', higherIsBetter: true },
    ],
  };

  const sections: CompareSection[] = useMemo(() => {
    switch (category) {
      case 'economy':      return [basicSection, economySection];
      case 'demographics': return [basicSection, demographicsSection];
      case 'education':    return [basicSection, educationSection];
      case 'governance':   return [basicSection, governanceSection];
      case 'energy':       return [basicSection, energySection];
      case 'geography':    return [basicSection, geographySection];
      case 'defence':      return [basicSection, defenceSection];
      case 'health':       return [basicSection, healthSection];
      case 'social':       return [basicSection, socialSection];
      default:             return [basicSection, economySection, demographicsSection, educationSection, governanceSection, energySection, geographySection, defenceSection, healthSection, socialSection];
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, slotA, slotB, dataA, dataB]);

  if (!isOpen) return null;

  const nameOf = (data: CInfo | null) =>
    data ? data.name.charAt(0).toUpperCase() + data.name.slice(1) : null;

  return (
    <div className="cmp-backdrop" onClick={onClose}>
      <div className="cmp-sheet" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cmp-header">
          <div className="cmp-header-left">
            <span className="cmp-header-icon">⚖️</span>
            <span className="cmp-header-title">Compare Countries</span>
          </div>
          <button className="cmp-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Country slots */}
        <div className="cmp-slots">
          <button
            className={`cmp-slot ${activeSlot === 'A' ? 'cmp-slot-active' : ''} ${slotA ? 'cmp-slot-filled' : ''}`}
            onClick={() => handleSlotClick('A')}
          >
            {slotA && dataA ? (
              <>
                <img className="cmp-slot-flag" src={`/flags/${slotA.toLowerCase()}.svg`} alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="cmp-slot-name">{nameOf(dataA)}</span>
              </>
            ) : (
              <span className="cmp-slot-placeholder">+ Country A</span>
            )}
          </button>

          <div className="cmp-vs">VS</div>

          <button
            className={`cmp-slot ${activeSlot === 'B' ? 'cmp-slot-active' : ''} ${slotB ? 'cmp-slot-filled' : ''}`}
            onClick={() => handleSlotClick('B')}
          >
            {slotB && dataB ? (
              <>
                <img className="cmp-slot-flag" src={`/flags/${slotB.toLowerCase()}.svg`} alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="cmp-slot-name">{nameOf(dataB)}</span>
              </>
            ) : (
              <span className="cmp-slot-placeholder">+ Country B</span>
            )}
          </button>
        </div>

        {/* Category pills — always visible */}
        <div className="cmp-category-bar">
          <div className="cmp-category-pills">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                className={`cmp-category-pill ${category === c.value ? 'cmp-category-pill-active' : ''}`}
                onClick={() => setCategory(c.value)}
              >
                <span className="cmp-pill-icon">{c.icon}</span>
                <span className="cmp-pill-label">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Country picker */}
        {showPicker ? (
          <div className="cmp-picker">
            <div className="cmp-search-wrap">
              <svg className="cmp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="cmp-search-input"
                type="text"
                placeholder={`Search for ${activeSlot === 'A' ? 'left' : 'right'} country…`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button className="cmp-search-clear" onClick={() => setQuery('')}>✕</button>
              )}
            </div>
            <div className="cmp-country-list">
              {sortedCountries.map(c => {
                const isSelected = (activeSlot === 'A' ? slotA : slotB) === c.code;
                return (
                  <button
                    key={c.code}
                    className={`cmp-country-item ${isSelected ? 'cmp-country-selected' : ''}`}
                    onClick={() => handleSelect(c.code)}
                  >
                    <img className="cmp-country-flag" src={`/flags/${c.code.toLowerCase()}.svg`} alt=""
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="cmp-country-name">
                      {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                    </span>
                    <span className="cmp-country-code">{c.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Comparison table */
          <>
            <div className="cmp-actions">
              <div
                className="cmp-col-header cmp-col-a"
                onClick={() => slotA && onCountrySelect?.(slotA)}
                style={{ cursor: onCountrySelect && slotA ? 'pointer' : 'default' }}
              >
                <img className="cmp-col-flag" src={`/flags/${slotA!.toLowerCase()}.svg`} alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="cmp-col-name">{nameOf(dataA)}</span>
              </div>
              <div className="cmp-col-center">
                <button className="cmp-reset-btn" onClick={reset} title="Reset">↺</button>
              </div>
              <div
                className="cmp-col-header cmp-col-b"
                onClick={() => slotB && onCountrySelect?.(slotB)}
                style={{ cursor: onCountrySelect && slotB ? 'pointer' : 'default' }}
              >
                <img className="cmp-col-flag" src={`/flags/${slotB!.toLowerCase()}.svg`} alt=""
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className="cmp-col-name">{nameOf(dataB)}</span>
              </div>
            </div>

            <div className="cmp-table">
              {sections.map(sec => (
                <div key={sec.title} className="cmp-section">
                  <div className="cmp-section-header">
                    <span>{sec.icon}</span>
                    <span>{sec.title}</span>
                  </div>

                  {sec.rows.map(row => {
                    const isNum  = row.type === 'num';
                    const isRank = row.type === 'rank';
                    const numA   = typeof row.a === 'number' ? row.a : 0;
                    const numB   = typeof row.b === 'number' ? row.b : 0;

                    let winnerA = false;
                    let winnerB = false;
                    if ((isNum || isRank) && (numA > 0 || numB > 0)) {
                      if (isRank) {
                        winnerA = numA > 0 && (numB === 0 || numA < numB);
                        winnerB = numB > 0 && (numA === 0 || numB < numA);
                      } else if (row.higherIsBetter !== false) {
                        winnerA = numA > numB;
                        winnerB = numB > numA;
                      } else {
                        // lower is better
                        winnerA = numA > 0 && (numB === 0 || numA < numB);
                        winnerB = numB > 0 && (numA === 0 || numB < numA);
                      }
                    }

                    const maxV = Math.max(numA, numB, 1);
                    const pctA = numA > 0 ? (numA / maxV) * 100 : 0;
                    const pctB = numB > 0 ? (numB / maxV) * 100 : 0;

                    const dispA = isNum && row.fmt ? (numA > 0 ? row.fmt(numA) : '—') : isRank ? (numA > 0 ? `#${numA}` : 'N/A') : String(row.a);
                    const dispB = isNum && row.fmt ? (numB > 0 ? row.fmt(numB) : '—') : isRank ? (numB > 0 ? `#${numB}` : 'N/A') : String(row.b);

                    return (
                      <div key={row.label} className="cmp-row">
                        <div className={`cmp-cell cmp-cell-left ${winnerA ? 'cmp-winner' : ''}`}>
                          <span className="cmp-val">{dispA}</span>
                          {(isNum || isRank) && numA > 0 && (
                            <div className="cmp-bar-track">
                              <div className="cmp-bar-fill cmp-bar-a" style={{ width: `${pctA}%` }} />
                            </div>
                          )}
                        </div>

                        <div className="cmp-label">{row.label}</div>

                        <div className={`cmp-cell cmp-cell-right ${winnerB ? 'cmp-winner' : ''}`}>
                          <span className="cmp-val">{dispB}</span>
                          {(isNum || isRank) && numB > 0 && (
                            <div className="cmp-bar-track">
                              <div className="cmp-bar-fill cmp-bar-b" style={{ width: `${pctB}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
