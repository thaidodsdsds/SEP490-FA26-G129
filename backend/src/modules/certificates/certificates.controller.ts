import fs from 'node:fs';
import type { NextFunction, Request, Response } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import * as service from './certificates.service.js';

const getActor = (req: Request): service.CertificateActor => {
  const user = (req as Request & {
    user?: {
      id?: number;
      full_name?: string | null;
      role?: string | null;
      customer_id?: number | null;
    };
  }).user;

  return {
    id: Number(user?.id) || 0,
    full_name: user?.full_name ?? null,
    role: user?.role ?? null,
    customer_id: user?.customer_id ?? null,
  };
};

const parseId = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Mã chứng nhận không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  return parsed;
};

export const listCertificatesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await service.listCertificates(
      {
        status: req.query.status ? String(req.query.status) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      },
      getActor(req),
    );
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const listEligibleCalibrationRecordsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await service.listEligibleCalibrationRecords();
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getCertificateDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const certificateId = parseId(req.params.id);
    const result = await service.getCertificateDetail(certificateId, getActor(req));
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const issueCertificateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { calibration_record_id } = req.body ?? {};
    const result = await service.issueCertificate(
      { calibration_record_id: Number(calibration_record_id) },
      getActor(req),
    );
    res.status(201).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const signCertificateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const certificateId = parseId(req.params.id);
    const result = await service.signCertificate(certificateId, getActor(req));
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getCertificateFileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const certificateId = parseId(req.params.id);
    const file = await service.getCertificatePdf(certificateId, getActor(req));

    if (!fs.existsSync(file.absolutePath)) {
      throw new AppError(
        'File PDF chứng nhận không tồn tại trên máy chủ.',
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.fileName}"`,
    );
    res.sendFile(file.absolutePath);
  } catch (error) {
    next(error);
  }
};
