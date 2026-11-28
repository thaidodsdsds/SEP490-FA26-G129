import type { RequestHandler } from 'express';
import { buildSuccessResponse } from '../../common/response.js';
import { getDashboardOverview } from './dashboard.service.js';

export const getDashboardOverviewHandler: RequestHandler = async (req, res, next) => {
  try {
    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    const requestedRole = typeof req.query.role === 'string' ? req.query.role : undefined;
    const overview = await getDashboardOverview(authUser, requestedRole);

    return res.status(200).json(
      buildSuccessResponse({
        role: String(authUser.role ?? ''),
        generatedAt: new Date().toISOString(),
        ...overview,
      }),
    );
  } catch (error) {
    return next(error);
  }
};
