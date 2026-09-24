'use client';

import { useSyncExternalStore } from 'react';
import { tokenStore } from './client-api';

const EVENT = 'aura:sessionchange';

/** Call after signing in or out so every mounted component updates at once. */
export function notifySessionChange(): void {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  // Signing out in one tab should sign out the others too.
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/**
 * Whether there is a stored session, read as an external store rather than copied into
 * state from an effect — the same reason the theme toggle does it: the snapshot is
 * always the truth, with no render in between showing the wrong thing.
 *
 * The server snapshot is "signed out" because the token lives in localStorage and the
 * server cannot see it. That is deliberate, and it is what keeps these pages indexable:
 * a crawler is served exactly the signed-out version.
 */
export function useSession(): { signedIn: boolean } {
  const token = useSyncExternalStore(
    subscribe,
    () => tokenStore.get(),
    () => null,
  );
  return { signedIn: !!token };
}
