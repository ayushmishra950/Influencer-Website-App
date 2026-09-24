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

/**
 * A campaign enquiry from the public site.
 *
 * `new` is what the form creates; the other two are the admin saying what they did
 * about it. Deliberately not reusing STATUS: an enquiry is not approved or rejected,
 * it is contacted or closed, and sharing the enum would blur two different workflows.
 */
export const ENQUIRY_STATUS = {
  NEW: 'new',
  CONTACTED: 'contacted',
  CLOSED: 'closed',
} as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUS)[keyof typeof ENQUIRY_STATUS];
export const ENQUIRY_STATUS_VALUES = Object.values(ENQUIRY_STATUS) as [
  EnquiryStatus,
  ...EnquiryStatus[],
];

/**
 * A booking for one of an influencer's packages, placed from the public site.
 *
 * Separate from STATUS and ENQUIRY_STATUS on purpose: an order is not reviewed by an
 * admin and not merely "contacted" -- the influencer accepts it, turns it down, or
 * finishes the work. Three different workflows, three different vocabularies.
 */
export const ORDER_STATUS = {
  NEW: 'new',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export const ORDER_STATUS_VALUES = Object.values(ORDER_STATUS) as [OrderStatus, ...OrderStatus[]];

/**
 * What an order may become next. Anything absent is refused, so the API cannot be
 * driven into states the UI never offers -- a completed job cannot quietly reopen.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [ORDER_STATUS.NEW]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.DECLINED],
  // Work can still fall through after it is taken on.
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.DECLINED],
  [ORDER_STATUS.DECLINED]: [],
  [ORDER_STATUS.COMPLETED]: [],
};
