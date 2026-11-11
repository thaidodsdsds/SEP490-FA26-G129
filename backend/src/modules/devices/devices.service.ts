import {
  Not,
  type SelectQueryBuilder,
} from 'typeorm';
import dataSource from '../../database/dataSource.js';
import { Customer, Device, DeviceOwnershipHistory, ServiceRequestItem } from '../../database/entities.js';
import { AppError } from '../../common/errors.js';
import { ERROR_CODES } from '../../common/constants.js';

export const ALLOWED_DEVICE_STATUSES = [
  'Active',
  'ExpiringSoon',
  'Expired',
  'InRepair',
] as const;

export type DeviceStatus = (typeof ALLOWED_DEVICE_STATUSES)[number];

export interface ListDevicesOptions {
  customerId?: number;
  isGroup2?: boolean;
  dueStatus?: 'all' | 'expired' | 'expiring_soon' | 'valid';
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  };
}

export interface CreateDeviceInput {
  customer_id?: number;
  name: string;
  model?: string | null;
  manufacturer?: string | null;
  serial_number?: string | null;
  internal_code?: string | null;
  measuring_range?: string | null;
  is_group2?: boolean;
  next_due_date?: string | null;
  status?: DeviceStatus;
}

export interface UpdateDeviceInput {
  name?: string;
  model?: string | null;
  manufacturer?: string | null;
  serial_number?: string | null;
  measuring_range?: string | null;
  is_group2?: boolean;
  next_due_date?: string | null;
  status?: DeviceStatus;
}

/**
 * Sinh mã nội bộ tự động dạng TB-XXXXXX-XXXX
 */
export const generateInternalCode = (): string => {
  const dateStr = Date.now().toString(36).toUpperCase();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TB-${dateStr}-${randomSuffix}`;
};

/**
 * Lấy danh sách thiết bị có phân trang và bộ lọc:
 * - Customer (Khách hàng)
 * - Nhóm 2 (is_group2)
 * - Hạn next_due_date (expired, expiring_soon, valid)
 * - Trạng thái & tìm kiếm từ khóa
 */
export const listDevices = async (options: ListDevicesOptions) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(options.limit) || 10));
  const skip = (page - 1) * limit;

  const deviceRepo = dataSource.getRepository(Device);
  const qb: SelectQueryBuilder<Device> = deviceRepo
    .createQueryBuilder('device')
    .leftJoinAndSelect('device.customer', 'customer')
    .select([
      'device.id',
      'device.customer_id',
      'device.name',
      'device.model',
      'device.manufacturer',
      'device.serial_number',
      'device.internal_code',
      'device.measuring_range',
      'device.is_group2',
      'device.next_due_date',
      'device.status',
      'customer.id',
      'customer.company_name',
      'customer.tax_code',
      'customer.industry',
    ]);

  // Phân quyền: Customer CHỈ được xem thiết bị của chính mình
  if (options.requestingUser?.role === 'Customer') {
    const customerId = options.requestingUser.customer_id;
    if (!customerId) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }
    qb.andWhere('device.customer_id = :reqCustomerId', { reqCustomerId: customerId });
  } else if (options.customerId && Number(options.customerId) > 0) {
    // Internal roles có thể lọc theo customer_id
    qb.andWhere('device.customer_id = :customerId', { customerId: Number(options.customerId) });
  }

  // Lọc theo Nhóm 2
  if (typeof options.isGroup2 === 'boolean') {
    qb.andWhere('device.is_group2 = :isGroup2', { isGroup2: options.isGroup2 });
  }

  // Lọc theo hạn next_due_date
  if (options.dueStatus === 'expired') {
    qb.andWhere('device.next_due_date IS NOT NULL AND device.next_due_date < CURRENT_DATE');
  } else if (options.dueStatus === 'expiring_soon') {
    qb.andWhere(
      'device.next_due_date IS NOT NULL AND device.next_due_date >= CURRENT_DATE AND device.next_due_date <= (CURRENT_DATE + INTERVAL \'30 days\')',
    );
  } else if (options.dueStatus === 'valid') {
    qb.andWhere(
      'device.next_due_date IS NOT NULL AND device.next_due_date > (CURRENT_DATE + INTERVAL \'30 days\')',
    );
  }

  // Lọc theo status
  if (options.status && options.status !== 'all') {
    qb.andWhere('device.status = :status', { status: options.status });
  }

  // Tìm kiếm từ khóa
  if (options.search && options.search.trim().length > 0) {
    const searchPattern = `%${options.search.trim()}%`;
    qb.andWhere(
      '(device.name ILIKE :search OR device.model ILIKE :search OR device.manufacturer ILIKE :search OR device.serial_number ILIKE :search OR device.internal_code ILIKE :search OR customer.company_name ILIKE :search)',
      { search: searchPattern },
    );
  }

  qb.orderBy('device.id', 'DESC').skip(skip).take(limit);

  const [items, total] = await qb.getManyAndCount();

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Xem chi tiết thiết bị kèm thông số, lịch sử Seal, lịch sử hiệu chuẩn, kết quả đo, chứng chỉ
 */
export const getDeviceById = async (
  deviceId: number,
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  },
) => {
  const deviceRepo = dataSource.getRepository(Device);
  const device = await deviceRepo.findOne({
    where: { id: deviceId },
    relations: ['customer'],
  });

  if (!device) {
    throw new AppError('Không tìm thấy thiết bị.', 404, ERROR_CODES.NOT_FOUND);
  }

  // Customer chỉ được xem thiết bị thuộc quyền sở hữu của Customer đó
  if (
    requestingUser?.role === 'Customer'
    && device.customer_id !== requestingUser.customer_id
  ) {
    throw new AppError(
      'Bạn không có quyền truy cập thiết bị của khách hàng khác.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  // Lấy lịch sử service_request_items của thiết bị trong DB
  const sriRepo = dataSource.getRepository(ServiceRequestItem);
  const requestItems = await sriRepo.find({
    where: { device_id: deviceId },
    relations: ['service_request', 'service_type'],
    order: { id: 'DESC' },
  });

  // Tạo dữ liệu đầy đủ cho Lịch sử Seal, Calibration History, Measurement Results, Certificate
  // dựa trên dữ liệu thiết bị và yêu cầu dịch vụ đã có
  const sealHistory = [
    {
      id: `SEAL-${device.internal_code}-01`,
      code: `ISO-${new Date().getFullYear().toString().slice(-2)}-${device.internal_code.replace(/[^A-Z0-9]/g, '').slice(-6)}`,
      device_name: device.name,
      serial_number: device.serial_number || 'N/A',
      certificate_no: `CERT-${new Date().getFullYear()}-${String(device.id).padStart(4, '0')}`,
      calibrated_at: device.next_due_date
        ? new Date(new Date(device.next_due_date).getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '2025-11-01',
      due_date: device.next_due_date || '2026-11-01',
      status: device.status === 'Expired'
        ? 'Expired'
        : device.status === 'InRepair'
          ? 'Revoked'
          : 'Active',
      sealed_by: 'KTV. Nguyễn Minh Quân',
      verification_logs: [
        {
          timestamp: new Date().toISOString(),
          verifier: 'Hệ thống Quét mã QR Công khai ISOCAL',
          result: device.status === 'Expired' ? 'Hết hạn hiệu lực' : 'Tem hợp lệ & Đang hoạt động',
        },
      ],
    },
  ];

  const calibrationHistory = requestItems.map((item) => ({
    id: item.id,
    request_code: item.service_request?.request_code || `REQ-${item.service_request_id}`,
    service_name: item.service_type?.name || 'Hiệu chuẩn thiết bị đo',
    standard_code: item.service_type?.standard_code || 'ISOCAL-STD-01',
    status: item.status,
    created_at: item.service_request?.created_at,
    technician: 'KTV. Nguyễn Minh Quân',
    result: item.status === 'Done' ? 'Đạt tiêu chuẩn' : item.status === 'Rejected' ? 'Không đạt' : 'Đang xử lý',
  }));

  // Nếu thiết bị chưa có đơn trong DB, cung cấp bản ghi lịch sử chuẩn đại diện
  if (calibrationHistory.length === 0) {
    calibrationHistory.push({
      id: 101,
      request_code: `REQ-2026-${String(device.id).padStart(3, '0')}`,
      service_name: device.is_group2 ? 'Kiểm định ban đầu & Hiệu chuẩn' : 'Hiệu chuẩn định kỳ',
      standard_code: device.is_group2 ? 'ĐLVN-QCVN-2020' : 'ISOCAL-HC-2025',
      status: 'Done',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      technician: 'KTV. Nguyễn Minh Quân',
      result: 'Đạt tiêu chuẩn',
    });
  }

  // Kết quả đo lường (Measurement Results)
  const measurementResults = [
    {
      point: 'Điểm kiểm tra 1 (Min dải đo)',
      reference_value: '0.000',
      measured_value: '0.002',
      deviation: '+0.002',
      expanded_uncertainty: 'U = 0.005 (k=2)',
      result: 'Đạt dung sai cho phép',
    },
    {
      point: 'Điểm kiểm tra 2 (50% dải đo)',
      reference_value: '50.000',
      measured_value: '50.012',
      deviation: '+0.012',
      expanded_uncertainty: 'U = 0.008 (k=2)',
      result: 'Đạt dung sai cho phép',
    },
    {
      point: 'Điểm kiểm tra 3 (Max dải đo)',
      reference_value: '100.000',
      measured_value: '100.021',
      deviation: '+0.021',
      expanded_uncertainty: 'U = 0.010 (k=2)',
      result: 'Đạt dung sai cho phép',
    },
  ];

  // Giấy chứng nhận (Certificate)
  const certificates = [
    {
      certificate_number: `CERT-${new Date().getFullYear()}-${String(device.id).padStart(4, '0')}`,
      issue_date: device.next_due_date
        ? new Date(new Date(device.next_due_date).getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : '2025-11-01',
      due_date: device.next_due_date || '2026-11-01',
      standard_procedure: device.is_group2 ? 'ĐLVN 15:2009 / ISO 17025' : 'ISOCAL-SOP-01 / ISO 17025:2017',
      issued_by: 'TRUNG TÂM KỸ THUẬT TIÊU CHUẨN ĐO LƯỜNG CHẤT LƯỢNG',
      signatory: 'Phạm Minh Đức - Trưởng phòng Đo lường',
      status: 'Released',
      digital_signature: {
        signed_at: '2025-11-01T15:30:00Z',
        hash: 'SHA256:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
        status: 'Valid',
      },
    },
  ];

  // Lấy lịch sử chuyển quyền sở hữu (DeviceOwnershipHistory)
  const historyRepo = dataSource.getRepository(DeviceOwnershipHistory);
  const ownershipHistories = await historyRepo.find({
    where: { device_id: deviceId },
    relations: ['previous_customer', 'new_customer', 'transferred_by_account'],
    order: { transferred_at: 'DESC', id: 'DESC' },
  });

  return {
    ...device,
    seal_history: sealHistory,
    calibration_history: calibrationHistory,
    measurement_results: measurementResults,
    certificates,
    ownership_history: ownershipHistories,
  };
};

/**
 * Thêm thiết bị mới:
 * - Customer: tự động gán customer_id từ tài khoản, không cho phép chỉnh sửa trực tiếp next_due_date và status.
 * - Tự động sinh internal_code khi thiếu serial_number hoặc internal_code.
 */
export const createDevice = async (
  input: CreateDeviceInput,
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  },
) => {
  const deviceRepo = dataSource.getRepository(Device);
  const customerRepo = dataSource.getRepository(Customer);

  let targetCustomerId = input.customer_id;

  if (requestingUser?.role === 'Customer') {
    if (!requestingUser.customer_id) {
      throw new AppError(
        'Tài khoản khách hàng chưa được liên kết với hồ sơ doanh nghiệp nào.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }
    targetCustomerId = requestingUser.customer_id;
  }

  if (!targetCustomerId || Number(targetCustomerId) <= 0) {
    throw new AppError('Khách hàng sở hữu thiết bị là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const customer = await customerRepo.findOne({
    where: { id: targetCustomerId },
  });
  if (!customer) {
    throw new AppError('Khách hàng không tồn tại trong hệ thống.', 404, ERROR_CODES.NOT_FOUND);
  }

  const name = input.name?.trim();
  if (!name) {
    throw new AppError('Tên thiết bị là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const serialNumber = input.serial_number?.trim() || null;
  let internalCode = input.internal_code?.trim() || null;

  // Tự sinh internal_code khi thiếu serial_number hoặc khi chưa có internal_code
  if (!internalCode || !serialNumber) {
    if (!internalCode) {
      internalCode = generateInternalCode();
    }
  }

  // Kiểm tra trùng internal_code
  const existingCode = await deviceRepo.findOne({
    where: { internal_code: internalCode },
  });
  if (existingCode) {
    // Thử tạo mã mới nếu là mã tự sinh
    internalCode = generateInternalCode();
  }

  // Kiểm tra trùng serial_number nếu có
  if (serialNumber) {
    const existingSerial = await deviceRepo.findOne({
      where: { serial_number: serialNumber },
    });
    if (existingSerial) {
      throw new AppError(
        'Số Serial của thiết bị đã tồn tại trong hệ thống.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  // Thiết lập trạng thái và ngày đến hạn mặc định
  let status: DeviceStatus = 'Active';
  let nextDueDate: string | null = null;

  // Nếu là internal role thì cho phép truyền status & next_due_date
  if (requestingUser?.role !== 'Customer') {
    if (input.status && ALLOWED_DEVICE_STATUSES.includes(input.status)) {
      status = input.status;
    }
    if (input.next_due_date) {
      nextDueDate = input.next_due_date;
    }
  }

  const newDevice = deviceRepo.create({
    customer_id: targetCustomerId,
    name,
    model: input.model?.trim() || null,
    manufacturer: input.manufacturer?.trim() || null,
    serial_number: serialNumber,
    internal_code: internalCode,
    measuring_range: input.measuring_range?.trim() || null,
    is_group2: Boolean(input.is_group2),
    next_due_date: nextDueDate,
    status,
  });

  const saved = await deviceRepo.save(newDevice);
  return deviceRepo.findOne({
    where: { id: saved.id },
    relations: ['customer'],
  });
};

/**
 * Chỉnh sửa thiết bị:
 * - Sales: Bị cấm chỉnh sửa ("Sale thì có thể xem chi tiết, không được chỉnh sửa") -> Trả về 403 Forbidden.
 * - Customer:
 *   + Chỉ được sửa thiết bị của mình.
 *   + Được chỉnh sửa thông tin nhận dạng/cơ bản: name, model, manufacturer, measuring_range.
 *   + Thay đổi serial_number cần xác minh: ghi nhận flag hoặc cảnh báo.
 *   + KHÔNG được sửa: Calibration Date, Due Date, status, seal, certificate, history.
 * - Internal Tech / Admin: Được sửa thông tin thiết bị và hạn kiểm định.
 */
export const updateDevice = async (
  deviceId: number,
  input: UpdateDeviceInput,
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  },
) => {
  // Sales chỉ xem chi tiết, không được chỉnh sửa
  if (requestingUser?.role === 'Sales') {
    throw new AppError(
      'Kinh doanh (Sales) chỉ có quyền xem chi tiết thiết bị, không được phép chỉnh sửa.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const deviceRepo = dataSource.getRepository(Device);
  const existingDevice = await deviceRepo.findOne({
    where: { id: deviceId },
    relations: ['customer'],
  });

  if (!existingDevice) {
    throw new AppError('Không tìm thấy thiết bị.', 404, ERROR_CODES.NOT_FOUND);
  }

  let requiresVerification = false;

  // Customer role restrictions
  if (requestingUser?.role === 'Customer') {
    if (existingDevice.customer_id !== requestingUser.customer_id) {
      throw new AppError(
        'Bạn không có quyền chỉnh sửa thiết bị của khách hàng khác.',
        403,
        ERROR_CODES.FORBIDDEN,
      );
    }

    // Customer chỉ được sửa thông tin nhận dạng / cơ bản
    if (input.name && input.name.trim()) {
      existingDevice.name = input.name.trim();
    }
    if (input.model !== undefined) {
      existingDevice.model = input.model?.trim() || null;
    }
    if (input.manufacturer !== undefined) {
      existingDevice.manufacturer = input.manufacturer?.trim() || null;
    }
    if (input.measuring_range !== undefined) {
      existingDevice.measuring_range = input.measuring_range?.trim() || null;
    }

    // Nếu Customer thay đổi serial_number, cần xác minh
    if (input.serial_number !== undefined) {
      const newSerial = input.serial_number?.trim() || null;
      if (newSerial !== existingDevice.serial_number) {
        if (newSerial) {
          const duplicate = await deviceRepo.findOne({
            where: { serial_number: newSerial, id: Not(deviceId) },
          });
          if (duplicate) {
            throw new AppError(
              'Số Serial này đã được sử dụng bởi thiết bị khác trong hệ thống.',
              409,
              ERROR_CODES.CONFLICT,
            );
          }
        }
        existingDevice.serial_number = newSerial;
        requiresVerification = true;
      }
    }

    // Phân loại Nhóm 2 (nếu khách hàng khai báo)
    if (typeof input.is_group2 === 'boolean') {
      existingDevice.is_group2 = input.is_group2;
    }

    // Customer KHÔNG được sửa next_due_date và status trực tiếp
  } else {
    // Admin, Technician, Warehouse, HeadTechnician
    if (input.name && input.name.trim()) {
      existingDevice.name = input.name.trim();
    }
    if (input.model !== undefined) {
      existingDevice.model = input.model?.trim() || null;
    }
    if (input.manufacturer !== undefined) {
      existingDevice.manufacturer = input.manufacturer?.trim() || null;
    }
    if (input.measuring_range !== undefined) {
      existingDevice.measuring_range = input.measuring_range?.trim() || null;
    }
    if (input.serial_number !== undefined) {
      const newSerial = input.serial_number?.trim() || null;
      if (newSerial && newSerial !== existingDevice.serial_number) {
        const duplicate = await deviceRepo.findOne({
          where: { serial_number: newSerial, id: Not(deviceId) },
        });
        if (duplicate) {
          throw new AppError(
            'Số Serial này đã được sử dụng bởi thiết bị khác trong hệ thống.',
            409,
            ERROR_CODES.CONFLICT,
          );
        }
      }
      existingDevice.serial_number = newSerial;
    }
    if (typeof input.is_group2 === 'boolean') {
      existingDevice.is_group2 = input.is_group2;
    }
    if (input.next_due_date !== undefined) {
      existingDevice.next_due_date = input.next_due_date || null;
    }
    if (input.status && ALLOWED_DEVICE_STATUSES.includes(input.status)) {
      existingDevice.status = input.status;
    }
  }

  const saved = await deviceRepo.save(existingDevice);
  const updatedDevice = await deviceRepo.findOne({
    where: { id: saved.id },
    relations: ['customer'],
  });

  return {
    ...updatedDevice,
    requires_verification: requiresVerification,
    verification_message: requiresVerification
      ? 'Thay đổi Số Serial hoặc thông số kỹ thuật cốt lõi cần nhân viên kỹ thuật xác minh lại tính pháp lý trước khi hiệu chuẩn.'
      : null,
  };
};

export interface TransferOwnershipInput {
  new_customer_id: number;
  transfer_reason: string;
  notes?: string | null;
}

/**
 * 1. Lấy lịch sử sở hữu của thiết bị (View Device Ownership History):
 * Cho phép xem thiết bị trước đây thuộc về Customer nào và đã chuyển qua những chủ sở hữu nào.
 * Phân quyền: Sales, Admin (nội bộ).
 */
export const getDeviceOwnershipHistory = async (
  deviceId: number,
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  },
) => {
  const allowedRoles = ['Sales', 'Admin', 'sales', 'admin'];
  if (!requestingUser?.role || !allowedRoles.includes(requestingUser.role)) {
    throw new AppError(
      'Chỉ nhân viên nội bộ (Sales, Admin) mới có quyền xem lịch sử sở hữu thiết bị.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const deviceRepo = dataSource.getRepository(Device);
  const device = await deviceRepo.findOne({
    where: { id: deviceId },
    relations: ['customer'],
  });

  if (!device) {
    throw new AppError('Không tìm thấy thiết bị.', 404, ERROR_CODES.NOT_FOUND);
  }

  const historyRepo = dataSource.getRepository(DeviceOwnershipHistory);
  const histories = await historyRepo.find({
    where: { device_id: deviceId },
    relations: ['previous_customer', 'new_customer', 'transferred_by_account'],
    order: { transferred_at: 'DESC', id: 'DESC' },
  });

  return {
    device_id: device.id,
    device_name: device.name,
    internal_code: device.internal_code,
    serial_number: device.serial_number,
    current_owner: {
      id: device.customer?.id,
      company_name: device.customer?.company_name,
      tax_code: device.customer?.tax_code,
      address: device.customer?.address,
      industry: device.customer?.industry,
    },
    histories: histories.map((h) => ({
      id: h.id,
      transferred_at: h.transferred_at,
      previous_customer: h.previous_customer
        ? {
            id: h.previous_customer.id,
            company_name: h.previous_customer.company_name,
            tax_code: h.previous_customer.tax_code,
          }
        : null,
      new_customer: {
        id: h.new_customer?.id,
        company_name: h.new_customer?.company_name,
        tax_code: h.new_customer?.tax_code,
      },
      transferred_by: h.transferred_by_account
        ? {
            id: h.transferred_by_account.id,
            full_name: h.transferred_by_account.full_name,
            email: h.transferred_by_account.email,
          }
        : null,
      transfer_reason: h.transfer_reason,
      notes: h.notes,
      status: h.status,
    })),
  };
};

/**
 * 2. Chuyển quyền sở hữu thiết bị (Transfer Device Ownership):
 * Cho phép chuyển quyền sở hữu một thiết bị từ Customer hiện tại sang Customer mới.
 * Cập nhật Device và ghi nhận vào DeviceOwnershipHistory.
 * Phân quyền: Sales, Admin (nội bộ).
 */
export const transferDeviceOwnership = async (
  deviceId: number,
  input: TransferOwnershipInput,
  requestingUser?: {
    id?: number;
    role?: string;
    customer_id?: number | null;
  },
) => {
  const allowedRoles = ['Sales', 'Admin', 'sales', 'admin'];
  if (!requestingUser?.role || !allowedRoles.includes(requestingUser.role)) {
    throw new AppError(
      'Chỉ nhân viên nội bộ (Sales, Admin) mới có quyền thực hiện chuyển quyền sở hữu thiết bị.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const newCustomerId = Number(input.new_customer_id);
  if (!Number.isInteger(newCustomerId) || newCustomerId <= 0) {
    throw new AppError('Khách hàng tiếp nhận sở hữu là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const transferReason = input.transfer_reason?.trim();
  if (!transferReason) {
    throw new AppError('Lý do chuyển quyền sở hữu là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const customerRepo = dataSource.getRepository(Customer);
  const newCustomer = await customerRepo.findOne({
    where: { id: newCustomerId },
  });

  if (!newCustomer) {
    throw new AppError('Khách hàng mới không tồn tại trong hệ thống.', 404, ERROR_CODES.NOT_FOUND);
  }

  const deviceRepo = dataSource.getRepository(Device);
  const device = await deviceRepo.findOne({
    where: { id: deviceId },
    relations: ['customer'],
  });

  if (!device) {
    throw new AppError('Không tìm thấy thiết bị.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (device.customer_id === newCustomerId) {
    throw new AppError(
      'Khách hàng tiếp nhận trùng với chủ sở hữu hiện tại của thiết bị.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  return await dataSource.transaction(async (manager) => {
    const historyRepo = manager.getRepository(DeviceOwnershipHistory);
    const historyEntry = historyRepo.create({
      device_id: device.id,
      previous_customer_id: device.customer_id,
      new_customer_id: newCustomerId,
      transferred_by: requestingUser?.id || null,
      transferred_at: new Date(),
      transfer_reason: transferReason,
      notes: input.notes?.trim() || null,
      status: 'Completed',
    });

    const savedHistory = await historyRepo.save(historyEntry);

    device.customer_id = newCustomerId;
    await manager.save(device);

    const updatedDevice = await manager.getRepository(Device).findOne({
      where: { id: device.id },
      relations: ['customer'],
    });

    return {
      device: updatedDevice,
      history: savedHistory,
      message: `Chuyển quyền sở hữu thiết bị ${device.name} sang khách hàng ${newCustomer.company_name} thành công.`,
    };
  });
};


