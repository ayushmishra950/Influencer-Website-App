import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FilterBar } from './FilterBar';
import { InfluencerTable, type RowAction } from './InfluencerTable';
import { BulkBar } from './BulkBar';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { PageLoader } from './Spinner';
import {
  DEFAULT_FILTERS,
  useBulkAction,
  useDeleteInfluencer,
  useInfluencerAction,
  useInfluencerList,
} from '@/hooks/useInfluencers';
import { useConfirm } from '@/context/ConfirmContext';
import {
  confirmApprove,
  confirmArchive,
  confirmBulk,
  confirmDelete,
  confirmReject,
  confirmRestore,
} from '@/lib/confirmations';
import type { BulkAction, Influencer, InfluencerFilters } from '@/lib/types';

interface InfluencerManagerProps {
  /**
   * The page's heading. Owned by this component so that the loading state can
   * replace the entire view, keeping the spinner in the centre of the page rather
   * than pushed below a heading on some screens and not others.
   */
  header?: React.ReactNode;
  /** Filters the page pins and the user cannot change (e.g. archived-only). */
  lockedFilters?: Partial<InfluencerFilters>;
  showStatusFilter?: boolean;
  bulkActions: BulkAction[];
  emptyTitle: string;
  emptyDescription: string;
  /** Read the initial filters from the URL, so dashboard tiles can deep-link. */
  readUrlFilters?: boolean;
}

export function InfluencerManager({
  header,
  lockedFilters,
  showStatusFilter = true,
  bulkActions,
  emptyTitle,
  emptyDescription,
  readUrlFilters = false,
}: InfluencerManagerProps) {
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<InfluencerFilters>(() => ({
    ...DEFAULT_FILTERS,
    ...(readUrlFilters
      ? {
          status: (searchParams.get('status') as InfluencerFilters['status']) ?? DEFAULT_FILTERS.status,
          archived: (searchParams.get('archived') as InfluencerFilters['archived']) ?? DEFAULT_FILTERS.archived,
        }
      : {}),
    ...lockedFilters,
  }));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const confirm = useConfirm();

  const { data, isLoading, isFetching } = useInfluencerList(filters);
  const rowAction = useInfluencerAction();
  const deleteOne = useDeleteInfluencer();
  const bulk = useBulkAction();

  const items = useMemo(() => data?.data ?? [], [data]);
  const busy = rowAction.isPending || deleteOne.isPending || bulk.isPending;

  // Deleting the last row on a page can leave the current page beyond the end of the
  // result set. Step back rather than showing an empty table.
  useEffect(() => {
    const meta = data?.meta;
    if (meta && meta.page > meta.totalPages) {
      setFilters((current) => ({ ...current, page: meta.totalPages }));
    }
  }, [data?.meta]);

  const patchFilters = useCallback(
    (patch: Partial<InfluencerFilters>) => {
      // Any change other than paging returns to page 1, or the view can look empty.
      setFilters((current) => ({ ...current, ...patch, ...('page' in patch ? {} : { page: 1 }) }));
      setSelected(new Set());
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...lockedFilters });
    setSelected(new Set());
  }, [lockedFilters]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((current) =>
      items.every((item) => current.has(item._id)) ? new Set() : new Set(items.map((i) => i._id)),
    );

  // First load fills the page with one centred loader. `isLoading` is only true when
  // there is no data at all — later filter changes keep the previous page on screen
  // (see `placeholderData`) and just dim it, which is far less jarring than the whole
  // view collapsing back to a spinner on every keystroke.
  if (isLoading) return <PageLoader label="Loading influencers" />;

  /** Every row action asks first, including the reversible ones. */
  async function requestAction(influencer: Influencer, action: RowAction) {
    const options = {
      approve: confirmApprove,
      reject: confirmReject,
      archive: confirmArchive,
      restore: confirmRestore,
      delete: confirmDelete,
    }[action](influencer.name);

    const { confirmed, reason } = await confirm(options);
    if (!confirmed) return;

    setBusyId(influencer._id);
    const done = () => setBusyId(undefined);

    if (action === 'delete') {
      deleteOne.mutate(influencer._id, { onSettled: done });
      return;
    }
    rowAction.mutate(
      { id: influencer._id, action, ...(action === 'reject' ? { reason } : {}) },
      { onSettled: done },
    );
  }

  async function requestBulk(action: BulkAction) {
    const ids = [...selected];
    if (!ids.length) return;

    const { confirmed, reason } = await confirm(confirmBulk(action, ids.length));
    if (!confirmed) return;

    bulk.mutate({ action, ids, reason }, { onSuccess: () => setSelected(new Set()) });
  }

  return (
    <>
      {header}

      <FilterBar
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
        showStatus={showStatusFilter}
      />

      <div className="card" style={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .15s' }}>
        {items.length === 0 ? (
          <EmptyState icon="users" title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <InfluencerTable
              items={items}
              selected={selected}
              onToggle={toggle}
              onToggleAll={toggleAll}
              onAction={requestAction}
              busyId={busyId}
            />
            {data?.meta && (
              <Pagination
                meta={data.meta}
                noun="influencer"
                onChange={(page) => {
                  patchFilters({ page });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </>
        )}
      </div>

      <BulkBar
        count={selected.size}
        actions={bulkActions}
        busy={busy}
        onAction={requestBulk}
        onClear={() => setSelected(new Set())}
      />

    </>
  );
}
