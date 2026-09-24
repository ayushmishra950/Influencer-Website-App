'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '@/lib/session';

/**
 * A bar that follows you down the page with the one action this page is for.
 *
 * Hidden until the hero has scrolled past — it has its own buttons, and stacking a
 * second copy on top of them just crowds the first screen. Also hidden for anyone
 * signed in: they are already in, and their own call to action is the dashboard.
 */
export function StickyCta() {
  const { signedIn } = useSession();
  const [past, setPast] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > 620);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (signedIn || !past) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--ink-950) 92%, transparent)' }}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
        <p className="min-w-0 flex-1 text-[13.5px] font-semibold">
          Start your campaign with verified creators
          <span className="ml-2 hidden font-normal sm:inline" style={{ color: 'var(--text-3)' }}>
            Free to browse · rates published upfront
          </span>
        </p>
        <Link href="/creators" className="btn btn-ghost h-9 px-4 text-[13.5px]">Browse creators</Link>
        <Link href="#enquiry" className="btn btn-primary h-9 px-4 text-[13.5px]">Get a shortlist</Link>
      </div>
    </div>
  );
}
