/**
 * DemoPage — Full round-trip attestation demo.
 * Ported from form-registry-roundtrip-2/full-demo.html into React
 * with the app's Tailwind theme.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  sha256,
  hmacSha256,
  genSalt,
  genUid,
  truncate as T,
  computeMerkleRoot,
} from '@/utils/crypto';
import * as Auth from '@/utils/integra-auth';
import type { SignResult } from '@/utils/integra-auth';
import { GradientText } from '@/components/common/GradientText';

// ─── Types ──────────────────────────────────────────────────────

interface LogEntry {
  time: string;
  event: string;
  detail: string;
  cls: string;
}

interface EAS {
  uid: string;
  schema: string;
  attester: string;
  chain: string;
  explorerUrl: string;
  timestamp: number;
  revocable: boolean;
}

interface Attestation {
  fields: Record<string, string>;
  fieldHashes: Record<string, string>;
  salt: string;
  merkleRoot: string;
  requestHash: string;
  responseHash: string;
  headersHash: string;
  capturedHeaders: Record<string, string>;
  response: { status: number; statusText: string };
  serverSig: string | null;
  sigHeader: string | null;
  requestId: string | null;
  reqIdHeader: string | null;
  recordId: string | null;
  recordIdField: string | null;
  roundTripHash: string;
  integraId: string;
  timestamp: string;
  responseTimestamp: string;
  latencyMs: number;
  eas: EAS;
  components: string[];
  bodySize: number;
  sigResult: SignResult | null;
}

// ─── Helpers ────────────────────────────────────────────────────

function now() {
  return new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function simulateEAS(): EAS {
  const uid =
    '0x' +
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  return {
    uid,
    schema:
      '0x' +
      Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
        b.toString(16).padStart(2, '0'),
      ).join(''),
    attester: '0x7a3B...4f2E',
    chain: 'Ethereum Sepolia',
    explorerUrl: `https://sepolia.easscan.org/attestation/view/${uid}`,
    timestamp: Math.floor(Date.now() / 1000),
    revocable: true,
  };
}

const SIG_HEADERS = [
  'x-signature',
  'x-hmac-signature',
  'signature',
  'x-hub-signature-256',
  'stripe-signature',
  'digest',
  'content-digest',
];
const ID_HEADERS = [
  'x-request-id',
  'x-correlation-id',
  'x-amzn-requestid',
  'cf-ray',
  'x-vercel-id',
  'x-trace-id',
  'traceparent',
];
const ALL_HEADERS = [
  'server',
  'date',
  'etag',
  'last-modified',
  'content-type',
  'content-length',
  'x-powered-by',
  'access-control-allow-origin',
  'x-processed-time',
  ...SIG_HEADERS,
  ...ID_HEADERS,
];

const LOG_COLORS: Record<string, string> = {
  e: 'text-emerald-400',
  w: 'text-amber-400',
  r: 'text-sky-300',
  d: 'text-muted-foreground/50',
  p: 'text-violet-400',
  pk: 'text-pink-400',
};

// ─── Shield drawing ─────────────────────────────────────────────

function drawShieldPath(ctx: CanvasRenderingContext2D, s: number) {
  // Classic shield: shallow top dip, straight sides, tapers to point
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.82);
  // gentle curve to right top corner
  ctx.bezierCurveTo(s * 0.2, -s, s * 0.65, -s, s * 0.85, -s * 0.88);
  // right side — stays straight, then curves to bottom point
  ctx.bezierCurveTo(s * 0.85, -s * 0.05, s * 0.4, s * 0.6, 0, s);
  // left side — mirror
  ctx.bezierCurveTo(-s * 0.4, s * 0.6, -s * 0.85, -s * 0.05, -s * 0.85, -s * 0.88);
  // left top corner back to center dip
  ctx.bezierCurveTo(-s * 0.65, -s, -s * 0.2, -s, 0, -s * 0.82);
  ctx.closePath();
}

const INTEGRA_LOGO_PATH =
  'M53.2,16.8L27.7,1.2C27.5,1.1,27.2,1,27,1c-0.3,0-0.5,0.1-0.8,0.2L0.7,16.8C0.3,17,0,17.5,0,18v23.6' +
  'c0,0.5,0.3,1,0.7,1.3l25.5,15.9c0.2,0.2,0.5,0.2,0.8,0.2c0.3,0,0.6-0.1,0.8-0.2l25.5-15.9' +
  'c0.4-0.3,0.7-0.8,0.7-1.3V18C53.9,17.5,53.7,17,53.2,16.8z M27,32.1l-2.3-1.4l-2.9,1.8l3.7,2.3v20.1L4.4,41.7L27,27.9l2.3,1.4' +
  'l2.9-1.8l-3.7-2.2V5.2l21.1,12.9L27,32.1z M16.6,29.2l2.9-1.8L4.4,18.1L25.5,5.2v20.1L3,39V20.7L16.6,29.2z M50.9,39l-13.6-8.3' +
  'l-2.9,1.8l15.1,9.2L28.5,54.8V34.7l22.5-14V39z';

/**
 * Draw shield with Integra logo always visible.
 * glowProgress 0→1 animates a verification glow around the shield.
 */
function drawShield(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  glowProgress = 0,
) {
  const isDark = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) * 0.4;

  ctx.save();
  ctx.translate(cx, cy - s * 0.05);

  // Outer glow — grows brighter on attestation
  if (glowProgress > 0) {
    const ease = 1 - Math.pow(1 - glowProgress, 3);
    drawShieldPath(ctx, s * (1.06 + ease * 0.06));
    ctx.fillStyle = `rgba(0, 86, 245, ${ease * 0.35})`;
    ctx.fill();
  }

  // Shield border
  drawShieldPath(ctx, s * 1.04);
  const borderColor = glowProgress > 0
    ? `rgba(51, 204, 244, ${0.3 + glowProgress * 0.5})`
    : isDark ? '#1e293b' : '#cbd5e1';
  ctx.fillStyle = borderColor;
  ctx.fill();

  // Black shield body
  drawShieldPath(ctx, s);
  ctx.fillStyle = '#0a0a1a';
  ctx.fill();

  // Integra logo — always visible
  const logoScale = (s * 0.85) / 60;
  ctx.save();
  ctx.translate(-27 * logoScale, -30 * logoScale);
  ctx.scale(logoScale, logoScale);
  const logo = new Path2D(INTEGRA_LOGO_PATH);
  const grad = ctx.createLinearGradient(7.83, 48.99, 45.68, 11.13);
  grad.addColorStop(0, '#0056F5');
  grad.addColorStop(1, '#33CCF4');
  ctx.fillStyle = grad;
  ctx.fill(logo);
  ctx.restore();

  ctx.restore();
}

// ─── Component ──────────────────────────────────────────────────

export function DemoPage() {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      time: '[init]',
      event: 'ready',
      detail:
        'client-side attestation armed · pdf via jsPDF · nothing leaves machine',
      cls: 'e',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'api' | 'key' | 'wal'>('api');
  const [authSession, setAuthSession] = useState(Auth.getSession());
  const [authErr, setAuthErr] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Form refs
  const apiKeyRef = useRef<HTMLInputElement>(null);
  const apiNameRef = useRef<HTMLInputElement>(null);
  const passphraseRef = useRef<HTMLInputElement>(null);

  const log = useCallback(
    (event: string, detail: string, cls = 'e') => {
      setLogs((prev) => [...prev, { time: now(), event, detail, cls }]);
    },
    [],
  );

  // Draw shield initially; crossfade to QR code after attestation
  const qrOffscreen = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!attestation) {
      drawShield(ctx, canvas.width, canvas.height, 0);
      return;
    }

    // Generate QR to offscreen canvas first
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    qrOffscreen.current = offscreen;

    const qrUrl = `integra://attest/${attestation.integraId}?h=${attestation.roundTripHash.slice(0, 12)}&m=${attestation.merkleRoot.slice(0, 12)}`;
    // Get QR module data for pixel animation
    const qrObj = QRCode.create(qrUrl, { errorCorrectionLevel: 'M' });
    const modCount = qrObj.modules.size;
    const modData = qrObj.modules.data;
    const margin = 1;
    const total = modCount + margin * 2;
    const modSize = canvas.width / total;
    const ctr = canvas.width / 2;

    // Build module list with distance from center
    const mods: { x: number; y: number; dist: number }[] = [];
    for (let r = 0; r < modCount; r++) {
      for (let c = 0; c < modCount; c++) {
        if (modData[r * modCount + c]) {
          const x = (c + margin) * modSize;
          const y = (r + margin) * modSize;
          const dx = x + modSize / 2 - ctr;
          const dy = y + modSize / 2 - ctr;
          mods.push({ x, y, dist: Math.sqrt(dx * dx + dy * dy) });
        }
      }
    }
    const maxDist = Math.max(...mods.map((m) => m.dist), 1);

    // Logo center exclusion zone
    const logoRadius = canvas.width * 0.13;

    // Phase 1: shield fades out (0-400ms), Phase 2: QR pixels animate in (200-1400ms)
    const start = performance.now();
    let raf = 0;
    function animate(now: number) {
      const elapsed = now - start;
      const w = canvas!.width;
      const h = canvas!.height;

      const isDark = document.documentElement.classList.contains('dark');
      const bg = isDark ? '#0f172a' : '#f1f5f9';
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      // Shield fade-out (0–400ms)
      const shieldT = Math.min(elapsed / 400, 1);
      if (shieldT < 1) {
        ctx!.save();
        ctx!.globalAlpha = 1 - shieldT;
        drawShield(ctx!, w, h, 0);
        ctx!.restore();
      }

      // QR dark background fade in (200–600ms)
      const bgT = Math.max(0, Math.min((elapsed - 200) / 400, 1));
      if (bgT > 0) {
        ctx!.save();
        ctx!.globalAlpha = bgT;
        ctx!.fillStyle = '#0f172a';
        ctx!.fillRect(0, 0, w, h);
        ctx!.restore();
      }

      // QR modules animate in radially (300–1400ms)
      const pixelStart = 300;
      const pixelDuration = 1100;
      if (elapsed > pixelStart) {
        const pt = (elapsed - pixelStart) / pixelDuration;
        for (const m of mods) {
          // Skip modules in the logo center zone
          const dx = m.x + modSize / 2 - ctr;
          const dy = m.y + modSize / 2 - ctr;
          if (Math.sqrt(dx * dx + dy * dy) < logoRadius) continue;

          const delay = (m.dist / maxDist) * 0.6;
          const mt = Math.max(0, Math.min((pt - delay) / 0.4, 1));
          if (mt > 0) {
            const ease = 1 - Math.pow(1 - mt, 2);
            const scale = ease;
            const size = modSize * scale;
            const off = (modSize - size) / 2;
            ctx!.fillStyle = '#ffffff';
            ctx!.fillRect(m.x + off, m.y + off, size, size);
          }
        }
      }

      // Logo in center fades in (800–1200ms)
      const logoT = Math.max(0, Math.min((elapsed - 800) / 400, 1));
      if (logoT > 0) {
        ctx!.save();
        ctx!.globalAlpha = logoT;
        // Dark circle behind logo
        ctx!.beginPath();
        ctx!.arc(ctr, ctr, logoRadius * 1.2, 0, Math.PI * 2);
        ctx!.fillStyle = '#0f172a';
        ctx!.fill();
        // Draw Integra logo
        const logoViewSize = logoRadius * 1.8;
        const ls = logoViewSize / 60;
        ctx!.translate(ctr - 27 * ls, ctr - 30 * ls);
        ctx!.scale(ls, ls);
        const logo = new Path2D(INTEGRA_LOGO_PATH);
        const grad = ctx!.createLinearGradient(7.83, 48.99, 45.68, 11.13);
        grad.addColorStop(0, '#0056F5');
        grad.addColorStop(1, '#33CCF4');
        ctx!.fillStyle = grad;
        ctx!.fill(logo);
        ctx!.restore();
      }

      if (elapsed < 1400) {
        raf = requestAnimationFrame(animate);
      } else {
        // Store final QR state to offscreen for PDF export
        offscreen.width = canvas!.width;
        offscreen.height = canvas!.height;
        const oCtx = offscreen.getContext('2d')!;
        oCtx.drawImage(canvas!, 0, 0);
      }
    }
    raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(raf);
  }, [attestation]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  // ─── Auth handlers ─────────────────────────────────────

  async function handleApiSignIn() {
    const k = apiKeyRef.current?.value.trim();
    if (!k) {
      setAuthErr('Enter API key');
      return;
    }
    await Auth.signInWithApiKey(
      k,
      null,
      apiNameRef.current?.value.trim() || null,
    );
    setAuthSession(Auth.getSession());
    setAuthOpen(false);
    setAuthErr('');
    const s = Auth.getSession();
    log('AUTH', '✅ Signed in: ' + s?.displayName + ' (' + s?.algorithm + ')');
  }

  async function handleKeySignIn() {
    const p = passphraseRef.current?.value;
    if (!p) {
      setAuthErr('Enter passphrase');
      return;
    }
    await Auth.signInWithKeypair(p);
    setAuthSession(Auth.getSession());
    setAuthOpen(false);
    setAuthErr('');
    const s = Auth.getSession();
    log('AUTH', '✅ Signed in: ' + s?.displayName + ' (' + s?.algorithm + ')');
  }

  async function handleWalletSignIn() {
    try {
      await Auth.signInWithWallet();
      setAuthSession(Auth.getSession());
      setAuthOpen(false);
    } catch (e: unknown) {
      setAuthErr((e as Error).message);
    }
  }

  function handleSignOut() {
    Auth.signOut();
    setAuthSession(null);
    setAuthOpen(false);
    log('AUTH', 'Signed out', 'w');
  }

  // ─── Main submit ───────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const t0 = performance.now();
    const timestamp = new Date().toISOString();

    // Phase 1: Hash request
    log('PHASE 1', '→ Hashing form fields', 'w');
    const formData = new FormData(e.currentTarget);
    const fields: Record<string, string> = {};
    for (const [k, v] of formData.entries()) {
      if (typeof v === 'string') fields[k] = v;
    }

    const salt = genSalt();
    const fieldHashes: Record<string, string> = {};
    for (const name of Object.keys(fields).sort()) {
      fieldHashes[name] = await hmacSha256(salt, `${name}:${fields[name]}`);
      log('  hash', `${name} → ${fieldHashes[name].slice(0, 20)}…`, 'r');
    }

    const leaves = Object.values(fieldHashes);
    const merkleRoot = await computeMerkleRoot(leaves);
    const requestHash = await sha256(
      JSON.stringify(fields, Object.keys(fields).sort()),
    );
    log('  content_hash', requestHash.slice(0, 32) + '…', 'r');
    log('  merkle_root', merkleRoot.slice(0, 32) + '…', 'r');

    // Phase 2: Submit
    log('PHASE 2', '→ POST httpbin.org/post', 'w');
    let response: Response;
    let responseBytes: ArrayBuffer;
    let responseText: string;
    try {
      response = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(fields).toString(),
      });
      const clone = response.clone();
      responseBytes = await clone.arrayBuffer();
      responseText = new TextDecoder().decode(responseBytes);
    } catch (err) {
      log('ERROR', (err as Error).message, 'w');
      setSubmitting(false);
      return;
    }

    const latencyMs = Math.round(performance.now() - t0);
    log(
      '  status',
      `${response.status} ${response.statusText} (${responseBytes.byteLength}B, ${latencyMs}ms)`,
    );

    // Phase 3: Hash response
    log('PHASE 3', '← Capturing server response', 'w');
    const responseHash = await sha256(new Uint8Array(responseBytes));
    log('  body_hash', responseHash.slice(0, 32) + '…', 'r');

    const capturedHeaders: Record<string, string> = {};
    for (const h of ALL_HEADERS) {
      const v = response.headers.get(h);
      if (v) capturedHeaders[h] = v;
    }
    try {
      response.headers.forEach((v, k) => {
        if (!capturedHeaders[k.toLowerCase()])
          capturedHeaders[k.toLowerCase()] = v;
      });
    } catch { /* noop */ }

    for (const [k, v] of Object.entries(capturedHeaders))
      log('  hdr', `${k}: ${T(v, 55)}`, 'r');
    const headersHash = await sha256(
      JSON.stringify(capturedHeaders, Object.keys(capturedHeaders).sort()),
    );

    let serverSig: string | null = null;
    let sigHeader: string | null = null;
    for (const h of SIG_HEADERS) {
      const v = response.headers.get(h);
      if (v) {
        serverSig = v;
        sigHeader = h;
        break;
      }
    }
    let requestId: string | null = null;
    let reqIdHeader: string | null = null;
    for (const h of ID_HEADERS) {
      const v = response.headers.get(h);
      if (v) {
        requestId = v;
        reqIdHeader = h;
        break;
      }
    }
    let recordId: string | null = null;
    let recordIdField: string | null = null;
    try {
      const j = JSON.parse(responseText);
      for (const f of ['id', 'url', 'recordId', 'ticketId']) {
        if (j[f] != null) {
          recordId = String(j[f]);
          recordIdField = f;
          break;
        }
      }
    } catch { /* noop */ }

    if (serverSig) log('  SIG', `✅ ${sigHeader}: ${T(serverSig, 40)}`);
    else log('  SIG', '⚠ Server unsigned', 'w');
    if (requestId) log('  REQ_ID', `${reqIdHeader}: ${requestId}`);
    if (recordId) log('  REC_ID', `${recordIdField}: ${T(recordId, 50)}`, 'p');

    // Phase 4: Bind
    log('PHASE 4', '⛓ Binding request ↔ response', 'w');
    const responseTimestamp = new Date().toISOString();
    const components = [
      requestHash,
      responseHash,
      headersHash,
      String(response.status),
      serverSig || 'unsigned',
      requestId || 'no-req-id',
      recordId || 'no-record-id',
      timestamp,
      responseTimestamp,
    ];
    const roundTripHash = await sha256(components.join('|'));
    const integraId = genUid();
    log('  ROUND_TRIP', '🔗 ' + roundTripHash.slice(0, 40) + '…', 'w');
    log('  INTEGRA_ID', integraId);

    // Phase 5: EAS
    log('PHASE 5', '🔗 Registering on EAS (Ethereum Attestation Service)', 'pk');
    const eas = simulateEAS();
    log('  EAS_UID', eas.uid.slice(0, 42) + '…', 'pk');
    log('  CHAIN', eas.chain, 'pk');

    // Phase 6: Sign
    let sigResult: SignResult | null = null;
    if (Auth.isSignedIn()) {
      log(
        'PHASE 6',
        '🔏 Signing payload with ' + Auth.getSession()!.algorithm,
        'w',
      );
      const signable = Auth.buildSignablePayload({
        integraId,
        roundTripHash,
        requestHash,
        responseHash,
        merkleRoot,
        timestamp,
      });
      sigResult = await Auth.signPayload(signable);
      log('  SIGNATURE', sigResult.signature.slice(0, 40) + '…');
      log('  SIGNED_BY', sigResult.signedBy);
    } else {
      log('PHASE 6', '⚠ Not signed in — attestation is unsigned', 'w');
    }

    const att: Attestation = {
      fields,
      fieldHashes,
      salt,
      merkleRoot,
      requestHash,
      responseHash,
      headersHash,
      capturedHeaders,
      response: { status: response.status, statusText: response.statusText },
      serverSig,
      sigHeader,
      requestId,
      reqIdHeader,
      recordId,
      recordIdField,
      roundTripHash,
      integraId,
      timestamp,
      responseTimestamp,
      latencyMs,
      eas,
      components,
      bodySize: responseBytes.byteLength,
      sigResult,
    };
    setAttestation(att);
    setSubmitting(false);
    log(
      'DONE',
      '✅ Full round-trip attested' +
        (sigResult
          ? ' · 🔏 SIGNED by ' + sigResult.displayName
          : ' · ⚠ unsigned') +
        ' · PDF ready',
    );
  }

  // ─── PDF generation ────────────────────────────────────

  async function handlePDF() {
    if (!attestation) return;
    const a = attestation;
    log('PDF', 'Generating attestation certificate locally…', 'w');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pw = 210;
    const ph = 297;
    let y = 0;

    const DARK: [number, number, number] = [15, 15, 30];
    const CARD: [number, number, number] = [19, 19, 42];
    const BORDER: [number, number, number] = [34, 34, 68];
    const BLUE: [number, number, number] = [37, 99, 235];
    const GREEN: [number, number, number] = [34, 211, 153];
    const AMBER: [number, number, number] = [245, 158, 11];
    const PINK: [number, number, number] = [236, 72, 153];
    const WHITE: [number, number, number] = [255, 255, 255];
    const GRAY: [number, number, number] = [100, 100, 100];
    const LGRAY: [number, number, number] = [180, 180, 180];

    doc.setFillColor(...DARK);
    doc.rect(0, 0, pw, ph, 'F');

    // Header
    y = 12;
    doc.setFillColor(...CARD);
    doc.roundedRect(10, y, pw - 20, 22, 3, 3, 'F');
    doc.setDrawColor(...BORDER);
    doc.roundedRect(10, y, pw - 20, 22, 3, 3, 'S');
    doc.setFontSize(16);
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.text('Integra Ledger — Attestation Certificate', pw / 2, y + 9, {
      align: 'center',
    });
    doc.setFontSize(8);
    doc.setTextColor(...LGRAY);
    doc.text(
      `Generated locally on ${new Date().toLocaleString()} · Never transmitted`,
      pw / 2,
      y + 16,
      { align: 'center' },
    );

    // QR Code
    let qrData = '';
    if (qrRef.current) {
      qrData = qrRef.current.toDataURL('image/png');
    }

    y = 38;
    doc.setFillColor(...CARD);
    doc.roundedRect(10, y, pw - 20, 36, 3, 3, 'F');
    doc.setDrawColor(...BORDER);
    doc.roundedRect(10, y, pw - 20, 36, 3, 3, 'S');
    if (qrData) doc.addImage(qrData, 'PNG', 14, y + 2, 32, 32);

    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('INTEGRA ID', 52, y + 7);
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.setFont('courier', 'bold');
    doc.text(a.integraId, 52, y + 13);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text('ROUND-TRIP HASH', 52, y + 19);
    doc.setFontSize(7);
    doc.setTextColor(...AMBER);
    doc.setFont('courier', 'normal');
    doc.text(a.roundTripHash, 52, y + 24);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text('EAS ATTESTATION UID', 52, y + 30);
    doc.setFontSize(6);
    doc.setTextColor(...PINK);
    doc.setFont('courier', 'normal');
    doc.text(T(a.eas.uid, 72), 52, y + 34);

    // Form Data table
    y = 78;
    doc.setFillColor(20, 20, 50);
    doc.roundedRect(10, y, pw - 20, 4, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text('→ FORM DATA SUBMITTED', 14, y + 3);
    y += 7;

    const fieldKeys = Object.keys(a.fields).sort();
    doc.setFontSize(6.5);
    doc.setFillColor(15, 15, 35);
    doc.rect(10, y, pw - 20, 5, 'F');
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.text('Field', 14, y + 3.5);
    doc.text('Value', 60, y + 3.5);
    doc.text('HMAC-SHA256 Hash', 120, y + 3.5);
    y += 6;

    doc.setFont('courier', 'normal');
    for (let i = 0; i < fieldKeys.length; i++) {
      const k = fieldKeys[i];
      if (i % 2 === 0) {
        doc.setFillColor(13, 13, 28);
        doc.rect(10, y, pw - 20, 5, 'F');
      }
      doc.setTextColor(...LGRAY);
      doc.text(k, 14, y + 3.5);
      doc.setTextColor(...WHITE);
      doc.text(T(a.fields[k], 30), 60, y + 3.5);
      doc.setTextColor(147, 197, 253);
      doc.text(T(a.fieldHashes[k], 44), 120, y + 3.5);
      y += 5;
    }
    y += 2;

    // Request hashes
    doc.setFillColor(20, 20, 50);
    doc.roundedRect(10, y, pw - 20, 4, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...BLUE);
    doc.setFont('helvetica', 'bold');
    doc.text('→ REQUEST ATTESTATION', 14, y + 3);
    y += 7;

    const reqRows = [
      ['Content Hash', a.requestHash],
      ['Merkle Root', a.merkleRoot],
      ['Salt', a.salt],
      ['Field Count', String(fieldKeys.length)],
      ['Sent At', a.timestamp],
    ];
    doc.setFontSize(6.5);
    for (const [label, val] of reqRows) {
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y + 3);
      doc.setTextColor(147, 197, 253);
      doc.setFont('courier', 'normal');
      doc.text(val, 55, y + 3);
      y += 4.5;
    }
    y += 2;

    // Response
    doc.setFillColor(15, 40, 25);
    doc.roundedRect(10, y, pw - 20, 4, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GREEN);
    doc.setFont('helvetica', 'bold');
    doc.text('← RESPONSE CAPTURED', 14, y + 3);
    y += 7;

    const respRows = [
      ['HTTP Status', `${a.response.status} ${a.response.statusText}`],
      ['Body Hash', a.responseHash],
      ['Body Size', `${a.bodySize.toLocaleString()} bytes`],
      ['Headers Hash', a.headersHash],
      ['Latency', `${a.latencyMs}ms`],
      ['Received At', a.responseTimestamp],
    ];
    doc.setFontSize(6.5);
    for (const [label, val] of respRows) {
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y + 3);
      doc.setTextColor(...GREEN);
      doc.setFont('courier', 'normal');
      doc.text(val, 55, y + 3);
      y += 4.5;
    }
    y += 2;

    // Binding
    if (y > 250) {
      doc.addPage();
      y = 12;
      doc.setFillColor(...DARK);
      doc.rect(0, 0, pw, ph, 'F');
    }
    doc.setFillColor(30, 15, 40);
    doc.roundedRect(10, y, pw - 20, 4, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setTextColor(167, 139, 250);
    doc.setFont('helvetica', 'bold');
    doc.text('⛓ BINDING PROOF', 14, y + 3);
    y += 7;

    doc.setFontSize(6.5);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.text('Round-Trip Hash', 14, y + 3);
    doc.setTextColor(...AMBER);
    doc.setFont('courier', 'bold');
    doc.text(a.roundTripHash, 55, y + 3);
    y += 5;
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.text('Integra ID', 14, y + 3);
    doc.setTextColor(...WHITE);
    doc.setFont('courier', 'bold');
    doc.text(a.integraId, 55, y + 3);
    y += 8;

    // EAS
    doc.setFillColor(40, 15, 30);
    doc.roundedRect(10, y, pw - 20, 4, 1, 1, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...PINK);
    doc.setFont('helvetica', 'bold');
    doc.text('EAS ON-CHAIN REGISTRATION', 14, y + 3);
    y += 7;

    const easRows = [
      ['Attestation UID', a.eas.uid],
      ['Chain', a.eas.chain],
      ['Attester', a.eas.attester],
    ];
    doc.setFontSize(6.5);
    for (const [label, val] of easRows) {
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, y + 3);
      doc.setTextColor(...PINK);
      doc.setFont('courier', 'normal');
      doc.text(T(val, 80), 55, y + 3);
      y += 4.5;
    }
    y += 4;

    // Footer
    doc.setDrawColor(...BORDER);
    doc.line(10, y, pw - 10, y);
    y += 4;
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'This certificate was generated entirely client-side. No data was transmitted.',
      pw / 2,
      y + 2,
      { align: 'center' },
    );

    doc.save(`integra-attestation-${a.integraId}.pdf`);
    log('PDF', `✅ Saved: integra-attestation-${a.integraId}.pdf`, 'e');
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-3">
            <GradientText as="span">Form Engine</GradientText> Running on Any Website with One Line of Code
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            Submit → capture response → hash both sides → generate PDF locally.
            Nothing leaves your machine.
          </p>
          <div className="inline-block bg-black/40 border border-white/10 rounded-lg px-4 py-2 font-mono text-xs text-emerald-400">
            {'<script src="https://cdn.integraledger.com/attest.js"></script>'}
          </div>
        </div>

        {/* Browser chrome window */}
        <div className="rounded-xl border border-white/20 overflow-hidden shadow-2xl mb-6">
          {/* Browser title bar */}
          <div className="bg-[#1e1e2e] border-b border-white/10 px-4 py-2.5 flex items-center gap-3">
            {/* Traffic lights */}
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            {/* URL bar */}
            <div className="flex-1 flex justify-center">
              <div className="bg-black/30 border border-white/10 rounded-md px-4 py-1 text-xs text-white/50 font-mono flex items-center gap-1.5 min-w-[280px]">
                <svg className="w-3 h-3 text-green-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                <span className="text-white/70">acme.com</span><span>/client-intake</span>
              </div>
            </div>
            <div className="w-[52px]" /> {/* spacer to balance traffic lights */}
          </div>

          {/* Browser page content */}
          <div className="bg-[#0d0d1a]">
            {/* Page title inside browser */}
            <div className="px-6 pt-5 pb-3">
              <h2 className="text-xl font-bold text-white">ACME Corp Client Intake Form</h2>
              <p className="text-xs text-white/40 mt-0.5">Secured with Integra Ledger blockchain attestation</p>
            </div>

            {/* Form Card */}
            <div className="mx-4 mb-4 card-enhanced overflow-hidden">
          <div className="p-4">
            {/* Auth bar */}
            <div className="flex items-center gap-2 py-2 border-b border-border/50 mb-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${authSession ? 'bg-emerald-400/20 text-emerald-400' : 'bg-card text-muted-foreground/50'}`}
              >
                {authSession
                  ? authSession.method === 'wallet'
                    ? '⟠'
                    : authSession.method === 'keypair'
                      ? '🔑'
                      : '🔐'
                  : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[10px] font-semibold ${authSession ? 'text-emerald-400' : 'text-muted-foreground/50'}`}
                >
                  {authSession?.displayName || 'Not signed in'}
                </div>
                <div className="text-[8px] text-muted-foreground/40">
                  {authSession
                    ? `${authSession.algorithm} · ${authSession.publicKey.slice(0, 20)}…`
                    : 'Attestations will be unsigned'}
                </div>
              </div>
              <button
                type="button"
                onClick={authSession ? handleSignOut : () => setAuthOpen(!authOpen)}
                className={`text-[9px] font-semibold px-3 py-1 rounded-md ${authSession ? 'bg-card text-muted-foreground' : 'bg-primary text-primary-foreground'}`}
              >
                {authSession ? 'Sign Out' : 'Sign In'}
              </button>
            </div>

            {/* Auth panel */}
            {authOpen && (
              <div className="py-2 border-b border-border/50 mb-3">
                <div className="flex gap-1 mb-2">
                  {(['api', 'key', 'wal'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setAuthTab(tab)}
                      className={`flex-1 py-1.5 text-[9px] font-semibold rounded-md border transition-colors ${authTab === tab ? 'border-primary bg-primary/10 text-sky-300' : 'border-border bg-background text-muted-foreground'}`}
                    >
                      {tab === 'api'
                        ? 'API Key'
                        : tab === 'key'
                          ? 'Keypair'
                          : 'Wallet'}
                    </button>
                  ))}
                </div>
                {authTab === 'api' && (
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                      API Key
                    </label>
                    <input
                      ref={apiKeyRef}
                      type="password"
                      defaultValue="ik_live_demo_key_12345"
                      placeholder="ik_live_…"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                    />
                    <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                      Display Name
                    </label>
                    <input
                      ref={apiNameRef}
                      type="text"
                      defaultValue="Jane Doe"
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleApiSignIn}
                      className="w-full py-2 text-[10px] font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white"
                    >
                      Sign In with API Key
                    </button>
                  </div>
                )}
                {authTab === 'key' && (
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                      Passphrase
                    </label>
                    <input
                      ref={passphraseRef}
                      type="password"
                      placeholder="Encrypts your private key locally"
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleKeySignIn}
                      className="w-full py-2 text-[10px] font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 text-white"
                    >
                      Generate / Unlock Keypair
                    </button>
                  </div>
                )}
                {authTab === 'wal' && (
                  <div>
                    <button
                      onClick={handleWalletSignIn}
                      className="w-full py-2 text-[10px] font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white"
                    >
                      Connect MetaMask
                    </button>
                    <div className="text-[8px] text-muted-foreground/40 mt-1">
                      Requires browser wallet extension
                    </div>
                  </div>
                )}
                {authErr && (
                  <div className="text-[9px] text-red-400 mt-1">{authErr}</div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    defaultValue="Jane"
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    defaultValue="Doe"
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue="jane@acmelegal.com"
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Phone
                  </label>
                  <input
                    name="phone"
                    defaultValue="+1-555-0142"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
              <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                Company
              </label>
              <input
                name="company"
                defaultValue="Acme Legal LLC"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-x-3">
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Case Type
                  </label>
                  <select
                    name="caseType"
                    defaultValue="rwa"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  >
                    <option value="contract">Contract Review</option>
                    <option value="rwa">RWA Tokenization</option>
                    <option value="attestation">Document Attestation</option>
                    <option value="ip">IP Protection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                    Priority
                  </label>
                  <select
                    name="priority"
                    defaultValue="expedited"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-2 focus:border-primary focus:outline-none"
                  >
                    <option value="standard">Standard</option>
                    <option value="expedited">Expedited</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <label className="block text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider mb-0.5">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                defaultValue="Tokenize $12M commercial real estate portfolio across 3 properties."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground mb-3 focus:border-primary focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-1.5 rounded-lg text-xs font-semibold border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-wait"
                >
                  {submitting ? 'Attesting…' : 'Submit & Attest'}
                </button>
                {attestation && (
                  <>
                    <button
                      type="button"
                      onClick={handlePDF}
                      className="px-5 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/40 bg-transparent text-violet-400 hover:bg-violet-500/10 transition-colors"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawerOpen(true)}
                      className="px-5 py-1.5 rounded-lg text-xs font-semibold border border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors"
                    >
                      View Info
                    </button>
                  </>
                )}
              </div>
            </form>

            {/* Badge / Shield — right-aligned */}
            <div className="flex justify-end items-center gap-3 pt-3 mt-3 border-t border-border/50">
              <div className="text-right">
                <div className={`text-xs font-semibold ${attestation ? 'text-emerald-400' : submitting ? 'text-primary' : 'text-muted-foreground/50'}`}>
                  {attestation ? 'Attested ✓' : submitting ? 'Attesting…' : 'Trust with Integra Enabled'}
                </div>
                <div className="text-[10px] text-foreground/80 mt-0.5">
                  {attestation ? `Scan to verify · ${attestation.integraId}` : 'Submit to attest'}
                </div>
                {attestation && (
                  <div className="text-[10px] text-primary/70 mt-1 cursor-pointer hover:text-primary transition-colors" onClick={() => setDrawerOpen(true)}>
                    Scan or Click QR Code to View Verification Info
                  </div>
                )}
              </div>
              <canvas
                ref={qrRef}
                width={100}
                height={100}
                className={`rounded-lg ${attestation ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 transition-shadow' : ''}`}
                onClick={() => { if (attestation) setDrawerOpen(true); }}
              />
            </div>
          </div>
        </div>
          </div> {/* end browser page content */}
        </div> {/* end browser chrome window */}

        <p className="text-xs text-muted-foreground/60 text-center mt-4">
          Uses the website SSL cert in the Integra Ledger verified record
        </p>

      </div>

      {/* Right sliding drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/40 animate-drawer-backdrop" />
          <div
            className="absolute top-0 right-0 h-full w-full max-w-lg bg-card/95 backdrop-blur-md border-l border-border/50 overflow-y-auto animate-drawer-in"
            style={{ boxShadow: '-20px 0 60px rgba(0,0,0,0.6), -8px 0 24px rgba(0,0,0,0.4), -2px 0 8px rgba(0,0,0,0.2)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border/50">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold">Attestation Details</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
                >
                  ✕
                </button>
              </div>
              {attestation && (
                <div className="px-4 pb-3 flex justify-center">
                  <button
                    onClick={handlePDF}
                    className="px-6 py-1.5 rounded-lg text-xs font-semibold border border-violet-500/40 bg-transparent text-violet-400 hover:bg-violet-500/10 transition-colors"
                  >
                    Download PDF
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 space-y-4">
              {/* Receipt */}
              {attestation && (
                <>
                  {/* Request */}
                  <div className="card-enhanced overflow-hidden">
                    <div className="px-4 py-2 border-b border-border/50 text-xs font-bold">
                      → Request Attestation
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-sky-300 mb-2">
                        Hashed Fields
                      </div>
                      <Row label="Content Hash" value={T(attestation.requestHash, 48)} mono />
                      <Row label="Merkle Root" value={T(attestation.merkleRoot, 48)} mono />
                      <Row
                        label="Fields"
                        value={`${Object.keys(attestation.fields).length} hashed · HMAC-SHA256 · salt: ${T(attestation.salt, 16)}`}
                      />
                      <Row
                        label="Sent At"
                        value={new Date(attestation.timestamp).toLocaleString()}
                      />
                    </div>
                  </div>

                  {/* Response */}
                  <div className="card-enhanced overflow-hidden">
                    <div className="px-4 py-2 border-b border-border/50 text-xs font-bold">
                      ← Response Capture
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-2">
                        Server Response
                      </div>
                      <Row
                        label="Status"
                        value={`${attestation.response.status} ${attestation.response.statusText}`}
                        className="text-emerald-400 font-bold"
                      />
                      <Row label="Body Hash" value={T(attestation.responseHash, 48)} mono />
                      <Row
                        label="Body Size"
                        value={`${attestation.bodySize.toLocaleString()} bytes`}
                      />
                      <Row label="Headers Hash" value={T(attestation.headersHash, 48)} mono />
                      <Row label="Latency" value={`${attestation.latencyMs}ms`} />
                    </div>
                  </div>

                  {/* Binding */}
                  <div className="card-enhanced overflow-hidden">
                    <div className="px-4 py-2 border-b border-border/50 text-xs font-bold">
                      ⛓ Binding & EAS
                    </div>
                    <div className="p-3 space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-violet-400 mb-2">
                        Round-Trip Binding
                      </div>
                      <Row
                        label="Round-Trip Hash"
                        value={T(attestation.roundTripHash, 48)}
                        className="text-amber-400 font-semibold"
                        mono
                      />
                      <Row
                        label="Integra ID"
                        value={attestation.integraId}
                        className="font-bold"
                        mono
                      />
                      <div className="mt-3 text-[9px] font-bold uppercase tracking-wider text-pink-400 mb-2">
                        EAS On-Chain
                      </div>
                      <Row
                        label="Attestation UID"
                        value={T(attestation.eas.uid, 48)}
                        className="text-pink-400"
                        mono
                      />
                      <Row label="Chain" value={attestation.eas.chain} />
                      <Row label="Attester" value={attestation.eas.attester} mono />
                    </div>
                  </div>
                </>
              )}

              {/* Log */}
              <div className="card-enhanced overflow-hidden">
                <div className="px-4 py-2 border-b border-border/50 text-xs font-bold">
                  Event Log
                </div>
                <div className="p-3">
                  <div
                    ref={logRef}
                    className="bg-background/50 border border-border/50 rounded-lg p-3 font-mono text-[9px] max-h-[300px] overflow-y-auto leading-relaxed space-y-0.5"
                  >
                    {logs.map((l, i) => (
                      <div key={i}>
                        <span className="text-muted-foreground/30">[{l.time}]</span>{' '}
                        <span className={LOG_COLORS[l.cls] || 'text-foreground'}>
                          {l.event}
                        </span>{' '}
                        <span className="text-muted-foreground/50">{l.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row helper ─────────────────────────────────────────────────

function Row({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-x-3 text-[11px]">
      <span className="text-muted-foreground/40 font-semibold text-[9px] whitespace-nowrap">
        {label}
      </span>
      <span
        className={`break-all ${mono ? 'font-mono text-sky-300 text-[9px]' : 'text-foreground/80'} ${className || ''}`}
      >
        {value}
      </span>
    </div>
  );
}

export default DemoPage;
