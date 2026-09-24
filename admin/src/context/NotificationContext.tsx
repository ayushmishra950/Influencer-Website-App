import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { connectSocket, disconnectSocket, SOCKET_EVENTS, type AppNotification, type NotificationEvent } from '@/lib/socket';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationContextValue {
  notifications: AppNotification[];
  unread: number;
  connected: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await api.get<{ data: AppNotification[]; meta: { unread: number } }>(
      '/api/notifications',
      { params: { limit: 30 } },
    );
    setNotifications(data.data);
    setUnread(data.meta.unread);
  }, []);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setNotifications([]);
      setUnread(0);
      setConnected(false);
      return;
    }

    // Load the stored inbox first: the socket only carries what happens from now on,
    // so anything that arrived while this admin was away comes from the API.
    void refresh().catch(() => undefined);

    const socket = connectSocket();
    if (!socket) return;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (event: NotificationEvent) => {
      setNotifications((current) => [event.notification, ...current].slice(0, 50));
      setUnread(event.unread);
      notify(event.notification.title, 'info');
      // The list and the dashboard counters are now stale.
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    // Another admin acted; refetch rather than trying to patch our cache by hand.
    socket.on(SOCKET_EVENTS.INFLUENCER_CHANGED, () => {
      void queryClient.invalidateQueries({ queryKey: ['influencers'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    // The review queue is shared, so one admin approving has to update the others.
    socket.on(SOCKET_EVENTS.PACKAGE_CHANGED, () => {
      void queryClient.invalidateQueries({ queryKey: ['packages'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    // The website's enquiry form writes straight into this inbox, and it is shared
    // between admins, so both sources land here.
    socket.on(SOCKET_EVENTS.ENQUIRY_CHANGED, () => {
      void queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    return () => {
      socket.off(SOCKET_EVENTS.NOTIFICATION_NEW);
      socket.off(SOCKET_EVENTS.INFLUENCER_CHANGED);
      socket.off(SOCKET_EVENTS.PACKAGE_CHANGED);
      socket.off(SOCKET_EVENTS.ENQUIRY_CHANGED);
      disconnectSocket();
      setConnected(false);
    };
  }, [user, refresh, notify, queryClient]);

  const markRead = useCallback(async (id: string) => {
    // Optimistic: the badge should drop the instant it is clicked.
    setNotifications((current) => current.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnread((current) => Math.max(0, current - 1));
    const { data } = await api.patch<{ data: { unread: number } }>(`/api/notifications/${id}/read`);
    setUnread(data.data.unread);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api.patch('/api/notifications/read-all');
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnread(0);
    await api.delete('/api/notifications');
  }, []);

  const value = useMemo(
    () => ({ notifications, unread, connected, markRead, markAllRead, clearAll, refresh }),
    [notifications, unread, connected, markRead, markAllRead, clearAll, refresh],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return context;
}
