import { trpc } from '@/lib/trpc';

interface UseSourcesParams {
  page?: number;
  limit?: number;
  status?: string;
  state?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useSources(params: UseSourcesParams = {}) {
  return trpc.sources.list.useQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    status: params.status,
    state: params.state,
    sort: params.sort ?? 'state_abbr',
    order: params.order ?? 'asc',
  });
}

export function useTriggerSource() {
  const utils = trpc.useUtils();
  return trpc.sources.trigger.useMutation({
    onSuccess: () => {
      utils.sources.list.invalidate();
      utils.stats.invalidate();
    },
  });
}
