import { trpc } from '@/lib/trpc';

export function useCourtCases(params: {
  q?: string;
  state?: string;
  case_type?: string;
  court_code?: string;
  page?: number;
  limit?: number;
}) {
  return trpc.courts.cases.useQuery(
    {
      q: params.q,
      state: params.state,
      case_type: params.case_type,
      court_code: params.court_code,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    },
    { keepPreviousData: true },
  );
}
