import type { Metadata } from 'next';
import Link from 'next/link';
import { CreatorCard } from '@/components/CreatorCard';
import { HeroSearch } from '@/components/HeroSearch';
import { JsonLd } from '@/components/JsonLd';
import { RedirectSignedIn } from '@/components/RedirectSignedIn';
import { Avatar } from '@/components/Avatar';
import { EnquiryForm } from '@/components/EnquiryForm';
import { ReachEstimator } from '@/components/ReachEstimator';
import { StickyCta } from '@/components/StickyCta';
import { NicheMarquee } from '@/components/NicheMarquee';
import { fetchCategories, fetchCreators, fetchStats } from '@/lib/api';
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

/**
 * Campaign shapes a brand can actually run through the directory.
 *
 * Illustrative, and written as such — these are formats, not case studies. Inventing
 * named clients and results would make the page feel more finished and be a lie.
 */
const CAMPAIGN_TYPES = [
  {
    title: 'Barter collaborations',
    body: 'Send product, get content. Works best with nano and micro creators who are building a portfolio.',
    meta: 'Product cost only',
  },
  {
    title: 'Paid short-form',
    body: 'A reel or a short, scripted and shot by the creator, at the rate published on their profile.',
    meta: 'Per-post pricing',
  },
  {
    title: 'UGC for your own channels',
    body: 'Creator-made footage you run as ads. No posting on their handle, so usage rights are the whole negotiation.',
    meta: 'Licensed content',
  },
  {
    title: 'Story sets',
    body: 'A few connected stories with a link. Traffic rather than reach — and the cheapest thing to test with.',
    meta: 'Same-week turnaround',
  },
  {
    title: 'Long-form integrations',
    body: 'A segment inside a longer video, or a whole video built around the product.',
    meta: 'Highest intent',
  },
  {
    title: 'City-led campaigns',
    body: 'Shortlist by city when the campaign is local — a store opening, a regional launch, an event.',
    meta: 'Filter by location',
  },
] as const;

/** Written for the creator, not the brand — this is the half of the page they read. */
const FOR_CREATORS = [
  {
    title: 'You set the price',
    body: 'Publish what you charge for a reel, a story set, a video. Brands see it before they contact you, so nobody opens with "what\u2019s your best rate?"',
  },
  {
    title: 'Verified means something here',
    body: 'A person checks every account before it goes live. Because nobody can list themselves, being listed is a signal on its own.',
  },
  {
    title: 'No commission, ever',
    body: 'Brands request a package and it lands in your panel with their contact details. You agree the terms with them directly — Aura never takes payment or a cut.',
  },
  {
    title: 'Free, and yours to edit',
    body: 'Bio, photo, niche and city update the moment you save them. A new or changed rate is checked first, then goes live.',
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
    title: 'Request a package',
    body: 'Prices are published on the profile. Request one and it reaches the creator with your brief — or contact them through their own channels. Either way you settle terms with them.',
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
      'No. Aura verifies profiles, lists them and passes your request on. Payment and terms are settled between you and the creator — nothing is charged here, and no cut is taken.',
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
  const [stats, categories, everyone] = await Promise.all([
    fetchStats(),
    fetchCategories(),
    // The locations endpoint is chained (a country gives states, a state gives cities),
    // so it cannot hand back every city in one call. The creators themselves can.
    fetchCreators({ limit: 100, sort: 'recent' }),
  ]);

  const cities = [...new Set(everyone.data.map((c) => c.location?.city).filter(Boolean))].sort();

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
          <p
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12.5px] font-semibold"
            style={{ background: 'var(--hero-scrim)', borderColor: 'var(--hero-border)', color: 'var(--hero-text)' }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: 'var(--gold-400)' }}
              aria-hidden="true"
            />
            Every profile reviewed by a person
          </p>

          <h1 className="mx-auto max-w-4xl text-[34px] leading-[1.12] sm:text-[54px]">
            Run influencer campaigns with creators you can{' '}
            <span style={{ color: 'var(--gold-300)' }}>actually verify</span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-[1.7] sm:text-[17px]"
            style={{ color: 'var(--hero-muted)' }}
          >
            {stats
              ? `${stats.totalCreators} verified creators across ${stats.totalCategories} niches and ${stats.totalCities} cities — with their rates published on their own profiles.`
              : 'A verified directory of content creators, reviewed one by one before they go live.'}
          </p>

          <HeroSearch />

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="#enquiry"
              className="btn h-12 px-6 text-[15px]"
              style={{ background: 'var(--hero-plate)', color: 'var(--hero-on-plate)' }}
            >
              Get a creator shortlist
            </Link>
            <Link
              href="/creators"
              className="btn h-12 px-6 text-[15px]"
              style={{ background: 'var(--hero-scrim)', color: 'var(--hero-text)', borderColor: 'var(--hero-border)' }}
            >
              Browse the directory
            </Link>
          </div>

          {spotlight.length > 0 && (
            <div className="mt-10 flex flex-col items-center gap-3">
              <div className="flex">
                {spotlight.slice(0, 5).map((creator, index) => (
                  <span key={creator._id} style={{ marginLeft: index === 0 ? 0 : -14 }}>
                    <Avatar name={creator.name} src={creator.profileImage} size={40} onHero eager />
                  </span>
                ))}
              </div>
              {/* The subcopy above already gives the counts; this line names what the
                  faces are, instead of repeating the same sentence twice. */}
              <p className="text-[13px]" style={{ color: 'var(--hero-muted)' }}>
                Recently verified on Aura
              </p>
            </div>
          )}
        </div>
      </section>

      {/* A band of air so the first line of content does not touch the violet. */}
      <div className="mx-auto max-w-6xl px-5">
        {!!stats && (
          <div className="over-hero -mt-8 grid grid-cols-3 gap-3 sm:gap-4">
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

        <div className="mt-10">
          <NicheMarquee categories={categories} />
        </div>

        <section className="mt-16" aria-labelledby="why">
          <p className="eyebrow">For brands</p>
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

        <section className="mt-16" aria-labelledby="campaigns">
          <p className="eyebrow">Formats</p>
          <h2 id="campaigns" className="text-[24px] sm:text-[28px]">Campaigns you can run</h2>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
            Formats brands brief most often — pick the shape, then shortlist for it
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPAIGN_TYPES.map((item) => (
              <article key={item.title} className="card card-hover p-5">
                <span
                  className="chip"
                  style={{ background: 'var(--violet-bg)', color: 'var(--violet-400)' }}
                >
                  {item.meta}
                </span>
                <h3 className="mt-3 text-[16px] font-bold">{item.title}</h3>
                <p className="prose-body mt-2 text-[13.5px]">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="estimate">
          <p className="eyebrow">Planning</p>
          <h2 id="estimate" className="text-[24px] sm:text-[28px]">Estimate your campaign</h2>
          <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
            A planning range before you talk to anyone
          </p>
          <div className="mt-6">
            <ReachEstimator />
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

        {cities.length > 0 && (
          <section className="card mt-16 p-6 sm:p-8" aria-labelledby="cities">
            <h2 id="cities" className="text-[20px]">Cities covered</h2>
            <p className="prose-body mt-1.5 text-[13.5px]">
              Where the creators currently listed are based.
            </p>
            {/* Plain text, not links: a per-city URL would be a filtered listing, and
                those are deliberately kept out of the index. */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {cities.map((city) => (
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

        <section className="mt-16 scroll-mt-24" id="enquiry" aria-labelledby="enquiry-heading">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-12">
            <div>
              <h2 id="enquiry-heading" className="text-[24px] sm:text-[30px]">
                Tell us what you are planning
              </h2>
              <p className="prose-body mt-3 text-[14.5px]">
                Share the brief and we will come back with a shortlist of verified creators
                who fit the niche, the city and the budget — not a list of everyone we have.
              </p>

              <ul className="mt-6 grid gap-3">
                {[
                  'Only reviewed profiles, never self-listed accounts',
                  'Rates published by the creator, on their own profile',
                  'You deal with the creator directly — no commission',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: 'var(--text-2)' }}>
                    <span
                      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full"
                      style={{ background: 'var(--mint-bg)', color: 'var(--mint-400)' }}
                      aria-hidden="true"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <EnquiryForm />
          </div>
        </section>

        {/* The creator half of the page. Given its own full-width band so it reads as a
            destination rather than a footnote under the brand pitch. */}
        <section className="mt-20" aria-labelledby="creators-heading">
          <div className="card-feature overflow-hidden">
            <div className="hero px-6 py-12 text-center sm:px-10 sm:py-16">
              <p className="eyebrow" style={{ color: 'var(--gold-300)' }}>For creators</p>
              <h2 id="creators-heading" className="mx-auto mt-3 max-w-2xl text-[27px] leading-[1.15] sm:text-[38px]">
                Get found by brands{' '}
                <span style={{ color: 'var(--gold-300)' }}>without chasing them</span>
              </h2>
              <p
                className="mx-auto mt-4 max-w-xl text-[15px] leading-[1.7]"
                style={{ color: 'var(--hero-muted)' }}
              >
                List your niche, your city and what you charge. Brands browsing Aura find you
                with the price already on the table.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/register"
                  className="btn h-12 px-6 text-[15px]"
                  style={{ background: 'var(--hero-plate)', color: 'var(--hero-on-plate)' }}
                >
                  Create your profile — free
                </Link>
                <Link
                  href="/about"
                  className="btn h-12 px-6 text-[15px]"
                  style={{ background: 'var(--hero-scrim)', color: 'var(--hero-text)', borderColor: 'var(--hero-border)' }}
                >
                  How approval works
                </Link>
              </div>
            </div>

            <div className="grid gap-px sm:grid-cols-2" style={{ background: 'var(--line)' }}>
              {FOR_CREATORS.map((item) => (
                <div key={item.title} className="p-6" style={{ background: 'var(--ink-950)' }}>
                  <h3 className="text-[16px] font-bold">{item.title}</h3>
                  <p className="prose-body mt-2 text-[13.5px]">{item.body}</p>
                </div>
              ))}
            </div>

            <div
              className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t px-6 py-5 text-center text-[13px]"
              style={{ background: 'var(--ink-950)', color: 'var(--text-3)' }}
            >
              <span>Free to join</span>
              <span aria-hidden="true">·</span>
              <span>No commission on your deals</span>
              <span aria-hidden="true">·</span>
              <span>Reviewed by a person, not a bot</span>
            </div>
          </div>
        </section>
      </div>

      {/* Sits above the footer, and gives the page a persistent way to act on. */}
      <StickyCta />
    </>
  );
}
