import { trpc } from '@/lib/trpc';

export function usePatentStats() {
  return trpc.patents.stats.useQuery();
}
