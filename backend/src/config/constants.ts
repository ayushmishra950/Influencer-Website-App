export const ROLES = {
  ADMIN: 'admin',
  INFLUENCER: 'influencer',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_VALUES = Object.values(ROLES) as Role[];

export const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type Status = (typeof STATUS)[keyof typeof STATUS];
export const STATUS_VALUES = Object.values(STATUS) as [Status, ...Status[]];

export const CREATED_BY = {
  SELF: 'self',
  ADMIN: 'admin',
} as const;
export type CreatedBy = (typeof CREATED_BY)[keyof typeof CREATED_BY];
export const CREATED_BY_VALUES = Object.values(CREATED_BY) as CreatedBy[];

/** Messages shown to an influencer who is not allowed to log in yet. */
export const LOGIN_BLOCKED_MESSAGE: Record<string, string> = {
  [STATUS.PENDING]: 'Your registration is under review. We will notify you once it is approved.',
  [STATUS.REJECTED]: 'Your influencer registration was not approved. Please contact support.',
  archived: 'Your account has been archived. Please contact support to restore access.',
};
