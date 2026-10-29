import { In } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Account,
  Attachment,
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

export interface CreateServiceRequestAttachmentInput {
  file_name: string;
  file_url: string;
}

export const REQUEST_CODE_REGEX = /^SR-\d{4}-\d{3,}$/;

export interface CreateServiceRequestInput {
  request_code?: string | null;
  customer_id: number;
  created_by: number;
  location_type: ServiceRequestLocationType;
  preferred_date?: string | null;
  items: CreateServiceRequestItemInput[];
  attachments?: CreateServiceRequestAttachmentInput[];
}

export interface CreatedServiceRequestAttachmentResult {
  id: number;
  service_request_id: number;
  file_name: string;
  file_url: string;
  uploaded_at: Date;
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
  request_code: string;
  customer_id: number;
  created_by: number;
  location_type: string;
  preferred_date: string | null;
  status: string;
  created_at: Date;
  items: CreatedServiceRequestItemResult[];
  attachments?: CreatedServiceRequestAttachmentResult[];
}

export interface ServiceRequestCustomerInfo {
  id: number;
  company_name: string;
  tax_code: string | null;
  address: string;
}

export interface ServiceRequestItemSummary {
  id: number;
  service_request_item_id: number;
  device_id: number;
  device_name: string;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  internal_code: string | null;
  service_type_id: number;
  service_type_name: string;
  service_kind: string;
  standard_code: string | null;
  status: string;
}

export interface ServiceRequestQuotationSummary {
  id: number;
  quotation_code: string;
  subtotal: number;
  discount_amount: number;
  travel_fee: number;
  total_amount: number;
  estimated_completion_date: string | null;
  status: string;
  line_items: Array<{
    id: number;
    service_request_item_id: number;
    description: string;
    unit_price: number;
    discount_amount: number;
  }>;
}

export interface ServiceRequestSummary {
  id: number;
  request_code: string;
  location_type?: string;
  preferred_date?: string | null;
  status?: string;
  created_at?: Date;
  customer: ServiceRequestCustomerInfo;
  items?: ServiceRequestItemSummary[];
  latest_quotation?: ServiceRequestQuotationSummary | null;
}

export const formatServiceRequestCode = (
  id: number,
  date: Date = new Date(),
): string => {
  const year = date.getFullYear();
  return `SR-${year}-${String(id).padStart(3, '0')}`;
};

/**
 * Tìm customer_id liên kết với tài khoản Account hiện tại (hỗ trợ tài khoản khách hàng)
 */
export const resolveAccountCustomerId = async (accountId: number): Promise<number | null> => {
  const account = await dataSource.getRepository(Account).findOne({
    select: { id: true, customer_id: true },
    where: { id: accountId },
  });
  return account?.customer_id ?? null;
};

/**
 * Lấy danh sách các phiếu yêu cầu dịch vụ (id, request_code, location_type, status)
 * kèm thông tin khách hàng (id, company_name, tax_code, address) và các hạng mục dịch vụ (items)
 */
export const listServiceRequests = async (
  customerIdFilter?: number,
): Promise<ServiceRequestSummary[]> => {
  const requests = await dataSource.getRepository(ServiceRequest).find({
    ...(customerIdFilter ? { where: { customer_id: customerIdFilter } } : {}),
    select: {
      id: true,
      request_code: true,
      location_type: true,
      preferred_date: true,
      status: true,
      created_at: true,
      customer: {
        id: true,
        company_name: true,
        tax_code: true,
        address: true,
      },
      items: {
        id: true,
        device_id: true,
        service_type_id: true,
        status: true,
        device: {
          id: true,
          name: true,
          manufacturer: true,
          model: true,
          serial_number: true,
          internal_code: true,
        },
        service_type: {
          id: true,
          name: true,
          kind: true,
          standard_code: true,
        },
      },
      quotations: {
        id: true,
        subtotal: true,
        discount_amount: true,
        travel_fee: true,
        total_amount: true,
        estimated_completion_date: true,
        status: true,
        line_items: {
          id: true,
          service_request_item_id: true,
          description: true,
          unit_price: true,
          discount_amount: true,
        },
      },
    },
    relations: {
      customer: true,
      items: {
        device: true,
        service_type: true,
      },
      quotations: {
        line_items: true,
      },
    },
    order: {
      id: 'DESC',
    },
  });

  return requests.map((req) => {
    const sortedQuotations = Array.isArray(req.quotations)
      ? [...req.quotations].sort((a, b) => b.id - a.id)
      : null;
    const targetQuotation = sortedQuotations
      ? sortedQuotations.find((q) => q.status === 'Sent' || q.status === 'Approved')
        || sortedQuotations.find((q) => q.status === 'Draft')
        || sortedQuotations[0]
        || null
      : undefined;

    return {
      id: req.id,
      request_code:
        req.request_code
        || formatServiceRequestCode(
          req.id,
          req.created_at instanceof Date ? req.created_at : new Date(),
        ),
      ...(req.location_type ? { location_type: req.location_type } : {}),
      ...(req.preferred_date ? { preferred_date: String(req.preferred_date).slice(0, 10) } : {}),
      ...(req.status ? { status: req.status } : {}),
      customer: {
        id: req.customer.id,
        company_name: req.customer.company_name,
        tax_code: req.customer.tax_code ?? null,
        address: req.customer.address,
      },
      ...(Array.isArray(req.items)
        ? {
            items: req.items.map((item) => ({
              id: item.id,
              service_request_item_id: item.id,
              device_id: item.device_id,
              device_name: item.device?.name ?? `Thiết bị #${item.device_id}`,
              manufacturer: item.device?.manufacturer ?? null,
              model: item.device?.model ?? null,
              serial_number: item.device?.serial_number ?? null,
              internal_code: item.device?.internal_code ?? null,
              service_type_id: item.service_type_id,
              service_type_name: item.service_type?.name ?? `Dịch vụ #${item.service_type_id}`,
              service_kind: item.service_type?.kind ?? 'Calibration',
              standard_code: item.service_type?.standard_code ?? null,
              status: item.status,
            })),
          }
        : {}),
      ...(targetQuotation !== undefined
        ? {
            latest_quotation: targetQuotation
              ? {
                  id: targetQuotation.id,
                  quotation_code: `QT-${new Date().getFullYear()}-${String(targetQuotation.id).padStart(3, '0')}`,
                  subtotal: Number(targetQuotation.subtotal),
                  discount_amount: Number(targetQuotation.discount_amount),
                  travel_fee: Number(targetQuotation.travel_fee),
                  total_amount: Number(targetQuotation.total_amount),
                  estimated_completion_date: targetQuotation.estimated_completion_date ?? null,
                  status: targetQuotation.status,
                  line_items: (targetQuotation.line_items ?? []).map((li) => ({
                    id: li.id,
                    service_request_item_id: li.service_request_item_id,
                    description: li.description,
                    unit_price: Number(li.unit_price),
                    discount_amount: Number(li.discount_amount),
                  })),
                }
              : null,
          }
        : {}),
    };
  });
};

/**
 * Tạo phiếu yêu cầu dịch vụ (ServiceRequest) và danh sách hạng mục (ServiceRequestItem)
 * với đầy đủ bước kiểm tra khách hàng, quyền sở hữu thiết bị và tính hợp lệ của dịch vụ.
 */
export const createServiceRequest = async (
  input: CreateServiceRequestInput,
): Promise<CreatedServiceRequestResult> => {
  const {
    request_code: rawRequestCode,
    customer_id: customerId,
    created_by: createdBy,
    location_type: locationType,
    preferred_date: rawPreferredDate,
    items,
    attachments = [],
  } = input;
  const customRequestCode = rawRequestCode?.trim() || null;

  if (customRequestCode && !REQUEST_CODE_REGEX.test(customRequestCode)) {
    throw new AppError(
      'Invalid request_code format. Expected format: SR-YYYY-XXX (e.g. SR-2026-088).',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

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
      request_code: customRequestCode,
      customer_id: customerId,
      created_by: createdBy,
      location_type: locationType,
      preferred_date: rawPreferredDate ? rawPreferredDate.trim() : null,
      status: 'New',
    });

    const savedRequest = await serviceRequestRepo.save(serviceRequestEntity);
    const createdAtDate =
      savedRequest.created_at instanceof Date ? savedRequest.created_at : new Date();
    const requestCode =
      customRequestCode
      || savedRequest.request_code
      || formatServiceRequestCode(savedRequest.id, createdAtDate);

    if (savedRequest.request_code !== requestCode) {
      savedRequest.request_code = requestCode;
      await serviceRequestRepo.save(savedRequest);
    }

    const itemEntities = items.map((item) =>
      serviceRequestItemRepo.create({
        service_request_id: savedRequest.id,
        device_id: item.device_id,
        service_type_id: item.service_type_id,
        status: 'Pending',
      }),
    );

    const savedItems = await serviceRequestItemRepo.save(itemEntities);

    let savedAttachments: Attachment[] = [];
    if (attachments.length > 0) {
      const attachmentRepo = getRepository(Attachment);
      const attachmentEntities = attachments.map((att) =>
        attachmentRepo.create({
          service_request_id: savedRequest.id,
          file_name: att.file_name,
          file_url: att.file_url,
        }),
      );
      savedAttachments = await attachmentRepo.save(attachmentEntities);
    }

    return {
      id: savedRequest.id,
      request_code: requestCode,
      customer_id: savedRequest.customer_id,
      created_by: savedRequest.created_by,
      location_type: savedRequest.location_type,
      preferred_date: savedRequest.preferred_date
        ? String(savedRequest.preferred_date).slice(0, 10)
        : null,
      status: savedRequest.status,
      created_at: savedRequest.created_at,
      items: savedItems.map((savedItem) => ({
        id: savedItem.id,
        service_request_id: savedItem.service_request_id,
        device_id: savedItem.device_id,
        service_type_id: savedItem.service_type_id,
        status: savedItem.status,
      })),
      ...(savedAttachments.length > 0
        ? {
            attachments: savedAttachments.map((att) => ({
              id: att.id,
              service_request_id: att.service_request_id,
              file_name: att.file_name,
              file_url: att.file_url,
              uploaded_at: att.uploaded_at,
            })),
          }
        : {}),
    };
  };

  if (typeof dataSource.transaction === 'function') {
    return dataSource.transaction(async (manager) =>
      persistRequest(manager.getRepository.bind(manager)),
    );
  }

  return persistRequest(dataSource.getRepository.bind(dataSource));
};

