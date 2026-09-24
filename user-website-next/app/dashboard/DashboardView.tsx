'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { CreatorCard } from '@/components/CreatorCard';
import { FormError } from '@/components/FormError';
import { apiRequest, errorMessage, tokenStore } from '@/lib/client-api';
import { deliveryLabel, formatPrice, locationLine, pluralize } from '@/lib/format';
import { notifySessionChange } from '@/lib/session';
import type { Creator, OwnPackage, OwnProfile, Stats } from '@/lib/types';

interface Props {
  /** Public, cached, and rendered on the server — the same numbers the home page uses. */
  stats: Stats | null;
  recent: Creator[];
}

const STATUS: Record<string, { label: string; body: string; tone: string; bg: string }> = {
  approved: {
    label: 'Live in the directory',
    body: 'Brands browsing Aura can find and contact you.',
    tone: 'var(--mint-400)',
    bg: 'var(--mint-bg)',
  },
  pending: {
    label: 'Under review',
    body: 'Our team is checking your accounts. You will be notified the moment that changes.',
    tone: 'var(--amber-400)',
    bg: 'var(--amber-bg)',
  },
  rejected: {
    label: 'Not approved',
    body: 'Your registration was not approved. Please contact support for the reason.',
    tone: 'var(--rose-400)',
    bg: 'var(--rose-bg)',
  },
};

export function DashboardView({ stats, recent }: Props) {
  const router = useRouter();

  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [packages, setPackages] = useState<OwnPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const started = useRef(false);

  async function load() {
    if (!tokenStore.get()) {
      router.replace('/login');
      return;
    }
    try {
      const me = await apiRequest<{ data: { profile: OwnProfile | null } }>('/api/auth/me', { auth: true });
      setProfile(me.data.profile);
      if (me.data.profile) {
        const list = await apiRequest<{ data: OwnPackage[] }>('/api/influencer/packages', { auth: true })
          .catch(() => ({ data: [] as OwnPackage[] }));
        setPackages(list.data);
      }
    } catch (err) {
      // A stored token the server no longer accepts is not a session.
      tokenStore.clear();
      notifySessionChange();
      setError(errorMessage(err, 'Your session has ended. Please sign in again.'));
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Every setState inside happens after an await, so nothing here renders twice.
    void load();
    // Runs once on mount: nothing about this component changes the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-24 text-center">
        <p style={{ color: 'var(--text-3)' }}>Loading your dashboard…</p>
      </div>
    );
  }

  if (error && !profile) {
    return <div className="mx-auto max-w-md px-5 py-20"><FormError message={error} /></div>;
  }

  const state = profile?.isArchived ? 'rejected' : profile?.status ?? 'pending';
  const status = STATUS[state] ?? STATUS.pending;
  const isPublic = profile?.status === 'approved' && !profile?.isArchived;

  const live = packages.filter((p) => p.status === 'approved').length;
  const reviewing = packages.filter((p) => p.status === 'pending').length;
  const rejected = packages.filter((p) => p.status === 'rejected').length;

  // Nudges the creator towards the things that actually make a profile worth finding.
  const missing = [
    !profile?.profileImage && 'a profile photo',
    !profile?.bio && 'a bio',
    !profile?.social?.instagram && !profile?.social?.youtube && 'a social account',
    packages.length === 0 && 'at least one package',
  ].filter(Boolean) as string[];

  const firstName = (profile?.name ?? '').split(' ')[0] || 'there';

  return (
    <>
      <section className="hero">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-5 py-12 sm:flex-row sm:items-center">
          <Avatar name={profile?.name ?? '?'} src={profile?.profileImage} size={78} onHero />

          <div className="min-w-0 flex-1">
            <p className="text-[13px]" style={{ color: 'var(--hero-muted)' }}>Welcome back</p>
            <h1 className="mt-0.5 truncate text-[28px] sm:text-[34px]">{profile?.name ?? firstName}</h1>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--hero-muted)' }}>
              {[profile?.category?.name, locationLine(profile?.location)].filter(Boolean).join(' · ')}
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/profile" className="btn h-10 px-4 text-[13.5px]" style={{ background: 'var(--hero-plate)', color: 'var(--hero-on-plate)' }}>
              Manage profile
            </Link>
            {isPublic && !!profile && (
              <Link
                href={`/creators/${profile._id}`}
                className="btn h-10 px-4 text-[13.5px]"
                style={{ background: 'var(--hero-scrim)', color: 'var(--hero-text)', borderColor: 'var(--hero-border)' }}
              >
                View public page
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-5">
        {!!error && <div className="mt-6"><FormError message={error} /></div>}

        {/* The one thing a creator opens this page to check. */}
        <section
          className="-mt-7 rounded-2xl border p-5"
          style={{ background: 'var(--ink-950)', borderColor: `color-mix(in srgb, ${status.tone} 40%, transparent)` }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip" style={{ background: status.bg, color: status.tone }}>{status.label}</span>
          </div>
          <p className="prose-body mt-2 text-[14px]">{status.body}</p>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" aria-label="Your numbers">
          {[
            { value: packages.length, label: 'Packages', tone: 'var(--text)' },
            { value: live, label: 'Live', tone: 'var(--mint-400)' },
            { value: reviewing, label: 'Under review', tone: 'var(--amber-400)' },
            { value: rejected, label: 'Not approved', tone: 'var(--rose-400)' },
          ].map((tile) => (
            <div key={tile.label} className="card px-4 py-5">
              <p className="text-[28px] font-bold" style={{ color: tile.tone }}>{tile.value}</p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-3)' }}>{tile.label}</p>
            </div>
          ))}
        </section>

        {missing.length > 0 && (
          <section className="card mt-6 p-6">
            <h2 className="text-[17px]">Finish your profile</h2>
            <p className="prose-body mt-1.5 text-[14px]">
              Brands skim. You are still missing {missing.join(', ').replace(/, ([^,]*)$/, ' and $1')}.
            </p>
            <div className="mt-4">
              <Link href="/profile" className="btn btn-primary h-9 px-4 text-[13.5px]">Complete it</Link>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Shortcuts">
          {[
            { href: '/profile', title: 'Edit your profile', body: 'Name, niche, city, photo and channels.' },
            { href: '/profile', title: 'Add a package', body: 'What you charge, and for what. Reviewed before it goes live.' },
            { href: '/creators', title: 'Browse the directory', body: `See all ${stats ? stats.totalCreators : ''} verified creators.` },
          ].map((card) => (
            <Link key={card.title} href={card.href} className="card card-hover p-5">
              <h3 className="text-[15.5px] font-bold">{card.title}</h3>
              <p className="prose-body mt-1.5 text-[13.5px]">{card.body}</p>
            </Link>
          ))}
        </section>

        <section className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[17px]">Your packages</h2>
            <Link href="/profile" className="text-[13.5px] font-semibold" style={{ color: 'var(--violet-400)' }}>
              Manage →
            </Link>
          </div>

          {packages.length === 0 ? (
            <p className="prose-body mt-3 text-[14px]">
              Nothing listed yet. Add what you charge — a reel, a story set, a video — and our
              team will review it before it appears on your public profile.
            </p>
          ) : (
            <ul className="mt-4 grid gap-2.5">
              {packages.slice(0, 4).map((item) => {
                const tone = item.status === 'approved' && !isPublic
                  ? { label: 'Approved · not public yet', tone: 'var(--amber-400)', bg: 'var(--amber-bg)' }
                  : item.status === 'approved'
                    ? { label: 'Live', tone: 'var(--mint-400)', bg: 'var(--mint-bg)' }
                    : item.status === 'pending'
                      ? { label: 'Under review', tone: 'var(--amber-400)', bg: 'var(--amber-bg)' }
                      : { label: 'Not approved', tone: 'var(--rose-400)', bg: 'var(--rose-bg)' };

                return (
                  <li
                    key={item._id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3"
                    style={{ background: 'var(--ink-800)' }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14.5px] font-bold">{item.title}</span>
                      {!!deliveryLabel(item.deliveryDays) && (
                        <span className="block text-[12px]" style={{ color: 'var(--text-3)' }}>
                          {deliveryLabel(item.deliveryDays)}
                        </span>
                      )}
                    </span>
                    <span className="chip" style={{ background: tone.bg, color: tone.tone }}>{tone.label}</span>
                    <span className="font-bold" style={{ color: 'var(--violet-400)' }}>
                      {formatPrice(item.price, item.currency)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {recent.length > 0 && (
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-[20px]">Newest on Aura</h2>
                <p className="mt-0.5 text-[13.5px]" style={{ color: 'var(--text-3)' }}>
                  {stats ? `${pluralize(stats.totalCreators, 'verified creator')} across ${pluralize(stats.totalCities, 'city', 'cities')}` : 'Just approved'}
                </p>
              </div>
              <Link href="/creators" className="text-[14px] font-semibold" style={{ color: 'var(--violet-400)' }}>
                See all →
              </Link>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.slice(0, 3).map((creator) => (
                <CreatorCard key={creator._id} creator={creator} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
