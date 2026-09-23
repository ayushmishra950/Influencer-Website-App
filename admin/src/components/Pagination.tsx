import { Icon } from './Icon';
import type { PageMeta } from '@/lib/types';

interface PaginationProps {
  meta: PageMeta;
  onChange: (page: number) => void;
  /** What is being counted, for the summary line. */
  noun?: string;
  /** Needed whenever the plural is not simply noun + "s" (category -> categories). */
  nounPlural?: string;
}

/** At most 5 numbers, keeping the current page centred where the range allows. */
function pageWindow(current: number, total: number): number[] {
  const span = Math.min(5, total);
  let start = Math.max(1, current - Math.floor(span / 2));
  if (start + span - 1 > total) start = total - span + 1;
  return Array.from({ length: span }, (_, i) => start + i);
}

export function Pagination({ meta, onChange, noun = 'result', nounPlural }: PaginationProps) {
  const plural = nounPlural ?? `${noun}s`;
  const pages = pageWindow(meta.page, meta.totalPages);
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);

  const onFirst = meta.page <= 1;
  const onLast = meta.page >= meta.totalPages;

  return (
    <nav
      className="between wrap gap-3"
      aria-label="Pagination"
      style={{ padding: '14px 16px', borderTop: '1px solid var(--line)' }}
    >
      <style>{`
        /* Numbers are a convenience; Previous/Next are the primary controls and
           stay visible when the bar has to wrap on a narrow screen. */
        @media (max-width: 640px) { .page-numbers { display: none; } }
      `}</style>

      <span className="dim mono" style={{ fontSize: 12.5 }}>
        {meta.total === 0
          ? `No ${plural}`
          : `${from}–${to} of ${meta.total} ${meta.total === 1 ? noun : plural}`}
        {meta.totalPages > 1 && (
          <span className="dim"> · page {meta.page} of {meta.totalPages}</span>
        )}
      </span>

      <div className="row gap-1">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(meta.page - 1)}
          disabled={onFirst}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={14} />
          Previous
        </button>

        <span className="page-numbers row gap-1">
          {pages[0]! > 1 && <span className="dim center" style={{ width: 22 }}>…</span>}
          {pages.map((page) => (
            <button
              key={page}
              className={`btn btn-icon ${page === meta.page ? 'btn-primary' : 'btn-subtle'}`}
              onClick={() => onChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === meta.page ? 'page' : undefined}
              style={{ fontVariantNumeric: 'tabular-nums', height: 32, width: 32 }}
            >
              {page}
            </button>
          ))}
          {pages.at(-1)! < meta.totalPages && <span className="dim center" style={{ width: 22 }}>…</span>}
        </span>

        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onChange(meta.page + 1)}
          disabled={onLast}
          aria-label="Next page"
        >
          Next
          <Icon name="chevronRight" size={14} />
        </button>
      </div>
    </nav>
  );
}
