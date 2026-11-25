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

export const ALLOWED_CREATE_QUOTATION_STATUSES = [
  'Draft',
  'PendingApproval',
  'Sent',
] as const;
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
  sales_submission_note?: string | null;
  actor_id?: number;
  actor_role?: string;
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
  created_by?: number | null;
  head_sales_reviewed_by?: number | null;
  head_sales_reviewed_at?: string | null;
  head_sales_note?: string | null;
  head_sales_decision?: string | null;
  customer_reject_reason?: string | null;
  customer_responded_at?: string | null;
  sales_submission_note?: string | null;
  submission_count?: number;
  last_rejected_total?: number | null;
  last_rejected_discount?: number | null;
  is_updated_draft?: boolean;
  line_items: QuotationLineItemResult[];
}

export interface QuotationLineItemDetailResult {
  id: number;
  quotation_id: number;
  service_request_item_id: number;
  description: string;
  unit_price: number;
  discount_amount: number;
  final_price: number;
  device?: {
    id: number;
    name: string;
    manufacturer: string | null;
    model: string | null;
    serial_number: string | null;
    internal_code: string | null;
  };
  service_type?: {
    id: number;
    name: string;
    kind: string;
    standard_code: string | null;
  };
}

export interface QuotationDetailResult {
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
  created_by?: number | null;
  created_by_name?: string | null;
  head_sales_reviewed_by?: number | null;
  head_sales_reviewer_name?: string | null;
  head_sales_reviewed_at?: string | null;
  head_sales_note?: string | null;
  head_sales_decision?: string | null;
  customer_reject_reason?: string | null;
  customer_responded_at?: string | null;
  sales_submission_note?: string | null;
  submission_count?: number;
  last_rejected_total?: number | null;
  last_rejected_discount?: number | null;
  customer: {
    id: number;
    company_name: string;
    tax_code: string | null;
    address: string;
    assigned_sales_id?: number | null;
  };
  service_request: {
    id: number;
    request_code: string;
    location_type: string;
    preferred_date: string | null;
    special_notes: string | null;
    accessories_note: string | null;
    status: string;
  };
  line_items: QuotationLineItemDetailResult[];
  can_send: boolean;
  can_head_sales_review: boolean;
  can_approve: boolean;
  can_reject: boolean;
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
    status: requestedStatus = 'Draft',
    sales_submission_note: salesSubmissionNote,
    actor_id: actorId,
    actor_role: actorRole,
    line_items: lineItems,
  } = input;

  const normalizedRole = String(actorRole || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isSalesStaff = normalizedRole === 'sales';
  const isHeadSalesOrAdmin = ['headsales', 'admin', 'ceo'].includes(normalizedRole);

  // Nhân viên Sales khi bấm gửi báo giá sẽ chuyển sang 'PendingApproval' (chờ HeadSales duyệt) thay vì 'Sent' trực tiếp
  const status: CreateQuotationStatus =
    isSalesStaff && requestedStatus === 'Sent'
      ? 'PendingApproval'
      : requestedStatus;

  // 1. Kiểm tra phiếu yêu cầu dịch vụ (ServiceRequest) tồn tại và hợp lệ
  const serviceRequestRepo = dataSource.getRepository(ServiceRequest);
  const serviceRequest = await serviceRequestRepo.findOne({
    select: {
      id: true,
      status: true,
      customer_id: true,
      customer: {
        id: true,
        company_name: true,
        assigned_sales_id: true,
      },
    },
    relations: {
      customer: true,
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

  // Nếu người thao tác là Sales, chỉ được tạo/cập nhật báo giá cho khách hàng được gán cho mình
  if (
    isSalesStaff
    && actorId
    && serviceRequest.customer
    && serviceRequest.customer.assigned_sales_id !== actorId
  ) {
    throw new AppError(
      `Khách hàng "${serviceRequest.customer.company_name}" chưa được phân công cho bạn phụ trách. Bạn không thể lập báo giá cho đơn này.`,
      403,
      ERROR_CODES.FORBIDDEN,
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

  const existingDraft =
    existingQuotations.find(
      (q) => q.status === 'Draft' || q.status === 'PendingApproval',
    ) ?? null;

  // [CHỐNG SPAM SALES]: Nếu báo giá đang PendingApproval thì khóa không cho nộp trùng
  if (existingDraft && existingDraft.status === 'PendingApproval' && isSalesStaff) {
    throw new AppError(
      `Báo giá ${formatQuotationCode(existingDraft.id)} đang trong hàng chờ Trưởng phòng Kinh doanh (HeadSales) phê duyệt. Vui lòng không nộp trùng lặp hoặc hãy thu hồi về Draft nếu cần chỉnh sửa thêm.`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

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

  // [CHỐNG SPAM SALES]: Nếu báo giá vừa bị HeadSales từ chối và Sales muốn trình lại (PendingApproval):
  // 1. Kiểm tra xem Sales đã sửa số liệu (tổng tiền hoặc chiết khấu) chưa.
  // 2. Bắt buộc Sales phải có ghi chú giải trình (sales_submission_note).
  if (
    existingDraft
    && existingDraft.head_sales_decision === 'Rejected'
    && status === 'PendingApproval'
    && isSalesStaff
  ) {
    const prevTotal = existingDraft.last_rejected_total ? Number(existingDraft.last_rejected_total) : null;
    const prevDiscount = existingDraft.last_rejected_discount ? Number(existingDraft.last_rejected_discount) : null;

    if (
      prevTotal !== null
      && prevDiscount !== null
      && Math.abs(totalAmount - prevTotal) < 0.01
      && Math.abs(totalDiscountAmount - prevDiscount) < 0.01
    ) {
      throw new AppError(
        'Báo giá chưa có thay đổi nào về tổng tiền hoặc mức chiết khấu so với lúc bị Trưởng phòng từ chối. Vui lòng điều chỉnh lại phương án giá trước khi trình duyệt lại.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    if (!salesSubmissionNote || salesSubmissionNote.trim().length < 5) {
      throw new AppError(
        'Vui lòng nhập ghi chú giải trình (tối thiểu 5 ký tự) nêu rõ các thay đổi bạn đã thực hiện theo yêu cầu của Trưởng phòng.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
  }

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
      if (actorId && !existingDraft.created_by) {
        existingDraft.created_by = actorId;
      }
      if (status === 'PendingApproval') {
        existingDraft.head_sales_decision = null;
        existingDraft.head_sales_reviewed_by = null;
        existingDraft.head_sales_reviewed_at = null;
        existingDraft.sales_submission_note = salesSubmissionNote ? salesSubmissionNote.trim() : null;
        existingDraft.submission_count = (existingDraft.submission_count || 0) + 1;
      } else if (status === 'Sent' && isHeadSalesOrAdmin && actorId) {
        existingDraft.head_sales_reviewed_by = actorId;
        existingDraft.head_sales_reviewed_at = new Date();
        existingDraft.head_sales_decision = 'Approved';
      }
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
        created_by: actorId ?? null,
        sales_submission_note: status === 'PendingApproval' && salesSubmissionNote ? salesSubmissionNote.trim() : null,
        submission_count: status === 'PendingApproval' ? 1 : 0,
        head_sales_reviewed_by: status === 'Sent' && isHeadSalesOrAdmin && actorId ? actorId : null,
        head_sales_reviewed_at: status === 'Sent' && isHeadSalesOrAdmin ? new Date() : null,
        head_sales_decision: status === 'Sent' && isHeadSalesOrAdmin ? 'Approved' : null,
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
      created_by: savedQuotation.created_by ?? null,
      head_sales_reviewed_by: savedQuotation.head_sales_reviewed_by ?? null,
      head_sales_reviewed_at: savedQuotation.head_sales_reviewed_at
        ? new Date(savedQuotation.head_sales_reviewed_at).toISOString()
        : null,
      head_sales_note: savedQuotation.head_sales_note ?? null,
      head_sales_decision: savedQuotation.head_sales_decision ?? null,
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
 * Chuyển báo giá từ bản nháp ('Draft'):
 * - Nếu người thao tác là Sales -> chuyển sang 'PendingApproval' (Trình HeadSales phê duyệt nội bộ)
 * - Nếu người thao tác là HeadSales / Admin / CEO -> chuyển sang 'Sent' (Phát hành gửi khách hàng) và chuyển ServiceRequest sang 'Quoted'
 */
export const sendDraftQuotation = async (
  quotationId: number,
  actor?: { accountId?: number; role?: string },
  submissionNote?: string,
): Promise<QuotationResult> => {
  const normalizedRole = String(actor?.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isSalesStaff = normalizedRole === 'sales';
  const isHeadSalesOrAdmin = ['headsales', 'admin', 'ceo'].includes(normalizedRole);

  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: {
      line_items: true,
      service_request: {
        customer: true,
      },
    },
  });

  if (!quotation) {
    throw new AppError(
      'Quotation not found.',
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  if (
    isSalesStaff
    && actor?.accountId
    && quotation.service_request?.customer
    && quotation.service_request.customer.assigned_sales_id !== actor.accountId
  ) {
    throw new AppError(
      `Khách hàng "${quotation.service_request.customer.company_name}" chưa được phân công cho bạn phụ trách.`,
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  if (isSalesStaff && quotation.status !== 'Draft') {
    throw new AppError(
      `Chỉ có thể trình duyệt báo giá đang ở trạng thái "Draft". Trạng thái hiện tại: "${quotation.status}".`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  // [CHỐNG SPAM SALES]: Khi trình lại báo giá từng bị HeadSales từ chối:
  if (isSalesStaff && quotation.head_sales_decision === 'Rejected') {
    const prevTotal = quotation.last_rejected_total ? Number(quotation.last_rejected_total) : null;
    const prevDiscount = quotation.last_rejected_discount ? Number(quotation.last_rejected_discount) : null;
    const currentTotal = Number(quotation.total_amount);
    const currentDiscount = Number(quotation.discount_amount);

    if (
      prevTotal !== null
      && prevDiscount !== null
      && Math.abs(currentTotal - prevTotal) < 0.01
      && Math.abs(currentDiscount - prevDiscount) < 0.01
    ) {
      throw new AppError(
        'Báo giá chưa có thay đổi nào về số liệu so với lúc bị Trưởng phòng từ chối. Vui lòng bấm vào "Cập nhật báo giá" để chỉnh sửa đơn giá / chiết khấu trước khi trình lại.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    if (!submissionNote || submissionNote.trim().length < 5) {
      throw new AppError(
        'Vui lòng nhập ghi chú giải trình (tối thiểu 5 ký tự) nêu rõ các thay đổi bạn đã thực hiện theo yêu cầu của Trưởng phòng.',
        400,
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
  }

  if (!isSalesStaff && quotation.status !== 'Draft' && quotation.status !== 'PendingApproval') {
    throw new AppError(
      `Chỉ có thể duyệt và gửi báo giá đang ở trạng thái "Draft" hoặc "PendingApproval". Trạng thái hiện tại: "${quotation.status}".`,
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

  const targetStatus = isSalesStaff ? 'PendingApproval' : 'Sent';

  const persistSend = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<QuotationResult> => {
    const qRepo = getRepository(Quotation);
    const srRepo = getRepository(ServiceRequest);

    quotation.status = targetStatus;
    if (targetStatus === 'PendingApproval') {
      quotation.head_sales_decision = null;
      quotation.head_sales_reviewed_by = null;
      quotation.head_sales_reviewed_at = null;
      quotation.sales_submission_note = submissionNote ? submissionNote.trim() : null;
      quotation.submission_count = (quotation.submission_count || 0) + 1;
    } else if (targetStatus === 'Sent' && isHeadSalesOrAdmin && actor?.accountId) {
      quotation.head_sales_reviewed_by = actor.accountId;
      quotation.head_sales_reviewed_at = new Date();
      quotation.head_sales_decision = 'Approved';
    }
    const savedQuotation = await qRepo.save(quotation);

    let updatedServiceRequestStatus = serviceRequest?.status ?? 'New';
    if (targetStatus === 'Sent' && serviceRequest && serviceRequest.status !== 'Quoted') {
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
      created_by: savedQuotation.created_by ?? null,
      head_sales_reviewed_by: savedQuotation.head_sales_reviewed_by ?? null,
      head_sales_reviewed_at: savedQuotation.head_sales_reviewed_at
        ? new Date(savedQuotation.head_sales_reviewed_at).toISOString()
        : null,
      head_sales_note: savedQuotation.head_sales_note ?? null,
      head_sales_decision: savedQuotation.head_sales_decision ?? null,
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

/**
 * Thu hồi báo giá (Recall submission):
 * - Dành cho Sales khi báo giá đang ở 'PendingApproval' (chờ HeadSales duyệt)
 * - Chuyển trạng thái quay trở lại 'Draft' để Sales tiếp tục chỉnh sửa, tránh HeadSales duyệt nhầm bản có sai sót
 */
export const recallQuotationSubmission = async (
  quotationId: number,
  actor?: { accountId?: number; role?: string },
): Promise<QuotationDetailResult> => {
  const normalizedRole = String(actor?.role || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isSalesStaff = normalizedRole === 'sales';

  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: {
      service_request: {
        customer: true,
      },
    },
  });

  if (!quotation) {
    throw new AppError('Không tìm thấy báo giá.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (
    isSalesStaff
    && actor?.accountId
    && quotation.service_request?.customer
    && quotation.service_request.customer.assigned_sales_id !== actor.accountId
  ) {
    throw new AppError(
      `Khách hàng "${quotation.service_request.customer.company_name}" chưa được phân công cho bạn phụ trách.`,
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  if (quotation.status !== 'PendingApproval') {
    throw new AppError(
      `Chỉ có thể thu hồi báo giá đang ở trạng thái "PendingApproval" (Chờ duyệt). Trạng thái hiện tại: "${quotation.status}".`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  quotation.status = 'Draft';
  await quotationRepo.save(quotation);

  return getQuotationDetail(quotationId);
};

/**
 * Trưởng phòng Kinh doanh (HeadSales) phê duyệt hoặc từ chối nội bộ báo giá:
 * - decision === 'approve': chuyển báo giá từ 'PendingApproval' (hoặc 'Draft') -> 'Sent' (Gửi tới tay khách hàng), cập nhật ServiceRequest.status = 'Quoted'
 * - decision === 'reject': trả báo giá về 'Draft' kèm ghi chú head_sales_note để nhân viên Sales chỉnh sửa lại
 */
export const reviewQuotationByHeadSales = async (
  quotationId: number,
  input: {
    decision: 'approve' | 'reject';
    note?: string | null;
    reviewerId: number;
    reviewerRole?: string;
  },
): Promise<QuotationDetailResult> => {
  const normalizedRole = String(input.reviewerRole || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!['headsales', 'admin', 'ceo'].includes(normalizedRole)) {
    throw new AppError(
      'Chỉ Trưởng phòng Kinh doanh (HeadSales) mới có quyền phê duyệt báo giá trước khi gửi khách hàng.',
      403,
      ERROR_CODES.FORBIDDEN,
    );
  }

  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: {
      service_request: true,
    },
  });

  if (!quotation) {
    throw new AppError('Không tìm thấy báo giá.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (quotation.status !== 'PendingApproval' && quotation.status !== 'Draft') {
    throw new AppError(
      `Chỉ có thể xét duyệt báo giá đang ở trạng thái "PendingApproval" (Chờ duyệt) hoặc "Draft". Trạng thái hiện tại: "${quotation.status}".`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const trimmedNote = input.note && input.note.trim() ? input.note.trim() : null;

  await dataSource.transaction(async (manager) => {
    const qRepo = manager.getRepository(Quotation);
    const srRepo = manager.getRepository(ServiceRequest);

    quotation.head_sales_reviewed_by = input.reviewerId;
    quotation.head_sales_reviewed_at = new Date();

    if (input.decision === 'approve') {
      quotation.status = 'Sent';
      quotation.head_sales_decision = 'Approved';
      quotation.head_sales_note = trimmedNote;
      await qRepo.save(quotation);

      if (quotation.service_request && quotation.service_request.status !== 'Quoted') {
        quotation.service_request.status = 'Quoted';
        await srRepo.save(quotation.service_request);
      }
    } else {
      quotation.status = 'Draft';
      quotation.head_sales_decision = 'Rejected';
      quotation.head_sales_note =
        trimmedNote || 'Trưởng phòng Kinh doanh yêu cầu chỉnh sửa lại đơn giá / chiết khấu.';
      quotation.last_rejected_total = quotation.total_amount;
      quotation.last_rejected_discount = quotation.discount_amount;
      await qRepo.save(quotation);

      if (quotation.service_request && quotation.service_request.status === 'Quoted') {
        quotation.service_request.status = 'New';
        await srRepo.save(quotation.service_request);
      }
    }
  });

  return getQuotationDetail(quotationId);
};

/**
 * Lấy chi tiết báo giá (Quotation Detail) theo quotationId
 */
export const getQuotationDetail = async (
  quotationId: number,
  customerIdFilter?: number,
): Promise<QuotationDetailResult> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: {
      created_by_account: true,
      head_sales_reviewer: true,
      service_request: {
        customer: true,
      },
      line_items: {
        service_request_item: {
          device: true,
          service_type: true,
        },
      },
    },
  });

  if (!quotation) {
    throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (customerIdFilter !== undefined) {
    if (quotation.service_request?.customer_id !== customerIdFilter) {
      throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
    }
    if (quotation.status === 'Draft' || quotation.status === 'PendingApproval') {
      throw new AppError('Báo giá này đang được biên soạn hoặc chờ Trưởng phòng Kinh doanh phê duyệt, chưa gửi cho khách hàng.', 404, ERROR_CODES.NOT_FOUND);
    }
  }

  const sr = quotation.service_request;
  const customer = sr?.customer;

  const lineItemsDetail: QuotationLineItemDetailResult[] = (quotation.line_items ?? []).map((li) => {
    const unitPrice = Number(li.unit_price);
    const discountAmount = Number(li.discount_amount);
    const finalPrice = Math.max(0, unitPrice - discountAmount);
    const sri = li.service_request_item;

    return {
      id: li.id,
      quotation_id: li.quotation_id,
      service_request_item_id: li.service_request_item_id,
      description: li.description,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      device: sri?.device
        ? {
            id: sri.device.id,
            name: sri.device.name,
            manufacturer: sri.device.manufacturer ?? null,
            model: sri.device.model ?? null,
            serial_number: sri.device.serial_number ?? null,
            internal_code: sri.device.internal_code ?? null,
          }
        : undefined,
      service_type: sri?.service_type
        ? {
            id: sri.service_type.id,
            name: sri.service_type.name,
            kind: sri.service_type.kind,
            standard_code: sri.service_type.standard_code ?? null,
          }
        : undefined,
    };
  });

  return {
    id: quotation.id,
    quotation_code: formatQuotationCode(quotation.id),
    service_request_id: quotation.service_request_id,
    service_request_status: sr?.status ?? 'New',
    subtotal: Number(quotation.subtotal),
    discount_amount: Number(quotation.discount_amount),
    travel_fee: Number(quotation.travel_fee),
    total_amount: Number(quotation.total_amount),
    estimated_completion_date: quotation.estimated_completion_date ?? null,
    status: quotation.status,
    created_by: quotation.created_by ?? null,
    created_by_name: quotation.created_by_account?.full_name ?? null,
    head_sales_reviewed_by: quotation.head_sales_reviewed_by ?? null,
    head_sales_reviewer_name: quotation.head_sales_reviewer?.full_name ?? null,
    head_sales_reviewed_at: quotation.head_sales_reviewed_at
      ? new Date(quotation.head_sales_reviewed_at).toISOString()
      : null,
    head_sales_note: quotation.head_sales_note ?? null,
    head_sales_decision: quotation.head_sales_decision ?? null,
    customer_reject_reason: quotation.customer_reject_reason ?? null,
    customer_responded_at: quotation.customer_responded_at
      ? new Date(quotation.customer_responded_at).toISOString()
      : null,
    sales_submission_note: quotation.sales_submission_note ?? null,
    submission_count: quotation.submission_count ?? 0,
    last_rejected_total: quotation.last_rejected_total ? Number(quotation.last_rejected_total) : null,
    last_rejected_discount: quotation.last_rejected_discount ? Number(quotation.last_rejected_discount) : null,
    customer: {
      id: customer?.id ?? sr?.customer_id ?? 0,
      company_name: customer?.company_name ?? '—',
      tax_code: customer?.tax_code ?? null,
      address: customer?.address ?? '—',
      assigned_sales_id: customer?.assigned_sales_id ?? null,
    },
    service_request: {
      id: sr?.id ?? quotation.service_request_id,
      request_code: sr?.request_code || `SR-${sr?.id ?? quotation.service_request_id}`,
      location_type: sr?.location_type ?? 'In-lab',
      preferred_date: sr?.preferred_date ? String(sr.preferred_date).slice(0, 10) : null,
      special_notes: sr?.special_notes ?? null,
      accessories_note: sr?.accessories_note ?? null,
      status: sr?.status ?? 'New',
    },
    line_items: lineItemsDetail,
    can_send: quotation.status === 'Draft',
    can_head_sales_review: quotation.status === 'PendingApproval',
    can_approve: quotation.status === 'Sent',
    can_reject: quotation.status === 'Sent',
  };
};

/**
 * Khách hàng chấp thuận báo giá (status: 'Sent' -> 'Approved')
 * và tự động chuyển ServiceRequest status sang 'Confirmed'
 */
export const approveQuotation = async (
  quotationId: number,
  customerIdFilter?: number,
): Promise<QuotationDetailResult> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: { service_request: true },
  });

  if (!quotation) {
    throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (customerIdFilter !== undefined && quotation.service_request?.customer_id !== customerIdFilter) {
    throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (quotation.status !== 'Sent') {
    throw new AppError(
      `Không thể chấp thuận báo giá ở trạng thái "${quotation.status}". Báo giá phải ở trạng thái "Sent".`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const persistApprove = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<void> => {
    const qRepo = getRepository(Quotation);
    const srRepo = getRepository(ServiceRequest);

    quotation.status = 'Approved';
    quotation.customer_reject_reason = null;
    quotation.customer_responded_at = new Date();
    await qRepo.save(quotation);

    if (quotation.service_request) {
      quotation.service_request.status = 'Confirmed';
      await srRepo.save(quotation.service_request);
    }
  };

  if (typeof dataSource.transaction === 'function') {
    await dataSource.transaction(async (manager) =>
      persistApprove(manager.getRepository.bind(manager)),
    );
  } else {
    await persistApprove(dataSource.getRepository.bind(dataSource));
  }

  return getQuotationDetail(quotationId, customerIdFilter);
};

/**
 * Khách hàng từ chối báo giá (status: 'Sent' -> 'Rejected')
 */
export const rejectQuotation = async (
  quotationId: number,
  reason?: string,
  customerIdFilter?: number,
): Promise<QuotationDetailResult> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const quotation = await quotationRepo.findOne({
    where: { id: quotationId },
    relations: { service_request: true },
  });

  if (!quotation) {
    throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (customerIdFilter !== undefined && quotation.service_request?.customer_id !== customerIdFilter) {
    throw new AppError('Báo giá không tồn tại hoặc bạn không có quyền truy cập.', 404, ERROR_CODES.NOT_FOUND);
  }

  if (quotation.status !== 'Sent') {
    throw new AppError(
      `Không thể từ chối báo giá ở trạng thái "${quotation.status}". Báo giá phải ở trạng thái "Sent".`,
      400,
      ERROR_CODES.BAD_REQUEST,
    );
  }

  const persistReject = async (
    getRepository: typeof dataSource.getRepository,
  ): Promise<void> => {
    const qRepo = getRepository(Quotation);
    const srRepo = getRepository(ServiceRequest);

    quotation.status = 'Rejected';
    quotation.customer_reject_reason = reason && reason.trim() ? reason.trim() : null;
    quotation.customer_responded_at = new Date();
    await qRepo.save(quotation);

    if (quotation.service_request && reason && reason.trim()) {
      const rejectNote = `[Khách từ chối báo giá ${formatQuotationCode(quotation.id)}: ${reason.trim()}]`;
      quotation.service_request.special_notes = quotation.service_request.special_notes
        ? `${quotation.service_request.special_notes}\n${rejectNote}`
        : rejectNote;
      await srRepo.save(quotation.service_request);
    }
  };

  if (typeof dataSource.transaction === 'function') {
    await dataSource.transaction(async (manager) =>
      persistReject(manager.getRepository.bind(manager)),
    );
  } else {
    await persistReject(dataSource.getRepository.bind(dataSource));
  }

  return getQuotationDetail(quotationId, customerIdFilter);
};

/**
 * Lấy danh sách các báo giá
 */
export const listQuotations = async (
  customerIdFilter?: number,
  assignedSalesIdFilter?: number,
): Promise<QuotationDetailResult[]> => {
  const quotationRepo = dataSource.getRepository(Quotation);
  const quotations = await quotationRepo.find({
    relations: {
      created_by_account: true,
      head_sales_reviewer: true,
      service_request: {
        customer: true,
      },
      line_items: {
        service_request_item: {
          device: true,
          service_type: true,
        },
      },
    },
    order: {
      id: 'DESC',
    },
  });

  const filtered = quotations.filter((q) => {
    if (customerIdFilter !== undefined) {
      if (q.service_request?.customer_id !== customerIdFilter) return false;
      if (q.status === 'Draft' || q.status === 'PendingApproval') return false;
    }
    if (assignedSalesIdFilter !== undefined) {
      if (q.service_request?.customer?.assigned_sales_id !== assignedSalesIdFilter) return false;
    }
    return true;
  });

  return filtered.map((quotation) => {
    const sr = quotation.service_request;
    const customer = sr?.customer;

    const lineItemsDetail: QuotationLineItemDetailResult[] = (quotation.line_items ?? []).map((li) => {
      const unitPrice = Number(li.unit_price);
      const discountAmount = Number(li.discount_amount);
      const finalPrice = Math.max(0, unitPrice - discountAmount);
      const sri = li.service_request_item;

      return {
        id: li.id,
        quotation_id: li.quotation_id,
        service_request_item_id: li.service_request_item_id,
        description: li.description,
        unit_price: unitPrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        device: sri?.device
          ? {
              id: sri.device.id,
              name: sri.device.name,
              manufacturer: sri.device.manufacturer ?? null,
              model: sri.device.model ?? null,
              serial_number: sri.device.serial_number ?? null,
              internal_code: sri.device.internal_code ?? null,
            }
          : undefined,
        service_type: sri?.service_type
          ? {
              id: sri.service_type.id,
              name: sri.service_type.name,
              kind: sri.service_type.kind,
              standard_code: sri.service_type.standard_code ?? null,
            }
          : undefined,
      };
    });

    return {
      id: quotation.id,
      quotation_code: formatQuotationCode(quotation.id),
      service_request_id: quotation.service_request_id,
      service_request_status: sr?.status ?? 'New',
      subtotal: Number(quotation.subtotal),
      discount_amount: Number(quotation.discount_amount),
      travel_fee: Number(quotation.travel_fee),
      total_amount: Number(quotation.total_amount),
      estimated_completion_date: quotation.estimated_completion_date ?? null,
      status: quotation.status,
      created_by: quotation.created_by ?? null,
      created_by_name: quotation.created_by_account?.full_name ?? null,
      head_sales_reviewed_by: quotation.head_sales_reviewed_by ?? null,
      head_sales_reviewer_name: quotation.head_sales_reviewer?.full_name ?? null,
      head_sales_reviewed_at: quotation.head_sales_reviewed_at
        ? new Date(quotation.head_sales_reviewed_at).toISOString()
        : null,
      head_sales_note: quotation.head_sales_note ?? null,
      head_sales_decision: quotation.head_sales_decision ?? null,
      customer_reject_reason: quotation.customer_reject_reason ?? null,
      customer_responded_at: quotation.customer_responded_at
        ? new Date(quotation.customer_responded_at).toISOString()
        : null,
      sales_submission_note: quotation.sales_submission_note ?? null,
      submission_count: quotation.submission_count ?? 0,
      last_rejected_total: quotation.last_rejected_total ? Number(quotation.last_rejected_total) : null,
      last_rejected_discount: quotation.last_rejected_discount ? Number(quotation.last_rejected_discount) : null,
      customer: {
        id: customer?.id ?? sr?.customer_id ?? 0,
        company_name: customer?.company_name ?? '—',
        tax_code: customer?.tax_code ?? null,
        address: customer?.address ?? '—',
        assigned_sales_id: customer?.assigned_sales_id ?? null,
      },
      service_request: {
        id: sr?.id ?? quotation.service_request_id,
        request_code: sr?.request_code || `SR-${sr?.id ?? quotation.service_request_id}`,
        location_type: sr?.location_type ?? 'In-lab',
        preferred_date: sr?.preferred_date ? String(sr.preferred_date).slice(0, 10) : null,
        special_notes: sr?.special_notes ?? null,
        accessories_note: sr?.accessories_note ?? null,
        status: sr?.status ?? 'New',
      },
      line_items: lineItemsDetail,
      can_send: quotation.status === 'Draft',
      can_head_sales_review: quotation.status === 'PendingApproval',
      can_approve: quotation.status === 'Sent',
      can_reject: quotation.status === 'Sent',
    };
  });
};
