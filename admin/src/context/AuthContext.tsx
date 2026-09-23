import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, tokenStore } from '@/lib/api';
import type { AuthUser } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored token has been checked against the server. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on boot: a token in storage still has to be accepted by the server.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api
      .get<{ data: { user: AuthUser } }>('/api/auth/me')
      .then(({ data }) => {
        if (cancelled) return;
        if (data.data.user.role !== 'admin') {
          tokenStore.clear();
          return;
        }
        setUser(data.data.user);
      })
      .catch(() => tokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ data: { token: string; user: AuthUser } }>(
      '/api/auth/login',
      { email, password },
    );
    // The API allows influencers to log in too — this dashboard does not.
    if (data.data.user.role !== 'admin') {
      throw new Error('This account does not have admin access.');
    }
    tokenStore.set(data.data.token);
    setUser(data.data.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
