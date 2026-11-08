import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import {
  getMyNotifications,
  putMarkAllAsRead,
  putMarkAsRead,
} from './notifications.controller.js';

const notificationsRoutes = Router();

notificationsRoutes.use(authenticate);

notificationsRoutes.get('/', getMyNotifications);
notificationsRoutes.put('/:id/read', putMarkAsRead);
notificationsRoutes.put('/read-all', putMarkAllAsRead);

export default notificationsRoutes;
