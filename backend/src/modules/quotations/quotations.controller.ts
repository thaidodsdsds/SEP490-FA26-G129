import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_CREATE_QUOTATION_STATUSES,
  createQuotation,
  sendDraftQuotation,
  type CreateQuotationLineItemInput,
  type CreateQuotationStatus,
} from './quotations.service.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Chuẩn hóa và kiểm tra danh sách line_items khi tạo báo giá.
 */
const normalizeQuotationLineItems = (
  rawLineItems: unknown,
): CreateQuotationLineItemInput[] => {
  if (!Array.isArray(rawLineItems) || rawLineItems.length === 0) {
    throw new AppError(
      'line_items must be a non-empty array.',
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const normalized: CreateQuotationLineItemInput[] = [];
  const seenRequestItemIds = new Set<number>();

  for (const rawItem of rawLineItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new AppError(
        'Each quotation line item must be an object.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const record = rawItem as Record<string, unknown>;
    const serviceRequestItemId = Number(record.service_request_item_id);

    if (!Number.isInteger(serviceRequestItemId) || serviceRequestItemId <= 0) {
      throw new AppError(
        'Each line item must have a valid positive integer service_request_item_id.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    if (seenRequestItemIds.has(serviceRequestItemId)) {
      throw new AppError(
        'Duplicate service_request_item_id in quotation line_items.',
        400,
        ERROR_CODES.BAD_REQUEST,
        { duplicate_service_request_item_id: serviceRequestItemId },
      );
    }
    seenRequestItemIds.add(serviceRequestItemId);

    if (
      typeof record.description !== 'string'
      || record.description.trim().length === 0
    ) {
      throw new AppError(
        'Each line item must have a non-empty description.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const unitPrice = Number(record.unit_price);
    if (
      record.unit_price === undefined
      || record.unit_price === null
      || record.unit_price === ''
      || !Number.isFinite(unitPrice)
      || unitPrice < 0
    ) {
      throw new AppError(
        'Each line item must have a valid unit_price greater than or equal to 0.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const discountAmount =
      record.discount_amount === undefined || record.discount_amount === null || record.discount_amount === ''
        ? 0
        : Number(record.discount_amount);

    if (!Number.isFinite(discountAmount) || discountAmount < 0 || discountAmount > unitPrice) {
      throw new AppError(
        'Line item discount_amount must be between 0 and unit_price.',
        400,
        ERROR_CODES.BAD_REQUEST,
        { service_request_item_id: serviceRequestItemId },
      );
    }

    normalized.push({
      service_request_item_id: serviceRequestItemId,
      description: record.description.trim(),
      unit_price: unitPrice,
      discount_amount: discountAmount,
    });
  }

  return normalized;
};

/**
 * POST /api/v1/quotations
 * Tạo báo giá ở trạng thái 'Draft' (lưu bản nháp) hoặc 'Sent' (gửi cho khách hàng)
 */
export const createQuotationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accountId =
      typeof req.user === 'object' && req.user !== null
        ? Number((req.user as { id?: unknown }).id)
        : NaN;
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new AppError(
        'Authenticated account is required.',
        401,
        ERROR_CODES.UNAUTHORIZED,
      );
    }

    const {
      service_request_id: rawServiceRequestId,
      discount_amount: rawDiscountAmount,
      extra_discount: rawExtraDiscount,
      travel_fee: rawTravelFee,
      estimated_completion_date: rawCompletionDate,
      status: rawStatus = 'Draft',
      line_items: rawLineItems,
    } = (req.body ?? {}) as Record<string, unknown>;

    const serviceRequestId = Number(rawServiceRequestId);
    if (!Number.isInteger(serviceRequestId) || serviceRequestId <= 0) {
      throw new AppError(
        'Invalid service_request_id. Must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    if (
      typeof rawStatus !== 'string'
      || !ALLOWED_CREATE_QUOTATION_STATUSES.includes(
        rawStatus as CreateQuotationStatus,
      )
    ) {
      throw new AppError(
        `Invalid status. Allowed values: ${ALLOWED_CREATE_QUOTATION_STATUSES.join(', ')}.`,
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    let estimatedCompletionDate: string | null = null;
    if (
      rawCompletionDate !== undefined
      && rawCompletionDate !== null
      && rawCompletionDate !== ''
    ) {
      if (
        typeof rawCompletionDate !== 'string'
        || !DATE_REGEX.test(rawCompletionDate.trim())
        || Number.isNaN(Date.parse(rawCompletionDate.trim()))
      ) {
        throw new AppError(
          'Invalid estimated_completion_date. Expected YYYY-MM-DD format.',
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }
      estimatedCompletionDate = rawCompletionDate.trim();
    }

    let explicitDiscountAmount: number | undefined;
    if (
      rawDiscountAmount !== undefined
      && rawDiscountAmount !== null
      && rawDiscountAmount !== ''
    ) {
      const parsedDiscount = Number(rawDiscountAmount);
      if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) {
        throw new AppError(
          'discount_amount must be a number greater than or equal to 0.',
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }
      explicitDiscountAmount = parsedDiscount;
    }

    let extraDiscount = 0;
    if (
      rawExtraDiscount !== undefined
      && rawExtraDiscount !== null
      && rawExtraDiscount !== ''
    ) {
      const parsedExtraDiscount = Number(rawExtraDiscount);
      if (!Number.isFinite(parsedExtraDiscount) || parsedExtraDiscount < 0) {
        throw new AppError(
          'extra_discount must be a number greater than or equal to 0.',
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }
      extraDiscount = parsedExtraDiscount;
    }

    let travelFee = 0;
    if (
      rawTravelFee !== undefined
      && rawTravelFee !== null
      && rawTravelFee !== ''
    ) {
      const parsedTravelFee = Number(rawTravelFee);
      if (!Number.isFinite(parsedTravelFee) || parsedTravelFee < 0) {
        throw new AppError(
          'travel_fee must be a number greater than or equal to 0.',
          400,
          ERROR_CODES.BAD_REQUEST,
        );
      }
      travelFee = parsedTravelFee;
    }

    const lineItems = normalizeQuotationLineItems(rawLineItems);

    const createdQuotation = await createQuotation({
      service_request_id: serviceRequestId,
      discount_amount: explicitDiscountAmount,
      extra_discount: extraDiscount,
      travel_fee: travelFee,
      estimated_completion_date: estimatedCompletionDate,
      status: rawStatus as CreateQuotationStatus,
      line_items: lineItems,
    });

    res.status(201).json(buildSuccessResponse(createdQuotation));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/quotations/:quotationId/send
 * Gửi báo giá bản nháp ('Draft') cho khách hàng -> chuyển status = 'Sent' và ServiceRequest.status = 'Quoted'
 */
export const sendQuotationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const accountId =
      typeof req.user === 'object' && req.user !== null
        ? Number((req.user as { id?: unknown }).id)
        : NaN;
    if (!Number.isInteger(accountId) || accountId <= 0) {
      throw new AppError(
        'Authenticated account is required.',
        401,
        ERROR_CODES.UNAUTHORIZED,
      );
    }

    const quotationId = Number(req.params.quotationId);
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      throw new AppError(
        'Invalid quotationId parameter. Must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const sentQuotation = await sendDraftQuotation(quotationId);
    res.status(200).json(buildSuccessResponse(sentQuotation));
  } catch (error) {
    next(error);
  }
};

