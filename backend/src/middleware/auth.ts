import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Role } from '../config/constants.js';

/** Populates `req.user` from a Bearer token. 401 when absent, invalid or expired. */
export const authenticate: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw ApiError.unauthorized('Authentication token missing');

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired. Please log in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw ApiError.unauthorized('Account is no longer active');

  req.user = user;
  next();
});

/**
 * Real server-side authorization. Hiding a button in the UI is not security —
 * every admin route passes through this.
 */
export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };
