import { EntityManager, Like } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Account,
  Contract,
  WorkOrder,
  WorkOrderAssignment,
} from '../../database/entities.js';

export const WORK_ORDER_STATUSES = [
  'Open',
  'Assigned',
  'InProgress',
  'Done',
  'Cancelled',
] as const;

export const STANDARD_OPTIONS = [
  'Calibrator Fluke 5522A',
  'Bộ quả cân chuẩn F2',
  'Buồng nhiệt ẩm ESPEC',
  'Thước chuẩn Mitutoyo',
];

export interface WorkOrderAssignmentResult {
  id: number;
  work_order_id: number;
  contract_item_id: number;
  service_request_item_id: number | null;
  device_name: string;
  technician_id: number | null;
  technician_name: string | null;
  technician_email: string | null;
  standard_name: string | null;
  scheduled_start: Date | null;
  scheduled_end: Date | null;
  assigned_by: number | null;
  assigned_by_name: string | null;
  status: string;
  notes: string | null;
}

export interface WorkOrderSummary {
  id: number;
  work_order_code: string;
  contract_id: number;
  contract_code: string;
  customer_id: number;
  customer_name: string;
  status: string;
  device_count: number;
  assigned_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface WorkOrderDetail extends WorkOrderSummary {
  assignments: WorkOrderAssignmentResult[];
}

export interface WorkOrderLookups {
  technicians: Array<{
    id: number;
    full_name: string;
    email: string;
    role: string | null;
  }>;
  standards: string[];
}

const mapAssignment = (assignment: WorkOrderAssignment): WorkOrderAssignmentResult => ({
  id: assignment.id,
  work_order_id: assignment.work_order_id,
  contract_item_id: assignment.contract_item_id,
  service_request_item_id: assignment.service_request_item_id ?? null,
  device_name: assignment.device_name,
  technician_id: assignment.technician_id ?? null,
  technician_name: assignment.technician?.full_name ?? null,
  technician_email: assignment.technician?.email ?? null,
  standard_name: assignment.standard_name ?? null,
  scheduled_start: assignment.scheduled_start ?? null,
  scheduled_end: assignment.scheduled_end ?? null,
  assigned_by: assignment.assigned_by ?? null,
  assigned_by_name: assignment.assigned_by_account?.full_name ?? null,
  status: assignment.status,
  notes: assignment.notes ?? null,
});

const mapSummary = (workOrder: WorkOrder): WorkOrderSummary => {
  const assignments = workOrder.assignments ?? [];
  return {
    id: workOrder.id,
    work_order_code: workOrder.work_order_code,
    contract_id: workOrder.contract_id,
    contract_code: workOrder.contract?.contract_code ?? '',
    customer_id: workOrder.customer_id,
    customer_name: workOrder.customer?.company_name ?? '',
    status: workOrder.status,
    device_count: assignments.length,
    assigned_count: assignments.filter(
      (assignment) =>
        assignment.technician_id !== null &&
        assignment.technician_id !== undefined &&
        assignment.scheduled_start !== null &&
        assignment.scheduled_start !== undefined &&
        assignment.scheduled_end !== null &&
        assignment.scheduled_end !== undefined,
    ).length,
    created_at: workOrder.created_at,
    updated_at: workOrder.updated_at,
  };
};

export const getNextWorkOrderCode = async (
  manager?: EntityManager,
): Promise<string> => {
  const repository = (manager ?? dataSource).getRepository(WorkOrder);
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;

  const existing = await repository.find({
    select: { work_order_code: true },
    where: { work_order_code: Like(`${prefix}%`) },
  });

  const used = new Set(
    existing
      .map((order) => Number(String(order.work_order_code).slice(prefix.length)))
      .filter((value) => Number.isInteger(value) && value > 0),
  );

  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    if (!used.has(sequence)) {
      return `${prefix}${String(sequence).padStart(3, '0')}`;
    }
  }

  throw new AppError(
    'Đã hết dải mã lệnh công việc cho năm hiện tại.',
    409,
    ERROR_CODES.CONFLICT,
  );
};

/**
 * Sinh lệnh công việc + các dòng phân công (chưa gán kỹ thuật viên) từ hợp đồng.
 * Hàm idempotent: nếu hợp đồng đã có lệnh công việc thì trả về lệnh cũ.
 */
export const ensureWorkOrderForContract = async (
  manager: EntityManager,
  contract: Contract,
): Promise<WorkOrder> => {
  const workOrderRepo = manager.getRepository(WorkOrder);
  const existing = await workOrderRepo.findOne({
    where: { contract_id: contract.id },
    relations: { assignments: true },
  });

  if (existing) {
    return existing;
  }

  const workOrderCode = await getNextWorkOrderCode(manager);
  const now = new Date();

  const workOrder = workOrderRepo.create({
    work_order_code: workOrderCode,
    contract_id: contract.id,
    customer_id: contract.customer_id,
    status: 'Open',
    created_at: now,
    updated_at: now,
  });

  const saved = await workOrderRepo.save(workOrder);

  const items = [...(contract.items ?? [])].sort((left, right) => left.line_no - right.line_no);
  if (items.length > 0) {
    const assignmentRepo = manager.getRepository(WorkOrderAssignment);
    const assignments = items.map((item) =>
      assignmentRepo.create({
        work_order_id: saved.id,
        contract_item_id: item.id,
        service_request_item_id: item.service_request_item_id ?? null,
        device_name: item.name,
        technician_id: null,
        standard_name: null,
        scheduled_start: null,
        scheduled_end: null,
        assigned_by: null,
        status: 'Pending',
        notes: null,
        created_at: now,
        updated_at: now,
      }),
    );

    await assignmentRepo.save(assignments);
  }

  return saved;
};

export const listWorkOrders = async (): Promise<WorkOrderSummary[]> => {
  const workOrders = await dataSource.getRepository(WorkOrder).find({
    relations: { contract: true, customer: true, assignments: true },
    order: { id: 'DESC' },
  });

  return workOrders.map(mapSummary);
};

export const getWorkOrderDetail = async (
  id: number,
): Promise<WorkOrderDetail> => {
  const workOrder = await dataSource.getRepository(WorkOrder).findOne({
    where: { id },
    relations: {
      contract: true,
      customer: true,
      assignments: {
        technician: true,
        assigned_by_account: true,
        contract_item: true,
      },
    },
  });

  if (!workOrder) {
    throw new AppError('Lệnh công việc không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
  }

  return {
    ...mapSummary(workOrder),
    assignments: [...(workOrder.assignments ?? [])]
      .sort((left, right) => left.id - right.id)
      .map(mapAssignment),
  };
};

export const getWorkOrderLookups = async (): Promise<WorkOrderLookups> => {
  const technicians = await dataSource
    .getRepository(Account)
    .createQueryBuilder('account')
    .leftJoinAndSelect('account.role', 'role')
    .where('account.customer_id IS NULL')
    .andWhere('role.name IN (:...roles)', {
      roles: ['Technician', 'HeadTechnician'],
    })
    .orderBy('account.full_name', 'ASC')
    .getMany();

  return {
    technicians: technicians.map((account) => ({
      id: account.id,
      full_name: account.full_name,
      email: account.email,
      role: account.role?.name ?? null,
    })),
    standards: STANDARD_OPTIONS,
  };
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const parseOptionalDate = (value: unknown, field: string): Date | null => {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} không hợp lệ.`, 400, ERROR_CODES.VALIDATION_ERROR);
  }
  return date;
};

export interface UpdateAssignmentInput {
  technician_id?: number | null;
  standard_name?: string | null;
  scheduled_start?: string | null;
  scheduled_end?: string | null;
  notes?: string | null;
}

export const updateWorkOrderAssignment = async (
  workOrderId: number,
  assignmentId: number,
  input: UpdateAssignmentInput,
  actorId: number,
): Promise<WorkOrderDetail> => {
  const assignmentRepo = dataSource.getRepository(WorkOrderAssignment);
  const workOrderRepo = dataSource.getRepository(WorkOrder);

  const assignment = await assignmentRepo.findOne({
    where: { id: assignmentId, work_order_id: workOrderId },
  });

  if (!assignment) {
    throw new AppError(
      'Dòng phân công không tồn tại trong lệnh công việc này.',
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  const workOrder = await workOrderRepo.findOne({ where: { id: workOrderId } });
  if (!workOrder) {
    throw new AppError('Lệnh công việc không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
  }

  const hasOwn = (key: string) =>
    Object.prototype.hasOwnProperty.call(input as Record<string, unknown>, key);

  if (hasOwn('technician_id')) {
    if (input.technician_id === null || input.technician_id === undefined) {
      assignment.technician_id = null;
    } else {
      const technicianId = Number(input.technician_id);
      if (!Number.isInteger(technicianId) || technicianId <= 0) {
        throw new AppError('Kỹ thuật viên không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
      }

      const technician = await dataSource.getRepository(Account).findOne({
        where: { id: technicianId },
        relations: { role: true },
      });

      if (
        !technician ||
        technician.customer_id !== null ||
        !['Technician', 'HeadTechnician'].includes(technician.role?.name ?? '')
      ) {
        throw new AppError(
          'Tài khoản được chọn không phải kỹ thuật viên nội bộ.',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }

      assignment.technician_id = technicianId;
    }
  }

  if (hasOwn('standard_name')) {
    assignment.standard_name = normalizeOptionalText(input.standard_name);
  }

  if (hasOwn('scheduled_start')) {
    assignment.scheduled_start = parseOptionalDate(input.scheduled_start, 'Giờ bắt đầu');
  }

  if (hasOwn('scheduled_end')) {
    assignment.scheduled_end = parseOptionalDate(input.scheduled_end, 'Giờ kết thúc');
  }

  if (
    assignment.scheduled_start &&
    assignment.scheduled_end &&
    assignment.scheduled_end.getTime() <= assignment.scheduled_start.getTime()
  ) {
    throw new AppError(
      'Giờ kết thúc phải sau giờ bắt đầu.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (hasOwn('notes')) {
    assignment.notes = normalizeOptionalText(input.notes);
  }

  assignment.assigned_by = actorId;
  assignment.updated_at = new Date();
  assignment.status =
    assignment.technician_id !== null &&
    assignment.scheduled_start !== null &&
    assignment.scheduled_end !== null
      ? 'Assigned'
      : 'Pending';

  await assignmentRepo.save(assignment);

  if (!['Done', 'Cancelled', 'InProgress'].includes(workOrder.status)) {
    const allAssignments = await assignmentRepo.find({
      where: { work_order_id: workOrderId },
    });
    const anyAssigned = allAssignments.some(
      (item) => item.technician_id !== null,
    );
    workOrder.status = anyAssigned ? 'Assigned' : 'Open';
    workOrder.updated_at = new Date();
    await workOrderRepo.save(workOrder);
  }

  return getWorkOrderDetail(workOrderId);
};
