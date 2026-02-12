import { Plus, Minus, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface FieldChange {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changeType: 'added' | 'modified' | 'removed';
}

interface ChangeReportProps {
  diff: FieldChange[];
  onAcceptAll?: () => void;
  accepting?: boolean;
  className?: string;
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const changeColors = {
  added: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-500',
    label: 'Added',
  },
  modified: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/20',
    icon: 'text-amber-500',
    label: 'Modified',
  },
  removed: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    icon: 'text-red-500',
    label: 'Removed',
  },
};

function ChangeIcon({ type }: { type: FieldChange['changeType'] }) {
  if (type === 'added') return <Plus className="h-3 w-3" />;
  if (type === 'removed') return <Minus className="h-3 w-3" />;
  return <ArrowRight className="h-3 w-3" />;
}

export function ChangeReport({ diff, onAcceptAll, accepting, className }: ChangeReportProps) {
  if (diff.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground/80">
          {diff.length} field{diff.length !== 1 ? 's' : ''} changed
        </h4>
        {onAcceptAll && (
          <Button
            variant="default"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={onAcceptAll}
            disabled={accepting}
          >
            {accepting ? 'Accepting...' : 'Accept All Changes'}
          </Button>
        )}
      </div>

      <div className="space-y-1">
        {diff.map((change) => {
          const colors = changeColors[change.changeType];
          return (
            <div
              key={change.field}
              className={cn(
                'rounded-md border p-2',
                colors.bg,
                colors.border,
              )}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className={colors.icon}>
                  <ChangeIcon type={change.changeType} />
                </span>
                <span className="text-[11px] font-medium">
                  {formatFieldName(change.field)}
                </span>
                <span className="text-[9px] text-muted-foreground ml-auto">
                  {colors.label}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[10px]">
                {change.oldValue != null && (
                  <span className="font-mono text-red-400 line-through truncate max-w-[45%]">
                    {change.oldValue}
                  </span>
                )}
                {change.oldValue != null && change.newValue != null && (
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                )}
                {change.newValue != null && (
                  <span className="font-mono text-emerald-400 truncate max-w-[45%]">
                    {change.newValue}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
