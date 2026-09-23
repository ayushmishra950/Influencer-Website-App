import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/api';
import type { Category, DirectoryInfluencer } from '@/lib/types';

export interface PublicStats {
  totalCreators: number;
  totalCities: number;
  totalCategories: number;
  spotlight: DirectoryInfluencer[];
}

type CategoryWithCount = Category & { influencerCount?: number };

/** Everything the landing page opens with, in one place. */
export function useLanding() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [recent, setRecent] = useState<DirectoryInfluencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      // One render, not three: the page should not pop in section by section.
      const [statsRes, categoriesRes, recentRes] = await Promise.all([
        request<{ data: PublicStats }>('/api/public/stats', { auth: false, ...(signal ? { signal } : {}) }),
        request<{ data: CategoryWithCount[] }>('/api/public/categories', { auth: false, ...(signal ? { signal } : {}) }),
        request<{ data: DirectoryInfluencer[] }>('/api/public/influencers', {
          auth: false,
          params: { limit: 5, sort: 'recent' },
          ...(signal ? { signal } : {}),
        }),
      ]);
      setStats(statsRes.data);
      setCategories(categoriesRes.data);
      setRecent(recentRes.data);
      setError('');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refresh = useCallback(() => load(), [load]);

  return { stats, categories, recent, loading, error, refresh };
}
