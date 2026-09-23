import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { api } from '@/lib/api';
import { useDebounced } from '@/hooks/useDebounced';
import { useCategories } from '@/hooks/useInfluencers';
import type { InfluencerFilters, Status } from '@/lib/types';

interface LocationOptions {
  countries: string[];
  states: string[];
  cities: string[];
}

interface FilterBarProps {
  filters: InfluencerFilters;
  onChange: (patch: Partial<InfluencerFilters>) => void;
  onReset: () => void;
  /** Hidden where the page already pins a status (review queue, archive). */
  showStatus?: boolean;
}

const STATUS_OPTIONS: { value: Status | 'all'; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export function FilterBar({ filters, onChange, onReset, showStatus = true }: FilterBarProps) {
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebounced(search);
  const { data: categories } = useCategories();

  /**
   * Options come from the ADMIN endpoint, scoped to the same status/archived window
   * this page is showing. The public endpoint only knows about approved, non-archived
   * records, which made it impossible to filter the Archived or Review lists by the
   * very locations they contain.
   */
  const { data: locations } = useQuery({
    queryKey: ['admin-locations', filters.status, filters.archived, filters.country, filters.state],
    queryFn: async () =>
      (
        await api.get<{ data: LocationOptions }>('/api/admin/locations', {
          params: {
            status: filters.status,
            archived: filters.archived,
            country: filters.country || undefined,
            state: filters.state || undefined,
          },
        })
      ).data.data,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (debouncedSearch !== filters.q) onChange({ q: debouncedSearch });
    // Only the debounced value should trigger a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep the box in step when the page resets filters from outside.
  useEffect(() => {
    if (filters.q === '') setSearch('');
  }, [filters.q]);

  const activeCount = [
    filters.q, filters.category, filters.country, filters.state, filters.city,
    showStatus && filters.status !== 'all' ? filters.status : '',
  ].filter(Boolean).length;

  return (
    <div className="card card-pad stack gap-3" style={{ marginBottom: 16 }}>
      <div className="row wrap gap-2">
        <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
          <span className="dim" style={{ position: 'absolute', left: 12, display: 'flex', pointerEvents: 'none' }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input"
            style={{ paddingLeft: 36 }}
            placeholder="Search name, email or city…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search influencers"
          />
        </div>

        {showStatus && (
          <select
            className="select"
            style={{ width: 'auto', minWidth: 150 }}
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value as Status | 'all' })}
            aria-label="Filter by status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        )}

        <select
          className="select"
          style={{ width: 'auto', minWidth: 150 }}
          value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories?.map((category) => (
            <option key={category._id} value={category._id}>{category.name}</option>
          ))}
        </select>

        {activeCount > 0 && (
          <button className="btn btn-subtle" onClick={onReset}>
            <Icon name="close" size={14} />
            Clear ({activeCount})
          </button>
        )}
      </div>

      <div className="row wrap gap-2">
        <span className="dim row gap-2" style={{ fontSize: 12.5 }}>
          <Icon name="pin" size={14} /> Location
        </span>

        <select
          className="select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filters.country}
          onChange={(e) => onChange({ country: e.target.value, state: '', city: '' })}
          aria-label="Filter by country"
        >
          <option value="">All countries</option>
          {locations?.countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>

        {/* Not gated on country: the API filters on state independently, so forcing a
            country first was pure friction — and with one country it never helped. */}
        <select
          className="select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filters.state}
          onChange={(e) => onChange({ state: e.target.value, city: '' })}
          disabled={!locations?.states.length}
          aria-label="Filter by state"
        >
          <option value="">All states</option>
          {locations?.states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>

        <select
          className="select"
          style={{ width: 'auto', minWidth: 140 }}
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          disabled={!locations?.cities.length}
          aria-label="Filter by city"
        >
          <option value="">All cities</option>
          {locations?.cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>

        <span className="grow" />

        <select
          className="select"
          style={{ width: 'auto', minWidth: 130 }}
          value={filters.sort}
          onChange={(e) => onChange({ sort: e.target.value as 'recent' | 'name' })}
          aria-label="Sort order"
        >
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>
    </div>
  );
}
