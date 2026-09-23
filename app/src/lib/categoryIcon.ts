import type { Ionicons } from '@expo/vector-icons';
import type { ThemeName } from '@/theme/tokens';

type IoniconName = keyof typeof Ionicons.glyphMap;

/**
 * The seeded categories carry an icon hint; this maps it to a real Ionicon and
 * falls back gracefully for any category an admin adds later.
 */
const ICONS: Record<string, IoniconName> = {
  shirt: 'shirt',
  sparkles: 'sparkles',
  barbell: 'barbell',
  airplane: 'airplane',
  restaurant: 'restaurant',
  'hardware-chip': 'hardware-chip',
  'game-controller': 'game-controller',
  leaf: 'leaf',
  school: 'school',
  'trending-up': 'trending-up',
  'musical-notes': 'musical-notes',
};

export const categoryIcon = (icon?: string): IoniconName =>
  (icon && ICONS[icon]) || 'pricetag';

/**
 * A stable accent per category, so the same category always looks the same.
 *
 * Two sets, because these are used as LABEL colours on a tinted chip: the bright hues
 * that read well on a near-black card are unreadable on a white one.
 *
 * The light values are darker than a plain white background would require, because the
 * chip sits on its own accent tint inside an accent-tinted card — those stack, lifting
 * the effective background and eating the margin.
 */
const ACCENTS: Record<ThemeName, readonly string[]> = {
  dark: ['#9b7cff', '#e8b84b', '#34d399', '#fb7185', '#38bdf8', '#f472b6', '#a3e635'],
  light: ['#4c2fc4', '#7a5400', '#08603f', '#9c1832', '#02547f', '#9a1049', '#3c620b'],
};

export function categoryAccent(seed: string, theme: ThemeName): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  const set = ACCENTS[theme];
  return set[hash % set.length]!;
}
