import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
} from './notifications.service.js';

export const getMyNotifications: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const { unread_only } = req.query as Record<string, string | undefined>;
    const data = await listNotifications(userId, unread_only === 'true');
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const putMarkAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const notificationId = Number(req.params.id);
    const updated = await markAsRead(notificationId, userId);
    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};

export const putMarkAllAsRead: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const result = await markAllAsRead(userId);
    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};
