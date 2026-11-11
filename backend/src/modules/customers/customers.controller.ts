import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import { buildSuccessResponse } from '../../common/response.js';
import {
  ALLOWED_DEVICE_STATUSES,
  assignCustomerToSales,
  bulkAssignCustomersToSales,
  createCustomer,
  createCustomerAccount,
  createCustomerDevice,
  type DeviceStatus,
  getCustomerDetail,
  getSalesCustomerAssignments,
  listCustomerDevices,
  listCustomers,
  listCustomersDetailed,
  updateCustomer,
} from './customers.service.js';

const getAuthUserContext = (req: { user?: unknown }) => {
  const authUser =
    typeof req.user === 'object' && req.user !== null
      ? (req.user as { id?: unknown; role?: unknown })
      : {};
  const userId = Number(authUser.id);
  const role = String(authUser.role || '').trim();
  const normalizedRole = role.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    userId: Number.isInteger(userId) && userId > 0 ? userId : undefined,
    role,
    normalizedRole,
    isSalesStaff: normalizedRole === 'sales',
    isHeadSalesOrAdmin: ['headsales', 'admin', 'ceo'].includes(normalizedRole),
  };
};

/**
 * Controller lấy danh sách khách hàng:
 * - Mặc định (hoặc không truyền detailed): trả về { id, company_name }
 *   (Nếu role === 'Sales', chỉ trả về khách hàng được gán cho Sales đó)
 * - Nếu detailed=true hoặc có phân trang/search: trả về danh sách chi tiết kèm thống kê
 */
export const getCustomers: RequestHandler = async (req, res, next) => {
  try {
    const { userId, isSalesStaff } = getAuthUserContext(req);
    const isDetailed = req.query.detailed === 'true'
      || req.query.page !== undefined
      || req.query.search !== undefined
      || req.query.industry !== undefined;

    if (!isDetailed) {
      const assignedSalesFilter = isSalesStaff ? userId : undefined;
      const customers = await listCustomers(assignedSalesFilter);
      return res.status(200).json(buildSuccessResponse(customers));
    }

    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const industry = typeof req.query.industry === 'string' ? req.query.industry : undefined;
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.max(1, Math.min(100, Number(req.query.limit))) : 10;

    let assignedSalesIdFilter: number | undefined;
    let assignmentStatus: 'all' | 'assigned' | 'unassigned' | undefined;

    if (isSalesStaff) {
      // Nhân viên Sales chỉ xem danh sách khách hàng được phân công cho mình
      assignedSalesIdFilter = userId;
    } else if (req.query.assigned_sales_id !== undefined && req.query.assigned_sales_id !== '') {
      const parsedSalesId = Number(req.query.assigned_sales_id);
      if (Number.isInteger(parsedSalesId) && parsedSalesId > 0) {
        assignedSalesIdFilter = parsedSalesId;
      }
    } else if (
      req.query.assignment_status === 'assigned'
      || req.query.assignment_status === 'unassigned'
    ) {
      assignmentStatus = req.query.assignment_status;
    }

    const result = await listCustomersDetailed({
      search,
      industry,
      assignedSalesIdFilter,
      assignmentStatus,
      page,
      limit,
    });
    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller lấy chi tiết toàn diện của một khách hàng:
 * thông tin công ty, accounts người dùng, devices, contracts và service requests
 */
export const getCustomerDetailHandler: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const detail = await getCustomerDetail(customerId);
    return res.status(200).json(buildSuccessResponse(detail));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller tạo mới một khách hàng
 */
export const createCustomerHandler: RequestHandler = async (req, res, next) => {
  try {
    const { userId, isSalesStaff } = getAuthUserContext(req);
    const {
      company_name,
      tax_code,
      address,
      industry,
      assigned_sales_id,
      contact_person,
    } = req.body ?? {};

    if (!company_name || typeof company_name !== 'string' || !company_name.trim()) {
      return next(
        new AppError('Tên doanh nghiệp là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (!address || typeof address !== 'string' || !address.trim()) {
      return next(
        new AppError('Địa chỉ là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return next(
        new AppError('Lĩnh vực kinh doanh là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const parsedAssignedSalesId =
      assigned_sales_id !== undefined && assigned_sales_id !== null && assigned_sales_id !== ''
        ? Number(assigned_sales_id)
        : null;

    const created = await createCustomer({
      company_name,
      tax_code: typeof tax_code === 'string' ? tax_code : null,
      address,
      industry,
      assigned_sales_id: isSalesStaff
        ? (userId ?? null)
        : (Number.isInteger(parsedAssignedSalesId) && Number(parsedAssignedSalesId) > 0
            ? Number(parsedAssignedSalesId)
            : null),
      assigned_by: userId ?? null,
      contact_person,
    });

    return res.status(201).json(buildSuccessResponse(created));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller cập nhật thông tin khách hàng
 */
export const updateCustomerHandler: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const { company_name, tax_code, address, industry } = req.body ?? {};

    if (!company_name || typeof company_name !== 'string' || !company_name.trim()) {
      return next(
        new AppError('Tên doanh nghiệp là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (!address || typeof address !== 'string' || !address.trim()) {
      return next(
        new AppError('Địa chỉ là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return next(
        new AppError('Lĩnh vực kinh doanh là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const updated = await updateCustomer(customerId, {
      company_name,
      tax_code: typeof tax_code === 'string' ? tax_code : null,
      address,
      industry,
    });

    return res.status(200).json(buildSuccessResponse(updated));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller thêm tài khoản người dùng cho khách hàng
 */
export const createCustomerAccountHandler: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const { full_name, email, phone, password } = req.body ?? {};

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return next(
        new AppError('Họ tên người dùng là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return next(
        new AppError('Email là bắt buộc.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const account = await createCustomerAccount(customerId, {
      full_name,
      email,
      phone: typeof phone === 'string' ? phone : null,
      password: typeof password === 'string' ? password : null,
    });

    return res.status(201).json(buildSuccessResponse(account));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller lấy danh sách thiết bị thuộc về một khách hàng
 */
export const getCustomerDevices: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const devices = await listCustomerDevices(customerId);
    return res.status(200).json(buildSuccessResponse(devices));
  } catch (error) {
    return next(error);
  }
};

/**
 * Controller thêm thiết bị mới cho khách hàng
 */
export const addCustomerDevice: RequestHandler = async (req, res, next) => {
  try {
    const customerId = Number(req.params.customerId);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Invalid customer ID.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const {
      name,
      model,
      manufacturer,
      serial_number,
      internal_code,
      measuring_range,
      is_group2,
      next_due_date,
      status,
    } = (req.body ?? {}) as Record<string, unknown>;

    if (typeof name !== 'string' || name.trim().length === 0) {
      return next(
        new AppError('Device name is required.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    if (
      status !== undefined
      && (typeof status !== 'string'
        || !ALLOWED_DEVICE_STATUSES.includes(status as DeviceStatus))
    ) {
      return next(
        new AppError(
          `Invalid device status. Allowed values: ${ALLOWED_DEVICE_STATUSES.join(', ')}.`,
          400,
          ERROR_CODES.BAD_REQUEST,
        ),
      );
    }

    const createdDevice = await createCustomerDevice(customerId, {
      name,
      model: typeof model === 'string' ? model : null,
      manufacturer: typeof manufacturer === 'string' ? manufacturer : null,
      serial_number: typeof serial_number === 'string' ? serial_number : null,
      internal_code: typeof internal_code === 'string' ? internal_code : null,
      measuring_range: typeof measuring_range === 'string' ? measuring_range : null,
      is_group2: typeof is_group2 === 'boolean' ? is_group2 : false,
      next_due_date: typeof next_due_date === 'string' ? next_due_date : null,
      status: status as DeviceStatus | undefined,
    });

    return res.status(201).json(buildSuccessResponse(createdDevice));
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/customers/sales-assignments
 * Dành cho HeadSales / Admin / CEO (và Sales để tra cứu danh sách Sales)
 */
export const getSalesAssignmentsHandler: RequestHandler = async (req, res, next) => {
  try {
    const { isHeadSalesOrAdmin, isSalesStaff } = getAuthUserContext(req);
    if (!isHeadSalesOrAdmin && !isSalesStaff) {
      return next(
        new AppError(
          'Chỉ Trưởng phòng Kinh doanh (HeadSales) hoặc Quản trị viên mới có quyền truy cập màn hình phân công khách hàng.',
          403,
          ERROR_CODES.FORBIDDEN,
        ),
      );
    }

    const data = await getSalesCustomerAssignments();
    return res.status(200).json(buildSuccessResponse(data));
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/customers/:customerId/assign-sales
 * Chỉ cho phép HeadSales, Admin, CEO gán hoặc gỡ gán nhân viên Sales phụ trách khách hàng (1 Khách hàng - 1 Sales)
 */
export const assignCustomerToSalesHandler: RequestHandler = async (req, res, next) => {
  try {
    const { userId, isHeadSalesOrAdmin } = getAuthUserContext(req);
    if (!userId || !isHeadSalesOrAdmin) {
      return next(
        new AppError(
          'Chỉ Trưởng phòng Kinh doanh (HeadSales) mới có quyền gán khách hàng cho nhân viên Sales.',
          403,
          ERROR_CODES.FORBIDDEN,
        ),
      );
    }

    const customerId = Number(req.params.customerId);
    if (!Number.isInteger(customerId) || customerId <= 0) {
      return next(
        new AppError('Mã khách hàng không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const rawSalesId = (req.body ?? {}).sales_account_id ?? (req.body ?? {}).assigned_sales_id;
    let salesAccountId: number | null = null;
    if (rawSalesId !== undefined && rawSalesId !== null && rawSalesId !== '') {
      const parsed = Number(rawSalesId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return next(
          new AppError('Mã nhân viên Sales không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST),
        );
      }
      salesAccountId = parsed;
    }

    const result = await assignCustomerToSales(customerId, salesAccountId, userId);
    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/customers/bulk-assign-sales
 * Gán hàng loạt nhiều khách hàng cho 1 nhân viên Sales (dành cho HeadSales)
 */
export const bulkAssignCustomersToSalesHandler: RequestHandler = async (req, res, next) => {
  try {
    const { userId, isHeadSalesOrAdmin } = getAuthUserContext(req);
    if (!userId || !isHeadSalesOrAdmin) {
      return next(
        new AppError(
          'Chỉ Trưởng phòng Kinh doanh (HeadSales) mới có quyền phân công khách hàng hàng loạt.',
          403,
          ERROR_CODES.FORBIDDEN,
        ),
      );
    }

    const { customer_ids: rawCustomerIds, sales_account_id: rawSalesId } = (req.body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(rawCustomerIds) || rawCustomerIds.length === 0) {
      return next(
        new AppError('Danh sách customer_ids không được để trống.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    const customerIds = rawCustomerIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (customerIds.length === 0) {
      return next(
        new AppError('Danh sách customer_ids không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST),
      );
    }

    let salesAccountId: number | null = null;
    if (rawSalesId !== undefined && rawSalesId !== null && rawSalesId !== '') {
      const parsed = Number(rawSalesId);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return next(
          new AppError('Mã nhân viên Sales không hợp lệ.', 400, ERROR_CODES.BAD_REQUEST),
        );
      }
      salesAccountId = parsed;
    }

    const result = await bulkAssignCustomersToSales(customerIds, salesAccountId, userId);
    return res.status(200).json(buildSuccessResponse(result));
  } catch (error) {
    return next(error);
  }
};
