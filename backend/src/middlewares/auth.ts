import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../common/constants.js';
import env from '../config/env.js';
import { AppError } from '../common/errors.js';

export const authenticate: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication token missing or invalid.', 401, ERROR_CODES.UNAUTHORIZED));
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, env.jwt.secret);
    req.user = decoded;
    return next();
  } catch (error) {
    const details = error instanceof Error ? error.message : undefined;
    return next(new AppError('Authentication token is invalid or expired.', 401, ERROR_CODES.UNAUTHORIZED, details));
  }
};

export const authorize = (...allowedRoles: string[]): RequestHandler => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User context is missing.', 401, ERROR_CODES.UNAUTHORIZED));
  }

  const userRole = typeof req.user === 'string' ? undefined : req.user.role;
  const roles = Array.isArray(userRole) ? userRole : userRole ? [userRole] : [];
  const hasAccess = allowedRoles.length === 0 || allowedRoles.some((role) => roles.includes(role));

  if (!hasAccess) {
    return next(new AppError('Permission denied.', 403, ERROR_CODES.FORBIDDEN));
  }

  return next();
};
