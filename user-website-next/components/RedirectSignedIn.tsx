'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/session';

/**
 * Sends a signed-in visitor from the marketing home page to their dashboard.
 *
 * Client-side and after hydration on purpose: the server still renders the full public
 * page, so a crawler — which never has a token — is served the real content and the
 * home page stays indexable. `replace`, not `push`, so Back does not bounce them here
 * again.
 */
export function RedirectSignedIn({ to }: { to: string }) {
  const router = useRouter();
  const { signedIn } = useSession();

  useEffect(() => {
    if (signedIn) router.replace(to);
  }, [signedIn, router, to]);

  return null;
}
