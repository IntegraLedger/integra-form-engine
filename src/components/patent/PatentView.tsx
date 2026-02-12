/**
 * PatentView — layout wrapper around PatentCanvas.
 * Purely decorative patent lightbulb animation with no data connections.
 */

import { cn } from '@/lib/utils';
import { PatentCanvas } from './PatentCanvas';

interface PatentViewProps {
  className?: string;
}

export function PatentView({ className }: PatentViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <PatentCanvas className="w-full h-full" />
    </div>
  );
}
