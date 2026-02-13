/**
 * InstallPage — How to install the Integra Form Verifier plugin.
 */

import { GradientText } from '@/components/common/GradientText';

const CHROME_STEPS = [
  {
    num: '1',
    title: 'Install the Chrome Extension',
    description:
      'Open Google Chrome and navigate to the Chrome Web Store. Search for "Integra Form Verifier" or use the direct link below.',
    detail: [
      'Open Chrome and go to chrome.google.com/webstore',
      'Search for "Integra Form Verifier" in the search bar',
      'Click "Add to Chrome" on the Integra Form Verifier extension page',
      'Confirm by clicking "Add Extension" in the popup',
      'You will see the Integra shield icon appear in your browser toolbar',
    ],
    note: 'The extension is lightweight (~120KB) and requires no special permissions beyond form detection.',
  },
  {
    num: '2',
    title: 'Create Your Trust with Integra Account',
    description:
      'Click the Integra shield icon in your toolbar to open the extension popup. Create a free account or sign in to an existing one.',
    detail: [
      'Click the Integra shield icon in your Chrome toolbar',
      'Select "Create Account" to set up a new Trust with Integra account',
      'Enter your email address and choose a secure password',
      'Choose your signing method: API Key (simplest), ECDSA Keypair (strongest), or Wallet (MetaMask)',
      'Verify your email — check your inbox for a confirmation link',
      'Once verified, your account is active and ready to sign form submissions',
    ],
    note: 'Your private keys are generated and stored locally in the extension. They never leave your browser.',
  },
  {
    num: '3',
    title: 'Configure Your Signing Preferences',
    description:
      'In the extension settings, configure how you want form submissions to be attested and signed.',
    detail: [
      'Click the Integra shield icon → Settings (gear icon)',
      'Auto-Attest: Toggle ON to automatically attest every form submission',
      'Signing Method: Choose between HMAC-SHA256, ECDSA P-256, or Wallet signing',
      'Badge Display: Choose where the verification badge appears (bottom-right, bottom-left, or hidden)',
      'PDF Receipts: Toggle ON to auto-generate PDF attestation certificates',
      'Notification Sounds: Toggle ON/OFF for submission confirmation sounds',
    ],
    note: 'All settings are synced across your Chrome profiles if you are signed into Chrome.',
  },
  {
    num: '4',
    title: 'Start Signing Form Submissions',
    description:
      'Navigate to any website with a form. The Integra plugin automatically detects forms and adds a small verification badge. When you submit, the plugin captures and hashes the data — nothing is sent to Integra.',
    detail: [
      'Visit any website with a form (e.g. a client intake, signup, or checkout form)',
      'Look for the small Integra shield badge — it confirms the plugin is active on this page',
      'Fill out and submit the form as you normally would',
      'The plugin intercepts the submission, hashes all field values with HMAC-SHA256, and computes a Merkle root',
      'After the server responds, the plugin captures the response and computes a round-trip binding hash',
      'An attestation is registered on EAS (Ethereum Attestation Service) for permanent on-chain proof',
      'A PDF certificate is generated locally and available for download',
    ],
    note: 'The entire attestation happens client-side in your browser. No form data is ever transmitted to Integra servers.',
  },
  {
    num: '5',
    title: 'View and Manage Your Attestations',
    description:
      'Access your attestation history, download PDF receipts, and verify previous submissions from the extension dashboard.',
    detail: [
      'Click the Integra shield icon → "My Attestations"',
      'Browse your attestation history sorted by date',
      'Click any attestation to see full details: field hashes, Merkle root, server response, round-trip hash, and EAS UID',
      'Download or re-download the PDF attestation certificate at any time',
      'Scan the QR code to verify the attestation independently on-chain',
      'Export your attestation history as a CSV or JSON file for recordkeeping',
    ],
    note: 'Attestation records are stored locally in your browser and backed up to your account (encrypted).',
  },
];

const SCRIPT_STEPS = [
  {
    num: '1',
    title: 'Add the Script Tag',
    description:
      'Drop a single script tag into your HTML page, just before the closing </body> tag.',
    code: `<script
  src="https://cdn.integraledger.com/attest.js"
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
    title: 'Chrome Extension',
    code: 'Chrome Web Store → "Integra Form Verifier"',
    note: 'Sign in, enable, and attest any form on any website. No code required.',
    highlight: true,
  },
  {
    title: 'NPM Package',
    code: 'npm install @integra/form-verifier',
    note: 'For React, Vue, Angular, or any bundled project.',
  },
  {
    title: 'CDN Script',
    code: '<script src="https://cdn.integraledger.com/attest.js"></script>',
    note: 'For static HTML sites or WordPress. One line of code.',
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
            <GradientText as="span">Install</GradientText> the Integra Plugin
          </h1>
          <p className="text-sm text-muted-foreground">
            Add blockchain-verified form attestation to any website — with the Chrome extension or one line of code.
          </p>
        </div>

        {/* Install methods */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {INSTALL_METHODS.map((m) => (
            <div key={m.title} className={`card-enhanced p-4 ${m.highlight ? 'ring-1 ring-primary/40' : ''}`}>
              <h3 className="text-xs font-bold mb-2 text-foreground">{m.title}</h3>
              <code className="block text-[10px] font-mono bg-background/50 border border-border/50 rounded-md p-2 text-sky-300 break-all mb-2">
                {m.code}
              </code>
              <p className="text-[10px] text-muted-foreground">{m.note}</p>
            </div>
          ))}
        </div>

        {/* Chrome Extension — detailed guide */}
        <h2 className="text-lg font-bold mb-2">Chrome Extension Setup</h2>
        <p className="text-xs text-muted-foreground mb-6">
          The easiest way to use Integra. Install the Chrome plugin, create a Trust with Integra account, and every form you submit is automatically hashed, attested, and signed — on any website.
        </p>
        <div className="space-y-6 mb-12">
          {CHROME_STEPS.map((step) => (
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
                <ol className="text-xs text-foreground/80 space-y-1.5 mb-3 list-none">
                  {step.detail.map((d, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary/60 font-mono text-[10px] shrink-0">{i + 1}.</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ol>
                <div className="text-[10px] text-muted-foreground/60 border-t border-border/30 pt-2 italic">
                  {step.note}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Script tag integration */}
        <h2 className="text-lg font-bold mb-2">Website Integration (Script Tag)</h2>
        <p className="text-xs text-muted-foreground mb-6">
          For website owners who want to add attestation directly to their site — no extension required for visitors.
        </p>
        <div className="space-y-6 mb-10">
          {SCRIPT_STEPS.map((step) => (
            <div key={step.num} className="card-enhanced overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center">
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
            <li>• Google Chrome 60+ (for Chrome extension) or any modern browser (for script tag)</li>
            <li>• HTTPS required for Web Crypto API (localhost works for development)</li>
            <li>• No server-side dependencies — all hashing and signing happens client-side</li>
            <li>• PDF generation uses jsPDF — works entirely in the browser</li>
            <li>• QR codes generated client-side, no external API needed</li>
            <li>• Trust with Integra account is free for up to 1,000 attestations per month</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default InstallPage;
