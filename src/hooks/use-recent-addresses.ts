import { trpc } from '@/lib/trpc';

export function useRecentAddresses() {
  return trpc.recentAddresses.useQuery(undefined, {
    refetchInterval: 5000,
  });
}
