import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

// The same pairing the admin panel uses, so the three surfaces look related.
const sans = Inter({ variable: '--font-sans', subsets: ['latin'], display: 'swap' });
const display = Sora({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  // Every relative URL below — canonical, OG image, sitemap entries — is resolved
  // against this. Without it Next emits relative OG tags, which crawlers ignore.
  metadataBase: new URL(SITE_URL),
  title: {
    // Applies to child segments only, so each page supplies just its own name.
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} — Verified Creator Directory for Brand Collaborations`,
  },
  description:
    'Find verified content creators for brand collaborations. Every influencer on Aura is reviewed by our team before they are listed — browse by niche, city and budget.',
  applicationName: SITE_NAME,
  referrer: 'origin-when-cross-origin',
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },

  // Inherited by every page, so each one only overrides the title, description and url.
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_IN',
    url: '/',
  },
  twitter: {
    // summary_large_image is what makes the generated 1200×630 card render full width.
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Without these Google may truncate the snippet or skip the preview entirely.
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
};

/**
 * Applied before the first paint so the page never flashes the wrong theme.
 *
 * Inline and dependency-free for that reason: a module would arrive too late to help.
 * Reads the stored choice, falls back to the operating system, and defaults to dark.
 */
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem('aura.site.theme');var t=(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      // The script below rewrites data-theme before React hydrates, which is the whole
      // point of it — so the resulting server/client difference on this one element is
      // expected rather than a bug to fix.
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Keyboard and screen-reader users should not have to walk the nav on every page. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:px-4 focus:py-2"
          style={{ background: 'var(--ink-850)', color: 'var(--text)' }}
        >
          Skip to content
        </a>

        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
