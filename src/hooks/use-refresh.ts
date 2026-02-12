import { trpc } from '@/lib/trpc';
import type { FieldChange } from '@/components/ui/change-report';

export type { FieldChange };

export function useRecordSource(registry: string, recordId: number | null) {
  return trpc.refresh.recordSource.useQuery(
    { registry, recordId: recordId ?? 0 },
    { enabled: !!recordId && recordId > 0, staleTime: 60_000 },
  );
}

export function useRefreshRecord() {
  const utils = trpc.useUtils();
  return trpc.refresh.check.useMutation({
    onSuccess: (_data, variables) => {
      void utils.refresh.recordSource.invalidate({
        registry: variables.registry,
        recordId: variables.recordId,
      });
    },
  });
}

export function useAcceptChanges() {
  const utils = trpc.useUtils();
  return trpc.refresh.accept.useMutation({
    onSuccess: () => {
      void utils.refresh.recordSource.invalidate();
    },
  });
}
