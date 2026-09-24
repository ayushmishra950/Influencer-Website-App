'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CreatorCard } from './CreatorCard';
import { CreatorFilters } from './CreatorFilters';
import { API_URL } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { useSession } from '@/lib/session';
import type { Category, Creator, LocationOptions, PageMeta } from '@/lib/types';

const PER_PAGE = 12;

interface Props {
  /** Rendered on the server, so this is what a crawler and a signed-out visitor see. */
  preview: Creator[];
  total: number;
  categories: Category[];
  locations: LocationOptions;
  query: Record<string, string | undefined>;
}

/**
 * The directory, gated softly.
 *
 * Signed out, the page shows the handful of creators the server rendered plus an
 * invitation to sign in — that HTML is real, indexable content, which is the point: a
 * crawler never signs in, so anything behind a login simply does not exist to it.
 * Every profile is still reachable from the sitemap, so the deep pages keep ranking.
 *
 * Signed in, this takes over and fetches the full, filterable, paged list from the API.
 */
export function CreatorsDirectory({ preview, total, categories, locations, query }: Props) {
  const { signedIn } = useSession();

  // The query object is rebuilt on every render; stringify it so the effect compares
  // values rather than identity and does not refetch forever.
  const queryKey = JSON.stringify(query);

  const [result, setResult] = useState<{ key: string; creators: Creator[]; meta: PageMeta } | null>(null);
  const [failure, setFailure] = useState<{ key: string } | null>(null);
  const requestId = useRef(0);

  // Derived, not stored. A `setLoading(true)` in the effect body would be a synchronous
  // state update on mount — an extra render for something the data already tells us.
  const loading = signedIn && result?.key !== queryKey && failure?.key !== queryKey;

  useEffect(() => {
    if (!signedIn) return;
    const current = ++requestId.current;

    (async () => {
      try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(JSON.parse(queryKey) as Record<string, string>)) {
          if (value) params.set(key, value);
        }
        params.set('limit', String(PER_PAGE));

        const response = await fetch(`${API_URL}/api/public/influencers?${params}`);
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        const body = (await response.json()) as { data: Creator[]; meta: PageMeta };

        // A slower earlier request must not overwrite a newer one's results.
        if (current !== requestId.current) return;
        setResult({ key: queryKey, creators: body.data, meta: body.meta });
      } catch {
        if (current !== requestId.current) return;
        setFailure({ key: queryKey });
      }
    })();
  }, [signedIn, queryKey]);

  const creators = result?.key === queryKey ? result.creators : (result?.creators ?? []);
  const meta = result?.key === queryKey ? result.meta : null;
  const error = failure?.key === queryKey ? 'Could not load the directory. Please try again.' : '';

  if (!signedIn) {
    return (
      <>
        <p className="prose-body mt-2 max-w-2xl text-[14.5px]">
          Every creator here has been reviewed by our team before being listed. Sign in to
          see the full directory and filter it by niche and city.
        </p>

        <p className="mt-6 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
          Showing {preview.length} of {pluralize(total, 'verified creator')}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((creator) => (
            <CreatorCard key={creator._id} creator={creator} />
          ))}
        </div>

        <div className="card mt-8 flex flex-col items-center gap-4 p-8 text-center sm:p-10">
          <h2 className="text-[22px]">See every creator</h2>
          <p className="prose-body max-w-md text-[14.5px]">
            Sign in to browse all {total} verified creators, filter by niche and city, and
            open the full directory. It is free — creator accounts are reviewed by our team.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn btn-primary">Sign in</Link>
            <Link href="/register" className="btn btn-ghost">Create an account</Link>
          </div>
        </div>
      </>
    );
  }

  const shown = creators.length > 0 ? creators : preview;

  return (
    <>
      <p className="prose-body mt-2 max-w-2xl text-[14.5px]">
        Every creator here has been reviewed by our team before being listed. Filter by
        niche and city to shortlist the ones who fit your brief.
      </p>

      <div className="mt-8">
        <CreatorFilters categories={categories} locations={locations} />
      </div>

      <p className="mt-6 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
        {loading
          ? 'Loading…'
          : meta && meta.total > 0
            ? pluralize(meta.total, 'creator')
            : 'No creators match your filters'}
      </p>

      {!!error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border px-3.5 py-2.5 text-[13px]"
          style={{
            background: 'var(--rose-bg)',
            color: 'var(--rose-400)',
            borderColor: 'color-mix(in srgb, var(--rose-400) 30%, transparent)',
          }}
        >
          {error}
        </p>
      )}

      {shown.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
          {shown.map((creator) => (
            <CreatorCard key={creator._id} creator={creator} />
          ))}
        </div>
      ) : (
        !loading && (
          <div className="card mt-6 p-10 text-center">
            <p className="text-[16px] font-bold">Nothing matched</p>
            <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">
              Try a different niche or city, or clear the filters to see everyone listed.
            </p>
          </div>
        )
      )}

      {!!meta && meta.totalPages > 1 && <ClientPagination meta={meta} query={query} />}
    </>
  );
}

/** Links, not buttons, so a page can still be shared or opened in a new tab. */
function ClientPagination({ meta, query }: { meta: PageMeta; query: Record<string, string | undefined> }) {
  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value && key !== 'page') params.set(key, value);
    }
    if (page > 1) params.set('page', String(page));
    const serialised = params.toString();
    return serialised ? `/creators?${serialised}` : '/creators';
  };

  const previous = meta.page > 1 ? meta.page - 1 : null;
  const next = meta.page < meta.totalPages ? meta.page + 1 : null;

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-between gap-4">
      {previous ? (
        <Link href={href(previous)} rel="prev" className="btn btn-ghost">← Previous</Link>
      ) : (
        <span className="btn btn-ghost pointer-events-none opacity-40" aria-hidden="true">← Previous</span>
      )}
      <p className="text-[13.5px]" style={{ color: 'var(--text-3)' }}>
        Page {meta.page} of {meta.totalPages}
      </p>
      {next ? (
        <Link href={href(next)} rel="next" className="btn btn-ghost">Next →</Link>
      ) : (
        <span className="btn btn-ghost pointer-events-none opacity-40" aria-hidden="true">Next →</span>
      )}
    </nav>
  );
}
