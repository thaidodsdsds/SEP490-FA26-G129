import { Not } from 'typeorm';
import bcrypt from 'bcryptjs';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Account,
  Customer,
  Device,
  Quotation,
  Role,
  ServiceRequest,
} from '../../database/entities.js';

export const ALLOWED_DEVICE_STATUSES = [
  'Active',
  'ExpiringSoon',
  'Expired',
  'InRepair',
] as const;

export type DeviceStatus = (typeof ALLOWED_DEVICE_STATUSES)[number];

export interface CustomerSummary {
  id: number;
  company_name: string;
}

export interface CustomerDetailed {
  id: number;
  company_name: string;
  tax_code: string | null;
  address: string;
  industry: string;
  created_at: Date;
  accounts_count?: number;
  devices_count?: number;
  service_requests_count?: number;
}

export interface CustomerDevice {
  id: number;
  customer_id: number;
  name: string;
  model: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  internal_code: string;
  measuring_range?: string | null;
  is_group2?: boolean;
  next_due_date?: string | null;
  status?: string;
}

export interface CreateCustomerDeviceInput {
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

export interface CreateCustomerInput {
  company_name: string;
  tax_code?: string | null;
  address: string;
  industry: string;
  contact_person?: {
    full_name: string;
    email: string;
    phone?: string | null;
    password?: string | null;
  };
}

export interface UpdateCustomerInput {
  company_name: string;
  tax_code?: string | null;
  address: string;
  industry: string;
}

export interface CreateCustomerAccountInput {
  full_name: string;
  email: string;
  phone?: string | null;
  password?: string | null;
}

const generateInternalCode = (): string => {
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `TB-${Date.now()}-${randomSuffix}`;
};

/**
 * Lấy danh sách ID và tên khách hàng (company_name) từ Customer entity
 */
export const listCustomers = async (): Promise<CustomerSummary[]> => dataSource
  .getRepository(Customer)
  .find({
    select: {
      id: true,
      company_name: true,
    },
    order: {
      company_name: 'ASC',
    },
  });

/**
 * Lấy danh sách chi tiết khách hàng với tìm kiếm, lọc và phân trang
 */
export const listCustomersDetailed = async (options: {
  search?: string;
  industry?: string;
  page?: number;
  limit?: number;
}): Promise<{
  customers: CustomerDetailed[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const skip = (page - 1) * limit;

  const query = dataSource
    .getRepository(Customer)
    .createQueryBuilder('customer');

  if (options.search && options.search.trim()) {
    const s = `%${options.search.trim().toLowerCase()}%`;
    query.andWhere(
      '(LOWER(customer.company_name) LIKE :s OR LOWER(COALESCE(customer.tax_code, \'\')) LIKE :s OR LOWER(customer.address) LIKE :s)',
      { s },
    );
  }

  if (options.industry && options.industry.trim()) {
    query.andWhere('customer.industry = :industry', { industry: options.industry.trim() });
  }

  query.orderBy('customer.id', 'DESC');
  query.skip(skip).take(limit);

  const [items, total] = await query.getManyAndCount();

  const customerIds = items.map((c) => c.id);
  const accountsCounts: Record<number, number> = {};
  const devicesCounts: Record<number, number> = {};
  const srCounts: Record<number, number> = {};

  if (customerIds.length > 0) {
    const [accData, devData, srData] = await Promise.all([
      dataSource
        .getRepository(Account)
        .createQueryBuilder('a')
        .select('a.customer_id', 'customerId')
        .addSelect('COUNT(*)', 'cnt')
        .where('a.customer_id IN (:...customerIds)', { customerIds })
        .groupBy('a.customer_id')
        .getRawMany(),
      dataSource
        .getRepository(Device)
        .createQueryBuilder('d')
        .select('d.customer_id', 'customerId')
        .addSelect('COUNT(*)', 'cnt')
        .where('d.customer_id IN (:...customerIds)', { customerIds })
        .groupBy('d.customer_id')
        .getRawMany(),
      dataSource
        .getRepository(ServiceRequest)
        .createQueryBuilder('sr')
        .select('sr.customer_id', 'customerId')
        .addSelect('COUNT(*)', 'cnt')
        .where('sr.customer_id IN (:...customerIds)', { customerIds })
        .groupBy('sr.customer_id')
        .getRawMany(),
    ]);

    accData.forEach((r) => { accountsCounts[Number(r.customerId)] = Number(r.cnt); });
    devData.forEach((r) => { devicesCounts[Number(r.customerId)] = Number(r.cnt); });
    srData.forEach((r) => { srCounts[Number(r.customerId)] = Number(r.cnt); });
  }

  const customers: CustomerDetailed[] = items.map((item) => ({
    id: item.id,
    company_name: item.company_name,
    tax_code: item.tax_code,
    address: item.address,
    industry: item.industry,
    created_at: item.created_at,
    accounts_count: accountsCounts[item.id] || 0,
    devices_count: devicesCounts[item.id] || 0,
    service_requests_count: srCounts[item.id] || 0,
  }));

  return {
    customers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

/**
 * Lấy thông tin chi tiết đầy đủ của một khách hàng:
 * - Thông tin cơ bản
 * - Danh sách Account người dùng
 * - Danh sách Device thiết bị
 * - Danh sách Contract / Quotation báo giá
 * - Danh sách Service Request yêu cầu dịch vụ
 */
export const getCustomerDetail = async (customerId: number) => {
  const customerRepo = dataSource.getRepository(Customer);
  const customer = await customerRepo.findOne({
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError('Customer not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const accountRepo = dataSource.getRepository(Account);
  const accounts = await accountRepo.find({
    where: { customer_id: customerId },
    relations: ['role'],
    order: { id: 'ASC' },
  });

  const deviceRepo = dataSource.getRepository(Device);
  const devices = await deviceRepo.find({
    where: { customer_id: customerId },
    order: { id: 'DESC' },
  });

  const srRepo = dataSource.getRepository(ServiceRequest);
  const serviceRequests = await srRepo.find({
    where: { customer_id: customerId },
    relations: ['created_by_account', 'items'],
    order: { id: 'DESC' },
  });

  const quotationRepo = dataSource.getRepository(Quotation);
  const quotations = await quotationRepo
    .createQueryBuilder('quotation')
    .innerJoinAndSelect('quotation.service_request', 'service_request')
    .leftJoinAndSelect('quotation.line_items', 'line_items')
    .where('service_request.customer_id = :customerId', { customerId })
    .orderBy('quotation.id', 'DESC')
    .getMany();

  return {
    customer,
    accounts: accounts.map((acc) => ({
      id: acc.id,
      full_name: acc.full_name,
      email: acc.email,
      phone: acc.phone,
      role: acc.role?.name ?? 'Customer',
      is_2fa_enabled: acc.is_2fa_enabled,
      failed_login_attempts: acc.failed_login_attempts,
    })),
    devices,
    service_requests: serviceRequests.map((sr) => ({
      id: sr.id,
      request_code: sr.request_code,
      location_type: sr.location_type,
      preferred_date: sr.preferred_date,
      special_notes: sr.special_notes,
      accessories_note: sr.accessories_note,
      status: sr.status,
      created_at: sr.created_at,
      created_by_name: sr.created_by_account?.full_name ?? '—',
      items_count: sr.items?.length ?? 0,
    })),
    contracts: quotations.map((q) => ({
      id: q.id,
      service_request_id: q.service_request_id,
      service_request_code: q.service_request?.request_code ?? `SR-${q.service_request_id}`,
      subtotal: Number(q.subtotal),
      discount_amount: Number(q.discount_amount),
      travel_fee: Number(q.travel_fee),
      total_amount: Number(q.total_amount),
      estimated_completion_date: q.estimated_completion_date,
      status: q.status,
      line_items_count: q.line_items?.length ?? 0,
    })),
  };
};

/**
 * Tạo mới một khách hàng
 */
export const createCustomer = async (input: CreateCustomerInput) => {
  const companyName = input.company_name?.trim();
  const address = input.address?.trim();
  const industry = input.industry?.trim();
  const taxCode = input.tax_code?.trim() || null;

  if (!companyName || !address || !industry) {
    throw new AppError(
      'Tên doanh nghiệp, địa chỉ và lĩnh vực kinh doanh là bắt buộc.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const customerRepo = dataSource.getRepository(Customer);

  if (taxCode) {
    const existingTaxCode = await customerRepo.findOne({
      where: { tax_code: taxCode },
    });
    if (existingTaxCode) {
      throw new AppError(
        'Mã số thuế này đã được đăng ký bởi doanh nghiệp khác.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  if (input.contact_person?.email) {
    const normalizedEmail = input.contact_person.email.trim().toLowerCase();
    const existingAccount = await dataSource.getRepository(Account).findOne({
      where: { email: normalizedEmail },
    });
    if (existingAccount) {
      throw new AppError(
        'Địa chỉ email người liên hệ đã tồn tại trong hệ thống.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  return dataSource.transaction(async (manager) => {
    const newCustomer = manager.create(Customer, {
      company_name: companyName,
      tax_code: taxCode,
      address,
      industry,
    });
    const savedCustomer = await manager.save(newCustomer);

    if (input.contact_person?.full_name?.trim() && input.contact_person?.email?.trim()) {
      const customerRole = await manager.findOne(Role, { where: { name: 'Customer' } });
      if (customerRole) {
        const rawPassword = input.contact_person.password || 'Isocal@123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const newAccount = manager.create(Account, {
          customer_id: savedCustomer.id,
          role_id: customerRole.id,
          full_name: input.contact_person.full_name.trim(),
          email: input.contact_person.email.trim().toLowerCase(),
          phone: input.contact_person.phone?.trim() || null,
          password_hash: passwordHash,
          is_2fa_enabled: false,
          failed_login_attempts: 0,
        });
        await manager.save(newAccount);
      }
    }

    return savedCustomer;
  });
};

/**
 * Cập nhật thông tin khách hàng
 */
export const updateCustomer = async (
  customerId: number,
  input: UpdateCustomerInput,
) => {
  const companyName = input.company_name?.trim();
  const address = input.address?.trim();
  const industry = input.industry?.trim();
  const taxCode = input.tax_code?.trim() || null;

  if (!companyName || !address || !industry) {
    throw new AppError(
      'Tên doanh nghiệp, địa chỉ và lĩnh vực kinh doanh là bắt buộc.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const customerRepo = dataSource.getRepository(Customer);
  const existingCustomer = await customerRepo.findOne({
    where: { id: customerId },
  });

  if (!existingCustomer) {
    throw new AppError('Customer not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (taxCode && taxCode !== existingCustomer.tax_code) {
    const duplicate = await customerRepo.findOne({
      where: { tax_code: taxCode, id: Not(customerId) },
    });
    if (duplicate) {
      throw new AppError(
        'Mã số thuế này đã được đăng ký bởi doanh nghiệp khác.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  existingCustomer.company_name = companyName;
  existingCustomer.address = address;
  existingCustomer.industry = industry;
  existingCustomer.tax_code = taxCode;

  return customerRepo.save(existingCustomer);
};

/**
 * Thêm tài khoản người dùng liên kết với khách hàng
 */
export const createCustomerAccount = async (
  customerId: number,
  input: CreateCustomerAccountInput,
) => {
  const fullName = input.full_name?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!fullName || !email) {
    throw new AppError('Họ tên và email là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const customerRepo = dataSource.getRepository(Customer);
  const customer = await customerRepo.findOne({ where: { id: customerId } });
  if (!customer) {
    throw new AppError('Customer not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const accountRepo = dataSource.getRepository(Account);
  const existing = await accountRepo.findOne({ where: { email } });
  if (existing) {
    throw new AppError('Địa chỉ email đã tồn tại trong hệ thống.', 409, ERROR_CODES.CONFLICT);
  }

  const roleRepo = dataSource.getRepository(Role);
  const customerRole = await roleRepo.findOne({ where: { name: 'Customer' } });
  if (!customerRole) {
    throw new AppError('Customer role not found.', 500, ERROR_CODES.INTERNAL_ERROR);
  }

  const rawPassword = input.password?.trim() || 'Isocal@123';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const account = accountRepo.create({
    customer_id: customerId,
    role_id: customerRole.id,
    full_name: fullName,
    email,
    phone: input.phone?.trim() || null,
    password_hash: passwordHash,
    is_2fa_enabled: false,
    failed_login_attempts: 0,
  });

  const saved = await accountRepo.save(account);
  return {
    id: saved.id,
    customer_id: saved.customer_id,
    full_name: saved.full_name,
    email: saved.email,
    phone: saved.phone,
    role: 'Customer',
    is_2fa_enabled: saved.is_2fa_enabled,
    failed_login_attempts: saved.failed_login_attempts,
  };
};

/**
 * Lấy danh sách thiết bị của khách hàng theo customer_id
 */
export const listCustomerDevices = async (customerId: number): Promise<CustomerDevice[]> => dataSource
  .getRepository(Device)
  .find({
    select: {
      id: true,
      customer_id: true,
      name: true,
      model: true,
      manufacturer: true,
      serial_number: true,
      internal_code: true,
      measuring_range: true,
      is_group2: true,
      next_due_date: true,
      status: true,
    },
    where: {
      customer_id: customerId,
    },
    order: {
      name: 'ASC',
      id: 'ASC',
    },
  });

/**
 * Thêm thiết bị mới cho khách hàng
 */
export const createCustomerDevice = async (
  customerId: number,
  input: CreateCustomerDeviceInput,
): Promise<CustomerDevice> => {
  const customerRepository = dataSource.getRepository(Customer);
  const customer = await customerRepository.findOne({
    select: { id: true },
    where: { id: customerId },
  });

  if (!customer) {
    throw new AppError('Customer not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const deviceRepository = dataSource.getRepository(Device);
  const internalCode = input.internal_code?.trim() || generateInternalCode();
  const serialNumber = input.serial_number?.trim() || null;

  const existingInternalCode = await deviceRepository.findOne({
    select: { id: true },
    where: { internal_code: internalCode },
  });

  if (existingInternalCode) {
    throw new AppError(
      'Device internal code already exists.',
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  if (serialNumber) {
    const existingSerialNumber = await deviceRepository.findOne({
      select: { id: true },
      where: { serial_number: serialNumber },
    });

    if (existingSerialNumber) {
      throw new AppError(
        'Device serial number already exists.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  const device = deviceRepository.create({
    customer_id: customerId,
    name: input.name.trim(),
    model: input.model?.trim() || null,
    manufacturer: input.manufacturer?.trim() || null,
    serial_number: serialNumber,
    internal_code: internalCode,
    measuring_range: input.measuring_range?.trim() || null,
    is_group2: Boolean(input.is_group2),
    next_due_date: input.next_due_date?.trim() || null,
    status: input.status ?? 'Active',
  });

  const savedDevice = await deviceRepository.save(device);

  return {
    id: savedDevice.id,
    customer_id: savedDevice.customer_id,
    name: savedDevice.name,
    model: savedDevice.model,
    manufacturer: savedDevice.manufacturer,
    serial_number: savedDevice.serial_number,
    internal_code: savedDevice.internal_code,
    measuring_range: savedDevice.measuring_range,
    is_group2: savedDevice.is_group2,
    next_due_date: savedDevice.next_due_date,
    status: savedDevice.status,
  };
};
