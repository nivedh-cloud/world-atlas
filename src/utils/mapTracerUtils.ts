export interface Point {
  lat: number;
  lng: number;
}

export interface DrawnPolygon {
  id: string;
  name: string;
  points: Point[];
  color: string;
}

export interface DrawnMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
}

export interface DrawnCircle {
  id: string;
  name: string;
  center: { lat: number; lng: number };
  radius: number; // metres
  color: string;
}

export interface DrawnRectangle {
  id: string;
  name: string;
  bounds: { north: number; south: number; east: number; west: number };
  color: string;
}

export interface SavedOverlay {
  name: string;
  imageData: string; // base64 data URL
  bounds: { north: number; south: number; east: number; west: number };
  rotation: number;
  opacity: number;
  savedAt: string;
}

export interface GeometryCoordinates {
  type: "Polygon" | "MultiPolygon";
  coordinates: any[];
}

// Convert drawn polygon to GeoJSON Feature
export const polygonToGeoJSONFeature = (polygon: DrawnPolygon) => {
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [polygon.points.map((p) => [p.lng, p.lat])],
    },
    properties: { name: polygon.name, color: polygon.color, shapeType: "polygon" },
  };
};

export const markerToGeoJSONFeature = (marker: DrawnMarker) => ({
  type: "Feature" as const,
  geometry: { type: "Point" as const, coordinates: [marker.lng, marker.lat] },
  properties: { name: marker.name, color: marker.color, shapeType: "marker" },
});

/** Approximate a circle as a 64-segment polygon */
export const circleToGeoJSONFeature = (circle: DrawnCircle) => {
  const N = 64;
  const coords: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const angle = (i / N) * 2 * Math.PI;
    const dlat = (circle.radius / 111320) * Math.cos(angle);
    const dlng =
      (circle.radius / (111320 * Math.cos((circle.center.lat * Math.PI) / 180))) *
      Math.sin(angle);
    coords.push([circle.center.lng + dlng, circle.center.lat + dlat]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [coords] },
    properties: {
      name: circle.name,
      color: circle.color,
      shapeType: "circle",
      centerLat: circle.center.lat,
      centerLng: circle.center.lng,
      radiusMeters: circle.radius,
    },
  };
};

export const rectangleToGeoJSONFeature = (rect: DrawnRectangle) => {
  const { north, south, east, west } = rect.bounds;
  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    },
    properties: { name: rect.name, color: rect.color, shapeType: "rectangle" },
  };
};

// Convert multiple polygons to GeoJSON FeatureCollection
export const polygonsToGeoJSON = (polygons: DrawnPolygon[]) => ({
  type: "FeatureCollection" as const,
  features: polygons.map(polygonToGeoJSONFeature),
});

/** Export ALL shape types together */
export const allShapesToGeoJSON = (
  polygons: DrawnPolygon[],
  markers: DrawnMarker[],
  circles: DrawnCircle[],
  rectangles: DrawnRectangle[]
) => ({
  type: "FeatureCollection" as const,
  features: [
    ...polygons.map(polygonToGeoJSONFeature),
    ...markers.map(markerToGeoJSONFeature),
    ...circles.map(circleToGeoJSONFeature),
    ...rectangles.map(rectangleToGeoJSONFeature),
  ],
});

// Download GeoJSON file
export const downloadGeoJSON = (data: any, filename: string) => {
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  const exportFileDefaultName = filename.endsWith(".geojson") ? filename : `${filename}.geojson`;
  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
};

// ─── Saved Overlay persistence (localStorage) ───────────────────────────────

const LS_KEY = "maptracer_saved_overlays";

export const getSavedOverlays = (): SavedOverlay[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as SavedOverlay[]) : [];
  } catch {
    return [];
  }
};

export const saveOverlayToStorage = (overlay: SavedOverlay): void => {
  const existing = getSavedOverlays().filter((o) => o.name !== overlay.name);
  localStorage.setItem(LS_KEY, JSON.stringify([...existing, overlay]));
};

export const deleteOverlayFromStorage = (name: string): void => {
  const updated = getSavedOverlays().filter((o) => o.name !== name);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
};

// Generate unique ID
export const generatePolygonId = () =>
  `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Random color generator
export const getRandomColor = () => {
  const colors = [
    "#FF0000", "#0000FF", "#00CC44", "#FF8800",
    "#FF00FF", "#00CCFF", "#FFCC00", "#8800FF",
    "#FF4488", "#00AA88",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Calculate distance between two points (in metres)
export const calculateDistance = (p1: Point, p2: Point): number => {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1000;
};

export const isPolygonClosed = (points: Point[]): boolean => {
  if (points.length < 3) return false;
  return points[0].lat === points[points.length - 1].lat &&
    points[0].lng === points[points.length - 1].lng;
};
