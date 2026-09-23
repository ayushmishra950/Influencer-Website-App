import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { request, tokenStore } from '@/lib/api';
import { connectSocket, disconnectSocket, SOCKET_EVENTS, type SessionRevokedPayload } from '@/lib/socket';
import type { AuthUser, MyProfile } from '@/lib/types';

interface LoginResponse {
  data: { token: string; user: AuthUser; profile: MyProfile | null };
}

interface MeResponse {
  data: { user: AuthUser; profile: MyProfile | null };
}

interface AuthContextValue {
  user: AuthUser | null;
  profile: MyProfile | null;
  /** True until a stored token has been checked against the server. */
  booting: boolean;
  /**
   * Set when an admin ended this session (archive / delete / reject).
   * The login screen reads it to explain why the user was signed out.
   */
  revokedMessage: string | null;
  clearRevokedMessage: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: MyProfile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [booting, setBooting] = useState(true);
  const [revokedMessage, setRevokedMessage] = useState<string | null>(null);

  // Restore the session on launch. A stored token still has to be accepted by the server.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!(await tokenStore.get())) return;
        const { data } = await request<MeResponse>('/api/auth/me');
        if (cancelled) return;
        setUser(data.user);
        setProfile(data.profile);
      } catch {
        await tokenStore.clear();
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /** Drops the session locally. `reason` is shown on the login screen when present. */
  const endSession = useCallback(async (reason: string | null) => {
    disconnectSocket();
    await tokenStore.clear();
    setUser(null);
    setProfile(null);
    setRevokedMessage(reason);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    await tokenStore.set(data.token);
    setUser(data.user);
    setProfile(data.profile);
    setRevokedMessage(null);
  }, []);

  const logout = useCallback(() => endSession(null), [endSession]);

  const refreshProfile = useCallback(async () => {
    const { data } = await request<{ data: MyProfile }>('/api/influencer/profile');
    setProfile(data);
  }, []);

  // One socket for the whole signed-in session. `session:revoked` is what makes an
  // archived or deleted user drop out immediately instead of at token expiry.
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    let cancelled = false;

    void (async () => {
      const token = await tokenStore.get();
      if (!token || cancelled) return;

      const socket = connectSocket(token);
      socket.on(SOCKET_EVENTS.SESSION_REVOKED, (payload: SessionRevokedPayload) => {
        void endSession(payload.message);
      });
    })();

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [user, endSession]);

  const clearRevokedMessage = useCallback(() => setRevokedMessage(null), []);

  const value = useMemo(
    () => ({
      user, profile, booting, revokedMessage, clearRevokedMessage,
      login, logout, refreshProfile, setProfile,
    }),
    [user, profile, booting, revokedMessage, clearRevokedMessage, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
