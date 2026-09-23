import { Router } from 'express';
import {
  approveInfluencer,
  archiveInfluencer,
  bulkAction,
  createInfluencer,
  deleteInfluencer,
  getInfluencer,
  getStats,
  approvePackage,
  deletePackage,
  listInfluencers,
  listLocations,
  listPackages,
  rejectInfluencer,
  rejectPackage,
  restoreInfluencer,
  updateInfluencer,
} from '../controllers/admin.controller.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadAvatar } from '../middleware/upload.js';
import { uploadProfileImage } from '../controllers/influencer.controller.js';
import {
  adminCreateInfluencerSchema,
  adminListQuerySchema,
  adminLocationsQuerySchema,
  adminPackageListQuerySchema,
  adminUpdateInfluencerSchema,
  bulkSchema,
  categoryInputSchema,
  categoryListQuerySchema,
  idParamSchema,
  rejectSchema,
} from '../utils/schemas.js';
import { ROLES } from '../config/constants.js';

export const adminRouter = Router();

// Every route below is admin-only, enforced on the server — not by hiding UI.
adminRouter.use(authenticate, authorize(ROLES.ADMIN));

adminRouter.get('/stats', getStats);
adminRouter.get('/locations', validate(adminLocationsQuerySchema, 'query'), listLocations);

adminRouter.post('/influencers/bulk', validate(bulkSchema), bulkAction);
adminRouter
  .route('/influencers')
  .get(validate(adminListQuerySchema, 'query'), listInfluencers)
  .post(validate(adminCreateInfluencerSchema), createInfluencer);

adminRouter.post('/influencers/image', uploadAvatar, uploadProfileImage);

adminRouter
  .route('/influencers/:id')
  .get(validate(idParamSchema, 'params'), getInfluencer)
  .put(validate(idParamSchema, 'params'), validate(adminUpdateInfluencerSchema), updateInfluencer)
  .delete(validate(idParamSchema, 'params'), deleteInfluencer);

adminRouter.patch('/influencers/:id/approve', validate(idParamSchema, 'params'), approveInfluencer);
adminRouter.patch(
  '/influencers/:id/reject',
  validate(idParamSchema, 'params'),
  validate(rejectSchema),
  rejectInfluencer,
);
adminRouter.patch('/influencers/:id/archive', validate(idParamSchema, 'params'), archiveInfluencer);
adminRouter.patch('/influencers/:id/restore', validate(idParamSchema, 'params'), restoreInfluencer);

adminRouter
  .route('/categories')
  .get(validate(categoryListQuerySchema, 'query'), listCategories)
  .post(validate(categoryInputSchema), createCategory);
adminRouter
  .route('/categories/:id')
  .put(validate(idParamSchema, 'params'), validate(categoryInputSchema), updateCategory)
  .delete(validate(idParamSchema, 'params'), deleteCategory);

// Package review mirrors influencer review: a queue, then approve or reject.
adminRouter.get('/packages', validate(adminPackageListQuerySchema, 'query'), listPackages);
adminRouter.patch('/packages/:id/approve', validate(idParamSchema, 'params'), approvePackage);
adminRouter.patch(
  '/packages/:id/reject',
  validate(idParamSchema, 'params'),
  validate(rejectSchema),
  rejectPackage,
);
adminRouter.delete('/packages/:id', validate(idParamSchema, 'params'), deletePackage);
