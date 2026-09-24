import type { Types } from 'mongoose';
import { Notification, NOTIFICATION_TYPES, type NotificationType } from '../models/Notification.js';
import { User } from '../models/User.js';
import { ROLES } from '../config/constants.js';
import {
  emitToUser,
  notifyEnquiryChanged,
  notifyOrderChanged,
  notifyInfluencerChanged,
  notifyPackageChanged,
} from '../realtime/socket.js';
import {
  REVOKE_MESSAGE,
  SOCKET_EVENTS,
  type RevokeReason,
} from '../realtime/events.js';

interface NotifyInput {
  recipient: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  body: string;
  influencer?: Types.ObjectId | string | null;
  influencerName?: string;
  actor?: Types.ObjectId | string | null;
}

/** Persists one notification and pushes it to that recipient if they are connected. */
async function create(input: NotifyInput): Promise<void> {
  const doc = await Notification.create({
    recipient: input.recipient,
    type: input.type,
    title: input.title,
    body: input.body,
    influencer: input.influencer ?? null,
    influencerName: input.influencerName ?? '',
    actor: input.actor ?? null,
  });

  const unread = await Notification.countDocuments({ recipient: input.recipient, read: false });

  emitToUser(String(input.recipient), SOCKET_EVENTS.NOTIFICATION_NEW, {
    notification: doc.toJSON(),
    unread,
  });
}

/**
 * A registration concerns every admin, so each gets their own row — unread state is
 * per person, and one admin reading it must not clear it for the others.
 */
export async function notifyAdminsOfRegistration(params: {
  influencerId: Types.ObjectId | string;
  influencerName: string;
  category: string;
  city: string;
  /** Whether they left a question with it, so the bell says it is worth opening. */
  hasMessage?: boolean;
}): Promise<void> {
  const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id').lean();

  await Promise.all(
    admins.map((admin) =>
      create({
        recipient: admin._id,
        type: NOTIFICATION_TYPES.INFLUENCER_REGISTERED,
        title: params.hasMessage ? 'New registration, with a message' : 'New influencer registration',
        body: `${params.influencerName} registered in ${params.category}${params.city ? ` from ${params.city}` : ''} and is waiting for review.${params.hasMessage ? ' They left a message for the team.' : ''}`,
        influencer: params.influencerId,
        influencerName: params.influencerName,
      }),
    ),
  );

  notifyInfluencerChanged();
}

/**
 * A campaign enquiry concerns every admin, so each gets their own row -- the same way a
 * registration does. The stored notification is what makes it survive being offline;
 * the socket event is what updates an inbox that is already open.
 */
export async function notifyAdminsOfEnquiry(params: {
  name: string;
  company: string;
  budget: string;
}): Promise<void> {
  const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id').lean();

  await Promise.all(
    admins.map((admin) =>
      create({
        recipient: admin._id,
        type: NOTIFICATION_TYPES.ENQUIRY_RECEIVED,
        title: 'New campaign enquiry',
        body: `${params.name} from ${params.company} asked for a creator shortlist${params.budget ? ` (${params.budget})` : ''}.`,
      }),
    ),
  );

  notifyEnquiryChanged();
}

/**
 * An order concerns exactly one person, so unlike a registration this fans out to
 * nobody else. The stored notification is what survives them being offline -- the
 * socket event is what updates a panel that is already open, and the mobile app picks
 * the same notification up through its own bell.
 */
export async function notifyInfluencerOfOrder(params: {
  userId: Types.ObjectId | string;
  influencerId: Types.ObjectId | string;
  influencerName: string;
  buyerName: string;
  buyerCompany: string;
  packageTitle: string;
  price: number;
  currency: string;
}): Promise<void> {
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: params.currency || 'INR',
    maximumFractionDigits: 0,
  }).format(params.price);

  const from = params.buyerCompany || params.buyerName;

  await create({
    recipient: params.userId,
    type: NOTIFICATION_TYPES.ORDER_RECEIVED,
    title: 'New order',
    body: `${from} wants to book "${params.packageTitle}" for ${amount}.`,
    influencer: params.influencerId,
    influencerName: params.influencerName,
  });

  notifyOrderChanged(String(params.userId));
}

const INFLUENCER_MESSAGES: Record<string, { title: string; body: (name: string) => string }> = {
  [NOTIFICATION_TYPES.PROFILE_APPROVED]: {
    title: 'Your profile is approved',
    body: () => 'You are now live in the Aura directory and can sign in.',
  },
  [NOTIFICATION_TYPES.PROFILE_REJECTED]: {
    title: 'Your profile was not approved',
    body: () => 'An administrator reviewed your registration and did not approve it.',
  },
  [NOTIFICATION_TYPES.PROFILE_UPDATED]: {
    title: 'Your profile was updated',
    body: () => 'An administrator made changes to your profile details.',
  },
  [NOTIFICATION_TYPES.PROFILE_ARCHIVED]: {
    title: 'Your account was archived',
    body: () => 'Your profile has been removed from the directory and you have been signed out.',
  },
  [NOTIFICATION_TYPES.PROFILE_RESTORED]: {
    title: 'Your account was restored',
    body: () => 'Your profile is active again. You can sign in as usual.',
  },
  [NOTIFICATION_TYPES.PROFILE_DELETED]: {
    title: 'Your account was removed',
    body: () => 'An administrator permanently removed your account.',
  },
};

/** A submitted package needs every admin to see it, same as a registration. */
export async function notifyAdminsOfPackage(params: {
  influencerId: Types.ObjectId | string;
  influencerName: string;
  packageId: Types.ObjectId | string;
  title: string;
  price: number;
  currency: string;
  isEdit: boolean;
  ownerUserId?: Types.ObjectId | string | null;
}): Promise<void> {
  const admins = await User.find({ role: ROLES.ADMIN, isActive: true }).select('_id').lean();
  const amount = `${params.currency} ${params.price.toLocaleString('en-IN')}`;

  await Promise.all(
    admins.map((admin) =>
      create({
        recipient: admin._id,
        type: NOTIFICATION_TYPES.PACKAGE_SUBMITTED,
        title: params.isEdit ? 'Package edited' : 'New package submitted',
        body: `${params.influencerName} ${params.isEdit ? 'updated' : 'submitted'} "${params.title}" at ${amount} and is waiting for review.`,
        influencer: params.influencerId,
        influencerName: params.influencerName,
      }),
    ),
  );

  notifyPackageChanged(params.ownerUserId ? String(params.ownerUserId) : null);
}

/** Tells an influencer the outcome of a package review. */
export async function notifyPackageReviewed(params: {
  userId: Types.ObjectId | string | null;
  influencerId: Types.ObjectId | string;
  influencerName: string;
  title: string;
  approved: boolean;
  actor?: Types.ObjectId | string | null;
  reason?: string;
}): Promise<void> {
  // Admins share the queue, so they are refreshed whether or not there is an
  // influencer account to message — a directory-only listing has no user.
  notifyPackageChanged(params.userId ? String(params.userId) : null);
  if (!params.userId) return;

  await create({
    recipient: params.userId,
    type: params.approved
      ? NOTIFICATION_TYPES.PACKAGE_APPROVED
      : NOTIFICATION_TYPES.PACKAGE_REJECTED,
    title: params.approved ? 'Package approved' : 'Package not approved',
    body: params.approved
      ? `"${params.title}" is now visible on your public profile.`
      : `"${params.title}" was not approved.${params.reason ? ` Reason: ${params.reason}` : ''}`,
    influencer: params.influencerId,
    influencerName: params.influencerName,
    actor: params.actor ?? null,
  });
}

/**
 * Tells an influencer what an admin just did to their record.
 * Silently does nothing for a directory-only listing, which has no user to notify.
 */
export async function notifyInfluencer(params: {
  userId: Types.ObjectId | string | null;
  influencerId: Types.ObjectId | string;
  influencerName: string;
  type: NotificationType;
  actor?: Types.ObjectId | string | null;
  detail?: string;
}): Promise<void> {
  notifyInfluencerChanged();
  if (!params.userId) return;

  const template = INFLUENCER_MESSAGES[params.type];
  if (!template) return;

  await create({
    recipient: params.userId,
    type: params.type,
    title: template.title,
    body: params.detail ? `${template.body(params.influencerName)} ${params.detail}` : template.body(params.influencerName),
    influencer: params.influencerId,
    influencerName: params.influencerName,
    actor: params.actor ?? null,
  });
}

/**
 * Ends a signed-in influencer's session immediately, with the reason to display.
 *
 * This is the instant path only. The API also refuses archived influencers on every
 * request (see `requireActiveInfluencer`), because a client that was offline when this
 * fired would otherwise keep a working token.
 */
export function revokeSession(userId: Types.ObjectId | string | null, reason: RevokeReason): void {
  if (!userId) return;
  emitToUser(String(userId), SOCKET_EVENTS.SESSION_REVOKED, {
    reason,
    message: REVOKE_MESSAGE[reason],
  });
}
