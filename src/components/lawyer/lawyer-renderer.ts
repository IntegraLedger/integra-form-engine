/**
 * Lawyer renderer — stylised gavel on a 2D canvas.
 *
 * Render order per frame:
 *  1. clearRect
 *  2. Radial atmosphere (emerald/green glow)
 *  3. Background circle
 *  4. State bar dots (50 dots in a map-like spread)
 *  5. Shield / badge shape
 *  6. Sound block / striking pad
 *  7. Gavel (head + handle) — animated rise/fall
 *  8. Ripple waves from strike point
 *  9. Edge stroke
 * 10. Rim light
 * 11. Specular highlight
 */

// ─── Colour palettes ────────────────────────────────────────────

const DARK = {
  accent:       { r: 16,  g: 185, b: 129 },  // emerald-500
  highlight:    { r: 110, g: 231, b: 183 },  // emerald-300
  figure:       { r: 16,  g: 185, b: 129 },  // emerald-500
  figureFill:   'rgba(16,185,129,0.85)',
  pedestalFill: 'rgba(10,120,80,0.6)',
  atmosphere: 1.0,
  glow: 1.0,
  bgStops: [
    { stop: 0,   color: 'rgba(10,30,22,0.95)' },
    { stop: 0.6, color: 'rgba(6,20,14,0.95)' },
    { stop: 1,   color: 'rgba(3,12,8,0.98)' },
  ],
  edgeAlpha: 0.25,
  rimAlpha: 0.35,
  specAlpha: 0.2,
  shieldFill:   'rgba(16,185,129,0.15)',
  shieldStroke: 'rgba(110,231,183,0.4)',
  blockFill:    'rgba(10,120,80,0.7)',
  blockStroke:  'rgba(110,231,183,0.5)',
  gavelHead:    'rgba(16,185,129,0.9)',
  gavelHandle:  'rgba(10,120,80,0.85)',
  gavelBevel:   'rgba(110,231,183,0.5)',
  rippleColor:  'rgba(110,231,183,',   // append alpha + ')'
  dotColor:     'rgba(110,231,183,0.35)',
  dotGlow:      'rgba(16,185,129,0.6)',
  gleamColor:   'rgba(255,255,255,0.7)',
};

const LIGHT = {
  accent:       { r: 6,   g: 95,  b: 70 },   // emerald-800
  highlight:    { r: 16,  g: 150, b: 110 },   // emerald-600
  figure:       { r: 6,   g: 78,  b: 59 },    // emerald-900
  figureFill:   'rgba(6,78,59,0.85)',
  pedestalFill: 'rgba(6,95,70,0.4)',
  atmosphere: 0.5,
  glow: 0.8,
  bgStops: [
    { stop: 0,   color: 'rgba(236,253,245,0.95)' },  // emerald-50
    { stop: 0.6, color: 'rgba(209,250,229,0.92)' },  // emerald-100
    { stop: 1,   color: 'rgba(167,243,208,0.95)' },  // emerald-200
  ],
  edgeAlpha: 0.3,
  rimAlpha: 0.25,
  specAlpha: 0.3,
  shieldFill:   'rgba(6,95,70,0.1)',
  shieldStroke: 'rgba(6,78,59,0.3)',
  blockFill:    'rgba(6,95,70,0.5)',
  blockStroke:  'rgba(6,78,59,0.4)',
  gavelHead:    'rgba(6,78,59,0.85)',
  gavelHandle:  'rgba(6,95,70,0.75)',
  gavelBevel:   'rgba(16,150,110,0.4)',
  rippleColor:  'rgba(6,95,70,',
  dotColor:     'rgba(6,95,70,0.25)',
  dotGlow:      'rgba(6,78,59,0.4)',
  gleamColor:   'rgba(255,255,255,0.5)',
};

type Palette = typeof DARK;

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// ─── 50-state dot positions ─────────────────────────────────────
// Approximate US-map distribution normalised to [-1,1] range.
// Each [x,y] pair loosely maps to a US state centroid.

const STATE_DOTS: [number, number][] = [
  // West coast
  [-0.88, -0.30], [-0.92, -0.05], [-0.90,  0.20], [-0.80,  0.40],
  // Mountain / SW
  [-0.72, -0.15], [-0.68,  0.10], [-0.60,  0.30], [-0.55, -0.05],
  [-0.50,  0.15], [-0.62, -0.30],
  // Plains / Central
  [-0.40, -0.35], [-0.38, -0.12], [-0.35,  0.08], [-0.30,  0.28],
  [-0.28, -0.25], [-0.25,  0.00], [-0.22,  0.18], [-0.18, -0.15],
  [-0.15,  0.05], [-0.12,  0.25],
  // Great Lakes / Midwest
  [-0.05, -0.40], [-0.05, -0.20], [-0.02,  0.00],  [0.00, -0.30],
  [ 0.05, -0.15], [ 0.02,  0.12], [ 0.08, -0.35],
  // South
  [-0.10,  0.35], [ 0.00,  0.32], [ 0.10,  0.38], [ 0.15,  0.28],
  [ 0.20,  0.42], [-0.20,  0.40], [-0.30,  0.45], [ 0.05,  0.48],
  // Northeast
  [ 0.15, -0.42], [ 0.20, -0.30], [ 0.25, -0.18], [ 0.28, -0.40],
  [ 0.32, -0.28], [ 0.35, -0.38], [ 0.38, -0.22], [ 0.40, -0.35],
  [ 0.42, -0.15], [ 0.30, -0.05], [ 0.35,  0.08],
  // SE coast
  [ 0.25,  0.15], [ 0.30,  0.30], [ 0.35,  0.20],
  // Alaska & Hawaii (offset below map)
  [-0.85, 0.58], [-0.60, 0.58],
];

// ─── Public API ────────────────────────────────────────────────

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  time: number;
  isDark: boolean;
}

export function renderLawyer(opts: RenderOptions): void {
  const { ctx, width, height, dpr, time, isDark } = opts;

  const w = width * dpr;
  const h = height * dpr;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;

  const p = isDark ? DARK : LIGHT;

  // Gavel animation: sin wave drives a 0..1 "lift" value.
  // 0 = fully down (strike), 1 = fully raised.
  const rawSin = Math.sin(time * 0.002);
  const lift = (rawSin + 1) / 2; // 0..1
  // Impact intensity (peaks when lift~0, i.e. strike)
  const impact = Math.max(0, 1 - lift * 4); // sharp spike near bottom

  // 1. Clear
  ctx.clearRect(0, 0, w, h);

  // 2. Atmosphere
  drawAtmosphere(ctx, cx, cy, r, p);

  // 3. Background circle
  drawBackground(ctx, cx, cy, r, p);

  // 4. State bar dots
  drawStateDots(ctx, cx, cy, r, dpr, time, p);

  // 5. Shield badge
  drawShield(ctx, cx, cy, r, dpr, p);

  // 6. Sound block
  drawSoundBlock(ctx, cx, cy, r, dpr, p);

  // 7. Gavel (animated)
  drawGavel(ctx, cx, cy, r, dpr, lift, p);

  // 8. Ripple waves
  drawRipples(ctx, cx, cy, r, dpr, time, impact, p);

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
    { scale: 1.6,  alpha: 0.04 * mA },
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

function drawStateDots(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const dotR = Math.max(1.5 * dpr, r * 0.012);
  const spread = r * 0.55;

  for (let i = 0; i < STATE_DOTS.length; i++) {
    const [dx, dy] = STATE_DOTS[i];
    const x = cx + dx * spread;
    const y = cy + dy * spread;

    // Gentle twinkle per dot
    const twinkle = 0.5 + 0.5 * Math.sin(time * 0.003 + i * 1.3);
    const alpha = 0.2 + twinkle * 0.3;

    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = p.dotColor;
    ctx.fill();

    // Subtle glow halo
    if (twinkle > 0.65) {
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, dotR * 3);
      glowGrad.addColorStop(0, `${p.rippleColor}${(alpha * 0.4).toFixed(2)})`);
      glowGrad.addColorStop(1, `${p.rippleColor}0)`);
      ctx.beginPath();
      ctx.arc(x, y, dotR * 3, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawShield(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Shield sits behind the gavel — a classic badge / crest shape
  const shieldW = r * 0.28;
  const shieldH = r * 0.38;
  const topY = cy - shieldH * 0.45;
  const bottomY = cy + shieldH * 0.55;

  ctx.beginPath();
  // Top-left to top-right (flat top with slight inward curve)
  ctx.moveTo(cx - shieldW, topY);
  ctx.quadraticCurveTo(cx - shieldW, topY - shieldH * 0.08, cx - shieldW * 0.85, topY - shieldH * 0.1);
  ctx.lineTo(cx + shieldW * 0.85, topY - shieldH * 0.1);
  ctx.quadraticCurveTo(cx + shieldW, topY - shieldH * 0.08, cx + shieldW, topY);
  // Right side curves down to point
  ctx.quadraticCurveTo(cx + shieldW, bottomY - shieldH * 0.3, cx, bottomY);
  // Left side curves up from point
  ctx.quadraticCurveTo(cx - shieldW, bottomY - shieldH * 0.3, cx - shieldW, topY);
  ctx.closePath();

  ctx.fillStyle = p.shieldFill;
  ctx.fill();
  ctx.strokeStyle = p.shieldStroke;
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // Inner line detail — horizontal bar across shield
  const barY = topY + shieldH * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx - shieldW * 0.7, barY);
  ctx.lineTo(cx + shieldW * 0.7, barY);
  ctx.strokeStyle = p.shieldStroke;
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  // Vertical line through shield centre
  ctx.beginPath();
  ctx.moveTo(cx, topY - shieldH * 0.05);
  ctx.lineTo(cx, bottomY - shieldH * 0.08);
  ctx.strokeStyle = p.shieldStroke;
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  ctx.restore();
}

function drawSoundBlock(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // The striking pad / sound block sits below centre
  const blockW = r * 0.22;
  const blockH = r * 0.06;
  const blockY = cy + r * 0.18;
  const blockRad = blockH * 0.35; // corner radius

  // Rounded rect for the block
  ctx.beginPath();
  ctx.moveTo(cx - blockW + blockRad, blockY - blockH / 2);
  ctx.lineTo(cx + blockW - blockRad, blockY - blockH / 2);
  ctx.arcTo(cx + blockW, blockY - blockH / 2, cx + blockW, blockY, blockRad);
  ctx.lineTo(cx + blockW, blockY + blockH / 2 - blockRad);
  ctx.arcTo(cx + blockW, blockY + blockH / 2, cx + blockW - blockRad, blockY + blockH / 2, blockRad);
  ctx.lineTo(cx - blockW + blockRad, blockY + blockH / 2);
  ctx.arcTo(cx - blockW, blockY + blockH / 2, cx - blockW, blockY + blockH / 2 - blockRad, blockRad);
  ctx.lineTo(cx - blockW, blockY - blockH / 2 + blockRad);
  ctx.arcTo(cx - blockW, blockY - blockH / 2, cx - blockW + blockRad, blockY - blockH / 2, blockRad);
  ctx.closePath();

  ctx.fillStyle = p.blockFill;
  ctx.fill();
  ctx.strokeStyle = p.blockStroke;
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // Top surface highlight
  ctx.beginPath();
  ctx.moveTo(cx - blockW * 0.85, blockY - blockH / 2 + dpr);
  ctx.lineTo(cx + blockW * 0.85, blockY - blockH / 2 + dpr);
  ctx.strokeStyle = rgba(p.highlight, 0.3 * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  ctx.restore();
}

function drawGavel(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  lift: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Lift offsets the gavel upward: at lift=0 it rests on the block, at 1 raised
  const maxLift = r * 0.18;
  const liftOffset = lift * maxLift;

  // Slight rotation when raised — tilts back as it rises
  const tiltAngle = lift * 0.25; // radians

  const gavelCX = cx;
  const gavelCY = cy + r * 0.06 - liftOffset; // base centre of gavel

  ctx.save();
  ctx.translate(gavelCX, gavelCY);
  ctx.rotate(-tiltAngle);

  // ─── Handle ───
  const handleW = r * 0.025;
  const handleH = r * 0.22;
  const handleTopY = -handleH * 0.15; // slight overlap with head
  const handleBottomY = handleH * 0.85;

  ctx.beginPath();
  ctx.moveTo(-handleW, handleTopY);
  ctx.lineTo(-handleW, handleBottomY);
  ctx.lineTo(-handleW * 0.6, handleBottomY + r * 0.015); // slight knob
  ctx.lineTo(handleW * 0.6, handleBottomY + r * 0.015);
  ctx.lineTo(handleW, handleBottomY);
  ctx.lineTo(handleW, handleTopY);
  ctx.closePath();
  ctx.fillStyle = p.gavelHandle;
  ctx.fill();

  // Handle highlight
  ctx.beginPath();
  ctx.moveTo(-handleW * 0.3, handleTopY + r * 0.02);
  ctx.lineTo(-handleW * 0.3, handleBottomY - r * 0.02);
  ctx.strokeStyle = rgba(p.highlight, 0.2 * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  // ─── Gavel head ───
  const headW = r * 0.14;
  const headH = r * 0.08;
  const headY = -handleH * 0.15 - headH * 0.5; // centred above handle top
  const bevelInset = headH * 0.15;

  // Main head block — bevelled rectangle
  ctx.beginPath();
  // Bottom edge (wider)
  ctx.moveTo(-headW, headY + headH / 2);
  // Left bevel
  ctx.lineTo(-headW - r * 0.008, headY + headH / 2 - bevelInset);
  // Left top bevel
  ctx.lineTo(-headW + r * 0.005, headY - headH / 2 + bevelInset);
  // Top edge (slightly narrower)
  ctx.lineTo(-headW + r * 0.01, headY - headH / 2);
  ctx.lineTo(headW - r * 0.01, headY - headH / 2);
  // Right top bevel
  ctx.lineTo(headW - r * 0.005, headY - headH / 2 + bevelInset);
  // Right bevel
  ctx.lineTo(headW + r * 0.008, headY + headH / 2 - bevelInset);
  // Bottom right
  ctx.lineTo(headW, headY + headH / 2);
  ctx.closePath();
  ctx.fillStyle = p.gavelHead;
  ctx.fill();

  // Head bevel highlight (top edge)
  ctx.beginPath();
  ctx.moveTo(-headW + r * 0.015, headY - headH / 2 + dpr);
  ctx.lineTo(headW - r * 0.015, headY - headH / 2 + dpr);
  ctx.strokeStyle = p.gavelBevel;
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // Side face bevel lines
  ctx.beginPath();
  ctx.moveTo(-headW - r * 0.005, headY);
  ctx.lineTo(-headW + r * 0.008, headY);
  ctx.moveTo(headW + r * 0.005, headY);
  ctx.lineTo(headW - r * 0.008, headY);
  ctx.strokeStyle = rgba(p.highlight, 0.25 * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  // Band / ring around head centre
  ctx.beginPath();
  ctx.moveTo(-r * 0.005, headY - headH / 2 + bevelInset);
  ctx.lineTo(-r * 0.005, headY + headH / 2 - bevelInset);
  ctx.moveTo(r * 0.005, headY - headH / 2 + bevelInset);
  ctx.lineTo(r * 0.005, headY + headH / 2 - bevelInset);
  ctx.strokeStyle = rgba(p.highlight, 0.3 * p.glow);
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();

  // Gleam on gavel head
  const gleamX = -headW * 0.3;
  const gleamGrad = ctx.createRadialGradient(
    gleamX, headY, 0,
    gleamX, headY, headH * 0.6,
  );
  gleamGrad.addColorStop(0, p.gleamColor);
  gleamGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(gleamX, headY, headH * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = gleamGrad;
  ctx.fill();

  ctx.restore(); // undo translate + rotate
  ctx.restore(); // undo clip
}

function drawRipples(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number, impact: number,
  p: Palette,
): void {
  if (impact < 0.01) return; // nothing to draw when gavel is raised

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Strike point is top of the sound block
  const strikeX = cx;
  const strikeY = cy + r * 0.15;

  // Multiple expanding rings
  const ringCount = 4;
  const cyclePeriod = 3000; // ms per full cycle
  const phase = (time % cyclePeriod) / cyclePeriod;

  for (let i = 0; i < ringCount; i++) {
    const ringPhase = (phase + i / ringCount) % 1;
    const ringR = ringPhase * r * 0.55;
    const ringAlpha = impact * (1 - ringPhase) * 0.5;

    if (ringAlpha < 0.01) continue;

    ctx.beginPath();
    ctx.arc(strikeX, strikeY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `${p.rippleColor}${ringAlpha.toFixed(3)})`;
    ctx.lineWidth = Math.max(1, (1 - ringPhase) * 2.5 * dpr);
    ctx.stroke();
  }

  // Central flash on impact
  if (impact > 0.5) {
    const flashAlpha = (impact - 0.5) * 2 * 0.4; // 0..0.4
    const flashGrad = ctx.createRadialGradient(
      strikeX, strikeY, 0,
      strikeX, strikeY, r * 0.08,
    );
    flashGrad.addColorStop(0, `rgba(255,255,255,${flashAlpha.toFixed(3)})`);
    flashGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.arc(strikeX, strikeY, r * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = flashGrad;
    ctx.fill();
  }

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
