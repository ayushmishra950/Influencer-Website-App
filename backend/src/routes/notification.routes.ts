import { Router } from 'express';
import {
  clearAll,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, notificationListQuerySchema } from '../utils/schemas.js';

export const notificationRouter = Router();

// Deliberately NOT behind `requireActiveInfluencer`: an archived influencer is locked
// out of everything else, but must still be able to read the notice explaining why.
notificationRouter.use(authenticate);

notificationRouter.get('/', validate(notificationListQuerySchema, 'query'), listNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/read-all', markAllRead);
notificationRouter.patch('/:id/read', validate(idParamSchema, 'params'), markRead);
notificationRouter.delete('/', clearAll);
