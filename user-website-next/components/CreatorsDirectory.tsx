import Link from 'next/link';
import { CreatorCard } from './CreatorCard';
import { CreatorFilters } from './CreatorFilters';
import { pluralize } from '@/lib/format';
import type { Category, Creator, LocationOptions, PageMeta } from '@/lib/types';

interface Props {
  creators: Creator[];
  meta: PageMeta;
  categories: Category[];
  locations: LocationOptions;
  query: Record<string, string | undefined>;
  /** Whether anything is narrowing the list, which changes what an empty result means. */
  filtered: boolean;
}

/**
 * The public directory. No sign-in, no preview slice -- everyone gets the whole list.
 *
 * Rendered entirely on the server. The filters write to the URL and the server answers
 * with the matching page, so every combination is a real address that can be shared,
 * and a crawler sees the same creators a visitor does. It also means this page needs no
 * browser-side call to the API at all.
 */
export function CreatorsDirectory({ creators, meta, categories, locations, query, filtered }: Props) {
  return (
    <>
      <p className="prose-body mt-2 max-w-2xl text-[14.5px]">
        Every creator here has been reviewed by our team before being listed. Search by
        name, or narrow the list by niche, country, state and city.
      </p>

      <div className="mt-8">
        <CreatorFilters categories={categories} locations={locations} />
      </div>

      <p className="mt-6 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
        {meta.total > 0
          ? filtered
            ? `${pluralize(meta.total, 'creator')} matching`
            : pluralize(meta.total, 'verified creator')
          : filtered
            ? 'No creators match these filters'
            : 'No creators listed yet'}
      </p>

      {creators.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <CreatorCard key={creator._id} creator={creator} />
          ))}
        </div>
      ) : (
        <div className="card mt-6 p-10 text-center">
          <p className="text-[16px] font-bold">
            {filtered ? 'Nothing matched' : 'Nobody is listed yet'}
          </p>
          <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">
            {filtered
              ? 'Try a different niche or city, or clear the filters to see everyone listed.'
              : 'Creators appear here once our team has reviewed their registration.'}
          </p>
          {filtered && (
            <Link href="/creators" className="btn btn-ghost mt-5">Clear filters</Link>
          )}
        </div>
      )}

      {meta.totalPages > 1 && <Pagination meta={meta} query={query} />}
    </>
  );
}

/** Links, not buttons, so a page can still be shared or opened in a new tab. */
function Pagination({ meta, query }: { meta: PageMeta; query: Record<string, string | undefined> }) {
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
