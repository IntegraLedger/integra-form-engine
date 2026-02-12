import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../router';
import type { Env } from '@shared/types';

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;

  const requiredBindings = ['HYPERDRIVE_READER', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'] as const;
  const missing = requiredBindings.filter((key) => !env[key]);
  if (missing.length > 0) {
    return new Response(
      JSON.stringify({ error: `Missing required bindings: ${missing.join(', ')}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const ip = context.request.headers.get('cf-connecting-ip') || '0.0.0.0';

  return fetchRequestHandler({
    endpoint: '/api',
    req: context.request,
    router: appRouter,
    createContext: () => ({
      env,
      ip,
    }),
  });
};
