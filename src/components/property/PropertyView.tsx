/**
 * PropertyView — layout wrapper around PropertyCanvas.
 * Animated cityscape with glowing windows and floating location pin.
 */

import { cn } from '@/lib/utils';
import { PropertyCanvas } from './PropertyCanvas';

interface PropertyViewProps {
  className?: string;
}

export function PropertyView({ className }: PropertyViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <PropertyCanvas className="w-full h-full" />
    </div>
  );
}
