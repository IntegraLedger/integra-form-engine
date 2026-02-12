/**
 * PluginGuidePage — How the Integra Form Verifier plugin works.
 */

import { GradientText } from '@/components/common/GradientText';
import {
  FileCheck,
  ShieldCheck,
  Send,
  ArrowRight,
  Hash,
  Link as LinkIcon,
  QrCode,
  Download,
  Lock,
  Key,
  Wallet,
} from 'lucide-react';

const FLOW_STEPS = [
  {
    icon: FileCheck,
    title: 'Form Detected',
    desc: 'Plugin auto-discovers all forms on the page or targets forms with data-integra-attest="true".',
    color: 'text-sky-400',
  },
  {
    icon: Hash,
    title: 'Fields Hashed',
    desc: 'Each field is individually hashed with HMAC-SHA256 using a random salt. A Merkle tree root is computed over all field hashes.',
    color: 'text-blue-400',
  },
  {
    icon: Send,
    title: 'Form Submitted',
    desc: 'The form submits normally to its original server. The plugin intercepts fetch/XHR to capture both request and response.',
    color: 'text-violet-400',
  },
  {
    icon: ShieldCheck,
    title: 'Response Captured',
    desc: 'Server response body, headers, status, and any signatures are captured and hashed. Nothing is modified.',
    color: 'text-emerald-400',
  },
  {
    icon: LinkIcon,
    title: 'Round-Trip Bound',
    desc: 'A binding hash is computed: SHA-256(request hash | response hash | headers hash | status | sig | reqId | recordId | timestamps).',
    color: 'text-amber-400',
  },
  {
    icon: QrCode,
    title: 'Badge Morphs',
    desc: 'The Integra badge animates from shield to QR code. The QR encodes a deep link for mobile verification.',
    color: 'text-pink-400',
  },
];

const AUTH_METHODS = [
  {
    icon: Key,
    title: 'API Key (HMAC-SHA256)',
    desc: 'Simplest integration. Your API key signs each attestation with HMAC. Good for server-side trust.',
    fields: 'Injects: integraSignature, integraSignedBy, integraSigAlg + 3 more hidden fields',
  },
  {
    icon: Lock,
    title: 'Keypair (ECDSA P-256)',
    desc: 'Client generates an ECDSA keypair. Private key encrypted with AES-GCM + PBKDF2. Non-repudiation guarantee.',
    fields: 'Signs with P-256 curve, SHA-256 digest. Public key published on-chain.',
  },
  {
    icon: Wallet,
    title: 'Wallet (Ethereum)',
    desc: 'Connect MetaMask or any EIP-1193 wallet. Attestations signed with personal_sign for identity binding.',
    fields: 'Ethereum address becomes attester ID. Compatible with EAS on-chain anchoring.',
  },
];

const WHAT_GETS_CAPTURED = [
  {
    side: 'Request',
    color: 'text-sky-300',
    items: [
      'All form field names & values (hashed, never stored in plaintext)',
      'Per-field HMAC-SHA256 with unique salt',
      'Merkle root of all field hashes',
      'Content hash (SHA-256 of canonicalized JSON)',
      'Timestamp, origin URL, SSL status',
    ],
  },
  {
    side: 'Response',
    color: 'text-emerald-400',
    items: [
      'HTTP status code & status text',
      'Response body hash (SHA-256)',
      'Captured response headers & their hash',
      'Server signature (if present)',
      'Request ID, correlation ID, trace ID',
      'Record ID extracted from response JSON',
    ],
  },
  {
    side: 'Binding',
    color: 'text-amber-400',
    items: [
      'Round-trip hash binding request + response',
      'Integra ID (unique attestation identifier)',
      'EAS on-chain registration (Ethereum Attestation Service)',
      'Cryptographic signature (if authenticated)',
      '6 hidden fields injected into form',
      '6 X-Integra-* HTTP headers for fetch/XHR',
    ],
  },
];

export function PluginGuidePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">
            <GradientText as="span">How It</GradientText> Works
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            The plugin intercepts form submissions, cryptographically hashes
            both sides of the round-trip, and generates tamper-proof attestation
            receipts — all client-side.
          </p>
        </div>

        {/* Flow */}
        <h2 className="text-lg font-bold mb-4">Attestation Flow</h2>
        <div className="space-y-3 mb-10">
          {FLOW_STEPS.map((step, i) => (
            <div
              key={step.title}
              className="card-enhanced p-4 flex items-start gap-4"
            >
              <div className="shrink-0 mt-0.5">
                <step.icon className={`h-5 w-5 ${step.color}`} />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold mb-0.5 flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/40 font-mono">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {step.title}
                </h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              {i < FLOW_STEPS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/20 shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>

        {/* What gets captured */}
        <h2 className="text-lg font-bold mb-4">What Gets Captured</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {WHAT_GETS_CAPTURED.map((section) => (
            <div key={section.side} className="card-enhanced p-4">
              <h3
                className={`text-xs font-bold uppercase tracking-wider mb-3 ${section.color}`}
              >
                {section.side}
              </h3>
              <ul className="space-y-1.5">
                {section.items.map((item) => (
                  <li
                    key={item}
                    className="text-[10px] text-muted-foreground leading-relaxed"
                  >
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Auth methods */}
        <h2 className="text-lg font-bold mb-4">Authentication Methods</h2>
        <div className="space-y-3 mb-10">
          {AUTH_METHODS.map((method) => (
            <div
              key={method.title}
              className="card-enhanced p-4 flex items-start gap-4"
            >
              <method.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold mb-0.5">{method.title}</h3>
                <p className="text-xs text-muted-foreground mb-1">
                  {method.desc}
                </p>
                <p className="text-[10px] text-muted-foreground/50 font-mono">
                  {method.fields}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Security model */}
        <div className="card-enhanced p-5 mb-10">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Zero Server Trust Model
          </h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• All hashing happens client-side — form data never leaves the browser</li>
            <li>• Field-level HMAC with random salt enables selective disclosure</li>
            <li>• Merkle trees allow verifying individual fields without revealing others</li>
            <li>• PDF certificates generated locally via jsPDF — never transmitted</li>
            <li>• Private keys encrypted with AES-GCM + PBKDF2 (100k iterations)</li>
            <li>• EAS anchoring provides blockchain-level immutability</li>
          </ul>
        </div>

        {/* Output */}
        <h2 className="text-lg font-bold mb-4">Output Artifacts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card-enhanced p-4 flex items-start gap-3">
            <QrCode className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold mb-0.5">QR Badge</h3>
              <p className="text-[10px] text-muted-foreground">
                Deep link QR code for mobile app verification. Encodes Integra
                ID + hash prefix for instant lookup.
              </p>
            </div>
          </div>
          <div className="card-enhanced p-4 flex items-start gap-3">
            <Download className="h-5 w-5 text-violet-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold mb-0.5">PDF Certificate</h3>
              <p className="text-[10px] text-muted-foreground">
                Full attestation receipt with all hashes, Merkle proof,
                signatures, and EAS registration — generated client-side.
              </p>
            </div>
          </div>
          <div className="card-enhanced p-4 flex items-start gap-3">
            <Hash className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold mb-0.5">Hidden Fields</h3>
              <p className="text-[10px] text-muted-foreground">
                6 hidden inputs injected into the form: integraId, hash, Merkle
                root, salt, timestamp, and signature.
              </p>
            </div>
          </div>
          <div className="card-enhanced p-4 flex items-start gap-3">
            <LinkIcon className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold mb-0.5">HTTP Headers</h3>
              <p className="text-[10px] text-muted-foreground">
                6 X-Integra-* headers injected into fetch/XHR requests for
                server-side verification.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PluginGuidePage;
