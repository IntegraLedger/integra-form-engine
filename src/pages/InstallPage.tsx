/**
 * InstallPage — How to install the Integra Form Verifier plugin.
 */

import { GradientText } from '@/components/common/GradientText';

const STEPS = [
  {
    num: '1',
    title: 'Add the Script Tag',
    description:
      'Drop a single script tag into your HTML page, just before the closing </body> tag.',
    code: `<script
  src="https://cdn.integraledger.com/integra.js"
  data-integra-id="YOUR_SITE_ID"
  data-integra-key="YOUR_API_KEY"
  data-position="bottom-right"
  data-theme="dark">
</script>`,
  },
  {
    num: '2',
    title: 'Mark Forms for Attestation',
    description:
      'Add the data-integra-attest attribute to any form you want to automatically capture and hash on submission.',
    code: `<form data-integra-attest="true" action="/submit" method="POST">
  <input name="email" type="email" required />
  <input name="document" type="text" />
  <button type="submit">Submit</button>
</form>`,
  },
  {
    num: '3',
    title: 'Get Your API Keys',
    description:
      'Sign up at integraledger.com to get your Site ID and API Key. Keys support HMAC-SHA256, ECDSA, or wallet-based signing.',
    code: `// API Key authentication
data-integra-key="ik_live_your_key_here"

// Or use keypair mode for ECDSA P-256 signing
data-integra-auth="keypair"

// Or connect a wallet (MetaMask, etc.)
data-integra-auth="wallet"`,
  },
];

const INSTALL_METHODS = [
  {
    title: 'NPM Package',
    code: 'npm install @integra/form-verifier',
    note: 'For React, Vue, Angular, or any bundled project.',
  },
  {
    title: 'CDN Script',
    code: '<script src="https://cdn.integraledger.com/integra.js"></script>',
    note: 'For static HTML sites or WordPress.',
  },
  {
    title: 'Chrome Extension',
    code: 'Install from Chrome Web Store → "Integra Form Verifier"',
    note: 'Auto-hooks all forms on any website you visit.',
  },
];

const CONFIG_OPTIONS = [
  { attr: 'data-integra-id', desc: 'Your unique site identifier', example: '"site_abc123"' },
  { attr: 'data-integra-key', desc: 'API key for HMAC signing', example: '"ik_live_…"' },
  { attr: 'data-integra-position', desc: 'Badge position on page', example: '"bottom-right" | "bottom-left"' },
  { attr: 'data-integra-theme', desc: 'Badge color scheme', example: '"dark" | "light" | "auto"' },
  { attr: 'data-integra-attest', desc: 'Enable auto-attestation on form', example: '"true"' },
  { attr: 'data-integra-auth', desc: 'Authentication method', example: '"api-key" | "keypair" | "wallet"' },
  { attr: 'data-integra-qr', desc: 'Show QR code in badge', example: '"true" | "false"' },
];

export function InstallPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold mb-2">
            <GradientText as="span">Install</GradientText> the Plugin
          </h1>
          <p className="text-sm text-muted-foreground">
            Add form attestation to any website in under 2 minutes.
          </p>
        </div>

        {/* Install methods */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {INSTALL_METHODS.map((m) => (
            <div key={m.title} className="card-enhanced p-4">
              <h3 className="text-xs font-bold mb-2 text-foreground">{m.title}</h3>
              <code className="block text-[10px] font-mono bg-background/50 border border-border/50 rounded-md p-2 text-sky-300 break-all mb-2">
                {m.code}
              </code>
              <p className="text-[10px] text-muted-foreground">{m.note}</p>
            </div>
          ))}
        </div>

        {/* Step-by-step */}
        <h2 className="text-lg font-bold mb-4">Quick Start</h2>
        <div className="space-y-6 mb-10">
          {STEPS.map((step) => (
            <div key={step.num} className="card-enhanced overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  {step.num}
                </span>
                <span className="text-sm font-bold">{step.title}</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground mb-3">
                  {step.description}
                </p>
                <pre className="text-[10px] font-mono bg-background/50 border border-border/50 rounded-lg p-3 text-sky-300 overflow-x-auto whitespace-pre-wrap">
                  {step.code}
                </pre>
              </div>
            </div>
          ))}
        </div>

        {/* Config reference */}
        <h2 className="text-lg font-bold mb-4">Configuration Reference</h2>
        <div className="card-enhanced overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground/60">
                  <th className="text-left p-3 font-semibold">Attribute</th>
                  <th className="text-left p-3 font-semibold">Description</th>
                  <th className="text-left p-3 font-semibold">Values</th>
                </tr>
              </thead>
              <tbody>
                {CONFIG_OPTIONS.map((opt) => (
                  <tr
                    key={opt.attr}
                    className="border-b border-border/30 last:border-b-0"
                  >
                    <td className="p-3 font-mono text-sky-300 whitespace-nowrap text-[10px]">
                      {opt.attr}
                    </td>
                    <td className="p-3 text-foreground/80">{opt.desc}</td>
                    <td className="p-3 font-mono text-muted-foreground text-[10px]">
                      {opt.example}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Requirements */}
        <div className="card-enhanced p-5">
          <h3 className="text-sm font-bold mb-3">Requirements</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• Modern browser with Web Crypto API (Chrome 60+, Firefox 57+, Safari 11+)</li>
            <li>• HTTPS required for crypto.subtle (localhost works for dev)</li>
            <li>• No server-side dependencies — all hashing happens client-side</li>
            <li>• PDF generation uses jsPDF — works entirely in the browser</li>
            <li>• QR codes generated client-side, no external API needed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default InstallPage;
