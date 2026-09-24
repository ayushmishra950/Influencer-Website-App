import { slugify } from './format';
import type {
  Brief, Category, Creator, LocationOptions, Paged, PublicPackage, Stats,
} from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5050').replace(/\/$/, '');

/**
 * How long a fetched page stays fresh before Next re-requests it.
 *
 * The directory changes when an administrator approves someone, which is minutes-scale,
 * not seconds-scale. Caching for a minute keeps pages static and fast for crawlers
 * without serving a creator who was approved an hour ago as "not found".
 */
const REVALIDATE = 60;

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}

class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function get<T>(path: string, revalidate = REVALIDATE): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with ${response.status}`);
  }
  const body = (await response.json()) as Envelope<T>;
  return body.data;
}

/**
 * Reads that a page can survive without.
 *
 * A directory listing whose stats strip is missing is still a useful page; one that
 * returns a 500 because the API blinked is not. Anything essential to the page —
 * a creator's own profile — is fetched with `get` so the route can 404 properly.
 */
async function getOr<T>(path: string, fallback: T): Promise<T> {
  try {
    return await get<T>(path);
  } catch {
    return fallback;
  }
}

export interface CreatorQuery {
  q?: string;
  category?: string;
  country?: string;
  state?: string;
  city?: string;
  sort?: 'recent' | 'name';
  page?: number;
  limit?: number;
}

function toQueryString(query: CreatorQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && `${value}` !== '') params.set(key, `${value}`);
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : '';
}

export async function fetchStats(): Promise<Stats | null> {
  return getOr<Stats | null>('/api/public/stats', null);
}

export async function fetchCategories(): Promise<Category[]> {
  return getOr<Category[]>('/api/public/categories', []);
}

/**
 * Location options for the filter bar.
 *
 * The endpoint is deliberately chained: states only come back for a given country, and
 * cities only for a given country + state. Calling it bare returns countries and two
 * empty lists — which is what silently emptied the state and city dropdowns.
 */
export async function fetchLocationOptions(
  country?: string,
  state?: string,
): Promise<LocationOptions> {
  const params = new URLSearchParams();
  if (country) params.set('country', country);
  if (country && state) params.set('state', state);
  const query = params.toString();
  return getOr<LocationOptions>(
    `/api/public/locations${query ? `?${query}` : ''}`,
    { countries: [], states: [], cities: [] },
  );
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Turns a niche slug into the id the API filters on.
 *
 * URLs carry slugs because "/category/beauty" is worth something to a search engine and
 * a 24-character hex string is not, but `category` on an influencer is an ObjectId — the
 * API matches it raw and errors on anything else. This is the one place that bridges the
 * two. An unknown slug returns undefined, which correctly lists nobody.
 */
export async function resolveCategoryId(slugOrId?: string): Promise<string | undefined> {
  if (!slugOrId) return undefined;
  if (OBJECT_ID.test(slugOrId)) return slugOrId;
  const categories = await fetchCategories();
  return categories.find((category) => category.slug === slugOrId)?._id;
}

export async function fetchCreators(query: CreatorQuery = {}): Promise<Paged<Creator>> {
  const path = `/api/public/influencers${toQueryString(query)}`;
  try {
    const response = await fetch(`${API_URL}${path}`, { next: { revalidate: REVALIDATE } });
    if (!response.ok) throw new ApiError(response.status, `GET ${path} failed`);
    const body = (await response.json()) as { data: Creator[]; meta: Paged<Creator>['meta'] };
    return { data: body.data, meta: body.meta };
  } catch {
    return { data: [], meta: { page: 1, limit: query.limit ?? 12, total: 0, totalPages: 1 } };
  }
}

/** `null` means "not in the directory" — a 404 for the page, not an error. */
export async function fetchCreator(id: string): Promise<Creator | null> {
  try {
    return await get<Creator>(`/api/public/influencers/${id}`);
  } catch {
    return null;
  }
}

export async function fetchCreatorPackages(id: string): Promise<PublicPackage[]> {
  return getOr<PublicPackage[]>(`/api/public/influencers/${id}/packages`, []);
}

/** Absolute URL for an upload path the API returns as `/uploads/...`. */
export function imageUrl(path?: string): string {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Briefs an admin has published for creators to read. Never carries contact details. */
export async function fetchBriefs(limit = 20): Promise<Brief[]> {
  return getOr<Brief[]>(`/api/public/briefs?limit=${limit}`, []);
}

/**
 * Every city that has a listed creator, with the slug its page lives at.
 *
 * Derived from the creators rather than the locations endpoint, which is chained and
 * cannot hand back every city in one call. The directory is small enough that one pass
 * is cheaper than asking per state.
 */
export async function fetchCities(): Promise<{ name: string; slug: string; count: number }[]> {
  const { data } = await fetchCreators({ limit: 100, sort: 'recent' });

  const counts = new Map<string, number>();
  for (const creator of data) {
    const city = creator.location?.city?.trim();
    if (city) counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** A city slug back to the name the API filters on, or null if nobody is listed there. */
export async function resolveCity(slug?: string): Promise<{ name: string; count: number } | null> {
  if (!slug) return null;
  const match = (await fetchCities()).find((city) => city.slug === slug);
  return match ? { name: match.name, count: match.count } : null;
}
