import mongoose, { Schema, type Model, type Types } from 'mongoose';

/**
 * Notifications are stored, not just emitted.
 *
 * A socket only reaches a client that is connected right now. The unread count has to
 * survive a reload, a reconnect and an app that was closed when the event fired, so the
 * database is the source of truth and the socket is only the instant-delivery path.
 */
export const NOTIFICATION_TYPES = {
  // -> admins
  INFLUENCER_REGISTERED: 'influencer.registered',
  // -> the influencer
  PROFILE_APPROVED: 'profile.approved',
  PROFILE_REJECTED: 'profile.rejected',
  PROFILE_UPDATED: 'profile.updated',
  PROFILE_ARCHIVED: 'profile.archived',
  PROFILE_RESTORED: 'profile.restored',
  PROFILE_DELETED: 'profile.deleted',
  // packages
  PACKAGE_SUBMITTED: 'package.submitted',
  PACKAGE_APPROVED: 'package.approved',
  PACKAGE_REJECTED: 'package.rejected',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES) as NotificationType[];

export interface INotification {
  _id: Types.ObjectId;
  /** Who should see this. */
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  /** Lets the admin UI jump straight to the influencer this is about. */
  influencer: Types.ObjectId | null;
  /** Kept as a plain string: the influencer may be deleted by the time this is read. */
  influencerName: string;
  actor: Types.ObjectId | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 400 },
    influencer: { type: Schema.Types.ObjectId, ref: 'Influencer', default: null },
    influencerName: { type: String, default: '', trim: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The inbox query is always "mine, newest first"; the badge is "mine and unread".
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

// Keep the collection from growing without bound — 60 days is plenty for an audit trail.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

notificationSchema.set('toJSON', {
  transform(_doc, ret) {
    const plain = ret as Partial<Record<keyof INotification | '__v', unknown>>;
    delete plain.__v;
    return plain;
  },
});

export const Notification: Model<INotification> = mongoose.model<INotification>(
  'Notification',
  notificationSchema,
);
