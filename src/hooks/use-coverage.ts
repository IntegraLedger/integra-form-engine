import { trpc } from '@/lib/trpc';

export function useCoverageSummary() {
  return trpc.coverage.summary.useQuery(undefined, {
    staleTime: 60_000,
  });
}

export function useCoverageStates() {
  return trpc.coverage.states.useQuery(undefined, {
    staleTime: 60_000,
  });
}

export function useCoverageCounties(state: string) {
  return trpc.coverage.counties.useQuery(
    { state },
    { enabled: state.length === 2 },
  );
}
