import { In, Like, Not } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { numberToVietnameseWords } from '../../common/number-to-words.js';
import dataSource from '../../database/dataSource.js';
import {
  CompanyProfile,
  Contract,
  ContractItem,
  Quotation,
} from '../../database/entities.js';
import { formatQuotationCode } from '../quotations/quotations.service.js';
import { ensureWorkOrderForContract } from '../work-orders/work-orders.service.js';
import {
  COMPANY_SIGNATURE_PURPOSE,
  CUSTOMER_SIGNATURE_PURPOSE,
  createSignatureRecord,
  finalizeSignedContract,
  listContractSignatures,
  type ContractSignatureInfo,
} from './contract-signature.service.js';

export const CONTRACT_STATUSES = [
  'Draft',
  'PendingApproval',
  'Approved',
  'Signed',
  'Liquidated',
  'Cancelled',
] as const;

export const EDITABLE_STATUSES = ['Draft', 'PendingApproval'] as const;

export interface ContractActor {
  id: number;
  role: string;
}

export interface ContractPartyInput {
  name?: string | null;
  representative?: string | null;
  position?: string | null;
  address?: string | null;
  phone?: string | null;
  fax?: string | null;
  tax_code?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  budget_code?: string | null;
}

export interface ContractItemInput {
  name: string;
  description?: string | null;
  location?: string | null;
  execution_time?: string | null;
  quantity?: number;
  unit?: string | null;
  unit_price: number;
  discount_amount?: number;
  tax_rate?: number;
  service_request_item_id?: number | null;
  quotation_line_item_id?: number | null;
}

export interface CreateContractInput {
  quotation_id: number;
  contract_code: string;
  title?: string | null;
  sign_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_days?: number | null;
  location?: string | null;
  payment_term_days?: number;
  legal_basis?: string | null;
  notes?: string | null;
  travel_fee?: number;
  party_a?: ContractPartyInput;
  party_b?: ContractPartyInput;
  items: ContractItemInput[];
}

export interface UpdateContractInput
  extends Omit<CreateContractInput, 'quotation_id' | 'items'> {
  items: ContractItemInput[];
}

export interface ContractItemResult {
  id: number;
  line_no: number;
  name: string;
  description: string | null;
  location: string | null;
  execution_time: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  service_request_item_id: number | null;
  quotation_line_item_id: number | null;
}

export interface ContractSummary {
  id: number;
  contract_code: string;
  title: string;
  contract_type: string;
  status: string;
  quotation_id: number | null;
  customer_id: number;
  customer_name: string;
  sign_date: string | null;
  start_date: string | null;
  end_date: string | null;
  total_amount: number;
  created_at: Date;
}

export interface ContractDetail extends ContractSummary {
  subtotal: number;
  discount_amount: number;
  travel_fee: number;
  tax_amount: number;
  total_in_words: string | null;
  payment_term_days: number;
  duration_days: number | null;
  location: string | null;
  legal_basis: string | null;
  notes: string | null;
  party_a: Required<Pick<ContractPartyInput, 'name'>> & ContractPartyInput;
  party_b: Required<Pick<ContractPartyInput, 'name'>> & ContractPartyInput;
  created_by: number;
  submitted_at: Date | null;
  approved_by: number | null;
  approved_at: Date | null;
  liquidated_by: number | null;
  liquidated_at: Date | null;
  draft_file_url: string | null;
  signed_file_url: string | null;
  items: ContractItemResult[];
  signatures: ContractSignatureInfo[];
  can_edit: boolean;
  can_submit: boolean;
  can_approve: boolean;
  can_sign_customer: boolean;
  can_cancel: boolean;
  can_liquidate: boolean;
}

const roundMoney = (value: number): number => Math.round(Number(value) || 0);

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const normalizeDate = (value: unknown, field: string): string | null => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw new AppError(`${field} phải có định dạng YYYY-MM-DD.`, 400, ERROR_CODES.VALIDATION_ERROR);
  }
  return value.trim();
};

interface NormalizedItem {
  name: string;
  description: string | null;
  location: string | null;
  execution_time: string | null;
  quantity: number;
  unit: string | null;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  gross: number;
  service_request_item_id: number | null;
  quotation_line_item_id: number | null;
}

const normalizeItems = (rawItems: unknown): NormalizedItem[] => {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new AppError('Hợp đồng phải có ít nhất một hạng mục.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  return rawItems.map((raw, index) => {
    const item = (raw ?? {}) as ContractItemInput;
    const name = normalizeOptionalString(item.name);
    if (!name) {
      throw new AppError(`Hạng mục dòng ${index + 1} thiếu tên.`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const quantity = Number(item.quantity ?? 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new AppError(
        `Số lượng của hạng mục "${name}" phải lớn hơn 0.`,
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const unitPrice = roundMoney(Number(item.unit_price ?? 0));
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new AppError(
        `Đơn giá của hạng mục "${name}" không hợp lệ.`,
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const gross = roundMoney(quantity * unitPrice);
    const discount = roundMoney(Number(item.discount_amount ?? 0));
    if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
      throw new AppError(
        `Chiết khấu của hạng mục "${name}" phải nằm trong khoảng 0 đến ${gross}.`,
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const taxRate = Number(item.tax_rate ?? 5);
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
      throw new AppError(
        `Thuế suất của hạng mục "${name}" phải nằm trong khoảng 0 đến 100.`,
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    const taxable = gross - discount;
    const taxAmount = roundMoney((taxable * taxRate) / 100);

    return {
      name,
      description: normalizeOptionalString(item.description),
      location: normalizeOptionalString(item.location),
      execution_time: normalizeOptionalString(item.execution_time),
      quantity,
      unit: normalizeOptionalString(item.unit),
      unit_price: unitPrice,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      amount: taxable + taxAmount,
      gross,
      service_request_item_id:
        item.service_request_item_id === undefined || item.service_request_item_id === null
          ? null
          : Number(item.service_request_item_id),
      quotation_line_item_id:
        item.quotation_line_item_id === undefined || item.quotation_line_item_id === null
          ? null
          : Number(item.quotation_line_item_id),
    };
  });
};

interface TotalsResult {
  subtotal: number;
  discountAmount: number;
  travelFee: number;
  taxAmount: number;
  totalAmount: number;
}

const computeTotals = (items: NormalizedItem[], rawTravelFee: unknown): TotalsResult => {
  const travelFee = roundMoney(Number(rawTravelFee ?? 0));
  if (!Number.isFinite(travelFee) || travelFee < 0) {
    throw new AppError('Chi phí đi lại phải lớn hơn hoặc bằng 0.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const subtotal = items.reduce((sum, item) => sum + item.gross, 0);
  const discountAmount = items.reduce((sum, item) => sum + item.discount_amount, 0);
  const serviceTax = items.reduce((sum, item) => sum + item.tax_amount, 0);
  const travelTax = roundMoney((travelFee * 8) / 100);
  const taxAmount = serviceTax + travelTax;
  const totalAmount = subtotal - discountAmount + travelFee + taxAmount;

  return {
    subtotal: roundMoney(subtotal),
    discountAmount: roundMoney(discountAmount),
    travelFee,
    taxAmount: roundMoney(taxAmount),
    totalAmount: roundMoney(totalAmount),
  };
};

const mapItem = (item: ContractItem): ContractItemResult => ({
  id: item.id,
  line_no: item.line_no,
  name: item.name,
  description: item.description ?? null,
  location: item.location ?? null,
  execution_time: item.execution_time ?? null,
  quantity: Number(item.quantity),
  unit: item.unit ?? null,
  unit_price: Number(item.unit_price),
  discount_amount: Number(item.discount_amount),
  tax_rate: Number(item.tax_rate),
  tax_amount: Number(item.tax_amount),
  amount: Number(item.amount),
  service_request_item_id: item.service_request_item_id ?? null,
  quotation_line_item_id: item.quotation_line_item_id ?? null,
});

const mapContract = (
  contract: Contract,
  actor?: ContractActor,
  signatures: ContractSignatureInfo[] = [],
): ContractDetail => {
  const status = contract.status;
  const isAdmin = actor?.role === 'Admin';
  const isSales = actor?.role === 'Sales';
  const isOwner = actor ? contract.created_by === actor.id : false;

  return {
    id: contract.id,
    contract_code: contract.contract_code,
    title: contract.title,
    contract_type: contract.contract_type,
    status,
    quotation_id: contract.quotation_id ?? null,
    customer_id: contract.customer_id,
    customer_name: contract.customer?.company_name ?? contract.party_a_name,
    sign_date: contract.sign_date ?? null,
    start_date: contract.start_date ?? null,
    end_date: contract.end_date ?? null,
    subtotal: Number(contract.subtotal),
    discount_amount: Number(contract.discount_amount),
    travel_fee: Number(contract.travel_fee),
    tax_amount: Number(contract.tax_amount),
    total_amount: Number(contract.total_amount),
    total_in_words: contract.total_in_words ?? null,
    payment_term_days: contract.payment_term_days,
    duration_days: contract.duration_days ?? null,
    location: contract.location ?? null,
    legal_basis: contract.legal_basis ?? null,
    notes: contract.notes ?? null,
    party_a: {
      name: contract.party_a_name,
      representative: contract.party_a_representative,
      position: contract.party_a_position,
      address: contract.party_a_address,
      phone: contract.party_a_phone,
      fax: contract.party_a_fax,
      tax_code: contract.party_a_tax_code,
      bank_account: contract.party_a_bank_account,
      bank_name: contract.party_a_bank_name,
      budget_code: contract.party_a_budget_code,
    },
    party_b: {
      name: contract.party_b_name,
      representative: contract.party_b_representative,
      position: contract.party_b_position,
      address: contract.party_b_address,
      phone: contract.party_b_phone,
      fax: contract.party_b_fax,
      tax_code: contract.party_b_tax_code,
      bank_account: contract.party_b_bank_account,
      bank_name: contract.party_b_bank_name,
    },
    created_by: contract.created_by,
    submitted_at: contract.submitted_at ?? null,
    approved_by: contract.approved_by ?? null,
    approved_at: contract.approved_at ?? null,
    liquidated_by: contract.liquidated_by ?? null,
    liquidated_at: contract.liquidated_at ?? null,
    draft_file_url: contract.draft_file_url ?? null,
    signed_file_url: contract.signed_file_url ?? null,
    created_at: contract.created_at,
    items: [...(contract.items ?? [])]
      .sort((left, right) => left.line_no - right.line_no)
      .map(mapItem),
    signatures,
    can_edit:
      status !== 'Cancelled' &&
      (isAdmin ? ['Draft', 'PendingApproval'].includes(status) : isSales && isOwner && status === 'Draft'),
    can_submit:
      status === 'Draft' && ((isSales && isOwner) || isAdmin),
    can_approve: status === 'PendingApproval' && (isAdmin || actor?.role === 'CEO'),
    can_sign_customer:
      status === 'Approved' &&
      actor?.role === 'Customer' &&
      !signatures.some((signature) => signature.purpose === CUSTOMER_SIGNATURE_PURPOSE),
    can_cancel:
      !['Cancelled', 'Liquidated'].includes(status) &&
      (isAdmin || (isSales && isOwner && ['Draft', 'PendingApproval'].includes(status))),
    can_liquidate:
      ['Approved', 'Signed'].includes(status) && (isAdmin || actor?.role === 'Accountant'),
  };
};

const findContractOrFail = async (
  id: number,
  customerIdFilter?: number,
): Promise<Contract> => {
  const contract = await dataSource.getRepository(Contract).findOne({
    where: {
      id,
      ...(customerIdFilter ? { customer_id: customerIdFilter } : {}),
    },
    relations: { customer: true, items: true },
  });

  if (!contract) {
    throw new AppError(
      'Hợp đồng không tồn tại hoặc bạn không có quyền truy cập.',
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  return contract;
};

export const getDefaultCompanyProfile = async (): Promise<CompanyProfile | null> => {
  const repo = dataSource.getRepository(CompanyProfile);
  const byDefault = await repo.findOne({
    where: { is_default: true },
    order: { id: 'ASC' },
  });
  return byDefault ?? (await repo.findOne({ where: {}, order: { id: 'ASC' } }));
};

export const getNextContractCode = async (): Promise<string> => {
  const repo = dataSource.getRepository(Contract);
  const year = new Date().getFullYear();
  const prefix = `HĐ-${year}-`;

  // Lấy mọi mã đã dùng trong năm (kể cả hợp đồng đã huỷ) để gợi ý mã chưa tồn tại.
  const existing = await repo.find({
    select: { contract_code: true },
    where: { contract_code: Like(`${prefix}%`) },
  });

  const used = new Set(
    existing
      .map((contract) => Number(String(contract.contract_code).slice(prefix.length)))
      .filter((value) => Number.isInteger(value) && value > 0),
  );

  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    if (!used.has(sequence)) {
      return `${prefix}${String(sequence).padStart(3, '0')}`;
    }
  }

  throw new AppError(
    'Đã hết dải mã hợp đồng cho năm hiện tại. Vui lòng nhập mã thủ công.',
    409,
    ERROR_CODES.CONFLICT,
  );
};

export const listAvailableQuotations = async (): Promise<
  Array<{
    id: number;
    quotation_code: string;
    total_amount: number;
    status: string;
    customer: {
      id: number;
      company_name: string;
      tax_code: string | null;
      address: string;
    };
    service_request: {
      id: number;
      request_code: string;
      location_type: string;
      preferred_date: string | null;
    };
    item_count: number;
  }>
> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const contractsRepo = dataSource.getRepository(Contract);

  const quotations = await quotationRepo.find({
    where: { status: 'Approved' },
    relations: {
      service_request: { customer: true },
      line_items: true,
    },
    order: { id: 'DESC' },
  });

  if (quotations.length === 0) {
    return [];
  }

  const blocked = await contractsRepo.find({
    select: { quotation_id: true },
    where: {
      quotation_id: In(quotations.map((quotation) => quotation.id)),
      status: Not('Cancelled'),
    },
  });

  const blockedIds = new Set(blocked.map((contract) => contract.quotation_id));

  return quotations
    .filter((quotation) => !blockedIds.has(quotation.id))
    .map((quotation) => ({
      id: quotation.id,
      quotation_code: formatQuotationCode(quotation.id),
      total_amount: Number(quotation.total_amount),
      status: quotation.status,
      customer: {
        id: quotation.service_request.customer.id,
        company_name: quotation.service_request.customer.company_name,
        tax_code: quotation.service_request.customer.tax_code ?? null,
        address: quotation.service_request.customer.address,
      },
      service_request: {
        id: quotation.service_request.id,
        request_code: quotation.service_request.request_code ?? '',
        location_type: quotation.service_request.location_type,
        preferred_date: quotation.service_request.preferred_date ?? null,
      },
      item_count: quotation.line_items?.length ?? 0,
    }));
};

export const buildContractPrefill = async (quotationId: number): Promise<{
  quotation_id: number;
  quotation_code: string;
  suggested_code: string;
  title: string;
  sign_date: string | null;
  start_date: string | null;
  end_date: string | null;
  duration_days: number | null;
  location: string | null;
  payment_term_days: number;
  legal_basis: string | null;
  notes: string | null;
  travel_fee: number;
  party_a: ContractPartyInput;
  party_b: ContractPartyInput;
  items: ContractItemResult[];
  totals: {
    subtotal: number;
    discount_amount: number;
    travel_fee: number;
    tax_amount: number;
    total_amount: number;
    total_in_words: string;
  };
}> => {
  const quotation = await dataSource.getRepository(Quotation).findOne({
    where: { id: quotationId },
    relations: {
      service_request: { customer: true },
      line_items: {
        service_request_item: { device: true, service_type: true },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Báo giá không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (quotation.status !== 'Approved') {
    throw new AppError(
      `Chỉ có thể lập hợp đồng từ báo giá đã được khách hàng chấp thuận (Approved). Báo giá hiện tại đang ở trạng thái "${quotation.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const activeContract = await dataSource.getRepository(Contract).findOne({
    where: { quotation_id: quotation.id, status: Not('Cancelled') },
  });

  if (activeContract) {
    throw new AppError(
      `Báo giá này đã có hợp đồng ${activeContract.contract_code}. Hãy huỷ hợp đồng cũ trước khi tạo hợp đồng mới.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const company = await getDefaultCompanyProfile();
  const customer = quotation.service_request.customer;
  const isOnSite = quotation.service_request.location_type === 'On-site';

  const normalized: NormalizedItem[] = (quotation.line_items ?? []).map((line) => {
    const requestItem = line.service_request_item;
    const device = requestItem?.device;
    const serviceType = requestItem?.service_type;
    const detailParts = [
      serviceType?.name,
      device?.model ? `Model: ${device.model}` : null,
      device?.manufacturer ? `Hãng: ${device.manufacturer}` : null,
      device?.serial_number ? `Serial: ${device.serial_number}` : null,
      device?.internal_code ? `Mã nội bộ: ${device.internal_code}` : null,
    ].filter(Boolean);

    const gross = roundMoney(Number(line.unit_price));
    const discount = roundMoney(Number(line.discount_amount ?? 0));
    const taxRate = 5;
    const taxAmount = roundMoney(((gross - discount) * taxRate) / 100);

    return {
      name: device?.name || line.description,
      description: detailParts.join(' | ') || line.description,
      location: isOnSite ? customer.address : 'Phòng thí nghiệm ISOCAL',
      execution_time: null,
      quantity: 1,
      unit: 'Thiết bị',
      unit_price: gross,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      amount: gross - discount + taxAmount,
      gross,
      service_request_item_id: requestItem?.id ?? null,
      quotation_line_item_id: line.id,
    };
  });

  const totals = computeTotals(normalized, quotation.travel_fee);
  const suggestedCode = await getNextContractCode();

  return {
    quotation_id: quotation.id,
    quotation_code: formatQuotationCode(quotation.id),
    suggested_code: suggestedCode,
    title: 'Hợp đồng cung cấp dịch vụ kiểm định, hiệu chuẩn thiết bị đo lường',
    sign_date: null,
    start_date: null,
    end_date: null,
    duration_days: null,
    location: isOnSite ? customer.address : 'Phòng thí nghiệm ISOCAL',
    payment_term_days: 30,
    legal_basis: null,
    notes: null,
    travel_fee: totals.travelFee,
    party_a: {
      name: customer.company_name,
      representative: null,
      position: null,
      address: customer.address,
      phone: null,
      fax: null,
      tax_code: customer.tax_code ?? null,
      bank_account: null,
      bank_name: null,
      budget_code: null,
    },
    party_b: {
      name: company?.name ?? '',
      representative: company?.representative ?? null,
      position: company?.position ?? null,
      address: company?.address ?? null,
      phone: company?.phone ?? null,
      fax: company?.fax ?? null,
      tax_code: company?.tax_code ?? null,
      bank_account: company?.bank_account ?? null,
      bank_name: company?.bank_name ?? null,
    },
    items: normalized.map((item, index) => ({
      id: 0,
      line_no: index + 1,
      name: item.name,
      description: item.description,
      location: item.location,
      execution_time: item.execution_time,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      discount_amount: item.discount_amount,
      tax_rate: item.tax_rate,
      tax_amount: item.tax_amount,
      amount: item.amount,
      service_request_item_id: item.service_request_item_id,
      quotation_line_item_id: item.quotation_line_item_id,
    })),
    totals: {
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      travel_fee: totals.travelFee,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      total_in_words: numberToVietnameseWords(totals.totalAmount),
    },
  };
};

export const listContracts = async (): Promise<ContractSummary[]> => {
  const contracts = await dataSource.getRepository(Contract).find({
    relations: { customer: true },
    order: { id: 'DESC' },
  });

  return contracts.map((contract) => ({
    id: contract.id,
    contract_code: contract.contract_code,
    title: contract.title,
    contract_type: contract.contract_type,
    status: contract.status,
    quotation_id: contract.quotation_id ?? null,
    customer_id: contract.customer_id,
    customer_name: contract.customer?.company_name ?? contract.party_a_name,
    sign_date: contract.sign_date ?? null,
    start_date: contract.start_date ?? null,
    end_date: contract.end_date ?? null,
    total_amount: Number(contract.total_amount),
    created_at: contract.created_at,
  }));
};

export const getContractDetail = async (
  id: number,
  actor: ContractActor,
  customerIdFilter?: number,
): Promise<ContractDetail> => {
  const contract = await findContractOrFail(id, customerIdFilter);
  const signatures = await listContractSignatures(id);
  return mapContract(contract, actor, signatures);
};

const assertCodeAvailable = async (code: string, excludeId?: number): Promise<void> => {
  const existing = await dataSource.getRepository(Contract).findOne({
    where: { contract_code: code },
    select: { id: true },
  });

  if (existing && existing.id !== excludeId) {
    throw new AppError(
      `Mã hợp đồng "${code}" đã được sử dụng. Vui lòng chọn mã khác.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }
};

export const createContract = async (
  input: CreateContractInput,
  actor: ContractActor,
): Promise<ContractDetail> => {
  const quotationId = Number(input.quotation_id);
  if (!Number.isInteger(quotationId) || quotationId <= 0) {
    throw new AppError('Thiếu thông tin báo giá nguồn.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const quotation = await dataSource.getRepository(Quotation).findOne({
    where: { id: quotationId },
    relations: { service_request: { customer: true } },
  });

  if (!quotation) {
    throw new AppError('Báo giá không tồn tại.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (quotation.status !== 'Approved') {
    throw new AppError(
      `Chỉ có thể lập hợp đồng từ báo giá đã được khách hàng chấp thuận (Approved). Báo giá hiện tại đang ở trạng thái "${quotation.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const activeContract = await dataSource.getRepository(Contract).findOne({
    where: { quotation_id: quotationId, status: Not('Cancelled') },
  });

  if (activeContract) {
    throw new AppError(
      `Báo giá này đã có hợp đồng ${activeContract.contract_code}. Hãy huỷ hợp đồng cũ trước khi tạo hợp đồng mới.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const code = normalizeOptionalString(input.contract_code);
  if (!code || code.length > 50) {
    throw new AppError('Mã hợp đồng là bắt buộc và không vượt quá 50 ký tự.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  await assertCodeAvailable(code);

  const items = normalizeItems(input.items);
  const totals = computeTotals(items, input.travel_fee);
  const customer = quotation.service_request.customer;
  const company = await getDefaultCompanyProfile();

  const partyA = input.party_a ?? {};
  const partyB = input.party_b ?? {};

  const partyAName = normalizeOptionalString(partyA.name) ?? customer.company_name;
  const partyBName = normalizeOptionalString(partyB.name) ?? normalizeOptionalString(company?.name);
  if (!partyAName || !partyBName) {
    throw new AppError(
      'Thiếu tên pháp lý của Bên A hoặc Bên B.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const now = new Date();

  const saved = await dataSource.transaction(async (manager) => {
    const contractRepo = manager.getRepository(Contract);
    const itemRepo = manager.getRepository(ContractItem);

    const contract = contractRepo.create({
      contract_code: code,
      contract_type: 'Service',
      quotation_id: quotationId,
      customer_id: customer.id,
      title: normalizeOptionalString(input.title) ?? 'Hợp đồng cung cấp dịch vụ kiểm định, hiệu chuẩn thiết bị đo lường',
      sign_date: normalizeDate(input.sign_date, 'Ngày ký'),
      start_date: normalizeDate(input.start_date, 'Ngày bắt đầu'),
      end_date: normalizeDate(input.end_date, 'Ngày kết thúc'),
      duration_days:
        input.duration_days === undefined || input.duration_days === null
          ? null
          : Math.max(0, Math.round(Number(input.duration_days))),
      location: normalizeOptionalString(input.location),
      subtotal: totals.subtotal.toFixed(2),
      discount_amount: totals.discountAmount.toFixed(2),
      travel_fee: totals.travelFee.toFixed(2),
      tax_amount: totals.taxAmount.toFixed(2),
      total_amount: totals.totalAmount.toFixed(2),
      total_in_words: numberToVietnameseWords(totals.totalAmount),
      payment_term_days: Math.max(0, Math.round(Number(input.payment_term_days ?? 30))),
      legal_basis: normalizeOptionalString(input.legal_basis),
      notes: normalizeOptionalString(input.notes),
      status: 'Draft',
      party_a_name: partyAName,
      party_a_representative: normalizeOptionalString(partyA.representative),
      party_a_position: normalizeOptionalString(partyA.position),
      party_a_address: normalizeOptionalString(partyA.address),
      party_a_phone: normalizeOptionalString(partyA.phone),
      party_a_fax: normalizeOptionalString(partyA.fax),
      party_a_tax_code: normalizeOptionalString(partyA.tax_code),
      party_a_bank_account: normalizeOptionalString(partyA.bank_account),
      party_a_bank_name: normalizeOptionalString(partyA.bank_name),
      party_a_budget_code: normalizeOptionalString(partyA.budget_code),
      party_b_name: partyBName,
      party_b_representative: normalizeOptionalString(partyB.representative),
      party_b_position: normalizeOptionalString(partyB.position),
      party_b_address: normalizeOptionalString(partyB.address),
      party_b_phone: normalizeOptionalString(partyB.phone),
      party_b_fax: normalizeOptionalString(partyB.fax),
      party_b_tax_code: normalizeOptionalString(partyB.tax_code),
      party_b_bank_account: normalizeOptionalString(partyB.bank_account),
      party_b_bank_name: normalizeOptionalString(partyB.bank_name),
      created_by: actor.id,
      created_at: now,
      updated_at: now,
    });

    const persisted = await contractRepo.save(contract);

    const itemEntities = items.map((item, index) =>
      itemRepo.create({
        contract_id: persisted.id,
        service_request_item_id: item.service_request_item_id,
        quotation_line_item_id: item.quotation_line_item_id,
        line_no: index + 1,
        name: item.name,
        description: item.description,
        location: item.location,
        execution_time: item.execution_time,
        quantity: item.quantity.toFixed(3),
        unit: item.unit,
        unit_price: item.unit_price.toFixed(2),
        discount_amount: item.discount_amount.toFixed(2),
        tax_rate: item.tax_rate.toFixed(2),
        tax_amount: item.tax_amount.toFixed(2),
        amount: item.amount.toFixed(2),
        created_at: now,
      }),
    );

    await itemRepo.save(itemEntities);

    return { ...persisted, customer, items: itemEntities };
  });

  return mapContract(saved as Contract, actor);
};

export const updateContract = async (
  id: number,
  input: UpdateContractInput,
  actor: ContractActor,
): Promise<ContractDetail> => {
  const contract = await findContractOrFail(id);
  const detail = mapContract(contract, actor);

  if (!detail.can_edit) {
    throw new AppError(
      `Không thể chỉnh sửa hợp đồng ở trạng thái "${contract.status}". Hãy huỷ và tạo hợp đồng mới nếu cần thay đổi.`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const code = normalizeOptionalString(input.contract_code);
  if (!code || code.length > 50) {
    throw new AppError('Mã hợp đồng là bắt buộc và không vượt quá 50 ký tự.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  await assertCodeAvailable(code, id);

  const items = normalizeItems(input.items);
  const totals = computeTotals(items, input.travel_fee);
  const partyA = input.party_a ?? {};
  const partyB = input.party_b ?? {};

  const partyAName = normalizeOptionalString(partyA.name) ?? contract.party_a_name;
  const partyBName = normalizeOptionalString(partyB.name) ?? contract.party_b_name;
  if (!partyAName || !partyBName) {
    throw new AppError('Thiếu tên pháp lý của Bên A hoặc Bên B.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const now = new Date();

  const saved = await dataSource.transaction(async (manager) => {
    const contractRepo = manager.getRepository(Contract);
    const itemRepo = manager.getRepository(ContractItem);

    contract.contract_code = code;
    contract.title =
      normalizeOptionalString(input.title) ?? contract.title;
    contract.sign_date = normalizeDate(input.sign_date, 'Ngày ký');
    contract.start_date = normalizeDate(input.start_date, 'Ngày bắt đầu');
    contract.end_date = normalizeDate(input.end_date, 'Ngày kết thúc');
    contract.duration_days =
      input.duration_days === undefined || input.duration_days === null
        ? contract.duration_days
        : Math.max(0, Math.round(Number(input.duration_days)));
    contract.location = normalizeOptionalString(input.location);
    contract.subtotal = totals.subtotal.toFixed(2);
    contract.discount_amount = totals.discountAmount.toFixed(2);
    contract.travel_fee = totals.travelFee.toFixed(2);
    contract.tax_amount = totals.taxAmount.toFixed(2);
    contract.total_amount = totals.totalAmount.toFixed(2);
    contract.total_in_words = numberToVietnameseWords(totals.totalAmount);
    contract.payment_term_days = Math.max(
      0,
      Math.round(Number(input.payment_term_days ?? contract.payment_term_days)),
    );
    contract.legal_basis =
      input.legal_basis === undefined ? contract.legal_basis : normalizeOptionalString(input.legal_basis);
    contract.notes = input.notes === undefined ? contract.notes : normalizeOptionalString(input.notes);
    contract.party_a_name = partyAName;
    contract.party_a_representative = normalizeOptionalString(partyA.representative);
    contract.party_a_position = normalizeOptionalString(partyA.position);
    contract.party_a_address = normalizeOptionalString(partyA.address);
    contract.party_a_phone = normalizeOptionalString(partyA.phone);
    contract.party_a_fax = normalizeOptionalString(partyA.fax);
    contract.party_a_tax_code = normalizeOptionalString(partyA.tax_code);
    contract.party_a_bank_account = normalizeOptionalString(partyA.bank_account);
    contract.party_a_bank_name = normalizeOptionalString(partyA.bank_name);
    contract.party_a_budget_code = normalizeOptionalString(partyA.budget_code);
    contract.party_b_name = partyBName;
    contract.party_b_representative = normalizeOptionalString(partyB.representative);
    contract.party_b_position = normalizeOptionalString(partyB.position);
    contract.party_b_address = normalizeOptionalString(partyB.address);
    contract.party_b_phone = normalizeOptionalString(partyB.phone);
    contract.party_b_fax = normalizeOptionalString(partyB.fax);
    contract.party_b_tax_code = normalizeOptionalString(partyB.tax_code);
    contract.party_b_bank_account = normalizeOptionalString(partyB.bank_account);
    contract.party_b_bank_name = normalizeOptionalString(partyB.bank_name);
    contract.updated_at = now;

    await contractRepo.save(contract);

    await itemRepo.delete({ contract_id: id });

    const itemEntities = items.map((item, index) =>
      itemRepo.create({
        contract_id: id,
        service_request_item_id: item.service_request_item_id,
        quotation_line_item_id: item.quotation_line_item_id,
        line_no: index + 1,
        name: item.name,
        description: item.description,
        location: item.location,
        execution_time: item.execution_time,
        quantity: item.quantity.toFixed(3),
        unit: item.unit,
        unit_price: item.unit_price.toFixed(2),
        discount_amount: item.discount_amount.toFixed(2),
        tax_rate: item.tax_rate.toFixed(2),
        tax_amount: item.tax_amount.toFixed(2),
        amount: item.amount.toFixed(2),
        created_at: now,
      }),
    );

    await itemRepo.save(itemEntities);

    return { ...contract, items: itemEntities };
  });

  return mapContract(saved as Contract, actor);
};

const transition = async (
  id: number,
  actor: ContractActor,
  allowedRoles: string[],
  from: string[],
  to: string,
  checkOwner: boolean,
  patch: Partial<Contract>,
): Promise<ContractDetail> => {
  const contract = await findContractOrFail(id);
  const isAllowedRole = allowedRoles.includes(actor.role);

  if (!isAllowedRole) {
    throw new AppError('Bạn không có quyền thực hiện thao tác này.', 403, ERROR_CODES.FORBIDDEN);
  }

  if (checkOwner && contract.created_by !== actor.id) {
    throw new AppError('Chỉ người tạo hợp đồng mới được thực hiện thao tác này.', 403, ERROR_CODES.FORBIDDEN);
  }

  if (!from.includes(contract.status)) {
    throw new AppError(
      `Không thể chuyển hợp đồng từ trạng thái "${contract.status}" sang "${to}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  contract.status = to;
  Object.assign(contract, patch, { updated_at: new Date() });

  await dataSource.getRepository(Contract).save(contract);
  return mapContract(contract, actor);
};

export const submitContract = async (
  id: number,
  actor: ContractActor,
): Promise<ContractDetail> =>
  transition(
    id,
    actor,
    ['Sales', 'Admin'],
    ['Draft'],
    'PendingApproval',
    actor.role === 'Sales',
    { submitted_at: new Date() },
  );

export const approveContract = async (
  id: number,
  actor: ContractActor,
): Promise<ContractDetail> => {
  if (!['Admin', 'CEO'].includes(actor.role)) {
    throw new AppError('Bạn không có quyền thực hiện thao tác này.', 403, ERROR_CODES.FORBIDDEN);
  }

  const contract = await findContractOrFail(id);

  if (contract.status !== 'PendingApproval') {
    throw new AppError(
      `Không thể duyệt hợp đồng ở trạng thái "${contract.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const now = new Date();

  await dataSource.transaction(async (manager) => {
    await createSignatureRecord(manager, contract, COMPANY_SIGNATURE_PURPOSE, actor.id);

    contract.status = 'Approved';
    contract.approved_by = actor.id;
    contract.approved_at = now;
    contract.updated_at = now;

    await manager.getRepository(Contract).save(contract);
  });

  return getContractDetail(id, actor);
};

export const signContractAsCustomer = async (
  id: number,
  actor: ContractActor,
  customerIdFilter?: number,
): Promise<ContractDetail> => {
  if (actor.role !== 'Customer') {
    throw new AppError('Chỉ khách hàng của hợp đồng mới được ký.', 403, ERROR_CODES.FORBIDDEN);
  }

  const contract = await findContractOrFail(id, customerIdFilter);

  if (contract.status !== 'Approved') {
    throw new AppError(
      `Chỉ có thể ký hợp đồng đã được Bên B duyệt. Trạng thái hiện tại: "${contract.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const signatures = await listContractSignatures(id);
  if (!signatures.some((signature) => signature.purpose === COMPANY_SIGNATURE_PURPOSE)) {
    throw new AppError(
      'Hợp đồng chưa có chữ ký của Bên B.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (signatures.some((signature) => signature.purpose === CUSTOMER_SIGNATURE_PURPOSE)) {
    throw new AppError(
      'Hợp đồng đã có chữ ký của Bên A.',
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const now = new Date();

  await dataSource.transaction(async (manager) => {
    await createSignatureRecord(manager, contract, CUSTOMER_SIGNATURE_PURPOSE, actor.id);

    contract.status = 'Signed';
    contract.updated_at = now;

    await manager.getRepository(Contract).save(contract);
    await ensureWorkOrderForContract(manager, contract);
  });

  try {
    await finalizeSignedContract(id);
  } catch (error) {
    console.error('[Contract] Không thể tạo file PDF đã ký:', error);
  }

  return getContractDetail(id, actor, customerIdFilter);
};

export const cancelContract = async (
  id: number,
  actor: ContractActor,
): Promise<ContractDetail> =>
  transition(
    id,
    actor,
    ['Sales', 'Admin'],
    ['Draft', 'PendingApproval', 'Approved'],
    'Cancelled',
    actor.role === 'Sales',
    {},
  );

export const liquidateContract = async (
  id: number,
  actor: ContractActor,
): Promise<ContractDetail> =>
  transition(
    id,
    actor,
    ['Accountant', 'Admin'],
    ['Approved', 'Signed'],
    'Liquidated',
    false,
    { liquidated_by: actor.id, liquidated_at: new Date() },
  );
