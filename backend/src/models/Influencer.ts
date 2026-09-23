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
  category: Types.ObjectId;
  location: ILocation;
  status: Status;
  rejectionReason: string;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  isArchived: boolean;
  archivedAt: Date | null;
  createdBy: CreatedBy;
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
