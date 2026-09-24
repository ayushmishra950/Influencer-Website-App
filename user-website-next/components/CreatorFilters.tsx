'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Category, LocationOptions } from '@/lib/types';

interface Props {
  categories: Category[];
  locations: LocationOptions;
}

/**
 * Every filter is written to the URL rather than held in component state.
 *
 * That keeps the results server-rendered, makes each combination a real address a
 * visitor can share or a crawler can index, and means the back button does what people
 * expect. `page` is dropped on every change: filtering to three results while sitting
 * on page 4 would otherwise show an empty list.
 */
export function CreatorFilters({ categories, locations }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const urlQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(urlQuery);
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);

  // A back/forward navigation changes the URL without remounting this component, so the
  // box has to follow it. Adjusted during render rather than in an effect: React
  // restarts the render immediately, so the stale value is never painted.
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    const serialised = next.toString();
    router.push(serialised ? `/creators?${serialised}` : '/creators');
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    apply({ q: query.trim() });
  }

  const selected = {
    category: params.get('category') ?? '',
    country: params.get('country') ?? '',
    state: params.get('state') ?? '',
    city: params.get('city') ?? '',
    sort: params.get('sort') ?? 'recent',
  };

  const hasFilters = Object.entries(selected).some(
    ([key, value]) => value && !(key === 'sort' && value === 'recent'),
  ) || !!params.get('q');

  const selectStyle = {
    background: 'var(--input-bg)',
    borderColor: 'var(--line)',
    color: 'var(--text)',
  } as const;

  return (
    <div className="grid gap-3">
      <form onSubmit={onSubmit} role="search" className="flex gap-2">
        <label htmlFor="creator-search" className="sr-only">Search by name, bio or city</label>
        <input
          id="creator-search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, bio or city"
          autoComplete="off"
          className="input"
        />
        <button type="submit" className="btn btn-primary shrink-0 px-5">Search</button>
      </form>

      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="filter-category">Niche</label>
        <select
          id="filter-category"
          value={selected.category}
          onChange={(event) => apply({ category: event.target.value })}
          className="h-11 rounded-xl border px-3 text-[14px]"
          style={selectStyle}
        >
          <option value="">All niches</option>
          {categories.map((category) => (
            <option key={category._id} value={category.slug}>{category.name}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor="filter-state">State</label>
        <select
          id="filter-state"
          value={selected.state}
          onChange={(event) => apply({ state: event.target.value, city: '' })}
          className="h-11 rounded-xl border px-3 text-[14px]"
          style={selectStyle}
        >
          <option value="">All states</option>
          {locations.states.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>

        <label className="sr-only" htmlFor="filter-city">City</label>
        <select
          id="filter-city"
          value={selected.city}
          onChange={(event) => apply({ city: event.target.value })}
          className="h-11 rounded-xl border px-3 text-[14px]"
          style={selectStyle}
        >
          <option value="">All cities</option>
          {locations.cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>

        <label className="sr-only" htmlFor="filter-sort">Sort</label>
        <select
          id="filter-sort"
          value={selected.sort}
          onChange={(event) => apply({ sort: event.target.value })}
          className="h-11 rounded-xl border px-3 text-[14px]"
          style={selectStyle}
        >
          <option value="recent">Newest first</option>
          <option value="name">Name A–Z</option>
        </select>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push('/creators')}
            className="btn btn-ghost h-11 px-4 text-[13.5px]"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
