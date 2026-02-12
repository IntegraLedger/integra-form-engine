/**
 * FormView — layout wrapper around FormCanvas.
 * Decorative animated form with no data connections.
 */

import { cn } from '@/lib/utils';
import { FormCanvas } from './FormCanvas';

interface FormViewProps {
  className?: string;
}

export function FormView({ className }: FormViewProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <FormCanvas className="w-full h-full" />
    </div>
  );
}
