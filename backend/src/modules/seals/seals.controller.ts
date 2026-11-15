import type { NextFunction, Request, Response } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import * as service from './seals.service.js';

const getActor = (req: Request): service.SealActor => {
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
    throw new AppError('Mã tem không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  return parsed;
};

export const listSealsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await service.listSeals(
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

export const listEligibleCertificatesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await service.listEligibleCertificates();
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getSealDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sealId = parseId(req.params.id);
    const result = await service.getSealDetail(sealId, getActor(req));
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const createSealHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { certificate_id, due_date } = req.body ?? {};
    const result = await service.createSeal(
      {
        certificate_id: Number(certificate_id),
        due_date: due_date ? String(due_date) : null,
      },
      getActor(req),
    );
    res.status(201).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getSealQrHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sealId = parseId(req.params.id);
    const result = await service.getSealQr(sealId, getActor(req));
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename="${result.seal_code}.png"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};

export const getSealPdfHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sealId = parseId(req.params.id);
    const result = await service.getSealPdf(sealId, getActor(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${result.fileName}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};
