import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_CREATE_QUOTATION_STATUSES,
  approveQuotation,
  createQuotation,
  getQuotationDetail,
  listQuotations,
  rejectQuotation,
  recallQuotationSubmission,
  reviewQuotationByHeadSales,
  sendDraftQuotation,
  type CreateQuotationLineItemInput,
  type CreateQuotationStatus,
} from './quotations.service.js';
import { resolveAccountCustomerId } from '../service-requests/service-requests.service.js';

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
      sales_submission_note: rawSalesSubmissionNote,
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

    const actorRole =
      typeof req.user === 'object' && req.user !== null
        ? String((req.user as { role?: unknown }).role || '')
        : '';

    const createdQuotation = await createQuotation({
      service_request_id: serviceRequestId,
      discount_amount: explicitDiscountAmount,
      extra_discount: extraDiscount,
      travel_fee: travelFee,
      estimated_completion_date: estimatedCompletionDate,
      status: rawStatus as CreateQuotationStatus,
      sales_submission_note: typeof rawSalesSubmissionNote === 'string' ? rawSalesSubmissionNote : undefined,
      actor_id: accountId,
      actor_role: actorRole,
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

    const actorRole =
      typeof req.user === 'object' && req.user !== null
        ? String((req.user as { role?: unknown }).role || '')
        : '';

    const submissionNote =
      typeof req.body?.sales_submission_note === 'string'
        ? req.body.sales_submission_note
        : typeof req.body?.submission_note === 'string'
          ? req.body.submission_note
          : undefined;

    const sentQuotation = await sendDraftQuotation(
      quotationId,
      {
        accountId,
        role: actorRole,
      },
      submissionNote,
    );
    res.status(200).json(buildSuccessResponse(sentQuotation));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/quotations/:quotationId/recall
 * Thu hồi báo giá đang ở trạng thái 'PendingApproval' quay về 'Draft'
 */
export const recallQuotationHandler = async (
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

    const actorRole =
      typeof req.user === 'object' && req.user !== null
        ? String((req.user as { role?: unknown }).role || '')
        : '';

    const recalled = await recallQuotationSubmission(quotationId, {
      accountId,
      role: actorRole,
    });
    res.status(200).json(buildSuccessResponse(recalled));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/quotations/:quotationId/head-sales-review
 * Trưởng phòng Kinh doanh (HeadSales) duyệt hoặc từ chối báo giá nội bộ trước khi tới tay khách hàng
 */
export const headSalesReviewQuotationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown })
        : {};
    const accountId = Number(authUser.id);
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

    const { decision, note } = (req.body ?? {}) as {
      decision?: string;
      note?: string;
    };

    if (decision !== 'approve' && decision !== 'reject') {
      throw new AppError(
        'Invalid decision. Allowed values: "approve" or "reject".',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const reviewed = await reviewQuotationByHeadSales(quotationId, {
      decision,
      note: typeof note === 'string' ? note : null,
      reviewerId: accountId,
      reviewerRole: String(authUser.role || ''),
    });

    res.status(200).json(buildSuccessResponse(reviewed));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/quotations/:quotationId
 * Xem chi tiết báo giá (line_items, thiết bị, dịch vụ, khách hàng, thông tin thanh toán)
 */
export const getQuotationDetailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quotationId = Number(req.params.quotationId);
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      throw new AppError(
        'Invalid quotationId parameter. Must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    let customerIdFilter: number | undefined;
    if (String(authUser.role || '').toLowerCase() === 'customer') {
      const tokenCustomerId = Number(authUser.customer_id);
      const resolvedId = Number.isInteger(tokenCustomerId) && tokenCustomerId > 0
        ? tokenCustomerId
        : await resolveAccountCustomerId(Number(authUser.id));

      if (!resolvedId) {
        throw new AppError('Không tìm thấy tài khoản doanh nghiệp liên kết.', 404, ERROR_CODES.NOT_FOUND);
      }
      customerIdFilter = resolvedId;
    }

    const quotation = await getQuotationDetail(quotationId, customerIdFilter);
    res.status(200).json(buildSuccessResponse(quotation));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/quotations/:quotationId/approve
 * Khách hàng chấp thuận báo giá
 */
export const approveQuotationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quotationId = Number(req.params.quotationId);
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      throw new AppError(
        'Invalid quotationId parameter. Must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    let customerIdFilter: number | undefined;
    if (String(authUser.role || '').toLowerCase() === 'customer') {
      const tokenCustomerId = Number(authUser.customer_id);
      const resolvedId = Number.isInteger(tokenCustomerId) && tokenCustomerId > 0
        ? tokenCustomerId
        : await resolveAccountCustomerId(Number(authUser.id));

      if (!resolvedId) {
        throw new AppError('Không tìm thấy tài khoản doanh nghiệp liên kết.', 404, ERROR_CODES.NOT_FOUND);
      }
      customerIdFilter = resolvedId;
    }

    const approved = await approveQuotation(quotationId, customerIdFilter);
    res.status(200).json(buildSuccessResponse(approved));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/quotations/:quotationId/reject
 * Khách hàng từ chối báo giá
 */
export const rejectQuotationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const quotationId = Number(req.params.quotationId);
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      throw new AppError(
        'Invalid quotationId parameter. Must be a positive integer.',
        400,
        ERROR_CODES.BAD_REQUEST,
      );
    }

    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    let customerIdFilter: number | undefined;
    if (String(authUser.role || '').toLowerCase() === 'customer') {
      const tokenCustomerId = Number(authUser.customer_id);
      const resolvedId = Number.isInteger(tokenCustomerId) && tokenCustomerId > 0
        ? tokenCustomerId
        : await resolveAccountCustomerId(Number(authUser.id));

      if (!resolvedId) {
        throw new AppError('Không tìm thấy tài khoản doanh nghiệp liên kết.', 404, ERROR_CODES.NOT_FOUND);
      }
      customerIdFilter = resolvedId;
    }

    const { reason } = (req.body ?? {}) as { reason?: string };
    const rejected = await rejectQuotation(quotationId, reason, customerIdFilter);
    res.status(200).json(buildSuccessResponse(rejected));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/quotations
 * Lấy danh sách báo giá (khách hàng chỉ xem báo giá đã gửi, sales xem tất cả)
 */
export const listQuotationsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authUser =
      typeof req.user === 'object' && req.user !== null
        ? (req.user as { id?: unknown; role?: unknown; customer_id?: unknown })
        : {};

    const normalizedRole = String(authUser.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    let customerIdFilter: number | undefined;
    let assignedSalesIdFilter: number | undefined;

    if (normalizedRole === 'customer') {
      const tokenCustomerId = Number(authUser.customer_id);
      const resolvedId = Number.isInteger(tokenCustomerId) && tokenCustomerId > 0
        ? tokenCustomerId
        : await resolveAccountCustomerId(Number(authUser.id));

      if (!resolvedId) {
        res.status(200).json(buildSuccessResponse([]));
        return;
      }
      customerIdFilter = resolvedId;
    } else if (normalizedRole === 'sales') {
      const salesAccountId = Number(authUser.id);
      if (Number.isInteger(salesAccountId) && salesAccountId > 0) {
        assignedSalesIdFilter = salesAccountId;
      }
    }

    const list = await listQuotations(customerIdFilter, assignedSalesIdFilter);
    res.status(200).json(buildSuccessResponse(list));
  } catch (error) {
    next(error);
  }
};

