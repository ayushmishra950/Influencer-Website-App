import type { RequestHandler } from 'express';
import { Influencer } from '../models/Influencer.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { LOGIN_BLOCKED_MESSAGE, STATUS } from '../config/constants.js';

/**
 * Re-checks the verification state on every influencer request.
 *
 * Login already gates on status, but a JWT issued before an admin archived or rejected
 * someone would otherwise keep working until it expired. The socket `session:revoked`
 * event handles a connected client instantly; this closes the same hole for a client
 * that was offline, force-quit, or simply ignoring the socket.
 */
export const requireActiveInfluencer: RequestHandler = asyncHandler(async (req, _res, next) => {
  const profile = await Influencer.findOne({ user: req.user!._id })
    .select('status isArchived')
    .lean();

  if (!profile) throw ApiError.notFound('Influencer profile not found');

  if (profile.isArchived) throw ApiError.forbidden(LOGIN_BLOCKED_MESSAGE.archived);
  if (profile.status !== STATUS.APPROVED) {
    throw ApiError.forbidden(LOGIN_BLOCKED_MESSAGE[profile.status] ?? 'Your account is not active');
  }

  next();
});
