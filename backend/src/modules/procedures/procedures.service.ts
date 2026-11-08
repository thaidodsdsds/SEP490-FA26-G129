import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  CalibrationProcedure,
  ProcedureParameter,
  ProcedureStep,
  ProcedureTestPoint,
  ServiceType,
} from '../../database/entities.js';

export interface ProcedureFilter {
  service_type_id?: number;
  status?: string;
  search?: string;
}

export interface CreateProcedureInput {
  service_type_id: number;
  version: string;
  environment_requirement?: Record<string, unknown> | null;
  required_equipment?: Record<string, unknown> | null;
  effective_from?: string | null;
  status?: string;
}

export interface CreateStepInput {
  step_no: number;
  instruction: string;
  requires_evidence?: boolean;
}

export interface CreateParameterInput {
  name: string;
  unit: string;
  repeat_count?: number;
  calculation_method?: string;
}

export interface CreateTestPointInput {
  point_no: number;
  nominal_value: number;
  tolerance?: number | null;
  max_uncertainty?: number | null;
}

export const listProcedures = async (filters?: ProcedureFilter) => {
  const repo = dataSource.getRepository(CalibrationProcedure);
  const qb = repo
    .createQueryBuilder('proc')
    .leftJoinAndSelect('proc.service_type', 'st')
    .leftJoinAndSelect('proc.steps', 'step')
    .leftJoinAndSelect('proc.parameters', 'param')
    .orderBy('proc.id', 'DESC')
    .addOrderBy('step.step_no', 'ASC');

  if (filters?.service_type_id) {
    qb.andWhere('proc.service_type_id = :stId', { stId: filters.service_type_id });
  }

  if (filters?.status && filters.status !== 'all') {
    qb.andWhere('proc.status = :status', { status: filters.status });
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(proc.version) LIKE :term OR LOWER(st.name) LIKE :term OR LOWER(st.standard_code) LIKE :term)',
      { term },
    );
  }

  return await qb.getMany();
};

export const getProcedureById = async (id: number) => {
  const repo = dataSource.getRepository(CalibrationProcedure);
  const procedure = await repo.findOne({
    where: { id },
    relations: {
      service_type: true,
      steps: true,
      parameters: {
        test_points: true,
      },
    },
    order: {
      steps: { step_no: 'ASC' },
      parameters: {
        id: 'ASC',
        test_points: { point_no: 'ASC' },
      },
    },
  });

  if (!procedure) {
    throw new AppError('Calibration procedure not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  return procedure;
};

export const createProcedure = async (input: CreateProcedureInput) => {
  const procRepo = dataSource.getRepository(CalibrationProcedure);
  const stRepo = dataSource.getRepository(ServiceType);

  const serviceType = await stRepo.findOne({ where: { id: input.service_type_id } });
  if (!serviceType) {
    throw new AppError('Service type not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (!input.version || !input.version.trim()) {
    throw new AppError('Version is required (e.g. V1.0).', 400, ERROR_CODES.BAD_REQUEST);
  }

  const existingVersion = await procRepo.findOne({
    where: { service_type_id: input.service_type_id, version: input.version.trim() },
  });
  if (existingVersion) {
    throw new AppError(
      `Version ${input.version} already exists for this service type.`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const newProc = procRepo.create({
    service_type_id: input.service_type_id,
    version: input.version.trim(),
    environment_requirement: input.environment_requirement || null,
    required_equipment: input.required_equipment || null,
    effective_from: input.effective_from || null,
    status: 'Draft',
  });

  return await procRepo.save(newProc);
};

export const updateProcedure = async (
  id: number,
  input: Partial<CreateProcedureInput>,
) => {
  const repo = dataSource.getRepository(CalibrationProcedure);
  const procedure = await repo.findOne({ where: { id } });

  if (!procedure) {
    throw new AppError('Procedure not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (procedure.status !== 'Draft') {
    throw new AppError(
      'Cannot edit procedure that is not in Draft status. Create a new version instead (FR-A7).',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  if (input.version && input.version.trim() !== procedure.version) {
    const duplicate = await repo.findOne({
      where: { service_type_id: procedure.service_type_id, version: input.version.trim() },
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError('Version already exists for this service type.', 400, ERROR_CODES.BAD_REQUEST);
    }
    procedure.version = input.version.trim();
  }

  if (input.environment_requirement !== undefined)
    procedure.environment_requirement = input.environment_requirement;
  if (input.required_equipment !== undefined)
    procedure.required_equipment = input.required_equipment;
  if (input.effective_from !== undefined)
    procedure.effective_from = input.effective_from;

  return await repo.save(procedure);
};

/**
 * Phát hành quy trình (Draft -> Active). Bản Active cũ của cùng service_type_id sẽ chuyển Obsolete.
 */
export const publishProcedure = async (id: number) => {
  const repo = dataSource.getRepository(CalibrationProcedure);
  const procedure = await repo.findOne({
    where: { id },
    relations: { steps: true, parameters: { test_points: true } },
  });

  if (!procedure) {
    throw new AppError('Procedure not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (procedure.status === 'Active') {
    return procedure;
  }

  if (!procedure.steps || procedure.steps.length === 0) {
    throw new AppError(
      'Cannot publish procedure without any Procedure Steps.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // Chuyển bản Active cũ sang Obsolete
  await repo
    .createQueryBuilder()
    .update(CalibrationProcedure)
    .set({ status: 'Obsolete' })
    .where('service_type_id = :stId AND status = :activeStatus AND id != :currentId', {
      stId: procedure.service_type_id,
      activeStatus: 'Active',
      currentId: id,
    })
    .execute();

  procedure.status = 'Active';
  if (!procedure.effective_from) {
    procedure.effective_from = new Date().toISOString().split('T')[0];
  }

  return await repo.save(procedure);
};

/**
 * Nhân bản tạo version mới từ bản quy trình hiện tại (Draft mới)
 */
export const cloneProcedure = async (id: number, nextVersion?: string) => {
  const repo = dataSource.getRepository(CalibrationProcedure);
  const original = await getProcedureById(id);

  let versionToUse = nextVersion?.trim();
  if (!versionToUse) {
    const match = original.version.match(/V?(\d+)(?:\.(\d+))?/i);
    if (match) {
      const major = Number(match[1]);
      const minor = Number(match[2] ?? 0);
      versionToUse = `V${major}.${minor + 1}`;
    } else {
      versionToUse = `${original.version}-new`;
    }
  }

  const newProc = repo.create({
    service_type_id: original.service_type_id,
    version: versionToUse,
    environment_requirement: original.environment_requirement,
    required_equipment: original.required_equipment,
    effective_from: null,
    status: 'Draft',
  });
  const savedProc = await repo.save(newProc);

  // Copy steps
  const stepRepo = dataSource.getRepository(ProcedureStep);
  for (const s of original.steps) {
    const newStep = stepRepo.create({
      procedure_id: savedProc.id,
      step_no: s.step_no,
      instruction: s.instruction,
      requires_evidence: s.requires_evidence,
    });
    await stepRepo.save(newStep);
  }

  // Copy parameters & test points
  const paramRepo = dataSource.getRepository(ProcedureParameter);
  const tpRepo = dataSource.getRepository(ProcedureTestPoint);
  for (const p of original.parameters) {
    const newParam = paramRepo.create({
      procedure_id: savedProc.id,
      name: p.name,
      unit: p.unit,
      repeat_count: p.repeat_count,
      calculation_method: p.calculation_method,
    });
    const savedParam = await paramRepo.save(newParam);

    if (p.test_points && p.test_points.length > 0) {
      for (const tp of p.test_points) {
        const newTp = tpRepo.create({
          parameter_id: savedParam.id,
          point_no: tp.point_no,
          nominal_value: tp.nominal_value,
          tolerance: tp.tolerance,
          max_uncertainty: tp.max_uncertainty,
        });
        await tpRepo.save(newTp);
      }
    }
  }

  return await getProcedureById(savedProc.id);
};

// ==================== STEPS CRUD ====================

export const addStep = async (procedureId: number, input: CreateStepInput) => {
  const procRepo = dataSource.getRepository(CalibrationProcedure);
  const stepRepo = dataSource.getRepository(ProcedureStep);

  const proc = await procRepo.findOne({ where: { id: procedureId } });
  if (!proc) throw new AppError('Procedure not found.', 404, ERROR_CODES.NOT_FOUND);
  if (proc.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const step = stepRepo.create({
    procedure_id: procedureId,
    step_no: input.step_no,
    instruction: input.instruction.trim(),
    requires_evidence: Boolean(input.requires_evidence),
  });
  return await stepRepo.save(step);
};

export const updateStep = async (stepId: number, input: Partial<CreateStepInput>) => {
  const stepRepo = dataSource.getRepository(ProcedureStep);
  const step = await stepRepo.findOne({ where: { id: stepId }, relations: { procedure: true } });
  if (!step) throw new AppError('Step not found.', 404, ERROR_CODES.NOT_FOUND);
  if (step.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  if (input.step_no !== undefined) step.step_no = input.step_no;
  if (input.instruction !== undefined) step.instruction = input.instruction.trim();
  if (input.requires_evidence !== undefined) step.requires_evidence = input.requires_evidence;

  return await stepRepo.save(step);
};

export const deleteStep = async (stepId: number) => {
  const stepRepo = dataSource.getRepository(ProcedureStep);
  const step = await stepRepo.findOne({ where: { id: stepId }, relations: { procedure: true } });
  if (!step) throw new AppError('Step not found.', 404, ERROR_CODES.NOT_FOUND);
  if (step.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }
  await stepRepo.delete(stepId);
  return { success: true };
};

// ==================== PARAMETERS CRUD ====================

export const addParameter = async (procedureId: number, input: CreateParameterInput) => {
  const procRepo = dataSource.getRepository(CalibrationProcedure);
  const paramRepo = dataSource.getRepository(ProcedureParameter);

  const proc = await procRepo.findOne({ where: { id: procedureId } });
  if (!proc) throw new AppError('Procedure not found.', 404, ERROR_CODES.NOT_FOUND);
  if (proc.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const param = paramRepo.create({
    procedure_id: procedureId,
    name: input.name.trim(),
    unit: input.unit.trim(),
    repeat_count: input.repeat_count || 1,
    calculation_method: input.calculation_method?.trim() || 'mean',
  });
  return await paramRepo.save(param);
};

export const updateParameter = async (paramId: number, input: Partial<CreateParameterInput>) => {
  const paramRepo = dataSource.getRepository(ProcedureParameter);
  const param = await paramRepo.findOne({ where: { id: paramId }, relations: { procedure: true } });
  if (!param) throw new AppError('Parameter not found.', 404, ERROR_CODES.NOT_FOUND);
  if (param.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  if (input.name) param.name = input.name.trim();
  if (input.unit) param.unit = input.unit.trim();
  if (input.repeat_count) param.repeat_count = input.repeat_count;
  if (input.calculation_method) param.calculation_method = input.calculation_method.trim();

  return await paramRepo.save(param);
};

export const deleteParameter = async (paramId: number) => {
  const paramRepo = dataSource.getRepository(ProcedureParameter);
  const param = await paramRepo.findOne({ where: { id: paramId }, relations: { procedure: true } });
  if (!param) throw new AppError('Parameter not found.', 404, ERROR_CODES.NOT_FOUND);
  if (param.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }
  await paramRepo.delete(paramId);
  return { success: true };
};

// ==================== TEST POINTS CRUD ====================

export const addTestPoint = async (parameterId: number, input: CreateTestPointInput) => {
  const paramRepo = dataSource.getRepository(ProcedureParameter);
  const tpRepo = dataSource.getRepository(ProcedureTestPoint);

  const param = await paramRepo.findOne({ where: { id: parameterId }, relations: { procedure: true } });
  if (!param) throw new AppError('Parameter not found.', 404, ERROR_CODES.NOT_FOUND);
  if (param.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const point = tpRepo.create({
    parameter_id: parameterId,
    point_no: input.point_no,
    nominal_value: input.nominal_value,
    tolerance: input.tolerance ?? null,
    max_uncertainty: input.max_uncertainty ?? null,
  });
  return await tpRepo.save(point);
};

export const updateTestPoint = async (pointId: number, input: Partial<CreateTestPointInput>) => {
  const tpRepo = dataSource.getRepository(ProcedureTestPoint);
  const point = await tpRepo.findOne({
    where: { id: pointId },
    relations: { parameter: { procedure: true } },
  });
  if (!point) throw new AppError('Test point not found.', 404, ERROR_CODES.NOT_FOUND);
  if (point.parameter.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }

  if (input.point_no !== undefined) point.point_no = input.point_no;
  if (input.nominal_value !== undefined) point.nominal_value = input.nominal_value;
  if (input.tolerance !== undefined) point.tolerance = input.tolerance;
  if (input.max_uncertainty !== undefined) point.max_uncertainty = input.max_uncertainty;

  return await tpRepo.save(point);
};

export const deleteTestPoint = async (pointId: number) => {
  const tpRepo = dataSource.getRepository(ProcedureTestPoint);
  const point = await tpRepo.findOne({
    where: { id: pointId },
    relations: { parameter: { procedure: true } },
  });
  if (!point) throw new AppError('Test point not found.', 404, ERROR_CODES.NOT_FOUND);
  if (point.parameter.procedure.status !== 'Draft') {
    throw new AppError('Cannot modify non-draft procedure.', 400, ERROR_CODES.BAD_REQUEST);
  }
  await tpRepo.delete(pointId);
  return { success: true };
};
