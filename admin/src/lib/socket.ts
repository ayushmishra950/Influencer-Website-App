import { io, type Socket } from 'socket.io-client';
import { tokenStore } from './api';

/** Mirrors backend/src/realtime/events.ts. */
export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_COUNT: 'notification:count',
  SESSION_REVOKED: 'session:revoked',
  INFLUENCER_CHANGED: 'influencer:changed',
  /** A package was submitted, edited, reviewed or deleted by anyone. */
  PACKAGE_CHANGED: 'package:changed',
  /** An enquiry arrived from the website, or an admin acted on one. */
  ENQUIRY_CHANGED: 'enquiry:changed',
} as const;

export interface AppNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  influencer: string | null;
  influencerName: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationEvent {
  notification: AppNotification;
  unread: number;
}

/**
 * In dev the browser talks to Vite, which proxies /socket.io through to the API
 * (see vite.config.ts). Using the page origin keeps it single-origin, so there is
 * no CORS and no hardcoded port in the client.
 */
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

let socket: Socket | null = null;

export function connectSocket(): Socket | null {
  const token = tokenStore.get();
  if (!token) return null;
  if (socket?.connected) return socket;

  socket?.close();
  socket = io(SOCKET_URL, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
}

export const getSocket = (): Socket | null => socket;
