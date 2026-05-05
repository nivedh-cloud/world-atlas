import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { COUNTRIES, getCountryCodeFromName } from "./geojsonLoader";

const MAPTILER_KEY = "9rUTis0cKnTtAS2nbbFd";

/** MapTiler `text` → internal country slug (aligned with MapComponent lookups). */
const MAPTILER_COUNTRY_TEXT_ALIASES: Record<string, string> = {
  "united states": "united states of america",
  tanzania: "united republic of tanzania",
  serbia: "republic of serbia",
  "north macedonia": "macedonia",
  "republic of north macedonia": "macedonia",
  "côte d'ivoire": "ivory coast",
  "cote d'ivoire": "ivory coast",
  "côte divoire": "ivory coast",
  bahamas: "the bahamas",
  czechia: "czech republic",
  "timor-leste": "east timor",
  eswatini: "swaziland",
  türkiye: "turkey",
  turkiye: "turkey",
  congo: "republic of the congo",
  "congo-brazzaville": "republic of the congo",
  "republic of congo": "republic of the congo",
  "democratic republic of congo": "democratic republic of the congo",
  "dr congo": "democratic republic of the congo",
  "congo-kinshasa": "democratic republic of the congo",
  "cabo verde": "cape verde",
  "cape verde": "cape verde",
  "myanmar (burma)": "myanmar",
  burma: "myanmar",
  laos: "laos",
  "lao people's democratic republic": "laos",
  "iran (islamic republic of)": "iran",
  "syrian arab republic": "syria",
  "south korea (republic of korea)": "south korea",
  "republic of korea": "south korea",
  "democratic people's republic of korea": "north korea",
  "viet nam": "vietnam",
  "state of palestine": "west bank",
  "palestinian territory": "west bank",
};

/** Reverse-geocode coords → lowercase ISO alpha-2, or null. */
export async function reverseGeocodeLatLngToCca2(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&language=en`,
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{ place_type?: string[]; text?: string }>;
  };
  const countryFeature = data.features?.find(
    (f) => Array.isArray(f.place_type) && f.place_type.includes("country"),
  );
  if (!countryFeature) return null;

  const rawName = (countryFeature.text ?? "").toLowerCase().trim();
  const normalized = MAPTILER_COUNTRY_TEXT_ALIASES[rawName] ?? rawName;
  const matched = COUNTRIES.find((c) => c === normalized);
  if (!matched) return null;

  const code = getCountryCodeFromName(matched);
  return typeof code === "string" ? code.toLowerCase().slice(0, 2) : null;
}

async function coordsFromNativeGeolocation(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const checked = await Geolocation.checkPermissions();
    let perm = checked.location;
    if (perm === "prompt" || perm === "prompt-with-rationale") {
      const req = await Geolocation.requestPermissions({ permissions: ["coarseLocation", "location"] });
      perm = req.location;
    }
    if (perm !== "granted") return null;

    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: timeoutMs,
      maximumAge: 300_000,
    });
    const { latitude, longitude } = pos.coords;
    if (typeof latitude !== "number" || typeof longitude !== "number") return null;
    return { lat: latitude, lng: longitude };
  } catch {
    return null;
  }
}

/** WebView / browser: navigator.geolocation (no Capacitor permission bridge). */
async function coordsFromWebGeolocation(timeoutMs: number): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;

  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    let settled = false;
    const settle = (v: GeolocationPosition | null) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = window.setTimeout(() => settle(null), timeoutMs + 400);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        window.clearTimeout(timer);
        settle(p);
      },
      () => {
        window.clearTimeout(timer);
        settle(null);
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300_000 },
    );
  });
  const c = pos?.coords;
  if (!c) return null;
  return { lat: c.latitude, lng: c.longitude };
}

/** Geolocation → country alpha-2, or null if denied/unavailable. Uses @capacitor/geolocation on native (Android/iOS) so runtime permissions apply; browsers use navigator.geolocation. */
export async function detectCountryCodeFromDeviceLocation(
  opts?: { timeoutMs?: number },
): Promise<string | null> {
  const timeoutMs = opts?.timeoutMs ?? 12000;

  const coords = Capacitor.isNativePlatform()
    ? await coordsFromNativeGeolocation(timeoutMs)
    : await coordsFromWebGeolocation(timeoutMs);

  if (!coords) return null;
  try {
    return await reverseGeocodeLatLngToCca2(coords.lat, coords.lng);
  } catch {
    return null;
  }
}
