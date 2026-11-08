import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Device,
  ServiceRequestItem,
  WarehouseTransaction,
} from '../../database/entities.js';

export interface CreateInboundInput {
  device_id: number;
  service_request_item_id?: number | null;
  condition_note?: string | null;
  photo_url?: string | null;
  handled_by: number;
}

export interface CreateOutboundInput {
  device_id: number;
  service_request_item_id?: number | null;
  condition_note?: string | null;
  photo_url?: string | null;
  handled_by: number;
}

export interface WarehouseTransactionFilter {
  type?: string;
  device_id?: number;
  customer_id?: number;
  search?: string;
}

export const createInboundTransaction = async (input: CreateInboundInput) => {
  const repo = dataSource.getRepository(WarehouseTransaction);
  const deviceRepo = dataSource.getRepository(Device);

  const device = await deviceRepo.findOne({
    where: { id: input.device_id },
    relations: { customer: true },
  });
  if (!device) {
    throw new AppError('Device not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (input.service_request_item_id) {
    const sriRepo = dataSource.getRepository(ServiceRequestItem);
    const item = await sriRepo.findOne({ where: { id: input.service_request_item_id } });
    if (!item) {
      throw new AppError('Service request item not found.', 404, ERROR_CODES.NOT_FOUND);
    }
  }

  const tx = repo.create({
    device_id: input.device_id,
    service_request_item_id: input.service_request_item_id || null,
    type: 'Inbound',
    condition_note: input.condition_note?.trim() || 'Ngoại quan nguyên vẹn, tiếp nhận tại quầy kho In-lab.',
    photo_url: input.photo_url || null,
    handled_by: input.handled_by,
  });

  return await repo.save(tx);
};

export const createOutboundTransaction = async (input: CreateOutboundInput) => {
  const repo = dataSource.getRepository(WarehouseTransaction);
  const deviceRepo = dataSource.getRepository(Device);

  const device = await deviceRepo.findOne({ where: { id: input.device_id } });
  if (!device) {
    throw new AppError('Device not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  const tx = repo.create({
    device_id: input.device_id,
    service_request_item_id: input.service_request_item_id || null,
    type: 'Outbound',
    condition_note: input.condition_note?.trim() || 'Xuất kho và bàn giao thiết bị hoàn trả khách hàng.',
    photo_url: input.photo_url || null,
    handled_by: input.handled_by,
  });

  return await repo.save(tx);
};

export const listWarehouseTransactions = async (filters?: WarehouseTransactionFilter) => {
  const repo = dataSource.getRepository(WarehouseTransaction);
  const qb = repo
    .createQueryBuilder('tx')
    .leftJoinAndSelect('tx.device', 'dev')
    .leftJoinAndSelect('dev.customer', 'cust')
    .leftJoinAndSelect('tx.service_request_item', 'sri')
    .leftJoinAndSelect('tx.handler', 'handler')
    .orderBy('tx.transaction_at', 'DESC');

  if (filters?.type && filters.type !== 'all') {
    qb.andWhere('tx.type = :type', { type: filters.type });
  }

  if (filters?.device_id) {
    qb.andWhere('tx.device_id = :devId', { devId: filters.device_id });
  }

  if (filters?.customer_id) {
    qb.andWhere('dev.customer_id = :custId', { custId: filters.customer_id });
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(dev.name) LIKE :term OR LOWER(dev.serial_number) LIKE :term OR LOWER(cust.company_name) LIKE :term OR LOWER(tx.condition_note) LIKE :term)',
      { term },
    );
  }

  return await qb.getMany();
};

export const getWarehouseInventorySummary = async () => {
  const txRepo = dataSource.getRepository(WarehouseTransaction);
  const totalInbound = await txRepo.count({ where: { type: 'Inbound' } });
  const totalOutbound = await txRepo.count({ where: { type: 'Outbound' } });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayInbound = await txRepo
    .createQueryBuilder('tx')
    .where('tx.type = :type AND tx.transaction_at >= :today', { type: 'Inbound', today })
    .getCount();

  const todayOutbound = await txRepo
    .createQueryBuilder('tx')
    .where('tx.type = :type AND tx.transaction_at >= :today', { type: 'Outbound', today })
    .getCount();

  return {
    totalInbound,
    totalOutbound,
    currentInWarehouseEstimated: Math.max(0, totalInbound - totalOutbound),
    todayInbound,
    todayOutbound,
  };
};

export const listWarehouseDevices = async () => {
  const deviceRepo = dataSource.getRepository(Device);
  return await deviceRepo.find({
    relations: { customer: true },
    order: { id: 'DESC' },
    take: 100,
  });
};

