import { useRef, useEffect, useState } from 'react';
import { useRecentAddresses } from '@/hooks/use-recent-addresses';
import { FeedItem } from './FeedItem';
import { FeedItemSkeleton } from './FeedItemSkeleton';
import type { FeedEntry } from '@shared/types';

export function AddressFeed() {
  const { data, isLoading } = useRecentAddresses();
  const [prevIds, setPrevIds] = useState<Set<number>>(new Set());
  const [newIds, setNewIds] = useState<Set<number>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    const currentIds = new Set(data.map((e: FeedEntry) => e.id));

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      setPrevIds(currentIds);
      return;
    }

    // Find items not in previous set
    const fresh = new Set<number>();
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        fresh.add(id);
      }
    }

    if (fresh.size > 0) {
      setNewIds(fresh);
      // Clear "new" status after animation
      const timer = setTimeout(() => setNewIds(new Set()), 2000);
      setPrevIds(currentIds);
      return () => clearTimeout(timer);
    }

    setPrevIds(currentIds);
  }, [data, prevIds]);

  if (isLoading) {
    return (
      <div className="card-enhanced p-2">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold">Recent Addresses</h3>
          <p className="text-xs text-muted-foreground">Live feed - updates every 5s</p>
        </div>
        <FeedItemSkeleton />
      </div>
    );
  }

  const items = (data as FeedEntry[]) ?? [];

  return (
    <div className="card-enhanced p-2">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recent Addresses</h3>
            <p className="text-xs text-muted-foreground">Live feed - updates every 5s</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {items.map((entry) => (
          <FeedItem
            key={entry.id}
            entry={entry}
            isNew={newIds.has(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
