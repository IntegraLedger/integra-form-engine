import { trpc } from '@/lib/trpc';

export function useCourtSources(params: { page?: number; limit?: number }) {
  return trpc.courts.sources.useQuery(
    { page: params.page ?? 1, limit: params.limit ?? 20 },
    { keepPreviousData: true },
  );
}
