import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  gradientsFor, palettes, statusStyleFor,
  type Gradients, type Palette, type ThemeName,
} from '@/theme/tokens';

const STORAGE_KEY = 'aura.theme';

interface ThemeContextValue {
  theme: ThemeName;
  colors: Palette;
  gradients: Gradients;
  statusStyle: ReturnType<typeof statusStyleFor>;
  /** True while the theme follows the OS, i.e. the user has not chosen one. */
  followsSystem: boolean;
  toggle: () => void;
  useSystem: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() === 'light' ? 'light' : 'dark';
  const [stored, setStored] = useState<ThemeName | null>(null);

  // Storage is async, so the first frame uses the OS preference and the stored
  // choice is applied as soon as it loads — no flash of the wrong theme afterwards.
  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled && (value === 'dark' || value === 'light')) setStored(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = stored ?? system;

  const toggle = useCallback(() => {
    const next: ThemeName = theme === 'dark' ? 'light' : 'dark';
    setStored(next);
    // Not persisting is survivable — the choice still applies for this session.
    void AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, [theme]);

  const useSystem = useCallback(() => {
    setStored(null);
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = palettes[theme];
    return {
      theme,
      colors,
      gradients: gradientsFor(colors),
      statusStyle: statusStyleFor(colors),
      followsSystem: stored === null,
      toggle,
      useSystem,
    };
  }, [theme, stored, toggle, useSystem]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}

/**
 * The active palette.
 *
 * Callers bind it as `const Colors = useThemeColors()` so the token names read the
 * same everywhere; only the source changed from a fixed object to the live theme.
 */
export function useThemeColors(): Palette {
  return useTheme().colors;
}
