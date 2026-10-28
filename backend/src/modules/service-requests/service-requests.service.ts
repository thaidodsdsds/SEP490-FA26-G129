import { In } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Customer,
  Device,
  ServiceRequest,
  ServiceRequestItem,
  ServiceType,
} from '../../database/entities.js';
import { buildServiceTypeValidation } from '../service-types/service-types.service.js';

export const ALLOWED_LOCATION_TYPES = ['In-lab', 'On-site'] as const;
export type ServiceRequestLocationType = (typeof ALLOWED_LOCATION_TYPES)[number];

export interface CreateServiceRequestItemInput {
  device_id: number;
  service_type_id: number;
}

export interface CreateServiceRequestInput {
  customer_id: number;
  created_by: number;
  location_type: ServiceRequestLocationType;
  items: CreateServiceRequestItemInput[];
}

export interface CreatedServiceRequestItemResult {
  id: number;
  service_request_id: number;
  device_id: number;
  service_type_id: number;
  status: string;
}

export interface CreatedServiceRequestResult {
  id: number;
  customer_id: number;
  created_by: number;
  location_type: string;
  status: string;
  created_at: Date;
  items: CreatedServiceRequestItemResult[];
}

/**
 * Tạo phiếu yêu cầu dịch vụ (ServiceRequest) và danh sách hạng mục (ServiceRequestItem)
 * với đầy đủ bước kiểm tra khách hàng, quyền sở hữu thiết bị và tính hợp lệ của dịch vụ.
 */
export const createServiceRequest = async (
  input: CreateServiceRequestInput,
): Promise<CreatedServiceRequestResult> => {
  const { customer_id: customerId, created_by: createdBy, location_type: locationType, items } = input;

  // 1. Kiểm tra khách hàng tồn tại
  const customerRepo = dataSource.getRepository(Customer);
  const customer = await customerRepo.findOne({
    select: { id: true },
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError('Customer not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  // 2. Kiểm tra tất cả thiết bị tồn tại và thuộc về đúng khách hàng
  const uniqueDeviceIds = [...new Set(items.map((item) => item.device_id))];
  const deviceRepo = dataSource.getRepository(Device);
  const devices = await deviceRepo.find({
    select: {
      id: true,
      customer_id: true,
      name: true,
    },
    where: {
      id: In(uniqueDeviceIds),
    },
  });

  if (devices.length !== uniqueDeviceIds.length) {
    const foundIds = new Set(devices.map((device) => device.id));
    const missingDeviceIds = uniqueDeviceIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      'One or more devices were not found.',
      404,
      ERROR_CODES.NOT_FOUND,
      { missing_device_ids: missingDeviceIds },
    );
  }

  const invalidOwnerDevices = devices.filter(
    (device) => device.customer_id !== customerId,
  );
  if (invalidOwnerDevices.length > 0) {
    throw new AppError(
      'All selected devices must belong to the specified customer.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
      {
        invalid_device_ids: invalidOwnerDevices.map((device) => device.id),
      },
    );
  }

  // 3. Kiểm tra tất cả loại dịch vụ tồn tại, đang Active và có quy trình kỹ thuật Active
  const uniqueServiceTypeIds = [...new Set(items.map((item) => item.service_type_id))];
  const serviceTypeRepo = dataSource.getRepository(ServiceType);
  const serviceTypes = await serviceTypeRepo.find({
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
    where: {
      id: In(uniqueServiceTypeIds),
    },
    relations: {
      calibration_procedures: true,
    },
  });

  if (serviceTypes.length !== uniqueServiceTypeIds.length) {
    const foundServiceTypeIds = new Set(serviceTypes.map((st) => st.id));
    const missingServiceTypeIds = uniqueServiceTypeIds.filter(
      (id) => !foundServiceTypeIds.has(id),
    );
    throw new AppError(
      'One or more service types were not found.',
      404,
      ERROR_CODES.NOT_FOUND,
      { missing_service_type_ids: missingServiceTypeIds },
    );
  }

  const validatedServiceTypes = serviceTypes.map(buildServiceTypeValidation);
  const invalidServiceTypes = validatedServiceTypes.filter((st) => !st.is_valid);

  if (invalidServiceTypes.length > 0) {
    const firstInvalid = invalidServiceTypes[0];
    throw new AppError(
      `Dịch vụ "${firstInvalid.name}" không hợp lệ: ${firstInvalid.blocked_reason}`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
      {
        invalid_service_types: invalidServiceTypes.map((st) => ({
          id: st.id,
          name: st.name,
          errors: st.errors,
        })),
      },
    );
  }

  // 4. Lưu phiếu yêu cầu và các hạng mục dịch vụ
  const persistRequest = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<CreatedServiceRequestResult> => {
    const serviceRequestRepo = getRepository(ServiceRequest);
    const serviceRequestItemRepo = getRepository(ServiceRequestItem);

    const serviceRequestEntity = serviceRequestRepo.create({
      customer_id: customerId,
      created_by: createdBy,
      location_type: locationType,
      status: 'New',
    });

    const savedRequest = await serviceRequestRepo.save(serviceRequestEntity);

    const itemEntities = items.map((item) =>
      serviceRequestItemRepo.create({
        service_request_id: savedRequest.id,
        device_id: item.device_id,
        service_type_id: item.service_type_id,
        status: 'Pending',
      }),
    );

    const savedItems = await serviceRequestItemRepo.save(itemEntities);

    return {
      id: savedRequest.id,
      customer_id: savedRequest.customer_id,
      created_by: savedRequest.created_by,
      location_type: savedRequest.location_type,
      status: savedRequest.status,
      created_at: savedRequest.created_at,
      items: savedItems.map((savedItem) => ({
        id: savedItem.id,
        service_request_id: savedItem.service_request_id,
        device_id: savedItem.device_id,
        service_type_id: savedItem.service_type_id,
        status: savedItem.status,
      })),
    };
  };

  if (typeof dataSource.transaction === 'function') {
    return dataSource.transaction(async (manager) =>
      persistRequest(manager.getRepository.bind(manager)),
    );
  }

  return persistRequest(dataSource.getRepository.bind(dataSource));
};

