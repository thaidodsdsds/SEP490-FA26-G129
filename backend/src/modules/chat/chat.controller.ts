import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  createThread,
  getThreadDetails,
  listUserThreads,
  sendMessage,
} from './chat.service.js';

export const getMyThreads: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const threads = await listUserThreads(userId);
    return res.status(200).json(buildSuccessResponse(threads));
  } catch (error) {
    return next(error);
  }
};

export const getSingleThread: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const threadId = Number(req.params.threadId);
    const data = await getThreadDetails(threadId, userId);
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const postCreateThread: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const { thread_type, title, service_request_id, customer_id, participant_ids, initial_message } =
      req.body ?? {};

    const thread = await createThread(
      {
        thread_type: thread_type || 'CustomerSupport',
        title: title || 'Hỗ trợ kỹ thuật & dịch vụ',
        service_request_id: service_request_id ? Number(service_request_id) : null,
        customer_id: customer_id ? Number(customer_id) : null,
        participant_ids: Array.isArray(participant_ids) ? participant_ids.map(Number) : [],
        initial_message,
      },
      userId,
    );

    return res.status(201).json(buildSuccessResponse(thread));
  } catch (error) {
    return next(error);
  }
};

export const postSendMessage: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const threadId = Number(req.params.threadId);
    const { content } = req.body ?? {};

    const msg = await sendMessage(threadId, userId, content);
    return res.status(201).json(buildSuccessResponse(msg));
  } catch (error) {
    return next(error);
  }
};
