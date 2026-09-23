import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { env, isProd } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { influencerRouter } from './routes/influencer.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notificationRouter } from './routes/notification.routes.js';

/**
 * The admin's built index.html carries one inline script: the theme is applied before
 * first paint so the panel never flashes the wrong one. Helmet's default CSP blocks
 * inline scripts outright, so each is allowed back by hash -- the policy stays strict,
 * and reading the hash off the file keeps it from rotting the way a pinned constant
 * would the next time that script is edited.
 */
function inlineScriptHashes(indexFile: string): string[] {
  if (!fs.existsSync(indexFile)) return [];
  const html = fs.readFileSync(indexFile, 'utf8');
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1] ?? '', 'utf8').digest('base64')}'`,
  );
}

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  const adminDir = path.resolve('public');
  const adminIndex = path.join(adminDir, 'index.html');

  // crossOriginResourcePolicy is relaxed so the Expo app and Vite admin can load /uploads.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Google Fonts serves the stylesheet from one host and the files from another.
          'style-src': ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
          'script-src': ["'self'", ...inlineScriptHashes(adminIndex)],
          // 'self' covers the normal case, where the admin bundle calls this same
          // origin. A bundle built with an absolute VITE_API_BASE_URL only matches
          // 'self' while it happens to be served from that exact host, so the
          // allowlist is extended with CLIENT_ORIGINS for the times it is not.
          'connect-src': ["'self'", ...env.clientOrigins],
        },
      },
    }),
  );

  // Expo picks a different port whenever the default is busy, so pinning an exact
  // localhost list makes development fail in a way that looks like a dead server.
  // Any localhost origin is allowed in development; production stays on the allowlist.
  const isLocalhost = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

  app.use(
    cors((req, callback) => {
      const origin = req.headers.origin;

      // No Origin header: native apps, curl, server-to-server.
      if (!origin) return callback(null, { origin: true, credentials: true });

      // The panel this server hosts is same-origin, but Vite marks its bundle tags
      // `crossorigin`, so the browser sends an Origin header for them anyway. Without
      // this the server can refuse to serve its own assets whenever CLIENT_ORIGINS is
      // set and happens not to list the host it is reachable on.
      const self = `${req.protocol}://${req.get('host')}`;
      if (origin === self) return callback(null, { origin: true, credentials: true });

      if (!isProd && isLocalhost(origin)) {
        return callback(null, { origin: true, credentials: true });
      }
      if (!env.clientOrigins.length || env.clientOrigins.includes(origin)) {
        return callback(null, { origin: true, credentials: true });
      }

      // Answer without the CORS headers rather than throwing. Throwing turned every
      // request from an unlisted origin into a 500 -- including stylesheets and
      // scripts, which then never load at all. Omitting the headers is what CORS
      // actually asks for: the browser blocks the read itself. Safe here because
      // authentication rides on the Authorization header, not on cookies, so another
      // site's page cannot make an authenticated request in the first place.
      callback(null, { origin: false, credentials: false });
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use(rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

  app.use('/uploads', express.static(path.resolve('uploads'), { maxAge: '7d' }));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, service: 'aura-api', env: env.nodeEnv, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/public', publicRouter);
  app.use('/api/influencer', influencerRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/notifications', notificationRouter);

  // --- Admin panel ------------------------------------------------------------
  //
  // One origin serves both halves: /api is the API, everything else is the admin
  // single-page app. (/uploads is mounted above, and Socket.IO attaches straight to
  // the HTTP server, so /socket.io never reaches Express at all.)
  //
  // Order matters twice over. This sits *after* the API routes so it can never
  // shadow them, and /api gets its own 404 first -- an unknown API path has to
  // answer with JSON, because handing back the SPA shell would turn a typo in a
  // fetch into a 200 full of HTML.
  app.use('/api', notFoundHandler);

  if (fs.existsSync(adminIndex)) {
    // Vite fingerprints everything under /assets, so those can be cached hard.
    app.use('/assets', express.static(path.join(adminDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
    }));

    // Everything else in the build (favicon and friends) is served by name, but
    // never cached: index.html especially, since a stale shell points at asset
    // hashes that the next deploy deletes.
    app.use(express.static(adminDir, { index: false, etag: true, maxAge: 0 }));

    // The admin's routes (/influencers, /packages, ...) exist only in the browser,
    // so any remaining GET hands back the shell and lets React Router resolve it.
    // Other verbs fall through to the 404 below: there is nothing here to POST to.
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(adminIndex);
    });
  } else {
    console.warn('[api] no admin build in backend/public — run "npm run build:admin"');
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
