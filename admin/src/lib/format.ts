/** "12 Mar 2025" — unambiguous and short enough for a table cell. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(value?: string | null): string {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

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
  [loc?.city, loc?.state, loc?.country].filter(Boolean).join(', ') || '—';

/** Accepts a full URL or a bare @handle and always yields something clickable. */
export function socialUrl(platform: 'instagram' | 'youtube', value: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const handle = raw.replace(/^@/, '');
  return platform === 'instagram'
    ? `https://instagram.com/${handle}`
    : `https://youtube.com/@${handle}`;
}

/** Uploaded images come back as a server-relative path like /uploads/abc.jpg. */
export function imageUrl(path: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${import.meta.env.VITE_API_BASE_URL || ''}${path}`;
}

/** "₹3,000" — grouped the Indian way, since that is who the directory serves. */
export function formatPrice(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 })
      .format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-IN')}`;
  }
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

/**
 * "12.4K", "1.2M". For follower counts, where the exact figure is noise and the order
 * of magnitude is the whole signal.
 */
export function compactNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}
