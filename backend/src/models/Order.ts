import mongoose, { Schema, type Model, type Types } from 'mongoose';
import { ORDER_STATUS, ORDER_STATUS_VALUES, type OrderStatus } from '../config/constants.js';

/**
 * A brand booking one of an influencer's packages.
 *
 * The package details are copied onto the order, not just referenced. A package can be
 * edited (which sends it back for review) or deleted outright, and an order has to keep
 * saying what was actually agreed and at what price on the day it was placed. The
 * reference is kept as well, and is allowed to go null, so a deleted package leaves a
 * readable order behind instead of a broken one.
 *
 * The buyer is not a user: brands have no accounts here, so their contact details live
 * on the order itself.
 */
export interface IOrder {
  _id: Types.ObjectId;
  influencer: Types.ObjectId;
  package: Types.ObjectId | null;

  packageTitle: string;
  packageDescription: string;
  price: number;
  currency: string;
  deliveryDays: number;

  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerCompany: string;
  message: string;

  status: OrderStatus;
  /** Why the influencer turned it down. Kept for their own record, not shown to the buyer. */
  declineReason: string;
  respondedAt: Date | null;
  completedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    influencer: { type: Schema.Types.ObjectId, ref: 'Influencer', required: true, index: true },
    package: { type: Schema.Types.ObjectId, ref: 'Package', default: null },

    packageTitle: { type: String, required: true, trim: true, maxlength: 80 },
    packageDescription: { type: String, trim: true, maxlength: 400, default: '' },
    price: { type: Number, required: true, min: 0, max: 100_000_000 },
    currency: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'INR' },
    deliveryDays: { type: Number, min: 0, max: 365, default: 0 },

    buyerName: { type: String, required: true, trim: true, maxlength: 80 },
    buyerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 160 },
    buyerPhone: { type: String, required: true, trim: true, maxlength: 20 },
    buyerCompany: { type: String, trim: true, maxlength: 120, default: '' },
    message: { type: String, trim: true, maxlength: 800, default: '' },

    status: { type: String, enum: ORDER_STATUS_VALUES, default: ORDER_STATUS.NEW, index: true },
    declineReason: { type: String, trim: true, maxlength: 300, default: '' },
    respondedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// The only list that matters: one influencer's orders, newest first, sometimes
// narrowed to a status.
orderSchema.index({ influencer: 1, createdAt: -1 });
orderSchema.index({ influencer: 1, status: 1 });

orderSchema.set('toJSON', {
  transform(_doc, ret) {
    const plain = ret as Partial<Record<keyof IOrder | '__v', unknown>>;
    delete plain.__v;
    return plain;
  },
});

export const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);
