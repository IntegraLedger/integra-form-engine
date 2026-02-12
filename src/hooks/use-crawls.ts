import { trpc } from '@/lib/trpc';

interface UseCrawlsParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useCrawls(params: UseCrawlsParams = {}) {
  return trpc.crawls.list.useQuery({
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    sort: params.sort ?? 'started_at',
    order: params.order ?? 'desc',
  });
}
