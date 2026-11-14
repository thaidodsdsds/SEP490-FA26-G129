import type { Request, Response, NextFunction } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import * as service from './calibration-records.service.js';

export const getReviewQueueHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const query = req.query.q ? String(req.query.q) : undefined;
    const records = await service.getReviewQueue({ status, query });
    res.status(200).json(buildSuccessResponse(records));
  } catch (error) {
    next(error);
  }
};

export const getCalibrationRecordDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recordId = Number(req.params.id);
    const record = await service.getCalibrationRecordDetail(recordId);
    res.status(200).json(buildSuccessResponse(record));
  } catch (error) {
    next(error);
  }
};

export const reviewCalibrationRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const recordId = Number(req.params.id);
    const reviewerId = (req as any).user?.id || 1;
    const { action, reject_reason, comment, signature_image } = req.body || {};
    const result = await service.reviewCalibrationRecord(recordId, reviewerId, {
      action,
      reject_reason,
      comment,
      signature_image,
    });
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

