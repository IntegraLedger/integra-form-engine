const footerColumns = [
  {
    title: 'Tools',
    links: [
      { label: 'API Docs', href: '#' },
      { label: 'Data Feeds', href: '#' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Status', href: '#' },
      { label: 'Support', href: '#' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'GitHub', href: 'https://github.com/IntegraLedger' },
      { label: 'Twitter/X', href: '#' },
      { label: 'Discord', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="footer-gradient" role="contentinfo">
      {/* Decorative top line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Column grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold text-white text-sm tracking-wide mb-4">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-white/70 hover:text-cyan-300 text-sm transition-colors duration-300"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/20 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img
            src="/assets/images/integra-logo-optimized.svg"
            alt="Integra"
            className="h-6 brightness-0 invert"
          />
          <p className="text-white/70 text-sm">
            &copy; {new Date().getFullYear()} Integra Ledger. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a
              href="#"
              className="text-white/70 hover:text-cyan-300 text-sm transition-colors duration-300"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-white/70 hover:text-cyan-300 text-sm transition-colors duration-300"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
