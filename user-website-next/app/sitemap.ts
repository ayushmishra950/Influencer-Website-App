import type { MetadataRoute } from 'next';
import { fetchCategories, fetchCreators } from '@/lib/api';
import { absoluteUrl } from '@/lib/seo';

/** The API caps a page at 100, so the sitemap walks rather than asking for everything. */
const PER_REQUEST = 100;
const MAX_PAGES = 50;

async function everyCreator() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const batch = await fetchCreators({ page, limit: PER_REQUEST, sort: 'recent' });
    all.push(...batch.data);
    if (page >= batch.meta.totalPages || batch.data.length === 0) break;
  }
  return all;
}

/**
 * Only pages worth crawling are listed.
 *
 * Sign-in, registration steps and the profile are left out on purpose: a sitemap is a
 * recommendation, and padding it with pages that carry a noindex just spends crawl
 * budget arguing with itself.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, creators] = await Promise.all([fetchCategories(), everyCreator()]);

  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/creators'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/register'), lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  // An empty niche is a thin page; it is indexable but not advertised.
  const niches: MetadataRoute.Sitemap = categories
    .filter((category) => (category.influencerCount ?? 0) > 0)
    .map((category) => ({
      url: absoluteUrl(`/category/${category.slug}`),
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  const profiles: MetadataRoute.Sitemap = creators.map((creator) => ({
    url: absoluteUrl(`/creators/${creator._id}`),
    // The profile's own timestamp, so a crawler can tell what actually changed.
    lastModified: creator.createdAt ? new Date(creator.createdAt) : now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...core, ...niches, ...profiles];
}
