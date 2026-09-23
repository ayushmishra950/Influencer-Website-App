import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

/** Mirrors backend/src/realtime/events.ts. */
export const SOCKET_EVENTS = {
  NOTIFICATION_NEW: 'notification:new',
  SESSION_REVOKED: 'session:revoked',
  /** A package of this influencer's was submitted, edited, reviewed or deleted. */
  PACKAGE_CHANGED: 'package:changed',
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

export type RevokeReason = 'archived' | 'deleted' | 'rejected';

export interface SessionRevokedPayload {
  reason: RevokeReason;
  message: string;
}

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  socket?.close();

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    // Phones lose connectivity constantly; keep retrying with a capped backoff
    // rather than giving up and leaving the badge silently stale.
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.close();
  socket = null;
}

export const getSocket = (): Socket | null => socket;
