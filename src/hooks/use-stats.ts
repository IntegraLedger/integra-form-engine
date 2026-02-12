import { trpc } from '@/lib/trpc';

export function useStats() {
  return trpc.stats.useQuery(undefined, {
    staleTime: 30_000,
  });
}
