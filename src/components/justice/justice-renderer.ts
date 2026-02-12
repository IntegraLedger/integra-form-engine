/**
 * Justice renderer — stylized Lady Justice on a 2D canvas.
 *
 * Render order per frame:
 *  1. clearRect
 *  2. Radial atmosphere (gold/amber glow)
 *  3. Pedestal base
 *  4. Robed figure silhouette
 *  5. Head with blindfold
 *  6. Scales (left arm) — animated oscillation
 *  7. Sword (right arm) — with gleam sweep
 *  8. Edge highlights / rim light
 *  9. Specular highlight
 */

// ─── Colour palettes ────────────────────────────────────────────

const DARK = {
  accent:     { r: 245, g: 158, b: 11 },  // amber-500
  highlight:  { r: 253, g: 224, b: 71 },  // yellow-300
  figure:     { r: 245, g: 158, b: 11 },  // amber-500
  figureFill: 'rgba(245,158,11,0.85)',
  pedestalFill: 'rgba(180,120,20,0.6)',
  atmosphere: 1.0,
  glow: 1.0,
  bgStops: [
    { stop: 0,   color: 'rgba(30,25,15,0.95)' },
    { stop: 0.6, color: 'rgba(20,15,8,0.95)' },
    { stop: 1,   color: 'rgba(10,8,4,0.98)' },
  ],
  edgeAlpha: 0.25,
  rimAlpha: 0.35,
  specAlpha: 0.2,
  blindfold: 'rgba(200,140,40,0.9)',
  chainColor: 'rgba(253,224,71,0.6)',
  panFill: 'rgba(245,158,11,0.5)',
  panStroke: 'rgba(253,224,71,0.7)',
  swordBlade: 'rgba(253,224,71,0.8)',
  swordGuard: 'rgba(245,158,11,0.9)',
  gleamColor: 'rgba(255,255,255,0.7)',
};

const LIGHT = {
  accent:     { r: 120, g: 53, b: 15 },   // amber-900
  highlight:  { r: 180, g: 120, b: 20 },  // gold
  figure:     { r: 100, g: 60, b: 20 },   // dark bronze
  figureFill: 'rgba(100,60,20,0.85)',
  pedestalFill: 'rgba(140,100,40,0.5)',
  atmosphere: 0.5,
  glow: 0.8,
  bgStops: [
    { stop: 0,   color: 'rgba(255,251,235,0.95)' },  // amber-50
    { stop: 0.6, color: 'rgba(254,243,199,0.92)' },  // amber-100
    { stop: 1,   color: 'rgba(253,230,138,0.95)' },  // amber-200
  ],
  edgeAlpha: 0.3,
  rimAlpha: 0.25,
  specAlpha: 0.3,
  blindfold: 'rgba(120,80,20,0.8)',
  chainColor: 'rgba(120,80,20,0.5)',
  panFill: 'rgba(180,130,40,0.4)',
  panStroke: 'rgba(120,80,20,0.6)',
  swordBlade: 'rgba(120,80,20,0.7)',
  swordGuard: 'rgba(100,60,20,0.8)',
  gleamColor: 'rgba(255,255,255,0.5)',
};

type Palette = typeof DARK;

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
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

export function renderJustice(opts: RenderOptions): void {
  const { ctx, width, height, dpr, time, isDark } = opts;

  const w = width * dpr;
  const h = height * dpr;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  const p = isDark ? DARK : LIGHT;

  // 1. Clear
  ctx.clearRect(0, 0, w, h);

  // 2. Atmosphere
  drawAtmosphere(ctx, cx, cy, r, p);

  // 3. Background circle (like globe sphere)
  drawBackground(ctx, cx, cy, r, p);

  // 4. Pedestal
  drawPedestal(ctx, cx, cy, r, dpr, p);

  // 5. Figure body
  drawFigure(ctx, cx, cy, r, dpr, p);

  // 6. Head and blindfold
  drawHead(ctx, cx, cy, r, dpr, p);

  // 7. Scales (animated)
  drawScales(ctx, cx, cy, r, dpr, time, p);

  // 8. Sword with gleam
  drawSword(ctx, cx, cy, r, dpr, time, p);

  // 9. Edge stroke
  drawEdge(ctx, cx, cy, r, dpr, p);

  // 10. Rim light
  drawRimLight(ctx, cx, cy, r, p);

  // 11. Specular
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
    { scale: 1.6, alpha: 0.04 * mA },
    { scale: 1.35, alpha: 0.08 * mA },
    { scale: 1.18, alpha: 0.12 * mA },
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

function drawBackground(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  p: Palette,
): void {
  const lightX = cx - r * 0.35;
  const lightY = cy - r * 0.35;
  const grad = ctx.createRadialGradient(lightX, lightY, 0, cx, cy, r);

  for (const s of p.bgStops) {
    grad.addColorStop(s.stop, s.color);
  }

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
}

function drawPedestal(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  const baseY = cy + r * 0.55;
  const topY = cy + r * 0.42;
  const baseW = r * 0.35;
  const topW = r * 0.22;

  ctx.save();
  // Clip to sphere
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  ctx.beginPath();
  ctx.moveTo(cx - baseW, baseY);
  ctx.lineTo(cx - topW, topY);
  ctx.lineTo(cx + topW, topY);
  ctx.lineTo(cx + baseW, baseY);
  ctx.closePath();
  ctx.fillStyle = p.pedestalFill;
  ctx.fill();

  // Top edge highlight
  ctx.beginPath();
  ctx.moveTo(cx - topW, topY);
  ctx.lineTo(cx + topW, topY);
  ctx.strokeStyle = rgba(p.highlight, 0.4 * p.glow);
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  ctx.restore();
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Robe — flowing triangular shape
  const shoulderY = cy - r * 0.15;
  const shoulderW = r * 0.14;
  const robeBottomY = cy + r * 0.42;
  const robeBottomW = r * 0.25;

  ctx.beginPath();
  ctx.moveTo(cx, shoulderY - r * 0.02); // neck point
  ctx.quadraticCurveTo(cx - shoulderW * 1.2, shoulderY, cx - robeBottomW, robeBottomY);
  ctx.lineTo(cx + robeBottomW, robeBottomY);
  ctx.quadraticCurveTo(cx + shoulderW * 1.2, shoulderY, cx, shoulderY - r * 0.02);
  ctx.closePath();

  ctx.fillStyle = p.figureFill;
  ctx.fill();

  // Center line on robe
  ctx.beginPath();
  ctx.moveTo(cx, shoulderY);
  ctx.lineTo(cx, robeBottomY - r * 0.02);
  ctx.strokeStyle = rgba(p.highlight, 0.2 * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  ctx.restore();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const headR = r * 0.07;
  const headY = cy - r * 0.28;

  // Head circle
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = p.figureFill;
  ctx.fill();

  // Blindfold band
  const bandH = headR * 0.35;
  ctx.beginPath();
  ctx.rect(cx - headR * 1.2, headY - bandH / 2, headR * 2.4, bandH);
  ctx.fillStyle = p.blindfold;
  ctx.fill();

  ctx.restore();
}

function drawScales(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Scale oscillation
  const tilt = Math.sin(time * 0.002) * 0.12; // radians

  // Hand / pivot point — left side
  const pivotX = cx - r * 0.22;
  const pivotY = cy - r * 0.1;

  // Arm from shoulder to pivot
  const shoulderX = cx - r * 0.08;
  const shoulderY = cy - r * 0.15;

  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(pivotX, pivotY);
  ctx.strokeStyle = p.figureFill;
  ctx.lineWidth = 2.5 * dpr;
  ctx.stroke();

  // Balance bar
  const barLen = r * 0.28;
  const barLeftX = pivotX - Math.cos(tilt) * barLen;
  const barLeftY = pivotY + Math.sin(tilt) * barLen * 0.3;
  const barRightX = pivotX + Math.cos(tilt) * barLen;
  const barRightY = pivotY - Math.sin(tilt) * barLen * 0.3;

  ctx.beginPath();
  ctx.moveTo(barLeftX, barLeftY);
  ctx.lineTo(barRightX, barRightY);
  ctx.strokeStyle = rgba(p.highlight, 0.7 * p.glow);
  ctx.lineWidth = 2 * dpr;
  ctx.stroke();

  // Pivot point dot
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 2.5 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = rgba(p.highlight, 0.8 * p.glow);
  ctx.fill();

  // Chains and pans
  const chainLen = r * 0.15;
  drawPan(ctx, barLeftX, barLeftY, chainLen, dpr, p);
  drawPan(ctx, barRightX, barRightY, chainLen, dpr, p);

  ctx.restore();
}

function drawPan(
  ctx: CanvasRenderingContext2D,
  x: number, topY: number, chainLen: number, dpr: number,
  p: Palette,
): void {
  const panY = topY + chainLen;
  const panW = chainLen * 0.7;

  // Two chains
  ctx.beginPath();
  ctx.moveTo(x - panW * 0.5, panY);
  ctx.lineTo(x - panW * 0.2, topY);
  ctx.moveTo(x + panW * 0.5, panY);
  ctx.lineTo(x + panW * 0.2, topY);
  ctx.strokeStyle = p.chainColor;
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  // Pan — arc shape
  ctx.beginPath();
  ctx.arc(x, panY, panW * 0.5, 0, Math.PI);
  ctx.fillStyle = p.panFill;
  ctx.fill();
  ctx.strokeStyle = p.panStroke;
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
}

function drawSword(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Sword held in right hand
  const shoulderX = cx + r * 0.08;
  const shoulderY = cy - r * 0.15;
  const gripX = cx + r * 0.15;
  const gripY = cy - r * 0.05;

  // Arm
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(gripX, gripY);
  ctx.strokeStyle = p.figureFill;
  ctx.lineWidth = 2.5 * dpr;
  ctx.stroke();

  // Blade — extends upward from grip
  const bladeTopY = cy - r * 0.55;
  const bladeW = r * 0.015;

  ctx.beginPath();
  ctx.moveTo(gripX - bladeW, gripY);
  ctx.lineTo(gripX - bladeW * 0.3, bladeTopY + r * 0.05);
  ctx.lineTo(gripX, bladeTopY); // tip
  ctx.lineTo(gripX + bladeW * 0.3, bladeTopY + r * 0.05);
  ctx.lineTo(gripX + bladeW, gripY);
  ctx.closePath();
  ctx.fillStyle = p.swordBlade;
  ctx.fill();

  // Crossguard
  const guardY = gripY - r * 0.01;
  const guardW = r * 0.06;
  ctx.beginPath();
  ctx.moveTo(gripX - guardW, guardY);
  ctx.lineTo(gripX + guardW, guardY);
  ctx.strokeStyle = p.swordGuard;
  ctx.lineWidth = 2.5 * dpr;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Gleam sweep up blade
  const gleamProgress = (time * 0.0008) % 1;
  const gleamY = gripY - (gripY - bladeTopY) * gleamProgress;
  const gleamAlpha = Math.sin(gleamProgress * Math.PI) * 0.6;

  if (gleamAlpha > 0.05) {
    const grad = ctx.createRadialGradient(gripX, gleamY, 0, gripX, gleamY, r * 0.04);
    grad.addColorStop(0, `rgba(255,255,255,${gleamAlpha})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(gripX, gleamY, r * 0.04, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.lineCap = 'butt';
  ctx.restore();
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
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
