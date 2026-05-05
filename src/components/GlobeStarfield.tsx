import { useEffect, useRef, useState } from "react";

/** Photographic night sky: sharp points only — no blur / shadowBlur / halo passes. */

type Star = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  /** brighter → slightly larger radius */
  mag: number;
  /** pale blue tint vs neutral white */
  blue: boolean;
  /** many extra sub-pixel-ish specks → dense Milky-way–like field */
  pin: boolean;
};

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Stratified jitter for core stars + a large uniform “pin” layer (tiny dim dots).
 * All procedural — no textures, no shadowBlur / flares.
 */
function buildStars(count: number, lw: number, lh: number, seed = 421337): Star[] {
  const rnd = mulberry32(seed);
  const stars: Star[] = [];
  const n = Math.max(32, Math.floor(count));
  const nPin = Math.min(n - 8, Math.floor(n * 0.55));
  const nCore = n - nPin;

  const cols = Math.ceil(Math.sqrt((nCore * lw) / Math.max(lh, 1)));
  const rows = Math.ceil((nCore / Math.max(cols, 1)) * 1.1);
  const cw = lw / cols;
  const rh = lh / rows;
  let placed = 0;
  for (let i = 0; i < cols && placed < nCore; i++) {
    for (let j = 0; j < rows && placed < nCore; j++) {
      const roll = rnd();
      if (roll > 0.72 && rnd() > 0.35) continue;
      const jitterX = (rnd() - 0.5) * 0.94 * cw;
      const jitterY = (rnd() - 0.5) * 0.94 * rh;
      const x = (i + 0.5) * cw + jitterX;
      const y = (j + 0.5) * rh + jitterY;
      if (x < 0 || x > lw || y < 0 || y > lh) continue;

      const r2 = rnd();
      let mag: number;
      if (r2 < 0.06) mag = 0.85 + rnd() * 0.15;
      else if (r2 < 0.38) mag = 0.5 + rnd() * 0.28;
      else mag = 0.22 + rnd() * 0.32;

      stars.push({
        x,
        y,
        vx: (rnd() - 0.5) * 11,
        vy: (rnd() - 0.5) * 7,
        phase: rnd() * Math.PI * 2,
        mag,
        blue: rnd() > 0.74,
        pin: false,
      });
      placed++;
    }
  }

  while (stars.length < nCore) {
    stars.push({
      x: rnd() * lw,
      y: rnd() * lh,
      vx: (rnd() - 0.5) * 11,
      vy: (rnd() - 0.5) * 7,
      phase: rnd() * Math.PI * 2,
      mag: 0.18 + rnd() * 0.35,
      blue: rnd() > 0.78,
      pin: false,
    });
  }

  for (let p = 0; p < nPin; p++) {
    stars.push({
      x: rnd() * lw,
      y: rnd() * lh,
      vx: (rnd() - 0.5) * 5.5,
      vy: (rnd() - 0.5) * 4,
      phase: rnd() * Math.PI * 2,
      mag: 0.06 + rnd() * 0.22,
      blue: rnd() > 0.48,
      pin: true,
    });
  }

  while (stars.length > n) stars.pop();
  return stars;
}

function cappedDPR(ceiling: number): number {
  if (typeof window === "undefined") return 1;
  return Math.min(window.devicePixelRatio || 1, ceiling);
}

type GlobeStarfieldQuality = {
  starsCap: number;
  pixelsDivisor: number;
  dprCeil: number;
  frameMinMs: number;
  staticOnly: boolean;
  skipOverlay: boolean;
};

function inferGlobeStarfieldQuality(logicalW: number, logicalH: number): GlobeStarfieldQuality {
  if (typeof window === "undefined") {
    return {
      starsCap: 160,
      pixelsDivisor: 9000,
      dprCeil: 2,
      frameMinMs: 0,
      staticOnly: false,
      skipOverlay: false,
    };
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
    deviceMemory?: number;
  };

  /* saveData: still draw sky + stars — no bitmap download; lite static keeps cost tiny */
  if (nav.connection?.saveData === true) {
    return {
      starsCap: 52,
      pixelsDivisor: 14_500,
      dprCeil: 1,
      frameMinMs: 9999,
      staticOnly: true,
      skipOverlay: false,
    };
  }

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const memory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const cores = navigator.hardwareConcurrency ?? 4;

  const area = Math.max(1, logicalW * logicalH);
  const vw = logicalW || window.innerWidth;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  const lowMemoryOrCore =
    cores <= 2 ||
    memory === 2 ||
    (memory !== null && memory <= 4 && cores <= 4);

  const smallSurface = vw < 420 || area < 320_000;

  if (reducedMotion) {
    return {
      starsCap: Math.min(72, Math.max(40, Math.floor(area / 16_500))),
      pixelsDivisor: 11_500,
      dprCeil: 1.25,
      frameMinMs: 9999,
      staticOnly: true,
      skipOverlay: false,
    };
  }

  if (nav.connection?.effectiveType === "slow-2g" || nav.connection?.effectiveType === "2g") {
    return {
      starsCap: 52,
      pixelsDivisor: 14_500,
      dprCeil: 1,
      frameMinMs: 48,
      staticOnly: false,
      skipOverlay: false,
    };
  }

  if (lowMemoryOrCore || (smallSurface && coarsePointer)) {
    return {
      starsCap: Math.min(92, Math.max(48, Math.floor(area / 11_800))),
      pixelsDivisor: 11_800,
      dprCeil: 1,
      frameMinMs: area > 420_000 ? 28 : 38,
      staticOnly: false,
      skipOverlay: false,
    };
  }

  return {
    starsCap: 240,
    pixelsDivisor: 5800,
    dprCeil: 2,
    frameMinMs: 0,
    staticOnly: false,
    skipOverlay: false,
  };
}

function paintStars(
  ctx: CanvasRenderingContext2D,
  lw: number,
  lh: number,
  dpr: number,
  stars: Star[],
  animateMovement: boolean,
  dt: number | undefined,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = lw * 0.5;
  const cy = lh * 0.5;
  const rmax = Math.hypot(lw, lh) * 0.86;
  const sky = ctx.createRadialGradient(cx, cy, 0, cx, cy, rmax);
  /* Navy night sky — stays blue to the edges (no flat black) */
  sky.addColorStop(0, "#1e3a5f");
  sky.addColorStop(0.28, "#142a4a");
  sky.addColorStop(0.52, "#0c1e38");
  sky.addColorStop(0.78, "#081428");
  sky.addColorStop(1, "#050c1a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, lw, lh);

  const step = animateMovement && dt !== undefined ? dt : 0;

  for (const s of stars) {
    if (step > 0) {
      s.x += s.vx * step;
      s.y += s.vy * step;
      if (s.x < -8) s.x = lw + 8;
      if (s.x > lw + 8) s.x = -8;
      if (s.y < -8) s.y = lh + 8;
      if (s.y > lh + 8) s.y = -8;
      /* slow, subtle shimmer — not a flashy twinkle */
      const tw = s.pin ? 0.12 + s.mag * 0.35 : 0.22 + s.mag * 0.55;
      s.phase += step * tw;
    }

    const shim = Math.sin(s.phase) * (s.pin ? 0.04 : 0.055);
    let a = (s.pin ? 0.42 : 0.48) + shim;
    a *= s.pin ? 0.55 + s.mag * 2.05 : 0.58 + s.mag * 0.72;
    const cap = s.pin ? 0.78 : s.mag > 0.75 ? 1 : 0.95;
    a = Math.min(Math.max(a, s.pin ? 0.14 : 0.22), cap);

    if (s.blue) {
      ctx.fillStyle = `rgba(224, 247, 255, ${a})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
    }

    /* crisp points only — no shadowBlur */
    /* Physical pixels: enlarge slightly so stars stay visible on high-DPR screens */
    let rad: number;
    if (s.pin) {
      rad = 0.42 + s.mag * 0.72;
    } else if (s.mag < 0.38) {
      rad = 0.52 + s.mag * 0.62;
    } else if (s.mag < 0.66) {
      rad = 0.72 + s.mag * 0.72;
    } else {
      rad = 0.92 + s.mag * 0.5;
    }
    rad = Math.min(rad, s.pin ? 0.92 : 1.65);
    if (dpr >= 1.5) rad *= 1.12;

    ctx.beginPath();
    ctx.arc(s.x, s.y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function GlobeStarfield({ active }: { active: boolean }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const sizeRef = useRef({ w: 1, h: 1 });
  const dprRef = useRef(1);
  const rafRef = useRef(0);
  const lastTRef = useRef(0);
  const lastPaintRef = useRef(0);

  const [skipOverlay, setSkipOverlay] = useState(() => {
    if (typeof window === "undefined") return false;
    return inferGlobeStarfieldQuality(window.innerWidth, window.innerHeight).skipOverlay;
  });

  useEffect(() => {
    if (!active) return;
    const shell = shellRef.current;
    const canvas = canvasRef.current;
    if (!shell || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const qualityHolder: { q: GlobeStarfieldQuality } = {
      q: inferGlobeStarfieldQuality(shell.clientWidth, shell.clientHeight),
    };

    const applyResize = () => {
      const w = Math.max(1, shell.clientWidth);
      const h = Math.max(1, shell.clientHeight);

      qualityHolder.q = inferGlobeStarfieldQuality(w, h);
      const q = qualityHolder.q;
      setSkipOverlay(q.skipOverlay);

      cancelAnimationFrame(rafRef.current);

      if (q.skipOverlay) {
        canvas.width = 1;
        canvas.height = 1;
        canvas.style.opacity = "0";
        starsRef.current = [];
        return;
      }

      canvas.style.opacity = "";

      const dpr = cappedDPR(q.dprCeil);
      dprRef.current = dpr;
      sizeRef.current = { w, h };
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const rawCount = Math.min(
        q.starsCap,
        Math.floor((w * h) / Math.max(3800, q.pixelsDivisor)),
      );
      const count = Math.max(36, rawCount);

      starsRef.current = buildStars(count, w, h);
      lastPaintRef.current = 0;

      paintStars(ctx, w, h, dpr, starsRef.current, false, undefined);

      if (!q.staticOnly) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    const tick = (t: number) => {
      const q = qualityHolder.q;

      if (q.skipOverlay || q.staticOnly) return;

      if (typeof document !== "undefined" && document.hidden) {
        lastTRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const { w: lw, h: lh } = sizeRef.current;
      if (!starsRef.current.length) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (q.frameMinMs > 0) {
        if (lastPaintRef.current > 0 && t - lastPaintRef.current < q.frameMinMs) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        lastPaintRef.current = t;
      }

      const last = lastTRef.current || t;
      lastTRef.current = t;
      const dt = Math.min((t - last) / 1000, 0.12);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      paintStars(ctx, lw, lh, dprRef.current, starsRef.current, true, dt);

      rafRef.current = requestAnimationFrame(tick);
    };

    applyResize();
    const ro = new ResizeObserver(applyResize);
    ro.observe(shell);

    type ConnWithEv = EventTarget & {
      addEventListener?: (type: string, listener: () => void) => void;
      removeEventListener?: (type: string, listener: () => void) => void;
    };
    const qc = (navigator as Navigator & { connection?: ConnWithEv }).connection;
    const connChange = () => applyResize();
    if (qc?.addEventListener) {
      try {
        qc.addEventListener("change", connChange);
      } catch {
        /* ignore */
      }
    }

    const onVis = () => {
      lastTRef.current = 0;
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (qc?.removeEventListener) {
        try {
          qc.removeEventListener("change", connChange);
        } catch {
          /* ignore */
        }
      }
      cancelAnimationFrame(rafRef.current);
      lastTRef.current = 0;
      lastPaintRef.current = 0;
    };
  }, [active]);

  if (!active || skipOverlay) return null;

  return (
    <div ref={shellRef} className="globe-star-shell" aria-hidden="true">
      <canvas ref={canvasRef} className="globe-star-shell-canvas" />
    </div>
  );
}
