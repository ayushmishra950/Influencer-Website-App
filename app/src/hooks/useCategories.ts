import { useEffect, useState } from 'react';
import { request } from '@/lib/api';
import type { Category } from '@/lib/types';

/** Category master list — needed by registration, profile editing and directory filters. */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    request<{ data: Category[] }>('/api/public/categories', { auth: false, signal: controller.signal })
      .then(({ data }) => setCategories(data))
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return { categories, loading };
}
