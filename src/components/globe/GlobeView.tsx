/**
 * GlobeView — layout wrapper around GlobeCanvas.
 * Purely decorative globe with no data connections.
 */

import { cn } from '@/lib/utils';
import { GlobeCanvas } from './GlobeCanvas';

interface GlobeViewProps {
  className?: string;
}

export function GlobeView({ className }: GlobeViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <GlobeCanvas className="w-full h-full" />
    </div>
  );
}
