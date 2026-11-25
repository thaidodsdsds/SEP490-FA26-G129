import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  createMasterStandard,
  getMasterStandardById,
  listMasterStandards,
  updateMasterStandard,
} from './master-standards.service.js';

export const getMasterStandardsList: RequestHandler = async (req, res, next) => {
  try {
    const { status, search, valid_only } = req.query as Record<string, string | undefined>;
    const data = await listMasterStandards({
      status,
      search,
      valid_only: valid_only === 'true',
    });
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const getSingleMasterStandard: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid standard ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const data = await getMasterStandardById(id);
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const postMasterStandard: RequestHandler = async (req, res, next) => {
  try {
    const { name, serial_number, accuracy_class, calibration_expiry, status } = req.body ?? {};
    const created = await createMasterStandard({
      name,
      serial_number,
      accuracy_class,
      calibration_expiry,
      status,
    });
    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

export const putMasterStandard: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid standard ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const updated = await updateMasterStandard(id, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};
