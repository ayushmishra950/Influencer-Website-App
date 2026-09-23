import mongoose, { Schema, type FilterQuery, type Model, type Types } from 'mongoose';
import { STATUS, STATUS_VALUES, type Status } from '../config/constants.js';

/**
 * A service an influencer offers, with a price — "1 Instagram Reel, ₹3,000".
 *
 * Its own collection rather than an array on Influencer, because each package carries
 * its own review state and admins need to work through pending ones across everybody.
 *
 * Like the profile itself, a package is not published by writing it: the influencer
 * submits, an admin approves, and only then is it public.
 */
export interface IPackage {
  _id: Types.ObjectId;
  influencer: Types.ObjectId;
  /** The specialization or deliverable, e.g. "Instagram Reel". */
  title: string;
  description: string;
  price: number;
  currency: string;
  /** Optional turnaround, in days. 0 means unspecified. */
  deliveryDays: number;
  status: Status;
  rejectionReason: string;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  /** Set the first time this package was approved, for "live since" context. */
  firstApprovedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PackageModel extends Model<IPackage> {
  publicFilter(): FilterQuery<IPackage>;
}

const packageSchema = new Schema<IPackage, PackageModel>(
  {
    influencer: { type: Schema.Types.ObjectId, ref: 'Influencer', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 400, default: '' },

    // Whole currency units. Storing rupees rather than paise keeps the admin UI and
    // the API honest about what the number means.
    price: { type: Number, required: true, min: 0, max: 100_000_000 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'INR' },
    deliveryDays: { type: Number, min: 0, max: 365, default: 0 },

    status: { type: String, enum: STATUS_VALUES, default: STATUS.PENDING, index: true },
    rejectionReason: { type: String, trim: true, maxlength: 300, default: '' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    firstApprovedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The public profile asks for one influencer's approved packages; the admin queue
// asks for everything pending, newest first.
packageSchema.index({ influencer: 1, status: 1 });
packageSchema.index({ status: 1, createdAt: -1 });

packageSchema.static('publicFilter', function publicFilter(): FilterQuery<IPackage> {
  return { status: STATUS.APPROVED };
});

packageSchema.set('toJSON', {
  transform(_doc, ret) {
    const plain = ret as Partial<Record<keyof IPackage | '__v', unknown>>;
    delete plain.__v;
    return plain;
  },
});

export const Package = mongoose.model<IPackage, PackageModel>('Package', packageSchema);

/** A profile is a shop window, not a catalogue. */
export const MAX_PACKAGES_PER_INFLUENCER = 12;
