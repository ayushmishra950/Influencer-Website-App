import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Avatar';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { OrderButton } from '@/components/OrderDialog';
import { ProfileViewPing } from '@/components/ProfileViewPing';
import { JsonLd } from '@/components/JsonLd';
import { fetchCreator, fetchCreatorPackages } from '@/lib/api';
import {
  deliveryLabel, formatPrice, fullDate, handleFrom, locationLine, shortLocation, compactNumber } from '@/lib/format';
import { clampDescription, pageOpenGraph } from '@/lib/seo';
import { breadcrumbSchema, creatorProfileSchema } from '@/lib/structured-data';

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const creator = await fetchCreator(id);

  if (!creator) {
    return { title: 'Creator not found', robots: { index: false, follow: true } };
  }

  const place = shortLocation(creator.location);
  const niche = creator.category?.name;

  // Built from what the page actually shows, in the words someone would search:
  // "Sneha Kapoor — Beauty Creator in Bengaluru, Karnataka". The niche and the place
  // form one phrase, so only the name is separated off.
  const role = [niche && `${niche} Creator`, place && `in ${place}`].filter(Boolean).join(' ');
  const title = role ? `${creator.name} — ${role}` : creator.name;

  const description = clampDescription(
    creator.bio
      ? `${creator.bio} Verified ${niche ? `${niche.toLowerCase()} ` : ''}creator${place ? ` based in ${place}` : ''} on Aura — view channels and collaboration packages.`
      : `${creator.name} is a verified ${niche ? `${niche.toLowerCase()} ` : ''}creator${place ? ` in ${place}` : ''} on Aura. View their channels and collaboration packages.`,
  );

  return {
    title,
    description,
    alternates: { canonical: `/creators/${creator._id}` },
    // image: null — this route has its own opengraph-image.tsx, which draws the
    // creator's name, niche and city. That card is better than the site-wide one.
    openGraph: pageOpenGraph({
      title,
      description,
      path: `/creators/${creator._id}`,
      type: 'profile',
      image: null,
    }),
  };
}

export default async function CreatorPage({ params }: { params: Params }) {
  const { id } = await params;

  const creator = await fetchCreator(id);
  // A 404 here is the honest answer: the profile was archived, rejected, or never existed.
  if (!creator) notFound();

  const packages = await fetchCreatorPackages(id);

  const place = locationLine(creator.location);
  const socials = [
    {
      label: 'Instagram',
      url: creator.social?.instagram,
      handle: handleFrom(creator.social?.instagram),
      // Followers the creator declared, not a number pulled from any API -- the label
      // next to it says so, because a claimed figure presented as a fact is a lie.
      followers: compactNumber(creator.audience?.instagram),
      unit: 'followers',
    },
    {
      label: 'YouTube',
      url: creator.social?.youtube,
      handle: handleFrom(creator.social?.youtube),
      followers: compactNumber(creator.audience?.youtube),
      unit: 'subscribers',
    },
  ].filter((item) => !!item.url);

  return (
    <>
      <ProfileViewPing creatorId={creator._id} />

      <JsonLd
        data={[
          creatorProfileSchema(creator, packages),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Creators', path: '/creators' },
            { name: creator.name, path: `/creators/${creator._id}` },
          ]),
        ]}
      />

      <section className="hero">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-5 py-14 text-center">
          <Avatar name={creator.name} src={creator.profileImage} size={104} onHero eager />

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-[30px] sm:text-[38px]">{creator.name}</h1>
            {!!place && (
              <p className="text-[14.5px]" style={{ color: 'var(--hero-muted)' }}>{place}</p>
            )}
            {!!creator.category && (
              <span
                className="chip"
                style={{ background: 'var(--hero-scrim)', color: 'var(--hero-text)' }}
              >
                {creator.category.name}
              </span>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-5 px-5 py-10">
        <nav aria-label="Breadcrumb" className="text-[13px]" style={{ color: 'var(--text-3)' }}>
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href="/creators" className="hover:underline">Creators</Link>
          <span aria-hidden="true"> / </span>
          <span style={{ color: 'var(--text-2)' }}>{creator.name}</span>
        </nav>

        {!!creator.bio && (
          <section className="card p-6" aria-labelledby="about-creator">
            <h2 id="about-creator" className="text-[18px]">About</h2>
            <p className="prose-body mt-2 text-[14.5px]">{creator.bio}</p>
          </section>
        )}

        <section className="card p-6" aria-labelledby="channels">
          <h2 id="channels" className="text-[18px]">Social accounts</h2>
          {socials.length > 0 ? (
            <ul className="mt-3 grid gap-2">
              {socials.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[14px]"
                    style={{ background: 'var(--ink-800)' }}
                  >
                    <span className="font-semibold">
                      {social.label}
                      {!!social.followers && (
                        <span
                          className="ml-2 text-[12.5px] font-normal"
                          style={{ color: 'var(--text-3)' }}
                          title={`${social.followers} ${social.unit}, as declared by the creator`}
                        >
                          {social.followers} {social.unit} (self-reported)
                        </span>
                      )}
                    </span>
                    <span style={{ color: 'var(--violet-400)' }}>{social.handle}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="prose-body mt-2 text-[14px]">No public accounts listed.</p>
          )}
        </section>

        {packages.length > 0 && (
          <section aria-labelledby="packages">
            <h2 id="packages" className="text-[20px]">Packages</h2>
            <p className="mt-1 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
              Reviewed prices, straight from {creator.name.split(' ')[0]}
            </p>

            <div className="mt-4 grid gap-3">
              {packages.map((item) => (
                <article key={item._id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-[15.5px] font-bold">{item.title}</h3>
                      {!!deliveryLabel(item.deliveryDays) && (
                        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-3)' }}>
                          {deliveryLabel(item.deliveryDays)}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[18px] font-bold" style={{ color: 'var(--violet-400)' }}>
                      {formatPrice(item.price, item.currency)}
                    </p>
                  </div>
                  {!!item.description && (
                    <p className="prose-body mt-3 text-[14px]">{item.description}</p>
                  )}

                  {/* The card itself stays server-rendered so the title and price are in
                      the HTML a crawler reads; only the button is a client island. */}
                  <div className="mt-4">
                    <OrderButton creatorId={creator._id} creatorName={creator.name} pkg={item} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="card p-6" aria-labelledby="details">
          <h2 id="details" className="text-[18px]">Details</h2>
          <dl className="mt-3 grid gap-0 text-[14px]">
            {[
              ['Niche', creator.category?.name],
              ['City', creator.location?.city],
              ['State', creator.location?.state],
              ['Country', creator.location?.country],
              ['On Aura since', fullDate(creator.createdAt)],
            ]
              .filter(([, value]) => !!value)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 border-b py-2.5 last:border-b-0">
                  <dt style={{ color: 'var(--text-3)' }}>{label}</dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        <section className="card flex flex-col items-center gap-3 p-6 text-center">
          <VerifiedBadge />
          <h2 className="text-[17px]">Want to collaborate?</h2>
          <p className="prose-body max-w-sm text-[14px]">
            Request a package above and it goes straight to {creator.name}. You can also
            reach them through the social accounts listed. Aura verifies profiles and passes
            the request on — it does not take payment or negotiate on either side.
          </p>
          <Link href="/creators" className="btn btn-ghost">Browse more creators</Link>
        </section>
      </div>
    </>
  );
}
