import { Router } from 'express';
import { listPublicPackages } from '../controllers/package.controller.js';
import {
  getInfluencer,
  getPublicStats,
  listCategories,
  listInfluencers,
  listLocations,
} from '../controllers/public.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, publicListQuerySchema } from '../utils/schemas.js';

export const publicRouter = Router();

publicRouter.get('/influencers', validate(publicListQuerySchema, 'query'), listInfluencers);
publicRouter.get('/influencers/:id', validate(idParamSchema, 'params'), getInfluencer);
publicRouter.get('/influencers/:id/packages', validate(idParamSchema, 'params'), listPublicPackages);
publicRouter.get('/categories', listCategories);
publicRouter.get('/stats', getPublicStats);
publicRouter.get('/locations', listLocations);
