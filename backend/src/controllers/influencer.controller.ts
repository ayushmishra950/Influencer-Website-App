import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Influencer } from '../models/Influencer.js';
import { Category } from '../models/Category.js';
import type { UpdateOwnProfileInput } from '../utils/schemas.js';

/** The signed-in influencer's own profile, including non-public fields. */
export const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await Influencer.findOne({ user: req.user!._id }).populate(
    'category',
    'name slug icon',
  );
  if (!profile) throw ApiError.notFound('Profile not found');
  res.json({ success: true, data: profile });
});

/**
 * Self-service profile edit.
 * The schema has no `status` field, so an influencer can never approve themselves.
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const input = req.body as UpdateOwnProfileInput;

  if (input.category) {
    const category = await Category.findById(input.category).lean();
    if (!category || !category.isActive) throw ApiError.badRequest('Select a valid category');
  }

  const profile = await Influencer.findOneAndUpdate({ user: req.user!._id }, input, {
    new: true,
    runValidators: true,
  }).populate('category', 'name slug icon');

  if (!profile) throw ApiError.notFound('Profile not found');
  res.json({ success: true, message: 'Profile updated', data: profile });
});

/** Returns the public URL of an uploaded image; the client then PUTs it as `profileImage`. */
export const uploadProfileImage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image was uploaded');
  const url = `/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, data: { url } });
});
