import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { ENQUIRY_STATUS, ENQUIRY_STATUS_VALUES, type EnquiryStatus } from '../config/constants.js';

/**
 * A campaign enquiry submitted from the public website.
 *
 * Nothing here is an account: the person filling this in is a brand, not a user, so it
 * carries its own contact details rather than pointing at the User collection.
 */
export interface IEnquiry {
  _id: Types.ObjectId;
  /** Which of the form's options they picked -- "Brand", "Agency", and so on. */
  who: string;
  budget: string;
  /** What they are looking for. Optional, and the only part written for creators to read. */
  niche: string;
  city: string;
  brief: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  website: string;
  status: EnquiryStatus;
  /**
   * Whether this appears on the public briefs board.
   *
   * Off by default and turned on by an admin, the same way nothing else on this site
   * is public until a person says so. Only `who`, `budget`, `niche`, `city` and `brief`
   * are ever served publicly -- the name, company, email, phone and website never are.
   */
  isPublished: boolean;
  publishedAt: Date | null;
  /** The admin's own note about the conversation. Never shown to the sender. */
  note: string;
  handledBy: Types.ObjectId | null;
  handledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    who: { type: String, required: true, trim: true, maxlength: 40 },
    budget: { type: String, default: '', trim: true, maxlength: 40 },
    niche: { type: String, default: '', trim: true, maxlength: 60 },
    city: { type: String, default: '', trim: true, maxlength: 60 },
    brief: { type: String, default: '', trim: true, maxlength: 600 },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    company: { type: String, required: true, trim: true, maxlength: 120 },
    website: { type: String, default: '', trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: ENQUIRY_STATUS_VALUES,
      default: ENQUIRY_STATUS.NEW,
      index: true,
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null },
    note: { type: String, default: '', trim: true, maxlength: 600 },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    handledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The inbox is always "newest first", optionally narrowed to one status.
enquirySchema.index({ status: 1, createdAt: -1 });
// The public board asks only for published ones, newest first.
enquirySchema.index({ isPublished: 1, createdAt: -1 });

export const Enquiry: Model<IEnquiry> = mongoose.model<IEnquiry>('Enquiry', enquirySchema);
