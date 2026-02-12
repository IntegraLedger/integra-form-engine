/**
 * LawyerView — layout wrapper around LawyerCanvas.
 * Purely decorative gavel animation with no data connections.
 */

import { cn } from '@/lib/utils';
import { LawyerCanvas } from './LawyerCanvas';

interface LawyerViewProps {
  className?: string;
}

export function LawyerView({ className }: LawyerViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <LawyerCanvas className="w-full h-full" />
    </div>
  );
}
