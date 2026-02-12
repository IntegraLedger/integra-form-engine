import { trpc } from '@/lib/trpc';

interface LawyerSearchParams {
  q?: string;
  state_abbr?: string;
  bar_status?: string;
  page?: number;
  limit?: number;
}

export function useLawyerSearch(params: LawyerSearchParams = {}) {
  return trpc.lawyers.search.useQuery(
    {
      q: params.q,
      state_abbr: params.state_abbr,
      bar_status: params.bar_status,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { keepPreviousData: true }
  );
}
