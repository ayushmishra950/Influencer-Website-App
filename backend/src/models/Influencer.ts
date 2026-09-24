import mongoose, { Schema, type FilterQuery, type Model, type Types } from 'mongoose';
import {
  CREATED_BY,
  CREATED_BY_VALUES,
  STATUS,
  STATUS_VALUES,
  type CreatedBy,
  type Status,
} from '../config/constants.js';

export interface ISocial {
  instagram: string;
  youtube: string;
}

/**
 * Self-reported audience size, per platform.
 *
 * Declared by the creator, not pulled from any API -- the badge on this site means a
 * person checked the accounts, not that a number was machine-verified, and the UI says
 * so wherever these are shown. 0 means "not given" rather than "no followers", which is
 * why every reader treats it as absent.
 */
export interface IAudience {
  instagram: number;
  youtube: number;
}

export interface ILocation {
  country: string;
  state: string;
  city: string;
}

export interface IInfluencer {
  _id: Types.ObjectId;
  user: Types.ObjectId | null;
  name: string;
  email: string;
  phone: string;
  profileImage: string;
  bio: string;
  social: ISocial;
  audience: IAudience;
  category: Types.ObjectId;
  location: ILocation;
  status: Status;
  rejectionReason: string;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  createdBy: CreatedBy;
  /**
   * What the person wrote when they signed up -- a question, a suggestion, anything.
   *
   * Lives on the profile rather than in its own collection because it always belongs to
   * exactly one account: the form that collects it is the one that creates the account,
   * and an admin reading it is deciding about that person. A separate inbox would make
   * them match the two up by email by hand.
   */
  message: string;
  /** How many times the public profile has been opened. Never resets. */
  profileViews: number;
  createdAt: Date;
  updatedAt: Date;
}

interface IInfluencerVirtuals {
  canLogin: boolean;
}

interface InfluencerModel extends Model<IInfluencer, Record<string, never>, Record<string, never>, IInfluencerVirtuals> {
  /** The only records that may ever be shown publicly. */
  publicFilter(): FilterQuery<IInfluencer>;
}

const influencerSchema = new Schema<IInfluencer, InfluencerModel, Record<string, never>, Record<string, never>, IInfluencerVirtuals>(
  {
    // Null only when an admin created a directory-only listing with no login.
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    // --- Basic information ---
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    profileImage: { type: String, default: '' },
    bio: { type: String, trim: true, maxlength: 600, default: '' },

    // --- Social (extendable: facebook/tiktok/x drop in without a migration) ---
    social: {
      instagram: { type: String, trim: true, default: '' },
      youtube: { type: String, trim: true, default: '' },
    },

    // Capped well above any real account so a typo cannot render as a billion.
    audience: {
      instagram: { type: Number, min: 0, max: 5_000_000_000, default: 0 },
      youtube: { type: Number, min: 0, max: 5_000_000_000, default: 0 },
    },

    // --- Category (master data) ---
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },

    // --- Location ---
    location: {
      country: { type: String, trim: true, required: true },
      state: { type: String, trim: true, required: true },
      city: { type: String, trim: true, required: true },
    },

    // --- Verification lifecycle ---
    status: { type: String, enum: STATUS_VALUES, default: STATUS.PENDING, index: true },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },

    // --- Archive: reversible soft removal, distinct from delete ---
    isArchived: { type: Boolean, default: false, index: true },
    archivedAt: { type: Date, default: null },

    createdBy: { type: String, enum: CREATED_BY_VALUES, default: CREATED_BY.SELF },

    // Never public: this is between the person and the team reviewing them.
    message: { type: String, trim: true, maxlength: 1000, default: '' },

    // Incremented by the public profile page. Not indexed: it is read one record at a
    // time on a dashboard, never sorted or filtered on.
    profileViews: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true },
);

// Every directory query filters on these together.
influencerSchema.index({ status: 1, isArchived: 1 });
influencerSchema.index({ 'location.country': 1, 'location.state': 1, 'location.city': 1 });
influencerSchema.index({ name: 'text', bio: 'text' });

influencerSchema.static('publicFilter', function publicFilter(): FilterQuery<IInfluencer> {
  return { status: STATUS.APPROVED, isArchived: false };
});

influencerSchema.virtual('canLogin').get(function canLogin(this: IInfluencer): boolean {
  return this.status === STATUS.APPROVED && !this.isArchived;
});

influencerSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    const plain = ret as Partial<Record<keyof IInfluencer | '__v', unknown>>;
    delete plain.__v;
    return plain;
  },
});
influencerSchema.set('toObject', { virtuals: true });

export const Influencer = mongoose.model<IInfluencer, InfluencerModel>('Influencer', influencerSchema);
