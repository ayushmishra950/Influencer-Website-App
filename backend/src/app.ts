import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { env, isProd } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './routes/auth.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { influencerRouter } from './routes/influencer.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { notificationRouter } from './routes/notification.routes.js';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  // crossOriginResourcePolicy is relaxed so the Expo app and Vite admin can load /uploads.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  // Expo picks a different port whenever the default is busy, so pinning an exact
  // localhost list makes development fail in a way that looks like a dead server.
  // Any localhost origin is allowed in development; production stays on the allowlist.
  const isLocalhost = (origin: string) =>
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header: native apps, curl, server-to-server.
        if (!origin) return callback(null, true);
        if (!isProd && isLocalhost(origin)) return callback(null, true);
        if (!env.clientOrigins.length || env.clientOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
