import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  deleteWorkOrderAssignment,
  getAssignmentResources,
  getInitialInspection,
  getPendingInspectionConsents,
  getProcedureExecution,
  getTechnicianTasks,
  getWorkOrderAssignmentsList,
  getWorkOrderDetail,
  listDigitalSignatures,
  listWorkOrders,
  saveCalibrationRecord,
  saveInitialInspection,
  saveWorkOrderAssignment,
  submitInspectionConsent,
  syncTechnicianTasks,
  updateWorkOrderStatus,
  verifyCalibrationSignature,
  type WorkOrderStatus,
} from './work-orders.service.js';

export const listWorkOrdersHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { search, status, location_type, contract_id, quotation_id } = req.query;

    const result = await listWorkOrders({
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      location_type: typeof location_type === 'string' ? location_type : undefined,
      contract_id: contract_id ? Number(contract_id) : undefined,
      quotation_id: quotation_id ? Number(quotation_id) : undefined,
    });

    res.status(200).json(buildSuccessResponse(result));
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
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError(
        'Mã Work Order không hợp lệ',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const result = await getWorkOrderDetail(id);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const updateWorkOrderStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError(
        'Mã Work Order không hợp lệ',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const { status } = req.body;
    if (!status) {
      throw new AppError(
        'Vui lòng cung cấp trạng thái mới cho Work Order',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const result = await updateWorkOrderStatus(id, status as WorkOrderStatus);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getAssignmentResourcesHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getAssignmentResources();
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getWorkOrderAssignmentsListHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await getWorkOrderAssignmentsList();
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const saveWorkOrderAssignmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const assignedById = (req.user as { id?: number })?.id || 1;
    const {
      work_order_id,
      service_request_item_id,
      technician_id,
      master_standard_id,
      scheduled_start,
      scheduled_end,
      status,
    } = req.body;

    const result = await saveWorkOrderAssignment(
      {
        work_order_id: Number(work_order_id),
        service_request_item_id: Number(service_request_item_id),
        technician_id: Number(technician_id),
        master_standard_id: Number(master_standard_id),
        scheduled_start,
        scheduled_end,
        status,
      },
      assignedById,
    );

    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const deleteWorkOrderAssignmentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError(
        'Mã phân công không hợp lệ',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const result = await deleteWorkOrderAssignment(id);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getTechnicianTasksHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const technicianId = (req.user as { id?: number })?.id;
    const showAll = req.query.all === 'true';
    const idToFilter = showAll ? undefined : technicianId;
    const tasks = await getTechnicianTasks(idToFilter);
    res.status(200).json(buildSuccessResponse(tasks));
  } catch (error) {
    next(error);
  }
};

export const syncTechnicianTasksHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const technicianId = (req.user as { id?: number })?.id || 1;
    const result = await syncTechnicianTasks(req.body, technicianId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const saveInitialInspectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const technicianId = (req.user as { id?: number })?.id || 1;
    const result = await saveInitialInspection(req.body, technicianId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getInitialInspectionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const serviceRequestItemId = Number(req.params.serviceRequestItemId);
    if (!serviceRequestItemId || Number.isNaN(serviceRequestItemId) || serviceRequestItemId <= 0) {
      throw new AppError(
        'Mã service_request_item_id không hợp lệ',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }
    const result = await getInitialInspection(serviceRequestItemId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const submitInspectionConsentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user as {
      id: number;
      role?: string;
      customer_id?: number | null;
      full_name?: string;
    };
    if (!user || !user.id) {
      throw new AppError('Chưa xác thực người dùng', 401, ERROR_CODES.UNAUTHORIZED);
    }
    const result = await submitInspectionConsent(req.body, user);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getPendingInspectionConsentsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user as {
      id: number;
      role?: string;
      customer_id?: number | null;
    };
    if (!user || !user.id) {
      throw new AppError('Chưa xác thực người dùng', 401, ERROR_CODES.UNAUTHORIZED);
    }
    const result = await getPendingInspectionConsents(user);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const getProcedureExecutionHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const serviceRequestItemId = Number(req.params.serviceRequestItemId);
    if (!serviceRequestItemId || Number.isNaN(serviceRequestItemId) || serviceRequestItemId <= 0) {
      throw new AppError(
        'Mã service_request_item_id không hợp lệ',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }
    const result = await getProcedureExecution(serviceRequestItemId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const saveCalibrationRecordHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const technicianId = (req.user as { id?: number })?.id || 1;
    const result = await saveCalibrationRecord(req.body, technicianId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const verifyCalibrationSignatureHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const serviceRequestItemId = Number(req.params.serviceRequestItemId);
    const result = await verifyCalibrationSignature(serviceRequestItemId);
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};

export const listDigitalSignaturesHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await listDigitalSignatures();
    res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
};




