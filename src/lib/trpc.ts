import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../functions/router';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: typeof window !== 'undefined'
        ? `${window.location.origin}/api`
        : 'http://localhost:8788/api',
    }),
  ],
});
