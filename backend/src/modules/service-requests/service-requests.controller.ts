import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_LOCATION_TYPES,
  type CreateServiceRequestItemInput,
  createServiceRequest,
  type ServiceRequestLocationType,
} from './service-requests.service.js';

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Chuẩn hóa danh sách items từ request body:
 * Hỗ trợ cả 2 dạng:
 * - [{ device_id: 1, service_type_id: 2 }]
 * - [{ device_id: 1, service_type_ids: [2, 3] }]
 */
const parseRequestItems = (rawItems: unknown): CreateServiceRequestItemInput[] => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError(
      'At least one device and service type item is required.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const normalizedItems: CreateServiceRequestItemInput[] = [];

  for (const entry of rawItems) {
    if (typeof entry !== 'object' || entry === null) {
      throw new AppError(
        'Each item must be a valid object.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const record = entry as Record<string, unknown>;
    const deviceId = Number(record.device_id);

    if (!isPositiveInteger(deviceId)) {
      throw new AppError(
        'Each item must have a valid positive integer device_id.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    if (Array.isArray(record.service_type_ids)) {
      if (record.service_type_ids.length === 0) {
        throw new AppError(
          `Device ${deviceId} must have at least one selected service_type_id.`,
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }

      for (const rawServiceId of record.service_type_ids) {
        const serviceTypeId = Number(rawServiceId);
        if (!isPositiveInteger(serviceTypeId)) {
          throw new AppError(
            'Each service_type_id must be a positive integer.',
            400,
            ERROR_CODES.BAD_REQUEST,
          );
        }
        normalizedItems.push({
          device_id: deviceId,
          service_type_id: serviceTypeId,
        });
      }
    } else {
      const serviceTypeId = Number(record.service_type_id);
      if (!isPositiveInteger(serviceTypeId)) {
        throw new AppError(
          'Each item must have a valid positive integer service_type_id.',
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }
      normalizedItems.push({
        device_id: deviceId,
        service_type_id: serviceTypeId,
      });
    }
  }

  // Kiểm tra trùng lặp cặp (device_id, service_type_id)
  const seenPairs = new Set<string>();
  for (const item of normalizedItems) {
    const pairKey = `${item.device_id}:${item.service_type_id}`;
    if (seenPairs.has(pairKey)) {
      throw new AppError(
        'Duplicate device and service type combination in request items.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }
    seenPairs.add(pairKey);
  }

  return normalizedItems;
};

/**
 * Controller tạo mới phiếu yêu cầu dịch vụ (POST /api/v1/service-requests)
 */
export const createServiceRequestHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId =
      typeof req.user === 'object' && req.user !== null
        ? Number((req.user as { id?: unknown }).id)
        : NaN;

    if (!isPositiveInteger(userId)) {
      return next(
        new AppError('Authenticated user ID is missing or invalid.', 401, ERROR_CODES.UNAUTHORIZED),
      );
    }

    const { customer_id, location_type, items } = (req.body ?? {}) as Record<string, unknown>;
    const customerId = Number(customer_id);

    if (!isPositiveInteger(customerId)) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (
      typeof location_type !== 'string'
      || !ALLOWED_LOCATION_TYPES.includes(location_type as ServiceRequestLocationType)
    ) {
      return next(
        new AppError(
          `Invalid location_type. Allowed values: ${ALLOWED_LOCATION_TYPES.join(', ')}.`,
          400,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    const normalizedItems = parseRequestItems(items);

    const created = await createServiceRequest({
      customer_id: customerId,
      created_by: userId,
      location_type: location_type as ServiceRequestLocationType,
      items: normalizedItems,
    });

    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

