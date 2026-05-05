import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import type { CSSProperties } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { MapComponent } from "./components/MapComponent";
import { CountryInfoCard } from "./components/CountryInfoCard";
import type { StatMetric } from "./components/StatisticsScreen";
import {
  loadCountryGeoJSON,
  loadContinentGeoJSON,
  loadOceanGeoJSON,
  getAvailableContinents,
  getAvailableOceans,
  normalizeCountrySelectionKey,
} from "./utils/geojsonLoader";
import type { GeoJSONFeatureCollection } from "./utils/geojsonLoader";
import { COUNTRIES } from "./utils/geojsonLoader";
import { useAppSettings } from "./context/appSettingsContext";
import { MapToolbarTour, MenuDrawerTour } from "./components/AppNavigationTour";
import {
  migrateLegacyNavigationTourKeys,
  isMapToolbarTourCompleted,
  isMenuDrawerTourCompleted,
  MAP_TOOLBAR_TOUR_STORAGE_KEY,
  MENU_DRAWER_TOUR_STORAGE_KEY,
} from "./components/appNavigationTourStorage";
import { ensureStatsCountryFacts } from "./utils/statsCountryFactsCache";
import { destroyBannerAds, initAndShowBannerAds } from "./utils/adService";
import { BANNER_AD_STRIP_HEIGHT_VAR, shouldReserveSpaceForBannerAd } from "./utils/adLayout";
import "./App.css";

const StatisticsScreenLazy = lazy(() =>
  import("./components/StatisticsScreen").then((m) => ({ default: m.StatisticsScreen })),
);

const CompareScreenLazy = lazy(() =>
  import("./components/CompareScreen").then((m) => ({ default: m.CompareScreen })),
);

const CurrencyRankingsScreenLazy = lazy(() =>
  import("./components/CurrencyRankingsScreen").then((m) => ({ default: m.CurrencyRankingsScreen })),
);

const PreciousMetalRankingsScreenLazy = lazy(() =>
  import("./components/PreciousMetalRankingsScreen").then((m) => ({ default: m.PreciousMetalRankingsScreen })),
);

function App() {
  const appSettings = useAppSettings();
  const isDark = appSettings.settings.darkMode;

  // Apply dark mode to both body class and data-theme attribute on root
  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    if (isDark) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDark]);

  // Selection state
  const [selectionType, setSelectionType] = useState<'countries' | 'continents' | 'oceans'>('countries');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // GeoJSON data
  const [countryGeojsonData, setCountryGeojsonData] = useState<GeoJSONFeatureCollection | null>(null);

  // Loading states
  const [countryLoading, setCountryLoading] = useState(false);

  // UI states
  const [showDrawer, setShowDrawer] = useState(false);
  const [showLeftMenu, setShowLeftMenu] = useState(false);
  const [showStatsSubmenu, setShowStatsSubmenu] = useState(false);
  const [emblemOpen, setEmblemOpen] = useState(false);
  const [statsMetric, setStatsMetric] = useState<StatMetric | null>(null);
  const [showCurrencyRankings, setShowCurrencyRankings] = useState(false);
  const [showMetalRankings, setShowMetalRankings] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const [mapToolbarTourRun, setMapToolbarTourRun] = useState(false);
  const [menuDrawerTourRun, setMenuDrawerTourRun] = useState(false);
  const [openPremiumFromMenuSignal, setOpenPremiumFromMenuSignal] = useState(0);

  const drawerTourActions = useMemo(
    () => ({
      expandStatsSubmenu: () => setShowStatsSubmenu(true),
      closeMenu: () => {
        setShowLeftMenu(false);
        setShowStatsSubmenu(false);
      },
    }),
    [],
  );

  useEffect(() => {
    if (appSettings.settings.premiumAdFree) {
      void destroyBannerAds();
      return undefined;
    }
    void initAndShowBannerAds();
    return () => {
      void destroyBannerAds();
    };
  }, [appSettings.settings.premiumAdFree]);

  /** One-shot migration + first-launch toolbar tour */
  useEffect(() => {
    migrateLegacyNavigationTourKeys();
    if (!isMapToolbarTourCompleted()) {
      const t = window.setTimeout(() => setMapToolbarTourRun(true), 1400);
      return () => window.clearTimeout(t);
    }
  }, []);

  /** When map tour runs — clean slate on the map (menu closed) */
  useEffect(() => {
    if (!mapToolbarTourRun) return;
    setSelectionType("countries");
    setStatsMetric(null);
    setShowCurrencyRankings(false);
    setShowMetalRankings(false);
    setShowCompare(false);
    setShowDrawer(false);
    setShowLeftMenu(false);
    setShowStatsSubmenu(false);
    setEmblemOpen(false);
  }, [mapToolbarTourRun]);

  /** Menu drawer hints — first time user opens ☰ after map tour finished */
  useEffect(() => {
    if (!showLeftMenu) return;
    if (!isMapToolbarTourCompleted()) return;
    if (isMenuDrawerTourCompleted()) return;
    if (mapToolbarTourRun) return;
    if (menuDrawerTourRun) return;
    const t = window.setTimeout(() => setMenuDrawerTourRun(true), 420);
    return () => window.clearTimeout(t);
  }, [showLeftMenu, mapToolbarTourRun, menuDrawerTourRun]);

  /** Keep drawer visible while drawer tour plays */
  useEffect(() => {
    if (!menuDrawerTourRun) return;
    setShowLeftMenu(true);
    setStatsMetric(null);
    setShowCurrencyRankings(false);
    setShowMetalRankings(false);
    setShowCompare(false);
    setShowDrawer(false);
    setEmblemOpen(false);
    setShowStatsSubmenu(false);
  }, [menuDrawerTourRun]);

  /** Pre-warm CIA factbook rows for Statistics (population / area / names); shares one in-flight fetch with StatisticsScreen. */
  useEffect(() => {
    const kick = () => {
      void ensureStatsCountryFacts().catch(() => {
        /* StatisticsScreen fallback handles UI */
      });
    };
    const ric = typeof window !== "undefined" ? window.requestIdleCallback : undefined;
    if (ric) {
      const id = ric.call(window as Window & typeof globalThis, kick, { timeout: 4500 });
      return () => (window.cancelIdleCallback as (handle: number) => void)?.(id);
    }
    const t = window.setTimeout(kick, 900);
    return () => window.clearTimeout(t);
  }, []);

  /** Pre-warm rankings UI chunk — user often opens Stats right after expanding the submenu */
  useEffect(() => {
    if (!showStatsSubmenu || !showLeftMenu) return;
    void import("./components/StatisticsScreen");
    void import("./components/CurrencyRankingsScreen");
    void import("./components/PreciousMetalRankingsScreen");
  }, [showStatsSubmenu, showLeftMenu]);

  const closeStatsScreen = useCallback(() => {
    setStatsMetric(null);
    setShowLeftMenu(true);
    setShowStatsSubmenu(true);
  }, []);

  const closeCurrencyRankingsScreen = useCallback(() => {
    setShowCurrencyRankings(false);
    setShowLeftMenu(true);
    setShowStatsSubmenu(true);
  }, []);

  const closeMetalRankingsScreen = useCallback(() => {
    setShowMetalRankings(false);
    setShowLeftMenu(true);
    setShowStatsSubmenu(true);
  }, []);

  useEffect(() => {
    if (statsMetric !== null) {
      setShowCurrencyRankings(false);
      setShowMetalRankings(false);
    }
  }, [statsMetric]);

  const replayNavigationTours = useCallback(() => {
    try {
      localStorage.removeItem(MAP_TOOLBAR_TOUR_STORAGE_KEY);
      localStorage.removeItem(MENU_DRAWER_TOUR_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setMenuDrawerTourRun(false);
    setMapToolbarTourRun(false);
    setShowLeftMenu(false);
    setShowStatsSubmenu(false);
    setShowCurrencyRankings(false);
    setShowMetalRankings(false);
    window.setTimeout(() => setMapToolbarTourRun(true), 80);
  }, []);

  // Android back button: close in priority order
  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", () => {
      if (emblemOpen) {
        setEmblemOpen(false);
      } else if (showDrawer) {
        setShowDrawer(false);
      } else if (statsMetric) {
        closeStatsScreen();
      } else if (showCurrencyRankings) {
        closeCurrencyRankingsScreen();
      } else if (showMetalRankings) {
        closeMetalRankingsScreen();
      } else if (showCompare) {
        setShowCompare(false);
      } else if (showLeftMenu) {
        setShowLeftMenu(false);
      } else {
        CapacitorApp.minimizeApp();
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [emblemOpen, showDrawer, showLeftMenu, statsMetric, showCurrencyRankings, showMetalRankings, showCompare, closeStatsScreen, closeCurrencyRankingsScreen, closeMetalRankingsScreen]);

  useEffect(() => {
    if (!selectedCountry) {
      setCountryGeojsonData(null);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (!selectedCountry) {
      return;
    }

    const loadGeofences = async () => {
      setCountryLoading(true);
      let data = null;

      if (selectionType === 'countries') {
        data = await loadCountryGeoJSON(selectedCountry);
      } else if (selectionType === 'continents') {
        data = await loadContinentGeoJSON(selectedCountry);
      } else if (selectionType === 'oceans') {
        data = await loadOceanGeoJSON(selectedCountry);
      }

      setCountryGeojsonData(data);
      setCountryLoading(false);
    };

    loadGeofences();
  }, [selectedCountry, selectionType]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
  };

  const getDropdownItems = () => {
    if (selectionType === 'countries') return COUNTRIES;
    if (selectionType === 'continents') return getAvailableContinents();
    return getAvailableOceans();
  };

  const bannerStrip = shouldReserveSpaceForBannerAd(appSettings.settings.premiumAdFree)
    ? BANNER_AD_STRIP_HEIGHT_VAR
    : "0px";

  return (
    <div
      className="app-wrapper"
      data-theme={isDark ? 'dark' : 'light'}
      style={{ '--banner-ad-strip': bannerStrip } as CSSProperties}
    >
      <MapComponent 
        geojsonData={countryGeojsonData}
        countryName={selectedCountry}
        onGeofenceClick={() => setShowDrawer(true)}
        selectedCountry={selectedCountry}
        onCountryChange={handleCountryChange}
        countryLoading={countryLoading}
        onCountryDetails={() => setShowDrawer(true)}
        onMenuOpen={() => setShowLeftMenu(true)}
        onReplayNavigationTours={replayNavigationTours}
        openPremiumFromMenuSignal={openPremiumFromMenuSignal}
        dropdownItems={getDropdownItems()}
        dropdownLabel={selectionType === 'countries' ? 'Country' : selectionType === 'continents' ? 'Continent' : 'Ocean'}
      />

      <div className={`left-menu ${showLeftMenu ? "open" : ""}`} data-tour="tour-drawer">
        <div className="menu-header">
          <div className="menu-header-left">
            <span className="menu-header-icon">🗺️</span>
            <span className="menu-header-title">Navigation</span>
          </div>
          <button
            className="menu-close-btn"
            onClick={() => { setShowLeftMenu(false); setShowStatsSubmenu(false); }}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="menu-content">
          <div className="menu-section-label">Explore</div>
          <div className="menu-explore-anchor" data-tour="tour-explore">
          <button className="menu-item" onClick={() => { setSelectionType('countries'); setSelectedCountry(null); setShowLeftMenu(false); }}>
            <span className="menu-item-icon">🌍</span>
            <span className="menu-item-label">Countries</span>
          </button>
          <button className="menu-item" onClick={() => { setSelectionType('continents'); setSelectedCountry(null); setShowLeftMenu(false); }}>
            <span className="menu-item-icon">🌎</span>
            <span className="menu-item-label">Continents</span>
          </button>
          <button className="menu-item" onClick={() => { setSelectionType('oceans'); setSelectedCountry(null); setShowLeftMenu(false); }}>
            <span className="menu-item-icon">🌊</span>
            <span className="menu-item-label">Oceans</span>
          </button>
          </div>
          <div className="menu-divider" />
          <div className="menu-section-label">Ranking</div>
          <button type="button" className="menu-item" data-tour="tour-stats" onClick={() => { void import("./components/StatisticsScreen"); setShowStatsSubmenu(!showStatsSubmenu); }}>
            <span className="menu-item-icon">📊</span>
            <span className="menu-item-label">Statistics</span>
            <svg
              className={`menu-accordion-arrow ${showStatsSubmenu ? 'open' : ''}`}
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
          {showStatsSubmenu && (
            <div className="menu-submenu" data-tour="tour-stats-sub">
              <button className="menu-subitem" onClick={() => { setStatsMetric('population'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">👥</span>
                <span>Population</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('area'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">📐</span>
                <span>Area</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('defence'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🛡️</span>
                <span>Defence Strength</span>
              </button>
              <button
                type="button"
                className="menu-subitem"
                onClick={() => {
                  setStatsMetric(null);
                  setShowMetalRankings(false);
                  setShowCurrencyRankings(true);
                  setShowLeftMenu(false);
                  setShowStatsSubmenu(false);
                }}
              >
                <span className="menu-subitem-icon">💱</span>
                <span>Currency rankings</span>
              </button>
              <button
                type="button"
                className="menu-subitem"
                onClick={() => {
                  setStatsMetric(null);
                  setShowCurrencyRankings(false);
                  setShowMetalRankings(true);
                  setShowLeftMenu(false);
                  setShowStatsSubmenu(false);
                }}
              >
                <span className="menu-subitem-icon">🏅</span>
                <span>Precious metals</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('health'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🏥</span>
                <span>Health</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('social'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🌱</span>
                <span>Social Index</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('gdp'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">📊</span>
                <span>GDP</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('economy'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">💰</span>
                <span>Economy</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('demographics'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">👶</span>
                <span>Demographics</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('education'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🎓</span>
                <span>Education</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('governance'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🏛️</span>
                <span>Governance</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('energy'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">⚡</span>
                <span>Energy</span>
              </button>
              <button className="menu-subitem" onClick={() => { setStatsMetric('geography'); setShowLeftMenu(false); setShowStatsSubmenu(false); }}>
                <span className="menu-subitem-icon">🌳</span>
                <span>Geography</span>
              </button>
            </div>
          )}
          <button type="button" className="menu-item" data-tour="tour-compare" onClick={() => { void import("./components/CompareScreen"); setShowCompare(true); setShowLeftMenu(false); }}>
            <span className="menu-item-icon">⚖️</span>
            <span className="menu-item-label">Compare</span>
          </button>
          {!appSettings.settings.premiumAdFree && (
            <>
              <div className="menu-divider" />
              <div className="menu-section-label">Premium</div>
              <button
                type="button"
                className="menu-go-premium"
                onClick={() => {
                  setShowLeftMenu(false);
                  setShowStatsSubmenu(false);
                  setOpenPremiumFromMenuSignal((n) => n + 1);
                }}
              >
                <span className="menu-go-premium-icon" aria-hidden>⭐</span>
                <span>Go Premium</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showLeftMenu && (
        <div 
          className="menu-overlay" 
          onClick={() => { setShowLeftMenu(false); setShowStatsSubmenu(false); }} 
        />
      )}

      <div className={`info-drawer ${showDrawer ? "open" : ""}`}>
        <div className="drawer-header">
          <div className="drawer-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Country Info</span>
          </div>
          <button
            className="close-btn"
            onClick={() => setShowDrawer(false)}
            aria-label="Close drawer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="drawer-content">
          {selectedCountry && !countryLoading && selectionType === 'countries' && <CountryInfoCard countryCode={selectedCountry} emblemOpen={emblemOpen} onEmblemOpenChange={setEmblemOpen} />}
          {countryLoading && <div className="loading">Loading...</div>}
          {!selectedCountry && (
            <div className="empty-state">
              <div className="empty-icon">🌍</div>
              <p>Select {selectionType === 'countries' ? 'a country' : selectionType === 'continents' ? 'a continent' : 'an ocean'} from the dropdown to view details</p>
            </div>
          )}
          {selectedCountry && selectionType !== 'countries' && !countryLoading && (
            <div className="empty-state">
              <div className="empty-icon">{selectionType === 'continents' ? '🌍' : '🌊'}</div>
              <p>No detailed information available for {selectionType}</p>
            </div>
          )}
        </div>
      </div>

      {showDrawer && (
        <div 
          className="drawer-overlay" 
          onClick={() => setShowDrawer(false)} 
        />
      )}

      {statsMetric !== null && (
        <Suspense
          fallback={
            <div className="lazy-route-fallback" role="status" aria-live="polite">
              Loading rankings…
            </div>
          }
        >
          <StatisticsScreenLazy
            key={statsMetric}
            isOpen
            metric={statsMetric}
            onClose={closeStatsScreen}
            onCountrySelect={(code) => {
              setSelectionType('countries');
              setSelectedCountry(normalizeCountrySelectionKey(code));
              setShowDrawer(true);
            }}
          />
        </Suspense>
      )}

      {showCurrencyRankings && (
        <Suspense
          fallback={
            <div className="lazy-route-fallback" role="status" aria-live="polite">
              Loading currencies…
            </div>
          }
        >
          <CurrencyRankingsScreenLazy
            key="currency-rankings"
            isOpen
            onClose={closeCurrencyRankingsScreen}
            onCountrySelect={(code) => {
              setSelectionType('countries');
              setSelectedCountry(normalizeCountrySelectionKey(code));
              setShowCurrencyRankings(false);
              setShowDrawer(true);
            }}
          />
        </Suspense>
      )}

      {showMetalRankings && (
        <Suspense
          fallback={
            <div className="lazy-route-fallback" role="status" aria-live="polite">
              Loading metals…
            </div>
          }
        >
          <PreciousMetalRankingsScreenLazy key="metal-rankings" isOpen onClose={closeMetalRankingsScreen} />
        </Suspense>
      )}

      {showCompare && (
        <Suspense
          fallback={
            <div className="lazy-route-fallback" role="status" aria-live="polite">
              Loading compare…
            </div>
          }
        >
          <CompareScreenLazy
            isOpen
            onClose={() => setShowCompare(false)}
            onCountrySelect={(code) => {
              setSelectionType('countries');
              setSelectedCountry(normalizeCountrySelectionKey(code));
              setShowCompare(false);
              setShowDrawer(true);
            }}
          />
        </Suspense>
      )}

      <MapToolbarTour run={mapToolbarTourRun} onRunChange={setMapToolbarTourRun} />
      <MenuDrawerTour run={menuDrawerTourRun} onRunChange={setMenuDrawerTourRun} actions={drawerTourActions} />
    </div>
  );
}

export default App;
