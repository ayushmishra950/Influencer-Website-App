import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signResetToken, signToken, verifyResetToken } from '../utils/token.js';
import { User } from '../models/User.js';
import { Influencer } from '../models/Influencer.js';
import { createInfluencerAccount } from '../utils/createInfluencerAccount.js';
import { CREATED_BY, LOGIN_BLOCKED_MESSAGE, ROLES, STATUS } from '../config/constants.js';
import { Category } from '../models/Category.js';
import { notifyAdminsOfRegistration } from '../services/notifications.js';
import type { LoginInput, RegisterInput } from '../utils/schemas.js';

/**
 * Influencer self-registration.
 * Creates the account but leaves it `pending` — registration is not activation.
 */
export const register = asyncHandler(async (req, res) => {
  const input = req.body as RegisterInput;

  const profile = await createInfluencerAccount({
    ...input,
    status: STATUS.PENDING,
    createdBy: CREATED_BY.SELF,
  });

  // Push to every admin's inbox. A failure here must not fail the registration —
  // the account exists either way, and the admin can still find it in the queue.
  try {
    const category = await Category.findById(profile.category).select('name').lean();
    await notifyAdminsOfRegistration({
      influencerId: profile._id,
      influencerName: profile.name,
      category: category?.name ?? 'an unlisted category',
      city: profile.location?.city ?? '',
    });
  } catch (err) {
    console.error('[notify] registration notification failed:', err);
  }

  res.status(201).json({
    success: true,
    message: 'Your registration has been submitted for verification.',
    data: { influencerId: profile._id, status: profile.status },
  });
});

/** Login for both roles. Influencers are gated on their approval status. */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body as LoginInput;

  const user = await User.findOne({ email }).select('+password');
  // Identical message either way, so this never confirms which emails exist.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated');

  let profile = null;
  if (user.role === ROLES.INFLUENCER) {
    profile = await Influencer.findOne({ user: user._id }).populate('category', 'name slug icon');
    if (!profile) throw ApiError.notFound('Influencer profile not found');

    if (profile.isArchived) throw ApiError.forbidden(LOGIN_BLOCKED_MESSAGE.archived);
    if (profile.status !== STATUS.APPROVED) {
      throw ApiError.forbidden(LOGIN_BLOCKED_MESSAGE[profile.status] ?? 'Login is not allowed yet');
    }
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      token: signToken(String(user._id), user.role),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      profile,
    },
  });
});

/** Current session — clients call this on boot to restore state. */
export const me = asyncHandler(async (req, res) => {
  const user = req.user!;
  const profile =
    user.role === ROLES.INFLUENCER
      ? await Influencer.findOne({ user: user._id }).populate('category', 'name slug icon')
      : null;

  res.json({
    success: true,
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      profile,
    },
  });
});

/** Stateless JWT: the client discards the token. Present for a symmetric API surface. */
/**
 * Sets the signed-in account's own password. The model hashes on save, so the plain
 * value is assigned and never stored as given.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!._id).select('+password');
  if (!user) throw ApiError.unauthorized();

  user.password = req.body.password;
  await user.save();

  res.json({ success: true, message: 'Password updated' });
});

/**
 * Step one of the reset: confirms the address and hands back a short-lived token that
 * step two requires, so the password cannot be set without coming through here first.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !user.isActive) {
    throw ApiError.notFound('No account is registered with that email');
  }

  res.json({
    success: true,
    message: 'Account found',
    data: { token: signResetToken(String(user._id)), email: user.email },
  });
});

/** Step two: spends the token from step one and sets the new password. */
export const resetPassword = asyncHandler(async (req, res) => {
  let payload;
  try {
    payload = verifyResetToken(req.body.token);
  } catch {
    throw ApiError.unauthorized('This reset expired. Please start again.');
  }

  const user = await User.findById(payload.sub).select('+password');
  if (!user || !user.isActive) throw ApiError.notFound('Account not found');

  user.password = req.body.password;
  await user.save();

  res.json({ success: true, message: 'Password updated. Please sign in.' });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});
