import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'aura.admin.theme';

interface ThemeContextValue {
  theme: Theme;
  /** True while the theme is whatever the OS says, i.e. the user has not chosen one. */
  followsSystem: boolean;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
  /** Hands control back to the OS preference. */
  useSystem: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const systemTheme = (): Theme =>
  window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    // Private mode or blocked storage — fall back to the system preference.
    return null;
  }
}

/** Applied to <html>, which is what every token block keys off. */
function apply(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Theme | null>(() => readStored());
  const [system, setSystem] = useState<Theme>(() => systemTheme());

  const theme = stored ?? system;

  useEffect(() => {
    apply(theme);
  }, [theme]);

  // Track the OS preference so an unset admin follows it live.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return;
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisting is survivable; the choice still applies for this session.
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme((stored ?? system) === 'dark' ? 'light' : 'dark');
  }, [setTheme, stored, system]);

  const useSystem = useCallback(() => {
    setStored(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, followsSystem: stored === null, toggle, setTheme, useSystem }),
    [theme, stored, toggle, setTheme, useSystem],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
