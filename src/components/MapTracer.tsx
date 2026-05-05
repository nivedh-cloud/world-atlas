import React, { useEffect, useRef, useState } from "react";
import type {
  DrawnPolygon, DrawnMarker, DrawnCircle, DrawnRectangle, SavedOverlay,
} from "../utils/mapTracerUtils";
import {
  generatePolygonId, getRandomColor, allShapesToGeoJSON, downloadGeoJSON,
  getSavedOverlays, saveOverlayToStorage, deleteOverlayFromStorage,
} from "../utils/mapTracerUtils";
import "./MapTracer.css";

type DrawTool = "polygon" | "marker" | "circle" | "rectangle" | null;
type TracerTab = "draw" | "edit";

interface EditFeature {
  id: string;
  name: string;
  fillColor: string;
  strokeColor: string;
  geometryType: string;
}

// Custom drawing state (all mutable – lives in a ref to avoid stale closures)
interface DS {
  polyPts:      { lat: number; lng: number }[];
  previewPoly:  any;
  previewLine:  any;
  dotMarkers:   any[];
  dragOrigin:   any;
  previewShape: any;
  mmListener:   any;
  listeners:    any[];
}

export const MapTracer: React.FC = () => {
  // Map refs
  const mapRef          = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const overlayViewRef  = useRef<any>(null);

  // Shape storage refs
  const markerMapRef    = useRef<Map<string, any>>(new Map());
  const circleMapRef    = useRef<Map<string, any>>(new Map());
  const rectMapRef      = useRef<Map<string, any>>(new Map());
  const polygonMapRef   = useRef<Map<string, any>>(new Map());
  const editPolyMapRef  = useRef<Map<string, any[]>>(new Map());

  // Custom drawing refs
  const activeToolRef   = useRef<DrawTool>(null);
  const shapeLabelRef   = useRef("");
  const dsRef           = useRef<DS>({
    polyPts: [], previewPoly: null, previewLine: null, dotMarkers: [],
    dragOrigin: null, previewShape: null, mmListener: null, listeners: [],
  });

  // ── State ────────────────────────────────────────────────────────────────
  const [overlayImage,   setOverlayImage]   = useState<string | null>(null);
  const [imageOpacity,   setImageOpacity]   = useState(0.5);
  const [imageRotation,  setImageRotation]  = useState(0);
  const [imageBounds,    setImageBounds]    = useState({ north:33.5, south:29.5, east:36.0, west:34.0 });
  const [imageLocked,    setImageLocked]    = useState(false);
  const [overlayName,    setOverlayName]    = useState("");
  const [savedOverlays,  setSavedOverlays]  = useState<SavedOverlay[]>([]);
  const [selectedSaved,  setSelectedSaved]  = useState("");
  const [loadedFromSaved, setLoadedFromSaved] = useState<string | null>(null);

  const [activeTool,     setActiveTool]     = useState<DrawTool>(null);
  const [shapeLabel,     setShapeLabel]     = useState("");
  const [drawnPolygons,  setDrawnPolygons]  = useState<DrawnPolygon[]>([]);
  const [drawnMarkers,   setDrawnMarkers]   = useState<DrawnMarker[]>([]);
  const [drawnCircles,   setDrawnCircles]   = useState<DrawnCircle[]>([]);
  const [drawnRects,     setDrawnRects]     = useState<DrawnRectangle[]>([]);
  const [exportFileName, setExportFileName] = useState("traced_regions");

  const [tracerTab,      setTracerTab]      = useState<TracerTab>("draw");
  const [editFeatures,   setEditFeatures]   = useState<EditFeature[]>([]);
  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [editExportName, setEditExportName] = useState("edited_geofence");
  const [editingNameId,  setEditingNameId]  = useState<string | null>(null);

  useEffect(() => { setSavedOverlays(getSavedOverlays()); }, []);

  // ── Haversine distance (metres) ──────────────────────────────────────────
  const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
            + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ── Cancel any in-progress drawing ──────────────────────────────────────
  const cancelDrawing = () => {
    const ds = dsRef.current;
    const g  = (window as any).google;
    ds.listeners.forEach((l: any) => g?.maps?.event?.removeListener(l));
    ds.listeners = [];
    if (ds.mmListener) { g?.maps?.event?.removeListener(ds.mmListener); ds.mmListener = null; }
    ds.dotMarkers.forEach((d: any) => d?.setMap(null)); ds.dotMarkers = [];
    ds.previewPoly?.setMap(null);  ds.previewPoly  = null;
    ds.previewLine?.setMap(null);  ds.previewLine  = null;
    ds.previewShape?.setMap(null); ds.previewShape = null;
    ds.polyPts = [];
    ds.dragOrigin = null;
    mapInstanceRef.current?.setOptions({ disableDoubleClickZoom: false, draggable: true });
  };

  // ── Polygon preview helpers ──────────────────────────────────────────────
  const updatePolyPreview = (google: any, map: any) => {
    const ds  = dsRef.current;
    const pts = ds.polyPts.map((p) => new google.maps.LatLng(p.lat, p.lng));
    if (pts.length < 2) return;
    if (ds.previewPoly) { ds.previewPoly.setPath(pts); }
    else {
      ds.previewPoly = new google.maps.Polygon({
        paths: pts, map,
        fillColor: "#007bff", fillOpacity: 0.1,
        strokeColor: "#007bff", strokeWeight: 2, clickable: false, zIndex: 50,
      });
    }
  };

  const updatePolyCursor = (google: any, cursorLatLng: any) => {
    const ds     = dsRef.current;
    const map    = mapInstanceRef.current;
    if (!ds.polyPts.length || !map) return;
    const lastPt = ds.polyPts[ds.polyPts.length - 1];
    const path   = [new google.maps.LatLng(lastPt.lat, lastPt.lng), cursorLatLng];
    if (ds.previewLine) { ds.previewLine.setPath(path); }
    else {
      ds.previewLine = new google.maps.Polyline({
        path, map,
        strokeColor: "#007bff", strokeWeight: 2, strokeOpacity: 0.6, clickable: false, zIndex: 60,
      });
    }
  };

  const finalizePolygon = (google: any, map: any, name: string) => {
    const ds  = dsRef.current;
    const pts = [...ds.polyPts];
    ds.previewPoly?.setMap(null);  ds.previewPoly  = null;
    ds.previewLine?.setMap(null);  ds.previewLine  = null;
    ds.dotMarkers.forEach((d: any) => d.setMap(null)); ds.dotMarkers = [];
    ds.polyPts = [];
    if (pts.length < 3) return;
    const color     = getRandomColor();
    const id        = generatePolygonId();
    const shapeName = name || `Polygon ${Date.now()}`;
    const polygon   = new google.maps.Polygon({
      paths: pts.map((p) => new google.maps.LatLng(p.lat, p.lng)),
      map, fillColor: color, fillOpacity: 0.3, strokeColor: color, strokeWeight: 2, editable: true,
    });
    polygonMapRef.current.set(id, polygon);
    setDrawnPolygons((p) => [...p, { id, name: shapeName, points: [...pts, pts[0]], color }]);
    map.setOptions({ disableDoubleClickZoom: false });
    setActiveTool(null);
    activeToolRef.current = null;
  };

  // ── Init Google Maps (no DrawingManager) ────────────────────────────────
  useEffect(() => {
    const init = () => {
      const google = (window as any).google;
      if (!google || !mapRef.current) return;
      const map = new google.maps.Map(mapRef.current, {
        zoom: 7, center: { lat: 31.5, lng: 34.8 },
        mapTypeId: google.maps.MapTypeId.SATELLITE, zoomControl: true,
      });
      mapInstanceRef.current = map;
    };
    if ((window as any).google?.maps) { init(); }
    else {
      const t = setInterval(() => {
        if ((window as any).google?.maps) { clearInterval(t); init(); }
      }, 200);
      return () => clearInterval(t);
    }
  }, []);

  // ── Custom drawing logic (runs when activeTool changes) ─────────────────
  useEffect(() => {
    const google = (window as any).google;
    const map    = mapInstanceRef.current;
    cancelDrawing();
    if (!activeTool || !google || !map) return;

    const pending = shapeLabelRef.current;
    const ls: any[] = [];

    // ---- Marker ----
    if (activeTool === "marker") {
      ls.push(google.maps.event.addListenerOnce(map, "click", (e: any) => {
        const id    = generatePolygonId();
        const color = getRandomColor();
        const name  = pending || `Marker ${Date.now()}`;
        const marker = new google.maps.Marker({
          position: e.latLng, draggable: true, map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale: 8,
            fillColor: color, fillOpacity: 1, strokeColor: "white", strokeWeight: 2,
          },
        });
        markerMapRef.current.set(id, marker);
        setDrawnMarkers((m) => [...m, { id, name, lat: e.latLng.lat(), lng: e.latLng.lng(), color }]);
        setActiveTool(null);
        activeToolRef.current = null;
      }));

    // ---- Polygon ----
    } else if (activeTool === "polygon") {
      map.setOptions({ disableDoubleClickZoom: true });
      ls.push(google.maps.event.addListener(map, "click", (e: any) => {
        const ds  = dsRef.current;
        const pt  = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        ds.polyPts.push(pt);
        const dot = new google.maps.Marker({
          position: e.latLng, map, clickable: false, zIndex: 100,
          icon: {
            path: google.maps.SymbolPath.CIRCLE, scale: 5,
            fillColor: "#007bff", fillOpacity: 1, strokeColor: "white", strokeWeight: 1,
          },
        });
        ds.dotMarkers.push(dot);
        updatePolyPreview(google, map);
      }));
      ls.push(google.maps.event.addListener(map, "dblclick", () => {
        const ds = dsRef.current;
        // dblclick fires click first – remove that extra point
        ds.polyPts.pop();
        ds.dotMarkers.pop()?.setMap(null);
        finalizePolygon(google, map, pending);
      }));
      ls.push(google.maps.event.addListener(map, "mousemove", (e: any) => {
        updatePolyCursor(google, e.latLng);
      }));

    // ---- Circle (2-click: center then radius) ----
    } else if (activeTool === "circle") {
      map.setOptions({ draggable: false });
      ls.push(google.maps.event.addListenerOnce(map, "click", (e: any) => {
        const center = e.latLng;
        const previewCircle = new google.maps.Circle({
          center, radius: 1000, map,
          fillColor: "#007bff", fillOpacity: 0.15, strokeColor: "#007bff", strokeWeight: 2,
        });
        dsRef.current.previewShape = previewCircle;
        const mm = google.maps.event.addListener(map, "mousemove", (mv: any) => {
          previewCircle.setRadius(haversineMeters(center.lat(), center.lng(), mv.latLng.lat(), mv.latLng.lng()));
        });
        dsRef.current.mmListener = mm;
        ls.push(mm);
        ls.push(google.maps.event.addListenerOnce(map, "click", (e2: any) => {
          google.maps.event.removeListener(mm);
          dsRef.current.mmListener = null;
          previewCircle.setMap(null);
          dsRef.current.previewShape = null;
          const radius    = haversineMeters(center.lat(), center.lng(), e2.latLng.lat(), e2.latLng.lng());
          const id        = generatePolygonId();
          const color     = getRandomColor();
          const name      = pending || `Circle ${Date.now()}`;
          const circle    = new google.maps.Circle({
            center, radius, map,
            fillColor: color, fillOpacity: 0.25, strokeColor: color, strokeWeight: 2, editable: true,
          });
          circleMapRef.current.set(id, circle);
          setDrawnCircles((arr) => [...arr, { id, name, center: { lat: center.lat(), lng: center.lng() }, radius, color }]);
          map.setOptions({ draggable: true });
          setActiveTool(null);
          activeToolRef.current = null;
        }));
      }));

    // ---- Rectangle (2-click: corner then opposite corner) ----
    } else if (activeTool === "rectangle") {
      map.setOptions({ draggable: false });
      ls.push(google.maps.event.addListenerOnce(map, "click", (e: any) => {
        const corner1 = e.latLng;
        const previewRect = new google.maps.Rectangle({
          bounds: new google.maps.LatLngBounds(corner1, corner1), map,
          fillColor: "#007bff", fillOpacity: 0.15, strokeColor: "#007bff", strokeWeight: 2,
        });
        dsRef.current.previewShape = previewRect;
        const mm = google.maps.event.addListener(map, "mousemove", (mv: any) => {
          previewRect.setBounds(new google.maps.LatLngBounds(
            new google.maps.LatLng(Math.min(corner1.lat(), mv.latLng.lat()), Math.min(corner1.lng(), mv.latLng.lng())),
            new google.maps.LatLng(Math.max(corner1.lat(), mv.latLng.lat()), Math.max(corner1.lng(), mv.latLng.lng())),
          ));
        });
        dsRef.current.mmListener = mm;
        ls.push(mm);
        ls.push(google.maps.event.addListenerOnce(map, "click", (e2: any) => {
          google.maps.event.removeListener(mm);
          dsRef.current.mmListener = null;
          previewRect.setMap(null);
          dsRef.current.previewShape = null;
          const c2    = e2.latLng;
          const north = Math.max(corner1.lat(), c2.lat());
          const south = Math.min(corner1.lat(), c2.lat());
          const east  = Math.max(corner1.lng(), c2.lng());
          const west  = Math.min(corner1.lng(), c2.lng());
          const id    = generatePolygonId();
          const color = getRandomColor();
          const name  = pending || `Rectangle ${Date.now()}`;
          const rect  = new google.maps.Rectangle({
            bounds: new google.maps.LatLngBounds(
              new google.maps.LatLng(south, west),
              new google.maps.LatLng(north, east),
            ),
            map, fillColor: color, fillOpacity: 0.2, strokeColor: color, strokeWeight: 2, editable: true,
          });
          rectMapRef.current.set(id, rect);
          setDrawnRects((arr) => [...arr, { id, name, bounds: { north, south, east, west }, color }]);
          map.setOptions({ draggable: true });
          setActiveTool(null);
          activeToolRef.current = null;
        }));
      }));
    }

    dsRef.current.listeners = ls;
    return () => {
      ls.forEach((l: any) => google?.maps?.event?.removeListener(l));
      map?.setOptions({ disableDoubleClickZoom: false, draggable: true });
    };
  }, [activeTool]);

  // ── Image OverlayView with drag handles ─────────────────────────────────
  const buildOverlayView = (google: any, onB: (b: typeof imageBounds) => void, _isLocked: boolean) => {
    return class IV extends google.maps.OverlayView {
      img: string; bnds: any; op: number; rot: number; locked: boolean; preLockedOpacity: number;
      div: HTMLDivElement | null = null; imgEl: HTMLImageElement | null = null;
      constructor(img: string, bnds: any, op: number, rot: number, locked: boolean) {
        super(); this.img = img; this.bnds = bnds; this.op = op; this.rot = rot; this.locked = locked; this.preLockedOpacity = op;
      }
      onAdd() {
        const d = document.createElement("div");
        d.style.cssText = "position:absolute;transform-origin:center center;pointer-events:none;";
        const i = document.createElement("img");
        i.src = this.img;
        const cursorStyle = this.locked ? "not-allowed" : "move";
        i.style.cssText = `width:100%;height:100%;display:block;pointer-events:auto;cursor:${cursorStyle};user-select:none;z-index:100;`;
        i.style.opacity = String(this.locked ? 0.6 : this.op);
        if (!this.locked) {
          i.addEventListener("mousedown", (e) => this._drag(e, "move", google, onB));
        }
        d.appendChild(i); this.imgEl = i;
        const mkH = (cur: string, pos: string, mv: boolean) => {
          const h  = document.createElement("div");
          const bg = mv ? "rgba(0,123,255,0.8)" : "white";
          const sz = mv ? 18 : 11;
          const br = mv ? "50%" : "2px";
          h.style.cssText =
            `position:absolute;width:${sz}px;height:${sz}px;background:${bg};` +
            `border:2px solid #007bff;border-radius:${br};cursor:${cur};` +
            `pointer-events:auto;z-index:999;box-shadow:0 1px 4px rgba(0,0,0,0.5);${pos};display:${this.locked ? "none" : "block"}`;
          return h;
        };
        [
          { id: "nw",   cur: "nw-resize", pos: "top:-6px;left:-6px",                         mv: false },
          { id: "ne",   cur: "ne-resize", pos: "top:-6px;right:-6px",                        mv: false },
          { id: "sw",   cur: "sw-resize", pos: "bottom:-6px;left:-6px",                      mv: false },
          { id: "se",   cur: "se-resize", pos: "bottom:-6px;right:-6px",                     mv: false },
          { id: "move", cur: "move",      pos: "top:50%;left:50%;transform:translate(-50%,-50%)", mv: true  },
        ].forEach(({ id, cur, pos, mv }) => {
          const h = mkH(cur, pos, mv);
          h.setAttribute("data-handle", id);
          h.addEventListener("mousedown", (e) => this._drag(e, id, google, onB));
          d.appendChild(h);
        });
        this.div = d;
        this.getPanes().overlayMouseTarget.appendChild(d);
      }
      draw() {
        const proj = this.getProjection();
        if (!proj) return;                   // guard: projection not ready yet
        const sw = proj.fromLatLngToDivPixel(this.bnds.getSouthWest());
        const ne = proj.fromLatLngToDivPixel(this.bnds.getNorthEast());
        if (!this.div || !sw || !ne) return;
        this.div.style.left      = sw.x + "px";
        this.div.style.top       = ne.y + "px";
        this.div.style.width     = (ne.x - sw.x) + "px";
        this.div.style.height    = (sw.y - ne.y) + "px";
        this.div.style.transform = `rotate(${this.rot}deg)`;
      }
      onRemove() {
        if (this.div?.parentNode) { this.div.parentNode.removeChild(this.div); this.div = null; }
      }
      setRotation(d: number)  { this.rot = d; if (this.div) this.div.style.transform = `rotate(${d}deg)`; }
      setOpacity(v: number)   { 
        this.op = v; 
        if (this.imgEl) {
          if (!this.locked) {
            this.imgEl.style.opacity = String(v);
          }
          this.preLockedOpacity = v;
        }
      }
      setLocked(locked: boolean) {
        this.locked = locked;
        if (this.imgEl) {
          this.imgEl.style.cursor = locked ? "not-allowed" : "move";
          this.imgEl.style.opacity = String(locked ? 0.6 : this.preLockedOpacity);
        }
        if (this.div) {
          const handles = this.div.querySelectorAll("div[data-handle]");
          handles.forEach((h) => {
            (h as HTMLElement).style.display = locked ? "none" : "block";
          });
        }
      }
      updateBounds(s: number, w: number, n: number, e: number) {
        this.bnds = new google.maps.LatLngBounds(
          new google.maps.LatLng(s, w), new google.maps.LatLng(n, e),
        );
        this.draw();
      }
      _drag(e: MouseEvent, hid: string, _g: any, _onB: (b: any) => void) {
        if (this.locked) return;
        e.stopPropagation(); e.preventDefault();
        const map = this.getMap() as any;
        if (map) map.setOptions({ draggable: false });
        const proj = this.getProjection();
        if (!proj) return;
        const sx  = e.clientX, sy = e.clientY;
        const iSw = proj.fromLatLngToDivPixel(this.bnds.getSouthWest());
        const iNe = proj.fromLatLngToDivPixel(this.bnds.getNorthEast());
        if (!iSw || !iNe) return;
        const mv = (me: MouseEvent) => {
          const dx = me.clientX - sx, dy = me.clientY - sy;
          let swX = iSw.x, swY = iSw.y, neX = iNe.x, neY = iNe.y;
          if      (hid === "nw") { swX += dx; neY += dy; }
          else if (hid === "ne") { neX += dx; neY += dy; }
          else if (hid === "sw") { swX += dx; swY += dy; }
          else if (hid === "se") { neX += dx; swY += dy; }
          else                   { swX += dx; swY += dy; neX += dx; neY += dy; }
          const nSW = proj.fromDivPixelToLatLng(new _g.maps.Point(swX, swY));
          const nNE = proj.fromDivPixelToLatLng(new _g.maps.Point(neX, neY));
          if (!nSW || !nNE) return;
          this.bnds = new _g.maps.LatLngBounds(nSW, nNE);
          this.draw();
        };
        const up = () => {
          window.removeEventListener("mousemove", mv);
          window.removeEventListener("mouseup",   up);
          if (map) map.setOptions({ draggable: true });
          const sw = this.bnds.getSouthWest(), ne = this.bnds.getNorthEast();
          _onB({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() });
        };
        window.addEventListener("mousemove", mv);
        window.addEventListener("mouseup",   up);
      }
    };
  };

  // ── Overlay useEffects ───────────────────────────────────────────────────
  useEffect(() => {
    const google = (window as any).google;
    if (!google || !mapInstanceRef.current) return;
    if (overlayViewRef.current) { overlayViewRef.current.setMap(null); overlayViewRef.current = null; }
    if (!overlayImage) return;
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(imageBounds.south, imageBounds.west),
      new google.maps.LatLng(imageBounds.north, imageBounds.east),
    );
    const IV = buildOverlayView(google, setImageBounds, imageLocked);
    const iv = new IV(overlayImage, bounds, imageOpacity, imageRotation, imageLocked);
    iv.setMap(mapInstanceRef.current);
    overlayViewRef.current = iv;
    mapInstanceRef.current.fitBounds(bounds);
  }, [overlayImage, imageLocked]);

  useEffect(() => {
    overlayViewRef.current?.updateBounds(imageBounds.south, imageBounds.west, imageBounds.north, imageBounds.east);
  }, [imageBounds]);
  useEffect(() => { overlayViewRef.current?.setRotation(imageRotation); }, [imageRotation]);
  useEffect(() => { overlayViewRef.current?.setOpacity(imageOpacity);   }, [imageOpacity]);
  useEffect(() => { overlayViewRef.current?.setLocked(imageLocked); }, [imageLocked]);

  // ── Edit GeoJSON tab ─────────────────────────────────────────────────────
  const importGeoJSONToMap = (geojson: any) => {
    const google = (window as any).google;
    if (!google || !mapInstanceRef.current) return;
    editPolyMapRef.current.forEach((arr) => arr.forEach((o: any) => o.setMap(null)));
    editPolyMapRef.current.clear();
    setSelectedEditId(null);

    const rawFeats = geojson.type === "FeatureCollection" ? geojson.features
                   : geojson.type === "Feature" ? [geojson] : [];
    const newFeats: EditFeature[] = [];
    const bounds  = new google.maps.LatLngBounds();

    for (const feat of rawFeats) {
      if (!feat.geometry) continue;
      const id     = generatePolygonId();
      const name   = feat.properties?.name || feat.properties?.NAME || feat.properties?.label || `Feature ${newFeats.length + 1}`;
      const fill   = feat.properties?.fill  || feat.properties?.color || getRandomColor();
      const stroke = feat.properties?.stroke || feat.properties?.["stroke-color"] || fill;
      const gtype: string = feat.geometry.type;
      const overlays: any[] = [];
      const opts = { fillColor: fill, strokeColor: stroke, fillOpacity: 0.35, strokeOpacity: 0.9, strokeWeight: 2, editable: true, draggable: true };

      if (gtype === "Polygon") {
        const paths = feat.geometry.coordinates.map((ring: number[][]) =>
          ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0])));
        paths[0]?.forEach((pt: any) => bounds.extend(pt));
        overlays.push(new google.maps.Polygon({ ...opts, paths, map: mapInstanceRef.current }));

      } else if (gtype === "MultiPolygon") {
        for (const poly of feat.geometry.coordinates) {
          const paths = poly.map((ring: number[][]) =>
            ring.map((c: number[]) => new google.maps.LatLng(c[1], c[0])));
          paths[0]?.forEach((pt: any) => bounds.extend(pt));
          overlays.push(new google.maps.Polygon({ ...opts, paths, map: mapInstanceRef.current }));
        }
      } else if (gtype === "Point") {
        const [lng, lat] = feat.geometry.coordinates;
        bounds.extend({ lat, lng });
        overlays.push(new google.maps.Marker({ position: { lat, lng }, draggable: true, title: name, map: mapInstanceRef.current }));

      } else if (gtype === "LineString") {
        const path = feat.geometry.coordinates.map((c: number[]) => new google.maps.LatLng(c[1], c[0]));
        path.forEach((pt: any) => bounds.extend(pt));
        overlays.push(new google.maps.Polyline({ path, strokeColor: stroke, strokeWeight: 2, strokeOpacity: 0.9, editable: true, draggable: true, map: mapInstanceRef.current }));

      } else if (gtype === "MultiLineString") {
        for (const seg of feat.geometry.coordinates) {
          const path = seg.map((c: number[]) => new google.maps.LatLng(c[1], c[0]));
          path.forEach((pt: any) => bounds.extend(pt));
          overlays.push(new google.maps.Polyline({ path, strokeColor: stroke, strokeWeight: 2, strokeOpacity: 0.9, editable: true, draggable: true, map: mapInstanceRef.current }));
        }
      }

      if (overlays.length > 0) {
        editPolyMapRef.current.set(id, overlays);
        newFeats.push({ id, name, fillColor: fill, strokeColor: stroke, geometryType: gtype });
      }
    }

    setEditFeatures(newFeats);
    if (newFeats.length > 0 && !bounds.isEmpty()) mapInstanceRef.current.fitBounds(bounds);
  };

  const handleGeoJSONImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { importGeoJSONToMap(JSON.parse(ev.target?.result as string)); }
      catch { alert("Invalid GeoJSON file."); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const selectEditFeature = (id: string) => {
    if (selectedEditId && selectedEditId !== id) {
      editPolyMapRef.current.get(selectedEditId)?.forEach((o: any) => {
        if (o.setOptions) o.setOptions({ strokeWeight: 2, zIndex: 1 });
      });
    }
    const next = selectedEditId === id ? null : id;
    if (next) {
      editPolyMapRef.current.get(next)?.forEach((o: any) => {
        if (o.setOptions) o.setOptions({ strokeWeight: 5, zIndex: 100 });
      });
    }
    setSelectedEditId(next);
  };

  const updateEditColor = (id: string, field: "fillColor" | "strokeColor", value: string) => {
    editPolyMapRef.current.get(id)?.forEach((o: any) => {
      if (o.setOptions) {
        if (field === "fillColor") o.setOptions({ fillColor: value });
        else                       o.setOptions({ strokeColor: value });
      }
    });
    setEditFeatures((prev) => prev.map((f) => f.id === id ? { ...f, [field]: value } : f));
  };

  const updateEditName = (id: string, name: string) =>
    setEditFeatures((prev) => prev.map((f) => f.id === id ? { ...f, name } : f));

  const deleteEditFeature = (id: string) => {
    editPolyMapRef.current.get(id)?.forEach((o: any) => o.setMap(null));
    editPolyMapRef.current.delete(id);
    setEditFeatures((prev) => prev.filter((f) => f.id !== id));
    if (selectedEditId === id) setSelectedEditId(null);
  };

  const exportEditGeoJSON = () => {
    if (editFeatures.length === 0) return alert("No features to export.");
    const features = editFeatures.map((f) => {
      const overlays = editPolyMapRef.current.get(f.id) || [];
      const props = { name: f.name, fill: f.fillColor, stroke: f.strokeColor };
      if (f.geometryType === "Point" && overlays[0]) {
        const pos = overlays[0].getPosition();
        return { type: "Feature", geometry: { type: "Point", coordinates: [pos.lng(), pos.lat()] }, properties: props };
      }
      if ((f.geometryType === "LineString" || f.geometryType === "MultiLineString") && overlays[0]) {
        const coords = overlays.map((o: any) => o.getPath().getArray().map((ll: any) => [ll.lng(), ll.lat()]));
        if (overlays.length === 1) return { type: "Feature", geometry: { type: "LineString", coordinates: coords[0] }, properties: props };
        return { type: "Feature", geometry: { type: "MultiLineString", coordinates: coords }, properties: props };
      }
      const closeRing = (ring: [number, number][]) => { ring.push(ring[0]); return ring; };
      const polyCoords = overlays.map((o: any) =>
        o.getPaths().getArray().map((ring: any) =>
          closeRing(ring.getArray().map((ll: any) => [ll.lng(), ll.lat()] as [number, number]))
        )
      );
      if (polyCoords.length === 1) return { type: "Feature", geometry: { type: "Polygon", coordinates: polyCoords[0] }, properties: props };
      return { type: "Feature", geometry: { type: "MultiPolygon", coordinates: polyCoords }, properties: props };
    }).filter(Boolean);
    downloadGeoJSON({ type: "FeatureCollection", features }, editExportName || "edited_geofence");
  };

  // ── Draw-mode handlers ───────────────────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setImageRotation(0); setOverlayImage(ev.target?.result as string); setLoadedFromSaved(null); };
    reader.readAsDataURL(file);
  };

  const handleSaveOverlay = () => {
    if (!overlayImage) return alert("No image loaded.");
    const name = overlayName.trim() || `Overlay ${Date.now()}`;
    const entry: SavedOverlay = {
      name, imageData: overlayImage, bounds: imageBounds,
      rotation: imageRotation, opacity: imageOpacity, savedAt: new Date().toISOString(),
    };
    try {
      saveOverlayToStorage(entry); setSavedOverlays(getSavedOverlays()); alert(`Saved "${name}"`);
    } catch {
      alert("Save failed – image may be too large for browser storage.");
    }
  };

  const handleUpdateOverlay = () => {
    if (!overlayImage || !loadedFromSaved) return;
    const entry: SavedOverlay = {
      name: loadedFromSaved, imageData: overlayImage, bounds: imageBounds,
      rotation: imageRotation, opacity: imageOpacity, savedAt: new Date().toISOString(),
    };
    try {
      saveOverlayToStorage(entry); setSavedOverlays(getSavedOverlays()); alert(`Updated "${loadedFromSaved}"`);
    } catch {
      alert("Save failed – image may be too large for browser storage.");
    }
  };

  const handleLoadOverlay = () => {
    const entry = savedOverlays.find((o) => o.name === selectedSaved); if (!entry) return;
    setImageOpacity(entry.opacity); setImageRotation(entry.rotation);
    setImageBounds(entry.bounds); setOverlayName(entry.name); setOverlayImage(entry.imageData);
    setLoadedFromSaved(entry.name);
  };

  const handleDeleteOverlay = () => {
    if (!selectedSaved) return;
    if (!confirm(`Delete "${selectedSaved}"?`)) return;
    deleteOverlayFromStorage(selectedSaved); setSavedOverlays(getSavedOverlays()); setSelectedSaved("");
  };

  const startTool = (tool: DrawTool) => {
    shapeLabelRef.current = shapeLabel;
    const next = activeTool === tool ? null : tool;
    activeToolRef.current = next;
    setActiveTool(next);
  };

  const removeShape = (id: string, type: "polygon" | "marker" | "circle" | "rectangle") => {
    const maps = { polygon: polygonMapRef, marker: markerMapRef, circle: circleMapRef, rectangle: rectMapRef };
    maps[type].current.get(id)?.setMap(null); maps[type].current.delete(id);
    if (type === "polygon")   setDrawnPolygons((p) => p.filter((x) => x.id !== id));
    if (type === "marker")    setDrawnMarkers((m)  => m.filter((x) => x.id !== id));
    if (type === "circle")    setDrawnCircles((c)  => c.filter((x) => x.id !== id));
    if (type === "rectangle") setDrawnRects((r)    => r.filter((x) => x.id !== id));
  };

  const handleExport = () => {
    const tot = drawnPolygons.length + drawnMarkers.length + drawnCircles.length + drawnRects.length;
    if (tot === 0) return alert("Draw some shapes first!");
    downloadGeoJSON(allShapesToGeoJSON(drawnPolygons, drawnMarkers, drawnCircles, drawnRects), exportFileName);
  };

  const handleClearAll = () => {
    if (!confirm("Clear all shapes?")) return;
    polygonMapRef.current.forEach((o) => o.setMap(null)); polygonMapRef.current.clear();
    markerMapRef.current.forEach((o)  => o.setMap(null)); markerMapRef.current.clear();
    circleMapRef.current.forEach((o)  => o.setMap(null)); circleMapRef.current.clear();
    rectMapRef.current.forEach((o)    => o.setMap(null)); rectMapRef.current.clear();
    setDrawnPolygons([]); setDrawnMarkers([]); setDrawnCircles([]); setDrawnRects([]);
  };

  const totalShapes = drawnPolygons.length + drawnMarkers.length + drawnCircles.length + drawnRects.length;
  const selEditFeat = editFeatures.find((f) => f.id === selectedEditId) ?? null;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="map-tracer-wrapper">
      <div className="tracer-controls">

        <div className="tracer-top-tabs">
          <button className={`tracer-tab-btn${tracerTab === "draw" ? " active" : ""}`} onClick={() => setTracerTab("draw")}>✏️ Draw</button>
          <button className={`tracer-tab-btn${tracerTab === "edit" ? " active" : ""}`} onClick={() => setTracerTab("edit")}>🗂 Edit GeoJSON</button>
        </div>

        {/* ══════════ DRAW TAB ══════════ */}
        {tracerTab === "draw" && (<>

          <div className="control-section">
            <h4>📂 Saved Overlays</h4>
            {savedOverlays.length === 0
              ? <p className="empty-hint">No saved overlays yet.</p>
              : (<>
                <select className="name-input" value={selectedSaved} onChange={(e) => setSelectedSaved(e.target.value)}>
                  <option value="">-- select overlay --</option>
                  {savedOverlays.map((o) => <option key={o.name} value={o.name}>{o.name}</option>)}
                </select>
                <div className="button-group" style={{ marginTop: 6 }}>
                  <button className="btn btn-primary" onClick={handleLoadOverlay}   disabled={!selectedSaved}>📥 Load</button>
                  <button className="btn btn-danger"  onClick={handleDeleteOverlay} disabled={!selectedSaved}>🗑 Delete</button>
                </div>
              </>)
            }
          </div>

          <div className="control-section">
            <h4>📸 Overlay Image</h4>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
            {overlayImage && (<>
              <div className="opacity-control" style={{ marginTop: 8 }}>
                <label>Opacity: <strong>{Math.round(imageOpacity * 100)}%</strong></label>
                <input type="range" min="0" max="1" step="0.05" value={imageOpacity}
                  onChange={(e) => setImageOpacity(parseFloat(e.target.value))} />
              </div>
              <div className="opacity-control" style={{ marginTop: 6 }}>
                <label>Rotation: <strong>{imageRotation}°</strong></label>
                <input type="range" min="0" max="359" step="1" value={imageRotation}
                  onChange={(e) => setImageRotation(parseInt(e.target.value))} />
                <div className="button-group" style={{ marginTop: 4 }}>
                  <button className="btn btn-primary" onClick={() => setImageRotation((r) => (r - 90 + 360) % 360)}>↺ -90°</button>
                  <button className="btn btn-primary" onClick={() => setImageRotation(0)}>Reset</button>
                  <button className="btn btn-primary" onClick={() => setImageRotation((r) => (r + 90) % 360)}>↻ +90°</button>
                </div>
              </div>
              <div className="opacity-control" style={{ marginTop: 6 }}>
                <label>Lock Image</label>
                <button className={`btn ${imageLocked ? "btn-danger" : "btn-warning"}`} style={{ width: "100%" }} onClick={() => setImageLocked(!imageLocked)}>
                  {imageLocked ? "🔒 Locked - Click to Unlock" : "🔓 Unlocked - Click to Lock"}
                </button>
              </div>
              <p className="hint" style={{ marginTop: 8 }}>Bounds (or drag handles on map):</p>
              <div className="bounds-grid">
                {(["north", "south", "east", "west"] as const).map((k) => (
                  <div key={k} className="bound-field">
                    <label>{k.charAt(0).toUpperCase() + k.slice(1)}</label>
                    <input type="number" value={imageBounds[k]} step="0.1"
                      onChange={(e) => setImageBounds((b) => ({ ...b, [k]: +e.target.value }))} />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                {loadedFromSaved && (
                  <div className="update-overlay-bar">
                    <span className="update-overlay-label">Loaded: <strong>{loadedFromSaved}</strong></span>
                    <button className="btn btn-warning" style={{ flexShrink: 0 }} onClick={handleUpdateOverlay}>
                      💾 Update Overlay
                    </button>
                  </div>
                )}
                <input className="name-input" type="text" value={overlayName}
                  onChange={(e) => setOverlayName(e.target.value)} placeholder="Save as new name…" />
                <button className="btn btn-success" style={{ width: "100%", marginTop: 4 }} onClick={handleSaveOverlay}>
                  💾 Save as New Overlay
                </button>
              </div>
              <button className="btn btn-danger" style={{ width: "100%", marginTop: 6 }}
                onClick={() => { setOverlayImage(null); setImageRotation(0); setLoadedFromSaved(null); }}>
                Remove Image
              </button>
            </>)}
          </div>

          <div className="control-section">
            <h4>🖍️ Draw Shapes</h4>
            <input className="name-input" type="text" value={shapeLabel}
              onChange={(e) => setShapeLabel(e.target.value)} placeholder="Shape name / label" />
            <div className="tool-grid">
              <button className={`btn tool-btn${activeTool === "polygon"   ? " active" : ""}`} onClick={() => startTool("polygon")}>⬡ Polygon</button>
              <button className={`btn tool-btn${activeTool === "marker"    ? " active" : ""}`} onClick={() => startTool("marker")}>📍 Marker</button>
              <button className={`btn tool-btn${activeTool === "circle"    ? " active" : ""}`} onClick={() => startTool("circle")}>⭕ Circle</button>
              <button className={`btn tool-btn${activeTool === "rectangle" ? " active" : ""}`} onClick={() => startTool("rectangle")}>▭ Rectangle</button>
            </div>
            {activeTool && (
              <p className="hint drawing-hint">
                {activeTool === "polygon"   && "Click to add points. Double-click to finish."}
                {activeTool === "marker"    && "Click on the map to place marker."}
                {activeTool === "circle"    && "Click once to set center, click again to set radius."}
                {activeTool === "rectangle" && "Click once to set first corner, click again to set opposite corner."}
              </p>
            )}
          </div>

          <div className="control-section">
            <h4>Shapes ({totalShapes})</h4>
            <div className="polygon-list">
              {totalShapes === 0 && <p className="empty-hint">No shapes yet.</p>}
              {drawnPolygons.map((p) => <ShapeRow key={p.id} color={p.color} name={p.name} icon="⬡" onDelete={() => removeShape(p.id, "polygon")} />)}
              {drawnMarkers.map((m)  => <ShapeRow key={m.id} color={m.color} name={m.name} icon="📍" onDelete={() => removeShape(m.id, "marker")} />)}
              {drawnCircles.map((c)  => <ShapeRow key={c.id} color={c.color} name={c.name} icon="⭕" onDelete={() => removeShape(c.id, "circle")} />)}
              {drawnRects.map((r)    => <ShapeRow key={r.id} color={r.color} name={r.name} icon="▭" onDelete={() => removeShape(r.id, "rectangle")} />)}
            </div>
          </div>

          <div className="control-section">
            <h4>💾 Export GeoJSON</h4>
            <input className="name-input" type="text" value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)} placeholder="File name" />
            <div className="button-group">
              <button className="btn btn-success" onClick={handleExport}   disabled={totalShapes === 0}>💾 Export</button>
              <button className="btn btn-danger"  onClick={handleClearAll} disabled={totalShapes === 0}>Clear All</button>
            </div>
          </div>
        </>)}

        {/* ══════════ EDIT GEOJSON TAB ══════════ */}
        {tracerTab === "edit" && (<>

          <div className="control-section" style={{ marginTop: 8 }}>
            <h4>📂 Import GeoJSON File</h4>
            <p className="hint">Browse a .geojson file. All features are plotted as editable paths. Select a feature to rename, recolor, or delete it. Drag blue node dots to reshape.</p>
            <input type="file" accept=".geojson,.json" onChange={handleGeoJSONImport} />
            {editFeatures.length > 0 && (
              <p className="hint" style={{ marginTop: 6, color: "#28a745" }}>
                ✅ {editFeatures.length} feature(s) loaded.
              </p>
            )}
          </div>

          {editFeatures.length > 0 && (<>

            <div className="control-section">
              <h4>Features ({editFeatures.length})</h4>
              <p className="hint">Click to select • Double-click name to rename • Color swatches = fill / border</p>
              <div className="polygon-list" style={{ maxHeight: 200 }}>
                {editFeatures.map((f) => (
                  <div key={f.id}
                    className={`polygon-item edit-feat-row${selectedEditId === f.id ? " active" : ""}`}
                    onClick={() => selectEditFeature(f.id)}>
                    {/* Fill color swatch */}
                    <input type="color" className="color-swatch-btn" value={f.fillColor} title="Fill color"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateEditColor(f.id, "fillColor", e.target.value); }} />
                    {/* Name – inline editable on double-click */}
                    {editingNameId === f.id ? (
                      <input className="inline-name-input" type="text" value={f.name} autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateEditName(f.id, e.target.value)}
                        onBlur={() => setEditingNameId(null)}
                        onKeyDown={(e) => { if (e.key === "Enter") setEditingNameId(null); }} />
                    ) : (
                      <span className="polygon-name"
                        title="Double-click to rename"
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingNameId(f.id); }}>
                        {f.geometryType === "Point" ? "📍" : f.geometryType.includes("Line") ? "〰" : "⬡"} {f.name}
                      </span>
                    )}
                    {/* Stroke color swatch */}
                    <input type="color" className="color-swatch-btn stroke-swatch" value={f.strokeColor} title="Border color"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); updateEditColor(f.id, "strokeColor", e.target.value); }} />
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteEditFeature(f.id); }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {selEditFeat && (
              <div className="control-section edit-feature-panel">
                <h4>✏️ Editing: {selEditFeat.name}</h4>
                <label className="field-label">Name</label>
                <input className="name-input" type="text" value={selEditFeat.name}
                  onChange={(e) => updateEditName(selEditFeat.id, e.target.value)} />
                <div className="color-row" style={{ marginTop: 10 }}>
                  <div className="color-field">
                    <label className="field-label">Fill Color</label>
                    <div className="color-input-group">
                      <input type="color" className="color-picker" value={selEditFeat.fillColor}
                        onChange={(e) => updateEditColor(selEditFeat.id, "fillColor", e.target.value)} />
                      <span className="color-hex">{selEditFeat.fillColor}</span>
                    </div>
                  </div>
                  <div className="color-field">
                    <label className="field-label">Border Color</label>
                    <div className="color-input-group">
                      <input type="color" className="color-picker" value={selEditFeat.strokeColor}
                        onChange={(e) => updateEditColor(selEditFeat.id, "strokeColor", e.target.value)} />
                      <span className="color-hex">{selEditFeat.strokeColor}</span>
                    </div>
                  </div>
                </div>
                <p className="hint" style={{ marginTop: 8 }}>💡 On the map: drag blue dots to move nodes. Click an edge to add a new node.</p>
                <button className="btn btn-danger" style={{ width: "100%", marginTop: 10 }}
                  onClick={() => deleteEditFeature(selEditFeat.id)}>
                  🗑 Delete this feature
                </button>
              </div>
            )}

            <div className="control-section">
              <h4>💾 Export Edited GeoJSON</h4>
              <input className="name-input" type="text" value={editExportName}
                onChange={(e) => setEditExportName(e.target.value)} placeholder="File name" />
              <button className="btn btn-success" style={{ width: "100%", marginTop: 6 }} onClick={exportEditGeoJSON}>
                💾 Export Edited GeoJSON
              </button>
            </div>

          </>)}
        </>)}

      </div>

      <div className="tracer-map-wrapper">
        <div ref={mapRef} className="tracer-map" />
      </div>
    </div>
  );
};

const ShapeRow: React.FC<{ color: string; name: string; icon: string; onDelete: () => void }> =
  ({ color, name, icon, onDelete }) => (
    <div className="polygon-item">
      <span className="polygon-color" style={{ backgroundColor: color }} />
      <span className="polygon-name">{icon} {name}</span>
      <button className="delete-btn" onClick={onDelete}>✕</button>
    </div>
  );