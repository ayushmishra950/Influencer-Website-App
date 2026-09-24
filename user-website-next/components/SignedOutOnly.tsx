'use client';

import type { ReactNode } from 'react';
import { useSession } from '@/lib/session';

/**
 * Hides an invitation that only makes sense before signing in — "Join as a creator"
 * shown to somebody who already has an account.
 *
 * The server renders the children, so a crawler still follows the link to /register and
 * that page keeps its internal links. They disappear only after hydration, for people
 * who are actually signed in.
 */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { signedIn } = useSession();
  if (signedIn) return null;
  return <>{children}</>;
}
