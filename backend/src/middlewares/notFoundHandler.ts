import type { RequestHandler } from 'express';
import { API_PREFIX, ERROR_CODES } from '../common/constants.js';
import { buildErrorResponse } from '../common/response.js';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(
    buildErrorResponse(
      `Route not found: ${req.method} ${req.originalUrl}`,
      ERROR_CODES.NOT_FOUND,
      {
        path: req.originalUrl,
        apiPrefix: API_PREFIX,
      },
    ),
  );
};
