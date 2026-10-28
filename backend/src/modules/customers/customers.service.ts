import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import { Customer, Device } from '../../database/entities.js';

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
