'use client';

import { useSyncExternalStore } from 'react';
import { relativeTime } from '@/lib/format';

const subscribe = () => () => {};

/**
 * "3 hours ago", rendered only in the browser.
 *
 * The server and the browser disagree about "now", so rendering this on both sides is
 * a guaranteed hydration mismatch. `useSyncExternalStore` gives the server (and the
 * first client paint) the absolute date, then swaps in the relative one -- so the HTML
 * a crawler reads still carries a real date rather than an empty element.
 */
export function RelativeDate({ iso }: { iso: string }) {
  const label = useSyncExternalStore(
    subscribe,
    () => relativeTime(iso),
    () => new Date(iso).toISOString().slice(0, 10),
  );

  return <time dateTime={iso}>{label}</time>;
}
