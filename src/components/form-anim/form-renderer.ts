/**
 * Form renderer — animated attestation flow on a 2D canvas.
 *
 * Full cycle:
 *  1. Form card with animated typing fields
 *  2. Checkbox + submit button
 *  3. Submit flash
 *  4. Screen 1: Shield with Integra logo + Verified Receipt info
 *  5. Screen 1 fades out
 *  6. Screen 2: PDF icon with "Download" + stylized PDF document fades in
 */

// ─── Colour palettes ────────────────────────────────────────────

const DARK = {
  accent:     { r: 56,  g: 189, b: 248 },
  secondary:  { r: 45,  g: 212, b: 191 },
  cardBg:     'rgba(15, 23, 42, 0.92)',
  cardBorder: 'rgba(56, 189, 248, 0.25)',
  fieldBg:    'rgba(30, 41, 59, 0.8)',
  fieldBorder:'rgba(56, 189, 248, 0.2)',
  textColor:  'rgba(226, 232, 240, 0.9)',
  labelColor: 'rgba(148, 163, 184, 0.8)',
  mutedText:  'rgba(100, 116, 139, 0.6)',
  cursorColor:'rgba(56, 189, 248, 0.9)',
  btnGradStart: 'rgba(56, 189, 248, 0.9)',
  btnGradEnd:   'rgba(45, 212, 191, 0.9)',
  btnText:    'rgba(15, 23, 42, 1)',
  checkColor: 'rgba(45, 212, 191, 0.9)',
  glowAlpha:  0.12,
  submitFlash:'rgba(45, 212, 191, 0.3)',
  shieldFill: '#0a0a1a',
  shieldBorder: '#1e293b',
  infoBg:     'rgba(15, 23, 42, 0.95)',
  infoBorder: 'rgba(56, 189, 248, 0.2)',
  hashColor:  'rgba(147, 197, 253, 0.9)',
  pdfBg:      'rgba(20, 20, 50, 0.95)',
  pdfAccent:  'rgba(167, 139, 250, 0.9)',
};

const LIGHT = {
  accent:     { r: 30,  g: 64,  b: 175 },
  secondary:  { r: 29,  g: 78,  b: 216 },
  cardBg:     'rgba(255, 255, 255, 0.95)',
  cardBorder: 'rgba(30, 64, 175, 0.15)',
  fieldBg:    'rgba(241, 245, 249, 0.9)',
  fieldBorder:'rgba(30, 64, 175, 0.15)',
  textColor:  'rgba(15, 23, 42, 0.9)',
  labelColor: 'rgba(71, 85, 105, 0.8)',
  mutedText:  'rgba(100, 116, 139, 0.5)',
  cursorColor:'rgba(30, 64, 175, 0.8)',
  btnGradStart: 'rgba(30, 64, 175, 0.9)',
  btnGradEnd:   'rgba(29, 78, 216, 0.9)',
  btnText:    'rgba(255, 255, 255, 1)',
  checkColor: 'rgba(29, 78, 216, 0.9)',
  glowAlpha:  0.08,
  submitFlash:'rgba(29, 78, 216, 0.15)',
  shieldFill: '#1e293b',
  shieldBorder: '#cbd5e1',
  infoBg:     'rgba(255, 255, 255, 0.95)',
  infoBorder: 'rgba(30, 64, 175, 0.15)',
  hashColor:  'rgba(30, 64, 175, 0.8)',
  pdfBg:      'rgba(248, 250, 252, 0.95)',
  pdfAccent:  'rgba(109, 40, 217, 0.9)',
};

type Palette = typeof DARK;

function rgba(c: { r: number; g: number; b: number }, a: number): string {
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}

// ─── Integra logo path (viewBox 0 0 54 60) ──────────────────────

const LOGO_PATH =
  'M53.2,16.8L27.7,1.2C27.5,1.1,27.2,1,27,1c-0.3,0-0.5,0.1-0.8,0.2L0.7,16.8C0.3,17,0,17.5,0,18v23.6' +
  'c0,0.5,0.3,1,0.7,1.3l25.5,15.9c0.2,0.2,0.5,0.2,0.8,0.2c0.3,0,0.6-0.1,0.8-0.2l25.5-15.9' +
  'c0.4-0.3,0.7-0.8,0.7-1.3V18C53.9,17.5,53.7,17,53.2,16.8z M27,32.1l-2.3-1.4l-2.9,1.8l3.7,2.3v20.1L4.4,41.7L27,27.9l2.3,1.4' +
  'l2.9-1.8l-3.7-2.2V5.2l21.1,12.9L27,32.1z M16.6,29.2l2.9-1.8L4.4,18.1L25.5,5.2v20.1L3,39V20.7L16.6,29.2z M50.9,39l-13.6-8.3' +
  'l-2.9,1.8l15.1,9.2L28.5,54.8V34.7l22.5-14V39z';

// ─── Animation data ─────────────────────────────────────────────

const FIELDS = [
  { label: 'Document Title', text: 'Employment Agreement NDA' },
  { label: 'Signer Email', text: 'jane.doe@acme.corp' },
  { label: 'Reference ID', text: 'VRF-2026-00482' },
];

const CYCLE_DURATION = 18000; // ms — 18s cycle with 2s holds

// Timeline (fraction of cycle):
const T_TYPE_END     = 0.22;  // fields done typing
const T_CHECK        = 0.24;  // checkbox checked
const T_BTN_READY    = 0.26;  // button glows
// ── 2s hold: completed form visible ──
const T_BTN_PRESS    = 0.37;  // button pressed
const T_FLASH        = 0.39;  // submit flash
const T_FLASH_END    = 0.42;
// Screen 2: attestation results
const T_SHIELD_START = 0.42;  // shield morphs in
const T_SHIELD_END   = 0.47;
const T_INFO_START   = 0.47;  // info panel fades in
const T_INFO_END     = 0.52;
// ── 2s hold: verified receipt visible ──
const T_S1_FADE_START = 0.63; // screen 2 starts fading out
const T_S1_FADE_END   = 0.67; // screen 2 gone
// Screen 3: PDF download
const T_PDF_START    = 0.67;  // pdf icon + doc fade in
const T_PDF_END      = 0.73;
// ── 2s hold: PDF visible ── (0.73–0.84)
// 0.84–1.00: extended hold, then reset

// ─── Public API ─────────────────────────────────────────────────

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  time: number;
  isDark: boolean;
}

export function renderForm(opts: RenderOptions): void {
  const { ctx, width, height, dpr, time, isDark } = opts;

  const w = width * dpr;
  const h = height * dpr;
  const p = isDark ? DARK : LIGHT;
  const cycleT = (time % CYCLE_DURATION) / CYCLE_DURATION;

  ctx.clearRect(0, 0, w, h);

  // After submit, form shifts left to make room for right-side panels
  const submitted = cycleT > T_FLASH;
  const shiftT = submitted ? Math.min(1, (cycleT - T_FLASH) / 0.08) : 0;
  const shiftEase = 1 - Math.pow(1 - shiftT, 3);

  // Form card dimensions — shifts left after submit
  const formW = w * (submitted ? 0.48 : 0.7);
  const cardW = formW * 0.88;
  const cardH = h * 0.88;
  const cardX = lerp((w - cardW) / 2, w * 0.04, shiftEase);
  const cardY = (h - cardH) / 2;
  const radius = Math.min(cardW, cardH) * 0.06;

  drawGlow(ctx, w, h, cardX, cardY, cardW, cardH, p);
  drawCard(ctx, cardX, cardY, cardW, cardH, radius, p);
  drawHeader(ctx, cardX, cardY, cardW, cardH, dpr, p);
  drawFields(ctx, cardX, cardY, cardW, cardH, dpr, cycleT, p);
  drawCheckbox(ctx, cardX, cardY, cardW, cardH, dpr, cycleT, p);
  drawSubmitButton(ctx, cardX, cardY, cardW, cardH, radius, dpr, cycleT, time, p);
  drawSubmitFlash(ctx, cardX, cardY, cardW, cardH, radius, cycleT, p);

  // Right-side panels (after submit)
  if (submitted) {
    const rightX = cardX + cardW + w * 0.03;
    const rightW = w - rightX - w * 0.03;

    // Screen 1 fade-out alpha
    let s1Alpha = 1;
    if (cycleT >= T_S1_FADE_START) {
      s1Alpha = 1 - Math.min(1, (cycleT - T_S1_FADE_START) / (T_S1_FADE_END - T_S1_FADE_START));
    }

    // Screen 2 (attestation): shield + info — with fade-out
    if (s1Alpha > 0) {
      ctx.save();
      ctx.globalAlpha = s1Alpha;
      drawShieldBadge(ctx, rightX, rightW, cardY, cardH, cycleT, p);
      drawInfoPanel(ctx, rightX, rightW, cardY, cardH, dpr, cycleT, p);
      ctx.restore();
    }

    // Screen 3 (PDF): icon + download label + stylized PDF document
    drawPdfScreen(ctx, rightX, rightW, cardY, cardH, dpr, cycleT, p);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Layer implementations ──────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shieldPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.82);
  ctx.bezierCurveTo(s * 0.2, -s, s * 0.65, -s, s * 0.85, -s * 0.88);
  ctx.bezierCurveTo(s * 0.85, -s * 0.05, s * 0.4, s * 0.6, 0, s);
  ctx.bezierCurveTo(-s * 0.4, s * 0.6, -s * 0.85, -s * 0.05, -s * 0.85, -s * 0.88);
  ctx.bezierCurveTo(-s * 0.65, -s, -s * 0.2, -s, 0, -s * 0.82);
  ctx.closePath();
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  _w: number, _h: number,
  cardX: number, cardY: number, cardW: number, cardH: number,
  p: Palette,
) {
  const cx = cardX + cardW / 2;
  const cy = cardY + cardH / 2;
  const glowR = Math.max(cardW, cardH) * 0.8;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  grad.addColorStop(0, rgba(p.accent, p.glowAlpha));
  grad.addColorStop(0.6, rgba(p.accent, p.glowAlpha * 0.3));
  grad.addColorStop(1, rgba(p.accent, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, _w, _h);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  p: Palette,
) {
  ctx.save();
  ctx.shadowColor = rgba(p.accent, 0.1);
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = p.cardBg;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = p.cardBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  cardX: number, cardY: number, cardW: number, cardH: number,
  _dpr: number,
  p: Palette,
) {
  const fontSize = Math.max(10, cardW * 0.065);
  ctx.font = `600 ${fontSize}px "Outfit", system-ui, sans-serif`;
  ctx.fillStyle = p.textColor;
  ctx.textBaseline = 'top';
  const headerX = cardX + cardW * 0.08;
  const headerY = cardY + cardH * 0.06;
  ctx.fillText('Fill Out & Submit Form', headerX, headerY);

  const divY = headerY + fontSize * 1.6;
  ctx.beginPath();
  ctx.moveTo(cardX + cardW * 0.08, divY);
  ctx.lineTo(cardX + cardW * 0.92, divY);
  ctx.strokeStyle = p.fieldBorder;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawFields(
  ctx: CanvasRenderingContext2D,
  cardX: number, cardY: number, cardW: number, cardH: number,
  dpr: number,
  cycleT: number,
  p: Palette,
) {
  const padX = cardW * 0.08;
  const headerSpace = cardH * 0.2;
  const fieldH = cardH * 0.12;
  const fieldGap = cardH * 0.04;
  const labelSize = Math.max(7, cardW * 0.042);
  const textSize = Math.max(8, cardW * 0.048);
  const fieldW = cardW - padX * 2;
  const fieldR = fieldH * 0.25;

  const perField = T_TYPE_END / FIELDS.length;

  for (let i = 0; i < FIELDS.length; i++) {
    const field = FIELDS[i];
    const fX = cardX + padX;
    const fY = cardY + headerSpace + i * (fieldH + fieldGap);

    ctx.font = `500 ${labelSize}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = p.labelColor;
    ctx.textBaseline = 'bottom';
    ctx.fillText(field.label, fX, fY - fieldH * 0.1);

    roundRect(ctx, fX, fY, fieldW, fieldH, fieldR);
    ctx.fillStyle = p.fieldBg;
    ctx.fill();
    roundRect(ctx, fX, fY, fieldW, fieldH, fieldR);
    ctx.strokeStyle = p.fieldBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    const fieldStart = i * perField;
    const fieldEnd = fieldStart + perField;
    const fieldProgress = Math.max(0, Math.min(1, (cycleT - fieldStart) / (fieldEnd - fieldStart)));
    const charsToShow = Math.floor(fieldProgress * field.text.length);
    const visibleText = field.text.substring(0, charsToShow);

    if (visibleText.length > 0) {
      ctx.font = `400 ${textSize}px "JetBrains Mono", monospace`;
      ctx.fillStyle = p.textColor;
      ctx.textBaseline = 'middle';
      ctx.fillText(visibleText, fX + fieldH * 0.3, fY + fieldH / 2);
    }

    if (fieldProgress > 0 && fieldProgress < 1) {
      const cursorBlink = Math.sin(cycleT * 80) > 0;
      if (cursorBlink) {
        ctx.font = `400 ${textSize}px "JetBrains Mono", monospace`;
        const textW = ctx.measureText(visibleText).width;
        const cursorX = fX + fieldH * 0.3 + textW + 2;
        ctx.fillStyle = p.cursorColor;
        ctx.fillRect(cursorX, fY + fieldH * 0.25, Math.max(1, dpr), fieldH * 0.5);
      }
    }
  }
}

function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  cardX: number, cardY: number, cardW: number, cardH: number,
  dpr: number,
  cycleT: number,
  p: Palette,
) {
  const padX = cardW * 0.08;
  const checkY = cardY + cardH * 0.68;
  const boxSize = cardH * 0.06;
  const boxX = cardX + padX;
  const boxR = boxSize * 0.2;
  const labelSize = Math.max(7, cardW * 0.04);

  const checkProgress = Math.max(0, Math.min(1, (cycleT - T_TYPE_END) / (T_CHECK - T_TYPE_END)));

  roundRect(ctx, boxX, checkY, boxSize, boxSize, boxR);
  ctx.fillStyle = checkProgress > 0.5 ? p.checkColor : p.fieldBg;
  ctx.fill();
  roundRect(ctx, boxX, checkY, boxSize, boxSize, boxR);
  ctx.strokeStyle = checkProgress > 0.5 ? p.checkColor : p.fieldBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (checkProgress > 0.5) {
    ctx.save();
    ctx.strokeStyle = p.btnText;
    ctx.lineWidth = Math.max(1.5, dpr * 1.2);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(boxX + boxSize * 0.2, checkY + boxSize * 0.5);
    ctx.lineTo(boxX + boxSize * 0.42, checkY + boxSize * 0.72);
    ctx.lineTo(boxX + boxSize * 0.78, checkY + boxSize * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  ctx.font = `400 ${labelSize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = p.labelColor;
  ctx.textBaseline = 'middle';
  ctx.fillText('I confirm this document is accurate', boxX + boxSize + cardW * 0.03, checkY + boxSize / 2);
}

function drawSubmitButton(
  ctx: CanvasRenderingContext2D,
  cardX: number, cardY: number, cardW: number, cardH: number,
  _cardR: number,
  _dpr: number,
  cycleT: number,
  time: number,
  p: Palette,
) {
  const padX = cardW * 0.08;
  const btnH = cardH * 0.1;
  const btnW = cardW * 0.4; // narrower button
  const btnX = cardX + padX;
  const btnY = cardY + cardH * 0.82;
  const btnR = btnH * 0.3;
  const textSize = Math.max(9, cardW * 0.052);

  const btnReady = cycleT > T_BTN_READY;
  const btnPressed = cycleT > T_BTN_PRESS && cycleT < T_FLASH;
  const btnDone = cycleT > T_FLASH;

  if (btnReady && !btnDone) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
    ctx.save();
    ctx.shadowColor = rgba(p.accent, 0.3 * pulse);
    ctx.shadowBlur = 15;
    roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
    ctx.fillStyle = 'transparent';
    ctx.fill();
    ctx.restore();
  }

  roundRect(ctx, btnX, btnY, btnW, btnH, btnR);
  const grad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
  if (btnDone) {
    grad.addColorStop(0, p.checkColor);
    grad.addColorStop(1, p.checkColor);
  } else {
    grad.addColorStop(0, btnPressed ? p.btnGradEnd : p.btnGradStart);
    grad.addColorStop(1, btnPressed ? p.btnGradStart : p.btnGradEnd);
  }
  ctx.fillStyle = grad;
  ctx.globalAlpha = btnReady ? 1 : 0.4;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.font = `600 ${textSize}px "Outfit", system-ui, sans-serif`;
  ctx.fillStyle = p.btnText;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const label = btnDone ? 'Verified ✓' : btnPressed ? 'Submitting...' : 'Submit & Attest';
  ctx.fillText(label, btnX + btnW / 2, btnY + btnH / 2);
  ctx.textAlign = 'start';

  // Small Integra shield right-aligned on button row
  const shieldS = btnH * 0.55;
  const shieldCx = cardX + cardW - padX - shieldS * 0.5;
  const shieldCy = btnY + btnH / 2;
  ctx.save();
  ctx.translate(shieldCx, shieldCy);

  // Shield border
  shieldPath(ctx, shieldS * 1.04);
  ctx.fillStyle = p.shieldBorder;
  ctx.fill();

  // Shield body
  shieldPath(ctx, shieldS);
  ctx.fillStyle = p.shieldFill;
  ctx.fill();

  // Mini Integra logo inside
  const ls = (shieldS * 0.8) / 60;
  ctx.save();
  ctx.translate(-27 * ls, -30 * ls);
  ctx.scale(ls, ls);
  const logo = new Path2D(LOGO_PATH);
  const logoGrad = ctx.createLinearGradient(7.83, 48.99, 45.68, 11.13);
  logoGrad.addColorStop(0, '#0056F5');
  logoGrad.addColorStop(1, '#33CCF4');
  ctx.fillStyle = logoGrad;
  ctx.fill(logo);
  ctx.restore();

  ctx.restore();
}

function drawSubmitFlash(
  ctx: CanvasRenderingContext2D,
  cardX: number, cardY: number, cardW: number, cardH: number,
  cardR: number,
  cycleT: number,
  p: Palette,
) {
  if (cycleT > T_BTN_PRESS && cycleT < T_FLASH_END) {
    const flashT = (cycleT - T_BTN_PRESS) / (T_FLASH_END - T_BTN_PRESS);
    const alpha = Math.sin(flashT * Math.PI);
    ctx.save();
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.fillStyle = p.submitFlash;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// ─── Right-side panels (post-submit) ────────────────────────────

function drawShieldBadge(
  ctx: CanvasRenderingContext2D,
  rightX: number, rightW: number,
  cardY: number, _cardH: number,
  cycleT: number,
  p: Palette,
) {
  if (cycleT < T_SHIELD_START) return;
  const t = Math.min(1, (cycleT - T_SHIELD_START) / (T_SHIELD_END - T_SHIELD_START));
  const ease = 1 - Math.pow(1 - t, 3);

  const shieldSize = Math.min(rightW * 0.35, 60);
  const cx = rightX + rightW / 2;
  const cy = cardY + shieldSize * 1.2;

  ctx.save();
  ctx.globalAlpha = ease;
  ctx.translate(cx, cy);

  // Scale in
  const scale = 0.4 + 0.6 * ease;
  ctx.scale(scale, scale);

  // Shield border
  shieldPath(ctx, shieldSize * 1.04);
  ctx.fillStyle = p.shieldBorder;
  ctx.fill();

  // Shield body
  shieldPath(ctx, shieldSize);
  ctx.fillStyle = p.shieldFill;
  ctx.fill();

  // Integra logo inside
  const logoScale = (shieldSize * 0.85) / 60;
  ctx.save();
  ctx.translate(-27 * logoScale, -30 * logoScale);
  ctx.scale(logoScale, logoScale);
  const logo = new Path2D(LOGO_PATH);
  const grad = ctx.createLinearGradient(7.83, 48.99, 45.68, 11.13);
  grad.addColorStop(0, '#0056F5');
  grad.addColorStop(1, '#33CCF4');
  ctx.fillStyle = grad;
  ctx.fill(logo);
  ctx.restore();

  ctx.restore();
}

function drawInfoPanel(
  ctx: CanvasRenderingContext2D,
  rightX: number, rightW: number,
  cardY: number, cardH: number,
  dpr: number,
  cycleT: number,
  p: Palette,
) {
  if (cycleT < T_INFO_START) return;
  const t = Math.min(1, (cycleT - T_INFO_START) / (T_INFO_END - T_INFO_START));
  const ease = 1 - Math.pow(1 - t, 3);

  const panelH = cardH * 0.22;
  const panelY = cardY + cardH * 0.28;
  const r = 6 * (dpr || 1);

  ctx.save();
  ctx.globalAlpha = ease;

  // Slide up slightly
  const slideOffset = (1 - ease) * 15;

  // Panel bg
  roundRect(ctx, rightX, panelY + slideOffset, rightW, panelH, r);
  ctx.fillStyle = p.infoBg;
  ctx.fill();
  roundRect(ctx, rightX, panelY + slideOffset, rightW, panelH, r);
  ctx.strokeStyle = p.infoBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Header
  const fontSize = Math.max(7, rightW * 0.06);
  const padX = rightW * 0.08;
  let y = panelY + slideOffset + panelH * 0.12;

  ctx.font = `600 ${fontSize}px "Outfit", system-ui, sans-serif`;
  ctx.fillStyle = p.textColor;
  ctx.textBaseline = 'top';
  ctx.fillText('Verified Receipt', rightX + padX, y);
  y += fontSize * 1.8;

  // Divider
  ctx.beginPath();
  ctx.moveTo(rightX + padX, y);
  ctx.lineTo(rightX + rightW - padX, y);
  ctx.strokeStyle = p.infoBorder;
  ctx.stroke();
  y += fontSize * 0.8;

  // Hash rows
  const smallSize = Math.max(5, rightW * 0.04);
  const monoSize = Math.max(5, rightW * 0.038);
  const rows = [
    { label: 'Content Hash', value: 'a4f8c2e1b7d9...' },
    { label: 'Merkle Root', value: '7c3f91d0e8a2...' },
    { label: 'Round-Trip', value: 'e6b1a5c8f3d7...' },
    { label: 'EAS UID', value: '0x9f2d...c4e1' },
  ];

  for (const row of rows) {
    ctx.font = `500 ${smallSize}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = p.labelColor;
    ctx.fillText(row.label, rightX + padX, y);
    y += smallSize * 1.3;

    ctx.font = `400 ${monoSize}px "JetBrains Mono", monospace`;
    ctx.fillStyle = p.hashColor;
    ctx.fillText(row.value, rightX + padX, y);
    y += smallSize * 1.8;
  }

  ctx.restore();
}

function drawPdfScreen(
  ctx: CanvasRenderingContext2D,
  rightX: number, rightW: number,
  cardY: number, cardH: number,
  _dpr: number,
  cycleT: number,
  _p: Palette,
) {
  if (cycleT < T_PDF_START) return;
  const t = Math.min(1, (cycleT - T_PDF_START) / (T_PDF_END - T_PDF_START));
  const ease = 1 - Math.pow(1 - t, 3);

  ctx.save();
  ctx.globalAlpha = ease;

  const cx = rightX + rightW / 2;

  // ─── PDF file icon at top ───
  const iconH = cardH * 0.12;
  const iconW = iconH * 0.75;
  const iconX = cx - iconW / 2;
  const iconY = cardY + cardH * 0.02;
  const fold = iconW * 0.28; // corner fold size

  // File shape with folded corner
  ctx.beginPath();
  ctx.moveTo(iconX, iconY);
  ctx.lineTo(iconX + iconW - fold, iconY);
  ctx.lineTo(iconX + iconW, iconY + fold);
  ctx.lineTo(iconX + iconW, iconY + iconH);
  ctx.lineTo(iconX, iconY + iconH);
  ctx.closePath();
  ctx.fillStyle = '#dc2626';
  ctx.fill();

  // Corner fold triangle
  ctx.beginPath();
  ctx.moveTo(iconX + iconW - fold, iconY);
  ctx.lineTo(iconX + iconW - fold, iconY + fold);
  ctx.lineTo(iconX + iconW, iconY + fold);
  ctx.closePath();
  ctx.fillStyle = '#991b1b';
  ctx.fill();

  // "PDF" text on icon
  const pdfLabelSize = Math.max(6, iconW * 0.32);
  ctx.font = `800 ${pdfLabelSize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PDF', iconX + iconW / 2, iconY + iconH * 0.62);

  // "Download" text below icon
  const dlSize = Math.max(7, rightW * 0.055);
  ctx.font = `600 ${dlSize}px "Outfit", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(226, 232, 240, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Download', cx, iconY + iconH + cardH * 0.02);
  ctx.textAlign = 'start';

  // ─── Stylized PDF document below ───
  const docTopY = iconY + iconH + cardH * 0.08;
  const docH = cardY + cardH - docTopY - cardH * 0.02;
  const r = 4;
  const padX = rightW * 0.06;
  const innerW = rightW - padX * 2;

  const slideOffset = (1 - ease) * 20;
  const py = docTopY + slideOffset;

  // Document shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, rightX, py, rightW, docH, r);
  ctx.fillStyle = '#0f0f1e';
  ctx.fill();
  ctx.restore();

  // Document background
  roundRect(ctx, rightX, py, rightW, docH, r);
  ctx.fillStyle = '#0f0f1e';
  ctx.fill();
  roundRect(ctx, rightX, py, rightW, docH, r);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = py + docH * 0.04;
  const dx = rightX + padX;

  // ─── Title bar ───
  const titleH = docH * 0.07;
  roundRect(ctx, dx, y, innerW, titleH, 2);
  ctx.fillStyle = 'rgba(19, 19, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 34, 68, 0.8)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const titleSize = Math.max(4, innerW * 0.042);
  ctx.font = `700 ${titleSize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('Integra Ledger — Attestation Certificate', dx + innerW / 2, y + titleH / 2);
  ctx.textAlign = 'start';
  y += titleH + docH * 0.02;

  // ─── QR + ID block ───
  const qrBlockH = docH * 0.13;
  roundRect(ctx, dx, y, innerW, qrBlockH, 2);
  ctx.fillStyle = 'rgba(19, 19, 42, 0.7)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 34, 68, 0.5)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Mini QR placeholder
  const qrSize = qrBlockH * 0.8;
  const qrX = dx + padX * 0.5;
  const qrY = y + (qrBlockH - qrSize) / 2;
  ctx.fillStyle = '#ffffff';
  const cells = 7;
  const cellSize = qrSize / cells;
  const qrPattern = [
    1,1,1,0,1,1,1,
    1,0,1,1,1,0,1,
    1,1,1,0,1,1,1,
    0,1,0,1,0,1,0,
    1,1,1,0,1,1,1,
    1,0,1,1,1,0,1,
    1,1,1,0,1,1,1,
  ];
  for (let row = 0; row < cells; row++) {
    for (let c = 0; c < cells; c++) {
      if (qrPattern[row * cells + c]) {
        ctx.fillRect(qrX + c * cellSize, qrY + row * cellSize, cellSize * 0.85, cellSize * 0.85);
      }
    }
  }

  // ID text next to QR
  const idX = qrX + qrSize + padX * 0.8;
  const tinySize = Math.max(3, innerW * 0.028);
  const monoTiny = Math.max(3, innerW * 0.032);
  ctx.font = `400 ${tinySize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = '#646464';
  ctx.textBaseline = 'top';
  ctx.fillText('INTEGRA ID', idX, y + qrBlockH * 0.12);
  ctx.font = `700 ${monoTiny}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('ig_f99bfbce290287cd', idX, y + qrBlockH * 0.32);
  ctx.font = `400 ${tinySize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = '#646464';
  ctx.fillText('ROUND-TRIP HASH', idX, y + qrBlockH * 0.55);
  ctx.font = `400 ${tinySize}px "JetBrains Mono", monospace`;
  ctx.fillStyle = '#f59e0b';
  ctx.fillText('b93cf4d0be12ecc4f2...', idX, y + qrBlockH * 0.72);
  y += qrBlockH + docH * 0.02;

  // ─── Section bars with data rows ───
  const sections = [
    { label: '→ FORM DATA SUBMITTED', color: '#2563eb', rows: 3 },
    { label: '→ REQUEST ATTESTATION', color: '#2563eb', rows: 2 },
    { label: '← RESPONSE CAPTURED', color: '#22d3a1', rows: 2 },
    { label: '⛓ BINDING PROOF', color: '#a78bfa', rows: 1 },
    { label: 'EAS ON-CHAIN', color: '#ec4899', rows: 1 },
  ];

  const barH = Math.max(3, docH * 0.028);
  const rowH = Math.max(2.5, docH * 0.02);
  const sectionGap = docH * 0.01;
  const barLabelSize = Math.max(2.5, innerW * 0.024);
  const rowColor = 'rgba(180, 180, 180, 0.3)';

  for (const section of sections) {
    if (y + barH > py + docH - docH * 0.06) break;

    // Section header bar
    roundRect(ctx, dx, y, innerW, barH, 1);
    ctx.fillStyle = section.color;
    ctx.globalAlpha = ease * 0.2;
    ctx.fill();
    ctx.globalAlpha = ease;
    ctx.font = `700 ${barLabelSize}px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = section.color;
    ctx.textBaseline = 'middle';
    ctx.fillText(section.label, dx + padX * 0.3, y + barH / 2);
    y += barH + 1;

    // Data rows
    for (let i = 0; i < section.rows; i++) {
      if (y + rowH > py + docH - docH * 0.06) break;
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(13, 13, 28, 0.5)';
        ctx.fillRect(dx, y, innerW, rowH);
      }
      ctx.fillStyle = rowColor;
      ctx.fillRect(dx + padX * 0.3, y + rowH * 0.35, innerW * 0.15, 1);
      ctx.fillStyle = 'rgba(147, 197, 253, 0.4)';
      ctx.fillRect(dx + innerW * 0.25, y + rowH * 0.35, innerW * 0.55, 1);
      y += rowH;
    }
    y += sectionGap;
  }

  // ─── Footer ───
  const footerY = py + docH - docH * 0.05;
  ctx.beginPath();
  ctx.moveTo(dx, footerY);
  ctx.lineTo(dx + innerW, footerY);
  ctx.strokeStyle = 'rgba(34, 34, 68, 0.5)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const footSize = Math.max(2, innerW * 0.02);
  ctx.font = `400 ${footSize}px "Inter", system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(60, 60, 60, 0.8)';
  ctx.textAlign = 'center';
  ctx.fillText('Generated entirely client-side. No data transmitted.', dx + innerW / 2, footerY + docH * 0.02);
  ctx.textAlign = 'start';

  ctx.restore();
}
