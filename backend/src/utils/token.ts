import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../config/constants.js';

export interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(userId: string, role: Role): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: userId, role }, env.jwtSecret, options);
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.jwtSecret) as TokenPayload & { purpose?: string };
  // Reset tokens are signed with the same secret, so without this check one could be
  // presented as a Bearer token and would authenticate a full session.
  if (payload.purpose) throw new Error('Not a session token');
  return payload;
}

const RESET_PURPOSE = 'password-reset';

/**
 * Issued once the reset flow has confirmed an email, and required by the step that
 * actually sets the password. Short-lived, and carries no role: it can do one thing.
 */
export function signResetToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: RESET_PURPOSE }, env.jwtSecret, { expiresIn: '15m' });
}

export function verifyResetToken(token: string): { sub: string } {
  const payload = jwt.verify(token, env.jwtSecret) as { sub: string; purpose?: string };
  if (payload.purpose !== RESET_PURPOSE) throw new Error('Not a reset token');
  return { sub: payload.sub };
}
