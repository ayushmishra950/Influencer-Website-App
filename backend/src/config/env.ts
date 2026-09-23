import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 5050),
  /** Login/register attempts allowed per IP per 15 min. Raise it to re-run the e2e suite. */
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT ?? 20),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/aura'),
  jwtSecret: required('JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigins: (process.env.CLIENT_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  seedAdmin: {
    name: process.env.SEED_ADMIN_NAME ?? 'Platform Admin',
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@aura.dev',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345',
  },
} as const;

export const isProd = env.nodeEnv === 'production';
