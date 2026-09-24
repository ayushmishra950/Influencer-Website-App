import type { Metadata } from 'next';
import Link from 'next/link';
import { SignedOutOnly } from '@/components/SignedOutOnly';
import { fetchStats } from '@/lib/api';
import { pageOpenGraph } from '@/lib/seo';
import { pluralize } from '@/lib/format';

const ABOUT_TITLE = 'About Aura — How Creator Verification Works';
const ABOUT_DESCRIPTION =
  'Aura is a verified influencer directory. See why every creator profile is reviewed by a person before listing, and how the three-step approval works.';

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: pageOpenGraph({ title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, path: '/about' }),
};

const FOR_BRANDS = [
  {
    title: 'Nobody lists themselves',
    body: 'Every profile is reviewed by a person before it goes live. A creator can register, but only an administrator can publish them.',
  },
  {
    title: 'Search that matches how you brief',
    body: 'Filter by niche and by city, because a fitness creator in Jaipur and one in Kochi are not interchangeable for a local campaign.',
  },
  {
    title: 'Their channels in one place',
    body: 'Instagram and YouTube on a single profile, so you are not stitching together handles from three different messages.',
  },
] as const;

const FOR_CREATORS = [
  {
    title: 'A verified badge that means something',
    body: 'Because listings are checked rather than self-served, being on Aura is a signal in itself.',
  },
  {
    title: 'Your profile stays yours',
    body: 'Edit your bio, photo, niche and location whenever you like. Changes appear in the directory immediately.',
  },
  {
    title: 'You always know where you stand',
    body: 'Approved, under review or not approved — you see the status and the reason, and you are notified the moment it changes.',
  },
] as const;

const STEPS = [
  { step: '1', title: 'Register', body: 'Add your details, niche, location and social accounts.' },
  { step: '2', title: 'Review', body: 'Our team checks your accounts. Registration is not activation.' },
  { step: '3', title: 'Go live', body: 'Once approved you can sign in and brands can find you.' },
] as const;

function Section({ title, items }: { title: string; items: readonly { title: string; body: string }[] }) {
  return (
    <section>
      <h2 className="text-[22px] sm:text-[26px]">{title}</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="card p-5">
            <h3 className="text-[15.5px] font-bold">{item.title}</h3>
            <p className="prose-body mt-2 text-[13.5px]">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AboutPage() {
  const stats = await fetchStats();

  return (
    <>
      <section className="hero">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-[30px] sm:text-[40px]">A directory you can trust</h1>
          <p
            className="mx-auto mt-4 max-w-xl text-[15.5px] leading-[1.7]"
            style={{ color: 'var(--hero-muted)' }}
          >
            Aura is a verified directory of content creators. Every profile is reviewed by our
            team before anyone can find it.
          </p>

          {!!stats && (
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { value: stats.totalCreators, label: 'Verified creators' },
                { value: stats.totalCategories, label: 'Content niches' },
                { value: stats.totalCities, label: 'Cities covered' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border px-3 py-4"
                  style={{ background: 'var(--hero-scrim)', borderColor: 'var(--hero-border)' }}
                >
                  <p className="text-[24px] font-bold">{item.value}</p>
                  <p className="mt-1 text-[11.5px]" style={{ color: 'var(--hero-muted)' }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-14 px-5 py-14">
        <section className="card p-6 sm:p-8">
          <h2 className="text-[20px]">Why this exists</h2>
          <p className="prose-body mt-3 text-[15px]">
            Finding the right creator usually means scrolling hashtags, guessing whether an
            account is real, and starting over for every city. Open directories fill up with
            anyone who signs up, so the search costs more than it saves.
          </p>
          <p className="prose-body mt-3 text-[15px]">
            Aura works the other way round. Creators apply, a person reviews them, and only
            approved profiles are ever shown. The list is smaller — and that is the point.
          </p>
        </section>

        <Section title="For brands and businesses" items={FOR_BRANDS} />
        <Section title="For creators" items={FOR_CREATORS} />

        <section>
          <h2 className="text-[22px] sm:text-[26px]">How joining works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li key={item.step} className="card p-5">
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-[13px] font-bold"
                  style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
                >
                  {item.step}
                </span>
                <h3 className="mt-3 text-[15.5px] font-bold">{item.title}</h3>
                <p className="prose-body mt-1.5 text-[13.5px]">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="text-[20px]">What we show, and what we don&apos;t</h2>
          <p className="prose-body mt-3 text-[14.5px]">
            A public profile shows a creator&apos;s name, photo, bio, niche, city and social
            accounts. Email addresses, phone numbers and review notes are never public — they
            stay between the creator and our team.
          </p>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-[22px]">Ready to look around?</h2>
          {!!stats && (
            <p className="prose-body text-[14.5px]">
              {pluralize(stats.totalCreators, 'creator')} listed across{' '}
              {pluralize(stats.totalCities, 'city', 'cities')}.
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/creators" className="btn btn-primary">Browse creators</Link>
            {/* Nothing to join if you are already listed. */}
            <SignedOutOnly>
              <Link href="/register" className="btn btn-ghost">Join as a creator</Link>
            </SignedOutOnly>
          </div>
        </section>
      </div>
    </>
  );
}
