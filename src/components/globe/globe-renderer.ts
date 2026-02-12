/**
 * Globe renderer — 9-layer back-to-front pipeline on a 2D canvas.
 *
 * Render order per frame:
 *  1. clearRect
 *  2. Outer atmosphere (3 radial gradient layers)
 *  3. Sphere fill (off-center radial gradient → hemisphere shading)
 *  4b. Coastline pinpoint lights (continent outlines)
 *  5. Location dots (3 layers + staggered pulse)
 *  7. Sphere edge stroke
 *  8. Rim light crescent (clipped annular ring)
 *  9. Specular highlight (bright spot upper-left)
 */

import {
  latLngToXYZ,
  tiltAndRotate,
  project,
} from './globe-math';
import { LOCATIONS } from './globe-locations';
import { COASTLINES } from './globe-coastlines';

// ─── Colour palettes ────────────────────────────────────────────

// Dark mode: cyan/teal glowing dots on dark sphere
const DARK = {
  accent:    { r: 56, g: 189, b: 248 },  // sky-400
  dot:       { r: 45, g: 212, b: 191 },  // teal-400
  coreFill:  'white',
  atmosphere: 1.0,
  glow:       1.0,
  sphereStops: [
    { stop: 0,   color: 'rgba(30,42,56,0.95)' },
    { stop: 0.6, color: 'rgba(15,23,42,0.95)' },
    { stop: 1,   color: 'rgba(5,10,20,0.98)' },
  ],
  edgeAlpha:    0.2,
  rimAlpha:     0.35,
  specAlpha:    0.18,
  coastHalo:    0.25,
  coastCore:    0.7,
  dotHalo:      0.3,
  dotGlow:      0.6,
  dotCore:      0.9,
};

// Light mode: navy/indigo solid dots on blue-tinted sphere
const LIGHT = {
  accent:    { r: 30, g: 64, b: 175 },   // blue-800
  dot:       { r: 29, g: 78, b: 216 },   // blue-700
  coreFill:  'rgba(15,23,42,1)',          // navy cores
  atmosphere: 0.5,
  glow:       0.9,
  sphereStops: [
    { stop: 0,   color: 'rgba(219,234,254,0.95)' },  // blue-100
    { stop: 0.6, color: 'rgba(191,219,254,0.92)' },  // blue-200
    { stop: 1,   color: 'rgba(147,197,253,0.95)' },  // blue-300
  ],
  edgeAlpha:    0.35,
  rimAlpha:     0.25,
  specAlpha:    0.3,
  coastHalo:    0.35,
  coastCore:    0.85,
  dotHalo:      0.4,
  dotGlow:      0.7,
  dotCore:      1.0,
};

type Palette = typeof DARK;

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// ─── Pre-compute location XYZ ──────────────────────────────────
const LOC_XYZ: [number, number, number][] = LOCATIONS.map((l) =>
  latLngToXYZ(l.lat, l.lng),
);

// Pre-compute coastline XYZ from Natural Earth data
const COAST_XYZ: [number, number, number][][] = COASTLINES.map((poly) =>
  poly.map(([lat, lng]) => latLngToXYZ(lat, lng)),
);

// ─── Public API ────────────────────────────────────────────────

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  angle: number;
  time: number;
  isDark: boolean;
}

export function renderGlobe(opts: RenderOptions): void {
  const { ctx, width, height, dpr, angle, time, isDark } = opts;

  const w = width * dpr;
  const h = height * dpr;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  const p = isDark ? DARK : LIGHT;

  // 1. Clear
  ctx.clearRect(0, 0, w, h);

  // 2. Outer atmosphere
  drawAtmosphere(ctx, cx, cy, r, p);

  // 3. Sphere fill with hemisphere shading
  drawSphereFill(ctx, cx, cy, r, p);

  // 4. Coastline pinpoint lights
  drawCoastlines(ctx, cx, cy, r, dpr, angle, p);

  // 5. Location dots
  drawDots(ctx, cx, cy, r, dpr, angle, time, p);

  // 7. Sphere edge stroke
  drawEdge(ctx, cx, cy, r, dpr, p);

  // 8. Rim light crescent
  drawRimLight(ctx, cx, cy, r, p);

  // 9. Specular highlight
  drawSpecular(ctx, cx, cy, r, p);
}

// ─── Layer implementations ─────────────────────────────────────

function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: Palette,
): void {
  const mA = p.atmosphere;
  const layers = [
    { scale: 1.6, alpha: 0.03 * mA },
    { scale: 1.35, alpha: 0.06 * mA },
    { scale: 1.18, alpha: 0.1 * mA },
  ];
  for (const { scale, alpha } of layers) {
    const outerR = r * scale;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, outerR);
    grad.addColorStop(0, rgba(p.accent, alpha));
    grad.addColorStop(1, rgba(p.accent, 0));
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

function drawSphereFill(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: Palette,
): void {
  const lightX = cx - r * 0.35;
  const lightY = cy - r * 0.35;
  const grad = ctx.createRadialGradient(lightX, lightY, 0, cx, cy, r);

  for (const s of p.sphereStops) {
    grad.addColorStop(s.stop, s.color);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

/** Number of depth bands for batching coastline points. */
const COAST_BANDS = 5;
const TWO_PI = Math.PI * 2;

function drawCoastlines(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  dpr: number,
  angle: number,
  p: Palette,
): void {
  const coreR = 0.7 * dpr;
  const haloR = 2.0 * dpr;
  const mG = p.glow;

  // Bin visible points by depth band so we can batch fills
  const bins: { sx: number; sy: number }[][] = Array.from(
    { length: COAST_BANDS },
    () => [],
  );

  for (const polygon of COAST_XYZ) {
    for (const pt of polygon) {
      const [rx, ry, rz] = tiltAndRotate(pt[0], pt[1], pt[2], angle);
      if (rz < 0.02) continue;
      const { sx, sy } = project(rx, ry, rz, cx, cy, r);
      const band = Math.min(
        COAST_BANDS - 1,
        (rz * COAST_BANDS) | 0,
      );
      bins[band].push({ sx, sy });
    }
  }

  // Pass 1: glow halos — one batched path per depth band
  ctx.save();
  ctx.fillStyle = rgba(p.accent, 1);
  for (let b = 0; b < COAST_BANDS; b++) {
    const pts = bins[b];
    if (pts.length === 0) continue;
    const bandDepth = (b + 0.5) / COAST_BANDS;
    ctx.globalAlpha = p.coastHalo * bandDepth * mG;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      ctx.moveTo(pts[i].sx + haloR, pts[i].sy);
      ctx.arc(pts[i].sx, pts[i].sy, haloR, 0, TWO_PI);
    }
    ctx.fill();
  }

  // Pass 2: bright pinpoint cores — one batched path per depth band
  ctx.fillStyle = p.coreFill;
  for (let b = 0; b < COAST_BANDS; b++) {
    const pts = bins[b];
    if (pts.length === 0) continue;
    const bandDepth = (b + 0.5) / COAST_BANDS;
    ctx.globalAlpha = p.coastCore * bandDepth * mG;
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      ctx.moveTo(pts[i].sx + coreR, pts[i].sy);
      ctx.arc(pts[i].sx, pts[i].sy, coreR, 0, TWO_PI);
    }
    ctx.fill();
  }
  ctx.restore();
}

function drawDots(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  dpr: number,
  angle: number,
  time: number,
  p: Palette,
): void {
  const mG = p.glow;

  LOC_XYZ.forEach((xyz, i) => {
    const [rx, ry, rz] = tiltAndRotate(xyz[0], xyz[1], xyz[2], angle);
    if (rz < 0.05) return;

    const { sx, sy } = project(rx, ry, rz, cx, cy, r);
    const depth = rz;

    // Staggered pulse per dot
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + i * 1.1);
    const dotAlpha = depth * mG * pulse;

    // Layer 1: wide soft halo
    const haloR = (6 + depth * 4) * dpr;
    const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, haloR);
    haloGrad.addColorStop(0, rgba(p.accent, p.dotHalo * dotAlpha));
    haloGrad.addColorStop(1, rgba(p.accent, 0));
    ctx.beginPath();
    ctx.arc(sx, sy, haloR, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Layer 2: medium glow
    const glowR = (3 + depth * 2) * dpr;
    const glowGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
    glowGrad.addColorStop(0, rgba(p.dot, p.dotGlow * dotAlpha));
    glowGrad.addColorStop(1, rgba(p.dot, 0));
    ctx.beginPath();
    ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Layer 3: bright core
    const coreR = (1 + depth * 1) * dpr;
    ctx.beginPath();
    ctx.arc(sx, sy, coreR, 0, Math.PI * 2);
    ctx.fillStyle = p.coreFill;
    ctx.globalAlpha = p.dotCore * dotAlpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  dpr: number,
  p: Palette,
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = rgba(p.accent, p.edgeAlpha * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
}

function drawRimLight(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: Palette,
): void {
  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const offsetX = cx - r * 0.55;
  const offsetY = cy - r * 0.55;
  const grad = ctx.createRadialGradient(
    offsetX, offsetY, r * 0.85,
    offsetX, offsetY, r * 1.15,
  );
  grad.addColorStop(0, rgba(p.accent, 0));
  grad.addColorStop(0.5, rgba(p.accent, p.rimAlpha * p.atmosphere));
  grad.addColorStop(1, rgba(p.accent, 0));

  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.arc(cx, cy, Math.max(0, r - 6), 0, Math.PI * 2, true);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

function drawSpecular(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  p: Palette,
): void {
  const sx = cx - r * 0.3;
  const sy = cy - r * 0.3;
  const specR = r * 0.25;
  const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, specR);
  grad.addColorStop(0, `rgba(255,255,255,${p.specAlpha * p.atmosphere})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(sx, sy, specR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}
