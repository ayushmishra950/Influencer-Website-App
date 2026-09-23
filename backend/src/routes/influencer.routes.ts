import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  uploadProfileImage,
} from '../controllers/influencer.controller.js';
import {
  createMyPackage,
  deleteMyPackage,
  listMyPackages,
  updateMyPackage,
} from '../controllers/package.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { requireActiveInfluencer } from '../middleware/requireActiveInfluencer.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar } from '../middleware/upload.js';
import { idParamSchema, packageInputSchema, updateOwnProfileSchema } from '../utils/schemas.js';
import { ROLES } from '../config/constants.js';

export const influencerRouter = Router();

// requireActiveInfluencer re-checks approval on every request, so a token issued
// before an admin archived or rejected this person stops working immediately.
influencerRouter.use(authenticate, authorize(ROLES.INFLUENCER), requireActiveInfluencer);

influencerRouter.get('/profile', getMyProfile);
influencerRouter.put('/profile', validate(updateOwnProfileSchema), updateMyProfile);
influencerRouter.post('/profile/image', uploadAvatar, uploadProfileImage);

// Packages: the influencer owns them, but submitting is not publishing — every
// create and edit lands back in `pending` for review.
influencerRouter
  .route('/packages')
  .get(listMyPackages)
  .post(validate(packageInputSchema), createMyPackage);

influencerRouter
  .route('/packages/:id')
  .put(validate(idParamSchema, 'params'), validate(packageInputSchema), updateMyPackage)
  .delete(validate(idParamSchema, 'params'), deleteMyPackage);
