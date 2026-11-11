import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  getWorkOrderDetail,
  getWorkOrderLookups,
  listWorkOrders,
  updateWorkOrderAssignment,
  type UpdateAssignmentInput,
} from './work-orders.service.js';

const parseId = (value: unknown, field: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(`${field} không hợp lệ.`, 400, ERROR_CODES.VALIDATION_ERROR);
  }
  return id;
};

const getActorId = (req: Request): number => {
  const user =
    typeof req.user === 'object' && req.user !== null
      ? (req.user as { id?: unknown })
      : {};
  const id = Number(user.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('Không xác định được người dùng.', 401, ERROR_CODES.UNAUTHORIZED);
  }
  return id;
};

export const listWorkOrdersHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workOrders = await listWorkOrders();
    res.status(200).json(buildSuccessResponse(workOrders));
  } catch (error) {
    next(error);
  }
};

export const getWorkOrderDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workOrderId = parseId(req.params.workOrderId, 'workOrderId');
    const workOrder = await getWorkOrderDetail(workOrderId);
    res.status(200).json(buildSuccessResponse(workOrder));
  } catch (error) {
    next(error);
  }
};

export const getWorkOrderLookupsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const lookups = await getWorkOrderLookups();
    res.status(200).json(buildSuccessResponse(lookups));
  } catch (error) {
    next(error);
  }
};

export const updateWorkOrderAssignmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workOrderId = parseId(req.params.workOrderId, 'workOrderId');
    const assignmentId = parseId(req.params.assignmentId, 'assignmentId');
    const actorId = getActorId(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input: UpdateAssignmentInput = {};

    if (Object.prototype.hasOwnProperty.call(body, 'technician_id')) {
      input.technician_id =
        body.technician_id === null || body.technician_id === ''
          ? null
          : Number(body.technician_id);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'standard_name')) {
      input.standard_name =
        body.standard_name === null ? null : String(body.standard_name);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'scheduled_start')) {
      input.scheduled_start =
        body.scheduled_start === null || body.scheduled_start === ''
          ? null
          : String(body.scheduled_start);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'scheduled_end')) {
      input.scheduled_end =
        body.scheduled_end === null || body.scheduled_end === ''
          ? null
          : String(body.scheduled_end);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      input.notes = body.notes === null ? null : String(body.notes);
    }

    const workOrder = await updateWorkOrderAssignment(
      workOrderId,
      assignmentId,
      input,
      actorId,
    );
    res.status(200).json(buildSuccessResponse(workOrder));
  } catch (error) {
    next(error);
  }
};
