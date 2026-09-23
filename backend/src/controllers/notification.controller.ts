import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Notification } from '../models/Notification.js';
import { getQuery } from '../middleware/validate.js';
import type { NotificationListQuery } from '../utils/schemas.js';

/** The signed-in user's inbox, newest first, with the authoritative unread count. */
export const listNotifications = asyncHandler(async (req, res) => {
  const query = getQuery<NotificationListQuery>(req);
  const recipient = req.user!._id;

  const filter = query.unreadOnly === 'true' ? { recipient, read: false } : { recipient };
  const skip = (query.page - 1) * query.limit;

  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient, read: false }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      unread,
      hasMore: skip + items.length < total,
    },
  });
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unread = await Notification.countDocuments({ recipient: req.user!._id, read: false });
  res.json({ success: true, data: { unread } });
});

export const markRead = asyncHandler(async (req, res) => {
  // Scoped to the caller, so an id from someone else's inbox simply does not match.
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user!._id },
    { read: true, readAt: new Date() },
    { new: true },
  );
  if (!notification) throw ApiError.notFound('Notification not found');

  const unread = await Notification.countDocuments({ recipient: req.user!._id, read: false });
  res.json({ success: true, data: { notification, unread } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user!._id, read: false },
    { read: true, readAt: new Date() },
  );
  res.json({ success: true, message: 'All notifications marked as read', data: { unread: 0 } });
});

export const clearAll = asyncHandler(async (req, res) => {
  const { deletedCount } = await Notification.deleteMany({ recipient: req.user!._id });
  res.json({ success: true, message: `${deletedCount} notification(s) cleared`, data: { unread: 0 } });
});
