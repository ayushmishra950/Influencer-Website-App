import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer, type Socket } from 'socket.io';
import { env } from '../config/env.js';
import { ROLES, type Role } from '../config/constants.js';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { ROOMS, SOCKET_EVENTS } from './events.js';

interface SocketUser {
  id: string;
  role: Role;
}

// Socket.IO has no typed `data` by default; this keeps the handshake result honest.
type AuthedSocket = Socket & { data: { user?: SocketUser } };

let io: SocketServer | null = null;

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.clientOrigins.length ? env.clientOrigins : true,
      credentials: true,
    },
    // Native clients drop off mobile networks constantly; give them room to come back.
    pingTimeout: 25_000,
    pingInterval: 20_000,
  });

  // The same JWT as the REST API. An unauthenticated socket is rejected outright,
  // so no room ever contains a connection we cannot attribute to a user.
  io.use(async (socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);

    if (!token) return next(new Error('Authentication token missing'));

    try {
      const payload = verifyToken(token);
      const user = await User.findById(payload.sub).select('_id role isActive').lean();
      if (!user || !user.isActive) return next(new Error('Account is no longer active'));

      (socket as AuthedSocket).data.user = { id: String(user._id), role: user.role };
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as AuthedSocket).data.user;
    if (!user) return socket.disconnect(true);

    // Every connection joins its own user room. Admins additionally share one room,
    // so a registration fans out to all of them without looking any of them up.
    void socket.join(ROOMS.user(user.id));
    if (user.role === ROLES.ADMIN) void socket.join(ROOMS.admins);

    socket.on('disconnect', () => {
      // Socket.IO leaves rooms automatically; nothing to clean up.
    });
  });

  console.log('[socket] realtime ready');
  return io;
}

/** Null before `initSocket` runs — scripts like the seeder import the models without a server. */
export const getIO = (): SocketServer | null => io;

/**
 * Open sockets keep the process alive, so a plain `server.close()` hangs until the
 * watcher force-kills it. Disconnecting clients first lets shutdown finish cleanly.
 */
export async function closeSocket(): Promise<void> {
  if (!io) return;
  await io.close();
  io = null;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(ROOMS.user(userId)).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown): void {
  io?.to(ROOMS.admins).emit(event, payload);
}

/** Tells every admin dashboard the influencer list is stale, so it refetches. */
export function notifyInfluencerChanged(): void {
  emitToAdmins(SOCKET_EVENTS.INFLUENCER_CHANGED, { at: new Date().toISOString() });
}

/**
 * Tells both sides a package list is stale.
 *
 * Admins always hear it — a queue is shared, so one admin approving must update the
 * others. The owning influencer hears it too when given, which is what makes an
 * approval show up on their profile without a pull-to-refresh.
 */
export function notifyPackageChanged(ownerUserId?: string | null): void {
  const payload = { at: new Date().toISOString() };
  emitToAdmins(SOCKET_EVENTS.PACKAGE_CHANGED, payload);
  if (ownerUserId) emitToUser(ownerUserId, SOCKET_EVENTS.PACKAGE_CHANGED, payload);
}
