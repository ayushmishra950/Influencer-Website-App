import type { Metadata } from 'next';
import { CreatorsDirectory } from '@/components/CreatorsDirectory';
import { JsonLd } from '@/components/JsonLd';
import { fetchCategories, fetchCreators, fetchLocationOptions, resolveCategoryId } from '@/lib/api';
import { pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema, creatorListSchema } from '@/lib/structured-data';

/** Matches the API's own default, so page 1 here is page 1 there. */
const PER_PAGE = 12;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * A faceted listing can emit an unbounded number of near-identical URLs — one per search
 * term, niche, state and city combination. Left indexable they compete with each other
 * and with /creators itself, and none of them wins.
 *
 * So: the clean listing is the indexable page, and anything filtered carries a noindex
 * and canonicals back to it. Niches keep a proper indexable home at /category/[slug].
 */
export async function generateMetadata(
  { searchParams }: { searchParams: SearchParams },
): Promise<Metadata> {
  const resolved = await searchParams;
  const filtered = !!(first(resolved.q) || first(resolved.category) || first(resolved.state)
    || first(resolved.city) || first(resolved.country) || first(resolved.page));

  if (filtered) {
    return {
      title: 'Search results',
      description:
        'Filtered results from the Aura creator directory. Browse every verified creator, or pick a niche.',
      robots: { index: false, follow: true },
      alternates: { canonical: '/creators' },
    };
  }

  const title = 'Browse Verified Creators by Niche and City';
  const description =
    'Browse every verified creator on Aura. Each profile is reviewed by our team before listing. Search by name, or filter by niche, country, state and city — no sign-in needed.';

  return {
    title,
    description,
    alternates: { canonical: '/creators' },
    openGraph: pageOpenGraph({ title, description, path: '/creators' }),
  };
}

export default async function CreatorsPage({ searchParams }: { searchParams: SearchParams }) {
  const resolved = await searchParams;

  // The URL carries a niche slug; the API filters on the id behind it.
  const categoryId = await resolveCategoryId(first(resolved.category));

  const page = Math.max(1, Number(first(resolved.page) ?? '1') || 1);
  const query = {
    q: first(resolved.q),
    category: categoryId,
    country: first(resolved.country),
    state: first(resolved.state),
    city: first(resolved.city),
    sort: first(resolved.sort) === 'name' ? ('name' as const) : ('recent' as const),
    page: String(page),
  };

  const filtered = !!(query.q || query.category || query.country || query.state || query.city);

  // The country is usually the only one, so default to it rather than making someone
  // pick a country before the state list will populate at all.
  const countries = await fetchLocationOptions();
  const country = query.country ?? (countries.countries.length === 1 ? countries.countries[0] : undefined);

  const [categories, locations, results] = await Promise.all([
    fetchCategories(),
    // Chained on purpose: a country gives its states, a state gives its cities.
    fetchLocationOptions(country, query.state),
    fetchCreators({
      q: query.q,
      category: query.category,
      // Filter by the country actually in the URL, not the one defaulted in for the
      // dropdowns -- otherwise every request would be silently scoped to one country.
      country: query.country,
      state: query.state,
      city: query.city,
      sort: query.sort,
      page,
      limit: PER_PAGE,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      {/* Only on the clean listing: the filtered variants are noindex, so describing
          their contents to a crawler achieves nothing. */}
      {!filtered && page === 1 && results.data.length > 0 && (
        <JsonLd
          data={[
            creatorListSchema(results.data, {
              name: 'Verified creators on Aura',
              path: '/creators',
              description: 'Verified content creators listed on Aura.',
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Creators', path: '/creators' },
            ]),
          ]}
        />
      )}

      <header>
        <h1 className="text-[30px] sm:text-[38px]">All creators</h1>
      </header>

      <CreatorsDirectory
        creators={results.data}
        meta={results.meta}
        categories={categories}
        locations={locations}
        query={query}
        filtered={filtered}
      />
    </div>
  );
}
