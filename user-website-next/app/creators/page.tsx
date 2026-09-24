import type { Metadata } from 'next';
import { CreatorsDirectory } from '@/components/CreatorsDirectory';
import { JsonLd } from '@/components/JsonLd';
import { fetchCategories, fetchCreators, fetchLocationOptions, resolveCategoryId } from '@/lib/api';
import { pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema, creatorListSchema } from '@/lib/structured-data';

/**
 * What a signed-out visitor — and every crawler — is served.
 *
 * Small enough that the full directory stays a reason to sign in, large enough that the
 * page is real content rather than a wall. Every other profile is still reachable
 * through the sitemap, so nothing drops out of the index.
 */
const PREVIEW_COUNT = 6;

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
    'Browse verified creators on Aura. Every profile is reviewed by our team before listing — sign in to search the full directory by niche, state and city.';

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

  const query = {
    q: first(resolved.q),
    category: categoryId,
    country: first(resolved.country),
    state: first(resolved.state),
    city: first(resolved.city),
    sort: first(resolved.sort) === 'name' ? 'name' : 'recent',
    page: first(resolved.page) ?? '1',
  };

  // The country is usually the only one, so default to it rather than making someone
  // pick a country before the state list will populate at all.
  const countries = await fetchLocationOptions();
  const country = query.country ?? (countries.countries.length === 1 ? countries.countries[0] : undefined);

  const [categories, locations, preview] = await Promise.all([
    fetchCategories(),
    fetchLocationOptions(country, query.state),
    // Always the unfiltered top of the list: this is the public preview, and it has to
    // be identical for every visitor so the cached page is the one a crawler gets.
    fetchCreators({ limit: PREVIEW_COUNT, sort: 'recent' }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      {preview.data.length > 0 && (
        <JsonLd
          data={[
            creatorListSchema(preview.data, {
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
        preview={preview.data}
        total={preview.meta.total}
        categories={categories}
        locations={locations}
        query={query}
      />
    </div>
  );
}
