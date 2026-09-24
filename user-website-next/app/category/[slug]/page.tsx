import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CreatorCard } from '@/components/CreatorCard';
import { Pagination } from '@/components/Pagination';
import { JsonLd } from '@/components/JsonLd';
import { fetchCategories, fetchCreators } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { clampDescription, pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema, creatorListSchema } from '@/lib/structured-data';

const PER_PAGE = 12;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function findCategory(slug: string) {
  const categories = await fetchCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

/**
 * A niche is how brands actually search — "fitness influencers", "travel creators" — so
 * each one gets its own address and its own title rather than hiding behind a query
 * string on /creators, which search engines treat as the same page every time.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);

  if (!category) {
    return { title: 'Niche not found', robots: { index: false, follow: true } };
  }

  const count = category.influencerCount ?? 0;
  const title = `${category.name} Influencers & Content Creators`;

  const description = clampDescription(
    // pluralize, so a niche with exactly one creator does not advertise
    // "1 verified fitness creators" in the search result.
    `Browse ${count > 0 ? pluralize(count, `verified ${category.name.toLowerCase()} creator`) : `verified ${category.name.toLowerCase()} creators`} on Aura. Every profile is reviewed before listing — compare niches, cities and collaboration packages.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: pageOpenGraph({ title, description, path: `/category/${category.slug}` }),
  };
}

/** Pre-renders every niche at build time; new ones are still served on demand. */
export async function generateStaticParams() {
  const categories = await fetchCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage(
  { params, searchParams }: { params: Params; searchParams: SearchParams },
) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);

  const category = await findCategory(slug);
  if (!category) notFound();

  const pageParam = resolvedSearch.page;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam ?? 1) || 1);

  const results = await fetchCreators({
    category: category._id,
    page,
    limit: PER_PAGE,
    sort: 'recent',
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      {results.data.length > 0 && (
        <JsonLd
          data={[
            creatorListSchema(results.data, {
              name: `${category.name} creators on Aura`,
              path: `/category/${category.slug}`,
              description: `Verified ${category.name.toLowerCase()} creators listed on Aura.`,
            }),
            breadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Creators', path: '/creators' },
              { name: category.name, path: `/category/${category.slug}` },
            ]),
          ]}
        />
      )}

      <nav aria-label="Breadcrumb" className="text-[13px]" style={{ color: 'var(--text-3)' }}>
        <Link href="/" className="hover:underline">Home</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/creators" className="hover:underline">Creators</Link>
        <span aria-hidden="true"> / </span>
        <span style={{ color: 'var(--text-2)' }}>{category.name}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-[30px] sm:text-[38px]">{category.name} creators</h1>
        <p className="prose-body mt-2 max-w-2xl text-[14.5px]">
          Verified {category.name.toLowerCase()} creators on Aura, each reviewed by our team
          before being listed. Open a profile to see their channels and prices.
        </p>
      </header>

      <p className="mt-6 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
        {results.meta.total > 0
          ? pluralize(results.meta.total, 'creator')
          : 'No creators listed in this niche yet'}
      </p>

      {results.data.length > 0 ? (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.data.map((creator) => (
              <CreatorCard key={creator._id} creator={creator} />
            ))}
          </div>
          <Pagination meta={results.meta} basePath={`/category/${category.slug}`} params={{}} />
        </>
      ) : (
        <div className="card mt-6 p-10 text-center">
          <p className="text-[16px] font-bold">Nothing here yet</p>
          <p className="prose-body mx-auto mt-2 max-w-sm text-[14px]">
            No creator has been approved in this niche so far. Try another niche, or browse
            everyone currently listed.
          </p>
          <div className="mt-5">
            <Link href="/creators" className="btn btn-ghost">Browse all creators</Link>
          </div>
        </div>
      )}
    </div>
  );
}
