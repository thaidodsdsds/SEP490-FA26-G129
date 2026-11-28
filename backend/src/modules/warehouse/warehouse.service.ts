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

export interface ListWarehouseDevicesFilter {
  in_stock?: boolean;
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

  // Kiểm tra trạng thái kho: Thiết bị phải chưa có trong kho mới được nhập
  const latestTx = await repo.findOne({
    where: { device_id: input.device_id },
    order: { transaction_at: 'DESC', id: 'DESC' },
  });
  if (latestTx && latestTx.type === 'Inbound') {
    throw new AppError(
      `Thiết bị "${device.name}" (S/N: ${device.serial_number}) hiện đã được nhập kho và đang lưu tại phòng Lab (chưa xuất kho).`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  if (input.service_request_item_id) {
    const sriRepo = dataSource.getRepository(ServiceRequestItem);
    const item = await sriRepo.findOne({ where: { id: input.service_request_item_id } });
    if (!item) {
      throw new AppError(
        `Không tìm thấy dòng yêu cầu dịch vụ (Service Request Item ID: ${input.service_request_item_id}). Vui lòng để trống nếu không có mã yêu cầu cụ thể.`,
        404,
        ERROR_CODES.NOT_FOUND,
      );
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

  // Kiểm tra trạng thái kho: Thiết bị PHẢI ĐANG TRONG KHO (giao dịch gần nhất là Inbound) mới được xuất
  const latestTx = await repo.findOne({
    where: { device_id: input.device_id },
    order: { transaction_at: 'DESC', id: 'DESC' },
  });
  if (!latestTx || latestTx.type !== 'Inbound') {
    throw new AppError(
      `Thiết bị "${device.name}" (S/N: ${device.serial_number}) hiện không có trong kho để xuất (thiết bị chưa được nhập kho hoặc đã được xuất kho trước đó).`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
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

  // Đếm chính xác số lượng thiết bị đang nằm trong kho (giao dịch gần nhất là Inbound)
  const inWarehouseCountResult: Array<{ count: string | number }> = await dataSource.query(`
    SELECT COUNT(*)::int AS count FROM (
      SELECT DISTINCT ON (device_id) type
      FROM warehouse_transactions
      ORDER BY device_id, transaction_at DESC, id DESC
    ) sub
    WHERE sub.type = 'Inbound'
  `);
  const currentInWarehouse = Number(inWarehouseCountResult[0]?.count ?? 0);

  return {
    totalInbound,
    totalOutbound,
    currentInWarehouse,
    currentInWarehouseEstimated: currentInWarehouse,
    todayInbound,
    todayOutbound,
  };
};

export const listWarehouseDevices = async (filter?: ListWarehouseDevicesFilter) => {
  const deviceRepo = dataSource.getRepository(Device);
  const devices = await deviceRepo.find({
    relations: { customer: true },
    order: { id: 'DESC' },
    take: 100,
  });

  // Lấy giao dịch mới nhất của từng thiết bị trong kho
  const latestTxs: Array<{ device_id: number; type: string; transaction_at: Date; condition_note: string }> =
    await dataSource.query(`
      SELECT DISTINCT ON (device_id) device_id, type, transaction_at, condition_note
      FROM warehouse_transactions
      ORDER BY device_id, transaction_at DESC, id DESC
    `);

  const latestTxMap = new Map<number, { type: string; transaction_at: Date; condition_note: string }>();
  for (const tx of latestTxs) {
    latestTxMap.set(Number(tx.device_id), tx);
  }

  const enrichedDevices = devices.map((dev) => {
    const lastTx = latestTxMap.get(dev.id);
    const in_stock = lastTx?.type === 'Inbound';
    return {
      ...dev,
      in_stock,
      warehouse_status: in_stock ? 'InWarehouse' : 'OutsideWarehouse',
      last_transaction: lastTx || null,
    };
  });

  if (filter?.in_stock !== undefined) {
    return enrichedDevices.filter((d) => d.in_stock === filter.in_stock);
  }

  return enrichedDevices;
};

