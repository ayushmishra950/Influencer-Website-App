import Link from 'next/link';
import type { PageMeta } from '@/lib/types';

/**
 * Real links, not buttons: a crawler can follow them to page two, and a visitor can
 * open one in a new tab. The rel hints tell search engines these are one sequence.
 */
export function Pagination({ meta, basePath, params }: {
  meta: PageMeta;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (meta.totalPages <= 1) return null;

  const href = (page: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (page > 1) search.set('page', String(page));
    const serialised = search.toString();
    return serialised ? `${basePath}?${serialised}` : basePath;
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
