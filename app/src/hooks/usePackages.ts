import { useCallback, useEffect, useState } from 'react';
import { request } from '@/lib/api';
import { SOCKET_EVENTS } from '@/lib/socket';
import { useSocketEvent } from './useSocketEvent';
import type { Package } from '@/lib/types';

export interface PackageDraft {
  title: string;
  description: string;
  price: string;
  deliveryDays: string;
}

interface PackagesResponse {
  data: Package[];
  meta: { total: number; limit: number };
}

/** The signed-in influencer's own packages, including the ones awaiting review. */
export function useMyPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [limit, setLimit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await request<PackagesResponse>('/api/influencer/packages', {
        ...(signal ? { signal } : {}),
      });
      setPackages(res.data);
      setLimit(res.meta.limit);
      setError('');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  // An admin approving or rejecting changes this list from the other side, so the
  // server tells us rather than making the influencer pull to refresh.
  useSocketEvent(SOCKET_EVENTS.PACKAGE_CHANGED, () => {
    void refresh();
  });

  /** Both create and edit return the package to `pending`, which the server enforces. */
  const save = useCallback(
    async (draft: PackageDraft, id?: string) => {
      const body = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        price: Number(draft.price),
        deliveryDays: draft.deliveryDays ? Number(draft.deliveryDays) : 0,
      };
      const response = await request<{ data: Package; message: string }>(
        id ? `/api/influencer/packages/${id}` : '/api/influencer/packages',
        { method: id ? 'PUT' : 'POST', body },
      );
      await refresh();
      return response.message;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await request(`/api/influencer/packages/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh],
  );

  return { packages, limit, loading, error, refresh, save, remove };
}
