import type { FilterQuery } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getQuery } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { Enquiry, type IEnquiry } from '../models/Enquiry.js';
import { ENQUIRY_STATUS } from '../config/constants.js';
import { notifyAdminsOfEnquiry } from '../services/notifications.js';
import { notifyEnquiryChanged } from '../realtime/socket.js';
import type {
  AdminEnquiryListQuery,
  EnquiryInput,
  EnquiryUpdateInput,
} from '../utils/schemas.js';

/** Escapes user input before it becomes part of a RegExp. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Public: someone filling in the enquiry form on the website.
 *
 * The response carries no data back. Echoing the stored row would let anyone confirm
 * what the server kept, and the sender already knows what they typed -- all they need
 * is confirmation that it arrived.
 */
export const createEnquiry = asyncHandler(async (req, res) => {
  const input = req.body as EnquiryInput;

  const enquiry = await Enquiry.create(input);

  // Reaches every admin: a stored notification for the bell, and a socket event so an
  // inbox that is already open updates without anyone pressing reload.
  await notifyAdminsOfEnquiry({
    name: enquiry.name,
    company: enquiry.company,
    budget: enquiry.budget,
  });

  res.status(201).json({
    success: true,
    message: 'Thanks — your brief has reached our team.',
  });
});

/** Admin inbox: newest first, optionally narrowed to one status or a search term. */
export const listEnquiries = asyncHandler(async (req, res) => {
  const query = getQuery<AdminEnquiryListQuery>(req);
  const filter: FilterQuery<IEnquiry> = {};

  if (query.status !== 'all') filter.status = query.status;
  if (query.q) {
    const rx = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { company: rx }, { phone: rx }];
  }

  const skip = (query.page - 1) * query.limit;

  const [items, total, newCount] = await Promise.all([
    Enquiry.find(filter)
      .populate('handledBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .lean(),
    Enquiry.countDocuments(filter),
    // Independent of the current filter: the tab badge counts the whole inbox, not
    // whatever slice of it happens to be on screen.
    Enquiry.countDocuments({ status: ENQUIRY_STATUS.NEW }),
  ]);

  res.json({
    success: true,
    data: items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasMore: skip + items.length < total,
      newCount,
    },
  });
});

/**
 * Admin: move an enquiry along, or leave a note on it.
 *
 * Who touched it and when is stamped on every change, so a shared inbox does not turn
 * into two people ringing the same brand.
 */
export const updateEnquiry = asyncHandler(async (req, res) => {
  const input = req.body as EnquiryUpdateInput;

  const update: Partial<IEnquiry> = {
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.note !== undefined ? { note: input.note } : {}),
    handledBy: req.user!._id,
    handledAt: new Date(),
  };

  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).populate('handledBy', 'name');

  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  notifyEnquiryChanged();
  res.json({ success: true, message: 'Enquiry updated', data: enquiry });
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');

  notifyEnquiryChanged();
  res.json({ success: true, message: 'Enquiry deleted' });
});
