import type { RequestHandler } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { AppError } from '../../common/errors.js';
import { ERROR_CODES } from '../../common/constants.js';
import {
  ALLOWED_DEVICE_STATUSES,
  createDevice,
  type DeviceStatus,
  getDeviceById,
  getDeviceOwnershipHistory,
  listDevices,
  transferDeviceOwnership,
  updateDevice,
} from './devices.service.js';

export const getDevices: RequestHandler = async (req, res, next) => {
  try {
    const {
      customer_id,
      is_group2,
      due_status,
      status,
      search,
      page,
      limit,
    } = req.query as Record<string, string | undefined>;

    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    let parsedIsGroup2: boolean | undefined;
    if (is_group2 === 'true') {
      parsedIsGroup2 = true;
    } else if (is_group2 === 'false') {
      parsedIsGroup2 = false;
    }

    const result = await listDevices({
      customerId: customer_id ? Number(customer_id) : undefined,
      isGroup2: parsedIsGroup2,
      dueStatus: due_status as 'all' | 'expired' | 'expiring_soon' | 'valid' | undefined,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      requestingUser,
    });

    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};

export const getDeviceDetail: RequestHandler = async (req, res, next) => {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return next(new AppError('Mã thiết bị không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST));
    }

    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    const device = await getDeviceById(deviceId, requestingUser);
    return res.status(200).json(buildSuccessResponse(device));
  } catch (error) {
    return next(error);
  }
};

export const createDeviceHandler: RequestHandler = async (req, res, next) => {
  try {
    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    const {
      customer_id,
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
      return next(new AppError('Tên thiết bị là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST));
    }

    if (
      status !== undefined
      && (typeof status !== 'string' || !ALLOWED_DEVICE_STATUSES.includes(status as DeviceStatus))
    ) {
      return next(
        new AppError(
          `Trạng thái thiết bị không hợp lệ. Cho phép: ${ALLOWED_DEVICE_STATUSES.join(', ')}.`,
          400,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    const created = await createDevice(
      {
        customer_id: typeof customer_id === 'number' ? customer_id : undefined,
        name,
        model: typeof model === 'string' ? model : null,
        manufacturer: typeof manufacturer === 'string' ? manufacturer : null,
        serial_number: typeof serial_number === 'string' ? serial_number : null,
        internal_code: typeof internal_code === 'string' ? internal_code : null,
        measuring_range: typeof measuring_range === 'string' ? measuring_range : null,
        is_group2: typeof is_group2 === 'boolean' ? is_group2 : false,
        next_due_date: typeof next_due_date === 'string' ? next_due_date : null,
        status: status as DeviceStatus | undefined,
      },
      requestingUser,
    );

    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

export const updateDeviceHandler: RequestHandler = async (req, res, next) => {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return next(new AppError('Mã thiết bị không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST));
    }

    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    const {
      name,
      model,
      manufacturer,
      serial_number,
      measuring_range,
      is_group2,
      next_due_date,
      status,
    } = (req.body ?? {}) as Record<string, unknown>;

    const updated = await updateDevice(
      deviceId,
      {
        name: typeof name === 'string' ? name : undefined,
        model: typeof model === 'string' ? model : model === null ? null : undefined,
        manufacturer: typeof manufacturer === 'string' ? manufacturer : manufacturer === null ? null : undefined,
        serial_number: typeof serial_number === 'string' ? serial_number : serial_number === null ? null : undefined,
        measuring_range: typeof measuring_range === 'string' ? measuring_range : measuring_range === null ? null : undefined,
        is_group2: typeof is_group2 === 'boolean' ? is_group2 : undefined,
        next_due_date: typeof next_due_date === 'string' ? next_due_date : next_due_date === null ? null : undefined,
        status: status as DeviceStatus | undefined,
      },
      requestingUser,
    );

    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};

/**
 * Handler lấy lịch sử sở hữu của thiết bị (View Device Ownership History)
 */
export const getDeviceOwnershipHistoryHandler: RequestHandler = async (req, res, next) => {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return next(new AppError('Mã thiết bị không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST));
    }

    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    const data = await getDeviceOwnershipHistory(deviceId, requestingUser);
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

/**
 * Handler chuyển quyền sở hữu thiết bị (Transfer Device Ownership)
 */
export const transferDeviceOwnershipHandler: RequestHandler = async (req, res, next) => {
  try {
    const deviceId = Number(req.params.id);
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return next(new AppError('Mã thiết bị không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST));
    }

    const requestingUser = req.user as {
      id?: number;
      role?: string;
      customer_id?: number | null;
    } | undefined;

    const { new_customer_id, transfer_reason, notes } = (req.body ?? {}) as Record<string, unknown>;

    const result = await transferDeviceOwnership(
      deviceId,
      {
        new_customer_id: Number(new_customer_id),
        transfer_reason: typeof transfer_reason === 'string' ? transfer_reason : '',
        notes: typeof notes === 'string' ? notes : null,
      },
      requestingUser,
    );

    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};


