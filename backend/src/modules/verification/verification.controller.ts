import type { NextFunction, Request, Response } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
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

    // Gửi response trước, ghi log bất đồng bộ để không làm chậm lượt tra cứu.
    res.status(200).json(buildSuccessResponse(result));

    const userAgent = req.headers['user-agent'];
    void service
      .recordVerificationLog({
        sealId: result.seal?.id ?? null,
        sealCode: result.seal_code,
        result: result.result,
        sourceIp: getSourceIp(req),
        userAgent: typeof userAgent === 'string' ? userAgent : null,
      })
      .catch((error: unknown) => {
        console.error('[verification] Không ghi được SealVerificationLog:', error);
      });
  } catch (error) {
    next(error);
  }
};
