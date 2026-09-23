export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

export const locationLine = (loc?: { city?: string; state?: string; country?: string }): string =>
  [loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ');

/** Accepts a full URL or a bare @handle and always yields something openable. */
export function socialUrl(platform: 'instagram' | 'youtube', value?: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '');
  return platform === 'instagram'
    ? `https://instagram.com/${handle}`
    : `https://youtube.com/@${handle}`;
}

/**
 * The readable handle behind a stored value, which may be a full URL or a bare handle.
 * Used for display only — `socialUrl` remains the thing you open.
 */
export function socialHandle(value?: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) return raw.startsWith('@') ? raw : `@${raw}`;
  const last = raw.replace(/\/+$/, '').split('/').pop() ?? '';
  if (!last) return null;
  return last.startsWith('@') ? last : `@${last}`;
}

/** "Sept 2026" — enough to show how established a creator is, without false precision. */
export function formatMonthYear(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "₹3,000" — grouped the Indian way, since that is who the directory serves. */
export function formatPrice(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code should not blank out the price.
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

export const deliveryLabel = (days: number): string | null =>
  days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} delivery` : null;

export const isEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
