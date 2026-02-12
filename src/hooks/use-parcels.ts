import { trpc } from '@/lib/trpc';

interface UseParcelsParams {
  q?: string;
  state?: string;
  city?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function useParcels(params: UseParcelsParams = {}) {
  return trpc.parcels.search.useQuery({
    q: params.q,
    state: params.state,
    city: params.city,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
    sort: params.sort ?? 'id',
    order: params.order ?? 'desc',
  });
}

export function useParcelDetail(id: number) {
  return trpc.parcels.detail.useQuery(
    { id },
    { enabled: id > 0 },
  );
}
