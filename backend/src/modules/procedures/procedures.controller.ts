import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  addParameter,
  addStep,
  addTestPoint,
  cloneProcedure,
  createProcedure,
  deleteParameter,
  deleteStep,
  deleteTestPoint,
  getProcedureById,
  listProcedures,
  publishProcedure,
  updateParameter,
  updateProcedure,
  updateStep,
  updateTestPoint,
} from './procedures.service.js';

export const getProceduresList: RequestHandler = async (req, res, next) => {
  try {
    const { service_type_id, status, search } = req.query as Record<string, string | undefined>;
    const data = await listProcedures({
      service_type_id: service_type_id ? Number(service_type_id) : undefined,
      status,
      search,
    });
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const getSingleProcedure: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid procedure ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const data = await getProcedureById(id);
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

export const postProcedure: RequestHandler = async (req, res, next) => {
  try {
    const { service_type_id, version, environment_requirement, required_equipment, effective_from } =
      req.body ?? {};
    const created = await createProcedure({
      service_type_id: Number(service_type_id),
      version,
      environment_requirement,
      required_equipment,
      effective_from,
    });
    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

export const putProcedure: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id || Number.isNaN(id) || id <= 0) {
      throw new AppError('Invalid procedure ID.', 400, ERROR_CODES.BAD_REQUEST);
    }
    const updated = await updateProcedure(id, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};

export const postPublishProcedure: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const published = await publishProcedure(id);
    return res.status(200).json(buildSuccessResponse(published));
  } catch (error) {
    return next(error);
  }
};

export const postCloneProcedure: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { next_version } = req.body ?? {};
    const cloned = await cloneProcedure(id, next_version);
    return res.status(201).json(buildSuccessResponse(cloned));
  } catch (error) {
    return next(error);
  }
};

// ==================== STEPS CONTROLLERS ====================

export const postStep: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { step_no, instruction, requires_evidence } = req.body ?? {};
    const step = await addStep(id, {
      step_no: Number(step_no),
      instruction,
      requires_evidence,
    });
    return res.status(201).json(buildSuccessResponse(step));
  } catch (error) {
    return next(error);
  }
};

export const putStep: RequestHandler = async (req, res, next) => {
  try {
    const stepId = Number(req.params.stepId);
    const step = await updateStep(stepId, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(step));
  } catch (error) {
    return next(error);
  }
};

export const removeStep: RequestHandler = async (req, res, next) => {
  try {
    const stepId = Number(req.params.stepId);
    await deleteStep(stepId);
    return res.status(200).json(buildSuccessResponse({ deleted: true }));
  } catch (error) {
    return next(error);
  }
};

// ==================== PARAMETERS CONTROLLERS ====================

export const postParameter: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, unit, repeat_count, calculation_method } = req.body ?? {};
    const param = await addParameter(id, {
      name,
      unit,
      repeat_count: repeat_count ? Number(repeat_count) : 1,
      calculation_method,
    });
    return res.status(201).json(buildSuccessResponse(param));
  } catch (error) {
    return next(error);
  }
};

export const putParameter: RequestHandler = async (req, res, next) => {
  try {
    const paramId = Number(req.params.paramId);
    const param = await updateParameter(paramId, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(param));
  } catch (error) {
    return next(error);
  }
};

export const removeParameter: RequestHandler = async (req, res, next) => {
  try {
    const paramId = Number(req.params.paramId);
    await deleteParameter(paramId);
    return res.status(200).json(buildSuccessResponse({ deleted: true }));
  } catch (error) {
    return next(error);
  }
};

// ==================== TEST POINTS CONTROLLERS ====================

export const postTestPoint: RequestHandler = async (req, res, next) => {
  try {
    const paramId = Number(req.params.paramId);
    const { point_no, nominal_value, tolerance, max_uncertainty } = req.body ?? {};
    const point = await addTestPoint(paramId, {
      point_no: Number(point_no),
      nominal_value: Number(nominal_value),
      tolerance: tolerance !== undefined && tolerance !== null ? Number(tolerance) : null,
      max_uncertainty: max_uncertainty !== undefined && max_uncertainty !== null ? Number(max_uncertainty) : null,
    });
    return res.status(201).json(buildSuccessResponse(point));
  } catch (error) {
    return next(error);
  }
};

export const putTestPoint: RequestHandler = async (req, res, next) => {
  try {
    const pointId = Number(req.params.pointId);
    const point = await updateTestPoint(pointId, req.body ?? {});
    return res.status(200).json(buildSuccessResponse(point));
  } catch (error) {
    return next(error);
  }
};

export const removeTestPoint: RequestHandler = async (req, res, next) => {
  try {
    const pointId = Number(req.params.pointId);
    await deleteTestPoint(pointId);
    return res.status(200).json(buildSuccessResponse({ deleted: true }));
  } catch (error) {
    return next(error);
  }
};
