import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  createInboundTransaction,
  createOutboundTransaction,
  getWarehouseInventorySummary,
  listWarehouseDevices,
  listWarehouseTransactions,
} from './warehouse.service.js';

export const getDevices: RequestHandler = async (_req, res, next) => {
  try {
    const devices = await listWarehouseDevices();
    return res.status(200).json(buildSuccessResponse(devices));
  } catch (error) {
    return next(error);
  }
};

export const getTransactions: RequestHandler = async (req, res, next) => {
  try {
    const { type, device_id, customer_id, search } = req.query as Record<string, string | undefined>;
    const data = await listWarehouseTransactions({
      type,
      device_id: device_id ? Number(device_id) : undefined,
      customer_id: customer_id ? Number(customer_id) : undefined,
      search,
    });
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const postInbound: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const { device_id, service_request_item_id, condition_note, photo_url } = req.body ?? {};
    if (!device_id) throw new AppError('device_id is required', 400, ERROR_CODES.BAD_REQUEST);

    const result = await createInboundTransaction({
      device_id: Number(device_id),
      service_request_item_id: service_request_item_id ? Number(service_request_item_id) : null,
      condition_note,
      photo_url,
      handled_by: userId,
    });

    return res.status(201).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};

export const postOutbound: RequestHandler = async (req, res, next) => {
  try {
    const userId = Number((req.user as { id?: number })?.id);
    if (!userId) throw new AppError('Unauthorized', 401, ERROR_CODES.UNAUTHORIZED);

    const { device_id, service_request_item_id, condition_note, photo_url } = req.body ?? {};
    if (!device_id) throw new AppError('device_id is required', 400, ERROR_CODES.BAD_REQUEST);

    const result = await createOutboundTransaction({
      device_id: Number(device_id),
      service_request_item_id: service_request_item_id ? Number(service_request_item_id) : null,
      condition_note,
      photo_url,
      handled_by: userId,
    });

    return res.status(201).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};

export const getInventorySummary: RequestHandler = async (req, res, next) => {
  try {
    const summary = await getWarehouseInventorySummary();
    return res.status(200).json(buildSuccessResponse(summary));
  } catch (error) {
    return next(error);
  }
};
