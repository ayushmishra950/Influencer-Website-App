import type { FilterQuery, UpdateQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Influencer, type IInfluencer } from '../models/Influencer.js';
import { Package, type IPackage } from '../models/Package.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Enquiry } from '../models/Enquiry.js';
import { getQuery } from '../middleware/validate.js';
import { directorySort } from '../utils/sort.js';
import { CREATED_BY, ENQUIRY_STATUS, STATUS } from '../config/constants.js';
import { createInfluencerAccount } from '../utils/createInfluencerAccount.js';
import { notifyInfluencer, notifyPackageReviewed, revokeSession } from '../services/notifications.js';
import { notifyPackageChanged } from '../realtime/socket.js';
import { NOTIFICATION_TYPES, type NotificationType } from '../models/Notification.js';
import { REVOKE_REASONS } from '../realtime/events.js';
import type {
  AdminCreateInfluencerInput,
  AdminListQuery,
  AdminLocationsQuery,
  AdminPackageListQuery,
  AdminUpdateInfluencerInput,
  BulkInput,
} from '../utils/schemas.js';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Dashboard counters. One grouped pass instead of five separate counts. */
export const getStats = asyncHandler(async (_req, res) => {
  const [byStatus, archived, total, recent, pendingPackages, newEnquiries] = await Promise.all([
    Influencer.aggregate<{ _id: string; count: number }>([
      { $match: { isArchived: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Influencer.countDocuments({ isArchived: true }),
    Influencer.countDocuments({}),
    Influencer.find({ isArchived: false })
      .select('name email profileImage status location createdAt')
      .populate('category', 'name')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Package.countDocuments({ status: STATUS.PENDING }),
    Enquiry.countDocuments({ status: ENQUIRY_STATUS.NEW }),
  ]);

  const counts = Object.fromEntries(byStatus.map((row) => [row._id, row.count]));

  res.json({
    success: true,
    data: {
      total,
      pending: counts[STATUS.PENDING] ?? 0,
      approved: counts[STATUS.APPROVED] ?? 0,
      rejected: counts[STATUS.REJECTED] ?? 0,
      archived,
      recent,
      pendingPackages,
      newEnquiries,
    },
  });
});

/** Admin listing — sees every status, unlike the public directory. */
export const listInfluencers = asyncHandler(async (req, res) => {
  const query = getQuery<AdminListQuery>(req);
  const filter: FilterQuery<IInfluencer> = {};

  if (query.archived !== 'all') filter.isArchived = query.archived === 'true';
  if (query.status !== 'all') filter.status = query.status;
  if (query.category) filter.category = query.category;
  if (query.country) filter['location.country'] = query.country;
  if (query.state) filter['location.state'] = query.state;
  if (query.city) filter['location.city'] = query.city;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { 'location.city': rx }];
  }

  const skip = (query.page - 1) * query.limit;
  const sort = directorySort(query.sort);

  const [items, total] = await Promise.all([
    Influencer.find(filter)
      .populate('category', 'name slug icon')
      .populate('reviewedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Influencer.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + items.length < total,
    },
  });
});

/**
 * Location options for the filter bar.
 *
 * Scoped to the same status/archived window the page is showing, because the public
 * endpoint only knows about approved, non-archived records — using it here made it
 * impossible to filter the Archived or Review lists by their own locations.
 *
 * States and cities are returned whether or not a country is chosen, so each dropdown
 * is usable on its own; the API filters on them independently anyway.
 */
export const listLocations = asyncHandler(async (req, res) => {
  const query = getQuery<AdminLocationsQuery>(req);

  const base: FilterQuery<IInfluencer> = {};
  if (query.archived !== 'all') base.isArchived = query.archived === 'true';
  if (query.status !== 'all') base.status = query.status;

  const withCountry = query.country ? { ...base, 'location.country': query.country } : base;
  const withState = query.state ? { ...withCountry, 'location.state': query.state } : withCountry;

  const [countries, states, cities] = await Promise.all([
    Influencer.distinct('location.country', base),
    Influencer.distinct('location.state', withCountry),
    Influencer.distinct('location.city', withState),
  ]);

  res.json({
    success: true,
    data: {
      countries: countries.sort(),
      states: states.sort(),
      cities: cities.sort(),
    },
  });
});

export const getInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id)
    .populate('category', 'name slug icon')
    .populate('reviewedBy', 'name email')
    .lean();
  if (!influencer) throw ApiError.notFound('Influencer not found');
  res.json({ success: true, data: influencer });
});

/**
 * Admin-created influencer.
 * Defaults to `approved`: the admin creating the record *is* the verification step.
 * Pass an explicit `status` to override.
 */
export const createInfluencer = asyncHandler(async (req, res) => {
  const input = req.body as AdminCreateInfluencerInput;

  const profile = await createInfluencerAccount({
    ...input,
    status: input.status ?? STATUS.APPROVED,
    createdBy: CREATED_BY.ADMIN,
  });

  if (profile.status === STATUS.APPROVED) {
    profile.reviewedBy = req.user!._id;
    profile.reviewedAt = new Date();
    await profile.save();
  }

  await profile.populate('category', 'name slug icon');
  res.status(201).json({ success: true, message: 'Influencer created', data: profile });
});

export const updateInfluencer = asyncHandler(async (req, res) => {
  const input = req.body as AdminUpdateInfluencerInput;

  if (input.category) {
    const category = await Category.findById(input.category).lean();
    if (!category) throw ApiError.badRequest('Select a valid category');
  }
  if (input.email) {
    const clash = await Influencer.findOne({ email: input.email, _id: { $ne: req.params.id } }).lean();
    if (clash) throw ApiError.conflict('Another influencer already uses this email');
  }

  const influencer = await Influencer.findById(req.params.id);
  if (!influencer) throw ApiError.notFound('Influencer not found');

  influencer.set(input);
  if (input.status && input.status !== influencer.status) {
    influencer.reviewedBy = req.user!._id;
    influencer.reviewedAt = new Date();
  }
  await influencer.save();

  // Keep the login identity's name/email in step with the profile.
  if (influencer.user && (input.name || input.email)) {
    await User.updateOne(
      { _id: influencer.user },
      { ...(input.name ? { name: input.name } : {}), ...(input.email ? { email: input.email } : {}) },
    );
  }

  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_UPDATED,
    actor: req.user!._id,
  });
  // An edit that also flips the status can lock them out, so end the session as well.
  if (input.status === STATUS.REJECTED) revokeSession(influencer.user, REVOKE_REASONS.REJECTED);

  await influencer.populate('category', 'name slug icon');
  res.json({ success: true, message: 'Influencer updated', data: influencer });
});

/** Shared by approve / reject so both record who reviewed and when. */
async function setStatus(
  id: string,
  status: (typeof STATUS)[keyof typeof STATUS],
  adminId: IInfluencer['reviewedBy'],
  rejectionReason = '',
) {
  const influencer = await Influencer.findByIdAndUpdate(
    id,
    { status, rejectionReason, reviewedBy: adminId, reviewedAt: new Date() },
    { new: true, runValidators: true },
  ).populate('category', 'name slug icon');

  if (!influencer) throw ApiError.notFound('Influencer not found');
  return influencer;
}

export const approveInfluencer = asyncHandler(async (req, res) => {
  const influencer = await setStatus(req.params.id!, STATUS.APPROVED, req.user!._id);
  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_APPROVED,
    actor: req.user!._id,
  });
  res.json({ success: true, message: `${influencer.name} is now approved`, data: influencer });
});

export const rejectInfluencer = asyncHandler(async (req, res) => {
  const { reason } = req.body as { reason: string };
  const influencer = await setStatus(req.params.id!, STATUS.REJECTED, req.user!._id, reason);
  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_REJECTED,
    actor: req.user!._id,
    ...(reason ? { detail: `Reason: ${reason}` } : {}),
  });
  // A rejected influencer may no longer sign in, so an open session has to end too.
  revokeSession(influencer.user, REVOKE_REASONS.REJECTED);
  res.json({ success: true, message: `${influencer.name} was rejected`, data: influencer });
});

/** Archive: reversible. The record survives, it just leaves the active listing. */
export const archiveInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findByIdAndUpdate(
    req.params.id,
    { isArchived: true, archivedAt: new Date() },
    { new: true },
  );
  if (!influencer) throw ApiError.notFound('Influencer not found');

  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_ARCHIVED,
    actor: req.user!._id,
  });
  revokeSession(influencer.user, REVOKE_REASONS.ARCHIVED);

  res.json({ success: true, message: `${influencer.name} archived`, data: influencer });
});

export const restoreInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findByIdAndUpdate(
    req.params.id,
    { isArchived: false, archivedAt: null },
    { new: true },
  );
  if (!influencer) throw ApiError.notFound('Influencer not found');

  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_RESTORED,
    actor: req.user!._id,
  });

  res.json({ success: true, message: `${influencer.name} restored`, data: influencer });
});

/** Delete: permanent. Removes the profile and its login identity together. */
export const deleteInfluencer = asyncHandler(async (req, res) => {
  const influencer = await Influencer.findById(req.params.id);
  if (!influencer) throw ApiError.notFound('Influencer not found');

  // Notify and revoke while the user still exists — afterwards there is nobody to reach.
  await notifyInfluencer({
    userId: influencer.user,
    influencerId: influencer._id,
    influencerName: influencer.name,
    type: NOTIFICATION_TYPES.PROFILE_DELETED,
    actor: req.user!._id,
  });
  revokeSession(influencer.user, REVOKE_REASONS.DELETED);

  if (influencer.user) await User.deleteOne({ _id: influencer.user });
  await influencer.deleteOne();

  res.json({ success: true, message: `${influencer.name} deleted permanently` });
});

/**
 * Bulk operations.
 * `delete` additionally demands `confirm: true` — an accidental bulk delete is
 * unrecoverable, so the intent has to be stated on the wire, not just in the UI.
 */
export const bulkAction = asyncHandler(async (req, res) => {
  const { action, ids, confirm, reason } = req.body as BulkInput;

  if (action === 'delete' && !confirm) {
    throw ApiError.badRequest(
      'Permanent deletion must be confirmed. Send confirm: true, or archive instead.',
    );
  }

  const selector = { _id: { $in: ids } };

  // Read the affected rows first: after a delete there is nobody left to notify, and
  // after an update the "before" state is gone.
  const targets = await Influencer.find(selector).select('user name').lean();

  if (action === 'delete') {
    await Promise.all(
      targets.map((target) =>
        notifyInfluencer({
          userId: target.user,
          influencerId: target._id,
          influencerName: target.name,
          type: NOTIFICATION_TYPES.PROFILE_DELETED,
          actor: req.user!._id,
        }),
      ),
    );
    for (const target of targets) revokeSession(target.user, REVOKE_REASONS.DELETED);

    const userIds = targets.map((t) => t.user).filter(Boolean);
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    const { deletedCount } = await Influencer.deleteMany(selector);
    res.json({ success: true, message: `${deletedCount} influencer(s) deleted`, data: { affected: deletedCount } });
    return;
  }

  // `delete` returned above, so only the reversible actions remain.
  const reviewed = { reviewedBy: req.user!._id, reviewedAt: new Date() };
  const updates: Record<Exclude<BulkInput['action'], 'delete'>, UpdateQuery<IInfluencer>> = {
    approve: { status: STATUS.APPROVED, rejectionReason: '', ...reviewed },
    reject: { status: STATUS.REJECTED, rejectionReason: reason, ...reviewed },
    archive: { isArchived: true, archivedAt: new Date() },
    restore: { isArchived: false, archivedAt: null },
  };

  const { modifiedCount } = await Influencer.updateMany(selector, updates[action]);

  const NOTIFICATION_FOR: Record<Exclude<BulkInput['action'], 'delete'>, NotificationType> = {
    approve: NOTIFICATION_TYPES.PROFILE_APPROVED,
    reject: NOTIFICATION_TYPES.PROFILE_REJECTED,
    archive: NOTIFICATION_TYPES.PROFILE_ARCHIVED,
    restore: NOTIFICATION_TYPES.PROFILE_RESTORED,
  };

  await Promise.all(
    targets.map((target) =>
      notifyInfluencer({
        userId: target.user,
        influencerId: target._id,
        influencerName: target.name,
        type: NOTIFICATION_FOR[action],
        actor: req.user!._id,
        ...(action === 'reject' && reason ? { detail: `Reason: ${reason}` } : {}),
      }),
    ),
  );

  // Both of these leave the influencer unable to sign in.
  if (action === 'archive' || action === 'reject') {
    const revokeReason = action === 'archive' ? REVOKE_REASONS.ARCHIVED : REVOKE_REASONS.REJECTED;
    for (const target of targets) revokeSession(target.user, revokeReason);
  }

  res.json({
    success: true,
    message: `${modifiedCount} influencer(s) updated`,
    data: { affected: modifiedCount },
  });
});

/* ------------------------------------------------------------------ packages */

/** Package review queue. Defaults to pending, because that is the work. */
export const listPackages = asyncHandler(async (req, res) => {
  const query = getQuery<AdminPackageListQuery>(req);

  const filter: FilterQuery<IPackage> = {};
  if (query.status !== 'all') filter.status = query.status;

  // Searching by influencer means resolving names first — packages hold only a ref.
  if (query.q) {
    const rx = new RegExp(query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matches = await Influencer.find({ $or: [{ name: rx }, { email: rx }] })
      .select('_id')
      .lean();
    filter.$or = [{ title: rx }, { influencer: { $in: matches.map((m) => m._id) } }];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    Package.find(filter)
      .populate('influencer', 'name email profileImage status isArchived')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Package.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + items.length < total,
    },
  });
});

/** Shared by approve and reject so both record who reviewed and when. */
async function reviewPackage(
  id: string,
  approved: boolean,
  adminId: IPackage['reviewedBy'],
  reason = '',
) {
  const pkg = await Package.findById(id);
  if (!pkg) throw ApiError.notFound('Package not found');

  pkg.status = approved ? STATUS.APPROVED : STATUS.REJECTED;
  pkg.rejectionReason = approved ? '' : reason;
  pkg.reviewedBy = adminId;
  pkg.reviewedAt = new Date();
  if (approved && !pkg.firstApprovedAt) pkg.firstApprovedAt = new Date();
  await pkg.save();

  const influencer = await Influencer.findById(pkg.influencer).select('user name').lean();
  if (influencer) {
    await notifyPackageReviewed({
      userId: influencer.user,
      influencerId: influencer._id,
      influencerName: influencer.name,
      title: pkg.title,
      approved,
      actor: adminId,
      reason,
    });
  }

  await pkg.populate('influencer', 'name email profileImage');
  return pkg;
}

export const approvePackage = asyncHandler(async (req, res) => {
  const pkg = await reviewPackage(req.params.id!, true, req.user!._id);
  res.json({ success: true, message: `"${pkg.title}" is now live`, data: pkg });
});

export const rejectPackage = asyncHandler(async (req, res) => {
  const { reason } = req.body as { reason: string };
  const pkg = await reviewPackage(req.params.id!, false, req.user!._id, reason);
  res.json({ success: true, message: `"${pkg.title}" was rejected`, data: pkg });
});

export const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findByIdAndDelete(req.params.id);
  if (!pkg) throw ApiError.notFound('Package not found');

  // The owner's profile is now showing one package fewer, so refresh them too.
  const influencer = await Influencer.findById(pkg.influencer).select('user').lean();
  notifyPackageChanged(influencer?.user ? String(influencer.user) : null);

  res.json({ success: true, message: `"${pkg.title}" deleted` });
});
