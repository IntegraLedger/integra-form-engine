import { Skeleton } from '@/components/ui/skeleton';

export function FeedItemSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
