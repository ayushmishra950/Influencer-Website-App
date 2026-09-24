'use client';

import { useState } from 'react';

/**
 * Copy-link button for a creator's own public profile.
 *
 * Creators keep a media-kit link in their bio; if that link is their Aura profile, the
 * directory travels wherever they do. `navigator.clipboard` needs a secure context and
 * permission, so there is a visible fallback rather than a button that silently fails.
 */
export function ShareProfile({ url }: { url: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-[12.5px]"
          style={{ background: 'var(--ink-800)', color: 'var(--text-2)' }}
        >
          {url}
        </code>
        <button type="button" onClick={() => void copy()} className="btn btn-primary h-9 shrink-0 px-4 text-[13px]">
          {state === 'copied' ? 'Copied' : 'Copy link'}
        </button>
      </div>
      {state === 'failed' && (
        <p className="text-[12px]" style={{ color: 'var(--text-3)' }}>
          Your browser would not let us copy it — select the link above and copy it manually.
        </p>
      )}
    </div>
  );
}
