import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listPublicPackages } from '../controllers/package.controller.js';
import { createEnquiry, listPublicBriefs } from '../controllers/enquiry.controller.js';
import { createOrder } from '../controllers/order.controller.js';
import {
  countProfileView,
  getInfluencer,
  getPublicStats,
  listCategories,
  listInfluencers,
  listLocations,
} from '../controllers/public.controller.js';
import { validate } from '../middleware/validate.js';
import {
  briefListQuerySchema,
  enquiryInputSchema,
  idParamSchema,
  orderInputSchema,
  publicListQuerySchema,
} from '../utils/schemas.js';

export const publicRouter = Router();

/**
 * Everything else here only reads. These two write, from unauthenticated forms on the
 * open internet, so the global 300/minute is far too generous: a handful an hour is the
 * most a real person sends, and anything past that is someone filling an inbox.
 *
 * The limit counts rejected attempts too -- otherwise anyone could hammer it for free
 * by sending deliberate rubbish -- so it has to leave room for a person who mistypes
 * their email a couple of times before it goes through.
 */
const writeLimiter = (noun: string) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      success: false,
      message: `Too many ${noun} from this network. Please try again in a few minutes.`,
    },
  });

publicRouter.get('/influencers', validate(publicListQuerySchema, 'query'), listInfluencers);
publicRouter.get('/influencers/:id', validate(idParamSchema, 'params'), getInfluencer);
publicRouter.get('/influencers/:id/packages', validate(idParamSchema, 'params'), listPublicPackages);
publicRouter.get('/categories', listCategories);
publicRouter.get('/stats', getPublicStats);
publicRouter.get('/locations', listLocations);

// Briefs an admin has chosen to show creators. Contact details are never included.
publicRouter.get('/briefs', validate(briefListQuerySchema, 'query'), listPublicBriefs);
publicRouter.post('/enquiries', writeLimiter('enquiries'), validate(enquiryInputSchema), createEnquiry);

// Booking a package. The influencer is in the path; the package, and with it the
// price, is resolved server-side from the body's id.
publicRouter.post(
  '/influencers/:id/orders',
  writeLimiter('orders'),
  validate(idParamSchema, 'params'),
  validate(orderInputSchema),
  createOrder,
);

// A view ping from an opened profile. Its own limiter: it is unauthenticated and
// fires on every page load, so it needs far more headroom than a form, and still a
// ceiling so the counter cannot be inflated by holding down refresh.
publicRouter.post(
  '/influencers/:id/view',
  rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }),
  validate(idParamSchema, 'params'),
  countProfileView,
);
