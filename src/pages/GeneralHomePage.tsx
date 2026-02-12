import { Link } from 'react-router-dom';
import {
  Play, Download, BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { FormView } from '@/components/form-anim/FormView';
import { GradientText } from '@/components/common/GradientText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const CARDS: { icon: LucideIcon; title: string; desc: string; href: string; btnLabel: string; color: string }[] = [
  {
    icon: Play,
    title: 'Demo',
    desc: 'Try a full round-trip attestation: submit a form, hash both sides, morph the badge, and download a PDF certificate — all client-side.',
    href: '/demo',
    btnLabel: 'Try Demo',
    color: 'from-blue-600 to-blue-700',
  },
  {
    icon: Download,
    title: 'Install Integra Plugin  - (Optional)',
    desc: 'Add attestation to any website with a single script tag, NPM package, or Chrome extension. Under 2 minutes to integrate.',
    href: '/install',
    btnLabel: 'Install Guide',
    color: 'from-violet-600 to-violet-700',
  },
  {
    icon: BookOpen,
    title: 'How It Works',
    desc: 'Understand the full attestation flow: field hashing, Merkle trees, round-trip binding, EAS anchoring, and cryptographic signing.',
    href: '/guide',
    btnLabel: 'Read Guide',
    color: 'from-emerald-600 to-emerald-700',
  },
];

export function GeneralHomePage() {
  return (
    <div className="hero-gradient min-h-[calc(100vh-4rem)] flex flex-col">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 flex-1 flex flex-col">
        {/* Hero */}
        <div className="flex flex-col lg:flex-row items-center gap-8 mb-10">
          <div className="flex-1 text-center lg:text-left">
            <Badge variant="secondary" className="mb-4 text-xs">
              Blockchain-Verified
            </Badge>
            <h1 className="text-hero font-bold mb-3">
              <GradientText as="span">Universal Form</GradientText> Verifier
            </h1>
            <p className="text-muted-foreground text-xl text-balance max-w-xl mx-auto lg:mx-0">
              With <span className="font-bold text-foreground text-[1.35rem]">one line of HTML code</span>, add automatic blockchain verification
              to any website form with PDF attestation receipts. <span className="font-bold text-foreground text-[1.35rem]">Data is never
              submitted to Integra</span> — even the PDF receipt is generated locally
              in the browser.
            </p>
          </div>
          <FormView className="w-[560px] h-[380px] shrink-0" />
        </div>

        {/* 3 cards linking to pages */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {CARDS.map((card) => (
            <div key={card.title} className="card-enhanced p-5 flex flex-col">
              <card.icon className="h-8 w-8 text-primary mb-3" />
              <h2 className="text-sm font-bold mb-1">{card.title}</h2>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1">
                {card.desc}
              </p>
              <Link to={card.href}>
                <Button
                  variant="gradient"
                  size="sm"
                  className={`w-full text-xs bg-gradient-to-r ${card.color} text-white border-0`}
                >
                  {card.btnLabel}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GeneralHomePage;
