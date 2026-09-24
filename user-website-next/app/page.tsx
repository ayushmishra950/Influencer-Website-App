import type { Metadata } from 'next';
import Link from 'next/link';
import { CreatorCard } from '@/components/CreatorCard';
import { JsonLd } from '@/components/JsonLd';
import { RedirectSignedIn } from '@/components/RedirectSignedIn';
import { Avatar } from '@/components/Avatar';
import { fetchCategories, fetchLocationOptions, fetchStats } from '@/lib/api';
import { pluralize } from '@/lib/format';
import { pageOpenGraph } from '@/lib/seo';
import { faqSchema, organizationSchema, websiteSchema } from '@/lib/structured-data';

const HOME_TITLE = 'Aura — Verified Creator Directory for Brand Collaborations';
const HOME_DESCRIPTION =
  'Find verified content creators for brand collaborations. Every influencer on Aura is reviewed by our team before listing — browse by niche and city.';

export const metadata: Metadata = {
  // The root layout supplies the default title; this page only adds what is its own.
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: pageOpenGraph({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: '/' }),
};

const PROMISES = [
  {
    title: 'Verified profiles only',
    body: 'Creators apply, a person reviews them, and only approved profiles are ever shown. Nobody lists themselves.',
  },
  {
    title: 'Search by niche and city',
    body: 'A fitness creator in Jaipur and one in Kochi are not interchangeable for a local campaign. Filter for the one you need.',
  },
  {
    title: 'All their channels in one place',
    body: 'Instagram and YouTube on a single profile, instead of handles stitched together from three different messages.',
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Pick a niche and a city',
    body: 'Start from the niche you are briefing for, then narrow to the city where the campaign runs.',
  },
  {
    step: '2',
    title: 'Read the profile, not the follower count',
    body: 'Each profile shows what the creator actually makes, where they are based, and the channels they post on.',
  },
  {
    step: '3',
    title: 'Reach out directly',
    body: 'Prices are listed where the creator has published them. You contact them through their own channels — Aura does not sit in the middle.',
  },
] as const;

const WHAT_CREATORS_OFFER = [
  {
    title: 'Short-form video',
    body: 'A scripted reel or short, shot and edited by the creator. Usually the quickest thing to book.',
    example: 'e.g. one 30-second reel',
  },
  {
    title: 'Story sets',
    body: 'A few connected stories with a link, for when you want traffic rather than reach.',
    example: 'e.g. three stories with a swipe-up',
  },
  {
    title: 'Long-form integrations',
    body: 'A segment inside a longer video, or a whole video built around your product.',
    example: 'e.g. a 60-second segment',
  },
] as const;

/**
 * Answered in visible text on this page, and marked up as FAQPage — Google can print
 * these straight into the results, but only for answers a visitor can actually read.
 */
const FAQ = [
  {
    question: 'Is Aura free to browse?',
    answer:
      'Yes. Anyone can read the directory and open a creator profile. Signing in is only needed to search and filter the full list, and creator accounts are free.',
  },
  {
    question: 'How is a creator verified?',
    answer:
      'A creator registers with their niche, city and social accounts, and a person on our team checks those accounts before the profile is published. Registration is not activation — nobody lists themselves.',
  },
  {
    question: 'Are the prices on a profile final?',
    answer:
      'They are the creator\u2019s own published rates, reviewed by our team before they appear. Treat them as a starting point: scope, usage rights and timelines are agreed directly with the creator.',
  },
  {
    question: 'Does Aura take a commission?',
    answer:
      'No. Aura verifies profiles and lists them. You contact the creator through their own channels and agree terms with them directly, with nothing in between.',
  },
  {
    question: 'How long does approval take for a creator?',
    answer:
      'It depends on how quickly the accounts can be checked. You can see your status at any time on your dashboard, and you are notified the moment it changes — approved or not.',
  },
] as const;

/** The landing page is a teaser, not the directory: a handful of creators, then a way in. */
const TOP_COUNT = 5;

export default async function HomePage() {
  const [stats, categories, locations] = await Promise.all([
    fetchStats(),
    fetchCategories(),
    fetchLocationOptions(),
  ]);

  const spotlight = (stats?.spotlight ?? []).slice(0, TOP_COUNT);
  // An empty category opens onto an empty list, so it is not offered.
  const listed = categories.filter((category) => (category.influencerCount ?? 0) > 0);

  return (
    <>
      {/* Identity for the whole site, declared once on the page crawlers reach first. */}
      <JsonLd data={[organizationSchema(), websiteSchema(), faqSchema(FAQ)]} />

      {/* Signed in, this page is not for you. The server still renders it in full, so
          the home page stays indexable for everyone who is not. */}
      <RedirectSignedIn to="/dashboard" />

      <section className="hero">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
          <h1 className="mx-auto max-w-3xl text-[34px] leading-[1.15] sm:text-[52px]">
            Find creators worth working with
          </h1>
          <p
            className="mx-auto mt-5 max-w-xl text-[15.5px] leading-[1.7] sm:text-[17px]"
            style={{ color: 'var(--hero-muted)' }}
          >
            A verified directory of content creators, reviewed one by one before they go live.
          </p>

          {spotlight.length > 0 && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex">
                {spotlight.slice(0, 5).map((creator, index) => (
                  <span key={creator._id} style={{ marginLeft: index === 0 ? 0 : -14 }}>
                    <Avatar name={creator.name} src={creator.profileImage} size={40} onHero />
                  </span>
                ))}
              </div>
              {!!stats && (
                <p className="text-[13px]" style={{ color: 'var(--hero-muted)' }}>
                  {pluralize(stats.totalCreators, 'verified creator')} across{' '}
                  {pluralize(stats.totalCities, 'city', 'cities')}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* A band of air so the first line of content does not touch the violet. */}
      <div className="mx-auto max-w-6xl px-5">
        {!!stats && (
          <div className="-mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { value: stats.totalCreators, label: 'Verified creators' },
              { value: stats.totalCategories, label: 'Content niches' },
              { value: stats.totalCities, label: 'Cities covered' },
            ].map((item) => (
              <div key={item.label} className="card px-3 py-5 text-center sm:px-5">
                <p className="text-[26px] font-bold sm:text-[32px]">{item.value}</p>
                <p className="mt-1 text-[12px] sm:text-[13px]" style={{ color: 'var(--text-3)' }}>
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        )}

        <section className="mt-16" aria-labelledby="why">
          <h2 id="why" className="text-[24px] sm:text-[28px]">Why brands use Aura</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="card p-5">
                <h3 className="text-[16px] font-bold">{promise.title}</h3>
                <p className="prose-body mt-2 text-[13.5px]">{promise.body}</p>
              </div>
            ))}
          </div>
        </section>

        {spotlight.length > 0 && (
          <section className="mt-16" aria-labelledby="spotlight">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="spotlight" className="text-[24px] sm:text-[28px]">Spotlight</h2>
                <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
                  Recently verified
                </p>
              </div>
              <Link href="/creators" className="text-[14px] font-semibold" style={{ color: 'var(--violet-400)' }}>
                See all →
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {spotlight.map((creator) => (
                <CreatorCard key={creator._id} creator={creator} />
              ))}
            </div>
          </section>
        )}

        {listed.length > 0 && (
          <section className="mt-16" aria-labelledby="niches">
            <h2 id="niches" className="text-[24px] sm:text-[28px]">Browse by niche</h2>
            <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
              {pluralize(listed.length, 'category', 'categories')} with creators listed
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {listed.map((category) => (
                <Link
                  key={category._id}
                  href={`/category/${category.slug}`}
                  className="card card-hover p-4"
                >
                  <p className="text-[15px] font-bold">{category.name}</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                    {pluralize(category.influencerCount ?? 0, 'creator')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mt-16" aria-labelledby="how">
          <h2 id="how" className="text-[24px] sm:text-[28px]">How brands use it</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
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

        <section className="mt-16" aria-labelledby="offers">
          <h2 id="offers" className="text-[24px] sm:text-[28px]">What creators offer</h2>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
            Published as packages on their profile, each reviewed before it goes live
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {WHAT_CREATORS_OFFER.map((item) => (
              <div key={item.title} className="card p-5">
                <h3 className="text-[15.5px] font-bold">{item.title}</h3>
                <p className="prose-body mt-2 text-[13.5px]">{item.body}</p>
                <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-3)' }}>{item.example}</p>
              </div>
            ))}
          </div>
        </section>

        {locations.cities.length > 0 && (
          <section className="card mt-16 p-6 sm:p-8" aria-labelledby="cities">
            <h2 id="cities" className="text-[20px]">Cities covered</h2>
            <p className="prose-body mt-1.5 text-[13.5px]">
              Where the creators currently listed are based.
            </p>
            {/* Plain text, not links: a per-city URL would be a filtered listing, and
                those are deliberately kept out of the index. */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {locations.cities.map((city) => (
                <li
                  key={city}
                  className="chip"
                  style={{ background: 'var(--ink-800)', color: 'var(--text-2)' }}
                >
                  {city}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-16" aria-labelledby="faq">
          <h2 id="faq" className="text-[24px] sm:text-[28px]">Common questions</h2>
          <div className="mt-6 grid gap-3">
            {FAQ.map((item) => (
              <details key={item.question} className="card p-5">
                <summary className="cursor-pointer text-[15.5px] font-bold">{item.question}</summary>
                <p className="prose-body mt-2.5 text-[14px]">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="card mt-16 flex flex-col items-center gap-4 p-8 text-center sm:p-12">
          <h2 className="text-[24px] sm:text-[28px]">Are you a creator?</h2>
          <p className="prose-body max-w-lg text-[14.5px]">
            Register with your niche, city and social accounts. Our team checks them, and once
            you are approved brands can find you here.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-primary">Join as a creator</Link>
            <Link href="/about" className="btn btn-ghost">How it works</Link>
          </div>
        </section>
      </div>
    </>
  );
}
