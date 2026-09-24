import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CreatorCard } from '@/components/CreatorCard';
import { JsonLd } from '@/components/JsonLd';
import { fetchCategories, fetchCities, fetchCreators, resolveCity } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { clampDescription, pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema, creatorListSchema } from '@/lib/structured-data';

/**
 * "Fitness influencers in Jaipur" is what people actually type — the niche pages only
 * answer half of it. These pages answer the other half from data the directory already
 * has, and each one is a real page with real creators on it, not a generated shell.
 */
type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return (await fetchCities()).map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const city = await resolveCity(slug);
  if (!city) return { title: 'City not found', robots: { index: false, follow: false } };

  const title = `Influencers in ${city.name} — Verified Creators`;
  const description = clampDescription(
    `${pluralize(city.count, 'verified creator')} listed in ${city.name} on Aura. Every profile is reviewed before listing — compare niches and collaboration rates.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/city/${slug}` },
    openGraph: pageOpenGraph({ title, description, path: `/city/${slug}` }),
  };
}

export default async function CityPage({ params }: { params: Params }) {
  const { slug } = await params;
  const city = await resolveCity(slug);
  // A city nobody is listed in is not a thin page to publish — it is a 404.
  if (!city) notFound();

  const [{ data: creators }, categories] = await Promise.all([
    fetchCreators({ city: city.name, limit: 48, sort: 'recent' }),
    fetchCategories(),
  ]);

  // Only the niches actually represented here, so every chip leads somewhere.
  const niches = [
    ...new Set(creators.map((creator) => creator.category?.slug).filter(Boolean)),
  ]
    .map((s) => categories.find((category) => category.slug === s))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <JsonLd
        data={[
          creatorListSchema(creators, {
            name: `Verified creators in ${city.name}`,
            path: `/city/${slug}`,
            description: `Verified content creators based in ${city.name}.`,
          }),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Creators', path: '/creators' },
            { name: city.name, path: `/city/${slug}` },
          ]),
        ]}
      />

      <header>
        <p className="eyebrow">City</p>
        <h1 className="mt-2 text-[30px] sm:text-[38px]">Influencers in {city.name}</h1>
        <p className="prose-body mt-3 max-w-2xl text-[15px]">
          {pluralize(city.count, 'verified creator')} based in {city.name}, each reviewed by
          a person before being listed. Rates are published on their own profiles.
        </p>
      </header>

      {niches.length > 0 && (
        <nav aria-label="Niches in this city" className="mt-6 flex flex-wrap gap-2">
          {niches.map((category) => (
            <Link
              key={category!._id}
              href={`/category/${category!.slug}`}
              className="chip border px-3.5 py-2 text-[13px]"
              style={{ background: 'var(--ink-800)', borderColor: 'var(--line)' }}
            >
              {category!.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((creator) => (
          <CreatorCard key={creator._id} creator={creator} />
        ))}
      </div>

      <section className="card-feature mt-12 p-6 text-center sm:p-8">
        <h2 className="text-[20px]">Based in {city.name}?</h2>
        <p className="prose-body mx-auto mt-2 max-w-md text-[14.5px]">
          Brands filter this directory by city. Being listed here is how a local campaign
          finds you — it is free, and our team reviews every application.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn btn-primary">Join as a creator</Link>
          <Link href="/briefs" className="btn btn-ghost">See what brands are asking for</Link>
        </div>
      </section>
    </div>
  );
}
