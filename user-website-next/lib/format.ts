import type { Location } from './types';

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function locationLine(location?: Location | null): string {
  if (!location) return '';
  return [location.city, location.state, location.country].filter(Boolean).join(', ');
}

/** "Jaipur, Rajasthan" — enough to place someone without the full postal string. */
export function shortLocation(location?: Location | null): string {
  if (!location) return '';
  return [location.city, location.state].filter(Boolean).join(', ');
}

export function formatPrice(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function deliveryLabel(days?: number): string {
  if (!days || days < 1) return '';
  return days === 1 ? '1 day delivery' : `${days} days delivery`;
}

export function memberSince(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function fullDate(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Social handle from a profile URL, so "@name" can be shown instead of the full link. */
export function handleFrom(url?: string): string {
  if (!url) return '';
  const trimmed = url.replace(/\/$/, '');
  const last = trimmed.split('/').pop() ?? '';
  return last.startsWith('@') ? last : `@${last}`;
}

export const pluralize = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;
