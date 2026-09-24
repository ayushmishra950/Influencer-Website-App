import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { fetchBriefs, fetchStats } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema } from '@/lib/structured-data';
import { RelativeDate } from '@/components/RelativeDate';

const title = 'Open Campaign Briefs from Brands';
const description =
  'Live campaign briefs from brands looking for creators on Aura — niche, city and budget. Free to read, and free to join as a verified creator.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/briefs' },
  openGraph: pageOpenGraph({ title, description, path: '/briefs' }),
};

/** Fresh matters here more than anywhere else: a stale brief is a wasted pitch. */
export const revalidate = 60;

export default async function BriefsPage() {
  const [briefs, stats] = await Promise.all([fetchBriefs(30), fetchStats()]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <JsonLd
        data={[breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Briefs', path: '/briefs' }])]}
      />

      <header>
        <p className="eyebrow">For creators</p>
        <h1 className="mt-2 text-[30px] sm:text-[38px]">What brands are looking for</h1>
        <p className="prose-body mt-3 max-w-2xl text-[15px]">
          Briefs brands have sent us, with the niche, city and budget they named. Contact
          details stay private — brands reach creators through their Aura profile, so the
          way to be picked is to be listed.
        </p>
      </header>

      {briefs.length === 0 ? (
        <div className="card mt-8 p-10 text-center">
          <p className="text-[16px] font-bold">No open briefs right now</p>
          <p className="prose-body mx-auto mt-2 max-w-md text-[14px]">
            Briefs appear here once our team has checked them. Being listed already is
            what puts you in front of the next one — approval takes a day or two.
          </p>
          <Link href="/register" className="btn btn-primary mt-5">Create your profile — free</Link>
        </div>
      ) : (
        <>
          <p className="mt-8 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
            {pluralize(briefs.length, 'open brief')}
          </p>

          <ul className="mt-4 grid gap-4">
            {briefs.map((item) => (
              <li key={item._id} className="card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[17px] font-bold">
                      {[item.niche, item.city].filter(Boolean).join(' · ') || 'Open brief'}
                    </h2>
                    <p className="mt-1 text-[13px]" style={{ color: 'var(--text-3)' }}>
                      {item.who} · posted <RelativeDate iso={item.createdAt} />
                    </p>
                  </div>
                  {!!item.budget && (
                    <span
                      className="chip shrink-0"
                      style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
                    >
                      {item.budget}
                    </span>
                  )}
                </div>

                {!!item.brief && (
                  <p className="prose-body mt-3.5 text-[14px] leading-[1.65]">{item.brief}</p>
                )}
              </li>
            ))}
          </ul>

          <div className="card-feature mt-10 p-6 text-center sm:p-8">
            <h2 className="text-[20px]">Want briefs like these to find you?</h2>
            <p className="prose-body mx-auto mt-2 max-w-md text-[14.5px]">
              Brands shortlist from the directory. List your niche, your city and what you
              charge, and you are in front of the next brief instead of chasing it.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn btn-primary">Create your profile — free</Link>
              <Link href="/creators" className="btn btn-ghost">
                See the {stats ? stats.totalCreators : ''} creators listed
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
