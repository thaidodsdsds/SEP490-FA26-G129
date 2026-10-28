import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_DEVICE_STATUSES,
  createCustomerDevice,
  type DeviceStatus,
  listCustomerDevices,
  listCustomers,
} from './customers.service.js';

/**
 * Controller lấy danh sách ID và tên của khách hàng
 */
export const getCustomers: RequestHandler = async (_req, res, next) => {
  try {
    const customers = await listCustomers();
    return res.status(200).json(buildSuccessResponse(customers));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller lấy danh sách thiết bị thuộc về một khách hàng
 */
export const getCustomerDevices: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const devices = await listCustomerDevices(customerId);
    return res.status(200).json(buildSuccessResponse(devices));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller thêm thiết bị mới cho khách hàng
 */
export const addCustomerDevice: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const {
      name,
      model,
      manufacturer,
      serial_number,
      internal_code,
      measuring_range,
      is_group2,
      next_due_date,
      status,
    } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return next(
        new AppError('Device name is required.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (
      status !== undefined
      && (typeof status !== 'string'
        || !ALLOWED_DEVICE_STATUSES.includes(status as DeviceStatus))
    ) {
      return next(
        new AppError(
          `Invalid device status. Allowed values: ${ALLOWED_DEVICE_STATUSES.join(', ')}.`,
          400,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    const createdDevice = await createCustomerDevice(customerId, {
      name,
      model: typeof model === 'string' ? model : null,
      manufacturer: typeof manufacturer === 'string' ? manufacturer : null,
      serial_number: typeof serial_number === 'string' ? serial_number : null,
      internal_code: typeof internal_code === 'string' ? internal_code : null,
      measuring_range: typeof measuring_range === 'string' ? measuring_range : null,
      is_group2: typeof is_group2 === 'boolean' ? is_group2 : false,
      next_due_date: typeof next_due_date === 'string' ? next_due_date : null,
      status: status as DeviceStatus | undefined,
    });

    return res.status(201).json(buildSuccessResponse(createdDevice));
  } catch (error) {
    return next(error);
  }
};
