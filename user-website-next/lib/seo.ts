export const SITE_NAME = 'Aura';

/**
 * The public origin of this site.
 *
 * Canonical tags, Open Graph URLs and every sitemap entry are built from it, so a wrong
 * value does not break the page — it quietly points all of them at the wrong host,
 * which is worse. Set NEXT_PUBLIC_SITE_URL before deploying.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const absoluteUrl = (path = '/') => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Trims a description to something a search engine will actually print.
 *
 * Google renders roughly 155–160 characters. Anything past that is not penalised, it is
 * simply cut mid-sentence — so the sentence is cut here instead, at a word boundary.
 */
export function clampDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : max).replace(/[,;:.\-—]$/, '')}…`;
}

/**
 * A complete Open Graph block for one page.
 *
 * Next merges metadata *shallowly*, so a page that declares `openGraph` replaces the
 * root's entire object — silently losing siteName, locale and the generated share
 * image. Building it here means no page can drop a field by omission.
 *
 * `image: null` is for a route that has its own `opengraph-image` file: leaving images
 * out lets that segment's file supply the picture, which is more specific than ours.
 */
export function pageOpenGraph({
  title,
  description,
  path,
  type = 'website',
  image = '/opengraph-image',
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'profile' | 'article';
  image?: string | null;
}) {
  return {
    type,
    siteName: SITE_NAME,
    locale: 'en_IN',
    title,
    description,
    url: path,
    ...(image ? { images: [image] } : {}),
  } as const;
}
