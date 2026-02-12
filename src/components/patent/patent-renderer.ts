/**
 * Patent renderer — stylized lightbulb on a 2D canvas.
 *
 * Render order per frame:
 *  1. clearRect
 *  2. Radial atmosphere (blue/cyan glow)
 *  3. Background circle
 *  4. Floating patent document pages (background)
 *  5. Lightbulb body (rounded top + screw base)
 *  6. Inner circuit / gear pattern
 *  7. Electric glow pulse around bulb
 *  8. Orbiting particles (electrons / idea sparks)
 *  9. Edge highlights / rim light
 * 10. Specular highlight
 */

// ─── Colour palettes ────────────────────────────────────────────

const DARK = {
  accent:       { r: 56, g: 189, b: 248 },   // sky-400
  highlight:    { r: 165, g: 230, b: 255 },   // light cyan
  figure:       { r: 56, g: 189, b: 248 },    // sky-400
  bulbFill:     'rgba(56,189,248,0.15)',
  bulbStroke:   'rgba(125,211,252,0.8)',
  baseFill:     'rgba(56,189,248,0.6)',
  baseStroke:   'rgba(125,211,252,0.5)',
  atmosphere:   1.0,
  glow:         1.0,
  bgStops: [
    { stop: 0,   color: 'rgba(8,15,30,0.95)' },
    { stop: 0.6, color: 'rgba(5,10,25,0.95)' },
    { stop: 1,   color: 'rgba(2,6,18,0.98)' },
  ],
  edgeAlpha:    0.25,
  rimAlpha:     0.35,
  specAlpha:    0.2,
  circuitColor: 'rgba(56,189,248,0.45)',
  circuitNodeColor: 'rgba(125,211,252,0.7)',
  glowInner:    'rgba(56,189,248,0.35)',
  glowOuter:    'rgba(56,189,248,0)',
  particleColor: { r: 165, g: 230, b: 255 },
  pageColor:    'rgba(56,189,248,0.06)',
  pageStroke:   'rgba(56,189,248,0.12)',
  pageLine:     'rgba(56,189,248,0.08)',
  filamentColor: 'rgba(253,224,71,0.6)',
  filamentGlow: 'rgba(253,224,71,0.15)',
};

const LIGHT = {
  accent:       { r: 2, g: 132, b: 199 },    // sky-600
  highlight:    { r: 14, g: 165, b: 233 },    // sky-500
  figure:       { r: 3, g: 105, b: 161 },     // sky-700
  bulbFill:     'rgba(186,230,253,0.4)',
  bulbStroke:   'rgba(2,132,199,0.7)',
  baseFill:     'rgba(2,132,199,0.5)',
  baseStroke:   'rgba(3,105,161,0.5)',
  atmosphere:   0.5,
  glow:         0.8,
  bgStops: [
    { stop: 0,   color: 'rgba(240,249,255,0.95)' },   // sky-50
    { stop: 0.6, color: 'rgba(224,242,254,0.92)' },   // sky-100
    { stop: 1,   color: 'rgba(186,230,253,0.95)' },   // sky-200
  ],
  edgeAlpha:    0.3,
  rimAlpha:     0.25,
  specAlpha:    0.3,
  circuitColor: 'rgba(2,132,199,0.35)',
  circuitNodeColor: 'rgba(3,105,161,0.6)',
  glowInner:    'rgba(56,189,248,0.2)',
  glowOuter:    'rgba(56,189,248,0)',
  particleColor: { r: 2, g: 132, b: 199 },
  pageColor:    'rgba(2,132,199,0.05)',
  pageStroke:   'rgba(2,132,199,0.1)',
  pageLine:     'rgba(2,132,199,0.06)',
  filamentColor: 'rgba(202,138,4,0.5)',
  filamentGlow: 'rgba(202,138,4,0.1)',
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

export function renderPatent(opts: RenderOptions): void {
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

  // 3. Background circle
  drawBackground(ctx, cx, cy, r, p);

  // 4. Floating patent pages (behind bulb)
  drawPatentPages(ctx, cx, cy, r, dpr, time, p);

  // 5. Electric glow pulse (behind bulb body)
  drawElectricGlow(ctx, cx, cy, r, time, p);

  // 6. Lightbulb body
  drawBulb(ctx, cx, cy, r, dpr, p);

  // 7. Filament inside bulb
  drawFilament(ctx, cx, cy, r, dpr, time, p);

  // 8. Circuit pattern inside bulb
  drawCircuitPattern(ctx, cx, cy, r, dpr, time, p);

  // 9. Orbiting particles
  drawOrbitingParticles(ctx, cx, cy, r, dpr, time, p);

  // 10. Edge stroke
  drawEdge(ctx, cx, cy, r, dpr, p);

  // 11. Rim light
  drawRimLight(ctx, cx, cy, r, p);

  // 12. Specular
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

function drawPatentPages(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  // Three floating patent document pages at different positions / angles
  const pages = [
    { baseX: -0.38, baseY: -0.22, angle: -0.18, drift: 0.0012, phase: 0 },
    { baseX:  0.35, baseY: -0.15, angle:  0.15, drift: 0.0009, phase: 2.1 },
    { baseX:  0.30, baseY:  0.30, angle:  0.10, drift: 0.0015, phase: 4.2 },
  ];

  const pageW = r * 0.16;
  const pageH = r * 0.21;

  for (const pg of pages) {
    const floatY = Math.sin(time * pg.drift + pg.phase) * r * 0.025;
    const px = cx + pg.baseX * r;
    const py = cy + pg.baseY * r + floatY;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(pg.angle);

    // Page rectangle
    ctx.beginPath();
    ctx.rect(-pageW / 2, -pageH / 2, pageW, pageH);
    ctx.fillStyle = p.pageColor;
    ctx.fill();
    ctx.strokeStyle = p.pageStroke;
    ctx.lineWidth = 1 * dpr;
    ctx.stroke();

    // Horizontal "text" lines on the page
    const lineCount = 5;
    const lineMarginX = pageW * 0.15;
    const lineStartY = -pageH / 2 + pageH * 0.2;
    const lineSpacing = pageH * 0.12;

    ctx.strokeStyle = p.pageLine;
    ctx.lineWidth = 0.8 * dpr;

    for (let i = 0; i < lineCount; i++) {
      const ly = lineStartY + i * lineSpacing;
      // Vary line width for realism
      const lw = pageW - lineMarginX * 2 - (i % 2 === 0 ? 0 : pageW * 0.15);
      ctx.beginPath();
      ctx.moveTo(-pageW / 2 + lineMarginX, ly);
      ctx.lineTo(-pageW / 2 + lineMarginX + lw, ly);
      ctx.stroke();
    }

    // Small circle at top-left (patent seal)
    ctx.beginPath();
    ctx.arc(-pageW / 2 + lineMarginX + r * 0.02, -pageH / 2 + pageH * 0.1, r * 0.018, 0, Math.PI * 2);
    ctx.strokeStyle = p.pageStroke;
    ctx.lineWidth = 0.8 * dpr;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}

function drawElectricGlow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  // Pulsing glow centered on bulb
  const pulse = 0.6 + 0.4 * Math.sin(time * 0.003);
  const bulbCY = cy - r * 0.08;
  const glowR = r * 0.32 * (0.9 + 0.1 * pulse);

  const grad = ctx.createRadialGradient(cx, bulbCY, 0, cx, bulbCY, glowR);
  grad.addColorStop(0, p.glowInner.replace(/[\d.]+\)$/, `${0.35 * pulse})`));
  grad.addColorStop(0.5, p.glowInner.replace(/[\d.]+\)$/, `${0.12 * pulse})`));
  grad.addColorStop(1, p.glowOuter);

  ctx.beginPath();
  ctx.arc(cx, bulbCY, glowR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.restore();
}

function drawBulb(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const bulbR = r * 0.18;            // radius of the bulb dome
  const bulbCY = cy - r * 0.08;      // center of dome
  const neckTopY = bulbCY + bulbR * 0.7;
  const neckW = bulbR * 0.48;
  const baseBottomY = bulbCY + bulbR * 1.55;
  const baseTopY = neckTopY;

  // ── Glass bulb dome (upper hemisphere + taper to neck) ──
  ctx.beginPath();

  // Start at left neck
  ctx.moveTo(cx - neckW, baseTopY);

  // Left curve up to dome top
  ctx.bezierCurveTo(
    cx - bulbR * 1.15, baseTopY - bulbR * 0.3,
    cx - bulbR * 1.15, bulbCY - bulbR * 0.9,
    cx, bulbCY - bulbR,
  );

  // Right curve down from dome top to neck
  ctx.bezierCurveTo(
    cx + bulbR * 1.15, bulbCY - bulbR * 0.9,
    cx + bulbR * 1.15, baseTopY - bulbR * 0.3,
    cx + neckW, baseTopY,
  );

  ctx.closePath();

  // Fill with translucent gradient
  const bulbGrad = ctx.createRadialGradient(
    cx - bulbR * 0.2, bulbCY - bulbR * 0.3, 0,
    cx, bulbCY, bulbR * 1.2,
  );
  bulbGrad.addColorStop(0, p.bulbFill.replace(/[\d.]+\)$/, '0.25)'));
  bulbGrad.addColorStop(0.7, p.bulbFill);
  bulbGrad.addColorStop(1, p.bulbFill.replace(/[\d.]+\)$/, '0.08)'));

  ctx.fillStyle = bulbGrad;
  ctx.fill();

  // Outline
  ctx.strokeStyle = p.bulbStroke;
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // ── Screw base ──
  const screwSegments = 4;
  const segH = (baseBottomY - baseTopY) / screwSegments;

  for (let i = 0; i < screwSegments; i++) {
    const sy = baseTopY + i * segH;
    const widthFactor = 1 - i * 0.06;
    const sw = neckW * widthFactor;
    const indent = i % 2 === 0 ? 0 : neckW * 0.06;

    ctx.beginPath();
    ctx.rect(cx - sw + indent, sy, (sw - indent) * 2, segH - dpr * 0.5);
    ctx.fillStyle = p.baseFill;
    ctx.fill();
    ctx.strokeStyle = p.baseStroke;
    ctx.lineWidth = 0.8 * dpr;
    ctx.stroke();
  }

  // Bottom cap of base
  const capY = baseBottomY;
  const capW = neckW * (1 - screwSegments * 0.06) * 0.7;
  ctx.beginPath();
  ctx.arc(cx, capY, capW, 0, Math.PI);
  ctx.fillStyle = p.baseFill;
  ctx.fill();

  ctx.restore();
}

function drawFilament(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const bulbCY = cy - r * 0.08;
  const bulbR = r * 0.18;

  // Filament flicker
  const flicker = 0.7 + 0.3 * Math.sin(time * 0.005) * Math.sin(time * 0.0031);

  // Filament glow (warm yellow behind wire)
  const fGlowR = bulbR * 0.5;
  const fGrad = ctx.createRadialGradient(cx, bulbCY, 0, cx, bulbCY, fGlowR);
  fGrad.addColorStop(0, p.filamentGlow.replace(/[\d.]+\)$/, `${0.2 * flicker})`));
  fGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, bulbCY, fGlowR, 0, Math.PI * 2);
  ctx.fillStyle = fGrad;
  ctx.fill();

  // Filament wire — zig-zag pattern
  const wireY = bulbCY + bulbR * 0.15;
  const wireTop = bulbCY - bulbR * 0.35;
  const wireW = bulbR * 0.35;
  const zigCount = 5;

  ctx.beginPath();
  // Left support wire from base up
  ctx.moveTo(cx - wireW * 0.3, wireY);
  ctx.lineTo(cx - wireW * 0.3, wireTop + bulbR * 0.15);
  // Zig-zag across
  for (let i = 0; i <= zigCount; i++) {
    const t = i / zigCount;
    const zx = cx - wireW + t * wireW * 2;
    const zy = wireTop + (i % 2 === 0 ? 0 : bulbR * 0.15);
    if (i === 0) ctx.moveTo(zx, zy);
    else ctx.lineTo(zx, zy);
  }
  // Right support wire back down
  ctx.moveTo(cx + wireW * 0.3, wireTop + bulbR * 0.15);
  ctx.lineTo(cx + wireW * 0.3, wireY);

  ctx.strokeStyle = p.filamentColor.replace(/[\d.]+\)$/, `${0.6 * flicker})`);
  ctx.lineWidth = 1.2 * dpr;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';

  ctx.restore();
}

function drawCircuitPattern(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const bulbCY = cy - r * 0.08;
  const bulbR = r * 0.18;
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.003);

  // Small gear / circuit nodes around the bulb interior
  // Draw a small gear icon at center of bulb
  const gearCX = cx;
  const gearCY = bulbCY - bulbR * 0.05;
  const gearR = bulbR * 0.22;
  const teeth = 6;

  ctx.beginPath();
  for (let i = 0; i < teeth * 2; i++) {
    const angle = (i / (teeth * 2)) * Math.PI * 2;
    const outerR = i % 2 === 0 ? gearR : gearR * 0.72;
    const gx = gearCX + Math.cos(angle + time * 0.001) * outerR;
    const gy = gearCY + Math.sin(angle + time * 0.001) * outerR;
    if (i === 0) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  }
  ctx.closePath();
  ctx.strokeStyle = p.circuitColor.replace(/[\d.]+\)$/, `${0.45 * pulse})`);
  ctx.lineWidth = 1.2 * dpr;
  ctx.stroke();

  // Center dot of gear
  ctx.beginPath();
  ctx.arc(gearCX, gearCY, gearR * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = p.circuitNodeColor.replace(/[\d.]+\)$/, `${0.6 * pulse})`);
  ctx.fill();

  // Small circuit trace lines radiating from gear
  const traces = [
    { angle: -0.7, len: 0.5 },
    { angle:  0.7, len: 0.45 },
    { angle: -2.2, len: 0.4 },
    { angle:  2.2, len: 0.42 },
  ];

  ctx.strokeStyle = p.circuitColor.replace(/[\d.]+\)$/, `${0.3 * pulse})`);
  ctx.lineWidth = 0.8 * dpr;

  for (const t of traces) {
    const sx = gearCX + Math.cos(t.angle) * gearR * 1.1;
    const sy = gearCY + Math.sin(t.angle) * gearR * 1.1;
    const ex = gearCX + Math.cos(t.angle) * gearR * (1.1 + t.len);
    const ey = gearCY + Math.sin(t.angle) * gearR * (1.1 + t.len);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Node dot at end
    ctx.beginPath();
    ctx.arc(ex, ey, 1.5 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = p.circuitNodeColor.replace(/[\d.]+\)$/, `${0.5 * pulse})`);
    ctx.fill();
  }

  ctx.restore();
}

function drawOrbitingParticles(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, dpr: number,
  time: number,
  p: Palette,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r - dpr, 0, Math.PI * 2);
  ctx.clip();

  const bulbCY = cy - r * 0.08;

  // Multiple orbiting particles at different radii and speeds
  const particles = [
    { orbitR: 0.30, speed: 0.0012, phase: 0,     size: 2.5, trail: true },
    { orbitR: 0.30, speed: 0.0012, phase: Math.PI, size: 2.0, trail: true },
    { orbitR: 0.38, speed: -0.0008, phase: 0.5,   size: 2.0, trail: true },
    { orbitR: 0.38, speed: -0.0008, phase: Math.PI + 0.5, size: 1.8, trail: true },
    { orbitR: 0.46, speed: 0.0006, phase: 1.2,    size: 1.5, trail: false },
    { orbitR: 0.46, speed: 0.0006, phase: Math.PI + 1.2, size: 1.5, trail: false },
    { orbitR: 0.24, speed: 0.0018, phase: 2.8,    size: 1.8, trail: true },
    { orbitR: 0.54, speed: -0.0005, phase: 3.5,   size: 1.2, trail: false },
  ];

  for (const pt of particles) {
    const angle = time * pt.speed + pt.phase;
    // Slightly elliptical orbit
    const px = cx + Math.cos(angle) * r * pt.orbitR;
    const py = bulbCY + Math.sin(angle) * r * pt.orbitR * 0.6;
    const particleAlpha = 0.5 + 0.3 * Math.sin(time * 0.004 + pt.phase);

    // Trail (fading arc behind particle)
    if (pt.trail) {
      const trailLen = 0.4;
      const trailSteps = 8;
      for (let i = trailSteps; i > 0; i--) {
        const ta = angle - (pt.speed > 0 ? 1 : -1) * trailLen * (i / trailSteps);
        const tx = cx + Math.cos(ta) * r * pt.orbitR;
        const ty = bulbCY + Math.sin(ta) * r * pt.orbitR * 0.6;
        const trailAlpha = particleAlpha * 0.15 * (1 - i / trailSteps);

        ctx.beginPath();
        ctx.arc(tx, ty, pt.size * dpr * 0.5 * (1 - i / trailSteps * 0.6), 0, Math.PI * 2);
        ctx.fillStyle = rgba(p.particleColor, trailAlpha);
        ctx.fill();
      }
    }

    // Glow around particle
    const glowR = pt.size * dpr * 3;
    const pGrad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
    pGrad.addColorStop(0, rgba(p.particleColor, particleAlpha * 0.25));
    pGrad.addColorStop(1, rgba(p.particleColor, 0));
    ctx.beginPath();
    ctx.arc(px, py, glowR, 0, Math.PI * 2);
    ctx.fillStyle = pGrad;
    ctx.fill();

    // Particle dot
    ctx.beginPath();
    ctx.arc(px, py, pt.size * dpr, 0, Math.PI * 2);
    ctx.fillStyle = rgba(p.particleColor, particleAlpha);
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
