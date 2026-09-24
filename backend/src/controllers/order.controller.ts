import type { FilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getQuery } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { Order, type IOrder } from '../models/Order.js';
import { Package } from '../models/Package.js';
import { Influencer } from '../models/Influencer.js';
import { ORDER_STATUS, ORDER_TRANSITIONS } from '../config/constants.js';
import { notifyInfluencerOfOrder } from '../services/notifications.js';
import { notifyOrderChanged } from '../realtime/socket.js';
import type { MyOrderListQuery, OrderInput, OrderStatusInput } from '../utils/schemas.js';

/**
 * Public: a brand books a package.
 *
 * Nothing that decides what this order is worth comes from the request. The influencer
 * comes from the URL, the package is looked up and checked to belong to them, and the
 * title and price are copied from the package the server read -- a posted price would
 * let anyone book a ₹35,000 package for ₹1.
 */
export const createOrder = asyncHandler(async (req, res) => {
  const input = req.body as OrderInput;

  // Only a publicly listed influencer can be booked: an archived or unapproved one is
  // not visible, so an order placed against them could never be seen or answered.
  const influencer = await Influencer.findOne({
    _id: req.params.id,
    ...Influencer.publicFilter(),
  })
    .select('_id name user')
    .lean();

  if (!influencer) throw ApiError.notFound('This creator is not available');

  const pkg = await Package.findOne({
    _id: input.packageId,
    influencer: influencer._id,
    ...Package.publicFilter(),
  }).lean();

  if (!pkg) throw ApiError.notFound('That package is no longer available');

  const order = await Order.create({
    influencer: influencer._id,
    package: pkg._id,
    // Copied, not referenced: the package can be edited or deleted later, and this
    // order has to keep saying what was agreed on the day it was placed.
    packageTitle: pkg.title,
    packageDescription: pkg.description,
    price: pkg.price,
    currency: pkg.currency,
    deliveryDays: pkg.deliveryDays,

    buyerName: input.buyerName,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
    buyerCompany: input.buyerCompany,
    message: input.message,
  });

  if (influencer.user) {
    await notifyInfluencerOfOrder({
      userId: influencer.user,
      influencerId: influencer._id,
      influencerName: influencer.name,
      buyerName: order.buyerName,
      buyerCompany: order.buyerCompany,
      packageTitle: order.packageTitle,
      price: order.price,
      currency: order.currency,
    });
  }

  // The buyer is told it arrived, and nothing else. Echoing the stored order back
  // would hand an anonymous caller a readable record of someone else's booking.
  res.status(201).json({
    success: true,
    message: `Your request has reached ${influencer.name}.`,
  });
});

/** The influencer's own orders. Scoped to their profile, never to an id they send. */
export const listMyOrders = asyncHandler(async (req, res) => {
  const query = getQuery<MyOrderListQuery>(req);

  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id').lean();
  if (!profile) throw ApiError.notFound('Influencer profile not found');

  const filter: FilterQuery<IOrder> = { influencer: profile._id };
  if (query.status !== 'all') filter.status = query.status;

  const skip = (query.page - 1) * query.limit;

  const [items, total, counts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
    Order.countDocuments(filter),
    // Every status at once, so the tabs can show their counts without a request each.
    Order.aggregate<{ _id: string; count: number }>([
      { $match: { influencer: profile._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(counts.map((row) => [row._id, row.count]));

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + items.length < total,
      counts: {
        new: byStatus[ORDER_STATUS.NEW] ?? 0,
        accepted: byStatus[ORDER_STATUS.ACCEPTED] ?? 0,
        declined: byStatus[ORDER_STATUS.DECLINED] ?? 0,
        completed: byStatus[ORDER_STATUS.COMPLETED] ?? 0,
      },
    },
  });
});

/** Accept, decline or complete one of your own orders. */
export const updateMyOrderStatus = asyncHandler(async (req, res) => {
  const input = req.body as OrderStatusInput;

  const profile = await Influencer.findOne({ user: req.user!._id }).select('_id').lean();
  if (!profile) throw ApiError.notFound('Influencer profile not found');

  // Ownership is part of the query, not a check afterwards: there is no path here
  // that loads someone else's order at all.
  const order = await Order.findOne({ _id: req.params.id, influencer: profile._id });
  if (!order) throw ApiError.notFound('Order not found');

  const allowed = ORDER_TRANSITIONS[order.status];
  if (!allowed.includes(input.status)) {
    throw ApiError.badRequest(
      allowed.length === 0
        ? `This order is already ${order.status} and cannot be changed.`
        : `An order that is ${order.status} can only become ${allowed.join(' or ')}.`,
    );
  }

  order.status = input.status;
  order.respondedAt = new Date();
  if (input.status === ORDER_STATUS.DECLINED) order.declineReason = input.declineReason;
  if (input.status === ORDER_STATUS.COMPLETED) order.completedAt = new Date();
  await order.save();

  notifyOrderChanged(String(req.user!._id));

  res.json({ success: true, message: `Order marked ${input.status}`, data: order });
});
