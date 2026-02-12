import { trpc } from '@/lib/trpc';

interface PatentSearchParams {
  q?: string;
  patent_type?: string;
  page?: number;
  limit?: number;
}

export function usePatentSearch(params: PatentSearchParams = {}) {
  return trpc.patents.search.useQuery(
    {
      q: params.q,
      patent_type: params.patent_type,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { keepPreviousData: true }
  );
}
