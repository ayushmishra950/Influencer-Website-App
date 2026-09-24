import type { IncomingHttpHeaders } from 'node:http';
import { env, isProd } from './env.js';

/**
 * One decision, used by both the REST API and the Socket.IO handshake.
 *
 * They were separate before, and the socket half had no same-origin allowance -- so on
 * a host where CLIENT_ORIGINS does not happen to list the server's own address, the
 * admin panel could load over HTTP and then be refused its own live connection.
 */
export function isOriginAllowed(origin: string | undefined, self: string): boolean {
  // No Origin header: native apps, curl, server-to-server.
  if (!origin) return true;

  // The panel this server hosts is same-origin, but browsers still send an Origin for
  // its `crossorigin` bundle tags and for every WebSocket handshake. Without this the
  // server can refuse to serve its own assets, or its own socket.
  if (origin === self) return true;

  // Expo picks a different port whenever the default is busy, so pinning an exact
  // localhost list makes development fail in a way that looks like a dead server.
  // Any localhost origin is allowed in development; production stays on the allowlist.
  const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);
  if (!isProd && isLocalhost) return true;

  return !env.clientOrigins.length || env.clientOrigins.includes(origin);
}

/**
 * The origin this request arrived on.
 *
 * Typed by what it reads rather than by `IncomingMessage`, because the CORS delegate is
 * handed a minimal `{ method, headers }` shape, not a full Node request.
 * Express has `req.protocol`, which honours `trust proxy`; the Socket.IO handshake does
 * not, so the forwarded header is read directly -- Render and every other proxy in
 * front of this sets it, and without it every https origin would be compared as http.
 */
export function selfOrigin(req: { headers: IncomingHttpHeaders }): string {
  const forwarded = req.headers['x-forwarded-proto'];
  const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return `${proto || 'http'}://${req.headers.host ?? ''}`;
}
