import type { RequestHandler } from 'express';

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    const method = req.method;
    const url = req.originalUrl;
    const statusCode = res.statusCode;

    console.info(`[${new Date().toISOString()}] ${method} ${url} ${statusCode} ${durationMs}ms`);
  });

  next();
};
