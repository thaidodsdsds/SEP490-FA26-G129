import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import { ServiceType } from '../../database/entities.js';

export const ALLOWED_FIELDS = [
  'DIEN',
  'KHOILUONG',
  'DODAI',
  'APSUAT',
  'NHIET',
  'HOA',
  'QUANG',
  'DET',
] as const;

export const ALLOWED_KINDS = ['Calibration', 'Verification', 'Repair'] as const;

export interface ServiceTypeWithValidation {
  id: number;
  name: string;
  kind: string;
  field: string;
  standard_code: string;
  measuring_range: string | null;
  description: string | null;
  status: string;
  active_procedure: boolean;
  procedure_version: string | null;
  procedures_count: number;
  is_valid: boolean;
  blocked_reason: string | null;
  errors: string[];
}

export interface ServiceTypeFilter {
  field?: string;
  kind?: string;
  status?: string;
  search?: string;
}

export interface CreateServiceTypeInput {
  name: string;
  kind: string;
  field: string;
  standard_code: string;
  measuring_range?: string | null;
  description?: string | null;
  status?: string;
}

export const buildServiceTypeValidation = (
  serviceType: Pick<
    ServiceType,
    | 'id'
    | 'name'
    | 'kind'
    | 'field'
    | 'standard_code'
    | 'measuring_range'
    | 'description'
    | 'status'
  > & {
    calibration_procedures?: Array<{
      id: number;
      version: string;
      status: string;
    }>;
  },
): ServiceTypeWithValidation => {
  const procedures = serviceType.calibration_procedures ?? [];
  const activeProcedure = procedures.find((proc) => proc.status === 'Active') ?? null;
  const errors: string[] = [];

  if (serviceType.status !== 'Active') {
    errors.push('Dịch vụ hiện chưa Active.');
  }

  if (procedures.length === 0) {
    errors.push('Chưa có quy trình kỹ thuật.');
  } else if (!activeProcedure) {
    errors.push('Chưa có quy trình kỹ thuật Active.');
  }

  return {
    id: serviceType.id,
    name: serviceType.name,
    kind: serviceType.kind,
    field: serviceType.field,
    standard_code: serviceType.standard_code,
    measuring_range: serviceType.measuring_range ?? null,
    description: serviceType.description ?? null,
    status: serviceType.status,
    active_procedure: Boolean(activeProcedure),
    procedure_version: activeProcedure?.version ?? null,
    procedures_count: procedures.length,
    is_valid: errors.length === 0,
    blocked_reason: errors.length > 0 ? errors[0] : null,
    errors,
  };
};

/**
 * Lấy danh sách ServiceType có lọc theo Lĩnh vực, kind, status, tìm kiếm
 */
export const listServiceTypes = async (
  filters?: ServiceTypeFilter,
): Promise<ServiceTypeWithValidation[]> => {
  const repo = dataSource.getRepository(ServiceType);
  const qb = repo
    .createQueryBuilder('st')
    .leftJoinAndSelect('st.calibration_procedures', 'proc')
    .orderBy('st.name', 'ASC')
    .addOrderBy('st.id', 'ASC');

  if (filters?.field && filters.field !== 'all') {
    qb.andWhere('st.field = :field', { field: filters.field });
  }

  if (filters?.kind && filters.kind !== 'all') {
    qb.andWhere('st.kind = :kind', { kind: filters.kind });
  }

  if (filters?.status && filters.status !== 'all') {
    qb.andWhere('st.status = :status', { status: filters.status });
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(st.name) LIKE :term OR LOWER(st.standard_code) LIKE :term OR LOWER(st.field) LIKE :term)',
      { term },
    );
  }

  const serviceTypes = await qb.getMany();
  return serviceTypes.map(buildServiceTypeValidation);
};

export const getServiceTypeById = async (
  id: number,
): Promise<ServiceTypeWithValidation> => {
  const serviceType = await dataSource.getRepository(ServiceType).findOne({
    where: { id },
    relations: {
      calibration_procedures: true,
    },
  });

  if (!serviceType) {
    throw new AppError('Service type not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  return buildServiceTypeValidation(serviceType);
};

export const createServiceType = async (
  input: CreateServiceTypeInput,
): Promise<ServiceType> => {
  const repo = dataSource.getRepository(ServiceType);

  if (!input.name || !input.name.trim()) {
    throw new AppError('Service type name is required.', 400, ERROR_CODES.BAD_REQUEST);
  }
  if (!input.standard_code || !input.standard_code.trim()) {
    throw new AppError('Standard code is required.', 400, ERROR_CODES.BAD_REQUEST);
  }
  if (!ALLOWED_FIELDS.includes(input.field as (typeof ALLOWED_FIELDS)[number])) {
    throw new AppError(
      `Invalid field. Allowed values: ${ALLOWED_FIELDS.join(', ')}`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }
  if (!ALLOWED_KINDS.includes(input.kind as (typeof ALLOWED_KINDS)[number])) {
    throw new AppError(
      `Invalid kind. Allowed values: ${ALLOWED_KINDS.join(', ')}`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const existingCode = await repo.findOne({
    where: { standard_code: input.standard_code.trim() },
  });
  if (existingCode) {
    throw new AppError(
      `Standard code "${input.standard_code}" already exists.`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const newServiceType = repo.create({
    name: input.name.trim(),
    kind: input.kind,
    field: input.field,
    standard_code: input.standard_code.trim(),
    measuring_range: input.measuring_range?.trim() || null,
    description: input.description?.trim() || null,
    status: input.status === 'Inactive' ? 'Inactive' : 'Active',
  });

  return await repo.save(newServiceType);
};

export const updateServiceType = async (
  id: number,
  input: Partial<CreateServiceTypeInput>,
): Promise<ServiceType> => {
  const repo = dataSource.getRepository(ServiceType);
  const existing = await repo.findOne({ where: { id } });

  if (!existing) {
    throw new AppError('Service type not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (input.field && !ALLOWED_FIELDS.includes(input.field as (typeof ALLOWED_FIELDS)[number])) {
    throw new AppError(`Invalid field.`, 400, ERROR_CODES.BAD_REQUEST);
  }
  if (input.kind && !ALLOWED_KINDS.includes(input.kind as (typeof ALLOWED_KINDS)[number])) {
    throw new AppError(`Invalid kind.`, 400, ERROR_CODES.BAD_REQUEST);
  }

  if (input.standard_code && input.standard_code.trim() !== existing.standard_code) {
    const duplicate = await repo.findOne({
      where: { standard_code: input.standard_code.trim() },
    });
    if (duplicate && duplicate.id !== id) {
      throw new AppError('Standard code already exists.', 400, ERROR_CODES.BAD_REQUEST);
    }
    existing.standard_code = input.standard_code.trim();
  }

  if (input.name) existing.name = input.name.trim();
  if (input.kind) existing.kind = input.kind;
  if (input.field) existing.field = input.field;
  if (input.measuring_range !== undefined) existing.measuring_range = input.measuring_range;
  if (input.description !== undefined) existing.description = input.description;
  if (input.status) existing.status = input.status;

  return await repo.save(existing);
};

export const validateServiceTypeById = async (
  serviceTypeId: number,
): Promise<ServiceTypeWithValidation> => {
  const serviceType = await dataSource.getRepository(ServiceType).findOne({
    select: {
      id: true,
      name: true,
      kind: true,
      field: true,
      standard_code: true,
      measuring_range: true,
      description: true,
      status: true,
      calibration_procedures: {
        id: true,
        version: true,
        status: true,
      },
    },
    where: { id: serviceTypeId },
    relations: {
      calibration_procedures: true,
    },
  });

  if (!serviceType) {
    throw new AppError('Service type not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const validated = buildServiceTypeValidation(serviceType);

  if (!validated.is_valid) {
    throw new AppError(
      validated.blocked_reason ?? 'Service type is not valid.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
      { errors: validated.errors },
    );
  }

  return validated;
};
