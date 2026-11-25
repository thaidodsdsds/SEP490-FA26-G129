import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import { MasterStandard } from '../../database/entities.js';

export interface CreateStandardInput {
  name: string;
  serial_number: string;
  accuracy_class?: string | null;
  calibration_expiry: string;
  status?: string;
}

export interface StandardWithExpiryInfo {
  id: number;
  name: string;
  serial_number: string;
  accuracy_class: string | null;
  calibration_expiry: string;
  status: string;
  is_expired: boolean;
  days_until_expiry: number;
  expiring_soon: boolean;
}

const computeExpiryInfo = (standard: MasterStandard): StandardWithExpiryInfo => {
  const expiryDate = new Date(standard.calibration_expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate.getTime() - today.getTime();
  const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = daysUntil < 0 || standard.status === 'Expired';
  const expiringSoon = !isExpired && daysUntil <= 30;

  return {
    id: standard.id,
    name: standard.name,
    serial_number: standard.serial_number,
    accuracy_class: standard.accuracy_class,
    calibration_expiry: standard.calibration_expiry,
    status: isExpired ? 'Expired' : standard.status,
    is_expired: isExpired,
    days_until_expiry: daysUntil,
    expiring_soon: expiringSoon,
  };
};

export const listMasterStandards = async (filters?: {
  status?: string;
  search?: string;
  valid_only?: boolean;
}): Promise<StandardWithExpiryInfo[]> => {
  const repo = dataSource.getRepository(MasterStandard);
  const qb = repo.createQueryBuilder('ms').orderBy('ms.calibration_expiry', 'ASC');

  if (filters?.status && filters.status !== 'all') {
    qb.andWhere('ms.status = :status', { status: filters.status });
  }

  if (filters?.valid_only) {
    qb.andWhere('ms.status = :activeStatus AND ms.calibration_expiry >= CURRENT_DATE', {
      activeStatus: 'Active',
    });
  }

  if (filters?.search && filters.search.trim()) {
    const term = `%${filters.search.trim().toLowerCase()}%`;
    qb.andWhere(
      '(LOWER(ms.name) LIKE :term OR LOWER(ms.serial_number) LIKE :term OR LOWER(ms.accuracy_class) LIKE :term)',
      { term },
    );
  }

  const standards = await qb.getMany();
  return standards.map(computeExpiryInfo);
};

export const getMasterStandardById = async (id: number): Promise<StandardWithExpiryInfo> => {
  const repo = dataSource.getRepository(MasterStandard);
  const standard = await repo.findOne({ where: { id } });

  if (!standard) {
    throw new AppError('Master standard not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  return computeExpiryInfo(standard);
};

export const createMasterStandard = async (input: CreateStandardInput): Promise<StandardWithExpiryInfo> => {
  const repo = dataSource.getRepository(MasterStandard);

  if (!input.name || !input.name.trim()) {
    throw new AppError('Standard name is required.', 400, ERROR_CODES.BAD_REQUEST);
  }
  if (!input.serial_number || !input.serial_number.trim()) {
    throw new AppError('Serial number is required.', 400, ERROR_CODES.BAD_REQUEST);
  }
  if (!input.calibration_expiry) {
    throw new AppError('Calibration expiry date is required.', 400, ERROR_CODES.BAD_REQUEST);
  }

  const existing = await repo.findOne({ where: { serial_number: input.serial_number.trim() } });
  if (existing) {
    throw new AppError(`Serial number "${input.serial_number}" already exists.`, 400, ERROR_CODES.BAD_REQUEST);
  }

  const newStandard = repo.create({
    name: input.name.trim(),
    serial_number: input.serial_number.trim(),
    accuracy_class: input.accuracy_class?.trim() || null,
    calibration_expiry: input.calibration_expiry,
    status: input.status || 'Active',
  });

  const saved = await repo.save(newStandard);
  return computeExpiryInfo(saved);
};

export const updateMasterStandard = async (
  id: number,
  input: Partial<CreateStandardInput>,
): Promise<StandardWithExpiryInfo> => {
  const repo = dataSource.getRepository(MasterStandard);
  const existing = await repo.findOne({ where: { id } });

  if (!existing) {
    throw new AppError('Master standard not found.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (input.serial_number && input.serial_number.trim() !== existing.serial_number) {
    const duplicate = await repo.findOne({ where: { serial_number: input.serial_number.trim() } });
    if (duplicate && duplicate.id !== id) {
      throw new AppError('Serial number already exists.', 400, ERROR_CODES.BAD_REQUEST);
    }
    existing.serial_number = input.serial_number.trim();
  }

  if (input.name) existing.name = input.name.trim();
  if (input.accuracy_class !== undefined) existing.accuracy_class = input.accuracy_class?.trim() || null;
  if (input.calibration_expiry) existing.calibration_expiry = input.calibration_expiry;
  if (input.status) existing.status = input.status;

  const saved = await repo.save(existing);
  return computeExpiryInfo(saved);
};
