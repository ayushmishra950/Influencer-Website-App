/** Wire contract shared by the server, the admin dashboard and the app. */

export const SOCKET_EVENTS = {
  /** server -> client: a new notification for this recipient */
  NOTIFICATION_NEW: 'notification:new',
  /** server -> client: authoritative unread count (after reads, or on connect) */
  NOTIFICATION_COUNT: 'notification:count',
  /** server -> client: this session is no longer valid, log out now */
  SESSION_REVOKED: 'session:revoked',
  /** server -> admins: the influencer list changed, refetch it */
  INFLUENCER_CHANGED: 'influencer:changed',
  /**
   * server -> the influencer AND admins: a package was submitted, edited or reviewed.
   * Both sides hold a list of packages, and either side can change it.
   */
  PACKAGE_CHANGED: 'package:changed',
} as const;

/** Why a session was ended, so the login screen can explain it. */
export const REVOKE_REASONS = {
  ARCHIVED: 'archived',
  DELETED: 'deleted',
  REJECTED: 'rejected',
} as const;

export type RevokeReason = (typeof REVOKE_REASONS)[keyof typeof REVOKE_REASONS];

export const REVOKE_MESSAGE: Record<RevokeReason, string> = {
  archived: 'Your account has been archived by an administrator, so you have been signed out. Contact support if you think this is a mistake.',
  deleted: 'Your account has been removed by an administrator. Contact support if you think this is a mistake.',
  rejected: 'Your profile was not approved, so you have been signed out. Contact support for details.',
};

export interface SessionRevokedPayload {
  reason: RevokeReason;
  message: string;
}

/** Room names. Keeping them in one place stops the server and its callers drifting apart. */
export const ROOMS = {
  admins: 'admins',
  user: (userId: string) => `user:${userId}`,
} as const;
