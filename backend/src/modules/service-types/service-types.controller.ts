import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  createServiceType,
  getServiceTypeById,
  listServiceTypes,
  updateServiceType,
  validateServiceTypeById,
} from './service-types.service.js';

export const getServiceTypes: RequestHandler = async (req, res, next) => {
  try {
    const { field, kind, status, search } = req.query as Record<string, string | undefined>;
    const data = await listServiceTypes({ field, kind, status, search });
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const getSingleServiceType: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid service type ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const data = await getServiceTypeById(id);
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const postServiceType: RequestHandler = async (req, res, next) => {
  try {
    const { name, kind, field, standard_code, measuring_range, description, status } =
      req.body ?? {};
    const created = await createServiceType({
      name,
      kind,
      field,
      standard_code,
      measuring_range,
      description,
      status,
    });
    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

export const putServiceType: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid service type ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const updated = await updateServiceType(id, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};

export const validateServiceType: RequestHandler = async (req, res, next) => {
  try {
    const rawId = req.params.serviceTypeId;
    const serviceTypeId = Number(rawId);

    if (!Number.isInteger(serviceTypeId) || serviceTypeId <= 0) {
      throw new AppError(
        'Service type ID must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const validated = await validateServiceTypeById(serviceTypeId);
    return res.status(200).json(buildSuccessResponse(validated));
  } catch (error) {
    return next(error);
  }
};
