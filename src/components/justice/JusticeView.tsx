/**
 * JusticeView — layout wrapper around JusticeCanvas.
 * Purely decorative Lady Justice animation with no data connections.
 */

import { cn } from '@/lib/utils';
import { JusticeCanvas } from './JusticeCanvas';

interface JusticeViewProps {
  className?: string;
}

export function JusticeView({ className }: JusticeViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <JusticeCanvas className="w-full h-full" />
    </div>
  );
}
