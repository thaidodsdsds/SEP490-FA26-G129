import type { NextFunction, Request, Response } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { enqueueVerificationLog } from './verification-log-queue.js';
import * as service from './verification.service.js';

const getSourceIp = (req: Request): string | null => {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    return forwarded.split(',')[0].trim() || null;
  }
  return req.socket.remoteAddress ?? null;
};

export const verifySealHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await service.verifySealByCode(String(req.params.sealCode ?? ''));

    // Gửi response trước, xếp log vào hàng đợi để không làm chậm lượt tra cứu.
    // Hàng đợi được flush định kỳ và khi graceful shutdown (không mất log lúc restart).
    res.status(200).json(buildSuccessResponse(result));

    const userAgent = req.headers['user-agent'];
    enqueueVerificationLog({
      sealId: result.seal?.id ?? null,
      sealCode: result.seal_code,
      result: result.result,
      sourceIp: getSourceIp(req),
      userAgent: typeof userAgent === 'string' ? userAgent : null,
    });
  } catch (error) {
    next(error);
  }
};
