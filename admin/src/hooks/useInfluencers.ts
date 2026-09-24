import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import type {
  BulkAction, Category, Enquiry, EnquiryFilters, EnquiryStatus,
  Influencer, InfluencerFilters, Paged, Package, Stats,
} from '@/lib/types';

export const DEFAULT_FILTERS: InfluencerFilters = {
  q: '', status: 'all', archived: 'false', category: '',
  country: '', state: '', city: '', page: 1, limit: 20, sort: 'recent',
};

/** Drops empty values so they never reach the URL as `?country=`. */
function toParams(filters: InfluencerFilters): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined),
  ) as Record<string, string | number>;
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => (await api.get<{ data: Stats }>('/api/admin/stats')).data.data,
  });
}

export function useInfluencerList(filters: InfluencerFilters) {
  return useQuery({
    queryKey: ['influencers', filters],
    queryFn: async () =>
      (await api.get<Paged<Influencer>>('/api/admin/influencers', { params: toParams(filters) })).data,
    placeholderData: (previous) => previous, // keeps the table steady while paging
  });
}

export function useInfluencer(id?: string) {
  return useQuery({
    queryKey: ['influencer', id],
    queryFn: async () => (await api.get<{ data: Influencer }>(`/api/admin/influencers/${id}`)).data.data,
    enabled: !!id,
  });
}

/**
 * The full category list, for dropdowns that must offer every option.
 * The endpoint pages by default, so this asks for the whole set explicitly —
 * categories are master data, and the schema caps the request at 200.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'all'],
    queryFn: async () =>
      (await api.get<{ data: Category[] }>('/api/admin/categories', { params: { limit: 200 } }))
        .data.data,
    staleTime: 5 * 60_000,
  });
}

/** One page of categories for the management screen. */
export function useCategoryPage(page: number, limit = 20) {
  return useQuery({
    queryKey: ['categories', 'page', page, limit],
    queryFn: async () =>
      (await api.get<Paged<Category>>('/api/admin/categories', { params: { page, limit } })).data,
    // Keeps the current page on screen while the next one loads, so paging never
    // collapses the view back to a spinner.
    placeholderData: (previous) => previous,
  });
}

/** Every mutation invalidates the list and the dashboard counters together. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['influencers'] });
    void queryClient.invalidateQueries({ queryKey: ['influencer'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };
}

type SingleAction = 'approve' | 'reject' | 'archive' | 'restore';

export function useInfluencerAction() {
  const refresh = useRefreshAll();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: SingleAction; reason?: string }) => {
      const { data } = await api.patch<{ message: string }>(
        `/api/admin/influencers/${id}/${action}`,
        action === 'reject' ? { reason: reason ?? '' } : {},
      );
      return data.message;
    },
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export function useDeleteInfluencer() {
  const refresh = useRefreshAll();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.delete<{ message: string }>(`/api/admin/influencers/${id}`);
      return data.message;
    },
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export function useBulkAction() {
  const refresh = useRefreshAll();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async ({ action, ids, reason }: { action: BulkAction; ids: string[]; reason?: string }) => {
      const { data } = await api.post<{ message: string }>('/api/admin/influencers/bulk', {
        action,
        ids,
        reason: reason ?? '',
        // The server rejects a bulk delete without this; the UI asks first.
        confirm: action === 'delete',
      });
      return data.message;
    },
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export function useSaveInfluencer(id?: string) {
  const refresh = useRefreshAll();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const request = id
        ? api.put<{ data: Influencer; message: string }>(`/api/admin/influencers/${id}`, payload)
        : api.post<{ data: Influencer; message: string }>('/api/admin/influencers', payload);
      return (await request).data;
    },
    onSuccess: ({ message }) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

/* ------------------------------------------------------------------ packages */

export interface PackageFilters {
  status: Package['status'] | 'all';
  q: string;
  page: number;
  limit: number;
}

export const DEFAULT_PACKAGE_FILTERS: PackageFilters = {
  status: 'pending',
  q: '',
  page: 1,
  limit: 20,
};

export function usePackageList(filters: PackageFilters) {
  return useQuery({
    queryKey: ['packages', filters],
    queryFn: async () =>
      (
        await api.get<Paged<Package>>('/api/admin/packages', {
          params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
        })
      ).data,
    placeholderData: (previous) => previous,
  });
}

function useRefreshPackages() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['packages'] });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function usePackageReview() {
  const refresh = useRefreshPackages();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async ({ id, action, reason }: { id: string; action: 'approve' | 'reject'; reason?: string }) => {
      const { data } = await api.patch<{ message: string }>(
        `/api/admin/packages/${id}/${action}`,
        action === 'reject' ? { reason: reason ?? '' } : {},
      );
      return data.message;
    },
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export function useDeletePackage() {
  const refresh = useRefreshPackages();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<{ message: string }>(`/api/admin/packages/${id}`)).data.message,
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export const DEFAULT_ENQUIRY_FILTERS: EnquiryFilters = {
  status: 'new',
  q: '',
  page: 1,
  limit: 20,
};

/** `meta.newCount` is the whole inbox, not this page, so the badge stays honest. */
export function useEnquiryList(filters: EnquiryFilters) {
  return useQuery({
    queryKey: ['enquiries', filters],
    queryFn: async () =>
      (
        await api.get<Paged<Enquiry> & { meta: { newCount: number } }>('/api/admin/enquiries', {
          params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
        })
      ).data,
    placeholderData: (previous) => previous,
  });
}

function useRefreshEnquiries() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['enquiries'] });
    // The sidebar badge is driven by /stats, so it has to be refetched too.
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  };
}

export function useUpdateEnquiry() {
  const refresh = useRefreshEnquiries();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      status?: EnquiryStatus;
      note?: string;
    }) => (await api.patch<{ message: string }>(`/api/admin/enquiries/${id}`, payload)).data.message,
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}

export function useDeleteEnquiry() {
  const refresh = useRefreshEnquiries();
  const { notify } = useToast();

  return useMutation({
    mutationFn: async (id: string) =>
      (await api.delete<{ message: string }>(`/api/admin/enquiries/${id}`)).data.message,
    onSuccess: (message) => {
      refresh();
      notify(message);
    },
    onError: (error) => notify(errorMessage(error), 'error'),
  });
}
