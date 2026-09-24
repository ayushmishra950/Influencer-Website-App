'use client';

import { useEffect } from 'react';
import { API_URL } from '@/lib/api';

/**
 * Records that this profile was opened.
 *
 * A ping rather than a counter bumped while rendering, because the page is cached: a
 * render does not happen per visitor. Deduplicated per tab through sessionStorage so
 * the back button does not inflate the number, and every failure is swallowed — a
 * missed count is not worth an error in anyone's console.
 */
export function ProfileViewPing({ creatorId }: { creatorId: string }) {
  useEffect(() => {
    const key = `aura.viewed.${creatorId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Private window or blocked storage: count it, rather than not counting at all.
    }

    // keepalive so it still goes out if the visitor navigates away immediately.
    void fetch(`${API_URL}/api/public/influencers/${creatorId}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => undefined);
  }, [creatorId]);

  return null;
}
