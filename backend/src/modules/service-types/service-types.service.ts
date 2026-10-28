import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import { ServiceType } from '../../database/entities.js';

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
  is_valid: boolean;
  blocked_reason: string | null;
  errors: string[];
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
    is_valid: errors.length === 0,
    blocked_reason: errors.length > 0 ? errors[0] : null,
    errors,
  };
};

/**
 * Lấy danh sách toàn bộ ServiceType kèm thông tin kiểm tra tính hợp lệ
 * (trạng thái Active của dịch vụ và quy trình kỹ thuật Active)
 */
export const listServiceTypes = async (): Promise<ServiceTypeWithValidation[]> => {
  const serviceTypes = await dataSource.getRepository(ServiceType).find({
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
    relations: {
      calibration_procedures: true,
    },
    order: {
      name: 'ASC',
      id: 'ASC',
    },
  });

  return serviceTypes.map(buildServiceTypeValidation);
};

/**
 * Kiểm tra chi tiết một ServiceType theo ID, ném lỗi nếu dịch vụ chưa Active hoặc chưa có quy trình Active
 */
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

