import type { RequestHandler } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { listRoles } from './roles.service.js';

export const getRoles: RequestHandler = async (_req, res, next) => {
  try {
    const roles = await listRoles();
    res.status(200).json(buildSuccessResponse(roles));
  } catch (error) {
    next(error);
  }
};
