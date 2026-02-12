import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FeedEntry } from '@shared/types';

function tsAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

interface FeedItemProps {
  entry: FeedEntry;
  isNew?: boolean;
  className?: string;
}

export function FeedItem({ entry, isNew = false, className }: FeedItemProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/real-estate/parcels/${entry.id}`)}
      className={cn(
        'w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg',
        'hover:bg-accent/50 transition-all duration-200 cursor-pointer',
        'border border-transparent hover:border-border/50',
        isNew && 'animate-fade-up',
        className,
      )}
    >
      {/* Cyan dot */}
      <div className="mt-1.5 flex-shrink-0">
        <div
          className={cn(
            'h-2 w-2 rounded-full bg-cyan-500',
            isNew && 'animate-pulse',
          )}
        />
      </div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {entry.address || 'Unknown Address'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {[entry.city, entry.region, entry.zip].filter(Boolean).join(', ')}
        </p>
        {(entry.landUse || entry.owner) && (
          <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
            {[entry.landUse, entry.owner].filter(Boolean).join(' - ')}
          </p>
        )}
        <p className="text-xs text-muted-foreground/50 truncate mt-0.5">
          {entry.source}
        </p>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {tsAgo(entry.ts)}
        </span>
        <div className="flex items-center gap-1">
          {entry.country !== 'US' && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {entry.country}
            </Badge>
          )}
          {entry.region && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {entry.region}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}
