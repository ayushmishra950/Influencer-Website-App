import { absoluteUrl, SITE_NAME, SITE_URL } from './seo';
import { imageUrl } from './api';
import { locationLine } from './format';
import type { Creator, PublicPackage } from './types';

/**
 * Structured data is how a search engine understands what a page *is*, rather than
 * guessing from the text. Each builder below mirrors what the page already shows —
 * marking up anything a visitor cannot see is what earns a manual penalty.
 */

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description:
      'A verified directory of content creators. Every profile is reviewed by a person before it is listed.',
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    // Lets Google offer a search box for the site directly in the results.
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/creators?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function creatorProfileSchema(creator: Creator, packages: PublicPackage[]) {
  const url = absoluteUrl(`/creators/${creator._id}`);
  const photo = imageUrl(creator.profileImage);

  const person: Record<string, unknown> = {
    '@type': 'Person',
    '@id': `${url}#person`,
    name: creator.name,
    url,
    ...(creator.bio ? { description: creator.bio } : {}),
    ...(photo ? { image: photo } : {}),
    ...(creator.category?.name ? { jobTitle: `${creator.category.name} Content Creator` } : {}),
    ...(creator.location?.city
      ? {
          address: {
            '@type': 'PostalAddress',
            addressLocality: creator.location.city,
            addressRegion: creator.location.state,
            addressCountry: creator.location.country,
          },
        }
      : {}),
    // Only the accounts the profile actually links to.
    sameAs: [creator.social?.instagram, creator.social?.youtube].filter(Boolean),
  };

  // Prices are real, reviewed and shown on the page, so they are marked up as offers.
  const offers = packages.map((item) => ({
    '@type': 'Offer',
    name: item.title,
    ...(item.description ? { description: item.description } : {}),
    price: item.price,
    priceCurrency: item.currency || 'INR',
    availability: 'https://schema.org/InStock',
    url,
    seller: { '@id': `${url}#person` },
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    name: `${creator.name}${creator.category?.name ? ` — ${creator.category.name} Creator` : ''}`,
    ...(locationLine(creator.location) ? { about: locationLine(creator.location) } : {}),
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: offers.length > 0 ? { ...person, makesOffer: offers } : person,
  };
}

export function creatorListSchema(
  creators: Creator[],
  { name, path, description }: { name: string; path: string; description: string },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': absoluteUrl(path),
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: creators.length,
      itemListElement: creators.map((creator, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/creators/${creator._id}`),
        name: creator.name,
      })),
    },
  };
}

/**
 * Marks up questions the page actually answers in visible text.
 *
 * Google can show these directly in the results, which is why the rule matters: every
 * question and answer here has to exist on the page, word for word. Marking up an
 * answer a visitor cannot read is what earns a structured-data penalty.
 */
export function faqSchema(items: readonly { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
