import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Influencer } from '../models/Influencer.js';
import { MAX_PACKAGES_PER_INFLUENCER, Package } from '../models/Package.js';
import { STATUS } from '../config/constants.js';
import { notifyAdminsOfPackage } from '../services/notifications.js';
import type { PackageInput } from '../utils/schemas.js';

/** The signed-in influencer's own packages, whatever their status. */
export const listMyPackages = asyncHandler(async (req, res) => {
  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id').lean();
  if (!profile) throw ApiError.notFound('Profile not found');

  const packages = await Package.find({ influencer: profile._id }).sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    data: packages,
    meta: { total: packages.length, limit: MAX_PACKAGES_PER_INFLUENCER },
  });
});

export const createMyPackage = asyncHandler(async (req, res) => {
  const input = req.body as PackageInput;

  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id name user').lean();
  if (!profile) throw ApiError.notFound('Profile not found');

  const count = await Package.countDocuments({ influencer: profile._id });
  if (count >= MAX_PACKAGES_PER_INFLUENCER) {
    throw ApiError.badRequest(
      `You can offer up to ${MAX_PACKAGES_PER_INFLUENCER} packages. Remove one before adding another.`,
    );
  }

  // Always pending: submitting is not publishing, exactly like registration.
  const created = await Package.create({ ...input, influencer: profile._id, status: STATUS.PENDING });

  try {
    await notifyAdminsOfPackage({
      influencerId: profile._id,
      influencerName: profile.name,
      packageId: created._id,
      title: created.title,
      price: created.price,
      currency: created.currency,
      isEdit: false,
      ownerUserId: profile.user,
    });
  } catch (err) {
    // The package exists either way; an admin can still find it in the queue.
    console.error('[notify] package submission notification failed:', err);
  }

  res.status(201).json({
    success: true,
    message: 'Package submitted for review.',
    data: created,
  });
});

/**
 * Editing sends a package back to `pending`, so an approved one leaves the public
 * profile until it is reviewed again. That is the point: a price nobody checked
 * should not appear under a verified badge.
 */
export const updateMyPackage = asyncHandler(async (req, res) => {
  const input = req.body as PackageInput;

  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id name user').lean();
  if (!profile) throw ApiError.notFound('Profile not found');

  // Scoped to the owner, so another influencer's id simply does not match.
  const pkg = await Package.findOne({ _id: req.params.id, influencer: profile._id });
  if (!pkg) throw ApiError.notFound('Package not found');

  pkg.set({
    ...input,
    status: STATUS.PENDING,
    rejectionReason: '',
    reviewedBy: null,
    reviewedAt: null,
  });
  await pkg.save();

  try {
    await notifyAdminsOfPackage({
      influencerId: profile._id,
      influencerName: profile.name,
      packageId: pkg._id,
      title: pkg.title,
      price: pkg.price,
      currency: pkg.currency,
      isEdit: true,
      ownerUserId: profile.user,
    });
  } catch (err) {
    console.error('[notify] package edit notification failed:', err);
  }

  res.json({
    success: true,
    message: 'Package updated and sent for review.',
    data: pkg,
  });
});

export const deleteMyPackage = asyncHandler(async (req, res) => {
  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id').lean();
  if (!profile) throw ApiError.notFound('Profile not found');

  const pkg = await Package.findOneAndDelete({ _id: req.params.id, influencer: profile._id });
  if (!pkg) throw ApiError.notFound('Package not found');

  res.json({ success: true, message: 'Package removed' });
});

/** Approved packages for a public profile. */
export const listPublicPackages = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findOne({
    _id: req.params.id,
    ...Influencer.publicFilter(),
  })
    .select('_id')
    .lean();
  if (!influencer) throw ApiError.notFound('Influencer not found');

  const packages = await Package.find({ influencer: influencer._id, ...Package.publicFilter() })
    .select('title description price currency deliveryDays firstApprovedAt')
    .sort({ price: 1 })
    .lean();

  res.json({ success: true, data: packages });
});
