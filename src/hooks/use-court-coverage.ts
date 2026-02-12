import { trpc } from '@/lib/trpc';

export function useCourtCoverage() {
  return trpc.courts.coverage.useQuery(undefined, {
    staleTime: 60_000,
  });
}
