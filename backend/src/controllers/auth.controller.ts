import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
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
export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});
