import type { ErrorRequestHandler } from 'express';
import { ERROR_CODES } from '../common/constants.js';
import { buildErrorResponse } from '../common/response.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const isParseError = error?.type === 'entity.parse.failed' || error?.name === 'SyntaxError';
  const statusCode = error?.statusCode || error?.status || (isParseError ? 400 : 500);
  const code = error?.code || (statusCode === 400 ? ERROR_CODES.BAD_REQUEST : ERROR_CODES.INTERNAL_ERROR);
  const message = error?.message || 'Internal Server Error';
  const details = error?.details || (error?.errors ? error.errors : null);

  const payload = buildErrorResponse(message, code, {
    path: req.originalUrl,
    method: req.method,
    details,
  });

  return res.status(statusCode).json(payload);
};
