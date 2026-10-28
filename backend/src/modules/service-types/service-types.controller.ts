import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  listServiceTypes,
  validateServiceTypeById,
} from './service-types.service.js';

/**
 * Controller lấy danh sách các loại dịch vụ kèm trạng thái kiểm tra quy trình & Active
 */
export const getServiceTypes: RequestHandler = async (_req, res, next) => {
  try {
    const serviceTypes = await listServiceTypes();
    return res.status(200).json(buildSuccessResponse(serviceTypes));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller kiểm tra tính hợp lệ của một loại dịch vụ cụ thể theo ID
 */
export const validateServiceType: RequestHandler = async (req, res, next) => {
  try {
    const serviceTypeId = Number(req.params.serviceTypeId);

    if (!Number.isInteger(serviceTypeId) || serviceTypeId <= 0) {
      return next(
        new AppError('Invalid service type ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const validated = await validateServiceTypeById(serviceTypeId);
    return res.status(200).json(buildSuccessResponse(validated));
  } catch (error) {
    return next(error);
  }
};

