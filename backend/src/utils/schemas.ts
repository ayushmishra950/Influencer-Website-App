import { z } from 'zod';
import { ENQUIRY_STATUS_VALUES, STATUS_VALUES } from '../config/constants.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const handle = z.string().trim().max(120).optional().default('');

export const socialSchema = z.object({
  instagram: handle,
  youtube: handle,
});

export const locationSchema = z.object({
  country: z.string().trim().min(2, 'Country is required').max(60),
  state: z.string().trim().min(1, 'State is required').max(60),
  city: z.string().trim().min(1, 'City is required').max(60),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  phone: z.string().trim().max(20).optional().default(''),
  bio: z.string().trim().max(600).optional().default(''),
  profileImage: z.string().trim().optional().default(''),
  social: socialSchema.optional().default({ instagram: '', youtube: '' }),
  category: objectId,
  location: locationSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// Shared by the signed-in change and the forgot-password reset: same rules, same
// mismatch message, so the two screens cannot drift apart.
const passwordFields = {
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  confirmPassword: z.string().min(1, 'Confirm your new password'),
};
const passwordsMatch = (d: { password: string; confirmPassword: string }) =>
  d.password === d.confirmPassword;
const mismatch = { message: 'Passwords do not match', path: ['confirmPassword'] };

export const changePasswordSchema = z.object(passwordFields).refine(passwordsMatch, mismatch);

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

export const resetPasswordSchema = z
  .object({ token: z.string().min(1, 'Start the reset again'), ...passwordFields })
  .refine(passwordsMatch, mismatch);

/** What an influencer may change about themselves. `status` is deliberately absent. */
export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  bio: z.string().trim().max(600).optional(),
  profileImage: z.string().trim().optional(),
  social: socialSchema.optional(),
  category: objectId.optional(),
  location: locationSchema.optional(),
});

export const adminCreateInfluencerSchema = registerSchema.extend({
  password: z.string().min(8).max(72).optional(),
  status: z.enum(STATUS_VALUES).optional(),
});

export const adminUpdateInfluencerSchema = updateOwnProfileSchema.extend({
  email: z.string().trim().toLowerCase().email().optional(),
  status: z.enum(STATUS_VALUES).optional(),
  rejectionReason: z.string().trim().max(300).optional(),
});

export const rejectSchema = z.object({
  reason: z.string().trim().max(300).optional().default(''),
});

export const bulkSchema = z.object({
  action: z.enum(['approve', 'reject', 'archive', 'restore', 'delete']),
  ids: z.array(objectId).min(1, 'Select at least one influencer').max(200),
  /** Safeguard: permanent deletion must be confirmed explicitly by the caller. */
  confirm: z.boolean().optional().default(false),
  reason: z.string().trim().max(300).optional().default(''),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  icon: z.string().trim().max(40).optional(),
  isActive: z.boolean().optional(),
});

export const idParamSchema = z.object({ id: objectId });

const pagination = {
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
};

export const publicListQuerySchema = z.object({
  ...pagination,
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().optional(),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  sort: z.enum(['recent', 'name']).optional().default('recent'),
});

export const adminListQuerySchema = publicListQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
  status: z.enum([...STATUS_VALUES, 'all']).optional().default('all'),
  archived: z.enum(['true', 'false', 'all']).optional().default('false'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;
export type AdminCreateInfluencerInput = z.infer<typeof adminCreateInfluencerSchema>;
export type AdminUpdateInfluencerInput = z.infer<typeof adminUpdateInfluencerSchema>;
export type BulkInput = z.infer<typeof bulkSchema>;
export type PublicListQuery = z.infer<typeof publicListQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;

/** What an influencer may submit for a package. Status is deliberately absent. */
export const packageInputSchema = z.object({
  title: z.string().trim().min(2, 'Name the service you are offering').max(80),
  description: z.string().trim().max(400).optional().default(''),
  price: z.coerce
    .number({ invalid_type_error: 'Enter a price' })
    .int('Use a whole amount')
    .min(0, 'Price cannot be negative')
    .max(100_000_000),
  currency: z.string().trim().length(3).toUpperCase().optional().default('INR'),
  deliveryDays: z.coerce.number().int().min(0).max(365).optional().default(0),
});

export const adminPackageListQuerySchema = z.object({
  ...pagination,
  status: z.enum([...STATUS_VALUES, 'all']).optional().default('pending'),
  q: z.string().trim().max(120).optional(),
});

export type PackageInput = z.infer<typeof packageInputSchema>;
export type AdminPackageListQuery = z.infer<typeof adminPackageListQuerySchema>;

/**
 * Categories are master data, so the dropdowns that consume them ask for the whole
 * list; only the management page pages through it.
 */
export const categoryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(20),
});

export type CategoryListQuery = z.infer<typeof categoryListQuerySchema>;

/** Location options for the admin filter bar, scoped to the list being viewed. */
export const adminLocationsQuerySchema = z.object({
  status: z.enum([...STATUS_VALUES, 'all']).optional().default('all'),
  archived: z.enum(['true', 'false', 'all']).optional().default('false'),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
});

export type AdminLocationsQuery = z.infer<typeof adminLocationsQuerySchema>;

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unreadOnly: z.enum(['true', 'false']).optional().default('false'),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;

export type SortKey = PublicListQuery['sort'];

/**
 * A campaign enquiry from the public site.
 *
 * `who` and `budget` are the labels the form offered, kept as bounded strings rather
 * than an enum: the marketing copy on that page will change, and an enum here would
 * start rejecting real enquiries the day someone edits a label. Everything a person
 * typed is length-capped, and the model caps it again.
 */
export const enquiryInputSchema = z.object({
  who: z.string().trim().min(1, 'Tell us who you are').max(40),
  budget: z.string().trim().max(40).optional().default(''),
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid work email'),
  phone: z.string().trim().min(6, 'Enter a phone number we can reach you on').max(20),
  company: z.string().trim().min(1, 'Which brand or company is this for?').max(120),
  website: z.string().trim().max(200).optional().default(''),
});

export const adminEnquiryListQuerySchema = z.object({
  ...pagination,
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum([...ENQUIRY_STATUS_VALUES, 'all']).optional().default('all'),
  q: z.string().trim().max(120).optional(),
});

/** What an admin may change about an enquiry. The sender's own details are read-only. */
export const enquiryUpdateSchema = z
  .object({
    status: z.enum(ENQUIRY_STATUS_VALUES).optional(),
    note: z.string().trim().max(600).optional(),
  })
  .refine((d) => d.status !== undefined || d.note !== undefined, {
    message: 'Nothing to update',
  });

export type EnquiryInput = z.infer<typeof enquiryInputSchema>;
export type AdminEnquiryListQuery = z.infer<typeof adminEnquiryListQuerySchema>;
export type EnquiryUpdateInput = z.infer<typeof enquiryUpdateSchema>;
