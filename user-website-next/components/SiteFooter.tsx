import Link from 'next/link';
import { Wordmark } from './Brand';
import { SignedOutOnly } from './SignedOutOnly';
import { fetchCategories, fetchStats } from '@/lib/api';
import { pluralize } from '@/lib/format';

const FOR_BRANDS = [
  { href: '/creators', label: 'Browse creators' },
  { href: '/about', label: 'How verification works' },
] as const;

const FOR_CREATORS = [
  { href: '/register', label: 'Join as a creator' },
  { href: '/login', label: 'Sign in' },
] as const;

/**
 * A server component, so the niche links are real anchors in the HTML.
 *
 * That matters more than it looks: a footer on every page is how a crawler finds the
 * niche pages from anywhere on the site, which is exactly the internal linking those
 * pages need to rank.
 */
export async function SiteFooter() {
  const [categories, stats] = await Promise.all([fetchCategories(), fetchStats()]);

  // An empty niche is a thin page; it is not worth linking from every page on the site.
  const niches = categories.filter((category) => (category.influencerCount ?? 0) > 0).slice(0, 8);

  return (
    <footer className="mt-20 border-t" style={{ background: 'var(--ink-950)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Wordmark size={30} />
          <p className="mt-4 max-w-sm text-[13.5px] leading-[1.7]" style={{ color: 'var(--text-2)' }}>
            A verified directory of content creators. Every profile is reviewed by a person
            before it appears — so the list is smaller, and worth reading.
          </p>
          {!!stats && (
            <p className="mt-4 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
              {pluralize(stats.totalCreators, 'verified creator')} ·{' '}
              {pluralize(stats.totalCategories, 'niche', 'niches')} ·{' '}
              {pluralize(stats.totalCities, 'city', 'cities')}
            </p>
          )}
        </div>

        <nav aria-labelledby="footer-brands">
          <h2 id="footer-brands" className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            For brands
          </h2>
          <ul className="mt-3.5 grid gap-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
            {FOR_BRANDS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-creators">
          <h2 id="footer-creators" className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
            For creators
          </h2>
          <ul className="mt-3.5 grid gap-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
            <li>
              <Link href="/about" className="hover:underline">What Aura is</Link>
            </li>
            {/* Invitations, not navigation: pointless once you have an account, and this
                footer is on every signed-in page including the dashboard. */}
            <SignedOutOnly>
              {FOR_CREATORS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:underline">{link.label}</Link>
                </li>
              ))}
            </SignedOutOnly>
          </ul>
        </nav>

        {niches.length > 0 && (
          <nav aria-labelledby="footer-niches">
            <h2 id="footer-niches" className="text-[13px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Popular niches
            </h2>
            <ul className="mt-3.5 grid gap-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
              {niches.map((category) => (
                <li key={category._id}>
                  <Link href={`/category/${category.slug}`} className="hover:underline">
                    {category.name} creators
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            © {new Date().getFullYear()} Aura · Creator Network
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
            Aura verifies profiles. It does not broker deals or take a commission.
          </p>
        </div>
      </div>
    </footer>
  );
}
