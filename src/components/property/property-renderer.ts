/**
 * Property renderer — animated cityscape inside a circular frame on a 2D canvas.
 *
 * Render order per frame:
 *  1. clearRect
 *  2. Outer atmosphere (emerald glow)
 *  3. Sphere fill (background gradient)
 *  4. Clipped cityscape: ground, buildings, windows, location pin
 *  5. Scan line (slow sweep)
 *  6. Sphere edge stroke
 *  7. Rim light crescent
 *  8. Specular highlight
 */

// ─── Colour palettes ────────────────────────────────────────────

const DARK = {
  accent:     { r: 16, g: 185, b: 129 },  // emerald-500
  building:   'rgba(16,185,129,0.15)',
  buildingStroke: 'rgba(16,185,129,0.35)',
  windowOn:   'rgba(16,185,129,0.75)',
  windowOff:  'rgba(16,185,129,0.08)',
  ground:     'rgba(16,185,129,0.2)',
  pinBody:    'rgba(16,185,129,0.9)',
  pinGlow:    'rgba(16,185,129,0.3)',
  scanLine:   'rgba(16,185,129,0.06)',
  coreFill:   'white',
  atmosphere: 1.0,
  glow:       1.0,
  sphereStops: [
    { stop: 0,   color: 'rgba(10,30,25,0.95)' },
    { stop: 0.6, color: 'rgba(5,20,15,0.95)' },
    { stop: 1,   color: 'rgba(2,10,8,0.98)' },
  ],
  edgeAlpha:  0.25,
  rimAlpha:   0.35,
  specAlpha:  0.18,
};

const LIGHT = {
  accent:     { r: 5, g: 150, b: 105 },   // emerald-600
  building:   'rgba(5,150,105,0.1)',
  buildingStroke: 'rgba(5,150,105,0.25)',
  windowOn:   'rgba(5,150,105,0.6)',
  windowOff:  'rgba(5,150,105,0.05)',
  ground:     'rgba(5,150,105,0.12)',
  pinBody:    'rgba(5,150,105,0.8)',
  pinGlow:    'rgba(5,150,105,0.2)',
  scanLine:   'rgba(5,150,105,0.04)',
  coreFill:   'rgba(5,50,30,1)',
  atmosphere: 0.5,
  glow:       0.9,
  sphereStops: [
    { stop: 0,   color: 'rgba(236,253,245,0.95)' },  // emerald-50
    { stop: 0.6, color: 'rgba(209,250,229,0.92)' },  // emerald-100
    { stop: 1,   color: 'rgba(167,243,208,0.95)' },  // emerald-200
  ],
  edgeAlpha:  0.3,
  rimAlpha:   0.25,
  specAlpha:  0.3,
};

type Palette = typeof DARK;

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// ─── Building layout ────────────────────────────────────────────

interface Building {
  xFrac: number;
  wFrac: number;
  hFrac: number;
  floors: number;
  cols: number;
}

const BUILDINGS: Building[] = [
  { xFrac: 0.15, wFrac: 0.14, hFrac: 0.38, floors: 4, cols: 2 },
  { xFrac: 0.32, wFrac: 0.15, hFrac: 0.55, floors: 7, cols: 2 },
  { xFrac: 0.50, wFrac: 0.17, hFrac: 0.65, floors: 9, cols: 3 },
  { xFrac: 0.68, wFrac: 0.15, hFrac: 0.50, floors: 6, cols: 2 },
  { xFrac: 0.85, wFrac: 0.14, hFrac: 0.35, floors: 4, cols: 2 },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ─── Public API ────────────────────────────────────────────────

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  time: number;
  isDark: boolean;
}

export function renderProperty(opts: RenderOptions): void {
  const { ctx, width, height, dpr, time, isDark } = opts;

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

  // 3. Sphere fill
  drawSphereFill(ctx, cx, cy, r, p);

  // 4. Clipped cityscape content
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const groundY = cy + r * 0.45;
  drawGround(ctx, cx, cy, r, groundY, p);
  drawBuildings(ctx, cx, cy, r, groundY, dpr, time, p);
  drawPin(ctx, cx, groundY, dpr, time, p);
  drawScanLine(ctx, cx, cy, r, time, p);

  ctx.restore();

  // 6. Edge stroke
  drawEdge(ctx, cx, cy, r, dpr, p);

  // 7. Rim light
  drawRimLight(ctx, cx, cy, r, p);

  // 8. Specular highlight
  drawSpecular(ctx, cx, cy, r, p);
}

// ─── Layer implementations ─────────────────────────────────────

function drawAtmosphere(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
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
  cx: number, cy: number, r: number,
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

function drawGround(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  groundY: number,
  p: Palette,
): void {
  const grad = ctx.createLinearGradient(0, groundY, 0, cy + r);
  grad.addColorStop(0, p.ground);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, groundY, r * 2, cy + r - groundY);

  // Ground line
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, groundY);
  ctx.lineTo(cx + r * 0.85, groundY);
  ctx.strokeStyle = p.buildingStroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawBuildings(
  ctx: CanvasRenderingContext2D,
  cx: number, _cy: number, r: number,
  groundY: number,
  dpr: number, time: number,
  p: Palette,
): void {
  void _cy;
  const areaW = r * 1.7;  // building area width
  const areaX = cx - areaW / 2;

  for (let bi = 0; bi < BUILDINGS.length; bi++) {
    const b = BUILDINGS[bi];
    const bw = areaW * b.wFrac;
    const bh = r * b.hFrac;
    const bx = areaX + areaW * b.xFrac - bw / 2;
    const by = groundY - bh;

    ctx.fillStyle = p.building;
    ctx.fillRect(bx, by, bw, bh);

    ctx.strokeStyle = p.buildingStroke;
    ctx.lineWidth = 1 * dpr;
    ctx.strokeRect(bx, by, bw, bh);

    // Windows
    const winPadX = bw * 0.12;
    const winPadY = bh * 0.06;
    const winAreaW = bw - winPadX * 2;
    const winAreaH = bh - winPadY * 2;
    const winW = (winAreaW / b.cols) * 0.55;
    const winH = (winAreaH / b.floors) * 0.45;
    const gapX = winAreaW / b.cols;
    const gapY = winAreaH / b.floors;

    for (let floor = 0; floor < b.floors; floor++) {
      for (let col = 0; col < b.cols; col++) {
        const wx = bx + winPadX + col * gapX + (gapX - winW) / 2;
        const wy = by + winPadY + floor * gapY + (gapY - winH) / 2;

        const seed = bi * 100 + floor * 10 + col;
        const baseOn = seededRandom(seed) > 0.35;
        const flicker = Math.sin(time * 0.001 + seed * 0.7) * 0.5 + 0.5;
        const isOn = baseOn && flicker > 0.15;

        if (isOn) {
          const glowR = Math.max(winW, winH) * 1.2;
          const grad = ctx.createRadialGradient(
            wx + winW / 2, wy + winH / 2, 0,
            wx + winW / 2, wy + winH / 2, glowR,
          );
          grad.addColorStop(0, rgba(p.accent, 0.15 * flicker));
          grad.addColorStop(1, rgba(p.accent, 0));
          ctx.fillStyle = grad;
          ctx.fillRect(wx - glowR / 2, wy - glowR / 2, winW + glowR, winH + glowR);

          ctx.fillStyle = p.windowOn;
          ctx.globalAlpha = 0.5 + flicker * 0.5;
          ctx.fillRect(wx, wy, winW, winH);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = p.windowOff;
          ctx.fillRect(wx, wy, winW, winH);
        }
      }
    }
  }
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  cx: number, groundY: number,
  dpr: number, time: number,
  p: Palette,
): void {
  const floatY = Math.sin(time * 0.002) * 3 * dpr;
  const pinSize = 10 * dpr;
  const pinX = cx;
  const pinY = groundY - pinSize * 2.5 + floatY;

  // Glow
  const glowR = pinSize * 2.5;
  const grad = ctx.createRadialGradient(pinX, pinY, 0, pinX, pinY, glowR);
  grad.addColorStop(0, p.pinGlow);
  grad.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(pinX, pinY, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Pin body
  ctx.beginPath();
  ctx.arc(pinX, pinY - pinSize * 0.3, pinSize * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = p.pinBody;
  ctx.fill();

  // Pin point
  ctx.beginPath();
  ctx.moveTo(pinX - pinSize * 0.35, pinY);
  ctx.lineTo(pinX, pinY + pinSize * 0.7);
  ctx.lineTo(pinX + pinSize * 0.35, pinY);
  ctx.closePath();
  ctx.fillStyle = p.pinBody;
  ctx.fill();

  // Inner dot
  ctx.beginPath();
  ctx.arc(pinX, pinY - pinSize * 0.3, pinSize * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fill();

  // Shadow
  const shadowAlpha = 0.1 + Math.sin(time * 0.002) * 0.03;
  ctx.beginPath();
  ctx.ellipse(pinX, groundY + 2 * dpr, pinSize * 0.8, pinSize * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(p.accent, shadowAlpha);
  ctx.fill();
}

function drawScanLine(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  time: number,
  p: Palette,
): void {
  const period = 8000;
  const progress = (time % period) / period;
  const top = cy - r;
  const lineY = top + r * 2 * progress;
  const lineH = r * 0.04;

  const grad = ctx.createLinearGradient(0, lineY, 0, lineY + lineH);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.5, p.scanLine);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, lineY, r * 2, lineH);
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
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
  cx: number, cy: number, r: number,
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
  cx: number, cy: number, r: number,
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
