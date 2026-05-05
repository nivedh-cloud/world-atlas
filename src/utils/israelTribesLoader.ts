import type { GeoJSONFeatureCollection } from "./geojsonLoader";

// All tribe/region GeoJSON files in public/israrel_tribes/
export const ISRAEL_TRIBES = [
  "amon_new (1)",
  "amon_new",
  "aram_new",
  "asher_new",
  "beersheba_new",
  "Edom_new",
  "Gad_new",
  "gaza_marker",
  "hebron",
  "Issachar_new",
  "jericho",
  "Joppa",
  "Judah_new",
  "Manasseh1_new",
  "Manasseh2_new",
  "Moab_new",
  "naphtali_new",
  "Reuben_new",
  "Shiloh",
  "Simeon_new",
  "zebulun_new",
];

export const formatTribeName = (name: string): string =>
  name
    .replace(/_new(\s*\(\d+\))?$/, "$1")
    .replace(/_/g, " ")
    .replace(/\s*\(\d+\)/, " (alt)")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

export const loadIsraelTribeGeoJSON = async (
  tribeName: string
): Promise<GeoJSONFeatureCollection | null> => {
  try {
    const url = `/israrel_tribes/${encodeURIComponent(tribeName)}.geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.type === "FeatureCollection") return data as GeoJSONFeatureCollection;
    if (data.type === "Feature") return { type: "FeatureCollection", features: [data] };
    // bare geometry
    return { type: "FeatureCollection", features: [{ type: "Feature", geometry: data, properties: {} }] };
  } catch (e) {
    console.error("Failed to load tribe GeoJSON:", tribeName, e);
    return null;
  }
};
