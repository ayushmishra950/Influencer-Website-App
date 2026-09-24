import type { MetadataRoute } from 'next';
import { absoluteUrl, SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // Per-person or single-use pages. Each also carries a noindex tag; this simply
        // saves a crawler the fetch.
        '/dashboard',
        '/profile',
        '/login',
        '/forgot-password',
        '/reset-password',
        // Filtered and searched listings. The niche pages under /category are the
        // indexable version of the same thing — these would be endless near-duplicates.
        '/creators?',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
