import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const APP_NAME = 'Admin Panel';

/**
 * Route → the name shown in the browser tab.
 *
 * Ordered, and matched top to bottom, because `/influencers/new` and
 * `/influencers/:id/edit` would otherwise be swallowed by the `/influencers/:id` rule.
 */
const ROUTE_TITLES: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /^\/$/, label: 'Dashboard' },
  { pattern: /^\/login\/?$/, label: 'Sign In' },
  { pattern: /^\/forgot-password\/?$/, label: 'Forgot Password' },
  { pattern: /^\/reset-password\/?$/, label: 'Set New Password' },
  { pattern: /^\/change-password\/?$/, label: 'Change Password' },
  { pattern: /^\/influencers\/new\/?$/, label: 'Add Influencer' },
  { pattern: /^\/influencers\/[^/]+\/edit\/?$/, label: 'Edit Influencer' },
  { pattern: /^\/influencers\/[^/]+\/?$/, label: 'Influencer Details' },
  { pattern: /^\/influencers\/?$/, label: 'Influencers' },
  { pattern: /^\/review\/?$/, label: 'Review Queue' },
  { pattern: /^\/archived\/?$/, label: 'Archived' },
  { pattern: /^\/packages\/?$/, label: 'Packages' },
  { pattern: /^\/enquiries\/?$/, label: 'Enquiries' },
  { pattern: /^\/categories\/?$/, label: 'Categories' },
];

export function pageTitleFor(pathname: string): string {
  const match = ROUTE_TITLES.find((entry) => entry.pattern.test(pathname));
  return match ? `${APP_NAME} (${match.label})` : APP_NAME;
}

/** Keeps the browser tab showing which page is open. */
export function useDocumentTitle(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = pageTitleFor(pathname);
  }, [pathname]);
}
