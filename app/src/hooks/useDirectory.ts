import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '@/lib/api';
import type { DirectoryInfluencer, DirectoryFilters, PageMeta, Paged } from '@/lib/types';

const PAGE_SIZE = 10;

export const EMPTY_FILTERS: DirectoryFilters = {
  q: '', category: '', country: '', state: '', city: '',
};

/**
 * Paginated public directory with infinite scroll.
 *
 * Each fetch carries a request id; a response whose id is stale is discarded, so a
 * slow page-1 response can never overwrite the results of a newer filter.
 */
export function useDirectory(filters: DirectoryFilters) {
  const [items, setItems] = useState<DirectoryInfluencer[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const requestId = useRef(0);

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      const id = ++requestId.current;
      if (mode === 'append') setLoadingMore(true);
      else if (page === 1 && items.length === 0) setLoading(true);

      try {
        const response = await request<Paged<DirectoryInfluencer>>('/api/public/influencers', {
          auth: false,
          params: {
            page,
            limit: PAGE_SIZE,
            q: filters.q || undefined,
            category: filters.category || undefined,
            country: filters.country || undefined,
            state: filters.state || undefined,
            city: filters.city || undefined,
          },
        });

        if (id !== requestId.current) return; // a newer request has superseded this one

        setItems((current) => (mode === 'append' ? [...current, ...response.data] : response.data));
        setMeta(response.meta);
        setError('');
      } catch (err) {
        if (id === requestId.current) setError((err as Error).message);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    // `items.length` only gates the initial spinner; including it would refetch on every page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.q, filters.category, filters.country, filters.state, filters.city],
  );

  useEffect(() => {
    void fetchPage(1, 'replace');
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !meta?.hasMore) return;
    void fetchPage(meta.page + 1, 'append');
  }, [fetchPage, loading, loadingMore, meta]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void fetchPage(1, 'replace');
  }, [fetchPage]);

  return { items, meta, loading, loadingMore, refreshing, error, loadMore, refresh };
}
