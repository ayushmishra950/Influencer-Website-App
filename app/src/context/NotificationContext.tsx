import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { request } from '@/lib/api';
import { getSocket, SOCKET_EVENTS, type AppNotification, type NotificationEvent } from '@/lib/socket';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unread: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request<{ data: AppNotification[]; meta: { unread: number } }>(
        '/api/notifications',
        { params: { limit: 30 } },
      );
      setNotifications(response.data);
      setUnread(response.meta.unread);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnread(0);
      return;
    }

    // The socket only carries what happens from now on, so anything that arrived
    // while the app was closed has to come from the API.
    void refresh().catch(() => undefined);

    // AuthContext owns the socket; this just listens on it.
    const attach = () => {
      const socket = getSocket();
      if (!socket) return false;
      socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (event: NotificationEvent) => {
        setNotifications((current) => [event.notification, ...current].slice(0, 50));
        setUnread(event.unread);
      });
      return true;
    };

    // The socket is created asynchronously (it waits on the stored token), so retry briefly.
    if (!attach()) {
      const timer = setInterval(() => attach() && clearInterval(timer), 400);
      setTimeout(() => clearInterval(timer), 8000);
      return () => clearInterval(timer);
    }

    return () => {
      getSocket()?.off(SOCKET_EVENTS.NOTIFICATION_NEW);
    };
  }, [user, refresh]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((current) => current.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((current) => Math.max(0, current - 1));
    const response = await request<{ data: { unread: number } }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    setUnread(response.data.unread);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await request('/api/notifications/read-all', { method: 'PATCH' });
  }, []);

  const value = useMemo(
    () => ({ notifications, unread, loading, refresh, markRead, markAllRead }),
    [notifications, unread, loading, refresh, markRead, markAllRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return context;
}
