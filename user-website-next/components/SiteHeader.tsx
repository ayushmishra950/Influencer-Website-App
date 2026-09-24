'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Wordmark } from './Brand';
import { ThemeToggle } from './ThemeToggle';
import { useSession } from '@/lib/session';

const PUBLIC_NAV = [
  { href: '/creators', label: 'Creators' },
  { href: '/about', label: 'About' },
] as const;

const SIGNED_IN_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/creators', label: 'Creators' },
  { href: '/about', label: 'About' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { signedIn } = useSession();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const nav = signedIn ? SIGNED_IN_NAV : PUBLIC_NAV;
  // Signed in, "home" is the dashboard — the landing page is for people who are not.
  const home = signedIn ? '/dashboard' : '/';

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{ background: 'color-mix(in srgb, var(--ink-1000) 88%, transparent)' }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">
        <Link href={home} aria-label="Aura home">
          <Wordmark size={30} />
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 sm:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className="rounded-lg px-3 py-2 text-[14px] font-semibold"
              style={{ color: isActive(item.href) ? 'var(--violet-400)' : 'var(--text-2)' }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <ThemeToggle />

          {/* The server always renders the signed-out set, because the token lives in
              localStorage and a crawler is served exactly that. Once hydrated, someone
              who is signed in sees their own controls instead of an invitation to sign
              in again — which was the whole confusion. */}
          {signedIn ? (
            <Link href="/profile" className="btn btn-primary h-9 px-4 text-[13.5px]">
              My profile
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden h-9 px-4 text-[13.5px] sm:inline-flex">
                Sign in
              </Link>
              <Link href="/register" className="btn btn-primary h-9 px-4 text-[13.5px]">
                Join
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid h-9 w-9 place-items-center rounded-lg border sm:hidden"
            style={{ background: 'var(--ink-800)', borderColor: 'var(--line)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className="border-t px-5 py-3 sm:hidden">
          <ul className="grid gap-1">
            {[...nav, signedIn
              ? { href: '/profile', label: 'My profile' }
              : { href: '/login', label: 'Sign in' }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-[14.5px] font-semibold"
                  style={{ color: isActive(item.href) ? 'var(--violet-400)' : 'var(--text-2)' }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
