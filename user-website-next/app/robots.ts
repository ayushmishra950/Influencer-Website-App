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
        '/orders',
        '/login',
        '/forgot-password',
        '/reset-password',
        // Filtered listings are deliberately NOT blocked here. They carry a noindex and
        // canonical back to /creators, and a crawler has to be able to fetch a page to
        // read either of them — blocking the path would leave a shared filter URL able
        // to be indexed on its links alone, with the noindex never seen.
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
