import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { listPublicPackages } from '../controllers/package.controller.js';
import { createEnquiry } from '../controllers/enquiry.controller.js';
import {
  getInfluencer,
  getPublicStats,
  listCategories,
  listInfluencers,
  listLocations,
} from '../controllers/public.controller.js';
import { validate } from '../middleware/validate.js';
import { enquiryInputSchema, idParamSchema, publicListQuerySchema } from '../utils/schemas.js';

export const publicRouter = Router();

/**
 * Everything else here only reads. This one writes, from an unauthenticated form on the
 * open internet, so the global 300/minute is far too generous: a handful an hour is the
 * most a real person sends, and anything past that is someone filling the admin's inbox.
 *
 * The limit counts rejected attempts too -- otherwise anyone could hammer it for free
 * by sending deliberate rubbish -- so it has to leave room for a person who mistypes
 * their email a couple of times before it goes through.
 */
const enquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many enquiries from this network. Please try again in a few minutes.',
  },
});

publicRouter.get('/influencers', validate(publicListQuerySchema, 'query'), listInfluencers);
publicRouter.get('/influencers/:id', validate(idParamSchema, 'params'), getInfluencer);
publicRouter.get('/influencers/:id/packages', validate(idParamSchema, 'params'), listPublicPackages);
publicRouter.get('/categories', listCategories);
publicRouter.get('/stats', getPublicStats);
publicRouter.get('/locations', listLocations);
publicRouter.post('/enquiries', enquiryLimiter, validate(enquiryInputSchema), createEnquiry);
