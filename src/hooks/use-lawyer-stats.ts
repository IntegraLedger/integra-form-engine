import { trpc } from '@/lib/trpc';

export function useLawyerStats() {
  return trpc.lawyers.stats.useQuery();
}
