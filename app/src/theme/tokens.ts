/**
 * Aura design tokens, in two themes.
 *
 * The `ink*` scale is a SURFACE ELEVATION scale, not a fixed colour ramp: 1000 is the
 * screen itself and lower numbers sit progressively closer to the reader. Dark mode
 * makes 1000 near-black and raised surfaces lighter; light mode inverts it. Screens
 * therefore never branch on which theme is active — they just ask for an elevation.
 *
 * These values mirror the admin dashboard's tokens so both products look like one brand.
 */
import { Platform } from 'react-native';

export interface Palette {
  ink1000: string;
  ink950: string;
  ink900: string;
  ink850: string;
  ink800: string;
  ink750: string;
  ink700: string;

  line: string;
  lineStrong: string;

  violet300: string;
  violet400: string;
  violet500: string;
  violet600: string;
  violet700: string;

  gold300: string;
  gold400: string;
  gold500: string;

  mint400: string;
  amber400: string;
  rose400: string;
  slate400: string;

  text: string;
  text2: string;
  text3: string;
  onBrand: string;

  mintBg: string;
  amberBg: string;
  roseBg: string;
  slateBg: string;
  violetBg: string;
  goldBg: string;

  /** Recessed input surface — a plain card colour would make inputs invisible in light mode. */
  inputBg: string;
  /** Translucent scrim for floating controls over a card or screen. */
  scrim: string;
}

/**
 * The hero band is a BRAND surface, not a themed one: it stays violet in both themes
 * and always carries light text. Fading it to the page background in light mode would
 * put dark body text over saturated violet at the top of the gradient, which is
 * unreadable — so these values are deliberately theme-independent.
 */
export const Hero = {
  gradient: ['#6344e8', '#4f34c4'] as const,
  text: '#ffffff',
  // 0.80 and 0.62 measured 4.43:1 and 3.22:1 against the lighter end of the gradient,
  // both under AA. These clear it with a little margin.
  textMuted: 'rgba(255, 255, 255, 0.88)',
  textFaint: 'rgba(255, 255, 255, 0.85)',
  /** Backdrop for a search field or a floating control sitting on the hero. */
  scrim: 'rgba(10, 10, 16, 0.38)',
  border: 'rgba(255, 255, 255, 0.24)',
  /**
   * Icon colours for controls on the hero.
   *
   * These cannot come from the palette: the hero stays violet in both themes, so a
   * light-theme icon colour (a dark amber) disappears against it. Fixed light values
   * read on violet whichever theme is active.
   */
  iconMoon: '#f2d089',
  iconSun: '#ffd88a',
  /**
   * The avatar sitting on the hero.
   *
   * The normal avatar fill is the brand gradient (violet600 -> violet700), which is
   * the *same pair* the hero gradient uses -- measured contrast 1.00, so the disc is
   * literally invisible here in both themes. On the hero it inverts into a light
   * medallion instead: the disc reads 5.96:1 / 4.54:1 against the gradient and the
   * initials 6.10:1 on the disc's darker end.
   */
  avatarGradient: ['#ffffff', '#e4dcff'] as const,
  avatarText: '#4f34c4',
  /** Keeps a dark profile photo from bleeding into the violet behind it. */
  avatarRing: 'rgba(255, 255, 255, 0.92)',
  /**
   * A solid, tappable control on the hero (the search submit button). A violet-tinted
   * button would disappear the same way the avatar did, so this inverts: white plate
   * at 5.96:1 against the gradient, violet label at 8.01:1 on the plate.
   */
  actionBg: '#ffffff',
  actionText: '#4f34c4',
} as const;

export const darkColors: Palette = {
  ink1000: '#060609',
  ink950: '#0a0a10',
  ink900: '#101018',
  ink850: '#14141e',
  ink800: '#191924',
  ink750: '#1f1f2c',
  ink700: '#262634',

  line: '#262633',
  lineStrong: '#33334a',

  // Lifted from #b9a5ff, which measured 4.38:1 as chip label text on its own tint.
  violet300: '#c9b8ff',
  violet400: '#9b7cff',
  violet500: '#7c5cfc',
  violet600: '#6344e8',
  violet700: '#4f34c4',

  gold300: '#f2d089',
  gold400: '#e8b84b',
  gold500: '#d19f2d',

  mint400: '#34d399',
  amber400: '#fbbf24',
  rose400: '#fb7185',
  slate400: '#94a3b8',

  text: '#f4f4f7',
  text2: '#a8a8bd',
  // Lifted from #6f6f88, which fell under 4.5:1 for the small labels this is used for.
  text3: '#7e7e99',
  onBrand: '#ffffff',

  mintBg: 'rgba(52, 211, 153, 0.12)',
  amberBg: 'rgba(251, 191, 36, 0.12)',
  roseBg: 'rgba(251, 113, 133, 0.12)',
  slateBg: 'rgba(148, 163, 184, 0.12)',
  violetBg: 'rgba(124, 92, 252, 0.14)',
  goldBg: 'rgba(232, 184, 75, 0.12)',

  inputBg: '#0a0a10',
  scrim: 'rgba(10, 10, 16, 0.55)',
};

export const lightColors: Palette = {
  // The elevation scale inverts: the screen is a soft grey, raised surfaces are white.
  ink1000: '#f3f3f8',
  ink950: '#ffffff',
  ink900: '#ffffff',
  ink850: '#ffffff',
  ink800: '#f0f0f6',
  ink750: '#e6e6f0',
  ink700: '#d3d3e2',

  line: '#e5e5ee',
  lineStrong: '#c7c7d8',

  // The pale tints darken enough to read as text on white.
  violet300: '#5b3fd6',
  violet400: '#6344e8',
  violet500: '#7c5cfc',
  violet600: '#6344e8',
  violet700: '#4f34c4',

  gold300: '#a87f14',
  gold400: '#b8860b',
  gold500: '#96690a',

  // Darkened until each clears 4.5:1 against its own tinted chip.
  mint400: '#066c47',
  amber400: '#8a5a00',
  rose400: '#b81f3e',
  slate400: '#4f5b6d',

  text: '#14141d',
  text2: '#53536a',
  text3: '#66667d',
  onBrand: '#ffffff',

  mintBg: 'rgba(6, 108, 71, 0.10)',
  amberBg: 'rgba(138, 90, 0, 0.10)',
  roseBg: 'rgba(184, 31, 62, 0.09)',
  slateBg: 'rgba(79, 91, 109, 0.10)',
  violetBg: 'rgba(124, 92, 252, 0.10)',
  goldBg: 'rgba(184, 134, 11, 0.10)',

  inputBg: '#fafafc',
  scrim: 'rgba(255, 255, 255, 0.6)',
};

export type ThemeName = 'dark' | 'light';

export const palettes: Record<ThemeName, Palette> = {
  dark: darkColors,
  light: lightColors,
};

/** Gradients depend on the palette, so they are derived rather than fixed. */
export const gradientsFor = (c: Palette) => ({
  // violet600, not violet500: white on #7c5cfc measures 4.38:1, under AA for
  // button-sized text. The darker start is visually near-identical.
  brand: [c.violet600, c.violet700] as const,
  gold: [c.gold300, c.gold500] as const,
  surface: [c.ink850, c.ink900] as const,
});

export type Gradients = ReturnType<typeof gradientsFor>;

export const statusStyleFor = (c: Palette) =>
  ({
    approved: { color: c.mint400, bg: c.mintBg, label: 'Approved' },
    pending: { color: c.amber400, bg: c.amberBg, label: 'Under review' },
    rejected: { color: c.rose400, bg: c.roseBg, label: 'Not approved' },
    archived: { color: c.slate400, bg: c.slateBg, label: 'Archived' },
  }) as const;

/* ---------- Theme-independent tokens ---------- */

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
} as const;

export const Fonts = Platform.select({
  ios: { display: 'System', body: 'System' },
  default: { display: 'sans-serif-medium', body: 'sans-serif' },
})!;

export const Type = {
  h1: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 14.5, fontWeight: '400' as const },
  bodyStrong: { fontSize: 14.5, fontWeight: '600' as const },
  small: { fontSize: 12.5, fontWeight: '500' as const },
  tiny: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
};
