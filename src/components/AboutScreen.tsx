import React from 'react';
import './AboutScreen.css';

interface AboutScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATA_SOURCES = [
  {
    icon: '🏛️',
    title: 'CIA World Factbook',
    desc: 'Country profiles — geography, people, economy, government & military',
    note: 'Retired by CIA in Feb 2026 · Last snapshot preserved · Public Domain',
    url: 'https://www.cia.gov/the-world-factbook/',
    urlLabel: 'cia.gov/the-world-factbook',
    github: 'https://github.com/factbook/factbook.json',
    githubLabel: 'factbook/factbook.json (JSON mirror)',
  },
  {
    icon: '📦',
    title: 'Local country JSON data',
    desc: 'Country names, ISO codes, flags and metadata loaded from local JSON files',
    note: 'Self-contained local dataset · No external API required',
    url: '#',
    urlLabel: 'local data',
  },
  {
    icon: '🚩',
    title: 'Flagpedia CDN',
    desc: 'Country flag images in multiple resolutions',
    note: 'Free · CC0 licensed flag images',
    url: 'https://flagcdn.com',
    urlLabel: 'flagcdn.com',
  },
  {
    icon: '⚔️',
    title: 'Global Firepower 2025',
    desc: 'Military power index, manpower, land / air / naval strength rankings',
    note: 'Annual military strength report · Used in Defence › Power Index',
    url: 'https://www.globalfirepower.com',
    urlLabel: 'globalfirepower.com',
  },
  {
    icon: '🔬',
    title: 'SIPRI 2024',
    desc: 'Defense budgets, arms trade & nuclear warhead estimates',
    note: 'Stockholm International Peace Research Institute · Used in Defence & Compare',
    url: 'https://www.sipri.org',
    urlLabel: 'sipri.org',
  },
  {
    icon: '🛡️',
    title: 'BICC Global Militarization Index 2023',
    desc: 'GMI, Military Expenditure Index, Personnel Index & Heavy Weapons Index per country',
    note: 'Bonn International Centre for Conflict Studies · Used in Defence › GMI tabs',
    url: 'https://www.bicc.de/publications/publicationpage/publication/global-militarization-index/',
    urlLabel: 'bicc.de — Global Militarization Index',
  },
  {
    icon: '🌱',
    title: 'UNDP Human Development Report 2023–24',
    desc: 'Human Development Index (HDI), life expectancy & happiness scores',
    note: 'United Nations Development Programme · Used in Social Index & Health screens',
    url: 'https://hdr.undp.org',
    urlLabel: 'hdr.undp.org',
  },
  {
    icon: '💰',
    title: 'IMF World Economic Outlook 2024',
    desc: 'GDP by PPP & nominal (total and per capita) for 150+ countries',
    note: 'International Monetary Fund · Used in GDP & Economy screens',
    url: 'https://www.imf.org/en/Publications/WEO',
    urlLabel: 'imf.org/WEO',
  },
  {
    icon: '👶',
    title: 'UN World Population Prospects 2024',
    desc: 'Median age, fertility rate & population data by country',
    note: 'United Nations DESA · Used in Demographics screen',
    url: 'https://population.un.org/wpp/',
    urlLabel: 'population.un.org/wpp',
  },
  {
    icon: '🎓',
    title: 'UNESCO Institute for Statistics 2023',
    desc: 'Literacy rates and government education expenditure (% of GDP)',
    note: 'Used in Education screen',
    url: 'https://uis.unesco.org',
    urlLabel: 'uis.unesco.org',
  },
  {
    icon: '🏛️',
    title: 'Economist Intelligence Unit — Democracy Index 2023',
    desc: 'Democracy index scores and political freedom status by country',
    note: 'Used in Governance screen',
    url: 'https://www.eiu.com/n/campaigns/democracy-index-2023/',
    urlLabel: 'eiu.com — Democracy Index',
  },
  {
    icon: '⚡',
    title: 'IEA / World Bank — Energy Data 2023',
    desc: 'Renewable energy share (%) and CO₂ emissions per capita by country',
    note: 'International Energy Agency & World Bank · Used in Energy screen',
    url: 'https://data.worldbank.org/indicator/EG.FEC.RNEW.ZS',
    urlLabel: 'data.worldbank.org — Energy indicators',
  },
  {
    icon: '🌳',
    title: 'FAO Global Forest Resources Assessment 2020',
    desc: 'Forest cover (%) and protected land areas (%) by country',
    note: 'Food and Agriculture Organization of the UN · Used in Geography screen',
    url: 'https://www.fao.org/forest-resources-assessment',
    urlLabel: 'fao.org — Forest Resources Assessment',
  },
  {
    icon: '🗺️',
    title: 'Natural Earth',
    desc: 'Geographic boundary data used for country geofences (TopoJSON)',
    note: 'Public domain · 1:10m / 1:50m / 1:110m scales',
    url: 'https://www.naturalearthdata.com',
    urlLabel: 'naturalearthdata.com',
  },
];

const TECH_STACK = [
  { icon: '⚛️', label: 'React 19 + TypeScript' },
  { icon: '⚡', label: 'Vite 6' },
  { icon: '📱', label: 'Capacitor 8 (Android)' },
  { icon: '🗺️', label: 'Leaflet.js' },
  { icon: '🌐', label: 'TopoJSON' },
];

export const AboutScreen: React.FC<AboutScreenProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="about-backdrop" onClick={onClose}>
      <div className="about-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="about-header">
          <div className="about-header-left">
            <span className="about-header-icon">ℹ️</span>
            <span className="about-header-title">Data Sources</span>
          </div>
          <button className="about-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="about-body">
          {/* App identity */}
          <div className="about-identity">
            <div className="about-app-icon">🌐</div>
            <div className="about-app-name">Countrys &amp; Geofences</div>
            <div className="about-app-sub">Interactive country explorer</div>
          </div>

          {/* Data sources */}
          <div className="about-section-title">Data &amp; Content Sources</div>
          <div className="about-sources">
            {DATA_SOURCES.map(src => (
              <div className="about-source-card" key={src.title}>
                <div className="about-source-top">
                  <span className="about-source-icon">{src.icon}</span>
                  <div className="about-source-info">
                    <div className="about-source-name">{src.title}</div>
                    <div className="about-source-desc">{src.desc}</div>
                    <div className="about-source-note">{src.note}</div>
                  </div>
                </div>
                <div className="about-source-links">
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="about-link">
                    🔗 {src.urlLabel}
                  </a>
                  {src.github && (
                    <a href={src.github} target="_blank" rel="noopener noreferrer" className="about-link about-link-secondary">
                      📦 {src.githubLabel}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tech stack */}
          <div className="about-section-title">Built With</div>
          <div className="about-tech-row">
            {TECH_STACK.map(t => (
              <div className="about-tech-chip" key={t.label}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>

          {/* License note */}
          <div className="about-license">
            All external data is used under their respective open / public domain licenses.
            No proprietary data is bundled.
          </div>
        </div>
      </div>
    </div>
  );
};
