import { In } from 'typeorm';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import dataSource from '../../database/dataSource.js';
import {
  Quotation,
  QuotationLineItem,
  ServiceRequest,
  ServiceRequestItem,
} from '../../database/entities.js';

export const ALLOWED_CREATE_QUOTATION_STATUSES = ['Draft', 'Sent'] as const;
export type CreateQuotationStatus = (typeof ALLOWED_CREATE_QUOTATION_STATUSES)[number];

const NON_QUOTABLE_REQUEST_STATUSES = new Set([
  'Confirmed',
  'InProgress',
  'Completed',
  'Cancelled',
]);

export interface CreateQuotationLineItemInput {
  service_request_item_id: number;
  description: string;
  unit_price: number;
  discount_amount?: number;
}

export interface CreateQuotationInput {
  service_request_id: number;
  discount_amount?: number;
  extra_discount?: number;
  travel_fee?: number;
  estimated_completion_date?: string | null;
  status?: CreateQuotationStatus;
  line_items: CreateQuotationLineItemInput[];
}

export interface QuotationLineItemResult {
  id: number;
  quotation_id: number;
  service_request_item_id: number;
  description: string;
  unit_price: number;
  discount_amount: number;
}

export interface QuotationResult {
  id: number;
  quotation_code: string;
  service_request_id: number;
  service_request_status: string;
  subtotal: number;
  discount_amount: number;
  travel_fee: number;
  total_amount: number;
  estimated_completion_date: string | null;
  status: string;
  is_updated_draft?: boolean;
  line_items: QuotationLineItemResult[];
}

export const formatQuotationCode = (
  id: number,
  date: Date = new Date(),
): string => {
  const year = date.getFullYear();
  return `QT-${year}-${String(id).padStart(3, '0')}`;
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const toFixedNumericString = (value: number): string => roundCurrency(value).toFixed(2);

/**
 * Tạo hoặc cập nhật báo giá nháp ('Draft' / 'Sent'):
 * - Chặn tạo mới (409 CONFLICT) nếu phiếu yêu cầu đang có báo giá ở trạng thái 'Sent' hoặc 'Approved'.
 *   Chỉ cho phép tạo báo giá mới khi chưa có báo giá hoặc báo giá trước đó đã bị 'Rejected'.
 * - Nếu phiếu yêu cầu đang có bản nháp ('Draft'), tự động cập nhật trực tiếp lên bản nháp đó
 *   thay vì sinh thêm dòng mới trong CSDL.
 * - Khi status = 'Sent', tự động chuyển trạng thái ServiceRequest sang 'Quoted'.
 */
export const createQuotation = async (
  input: CreateQuotationInput,
): Promise<QuotationResult> => {
  const {
    service_request_id: serviceRequestId,
    discount_amount: explicitDiscountAmount,
    extra_discount: extraDiscount = 0,
    travel_fee: rawTravelFee = 0,
    estimated_completion_date: rawCompletionDate = null,
    status = 'Draft',
    line_items: lineItems,
  } = input;

  // 1. Kiểm tra phiếu yêu cầu dịch vụ (ServiceRequest) tồn tại và hợp lệ
  const serviceRequestRepo = dataSource.getRepository(ServiceRequest);
  const serviceRequest = await serviceRequestRepo.findOne({
    select: {
      id: true,
      status: true,
    },
    where: { id: serviceRequestId },
  });

  if (!serviceRequest) {
    throw new AppError(
      'Service request not found.',
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  if (NON_QUOTABLE_REQUEST_STATUSES.has(serviceRequest.status)) {
    throw new AppError(
      `Không thể lập báo giá cho phiếu yêu cầu đang ở trạng thái "${serviceRequest.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // 2. Kiểm tra các báo giá hiện có của ServiceRequest này
  const existingQuotationsRepo = dataSource.getRepository(Quotation);
  const existingQuotations =
    typeof existingQuotationsRepo.find === 'function'
      ? await existingQuotationsRepo.find({
          where: { service_request_id: serviceRequestId },
          order: { id: 'DESC' },
        })
      : [];

  const activeQuotation = existingQuotations.find(
    (q) => q.status === 'Sent' || q.status === 'Approved',
  );

  if (activeQuotation) {
    throw new AppError(
      `Phiếu yêu cầu này đã có báo giá ${formatQuotationCode(activeQuotation.id)} đang ở trạng thái "${activeQuotation.status}". Chỉ được lập báo giá mới khi báo giá trước đó bị khách hàng Từ chối (Rejected).`,
      409,
      ERROR_CODES.CONFLICT,
      {
        existing_quotation_id: activeQuotation.id,
        existing_quotation_status: activeQuotation.status,
      },
    );
  }

  const existingDraft = existingQuotations.find((q) => q.status === 'Draft') ?? null;

  // 3. Kiểm tra danh sách hạng mục (ServiceRequestItem) tồn tại và thuộc đúng ServiceRequest
  const requestItemIds = lineItems.map((item) => item.service_request_item_id);
  const serviceRequestItemRepo = dataSource.getRepository(ServiceRequestItem);
  const existingRequestItems = await serviceRequestItemRepo.find({
    select: {
      id: true,
      service_request_id: true,
      status: true,
    },
    where: {
      id: In(requestItemIds),
    },
  });

  if (existingRequestItems.length !== requestItemIds.length) {
    const foundIds = new Set(existingRequestItems.map((item) => item.id));
    const missingItemIds = requestItemIds.filter((id) => !foundIds.has(id));
    throw new AppError(
      'One or more service request items were not found.',
      404,
      ERROR_CODES.NOT_FOUND,
      { missing_service_request_item_ids: missingItemIds },
    );
  }

  const invalidRequestItems = existingRequestItems.filter(
    (item) => item.service_request_id !== serviceRequestId,
  );
  if (invalidRequestItems.length > 0) {
    throw new AppError(
      'All quotation line items must belong to the specified service request.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
      {
        invalid_service_request_item_ids: invalidRequestItems.map((item) => item.id),
      },
    );
  }

  // 4. Tính toán và kiểm tra ràng buộc tài chính (subtotal, discount_amount, travel_fee, total_amount)
  const normalizedLineItems = lineItems.map((item) => {
    const unitPrice = roundCurrency(Number(item.unit_price));
    const lineDiscount = roundCurrency(Number(item.discount_amount ?? 0));

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new AppError(
        'Line item unit_price must be a number greater than or equal to 0.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    if (!Number.isFinite(lineDiscount) || lineDiscount < 0 || lineDiscount > unitPrice) {
      throw new AppError(
        'Line item discount_amount must be between 0 and unit_price.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        { service_request_item_id: item.service_request_item_id },
      );
    }

    return {
      service_request_item_id: item.service_request_item_id,
      description: item.description.trim(),
      unit_price: unitPrice,
      discount_amount: lineDiscount,
    };
  });

  const subtotal = roundCurrency(
    normalizedLineItems.reduce((sum, item) => sum + item.unit_price, 0),
  );
  const lineDiscountTotal = roundCurrency(
    normalizedLineItems.reduce((sum, item) => sum + item.discount_amount, 0),
  );

  const numericExtraDiscount = roundCurrency(Number(extraDiscount ?? 0));
  if (!Number.isFinite(numericExtraDiscount) || numericExtraDiscount < 0) {
    throw new AppError(
      'extra_discount must be a number greater than or equal to 0.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  let totalDiscountAmount = roundCurrency(lineDiscountTotal + numericExtraDiscount);
  if (explicitDiscountAmount !== undefined) {
    const parsedExplicitDiscount = roundCurrency(Number(explicitDiscountAmount));
    if (!Number.isFinite(parsedExplicitDiscount) || parsedExplicitDiscount < 0) {
      throw new AppError(
        'discount_amount must be a number greater than or equal to 0.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
    if (parsedExplicitDiscount < lineDiscountTotal) {
      throw new AppError(
        'Total quotation discount_amount cannot be less than the sum of line item discounts.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
        {
          discount_amount: parsedExplicitDiscount,
          line_discount_total: lineDiscountTotal,
        },
      );
    }
    totalDiscountAmount = parsedExplicitDiscount;
  }

  if (totalDiscountAmount > subtotal) {
    throw new AppError(
      'Total discount_amount cannot exceed subtotal.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
      {
        subtotal,
        discount_amount: totalDiscountAmount,
      },
    );
  }

  const travelFee = roundCurrency(Number(rawTravelFee ?? 0));
  if (!Number.isFinite(travelFee) || travelFee < 0) {
    throw new AppError(
      'travel_fee must be a number greater than or equal to 0.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const totalAmount = roundCurrency(subtotal - totalDiscountAmount + travelFee);
  const estimatedCompletionDate = rawCompletionDate ? rawCompletionDate.trim() : null;

  // 5. Lưu mới hoặc cập nhật trực tiếp bản nháp Draft hiện có (Upsert Draft)
  const persistQuotation = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<QuotationResult> => {
    const quotationRepo = getRepository(Quotation);
    const quotationLineItemRepo = getRepository(QuotationLineItem);
    const srRepo = getRepository(ServiceRequest);

    let savedQuotation: Quotation;
    const isUpdatingDraft = Boolean(existingDraft);

    if (existingDraft) {
      existingDraft.subtotal = toFixedNumericString(subtotal);
      existingDraft.discount_amount = toFixedNumericString(totalDiscountAmount);
      existingDraft.travel_fee = toFixedNumericString(travelFee);
      existingDraft.total_amount = toFixedNumericString(totalAmount);
      existingDraft.estimated_completion_date = estimatedCompletionDate;
      existingDraft.status = status;
      savedQuotation = await quotationRepo.save(existingDraft);

      if (typeof quotationLineItemRepo.delete === 'function') {
        await quotationLineItemRepo.delete({ quotation_id: savedQuotation.id });
      }
    } else {
      const quotationEntity = quotationRepo.create({
        service_request_id: serviceRequestId,
        subtotal: toFixedNumericString(subtotal),
        discount_amount: toFixedNumericString(totalDiscountAmount),
        travel_fee: toFixedNumericString(travelFee),
        total_amount: toFixedNumericString(totalAmount),
        estimated_completion_date: estimatedCompletionDate,
        status,
      });

      savedQuotation = await quotationRepo.save(quotationEntity);
    }

    const lineItemEntities = normalizedLineItems.map((line) =>
      quotationLineItemRepo.create({
        quotation_id: savedQuotation.id,
        service_request_item_id: line.service_request_item_id,
        description: line.description,
        unit_price: toFixedNumericString(line.unit_price),
        discount_amount: toFixedNumericString(line.discount_amount),
      }),
    );

    const savedLineItems = await quotationLineItemRepo.save(lineItemEntities);

    let updatedServiceRequestStatus = serviceRequest.status;
    if (status === 'Sent' && serviceRequest.status !== 'Quoted') {
      serviceRequest.status = 'Quoted';
      await srRepo.save(serviceRequest);
      updatedServiceRequestStatus = 'Quoted';
    }

    return {
      id: savedQuotation.id,
      quotation_code: formatQuotationCode(savedQuotation.id),
      service_request_id: savedQuotation.service_request_id,
      service_request_status: updatedServiceRequestStatus,
      subtotal: Number(savedQuotation.subtotal),
      discount_amount: Number(savedQuotation.discount_amount),
      travel_fee: Number(savedQuotation.travel_fee),
      total_amount: Number(savedQuotation.total_amount),
      estimated_completion_date: savedQuotation.estimated_completion_date ?? null,
      status: savedQuotation.status,
      ...(isUpdatingDraft ? { is_updated_draft: true } : {}),
      line_items: savedLineItems.map((savedLine) => ({
        id: savedLine.id,
        quotation_id: savedLine.quotation_id,
        service_request_item_id: savedLine.service_request_item_id,
        description: savedLine.description,
        unit_price: Number(savedLine.unit_price),
        discount_amount: Number(savedLine.discount_amount),
      })),
    };
  };

  if (typeof dataSource.transaction === 'function') {
    return dataSource.transaction(async (manager) =>
      persistQuotation(manager.getRepository.bind(manager)),
    );
  }

  return persistQuotation(dataSource.getRepository.bind(dataSource));
};

/**
 * Chuyển báo giá từ bản nháp ('Draft') sang trạng thái gửi khách hàng ('Sent')
 * và tự động cập nhật trạng thái ServiceRequest sang 'Quoted'.
 */
export const sendDraftQuotation = async (
  quotationId: number,
): Promise<QuotationResult> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: {
      line_items: true,
      service_request: true,
    },
  });

  if (!quotation) {
    throw new AppError(
      'Quotation not found.',
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  if (quotation.status !== 'Draft') {
    throw new AppError(
      `Only quotations in "Draft" status can be sent. Current status: "${quotation.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const serviceRequest = quotation.service_request;
  if (serviceRequest && NON_QUOTABLE_REQUEST_STATUSES.has(serviceRequest.status)) {
    throw new AppError(
      `Cannot send quotation for a service request with status "${serviceRequest.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (typeof quotationRepo.find === 'function') {
    const siblingQuotations = await quotationRepo.find({
      where: { service_request_id: quotation.service_request_id },
    });
    const activeSibling = siblingQuotations.find(
      (q) => q.id !== quotation.id && (q.status === 'Sent' || q.status === 'Approved'),
    );
    if (activeSibling) {
      throw new AppError(
        `Phiếu yêu cầu này đã có báo giá ${formatQuotationCode(activeSibling.id)} ở trạng thái "${activeSibling.status}".`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }
  }

  const persistSend = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<QuotationResult> => {
    const qRepo = getRepository(Quotation);
    const srRepo = getRepository(ServiceRequest);

    quotation.status = 'Sent';
    const savedQuotation = await qRepo.save(quotation);

    let updatedServiceRequestStatus = serviceRequest?.status ?? 'Quoted';
    if (serviceRequest && serviceRequest.status !== 'Quoted') {
      serviceRequest.status = 'Quoted';
      await srRepo.save(serviceRequest);
      updatedServiceRequestStatus = 'Quoted';
    }

    return {
      id: savedQuotation.id,
      quotation_code: formatQuotationCode(savedQuotation.id),
      service_request_id: savedQuotation.service_request_id,
      service_request_status: updatedServiceRequestStatus,
      subtotal: Number(savedQuotation.subtotal),
      discount_amount: Number(savedQuotation.discount_amount),
      travel_fee: Number(savedQuotation.travel_fee),
      total_amount: Number(savedQuotation.total_amount),
      estimated_completion_date: savedQuotation.estimated_completion_date ?? null,
      status: savedQuotation.status,
      line_items: (quotation.line_items ?? []).map((line) => ({
        id: line.id,
        quotation_id: line.quotation_id,
        service_request_item_id: line.service_request_item_id,
        description: line.description,
        unit_price: Number(line.unit_price),
        discount_amount: Number(line.discount_amount),
      })),
    };
  };

  if (typeof dataSource.transaction === 'function') {
    return dataSource.transaction(async (manager) =>
      persistSend(manager.getRepository.bind(manager)),
    );
  }

  return persistSend(dataSource.getRepository.bind(dataSource));
};
