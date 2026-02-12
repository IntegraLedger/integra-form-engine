import { trpc } from '@/lib/trpc';

export function useCourtStats() {
  return trpc.courts.stats.useQuery(undefined, {
    staleTime: 30_000,
  });
}
