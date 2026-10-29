import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_LOCATION_TYPES,
  type CreateServiceRequestAttachmentInput,
  type CreateServiceRequestItemInput,
  createServiceRequest,
  listServiceRequests,
  REQUEST_CODE_REGEX,
  resolveAccountCustomerId,
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
 * Chuẩn hóa danh sách tệp đính kèm (attachments) tùy chọn
 */
const parseRequestAttachments = (
  rawAttachments: unknown,
): CreateServiceRequestAttachmentInput[] => {
  if (rawAttachments === undefined || rawAttachments === null) {
    return [];
  }

  if (!Array.isArray(rawAttachments)) {
    throw new AppError(
      'attachments must be an array.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  return rawAttachments.map((entry) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new AppError(
        'Each attachment must be an object with file_name and file_url.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }
    const record = entry as Record<string, unknown>;
    const fileName = typeof record.file_name === 'string' ? record.file_name.trim() : '';
    const fileUrl = typeof record.file_url === 'string' ? record.file_url.trim() : '';

    if (!fileName || !fileUrl) {
      throw new AppError(
        'Each attachment requires non-empty file_name and file_url.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    return {
      file_name: fileName.slice(0, 255),
      file_url: fileUrl,
    };
  });
};

/**
 * Controller lấy danh sách phiếu yêu cầu dịch vụ kèm thông tin công ty, mã số thuế và địa chỉ (GET /api/v1/service-requests)
 */
export const getServiceRequestsHandler: RequestHandler = async (req, res, next) => {
  try {
    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    let customerIdFilter: number | undefined;
    if (String(authUser.role || '').toLowerCase() === 'customer') {
      const tokenCustomerId = Number(authUser.customer_id);
      const resolvedId = isPositiveInteger(tokenCustomerId)
        ? tokenCustomerId
        : await resolveAccountCustomerId(Number(authUser.id));

      if (!resolvedId) {
        return res.status(200).json(buildSuccessResponse([]));
      }
      customerIdFilter = resolvedId;
    }

    const serviceRequests = await listServiceRequests(customerIdFilter);
    return res.status(200).json(buildSuccessResponse(serviceRequests));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller tạo mới phiếu yêu cầu dịch vụ (POST /api/v1/service-requests)
 * Hỗ trợ cả Nhân viên Sales (truyền customer_id) và Khách hàng (tự động lấy customer_id từ tài khoản đăng nhập)
 */
export const createServiceRequestHandler: RequestHandler = async (req, res, next) => {
  try {
    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    const userId = Number(authUser.id);
    if (!isPositiveInteger(userId)) {
      return next(
        new AppError('Authenticated user ID is missing or invalid.', 401, ERROR_CODES.UNAUTHORIZED),
      );
    }

    const { request_code, customer_id, location_type, preferred_date, items, attachments } = (req.body ?? {}) as Record<string, unknown>;
    const isCustomerRole = String(authUser.role || '').toLowerCase() === 'customer';

    let customerId = Number(customer_id);
    if (isCustomerRole) {
      const accountCustomerId =
        (await resolveAccountCustomerId(userId)) ?? Number(authUser.customer_id);
      if (!isPositiveInteger(accountCustomerId)) {
        return next(
          new AppError(
            'Tài khoản khách hàng chưa được liên kết với thông tin doanh nghiệp. Vui lòng cập nhật thông tin công ty trước khi tạo yêu cầu.',
            400,
            ERROR_CODES.VALIDATION_ERROR,
          ),
        );
      }
      if (isPositiveInteger(customerId) && customerId !== accountCustomerId) {
        return next(
          new AppError(
            'Bạn chỉ có thể tạo phiếu yêu cầu cho doanh nghiệp của mình.',
            403,
            ERROR_CODES.FORBIDDEN,
          ),
        );
      }
      customerId = accountCustomerId;
    } else if (!isPositiveInteger(customerId)) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    let normalizedRequestCode: string | null = null;
    if (request_code !== undefined && request_code !== null && String(request_code).trim() !== '') {
      normalizedRequestCode = String(request_code).trim();
      if (!REQUEST_CODE_REGEX.test(normalizedRequestCode)) {
        return next(
          new AppError(
            'Invalid request_code format. Expected format: SR-YYYY-XXX (e.g. SR-2026-088).',
            400,
            ERROR_CODES.BAD_REQUEST,
          ),
        );
      }
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

    let normalizedPreferredDate: string | null = null;
    if (preferred_date !== undefined && preferred_date !== null && String(preferred_date).trim() !== '') {
      normalizedPreferredDate = String(preferred_date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedPreferredDate) || Number.isNaN(Date.parse(normalizedPreferredDate))) {
        return next(
          new AppError(
            'Invalid preferred_date format. Expected format: YYYY-MM-DD.',
            400,
            ERROR_CODES.BAD_REQUEST,
          ),
        );
      }
    }

    const normalizedItems = parseRequestItems(items);
    const normalizedAttachments = parseRequestAttachments(attachments);

    const created = await createServiceRequest({
      request_code: normalizedRequestCode,
      customer_id: customerId,
      created_by: userId,
      location_type: location_type as ServiceRequestLocationType,
      preferred_date: normalizedPreferredDate,
      items: normalizedItems,
      attachments: normalizedAttachments,
    });

    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};
