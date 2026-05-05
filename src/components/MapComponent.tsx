import React, { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONFeatureCollection } from "../utils/geojsonLoader";
import { COUNTRIES } from "../utils/geojsonLoader";
import { useMapConfig } from "../config/mapConfig";
import { useAppSettings, MAP_STYLES } from "../context/appSettingsContext";
import { SettingsDrawer } from "./SettingsDrawer";
import { AboutScreen } from "./AboutScreen";
import { DeveloperScreen } from "./DeveloperScreen";
import { CountrySelector } from "./CountrySelector";
import { GlobeStarfield } from "./GlobeStarfield";
import "./MapComponent.css";

const MAPLIBRE_GLOBE_PITCH = 25;

const MAPLIBRE_ZERO_PADDING = { top: 0, bottom: 0, left: 0, right: 0 } as const;

/**
 * MapTiler planet v4 symbol source-layers that often render as a second “ring” of labels on the globe horizon
 * (library limitation: admin symbols + globe + pitch). Hidden during globe idle; restored in Mercator country view.
 */
const GLOBE_HORIZON_GHOST_SYMBOL_SOURCE_LAYERS = new Set([
  'country_label',
  'country_disputed_label',
  'city_label',
  'town_label',
]);

type MapLibreStyleLayer = { id: string; type: string; 'source-layer'?: string };

function setGlobeAdministrativeSymbolsVisibility(
  map: {
    getStyle: () => { layers?: MapLibreStyleLayer[] };
    getLayer: (id: string) => unknown;
    setLayoutProperty: (id: string, prop: string, val: unknown) => void;
  },
  visible: boolean,
) {
  const vis = visible ? 'visible' : 'none';
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== 'symbol') continue;
    const sl = layer['source-layer'];
    if (!sl || !GLOBE_HORIZON_GHOST_SYMBOL_SOURCE_LAYERS.has(sl)) continue;
    try {
      if (map.getLayer(layer.id)) {
        map.setLayoutProperty(layer.id, 'visibility', vis);
      }
    } catch {
      /* ignore */
    }
  }
}

/** Globe idle: no world copies, hide admin symbols that duplicate at the rim. Country view: normal Mercator behavior. */
function setGlobeVersusMercatorRendering(
  map: {
    getStyle: () => { layers?: MapLibreStyleLayer[] };
    getLayer: (id: string) => unknown;
    setLayoutProperty: (id: string, prop: string, val: unknown) => void;
    setRenderWorldCopies?: (v: boolean) => void;
  },
  mode: 'globe-idle' | 'mercator-detail',
) {
  try {
    map.setRenderWorldCopies?.(mode === 'mercator-detail');
  } catch {
    /* ignore */
  }
  setGlobeAdministrativeSymbolsVisibility(map, mode === 'mercator-detail');
}

/** Westward longitude drift (°/s): map surface moves right → left, like a cylinder / Earth rotating on its axis. */
const GLOBE_IDLE_LNG_DRIFT_DPS = 12;

function wrapLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}

/**
 * MapLibre: offset is in screen px (positive Y = anchor drawn below viewport center → map shifts up).
 * Pitched globe otherwise sits low in the panel; scale with `.map` height so it stays near vertical center on any device.
 */
function computeGlobeViewOffset(container: HTMLElement | null): [number, number] {
  if (!container || container.clientHeight < 8) return [0, 96];
  const h = container.clientHeight;
  return [0, Math.round(h * 0.22)];
}

interface MapComponentProps {
  geojsonData: GeoJSONFeatureCollection | null;
  countryName: string | null;
  onGeofenceClick?: () => void;
  selectedCountry?: string | null;
  onCountryChange?: (country: string) => void;
  countryLoading?: boolean;
  onCountryDetails?: () => void;
  onMenuOpen?: () => void;
  onReplayNavigationTours?: () => void;
  /** Increment from parent (e.g. hamburger “Go Premium”) to open Settings with the Premium sheet */
  openPremiumFromMenuSignal?: number;
  dropdownItems?: string[];
  dropdownLabel?: string;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  geojsonData,
  countryName,
  onGeofenceClick,
  selectedCountry,
  onCountryChange,
  countryLoading,
  onCountryDetails,
  onMenuOpen,
  onReplayNavigationTours,
  openPremiumFromMenuSignal = 0,
  dropdownItems = COUNTRIES,
  dropdownLabel = 'Countries',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const mapFlyGenerationRef = useRef(0);
  const geojsonDataRef = useRef<GeoJSONFeatureCollection | null>(null);
  const globeIdleActiveRef = useRef(false);
  const globeSpinRafRef = useRef(0);
  const globeSpinLastTsRef = useRef(0);
  const polygonsRef = useRef<unknown[]>([]); // Store Google Maps polygons for cleanup
  const polygonClickedRef = useRef(false); // Google Maps: track polygon click to suppress map click
  const selectedCountryRef = useRef<string | null>(null);
  const onCountryChangeRef = useRef<((c: string) => void) | undefined>(undefined);
  const onGeofenceClickRef = useRef<(() => void) | undefined>(undefined);
  const config = useMapConfig();
  const appSettings = useAppSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launchPremiumFromMenu, setLaunchPremiumFromMenu] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [developerOpen, setDeveloperOpen] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    geojsonDataRef.current = geojsonData;
  }, [geojsonData]);

  useEffect(() => {
    if (openPremiumFromMenuSignal < 1) return;
    setSettingsOpen(true);
    setLaunchPremiumFromMenu(true);
  }, [openPremiumFromMenuSignal]);

  const consumeLaunchPremiumFromMenu = useCallback(() => {
    setLaunchPremiumFromMenu(false);
  }, []);

  // Keep callback/value refs in sync to avoid stale closures inside map handlers
  useEffect(() => { selectedCountryRef.current = selectedCountry ?? null; }, [selectedCountry]);
  useEffect(() => { onCountryChangeRef.current = onCountryChange; }, [onCountryChange]);
  useEffect(() => { onGeofenceClickRef.current = onGeofenceClick; }, [onGeofenceClick]);

  // Reverse-geocode a map point using MapTiler and switch to that country
  const lookupCountryAtPoint = async (lng: number, lat: number) => {
    try {
      const key = '9rUTis0cKnTtAS2nbbFd';
      const res = await fetch(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&language=en`
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        features?: Array<{ place_type?: string[]; text?: string }>;
      };
      const countryFeature = data.features?.find(
        (f) => Array.isArray(f.place_type) && f.place_type.includes('country'),
      );
      if (!countryFeature) return;

      const rawName = (countryFeature.text ?? '').toLowerCase().trim();

      // Alias map: MapTiler name (lowercased) → our topojson filename (lowercased)
      const aliases: Record<string, string> = {
        // USA
        'united states': 'united states of america',
        // Tanzania
        'tanzania': 'united republic of tanzania',
        // Serbia
        'serbia': 'republic of serbia',
        // North Macedonia
        'north macedonia': 'macedonia',
        'republic of north macedonia': 'macedonia',
        // Ivory Coast
        "côte d'ivoire": 'ivory coast',
        "cote d'ivoire": 'ivory coast',
        'côte divoire': 'ivory coast',
        // The Bahamas
        'bahamas': 'the bahamas',
        // Czechia
        'czechia': 'czech republic',
        // East Timor
        'timor-leste': 'east timor',
        // Eswatini (Swaziland)
        'eswatini': 'swaziland',
        // Turkey
        'türkiye': 'turkey',
        'turkiye': 'turkey',
        // Congo
        'congo': 'republic of the congo',
        'congo-brazzaville': 'republic of the congo',
        'republic of congo': 'republic of the congo',
        // DRC
        'democratic republic of congo': 'democratic republic of the congo',
        'dr congo': 'democratic republic of the congo',
        'congo-kinshasa': 'democratic republic of the congo',
        // Misc
        'cabo verde': 'cape verde',
        'cape verde': 'cape verde',
        'myanmar (burma)': 'myanmar',
        'burma': 'myanmar',
        'laos': 'laos',
        "lao people's democratic republic": 'laos',
        'iran (islamic republic of)': 'iran',
        'syrian arab republic': 'syria',
        'south korea (republic of korea)': 'south korea',
        'republic of korea': 'south korea',
        "democratic people's republic of korea": 'north korea',
        'viet nam': 'vietnam',
        'state of palestine': 'west bank',
        'palestinian territory': 'west bank',
      };
      const normalized = aliases[rawName] ?? rawName;

      const matched = COUNTRIES.find(c => c === normalized);
      if (matched && matched !== selectedCountryRef.current) {
        onCountryChangeRef.current?.(matched);
      }
    } catch (e) {
      console.warn('Country lookup failed:', e);
    }
  };

  const stopGlobeIdleRotation = () => {
    globeIdleActiveRef.current = false;
    globeSpinLastTsRef.current = 0;
    if (globeSpinRafRef.current !== 0) {
      cancelAnimationFrame(globeSpinRafRef.current);
      globeSpinRafRef.current = 0;
    }
  };

  const startGlobeIdleRotation = () => {
    if (config.provider !== 'maplibre') return;
    stopGlobeIdleRotation();
    globeIdleActiveRef.current = true;
    globeSpinLastTsRef.current = 0;
    const tick = (now: number) => {
      if (!globeIdleActiveRef.current || geojsonDataRef.current) {
        globeSpinRafRef.current = 0;
        return;
      }
      const map = mapInstanceRef.current as {
        isStyleLoaded?: () => boolean;
        getCenter: () => { lng: number; lat: number };
        getZoom: () => number;
        getPitch: () => number;
        getBearing: () => number;
        jumpTo?: (opts: Record<string, unknown>) => void;
        easeTo?: (opts: Record<string, unknown>) => void;
      } | null;
      if (!map) {
        globeSpinRafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (map.isStyleLoaded && !map.isStyleLoaded()) {
        globeSpinRafRef.current = requestAnimationFrame(tick);
        return;
      }
      try {
        const prev = globeSpinLastTsRef.current;
        globeSpinLastTsRef.current = now;
        const dt =
          prev > 0 ? Math.min((now - prev) / 1000, 0.05) : 1 / 60;
        const c = map.getCenter();
        const lng = wrapLongitude(c.lng - GLOBE_IDLE_LNG_DRIFT_DPS * dt);
        const offset = computeGlobeViewOffset(mapRef.current);
        // No camera padding on globe: it desyncs atmosphere/horizon from the map (double-globe artifact).
        const jump = {
          center: [lng, c.lat] as [number, number],
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          offset,
        };
        if (typeof map.jumpTo === 'function') {
          map.jumpTo(jump);
        } else {
          map.easeTo?.({ ...jump, duration: 0, essential: true });
        }
      } catch {
        /* ignore */
      }
      globeSpinRafRef.current = requestAnimationFrame(tick);
    };
    globeSpinRafRef.current = requestAnimationFrame(tick);
  };

  /** Center the globe in the map panel (camera), without moving the HTML layout. */
  const applyGlobeCameraFrame = (duration = 0, opts?: { preserveCenter?: boolean }) => {
    if (config.provider !== 'maplibre') return;
    if (geojsonDataRef.current) return;
    const map = mapInstanceRef.current as {
      isStyleLoaded?: () => boolean;
      easeTo?: (opts: Record<string, unknown>) => void;
      getBearing?: () => number;
      getCenter?: () => { lng: number; lat: number };
      setPadding?: (p: { top: number; bottom: number; left: number; right: number }) => void;
    } | null;
    if (!map?.isStyleLoaded?.()) return;
    map.setPadding?.({ ...MAPLIBRE_ZERO_PADDING });
    const offset = computeGlobeViewOffset(mapRef.current);
    const center: [number, number] =
      opts?.preserveCenter && typeof map.getCenter === 'function'
        ? [map.getCenter().lng, map.getCenter().lat]
        : [0, 15];
    map.easeTo?.({
      center,
      zoom: 1.65,
      pitch: MAPLIBRE_GLOBE_PITCH,
      bearing: typeof map.getBearing === 'function' ? map.getBearing() : 0,
      offset,
      duration,
      essential: true,
    });
  };

  const removeMapLibreGeoLayers = (map: {
    getLayer: (id: string) => unknown;
    removeLayer: (id: string) => void;
    getSource: (id: string) => unknown;
    removeSource: (id: string) => void;
  }) => {
    const sourceId = 'geojson-source';
    const layerId = 'geojson-layer';
    const outlineLayerId = `${layerId}-outline`;
    try {
      if (map.getLayer(outlineLayerId)) map.removeLayer(outlineLayerId);
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch {
      /* ignore */
    }
  };

  const resetMapLibreToGlobeWorldView = () => {
    if (config.provider !== 'maplibre') return;
    stopGlobeIdleRotation();
    const map = mapInstanceRef.current as {
      isStyleLoaded?: () => boolean;
      setProjection?: (spec: { type: string }) => void;
      flyTo?: (opts: Record<string, unknown>) => void;
      once?: (event: string, handler: () => void) => void;
    } | null;
    if (!map?.isStyleLoaded?.()) return;

    try {
      removeMapLibreGeoLayers(map as Parameters<typeof removeMapLibreGeoLayers>[0]);
    } catch {
      /* ignore */
    }
    try {
      map.setProjection?.({ type: 'globe' });
    } catch {
      /* ignore */
    }

    setGlobeVersusMercatorRendering(map as unknown as Parameters<typeof setGlobeVersusMercatorRendering>[0], 'globe-idle');

    try {
      (map as unknown as { setPadding?: (p: { top: number; bottom: number; left: number; right: number }) => void }).setPadding?.({
        ...MAPLIBRE_ZERO_PADDING,
      });
    } catch {
      /* ignore */
    }

    mapFlyGenerationRef.current += 1;
    const flyGen = mapFlyGenerationRef.current;
    try {
      map.flyTo?.({
        center: [0, 15],
        zoom: 1.65,
        pitch: MAPLIBRE_GLOBE_PITCH,
        bearing: 0,
        offset: computeGlobeViewOffset(mapRef.current),
        duration: 1800,
        essential: true,
      });
    } catch {
      /* ignore */
    }
    globeIdleActiveRef.current = true;
    map.once?.('moveend', () => {
      if (flyGen !== mapFlyGenerationRef.current) return;
      startGlobeIdleRotation();
    });
  };

  // Initialize map on component mount (show world view by default)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const provider = config.provider;
    console.log(`Initializing map with provider: ${provider}`);

    // Set a timeout to detect if libraries don't load
    const loadTimeout = setTimeout(() => {
      if (!mapInstanceRef.current && mapLoading) {
        setMapError("Map libraries are taking too long to load. Check your internet connection and try refreshing.");
        setMapLoading(false);
      }
    }, 10000); // 10 second timeout

    if (provider === 'maplibre') {
      initializeMapLibre();
    } else {
      initializeGoogleMaps();
    }

    return () => clearTimeout(loadTimeout);
  }, []);

  // Remeasure canvas when leaving/entering globe idle so framing stays vertically centered after layout changes.
  useEffect(() => {
    if (config.provider !== 'maplibre') return;
    const map = mapInstanceRef.current as { resize?: () => void; isStyleLoaded?: () => boolean } | null;
    if (!map?.resize) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      map.resize?.();
      if (!geojsonDataRef.current && map.isStyleLoaded?.()) {
        applyGlobeCameraFrame(0, { preserveCenter: true });
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [geojsonData, config.provider]);

  // Update map style when settings change (MapLibre only)
  useEffect(() => {
    if (!mapInstanceRef.current || config.provider !== 'maplibre') return;

    const map = mapInstanceRef.current as unknown as {
      getStyle: () => { id?: string };
      setStyle: (style: string) => void;
      once: (event: string, handler: () => void) => void;
      setProjection?: (spec: { type: string }) => void;
    };
    const newStyle = MAP_STYLES[appSettings.settings.mapStyle];
    
    if (map.getStyle()?.id !== newStyle) {
      console.log(`Changing map style to: ${appSettings.settings.mapStyle}`);
      map.setStyle(newStyle);
      map.once('style.load', () => {
        try {
          map.setProjection?.({ type: 'globe' });
        } catch {
          /* ignore */
        }
        if (geojsonDataRef.current) {
          updateMapLibreData();
        } else {
          setGlobeVersusMercatorRendering(map as unknown as Parameters<typeof setGlobeVersusMercatorRendering>[0], 'globe-idle');
          applyGlobeCameraFrame(0);
          startGlobeIdleRotation();
        }
      });
    }
  }, [appSettings.settings.mapStyle, config.provider, geojsonData]);

  // Keep globe optically centered when the window / map panel size changes
  useEffect(() => {
    if (config.provider !== 'maplibre') return;
    let tid: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      if (tid !== undefined) clearTimeout(tid);
      tid = setTimeout(() => {
        const map = mapInstanceRef.current as { resize?: () => void } | null;
        map?.resize?.();
        if (geojsonDataRef.current) return;
        applyGlobeCameraFrame(0, { preserveCenter: true });
      }, 120);
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (tid !== undefined) clearTimeout(tid);
      window.removeEventListener('resize', onResize);
    };
  }, [config.provider]);

  // Update map data when geojsonData changes (when user selects country)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (!geojsonData) {
      if (config.provider === 'maplibre') {
        resetMapLibreToGlobeWorldView();
      }
      return;
    }

    const provider = config.provider;
    console.log(`Updating map with provider: ${provider}`, geojsonData);

    if (provider === 'maplibre') {
      stopGlobeIdleRotation();
      globeIdleActiveRef.current = false;
      updateMapLibreData();
    } else {
      updateGoogleMapsData();
    }
  }, [geojsonData, config.provider]);

  // Calculate center and zoom level from GeoJSON bounds
  const calculateMapBounds = (data: GeoJSONFeatureCollection) => {
    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    
    data.features?.forEach((f: unknown) => {
      const feature = f as { geometry?: { type: string; coordinates: unknown } };
      if (feature.geometry?.type === 'Polygon') {
        const coords = feature.geometry.coordinates as number[][][];
        coords[0]?.forEach((c: number[]) => {
          bounds.minX = Math.min(bounds.minX, c[0]);
          bounds.maxX = Math.max(bounds.maxX, c[0]);
          bounds.minY = Math.min(bounds.minY, c[1]);
          bounds.maxY = Math.max(bounds.maxY, c[1]);
        });
      } else if (feature.geometry?.type === 'MultiPolygon') {
        const coords = feature.geometry.coordinates as number[][][][];
        coords.forEach((poly: number[][][]) => {
          poly[0]?.forEach((c: number[]) => {
            bounds.minX = Math.min(bounds.minX, c[0]);
            bounds.maxX = Math.max(bounds.maxX, c[0]);
            bounds.minY = Math.min(bounds.minY, c[1]);
            bounds.maxY = Math.max(bounds.maxY, c[1]);
          });
        });
      }
    });

    if (bounds.minX !== Infinity) {
      const center: [number, number] = [
        (bounds.minX + bounds.maxX) / 2,
        (bounds.minY + bounds.maxY) / 2,
      ];
      
      // Better zoom calculation using proper mercator projection
      const dx = bounds.maxX - bounds.minX;
      const dy = bounds.maxY - bounds.minY;
      const maxDelta = Math.max(dx, dy);
      
      // Formula: zoom = log2(WORLD_SIZE / (maxDelta * ZOOM_MAX_PIXELS)) - 1
      // Where WORLD_SIZE = 512 and ZOOM_MAX_PIXELS = 512
      // Simplified: zoom = 8.5 - log2(maxDelta)
      let zoom = Math.log2(360 / (maxDelta * 1.2)); // Add 1.2x padding
      zoom = Math.max(2, Math.min(20, Math.round(zoom))); // Clamp to valid range

      console.log(`Bounds: [${bounds.minX}, ${bounds.minY}] to [${bounds.maxX}, ${bounds.maxY}]`);
      console.log(`Delta: dx=${dx}, dy=${dy}, maxDelta=${maxDelta}, calculated zoom=${zoom}`);

      return { center, zoom, bounds };
    }

    return null;
  };

  const updateMapLibreData = () => {
    const map = mapInstanceRef.current as unknown as {
      getLayer: (id: string) => unknown;
      removeLayer: (id: string) => void;
      getSource: (id: string) => unknown;
      removeSource: (id: string) => void;
      addSource: (id: string, source: unknown) => void;
      addLayer: (layer: unknown) => void;
      on: (event: string, layerId: string, handler: () => void) => void;
      getCanvas: () => { style: { cursor: string } };
      fitBounds: (bounds: [number, number][], options: unknown) => void;
      flyTo: (opts: Record<string, unknown>) => void;
      getBearing: () => number;
      once: (event: string, handler: () => void) => void;
    };
    if (!map || !geojsonData) return;

    stopGlobeIdleRotation();
    globeIdleActiveRef.current = false;

    try {
      (map as unknown as { setPadding?: (p: { top: number; bottom: number; left: number; right: number }) => void }).setPadding?.({
        ...MAPLIBRE_ZERO_PADDING,
      });
    } catch {
      /* ignore */
    }

    // Keep admin symbols off during the globe flyTo; enable in moveend once Mercator is active (avoids horizon ghosts).
    setGlobeAdministrativeSymbolsVisibility(
      map as unknown as Parameters<typeof setGlobeAdministrativeSymbolsVisibility>[0],
      false,
    );

    const sourceId = 'geojson-source';
    const layerId = 'geojson-layer';
    const outlineLayerId = `${layerId}-outline`;

    try {
      removeMapLibreGeoLayers(map);

      // Add source
      map.addSource(sourceId, {
        type: 'geojson',
        data: geojsonData as unknown as GeoJSON.GeoJSON,
      });

      // Add fill layer
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: { 'fill-color': '#FF0000', 'fill-opacity': 0.35 },
      });

      // Add outline layer
      map.addLayer({
        id: outlineLayerId,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': '#FF0000', 'line-width': 2, 'line-opacity': 0.8 },
      });

      // Change cursor on hover
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
      });

      // Globe approach flight, then switch to flat Mercator + fitBounds (avoids "double globe" / horizon artifacts)
      const mapBounds = calculateMapBounds(geojsonData);
      if (mapBounds) {
        console.log(`Flying to ${countryName}:`, mapBounds.bounds);

        const [[west, south], [east, north]]: [[number, number], [number, number]] = [
          [mapBounds.bounds.minX, mapBounds.bounds.minY],
          [mapBounds.bounds.maxX, mapBounds.bounds.maxY],
        ];

        const lngSpan = east - west;
        const latSpan = north - south;
        const maxSpan = Math.max(lngSpan, latSpan, 0.001);
        const flyZoom = Math.max(2, Math.min(10, Math.log2(360 / (maxSpan * 1.35))));

        let bearing = 0;
        try {
          bearing = map.getBearing();
        } catch {
          bearing = 0;
        }

        map.flyTo({
          center: mapBounds.center as [number, number],
          zoom: flyZoom,
          pitch: 34,
          bearing: bearing + 6,
          offset: [0, 0],
          duration: 2400,
          curve: 1.32,
          speed: 0.72,
          essential: true,
        });

        const flyGen = ++mapFlyGenerationRef.current;
        map.once('moveend', () => {
          if (flyGen !== mapFlyGenerationRef.current) return;
          try {
            (map as unknown as { setProjection?: (s: { type: string }) => void }).setProjection?.({ type: 'mercator' });
          } catch {
            /* ignore */
          }
          setGlobeVersusMercatorRendering(
            map as unknown as Parameters<typeof setGlobeVersusMercatorRendering>[0],
            'mercator-detail',
          );
          try {
            map.fitBounds(
              [
                [west, south],
                [east, north],
              ],
              {
                padding: 50,
                duration: 1600,
                maxZoom: 11,
                pitch: 0,
                bearing: 0,
                essential: true,
              }
            );
          } catch {
            map.fitBounds(
              [
                [west, south],
                [east, north],
              ],
              { padding: 50, duration: 1600, maxZoom: 11, essential: true }
            );
          }
        });
      } else {
        console.warn('Failed to calculate bounds for', countryName);
        try {
          (map as unknown as { setProjection?: (s: { type: string }) => void }).setProjection?.({ type: 'mercator' });
        } catch {
          /* ignore */
        }
        setGlobeVersusMercatorRendering(
          map as unknown as Parameters<typeof setGlobeVersusMercatorRendering>[0],
          'mercator-detail',
        );
      }
    } catch (e) {
      console.error('MapLibre error:', e);
    }
  };

  const updateGoogleMapsData = () => {
    const map = mapInstanceRef.current as unknown as {
      addListener: (event: string, handler: (e: unknown) => Promise<void>) => void;
      fitBounds: (bounds: unknown, padding: unknown) => void;
      getZoom: () => number;
      setZoom: (zoom: number) => void;
    };
    if (!map || !geojsonData) return;

    const google = (window as unknown as { google?: { maps: { LatLngBounds: new () => unknown; Polygon: new (options: unknown) => { setMap: (map: unknown) => void; addListener: (event: string, handler: () => void) => void } } } }).google;
    
    // Clear existing polygons
    polygonsRef.current.forEach(polygon => (polygon as { setMap: (map: unknown) => void }).setMap(null));
    polygonsRef.current = [];

    const bounds = new google!.maps.LatLngBounds();

    geojsonData.features.forEach((f: unknown) => {
      const feature = f as { geometry: { type: string; coordinates: number[][][] | number[][][][] } };
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        const coords = geom.coordinates as number[][][];
        const paths = coords[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }));
        const polygon = new google!.maps.Polygon({
          paths,
          strokeColor: "#FF0000",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#FF0000",
          fillOpacity: 0.35,
          map,
        });
        polygon.addListener("click", () => {
          polygonClickedRef.current = true;
          onGeofenceClickRef.current?.();
          setTimeout(() => { polygonClickedRef.current = false; }, 200);
        });
        polygonsRef.current.push(polygon);
        paths.forEach((p: { lat: number; lng: number }) => (bounds as unknown as { extend: (point: { lat: number; lng: number }) => void }).extend(p));
      } else if (geom.type === "MultiPolygon") {
        const coords = geom.coordinates as number[][][][];
        coords.forEach((poly: number[][][]) => {
          const paths = poly[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }));
          const polygon = new google!.maps.Polygon({
            paths,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.35,
            map,
          });
          polygon.addListener("click", () => {
            polygonClickedRef.current = true;
            onGeofenceClickRef.current?.();
            setTimeout(() => { polygonClickedRef.current = false; }, 200);
          });
          polygonsRef.current.push(polygon);
          paths.forEach((p: { lat: number; lng: number }) => (bounds as unknown as { extend: (point: { lat: number; lng: number }) => void }).extend(p));
        });
      }
    });

    // Animate to country with smooth pan and zoom
    if (!(bounds as unknown as { isEmpty: () => boolean }).isEmpty()) {
      const boundsObj = bounds as unknown as { getNorthEast: () => { lat: () => number; lng: () => number }; getSouthWest: () => { lat: () => number; lng: () => number } };
      const centerLat = (boundsObj.getNorthEast().lat() + boundsObj.getSouthWest().lat()) / 2;
      const centerLng = (boundsObj.getNorthEast().lng() + boundsObj.getSouthWest().lng()) / 2;
      const center = { lat: centerLat, lng: centerLng };

      console.log(`Animating to ${countryName}:`, center, bounds);

      // Use fitBounds for proper zooming - adjust padding for mobile
      const padding = window.innerWidth < 768 ? { top: 120, bottom: 120, left: 40, right: 40 } : { top: 80, bottom: 80, left: 80, right: 80 };
      (map as unknown as { fitBounds: (bounds: unknown, padding: unknown) => void }).fitBounds(bounds, padding);
      
      // Cap zoom level to prevent over-zooming on small countries
      const currentZoom = (map as unknown as { getZoom: () => number }).getZoom();
      if (currentZoom > 10) {
        (map as unknown as { setZoom: (zoom: number) => void }).setZoom(10);
      }
    }

    // Map-level click: if not on a polygon, reverse-geocode and select country
    map.addListener('click', async (e: unknown) => {
      if (polygonClickedRef.current) return;
      const ev = e as { latLng: { lng: () => number; lat: () => number } };
      await lookupCountryAtPoint(ev.latLng.lng(), ev.latLng.lat());
    });
  };

  const initializeMapLibre = () => {
    try {
      const maplibregl = (window as unknown as { maplibregl?: { Map: new (options: unknown) => unknown } }).maplibregl;
      if (!maplibregl) {
        console.error("MapLibre GL JS not loaded");
        setMapError("Map library failed to load. Please try refreshing the page.");
        setMapLoading(false);
        return;
      }

      const mapStyle = MAP_STYLES[appSettings.settings.mapStyle];
      const map = new maplibregl.Map({
        container: mapRef.current!,
        style: mapStyle,
        center: [0, 15] as [number, number],
        zoom: 1.65,
        pitch: MAPLIBRE_GLOBE_PITCH,
        bearing: 0,
        maxPitch: 85,
        // Globe projection (MapLibre GL JS 4.5+; requires style + renderer support)
        projection: { type: 'globe' },
      });

      (map as unknown as { on: (event: string, handler: () => void) => void }).on('load', () => {
        mapInstanceRef.current = map;
        setMapLoading(false);
        setMapError(null);

        const mapWithGlobe = map as unknown as {
          setProjection?: (spec: { type: string }) => void;
        };
        try {
          mapWithGlobe.setProjection?.({ type: 'globe' });
        } catch {
          /* older MapLibre builds without globe */
        }

        const mapForGlobeRendering = map as unknown as Parameters<typeof setGlobeVersusMercatorRendering>[0];

        // General map click: open drawer if on active geofence, else select clicked country
        (map as unknown as { on: (event: string, handler: (e: unknown) => Promise<void>) => void }).on('click', async (e: unknown) => {
          const event = e as { point: unknown; lngLat: { lng: number; lat: number } };
          const layerId = 'geojson-layer';
          if ((map as unknown as { getLayer: (id: string) => unknown }).getLayer(layerId)) {
            const hits = (map as unknown as { queryRenderedFeatures: (point: unknown, options: unknown) => unknown[] }).queryRenderedFeatures(event.point, { layers: [layerId] });
            if (hits.length > 0) {
              onGeofenceClickRef.current?.();
              return;
            }
          }
          await lookupCountryAtPoint(event.lngLat.lng, event.lngLat.lat);
        });

        if (geojsonDataRef.current) {
          updateMapLibreData();
        } else {
          setGlobeVersusMercatorRendering(mapForGlobeRendering, 'globe-idle');
          applyGlobeCameraFrame(0);
          startGlobeIdleRotation();
        }
      });

      // Error handler for map load failures
      (map as unknown as { on: (event: string, handler: (error: unknown) => void) => void }).on('error', (error: unknown) => {
        console.error('MapLibre error:', error);
        setMapError("Map rendering error. Please try refreshing.");
        setMapLoading(false);
      });
    } catch (err) {
      console.error('Failed to initialize MapLibre:', err);
      setMapError(`Map initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMapLoading(false);
    }
  };

  const initializeGoogleMaps = () => {
    try {
      const google = (window as unknown as { google?: { maps: { Map: new (el: HTMLElement, options: unknown) => unknown; MapTypeId: { ROADMAP: unknown }; ControlPosition: { BOTTOM_LEFT: unknown } } } }).google;
      if (!google) {
        console.warn("Google Maps not loaded");
        setMapError("Google Maps library failed to load. Please try refreshing the page.");
        setMapLoading(false);
        return;
      }

      const map = new google.maps.Map(mapRef.current!, {
        zoom: 4,
        center: { lat: 20, lng: 0 },
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControlOptions: { position: google.maps.ControlPosition.BOTTOM_LEFT },
      });

      mapInstanceRef.current = map;
      setMapLoading(false);
      setMapError(null);
      updateGoogleMapsData();
    } catch (err) {
      console.error('Failed to initialize Google Maps:', err);
      setMapError(`Map initialization failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setMapLoading(false);
    }
  };

  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current) {
      const map = mapInstanceRef.current as unknown as { setZoom: (zoom: number) => void; getZoom: () => number };
      map.setZoom(map.getZoom() + delta);
    }
  };

  return (
    <div className="map-container">
      <div className="map-header">
        <div className="header-left">
          <button
            type="button"
            className="menu-button"
            data-tour="tour-nav-menu"
            onClick={onMenuOpen}
            title="Menu"
            aria-label="Toggle menu"
          >
            ☰
          </button>
          {onCountryChange && (
            <CountrySelector
              selectedCountry={selectedCountry || null}
              onCountryChange={onCountryChange}
              items={dropdownItems}
              label={dropdownLabel}
            />
          )}
        </div>
        <div className="header-right">
          {countryLoading && <div className="top-spinner" />}
          <button
            type="button"
            className="settings-button"
            data-tour="tour-settings"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
      <div className="map-wrapper">
        <div ref={mapRef} className="map" data-tour="tour-map" />
        <GlobeStarfield active={config.provider === "maplibre" && !geojsonData} />
        {mapLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            borderRadius: 'inherit'
          }}>
            <div style={{ textAlign: 'center', color: 'white' }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>Loading map...</div>
              <div style={{
                width: '30px',
                height: '30px',
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }} />
            </div>
          </div>
        )}
        {mapError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            zIndex: 1000,
            borderRadius: 'inherit',
            padding: '20px'
          }}>
            <div style={{ textAlign: 'center', color: 'white', maxWidth: '300px' }}>
              <div style={{ fontSize: '18px', marginBottom: '10px', color: '#ff6b6b' }}>⚠️ Error</div>
              <div style={{ fontSize: '14px', marginBottom: '15px' }}>{mapError}</div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4a90e2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        )}
        {(dropdownLabel === 'Country' || dropdownLabel === 'Countries') && (
        <button
          type="button"
          className="details-button"
          data-tour="tour-details"
          onClick={onCountryDetails}
          title="Country Details"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="8.01"/>
            <polyline points="11 12 12 12 12 16"/>
          </svg>
          <span>Country Info</span>
        </button>
        )}
        <div className="zoom-controls" data-tour="tour-zoom">
          <button className="zoom-button zoom-in" onClick={() => handleZoom(1)}>+</button>
          <button className="zoom-button zoom-out" onClick={() => handleZoom(-1)}>−</button>
        </div>
      </div>
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onAboutOpen={() => setAboutOpen(true)}
        onDeveloperOpen={() => setDeveloperOpen(true)}
        onStartNavigationTour={onReplayNavigationTours}
        launchPremiumFromMenu={launchPremiumFromMenu}
        onLaunchPremiumFromMenuConsumed={consumeLaunchPremiumFromMenu}
      />
      <AboutScreen isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <DeveloperScreen isOpen={developerOpen} onClose={() => setDeveloperOpen(false)} />
    </div>
  );
};