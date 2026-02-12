export interface Parcel {
  id: number;
  fips5: string;
  fips_state: string;
  composite_key: string;
  apn_raw: string | null;
  apn_normalized: string | null;
  address_full: string | null;
  street_number: string | null;
  street_name: string | null;
  unit: string | null;
  city: string | null;
  state_abbr: string | null;
  zip5: string | null;
  zip4: string | null;
  county_name: string | null;
  owner_name: string | null;
  owner_type: string | null;
  land_use_code: string | null;
  land_use_category: string | null;
  zoning: string | null;
  year_built: number | null;
  building_sqft: number | null;
  lot_size_sqft: number | null;
  lot_size_acres: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  stories: number | null;
  assessed_value_land: number | null;
  assessed_value_improve: number | null;
  assessed_value_total: number | null;
  market_value_total: number | null;
  tax_amount: number | null;
  tax_year: number | null;
  latitude: number | null;
  longitude: number | null;
  upi: string | null;
  integra_id: string | null;
  registered_at: string | null;
  chain_id: number | null;
  source_id: number | null;
  crawl_run_id: number | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface FeedEntry {
  id: number;
  address: string | null;
  city: string | null;
  region: string | null;
  zip: string | null;
  country: string;
  landUse: string | null;
  owner: string | null;
  source: string;
  ts: number;
}

export interface Source {
  id: number;
  fips5: string;
  state_abbr: string;
  county_name: string;
  country: string;
  source_type: string;
  source_url: string;
  format: string;
  status: string;
  parcel_count: number | null;
  last_crawled_at: string | null;
  last_success_at: string | null;
  error_message: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlRun {
  id: number;
  source_id: number;
  state_abbr: string;
  county_name: string;
  country: string;
  status: string;
  parcels_found: number | null;
  parcels_new: number | null;
  parcels_errors: number | null;
  started_at: string;
  completed_at: string | null;
  duration_secs: number | null;
}

export interface StateCoverage {
  state_abbr: string;
  total_counties: number;
  total_parcels: number;
  total_housing_units: number;
  avg_coverage: number;
  with_state_bulk: number;
  with_county_gis: number;
}

export interface CountyRow {
  fips5: string;
  county_name: string;
  our_parcel_count: number;
  census_housing_units: number;
  coverage_pct: number;
  has_state_bulk: boolean;
  has_county_gis: boolean;
  best_source_id: number | null;
  quality_score: number | null;
}

export interface LoadedArea {
  id: number;
  fips5: string;
  state_abbr: string;
  county_name: string;
  source_type: string;
  format: string;
  status: string;
  parcel_count: number | null;
  actual_count: number;
  last_success_at: string | null;
  country: string;
}

export interface StatsResponse {
  totalParcels: number;
  totalSources: number;
  countryCount: number;
  sourcesByStatus: { status: string; count: number }[];
  recentCrawlRuns: CrawlRun[];
  loadedAreas: LoadedArea[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Env {
  HYPERDRIVE_READER: { connectionString: string };
  HYPERDRIVE_WRITER: { connectionString: string };
  RE_DOWNLOAD_QUEUE: Queue;
  CACHE?: KVNamespace;
  ENVIRONMENT?: string;
  UPSTASH_REDIS_REST_URL: string;
  UPSTASH_REDIS_REST_TOKEN: string;
  TYPESENSE_HOST: string;
  TYPESENSE_API_KEY: string;
  SCRAPINGDOG_API_KEY?: string;
}
