import { Check, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FreshnessBadgeProps {
  lastVerifiedAt: string | null;
  status: string;
  className?: string;
}

function getAge(iso: string): { label: string; level: 'fresh' | 'stale' | 'old' } {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 60) return { label: `${mins}m ago`, level: 'fresh' };
  if (hours < 24) return { label: `${hours}h ago`, level: hours < 6 ? 'fresh' : 'stale' };
  return { label: `${days}d ago`, level: 'old' };
}

const styles = {
  fresh: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  stale: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  old: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  changed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

export function FreshnessBadge({ lastVerifiedAt, status, className }: FreshnessBadgeProps) {
  if (!lastVerifiedAt) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
          styles.old,
          className,
        )}
      >
        <Clock className="h-3 w-3" />
        Not verified
      </span>
    );
  }

  if (status === 'error' || status === 'unavailable') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
          styles.error,
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {status === 'error' ? 'Error' : 'Unavailable'}
      </span>
    );
  }

  if (status === 'changed') {
    const age = getAge(lastVerifiedAt);
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
          styles.changed,
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        Changed {age.label}
      </span>
    );
  }

  const age = getAge(lastVerifiedAt);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        styles[age.level],
        className,
      )}
    >
      {age.level === 'fresh' ? (
        <Check className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      Verified {age.label}
    </span>
  );
}
