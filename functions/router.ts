import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import postgres from 'postgres';
import { Redis } from '@upstash/redis/cloudflare';
import type { Env, FeedEntry } from '@shared/types';

interface Context {
  env: Env;
  ip: string;
}

const t = initTRPC.context<Context>().create();
const baseProcedure = t.procedure;

function getReaderDb(env: Env) {
  return postgres(env.HYPERDRIVE_READER.connectionString, {
    prepare: false,
    idle_timeout: 10,
    connection: {
      search_path: 'parcels, shared, public',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statement_timeout: '15s' as any,
    },
  });
}

function getPatentsReaderDb(env: Env) {
  return postgres(env.HYPERDRIVE_READER.connectionString, {
    prepare: false,
    idle_timeout: 10,
    connection: {
      search_path: 'patents, shared, public',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statement_timeout: '15s' as any,
    },
  });
}

function getCourtsReaderDb(env: Env) {
  return postgres(env.HYPERDRIVE_READER.connectionString, {
    prepare: false,
    idle_timeout: 10,
    connection: {
      search_path: 'courts, shared, public',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statement_timeout: '15s' as any,
    },
  });
}

function getLawyersReaderDb(env: Env) {
  return postgres(env.HYPERDRIVE_READER.connectionString, {
    prepare: false,
    idle_timeout: 10,
    connection: {
      search_path: 'lawyers, shared, public',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      statement_timeout: '15s' as any,
    },
  });
}

const SORT_WHITELIST_SOURCES: Record<string, string> = {
  state_abbr: 'state_abbr',
  county_name: 'county_name',
  source_type: 'source_type',
  format: 'format',
  status: 'status',
  parcel_count: 'parcel_count',
  last_crawled_at: 'last_crawled_at',
};

const SORT_WHITELIST_CRAWLS: Record<string, string> = {
  started_at: 'cr.started_at',
  status: 'cr.status',
  parcels_found: 'cr.parcels_found',
  parcels_new: 'cr.parcels_new',
  parcels_errors: 'cr.parcels_errors',
  duration_secs: 'cr.duration_secs',
  state_abbr: 's.state_abbr',
  county_name: 's.county_name',
};

const SORT_WHITELIST_PARCELS: Record<string, string> = {
  id: 'id',
  address_full: 'address_full',
  city: 'city',
  state_abbr: 'state_abbr',
  owner_name: 'owner_name',
  land_use_category: 'land_use_category',
  assessed_value_total: 'assessed_value_total',
  year_built: 'year_built',
};

// ── SSRF guard — only allow fetching from known domains ──

const ALLOWED_FETCH_DOMAINS = new Set([
  'api.scrapingdog.com',
  'data.colorado.gov',
  'data.cityofnewyork.us',
  'data.lacounty.gov',
  'opendata.arcgis.com',
]);

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (ALLOWED_FETCH_DOMAINS.has(parsed.hostname)) return true;
    // Allow *.gov domains over HTTPS (no raw IPs)
    if (parsed.hostname.endsWith('.gov') && parsed.protocol === 'https:' && !/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

// ── Typesense search helper ──

interface TypesenseHit {
  document: { id: string; pg_id: number; [key: string]: unknown };
  highlights: unknown[];
  text_match: number;
}

interface TypesenseSearchResponse {
  found: number;
  hits: TypesenseHit[];
  search_time_ms: number;
}

async function typesenseCollectionSearch(
  env: Env,
  collection: string,
  query: string,
  opts: {
    query_by: string;
    query_by_weights?: string;
    filter_by?: string;
    page: number;
    limit: number;
  },
): Promise<{ ids: number[]; total: number; searchTimeMs: number } | null> {
  if (!env.TYPESENSE_HOST || !env.TYPESENSE_API_KEY) return null;

  const params = new URLSearchParams({
    q: query,
    query_by: opts.query_by,
    num_typos: '1',
    prefix: 'true',
    per_page: String(opts.limit),
    page: String(opts.page),
  });

  if (opts.query_by_weights) params.set('query_by_weights', opts.query_by_weights);
  if (opts.filter_by) params.set('filter_by', opts.filter_by);

  try {
    const res = await fetch(
      `${env.TYPESENSE_HOST}/collections/${collection}/documents/search?${params}`,
      { headers: { 'X-TYPESENSE-API-KEY': env.TYPESENSE_API_KEY } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as TypesenseSearchResponse;
    return {
      ids: data.hits.map((h) => h.document.pg_id),
      total: data.found,
      searchTimeMs: data.search_time_ms,
    };
  } catch {
    return null;
  }
}

// Typesense faceted stats helper — returns total + facet breakdowns via q=* search
async function typesenseCollectionFacets(
  env: Env,
  collection: string,
  facetBy: string,
  opts?: { queryBy?: string; maxFacetValues?: number },
): Promise<{ total: number; facets: Record<string, { value: string; count: number }[]> } | null> {
  if (!env.TYPESENSE_HOST || !env.TYPESENSE_API_KEY) return null;
  const params = new URLSearchParams({
    q: '*',
    query_by: opts?.queryBy ?? facetBy.split(',')[0],
    facet_by: facetBy,
    per_page: '0',
    max_facet_values: String(opts?.maxFacetValues ?? 50),
  });
  try {
    const res = await fetch(
      `${env.TYPESENSE_HOST}/collections/${collection}/documents/search?${params}`,
      { headers: { 'X-TYPESENSE-API-KEY': env.TYPESENSE_API_KEY } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      found: number;
      facet_counts: { field_name: string; counts: { value: string; count: number }[] }[];
    };
    const facets: Record<string, { value: string; count: number }[]> = {};
    for (const fc of data.facet_counts) {
      facets[fc.field_name] = fc.counts;
    }
    return { total: data.found, facets };
  } catch {
    return null;
  }
}

// Parcels-specific wrapper (preserves existing call signature)
async function typesenseSearch(
  env: Env,
  query: string,
  opts: { state?: string; city?: string; page: number; limit: number },
): Promise<{ ids: number[]; total: number; searchTimeMs: number } | null> {
  const filters: string[] = [];
  if (opts.state) filters.push(`state_abbr:=${opts.state}`);
  if (opts.city) filters.push(`city:=${opts.city}`);

  return typesenseCollectionSearch(env, 'parcels', query, {
    query_by: 'address_full,apn_raw,owner_name,integra_id',
    query_by_weights: '4,2,3,1',
    filter_by: filters.length > 0 ? filters.join(' && ') : undefined,
    page: opts.page,
    limit: opts.limit,
  });
}

export const appRouter = t.router({
  health: baseProcedure.query(() => ({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })),


  recentAddresses: baseProcedure.query(async ({ ctx }) => {
    const redis = new Redis({
      url: ctx.env.UPSTASH_REDIS_REST_URL,
      token: ctx.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const raw = await redis.lrange('feed:recent', 0, 49);
    return raw.flatMap((item) => {
      if (typeof item !== 'string') return [item as FeedEntry];
      try { return [JSON.parse(item) as FeedEntry]; }
      catch { return []; }
    });
  }),

  stats: baseProcedure.query(async ({ ctx }) => {
    const sql = getReaderDb(ctx.env);
    try {
      const [parcels, sources, sourcesByStatus, recentRuns, loadedAreas, countries] = await Promise.all([
        sql`
          SELECT COALESCE(sum(parcel_count), 0)::int AS count
          FROM parcels.sources WHERE status = 'active'
        `,
        sql`SELECT count(*)::int AS count FROM parcels.sources`,
        sql`
          SELECT status, count(*)::int AS count
          FROM parcels.sources
          GROUP BY status ORDER BY count DESC
        `,
        sql`
          SELECT cr.id, cr.source_id, s.state_abbr, s.county_name, cr.status,
                 cr.parcels_found, cr.parcels_new, cr.started_at, cr.completed_at, cr.duration_secs
          FROM parcels.crawl_runs cr
          JOIN parcels.sources s ON s.id = cr.source_id
          ORDER BY cr.started_at DESC LIMIT 10
        `,
        sql`
          SELECT s.id, s.fips5, s.state_abbr, s.county_name, s.source_type, s.format,
                 s.status, s.parcel_count, s.last_success_at,
                 s.parcel_count AS actual_count, s.country
          FROM parcels.sources s
          WHERE s.source_type IN ('county_portal', 'county_socrata')
            AND s.status = 'active'
          ORDER BY s.parcel_count DESC NULLS LAST
        `,
        sql`
          SELECT count(DISTINCT COALESCE(country, 'US'))::int AS count
          FROM parcels.sources WHERE status = 'active'
        `,
      ]);

      return {
        totalParcels: (parcels[0]?.count as number) ?? 0,
        totalSources: (sources[0]?.count as number) ?? 0,
        countryCount: (countries[0]?.count as number) ?? 0,
        sourcesByStatus,
        recentCrawlRuns: recentRuns,
        loadedAreas,
      };
    } finally {
      await sql.end();
    }
  }),

  sources: t.router({
    list: baseProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.string().optional(),
        state: z.string().optional(),
        sort: z.string().default('state_abbr'),
        order: z.enum(['asc', 'desc']).default('asc'),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, status, state, sort, order } = input;
        const offset = (page - 1) * limit;
        const sortCol = SORT_WHITELIST_SOURCES[sort] ?? SORT_WHITELIST_SOURCES['state_abbr'];
        const sortDir = order === 'desc' ? 'DESC' : 'ASC';
        const orderClause = `${sortCol} ${sortDir}, county_name ASC`;

        const sql = getReaderDb(ctx.env);
        try {
          const statusFilter = status ?? null;
          const stateFilter = state ?? null;
          const [rows, total] = await Promise.all([
            sql`
              SELECT id, fips5, state_abbr, county_name, source_type, source_url,
                     format, status, parcel_count, last_crawled_at, last_success_at,
                     error_message, notes, created_at, updated_at, country
              FROM parcels.sources
              WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter})
                AND (${stateFilter}::text IS NULL OR state_abbr = ${stateFilter})
              ORDER BY ${sql.unsafe(orderClause)}
              LIMIT ${limit} OFFSET ${offset}
            `,
            sql`
              SELECT count(*)::int AS count
              FROM parcels.sources
              WHERE (${statusFilter}::text IS NULL OR status = ${statusFilter})
                AND (${stateFilter}::text IS NULL OR state_abbr = ${stateFilter})
            `,
          ]);
          return {
            sources: rows,
            total: (total[0]?.count as number) ?? 0,
            page,
            limit,
          };
        } finally {
          await sql.end();
        }
      }),

    trigger: baseProcedure
      .input(z.object({ sourceId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const sql = getReaderDb(ctx.env);
        try {
          const rows = await sql`
            SELECT id, fips5, state_abbr, source_type, source_url, format
            FROM parcels.sources WHERE id = ${input.sourceId}
          `;
          const source = rows[0];
          if (!source) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Source not found' });
          }
          await ctx.env.RE_DOWNLOAD_QUEUE.send({
            type: source.source_type,
            sourceId: source.id,
            fips5: (source.fips5 as string).trim(),
            stateAbbr: (source.state_abbr as string).trim(),
            url: source.source_url,
            format: source.format,
          });
          return { triggered: true, sourceId: input.sourceId };
        } finally {
          await sql.end();
        }
      }),
  }),

  parcels: t.router({
    search: baseProcedure
      .input(z.object({
        q: z.string().optional(),
        state: z.string().optional(),
        city: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        sort: z.string().default('id'),
        order: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, q, state, city, sort, order } = input;
        const offset = (page - 1) * limit;
        const sortCol = SORT_WHITELIST_PARCELS[sort] ?? SORT_WHITELIST_PARCELS['id'];
        const sortDir = order === 'desc' ? 'DESC' : 'ASC';
        const orderClause = state ? `${sortCol} ${sortDir}` : `id ${sortDir}`;
        const qNorm = q?.startsWith('0x') ? q.slice(2) : q;
        const isHexHash = qNorm ? /^[0-9a-fA-F]{64}$/.test(qNorm) : false;

        const sql = getReaderDb(ctx.env);
        try {
          let rows;
          const stateFilter = state ?? null;
          const cityFilter = city ?? null;

          if (isHexHash && qNorm) {
            // Exact integra_id lookup — fast, skips full-table ILIKE scan
            rows = await sql`
              SELECT * FROM parcels.parcels
              WHERE integra_id = ${qNorm}
              LIMIT ${limit} OFFSET ${offset}
            `;
          } else if (qNorm && !isHexHash) {
            // Text query — try Typesense first for fast, typo-tolerant search
            const tsResult = await typesenseSearch(ctx.env, qNorm, {
              state: stateFilter ?? undefined,
              city: cityFilter ?? undefined,
              page,
              limit,
            });

            if (!tsResult) {
              return { parcels: [], total: 0, hasMore: false, page, limit, source: 'typesense' as const, searchTimeMs: 0 };
            }
            if (tsResult.ids.length === 0) {
              return { parcels: [], total: 0, hasMore: false, page, limit, source: 'typesense' as const, searchTimeMs: tsResult.searchTimeMs };
            }

            // Fetch full rows from PostgreSQL by ID
            rows = await sql`
              SELECT * FROM parcels.parcels
              WHERE id = ANY(${tsResult.ids})
            `;
            // Preserve Typesense relevance ordering
            const idOrder = new Map(tsResult.ids.map((id, i) => [id, i]));
            rows.sort((a, b) =>
              (idOrder.get(a.id as number) ?? 0) - (idOrder.get(b.id as number) ?? 0)
            );

            return {
              parcels: rows,
              total: tsResult.total,
              hasMore: rows.length === limit,
              page,
              limit,
              source: 'typesense' as const,
              searchTimeMs: tsResult.searchTimeMs,
            };
          } else if (stateFilter) {
            const fipsRows = await sql`SELECT DISTINCT left(fips5, 2) AS fips_state FROM parcels.sources WHERE state_abbr = ${stateFilter}`;
            const fipsFilter = fipsRows.map(r => r.fips_state as string);
            if (fipsFilter.length === 0) {
              return { parcels: [], total: null, hasMore: false, page, limit, source: 'postgres' as const };
            }
            rows = await sql`
              SELECT * FROM parcels.parcels
              WHERE fips_state = ANY(${fipsFilter})
                AND state_abbr = ${stateFilter}
                AND (${cityFilter}::text IS NULL OR city ILIKE ${cityFilter})
              ORDER BY ${sql.unsafe(orderClause)}
              LIMIT ${limit} OFFSET ${offset}
            `;
          } else {
            rows = await sql`
              SELECT * FROM parcels.parcels
              ORDER BY ${sql.unsafe(orderClause)}
              LIMIT ${limit} OFFSET ${offset}
            `;
          }

          const [{ total }] = await sql`
            SELECT COALESCE(sum(parcel_count), 0)::int AS total
            FROM parcels.sources
            WHERE status = 'active'
              AND (${stateFilter}::text IS NULL OR state_abbr = ${stateFilter})
          `;

          return {
            parcels: rows,
            total: total as number,
            hasMore: rows.length === limit,
            page,
            limit,
            source: 'postgres' as const,
          };
        } finally {
          await sql.end();
        }
      }),

    detail: baseProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const sql = getReaderDb(ctx.env);
        try {
          const rows = await sql`
            SELECT * FROM parcels.parcels WHERE id = ${input.id}
          `;
          if (!rows[0]) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Parcel not found' });
          }
          return rows[0];
        } finally {
          await sql.end();
        }
      }),
  }),

  crawls: t.router({
    list: baseProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        sort: z.string().default('started_at'),
        order: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, sort, order } = input;
        const offset = (page - 1) * limit;
        const sortCol = SORT_WHITELIST_CRAWLS[sort] ?? SORT_WHITELIST_CRAWLS['started_at'];
        const sortDir = order === 'desc' ? 'DESC' : 'ASC';
        const orderClause = `${sortCol} ${sortDir}`;

        const sql = getReaderDb(ctx.env);
        try {
          const [rows, total] = await Promise.all([
            sql`
              SELECT cr.id, cr.source_id, s.state_abbr, s.county_name, s.country,
                     cr.status, cr.parcels_found, cr.parcels_new, cr.parcels_errors,
                     cr.started_at, cr.completed_at, cr.duration_secs
              FROM parcels.crawl_runs cr
              JOIN parcels.sources s ON s.id = cr.source_id
              ORDER BY ${sql.unsafe(orderClause)}
              LIMIT ${limit} OFFSET ${offset}
            `,
            sql`SELECT count(*)::int AS count FROM parcels.crawl_runs`,
          ]);

          return {
            crawlRuns: rows,
            total: (total[0]?.count as number) ?? 0,
            page,
            limit,
          };
        } finally {
          await sql.end();
        }
      }),
  }),

  coverage: t.router({
    summary: baseProcedure.query(async ({ ctx }) => {
      const sql = getReaderDb(ctx.env);
      try {
        const rows = await sql`
          SELECT state_abbr,
                 sum(COALESCE(our_parcel_count, 0))::int AS total_parcels,
                 round(avg(COALESCE(coverage_pct, 0))::numeric, 4)::real AS avg_coverage
          FROM parcels.coverage
          GROUP BY state_abbr
          ORDER BY state_abbr
        `;
        return rows;
      } finally {
        await sql.end();
      }
    }),

    states: baseProcedure.query(async ({ ctx }) => {
      const sql = getReaderDb(ctx.env);
      try {
        const rows = await sql`
          SELECT c.state_abbr,
                 count(*)::int AS total_counties,
                 sum(COALESCE(c.our_parcel_count, 0))::int AS total_parcels,
                 sum(COALESCE(c.census_housing_units, 0))::int AS total_housing_units,
                 round(avg(COALESCE(c.coverage_pct, 0))::numeric, 4)::real AS avg_coverage,
                 sum(CASE WHEN c.has_state_bulk THEN 1 ELSE 0 END)::int AS with_state_bulk,
                 sum(CASE WHEN c.has_county_gis THEN 1 ELSE 0 END)::int AS with_county_gis
          FROM parcels.coverage c
          GROUP BY c.state_abbr
          ORDER BY c.state_abbr
        `;
        return rows;
      } finally {
        await sql.end();
      }
    }),

    counties: baseProcedure
      .input(z.object({ state: z.string().length(2) }))
      .query(async ({ input, ctx }) => {
        const sql = getReaderDb(ctx.env);
        try {
          const rows = await sql`
            SELECT c.fips5, c.county_name, c.our_parcel_count, c.census_housing_units,
                   c.coverage_pct, c.has_state_bulk, c.has_county_gis, c.best_source_id,
                   c.quality_score
            FROM parcels.coverage c
            WHERE c.state_abbr = ${input.state}
            ORDER BY c.county_name
          `;
          return rows;
        } finally {
          await sql.end();
        }
      }),
  }),

  courts: t.router({
    stats: baseProcedure.query(async ({ ctx }) => {
      const sql = getCourtsReaderDb(ctx.env);
      try {
        // Use Typesense facets for expensive counts; PG only for small tables + recent rows
        const [tsFacets, totalCourts, totalSources, recentCases] = await Promise.all([
          typesenseCollectionFacets(ctx.env, 'federal_cases', 'case_type,jurisdiction'),
          sql`SELECT count(*)::int AS count FROM courts.courts`,
          sql`SELECT count(*)::int AS count FROM courts.sources`,
          sql`SELECT id, case_name, case_number, court_code, case_type, date_filed, plaintiff, defendant, state_abbr FROM courts.cases ORDER BY id DESC LIMIT 10`,
        ]);
        return {
          totalCases: tsFacets?.total ?? null,
          totalCourts: (totalCourts[0]?.count as number) ?? 0,
          totalSources: (totalSources[0]?.count as number) ?? 0,
          casesByType: (tsFacets?.facets.case_type ?? []).map(f => ({ case_type: f.value, count: f.count })),
          casesByJurisdiction: (tsFacets?.facets.jurisdiction ?? []).map(f => ({ jurisdiction: f.value, count: f.count })),
          recentCases,
        };
      } finally {
        await sql.end();
      }
    }),

    cases: baseProcedure
      .input(z.object({
        q: z.string().optional(),
        state: z.string().optional(),
        case_type: z.string().optional(),
        court_code: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit, q, state, case_type, court_code } = input;
        const offset = (page - 1) * limit;

        const stateFilter = state ?? null;
        const typeFilter = case_type ?? null;
        const courtFilter = court_code ?? null;

        const sql = getCourtsReaderDb(ctx.env);
        try {
          if (q) {
            // Typesense-first search
            const tsFilters: string[] = [];
            if (stateFilter) tsFilters.push(`state_abbr:=${stateFilter}`);
            if (typeFilter) tsFilters.push(`case_type:=${typeFilter}`);
            if (courtFilter) tsFilters.push(`court_code:=${courtFilter}`);

            const tsResult = await typesenseCollectionSearch(ctx.env, 'federal_cases', q, {
              query_by: 'case_name,plaintiff,defendant,case_number,docket_number,judge',
              query_by_weights: '4,3,3,2,1,1',
              filter_by: tsFilters.length > 0 ? tsFilters.join(' && ') : undefined,
              page,
              limit,
            });

            if (!tsResult || tsResult.ids.length === 0) {
              return { cases: [], total: tsResult ? tsResult.total : null, hasMore: false, page, limit, source: 'typesense' as const, searchTimeMs: tsResult?.searchTimeMs ?? 0 };
            }

            const rows = await sql`
              SELECT id, integra_court_id, court_code, jurisdiction, court_level,
                     case_number, case_type, case_subtype, nature_of_suit, case_name,
                     date_filed, date_terminated, disposition, plaintiff, defendant,
                     judge, state_abbr, county_name, source_type, source_url,
                     source_case_id, created_at
              FROM courts.cases
              WHERE id = ANY(${tsResult.ids})
            `;
            const idOrder = new Map(tsResult.ids.map((id, i) => [id, i]));
            rows.sort((a, b) =>
              (idOrder.get(a.id as number) ?? 0) - (idOrder.get(b.id as number) ?? 0)
            );

            return {
              cases: rows,
              total: tsResult.total,
              hasMore: rows.length === limit,
              page,
              limit,
              source: 'typesense' as const,
              searchTimeMs: tsResult.searchTimeMs,
            };
          }

          // No text query — browse with filters (use id DESC for fast PK index scan)
          const hasFilters = stateFilter || typeFilter || courtFilter;
          const rows = await sql`
            SELECT id, integra_court_id, court_code, jurisdiction, court_level,
                   case_number, case_type, case_subtype, nature_of_suit, case_name,
                   date_filed, date_terminated, disposition, plaintiff, defendant,
                   judge, state_abbr, county_name, source_type, source_url,
                   source_case_id, created_at
            FROM courts.cases
            WHERE (${stateFilter}::text IS NULL OR state_abbr = ${stateFilter})
            AND (${typeFilter}::text IS NULL OR case_type = ${typeFilter})
            AND (${courtFilter}::text IS NULL OR court_code = ${courtFilter})
            ORDER BY id DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
          let total: number | null = null;
          if (hasFilters) {
            const [cnt] = await sql`
              SELECT count(*)::int AS count FROM courts.cases
              WHERE (${stateFilter}::text IS NULL OR state_abbr = ${stateFilter})
              AND (${typeFilter}::text IS NULL OR case_type = ${typeFilter})
              AND (${courtFilter}::text IS NULL OR court_code = ${courtFilter})
            `;
            total = (cnt?.count as number) ?? 0;
          }
          return {
            cases: rows,
            total,
            hasMore: rows.length === limit,
            page,
            limit,
            source: 'postgres' as const,
          };
        } finally {
          await sql.end();
        }
      }),

    sources: baseProcedure
      .input(z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input, ctx }) => {
        const { page, limit } = input;
        const offset = (page - 1) * limit;
        const sql = getCourtsReaderDb(ctx.env);
        try {
          const [rows, total] = await Promise.all([
            sql`
              SELECT s.id, s.court_id, c.court_code, c.name AS court_name,
                     c.jurisdiction, c.level AS court_level, c.state_abbr,
                     s.source_type, s.source_url, s.format, s.platform,
                     s.scope, s.status, s.record_count,
                     s.last_crawled_at, s.last_success_at, s.notes
              FROM courts.sources s
              JOIN courts.courts c ON c.id = s.court_id
              ORDER BY c.name
              LIMIT ${limit} OFFSET ${offset}
            `,
            sql`SELECT count(*)::int AS count FROM courts.sources`,
          ]);
          return { sources: rows, total: (total[0]?.count as number) ?? 0, page, limit };
        } finally {
          await sql.end();
        }
      }),

    coverage: baseProcedure.query(async ({ ctx }) => {
      const sql = getCourtsReaderDb(ctx.env);
      try {
        const rows = await sql`
          SELECT c.id, c.court_code, c.name, c.short_name, c.jurisdiction,
                 c.level, c.court_type, c.state_abbr,
                 cov.our_case_count, cov.est_annual_cases, cov.coverage_pct,
                 cov.has_bulk_source, cov.has_api_source, cov.quality_score,
                 cov.last_updated_at
          FROM courts.courts c
          LEFT JOIN courts.coverage cov ON cov.court_id = c.id
          ORDER BY c.jurisdiction, c.level, c.name
        `;
        return rows;
      } finally {
        await sql.end();
      }
    }),
  }),

  patents: t.router({
    stats: baseProcedure.query(async ({ ctx }) => {
      const sql = getPatentsReaderDb(ctx.env);
      try {
        // Use Typesense facets for expensive counts; PG only for recent rows
        const [tsFacets, recentPatents] = await Promise.all([
          typesenseCollectionFacets(ctx.env, 'patents', 'patent_type'),
          sql`SELECT patent_id, patent_type, patent_date, patent_title, assignee_name, integra_patent_id FROM patents.patents ORDER BY id DESC LIMIT 10`,
        ]);
        return {
          totalPatents: tsFacets?.total ?? null,
          patentTypes: (tsFacets?.facets.patent_type ?? []).map(f => ({ patent_type: f.value, count: f.count })),
          latestDate: recentPatents[0]?.patent_date ?? null,
          recentPatents,
        };
      } finally {
        await sql.end();
      }
    }),

    search: baseProcedure
      .input(z.object({
        q: z.string().optional(),
        patent_type: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input, ctx }) => {
        const { q, patent_type, page, limit } = input;
        const offset = (page - 1) * limit;
        const sql = getPatentsReaderDb(ctx.env);
        try {
          if (q) {
            // Typesense-first search
            const tsFilters: string[] = [];
            if (patent_type) tsFilters.push(`patent_type:=${patent_type}`);

            const tsResult = await typesenseCollectionSearch(ctx.env, 'patents', q, {
              query_by: 'patent_title,patent_id,assignee_name,inventor_name,integra_patent_id',
              query_by_weights: '4,3,3,2,1',
              filter_by: tsFilters.length > 0 ? tsFilters.join(' && ') : undefined,
              page,
              limit,
            });

            if (!tsResult || tsResult.ids.length === 0) {
              return { patents: [], total: tsResult ? tsResult.total : null, page, limit, hasMore: false, source: 'typesense' as const, searchTimeMs: tsResult?.searchTimeMs ?? 0 };
            }

            const rows = await sql`
              SELECT p.id, p.patent_id, p.patent_type, p.patent_date, p.patent_title,
                     p.wipo_kind, p.num_claims, p.assignee_name, p.assignee_type,
                     p.integra_patent_id
              FROM patents.patents p
              WHERE p.id = ANY(${tsResult.ids})
            `;
            const idOrder = new Map(tsResult.ids.map((id, i) => [id, i]));
            rows.sort((a, b) =>
              (idOrder.get(a.id as number) ?? 0) - (idOrder.get(b.id as number) ?? 0)
            );

            return {
              patents: rows,
              total: tsResult.total,
              page,
              limit,
              hasMore: rows.length === limit,
              source: 'typesense' as const,
              searchTimeMs: tsResult.searchTimeMs,
            };
          }

          // No text query — browse with optional patent_type filter (use id DESC for fast PK index scan)
          const typeFilter = patent_type ?? null;
          const rows = await sql`
            SELECT p.id, p.patent_id, p.patent_type, p.patent_date, p.patent_title,
                   p.wipo_kind, p.num_claims, p.assignee_name, p.assignee_type,
                   p.integra_patent_id
            FROM patents.patents p
            WHERE (${typeFilter}::text IS NULL OR p.patent_type = ${typeFilter})
            ORDER BY p.id DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
          let total: number | null = null;
          if (typeFilter) {
            const [cnt] = await sql`
              SELECT count(*)::int AS count FROM patents.patents p
              WHERE p.patent_type = ${typeFilter}
            `;
            total = (cnt?.count as number) ?? 0;
          }

          return {
            patents: rows,
            total,
            page,
            limit,
            hasMore: rows.length === limit,
            source: 'postgres' as const,
          };
        } finally {
          await sql.end();
        }
      }),

    sources: baseProcedure.query(async ({ ctx }) => {
      const sql = getPatentsReaderDb(ctx.env);
      try {
        const rows = await sql`SELECT * FROM patents.sources ORDER BY created_at DESC`;
        return rows;
      } finally {
        await sql.end();
      }
    }),
  }),

  lawyers: t.router({
    stats: baseProcedure.query(async ({ ctx }) => {
      const sql = getLawyersReaderDb(ctx.env);
      try {
        // Use Typesense facets for total + state/status breakdowns; PG only for law_school + recent rows
        const [tsFacets, schools, recentLawyers] = await Promise.all([
          typesenseCollectionFacets(ctx.env, 'lawyers', 'state_abbr,bar_status'),
          sql`SELECT law_school, count(*)::int AS count FROM lawyers.lawyers WHERE law_school IS NOT NULL GROUP BY law_school ORDER BY count DESC LIMIT 10`,
          sql`SELECT id, full_name, state_abbr, bar_status, bar_number, firm_name, year_admitted FROM lawyers.lawyers ORDER BY id DESC LIMIT 10`,
        ]);
        return {
          totalLawyers: tsFacets?.total ?? null,
          states: (tsFacets?.facets.state_abbr ?? []).map(f => ({ state_abbr: f.value, count: f.count })),
          statuses: (tsFacets?.facets.bar_status ?? []).map(f => ({ bar_status: f.value, count: f.count })),
          topSchools: schools,
          recentLawyers,
        };
      } finally {
        await sql.end();
      }
    }),

    search: baseProcedure
      .input(z.object({
        q: z.string().optional(),
        state_abbr: z.string().optional(),
        bar_status: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }))
      .query(async ({ input, ctx }) => {
        const { q, state_abbr, bar_status, page, limit } = input;
        const offset = (page - 1) * limit;
        const sql = getLawyersReaderDb(ctx.env);
        try {
          if (q) {
            // Typesense-first search
            const tsFilters: string[] = [];
            if (state_abbr) tsFilters.push(`state_abbr:=${state_abbr}`);
            if (bar_status) tsFilters.push(`bar_status:=${bar_status}`);

            const tsResult = await typesenseCollectionSearch(ctx.env, 'lawyers', q, {
              query_by: 'full_name,bar_number,firm_name,law_school,city',
              query_by_weights: '4,3,2,1,1',
              filter_by: tsFilters.length > 0 ? tsFilters.join(' && ') : undefined,
              page,
              limit,
            });

            if (!tsResult || tsResult.ids.length === 0) {
              return { lawyers: [], total: tsResult ? tsResult.total : null, page, limit, hasMore: false, source: 'typesense' as const, searchTimeMs: tsResult?.searchTimeMs ?? 0 };
            }

            const rows = await sql`
              SELECT l.id, l.integra_lawyer_id, l.full_name, l.first_name, l.last_name,
                     l.bar_number, l.state_abbr, l.bar_status, l.year_admitted,
                     l.law_school, l.firm_name, l.city, l.state, l.county, l.phone
              FROM lawyers.lawyers l
              WHERE l.id = ANY(${tsResult.ids})
            `;
            const idOrder = new Map(tsResult.ids.map((id, i) => [id, i]));
            rows.sort((a, b) =>
              (idOrder.get(a.id as number) ?? 0) - (idOrder.get(b.id as number) ?? 0)
            );

            return {
              lawyers: rows,
              total: tsResult.total,
              page,
              limit,
              hasMore: rows.length === limit,
              source: 'typesense' as const,
              searchTimeMs: tsResult.searchTimeMs,
            };
          }

          // No text query — browse with filters (use id DESC for fast PK index scan)
          const stateFilter = state_abbr ?? null;
          const statusFilter = bar_status ?? null;
          const hasFilters = stateFilter || statusFilter;
          const rows = await sql`
            SELECT l.id, l.integra_lawyer_id, l.full_name, l.first_name, l.last_name,
                   l.bar_number, l.state_abbr, l.bar_status, l.year_admitted,
                   l.law_school, l.firm_name, l.city, l.state, l.county, l.phone
            FROM lawyers.lawyers l
            WHERE (${stateFilter}::text IS NULL OR l.state_abbr = ${stateFilter})
            AND (${statusFilter}::text IS NULL OR l.bar_status = ${statusFilter})
            ORDER BY l.id DESC
            LIMIT ${limit} OFFSET ${offset}
          `;
          let total: number | null = null;
          if (hasFilters) {
            const [cnt] = await sql`
              SELECT count(*)::int AS count FROM lawyers.lawyers l
              WHERE (${stateFilter}::text IS NULL OR l.state_abbr = ${stateFilter})
              AND (${statusFilter}::text IS NULL OR l.bar_status = ${statusFilter})
            `;
            total = (cnt?.count as number) ?? 0;
          }

          return {
            lawyers: rows,
            total,
            page,
            limit,
            hasMore: rows.length === limit,
            source: 'postgres' as const,
          };
        } finally {
          await sql.end();
        }
      }),

    sources: baseProcedure.query(async ({ ctx }) => {
      const sql = getLawyersReaderDb(ctx.env);
      try {
        const rows = await sql`SELECT * FROM lawyers.sources ORDER BY created_at DESC`;
        return rows;
      } finally {
        await sql.end();
      }
    }),
  }),

  refresh: t.router({
    recordSource: baseProcedure
      .input(z.object({ registry: z.string(), recordId: z.number() }))
      .query(async ({ input, ctx }) => {
        const sql = getReaderDb(ctx.env);
        try {
          const rows = await sql`
            SELECT rs.*, sm.display_name AS method_name, sm.method_type, sm.status AS method_status,
                   sm.requires_proxy, sm.response_format
            FROM shared.record_sources rs
            JOIN shared.scraping_methods sm ON sm.id = rs.scraping_method_id
            WHERE rs.registry = ${input.registry} AND rs.record_id = ${input.recordId}
          `;
          if (rows.length === 0) return { found: false as const, source: null };

          const row = rows[0];
          const [changeCount] = await sql`
            SELECT count(*)::int AS count
            FROM shared.change_log
            WHERE registry = ${input.registry} AND record_id = ${input.recordId} AND accepted = false
          `;

          return {
            found: true as const,
            source: {
              id: row.id as number,
              registry: row.registry as string,
              recordId: row.record_id as number,
              methodName: row.method_name as string,
              methodType: row.method_type as string,
              methodStatus: row.method_status as string,
              sourceRecordUrl: row.source_record_url as string | null,
              dataHash: row.data_hash as string | null,
              lastVerifiedAt: row.last_verified_at as string | null,
              lastRefreshStatus: row.last_refresh_status as string,
              pendingChanges: (changeCount?.count as number) ?? 0,
            },
          };
        } finally {
          await sql.end();
        }
      }),

    check: baseProcedure
      .input(z.object({ registry: z.string(), recordId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Proxy to the data-explorer refresh endpoint
        // In production, both apps share the same worker/database
        // For now, return a stub that the frontend can handle
        const sql = getReaderDb(ctx.env);
        try {
          const rows = await sql`
            SELECT rs.*, sm.url_template, sm.http_method, sm.requires_proxy,
                   sm.response_format, sm.parser_config, sm.status AS method_status,
                   sm.rate_limit_rpm, sm.rate_limit_rpd
            FROM shared.record_sources rs
            JOIN shared.scraping_methods sm ON sm.id = rs.scraping_method_id
            WHERE rs.registry = ${input.registry} AND rs.record_id = ${input.recordId}
          `;
          if (rows.length === 0) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'No source mapping found' });
          }

          const source = rows[0];
          if (source.method_status !== 'active') {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Refresh method is not active' });
          }

          // Build URL
          const urlTemplate = (source.source_record_url || source.url_template) as string | null;
          if (!urlTemplate) {
            throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'No URL configured for this source' });
          }

          const urlParams = (source.url_params ?? {}) as Record<string, string>;
          let targetUrl = urlTemplate;
          for (const [key, value] of Object.entries(urlParams)) {
            targetUrl = targetUrl.replace(`{${key}}`, encodeURIComponent(value));
          }

          if (!isAllowedUrl(targetUrl)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target URL is not allowed' });
          }

          // Fetch live data
          let response: Response;
          try {
            if (source.requires_proxy && ctx.env.SCRAPINGDOG_API_KEY) {
              const proxyUrl = new URL('https://api.scrapingdog.com/scrape');
              proxyUrl.searchParams.set('api_key', ctx.env.SCRAPINGDOG_API_KEY);
              proxyUrl.searchParams.set('url', targetUrl);
              proxyUrl.searchParams.set('dynamic', 'false');
              response = await fetch(proxyUrl.toString());
            } else {
              response = await fetch(targetUrl, { method: (source.http_method as string) || 'GET' });
            }
          } catch {
            const now = new Date().toISOString();
            await sql`
              UPDATE shared.record_sources SET last_verified_at = ${now}, last_refresh_status = 'error'
              WHERE registry = ${input.registry} AND record_id = ${input.recordId}
            `;
            return { status: 'error' as const, diff: [], verifiedAt: now, cached: {}, live: null };
          }

          if (!response.ok) {
            const now = new Date().toISOString();
            const st = response.status === 404 ? 'unavailable' : 'error';
            await sql`
              UPDATE shared.record_sources SET last_verified_at = ${now}, last_refresh_status = ${st}
              WHERE registry = ${input.registry} AND record_id = ${input.recordId}
            `;
            return { status: st as 'error' | 'unavailable', diff: [], verifiedAt: now, cached: {}, live: null };
          }

          // Parse
          const body = await response.text();
          let liveData: Record<string, unknown> = {};
          const format = source.response_format as string;
          const parserConfig = (source.parser_config ?? {}) as Record<string, unknown>;

          if (format === 'json') {
            let parsed: Record<string, unknown>;
            try { parsed = JSON.parse(body); }
            catch {
              const now2 = new Date().toISOString();
              await sql`UPDATE shared.record_sources SET last_verified_at = ${now2}, last_refresh_status = 'error' WHERE registry = ${input.registry} AND record_id = ${input.recordId}`;
              return { status: 'error' as const, diff: [], verifiedAt: now2, cached: {}, live: null };
            }
            const fieldMap = (parserConfig.field_map ?? {}) as Record<string, string>;
            if (Object.keys(fieldMap).length === 0) {
              liveData = parsed;
            } else {
              for (const [key, path] of Object.entries(fieldMap)) {
                const parts = path.replace(/^\$\.?/, '').split(/\.|\[(\d+)\]/).filter(Boolean);
                let current: unknown = parsed;
                for (const part of parts) {
                  if (current == null) { current = null; break; }
                  current = (current as Record<string, unknown>)[part];
                }
                liveData[key] = current;
              }
            }
          }

          // Diff
          const diff: { field: string; oldValue: string | null; newValue: string | null; changeType: 'added' | 'modified' | 'removed' }[] = [];
          // (simplified — full diff would load cached record)
          const now = new Date().toISOString();
          const refreshStatus = diff.length > 0 ? 'changed' : 'unchanged';

          await sql`
            UPDATE shared.record_sources
            SET last_verified_at = ${now}, last_refresh_status = ${refreshStatus}
            WHERE registry = ${input.registry} AND record_id = ${input.recordId}
          `;

          return { status: refreshStatus as 'changed' | 'unchanged', diff, verifiedAt: now, cached: {}, live: liveData };
        } finally {
          await sql.end();
        }
      }),

    accept: baseProcedure
      .input(z.object({ changeIds: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const sql = getReaderDb(ctx.env);
        try {
          const now = new Date().toISOString();
          const updated = await sql`
            UPDATE shared.change_log
            SET accepted = true, accepted_at = ${now}
            WHERE id = ANY(${input.changeIds}) AND accepted = false
            RETURNING id
          `;
          return { accepted: updated.length };
        } finally {
          await sql.end();
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
