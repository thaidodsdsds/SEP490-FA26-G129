/* eslint-disable @typescript-eslint/no-explicit-any -- raw query rows are schemaless DB records */
import dataSource from '../../database/dataSource.js';

type AuthUser = {
  id?: unknown;
  role?: unknown;
  customer_id?: unknown;
};

type Row = Record<string, any>;

const query = async (sql: string, params: unknown[] = []): Promise<Row[]> =>
  (await dataSource.query(sql, params)) as Row[];

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toInt = (value: unknown): number => Math.round(toNumber(value));

const toISODate = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const toTime = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const relativeTime = (value: unknown): string => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
};

const daysBetween = (value: unknown, from: Date = new Date()): number => {
  if (!value) return 0;
  const date = value instanceof Date ? value : new Date(value as string);
  const today = new Date(from);
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
};

const withCode = (prefix: string, code: unknown, id: unknown): string =>
  String(code || `${prefix}-${new Date().getFullYear()}-${String(toInt(id)).padStart(3, '0')}`);

const normalizeRole = (role: unknown): string =>
  String(role ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const resolveUserId = (user: AuthUser): number | undefined => {
  const id = toInt(user.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const TO_REQUEST_LABEL: Record<string, { label: string; tone: string }> = {
  New: { label: 'Mới', tone: 'neutral' },
  Quoted: { label: 'Đã báo giá', tone: 'warning' },
  Confirmed: { label: 'Chờ xác nhận', tone: 'neutral' },
  InProgress: { label: 'Đang thực hiện', tone: 'info' },
  Completed: { label: 'Hoàn tất', tone: 'success' },
  Cancelled: { label: 'Đã huỷ', tone: 'danger' },
};

const TO_CONTRACT_LABEL: Record<string, { label: string; tone: string }> = {
  Draft: { label: 'Bản nháp', tone: 'neutral' },
  PendingApproval: { label: 'Chờ duyệt', tone: 'warning' },
  Approved: { label: 'Đã duyệt', tone: 'info' },
  Signed: { label: 'Đã ký', tone: 'info' },
  Liquidated: { label: 'Đã tất toán', tone: 'success' },
  Rejected: { label: 'Từ chối', tone: 'danger' },
  Cancelled: { label: 'Đã huỷ', tone: 'danger' },
};

const requestStatus = (status: string) =>
  TO_REQUEST_LABEL[status] ?? { label: status, tone: 'neutral' };

const contractStatus = (status: string) =>
  TO_CONTRACT_LABEL[status] ?? { label: status, tone: 'neutral' };

const resolveCustomerId = async (user: AuthUser): Promise<number | undefined> => {
  const fromToken = toInt(user.customer_id);
  if (Number.isInteger(fromToken) && fromToken > 0) return fromToken;
  const id = resolveUserId(user);
  if (!id) return undefined;
  const rows = await query('SELECT customer_id FROM accounts WHERE id = $1 LIMIT 1', [id]);
  const customerId = toInt(rows[0]?.customer_id);
  return customerId > 0 ? customerId : undefined;
};

const EMPTY_CUSTOMER = {
  customerProfile: {
    companyName: '',
    taxCode: '—',
    industry: '',
    address: '',
    contractCode: '—',
    contractExpiry: '',
    accountCount: 0,
  },
  customerKpis: [],
  dueBuckets: [],
  orderStatus: [],
  recentOrders: [],
  dueDevices: [],
  quotations: [],
  certificates: [],
  invoices: [],
  debtSummary: { total: 0, overdue: 0, unpaidCount: 0, overdueCount: 0 },
  notifications: [],
};

const buildCustomerDashboard = async (customerId?: number) => {
  if (!customerId) return EMPTY_CUSTOMER;

  const [profileRows, deviceRows, deviceBucketRows, requestRows, requestStatusRows, quotationRows, certificateRows, contractRows] =
    await Promise.all([
      query(
        `SELECT c.company_name, c.tax_code, c.address, c.industry,
                (SELECT COUNT(*)::int FROM accounts a WHERE a.customer_id = c.id) AS account_count,
                (SELECT ct.contract_code FROM contracts ct WHERE ct.customer_id = c.id ORDER BY ct.id DESC LIMIT 1) AS contract_code,
                (SELECT ct.end_date FROM contracts ct WHERE ct.customer_id = c.id ORDER BY ct.id DESC LIMIT 1) AS contract_expiry
         FROM customers c WHERE c.id = $1`,
        [customerId],
      ),
      query(
        `SELECT d.id, d.name, d.model, d.serial_number, d.next_due_date, d.status,
                (SELECT cr.submitted_at FROM calibration_records cr
                   JOIN service_request_items sri ON sri.id = cr.service_request_item_id
                  WHERE sri.device_id = d.id ORDER BY cr.submitted_at DESC NULLS LAST LIMIT 1) AS last_calibrated_at
         FROM devices d
         WHERE d.customer_id = $1 AND d.next_due_date IS NOT NULL
         ORDER BY d.next_due_date ASC LIMIT 6`,
        [customerId],
      ),
      query(
        `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE next_due_date < CURRENT_DATE)::int AS expired,
                COUNT(*) FILTER (WHERE next_due_date >= CURRENT_DATE AND next_due_date <= CURRENT_DATE + INTERVAL '30 days')::int AS expiring,
                COUNT(*) FILTER (WHERE next_due_date > CURRENT_DATE + INTERVAL '30 days' AND next_due_date <= CURRENT_DATE + INTERVAL '90 days')::int AS next_90,
                COUNT(*) FILTER (WHERE next_due_date > CURRENT_DATE + INTERVAL '90 days')::int AS later
         FROM devices WHERE customer_id = $1 AND next_due_date IS NOT NULL`,
        [customerId],
      ),
      query(
        `SELECT sr.id, sr.request_code, sr.created_at, sr.status,
                COUNT(sri.id)::int AS devices,
                COUNT(sri.id) FILTER (WHERE sri.status = 'Done')::int AS done,
                STRING_AGG(DISTINCT st.name, ', ') AS services
         FROM service_requests sr
         LEFT JOIN service_request_items sri ON sri.service_request_id = sr.id
         LEFT JOIN service_types st ON st.id = sri.service_type_id
         WHERE sr.customer_id = $1
         GROUP BY sr.id
         ORDER BY sr.id DESC LIMIT 6`,
        [customerId],
      ),
      query(
        `SELECT sr.status, COUNT(*)::int AS total
         FROM service_requests sr WHERE sr.customer_id = $1
         GROUP BY sr.status ORDER BY sr.status`,
        [customerId],
      ),
      query(
        `SELECT q.id, q.status, q.total_amount, q.head_sales_reviewed_at,
                q.customer_responded_at, q.estimated_completion_date
         FROM quotations q
         JOIN service_requests sr ON sr.id = q.service_request_id
         WHERE sr.customer_id = $1 AND q.status IN ('Sent', 'Approved')
         ORDER BY q.id DESC LIMIT 4`,
        [customerId],
      ),
      query(
        `SELECT c.certificate_no, c.issued_at, c.status AS certificate_status,
                s.due_date, s.seal_code, s.status AS seal_status,
                d.name AS device_name
         FROM certificates c
         JOIN calibration_records cr ON cr.id = c.calibration_record_id
         JOIN service_request_items sri ON sri.id = cr.service_request_item_id
         JOIN devices d ON d.id = sri.device_id
         LEFT JOIN seals s ON s.certificate_id = c.id
         WHERE d.customer_id = $1 AND c.status = 'Released'
         ORDER BY c.id DESC LIMIT 5`,
        [customerId],
      ),
      query(
        `SELECT contract_code, created_at, end_date, total_amount, status
         FROM contracts WHERE customer_id = $1
         ORDER BY id DESC LIMIT 5`,
        [customerId],
      ),
    ]);

  const profile = profileRows[0] ?? {};
  const buckets = deviceBucketRows[0] ?? {};
  const totalDevices = toInt(buckets.total);
  const expired = toInt(buckets.expired);
  const expiring = toInt(buckets.expiring);
  const activeRequests = requestStatusRows
    .filter((row) => !['Completed', 'Cancelled'].includes(String(row.status)))
    .reduce((sum, row) => sum + toInt(row.total), 0);
  const unassignedRequests = requestStatusRows
    .filter((row) => row.status === 'New')
    .reduce((sum, row) => sum + toInt(row.total), 0);

  const contractTotals = await query(
    `SELECT COALESCE(SUM(total_amount), 0) AS total,
            COALESCE(SUM(total_amount) FILTER (WHERE end_date < CURRENT_DATE AND status IN ('Approved', 'Signed')), 0) AS overdue,
            COUNT(*) FILTER (WHERE status IN ('Approved', 'Signed')) AS unpaid_count,
            COUNT(*) FILTER (WHERE end_date < CURRENT_DATE AND status IN ('Approved', 'Signed')) AS overdue_count
     FROM contracts WHERE customer_id = $1`,
    [customerId],
  );
  const debtAggregate = contractTotals[0] ?? {};

  const dueBuckets = [
    { label: 'Đã hết hạn', value: expired, tone: 'danger' },
    { label: '≤ 30 ngày', value: expiring, tone: 'warning' },
    { label: '31 – 90 ngày', value: toInt(buckets.next_90), tone: 'info' },
    { label: '> 90 ngày', value: toInt(buckets.later), tone: 'success' },
  ];

  const orderColor: Record<string, string> = {
    New: '#7a8fa6',
    Quoted: '#d99a3d',
    Confirmed: '#8c7ab0',
    InProgress: '#2f7f9e',
    Completed: '#4c9f70',
    Cancelled: '#c25b5b',
  };
  const orderStatus = requestStatusRows.map((row) => ({
    label: requestStatus(String(row.status)).label,
    value: toInt(row.total),
    color: orderColor[String(row.status)] ?? '#7a8fa6',
  }));

  const notifications: Row[] = [];
  if (expired > 0) {
    notifications.push({
      id: 'devices-expired',
      icon: '!',
      tone: 'danger',
      text: `${expired} thiết bị đã quá hạn hiệu chuẩn.`,
      time: 'Cập nhật theo ngày hạn',
    });
  }
  if (expiring > 0) {
    notifications.push({
      id: 'devices-expiring',
      icon: '◷',
      tone: 'warning',
      text: `${expiring} thiết bị đến hạn trong 30 ngày tới.`,
      time: 'Cập nhật theo ngày hạn',
    });
  }
  if (activeRequests > 0) {
    notifications.push({
      id: 'requests-open',
      icon: '⌁',
      tone: 'info',
      text: `${activeRequests} yêu cầu dịch vụ đang được xử lý.`,
      time: 'Cập nhật theo hệ thống',
    });
  }

  return {
    customerProfile: {
      companyName: String(profile.company_name ?? 'Khách hàng'),
      taxCode: String(profile.tax_code ?? '—') || '—',
      industry: String(profile.industry ?? ''),
      address: String(profile.address ?? ''),
      contractCode: String(profile.contract_code ?? '—') || '—',
      contractExpiry: toISODate(profile.contract_expiry),
      accountCount: toInt(profile.account_count),
    },
    customerKpis: [
      {
        key: 'devices',
        icon: '▤',
        tone: 'info',
        label: 'Tổng thiết bị',
        value: String(totalDevices),
        hint: 'Theo danh sách thiết bị đã đăng ký',
      },
      {
        key: 'due',
        icon: '◷',
        tone: 'warning',
        label: 'Sắp đến hạn (≤ 30 ngày)',
        value: String(expiring),
        hint: `${expired} thiết bị đã quá hạn`,
        hintTone: expired > 0 ? 'danger' : '',
      },
      {
        key: 'orders',
        icon: '⌁',
        tone: 'info',
        label: 'Đơn đang xử lý',
        value: String(activeRequests),
        hint: `${unassignedRequests} đơn chờ tiếp nhận`,
      },
    ],
    dueBuckets,
    orderStatus,
    recentOrders: requestRows.map((row) => ({
      id: withCode('SR', row.request_code, row.id),
      createdAt: toISODate(row.created_at),
      devices: toInt(row.devices),
      service: String(row.services ?? 'Dịch vụ hiệu chuẩn'),
      ...requestStatus(String(row.status)),
      done: toInt(row.done),
    })),
    dueDevices: deviceRows.map((row) => {
      const days = daysBetween(row.next_due_date);
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        model: String(row.model ?? ''),
        serial: String(row.serial_number ?? ''),
        lastCalibratedAt: toISODate(row.last_calibrated_at),
        nextDueDate: toISODate(row.next_due_date),
        status: days < 0 ? 'Quá hạn' : days <= 30 ? 'Sắp đến hạn' : 'Còn hạn',
        tone: days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success',
      };
    }),
    quotations: quotationRows.map((row) => ({
      id: withCode('BG', '', row.id),
      sentAt: toISODate(row.head_sales_reviewed_at ?? row.customer_responded_at),
      expiresAt: toISODate(row.estimated_completion_date),
      amount: toNumber(row.total_amount),
    })),
    certificates: certificateRows.map((row) => {
      const days = daysBetween(row.due_date);
      return {
        id: String(row.certificate_no ?? ''),
        device: String(row.device_name ?? ''),
        issuedAt: toISODate(row.issued_at),
        expiresAt: toISODate(row.due_date),
        sealCode: String(row.seal_code ?? '—'),
        status: days <= 30 ? 'Sắp hết hạn' : 'Hiệu lực',
        tone: days <= 0 ? 'danger' : days <= 30 ? 'warning' : 'success',
      };
    }),
    invoices: contractRows.map((row) => {
      const days = daysBetween(row.end_date);
      const settled = row.status === 'Liquidated';
      return {
        id: String(row.contract_code ?? ''),
        issuedAt: toISODate(row.created_at),
        dueAt: toISODate(row.end_date),
        amount: toNumber(row.total_amount),
        status: settled ? 'Đã tất toán' : days < 0 ? 'Quá hạn' : 'Chưa thanh toán',
        tone: settled ? 'success' : days < 0 ? 'danger' : 'warning',
      };
    }),
    debtSummary: {
      total: toNumber(debtAggregate.total),
      overdue: toNumber(debtAggregate.overdue),
      unpaidCount: toInt(debtAggregate.unpaid_count),
      overdueCount: toInt(debtAggregate.overdue_count),
    },
    notifications,
  };
};

const buildAdminDashboard = async () => {
  const [accountStats, roleRows, customerRows, requestRows, standardRows, procedureRows, reviewRows, recentAccounts, recentRequests, recentCertificates, recentContracts] =
    await Promise.all([
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE failed_login_attempts >= 5)::int AS locked,
                COUNT(*) FILTER (WHERE is_2fa_enabled)::int AS two_fa
         FROM accounts`,
      ),
      query(
        `SELECT r.id, r.name, COUNT(a.id)::int AS accounts
         FROM roles r LEFT JOIN accounts a ON a.role_id = r.id
         GROUP BY r.id, r.name ORDER BY r.id`,
      ),
      query('SELECT COUNT(*)::int AS total FROM customers'),
      query(
        `SELECT status, COUNT(*)::int AS total FROM service_requests
         GROUP BY status ORDER BY status`,
      ),
      query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'Active' AND calibration_expiry <= CURRENT_DATE + INTERVAL '30 days')::int AS expiring
         FROM master_standards`,
      ),
      query('SELECT COUNT(*)::int AS total FROM calibration_procedures WHERE status = \'Draft\''),
      query("SELECT COUNT(*)::int AS total FROM calibration_records WHERE review_status = 'Pending'"),
      query(
        `SELECT a.id, a.full_name, a.email, a.failed_login_attempts, r.name AS role_name
         FROM accounts a LEFT JOIN roles r ON r.id = a.role_id
         ORDER BY a.id DESC LIMIT 6`,
      ),
      query(
        `SELECT sr.id, sr.request_code, sr.created_at, sr.status, c.company_name
         FROM service_requests sr LEFT JOIN customers c ON c.id = sr.customer_id
         ORDER BY sr.id DESC LIMIT 3`,
      ),
      query(
        `SELECT certificate_no, status, created_at FROM certificates ORDER BY id DESC LIMIT 3`,
      ),
      query(
        `SELECT contract_code, status, created_at FROM contracts ORDER BY id DESC LIMIT 3`,
      ),
    ]);

  const stats = accountStats[0] ?? {};
  const totalAccounts = toInt(stats.total);
  const lockedAccounts = toInt(stats.locked);
  const activeAccounts = Math.max(0, totalAccounts - lockedAccounts);
  const totalCustomers = toInt(customerRows[0]?.total);
  const alerts = toInt(standardRows[0]?.expiring) + toInt(reviewRows[0]?.total);
  const activeRequests = requestRows
    .filter((row) => !['Completed', 'Cancelled'].includes(String(row.status)))
    .reduce((sum, row) => sum + toInt(row.total), 0);
  const unassignedRequests = requestRows
    .filter((row) => row.status === 'New')
    .reduce((sum, row) => sum + toInt(row.total), 0);
  const now = new Date();

  const activityLog: Row[] = [
    ...recentRequests.map((row) => ({
      id: `sr-${row.id}`,
      icon: '⌁',
      tone: 'info',
      text: `Yêu cầu ${withCode('SR', row.request_code, row.id)} (${String(row.company_name ?? '—')}) ở trạng thái ${requestStatus(String(row.status)).label}.`,
      time: relativeTime(row.created_at),
    })),
    ...recentCertificates.map((row) => ({
      id: `cert-${row.certificate_no}`,
      icon: '◎',
      tone: 'success',
      text: `Chứng nhận ${String(row.certificate_no ?? '')} ở trạng thái ${String(row.status ?? '')}.`,
      time: relativeTime(row.created_at),
    })),
    ...recentContracts.map((row) => ({
      id: `contract-${row.contract_code}`,
      icon: '↻',
      tone: contractStatus(String(row.status)).tone,
      text: `Hợp đồng ${String(row.contract_code ?? '')} ${contractStatus(String(row.status)).label.toLowerCase()}.`,
      time: relativeTime(row.created_at),
    })),
  ].slice(0, 8);

  return {
    adminProfile: {
      updatedAt: toISODate(now),
      updatedTime: toTime(now),
      accountCount: totalAccounts,
      activeAccountCount: activeAccounts,
      lockedAccountCount: lockedAccounts,
      customerCount: totalCustomers,
      roleCount: roleRows.length,
      alertCount: alerts,
    },
    adminKpis: [
      {
        key: 'accounts',
        icon: '◉',
        tone: 'info',
        label: 'Tổng tài khoản',
        value: String(totalAccounts),
        hint: `${activeAccounts} hoạt động · ${lockedAccounts} bị khóa`,
      },
      {
        key: 'customers',
        icon: '◎',
        tone: 'success',
        label: 'Khách hàng doanh nghiệp',
        value: String(totalCustomers),
        hint: 'Theo danh sách khách hàng hiện có',
      },
      {
        key: 'orders',
        icon: '⌁',
        tone: 'warning',
        label: 'Đơn dịch vụ đang xử lý',
        value: String(activeRequests),
        hint: `${unassignedRequests} đơn chờ tiếp nhận`,
      },
      {
        key: 'alerts',
        icon: '!',
        tone: 'danger',
        label: 'Cảnh báo cần xử lý',
        value: String(alerts),
        hint: `${toInt(standardRows[0]?.expiring)} chuẩn sắp hết hạn · ${toInt(reviewRows[0]?.total)} hồ sơ chờ soát xét`,
        hintTone: alerts > 0 ? 'danger' : '',
      },
    ],
    recentLogins: recentAccounts.map((row) => ({
      id: String(row.id),
      name: String(row.full_name ?? ''),
      email: String(row.email ?? ''),
      role: String(row.role_name ?? ''),
      client: String(row.email ?? ''),
      status: toInt(row.failed_login_attempts) >= 5 ? 'Bị khóa' : 'Hoạt động',
      tone: toInt(row.failed_login_attempts) >= 5 ? 'danger' : 'success',
    })),
    roleSummary: roleRows.map((row) => ({
      role: String(row.name ?? ''),
      code: String(row.name ?? ''),
      accounts: toInt(row.accounts),
      scope: 'Theo cấu hình phân quyền',
      status: 'Hoạt động',
      tone: 'success',
    })),
    systemHealth: [
      {
        label: 'Cơ sở dữ liệu',
        detail: toInt(stats.total) > 0 ? `${totalAccounts} tài khoản · ${totalCustomers} khách hàng` : 'Chưa có dữ liệu',
        status: 'Kết nối',
        tone: 'success',
      },
      {
        label: 'Hồ sơ chờ soát xét',
        detail: `${toInt(reviewRows[0]?.total)} hồ sơ Pending`,
        status: toInt(reviewRows[0]?.total) > 0 ? 'Cần xem' : 'Ổn định',
        tone: toInt(reviewRows[0]?.total) > 0 ? 'warning' : 'success',
      },
      {
        label: 'Chuẩn hiệu chuẩn',
        detail: `${toInt(standardRows[0]?.total)} chuẩn · ${toInt(standardRows[0]?.expiring)} sắp hết hạn`,
        status: toInt(standardRows[0]?.expiring) > 0 ? 'Cần xem' : 'Ổn định',
        tone: toInt(standardRows[0]?.expiring) > 0 ? 'warning' : 'success',
      },
      {
        label: 'Quy trình hiệu chuẩn',
        detail: `${toInt(procedureRows[0]?.total)} quy trình đang nháp`,
        status: toInt(procedureRows[0]?.total) > 0 ? 'Cần xem' : 'Ổn định',
        tone: toInt(procedureRows[0]?.total) > 0 ? 'warning' : 'success',
      },
      {
        label: 'Tài khoản bị khóa',
        detail: `${lockedAccounts}/${totalAccounts} tài khoản bị khóa do đăng nhập sai`,
        status: lockedAccounts > 0 ? 'Cần xem' : 'Ổn định',
        tone: lockedAccounts > 0 ? 'warning' : 'success',
      },
    ],
    activityLog,
  };
};

const formatMillions = (value: number): string => `${Math.round(value).toLocaleString('vi-VN')}`;

const buildAccountantDashboard = async () => {
  const [contractRows, customerRows, certificateRows, quotationRows, monthRows] = await Promise.all([
    query(
      `SELECT ct.id, ct.contract_code, ct.customer_id, ct.title, ct.status,
              ct.created_at, ct.approved_at, ct.end_date, ct.total_amount,
              ct.credit_limit, c.company_name
       FROM contracts ct LEFT JOIN customers c ON c.id = ct.customer_id
       ORDER BY ct.id DESC LIMIT 30`,
    ),
    query('SELECT COUNT(*)::int AS total FROM customers'),
    query(
      `SELECT c.certificate_no, c.created_at, c.status, co.company_name
       FROM certificates c
       JOIN calibration_records cr ON cr.id = c.calibration_record_id
       JOIN service_request_items sri ON sri.id = cr.service_request_item_id
       JOIN devices d ON d.id = sri.device_id
       LEFT JOIN customers co ON co.id = d.customer_id
       WHERE c.status = 'PendingPayment'
       ORDER BY c.id DESC LIMIT 5`,
    ),
    query(
      `SELECT q.id, q.total_amount, q.head_sales_reviewed_at, q.estimated_completion_date,
              sr.request_code, co.company_name,
              EXISTS (SELECT 1 FROM contracts ct WHERE ct.quotation_id = q.id) AS has_contract
       FROM quotations q
       JOIN service_requests sr ON sr.id = q.service_request_id
       LEFT JOIN customers co ON co.id = sr.customer_id
       WHERE q.status = 'Approved'
       ORDER BY q.id DESC LIMIT 5`,
    ),
    query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month,
              COALESCE(SUM(total_amount), 0) AS total
       FROM contracts
       WHERE created_at >= NOW() - INTERVAL '6 months' AND status NOT IN ('Draft', 'Cancelled', 'Rejected')
       GROUP BY 1 ORDER BY 1`,
    ),
  ]);

  const activeContracts = contractRows.filter((row) =>
    ['Approved', 'Signed'].includes(String(row.status)),
  );
  const overdueContracts = activeContracts.filter((row) => daysBetween(row.end_date) < 0);
  const totalReceivable = activeContracts.reduce((sum, row) => sum + toNumber(row.total_amount), 0);
  const overdueTotal = overdueContracts.reduce((sum, row) => sum + toNumber(row.total_amount), 0);
  const liquidatedCount = contractRows.filter((row) => row.status === 'Liquidated').length;
  const collectionRate = contractRows.length > 0 ? Math.round((liquidatedCount / contractRows.length) * 100) : 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthTotal = monthRows
    .filter((row) => String(row.month) === currentMonth)
    .reduce((sum, row) => sum + toNumber(row.total), 0);
  const previousMonth = monthRows
    .filter((row) => String(row.month) < currentMonth)
    .slice(-1)[0];
  const previousTotal = toNumber(previousMonth?.total);
  const growth = previousTotal > 0 ? Math.round(((monthTotal - previousTotal) / previousTotal) * 100) : 0;

  const revenueByMonth = monthRows.map((row) => {
    const [year, month] = String(row.month).split('-');
    const value = Math.round(toNumber(row.total) / 1_000_000);
    return {
      label: `T${Number(month)}/${String(year).slice(2)}`,
      value,
      displayValue: formatMillions(value),
      tone: String(row.month) === currentMonth ? 'success' : undefined,
    };
  });

  const buckets = [
    { label: 'Chưa đến hạn', value: 0, displayValue: '0', color: '#4c9f70' },
    { label: '1 – 30 ngày', value: 0, displayValue: '0', color: '#2f7f9e' },
    { label: '31 – 60 ngày', value: 0, displayValue: '0', color: '#d99a3d' },
    { label: '61 – 90 ngày', value: 0, displayValue: '0', color: '#e07b39' },
    { label: '> 90 ngày', value: 0, displayValue: '0', color: '#c25b5b' },
  ];
  activeContracts.forEach((row) => {
    const days = Math.abs(daysBetween(row.end_date));
    const index = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
    buckets[index].value += toNumber(row.total_amount) / 1_000_000;
  });
  const agingBuckets = buckets.map((bucket) => ({
    ...bucket,
    value: Math.round(bucket.value),
    displayValue: formatMillions(Math.round(bucket.value)),
  }));

  const overdueMap = new Map<string, Row>();
  overdueContracts.forEach((row) => {
    const name = String(row.company_name ?? 'Khách hàng');
    const entry = overdueMap.get(name) ?? {
      customer: name,
      invoices: 0,
      d1: 0,
      d31: 0,
      d61: 0,
      d90: 0,
    };
    const days = Math.abs(daysBetween(row.end_date));
    const key = days <= 30 ? 'd1' : days <= 60 ? 'd31' : days <= 90 ? 'd61' : 'd90';
    entry[key] += toNumber(row.total_amount);
    entry.invoices += 1;
    overdueMap.set(name, entry);
  });
  const overdueByCustomer = Array.from(overdueMap.values()).sort(
    (a, b) => b.d1 + b.d31 + b.d61 + b.d90 - (a.d1 + a.d31 + a.d61 + a.d90),
  );
  const overdueSummary = {
    total: overdueTotal,
    d1: overdueByCustomer.reduce((sum, row) => sum + row.d1, 0),
    d31: overdueByCustomer.reduce((sum, row) => sum + row.d31, 0),
    d61: overdueByCustomer.reduce((sum, row) => sum + row.d61, 0),
    d90: overdueByCustomer.reduce((sum, row) => sum + row.d90, 0),
  };

  const creditMap = new Map<number, Row>();
  contractRows.forEach((row) => {
    if (!row.credit_limit) return;
    const id = toInt(row.customer_id);
    const limit = toNumber(row.credit_limit);
    const existing = creditMap.get(id);
    if (!existing || limit > toNumber(existing.limit)) {
      creditMap.set(id, {
        customer: String(row.company_name ?? 'Khách hàng'),
        used: toNumber(row.total_amount),
        limit,
      });
    }
  });

  const now = new Date();
  return {
    accountantProfile: {
      period: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`,
      reconciledAt: toISODate(now),
      customerCount: toInt(customerRows[0]?.total),
      overdueCustomerCount: overdueMap.size,
      totalReceivable,
    },
    accountantKpis: [
      {
        key: 'receivable',
        icon: '₫',
        tone: 'info',
        label: 'Tổng giá trị hợp đồng hiệu lực',
        value: formatMillions(Math.round(totalReceivable / 1_000_000)) + ' tr',
        hint: `${activeContracts.length} hợp đồng đang hiệu lực`,
      },
      {
        key: 'overdue',
        icon: '!',
        tone: 'danger',
        label: 'Hợp đồng quá hạn',
        value: formatMillions(Math.round(overdueTotal / 1_000_000)) + ' tr',
        hint: `${overdueMap.size} khách hàng có hợp đồng quá hạn`,
        hintTone: overdueTotal > 0 ? 'danger' : '',
      },
      {
        key: 'revenue',
        icon: '↗',
        tone: 'success',
        label: 'Giá trị hợp đồng tháng này',
        value: formatMillions(Math.round(monthTotal / 1_000_000)) + ' tr',
        hint: `${growth >= 0 ? '+' : ''}${growth}% so với tháng trước`,
        hintTone: growth >= 0 ? 'success' : 'danger',
      },
      {
        key: 'collection',
        icon: '%',
        tone: 'info',
        label: 'Tỷ lệ hợp đồng đã tất toán',
        value: `${collectionRate}%`,
        hint: `${liquidatedCount}/${contractRows.length} hợp đồng`,
        hintTone: collectionRate >= 90 ? 'success' : 'warning',
      },
    ],
    revenueByMonth,
    agingBuckets,
    recentInvoices: contractRows.slice(0, 6).map((row) => {
      const days = daysBetween(row.end_date);
      return {
        id: String(row.contract_code ?? ''),
        customer: String(row.company_name ?? ''),
        issuedAt: toISODate(row.created_at),
        amount: toNumber(row.total_amount),
        dueAt: toISODate(row.end_date),
        status: row.status === 'Liquidated' ? 'Đã tất toán' : days < 0 ? 'Quá hạn' : contractStatus(String(row.status)).label,
        tone: row.status === 'Liquidated' ? 'success' : days < 0 ? 'danger' : contractStatus(String(row.status)).tone,
      };
    }),
    pendingPayments: certificateRows.map((row) => ({
      id: String(row.certificate_no ?? ''),
      customer: String(row.company_name ?? ''),
      amount: 0,
      paidAt: toISODate(row.created_at),
      method: 'Chứng nhận chờ thanh toán',
    })),
    invoicesToIssue: quotationRows
      .filter((row) => !row.has_contract)
      .map((row) => ({
        id: withCode('BG', row.request_code, row.id),
        customer: String(row.company_name ?? ''),
        completedAt: toISODate(row.head_sales_reviewed_at),
        amount: toNumber(row.total_amount),
      })),
    overdueByCustomer,
    overdueSummary,
    creditLimits: Array.from(creditMap.values()),
    contractDebts: contractRows
      .filter((row) => ['Approved', 'Signed'].includes(String(row.status)))
      .slice(0, 6)
      .map((row) => ({
        contract: String(row.contract_code ?? ''),
        customer: String(row.company_name ?? ''),
        value: toNumber(row.total_amount),
        collected: row.status === 'Liquidated' ? toNumber(row.total_amount) : 0,
        ...contractStatus(String(row.status)),
      })),
  };
};

const buildSalesDashboard = async (salesAccountId?: number) => {
  const scope = salesAccountId ?? -1;
  const [accountRows, customerRows, requestRows, quotationRows, contractRows, deviceRows, fieldRows, quarterRows] =
    await Promise.all([
      query(
        `SELECT a.full_name, a.email, a.phone, a.id FROM accounts a WHERE a.id = $1 LIMIT 1`,
        [scope],
      ),
      query(
        `SELECT COUNT(*)::int AS total FROM customers WHERE assigned_sales_id = $1`,
        [scope],
      ),
      query(
        `SELECT sr.id, sr.request_code, sr.created_at, sr.status, sr.location_type,
                co.company_name,
                COUNT(sri.id)::int AS devices,
                STRING_AGG(DISTINCT st.name, ', ') AS services,
                (SELECT q.total_amount FROM quotations q WHERE q.service_request_id = sr.id ORDER BY q.id DESC LIMIT 1) AS amount
         FROM service_requests sr
         LEFT JOIN customers co ON co.id = sr.customer_id
         LEFT JOIN service_request_items sri ON sri.service_request_id = sr.id
         LEFT JOIN service_types st ON st.id = sri.service_type_id
         WHERE co.assigned_sales_id = $1
         GROUP BY sr.id, co.company_name
         ORDER BY sr.id DESC LIMIT 6`,
        [scope],
      ),
      query(
        `SELECT q.id, q.status, q.subtotal, q.discount_amount, q.travel_fee, q.total_amount,
                q.head_sales_reviewed_at, q.estimated_completion_date,
                sr.request_code, co.company_name
         FROM quotations q
         JOIN service_requests sr ON sr.id = q.service_request_id
         LEFT JOIN customers co ON co.id = sr.customer_id
         WHERE co.assigned_sales_id = $1
         ORDER BY q.id DESC LIMIT 6`,
        [scope],
      ),
      query(
        `SELECT ct.id, ct.contract_code, ct.title, ct.status, ct.total_amount,
                ct.credit_limit, ct.committed_years, ct.payment_term_days, co.company_name
         FROM contracts ct LEFT JOIN customers co ON co.id = ct.customer_id
         WHERE co.assigned_sales_id = $1
         ORDER BY ct.id DESC LIMIT 6`,
        [scope],
      ),
      query(
        `SELECT d.id, d.name, d.model, d.serial_number, d.next_due_date, d.is_group2, co.company_name
         FROM devices d LEFT JOIN customers co ON co.id = d.customer_id
         WHERE co.assigned_sales_id = $1 AND d.next_due_date IS NOT NULL
           AND d.next_due_date <= CURRENT_DATE + INTERVAL '30 days'
         ORDER BY d.next_due_date ASC LIMIT 6`,
        [scope],
      ),
      query(
        `SELECT st.field, COUNT(*)::int AS total
         FROM service_request_items sri
         JOIN service_types st ON st.id = sri.service_type_id
         JOIN service_requests sr ON sr.id = sri.service_request_id
         LEFT JOIN customers co ON co.id = sr.customer_id
         WHERE co.assigned_sales_id = $1
         GROUP BY st.field ORDER BY total DESC`,
        [scope],
      ),
      query(
        `SELECT COALESCE(SUM(q.total_amount), 0) AS achieved
         FROM quotations q
         JOIN service_requests sr ON sr.id = q.service_request_id
         LEFT JOIN customers co ON co.id = sr.customer_id
         WHERE co.assigned_sales_id = $1 AND q.status = 'Approved'
           AND q.head_sales_reviewed_at >= DATE_TRUNC('quarter', NOW())`,
        [scope],
      ),
    ]);

  const profile = accountRows[0] ?? {};
  const assignedCustomers = toInt(customerRows[0]?.total);
  const quarterAchieved = toNumber(quarterRows[0]?.achieved);
  const pendingQuotations = quotationRows.filter((row) =>
    ['Draft', 'PendingApproval', 'Sent'].includes(String(row.status)),
  ).length;
  const activeContracts = contractRows.filter((row) =>
    ['Approved', 'Signed'].includes(String(row.status)),
  ).length;

  const fieldLabels: Record<string, string> = {
    DIEN: 'Điện',
    KHOILUONG: 'Khối lượng',
    DODAI: 'Đo dài',
    APSUAT: 'Áp suất',
    NHIET: 'Nhiệt',
    HOA: 'Hóa',
    QUANG: 'Quang',
    DET: 'Điện tử',
  };
  const tones = ['info', 'success', 'warning', 'danger', 'neutral'];
  const serviceFieldDistribution = fieldRows.map((row, index) => ({
    label: fieldLabels[String(row.field)] ?? String(row.field),
    value: toInt(row.total),
    tone: tones[index % tones.length],
    displayValue: String(toInt(row.total)),
  }));

  const funnelColors: Record<string, string> = {
    Draft: 'neutral',
    PendingApproval: 'warning',
    Sent: 'info',
    Approved: 'success',
    Rejected: 'danger',
  };
  const quotationFunnel = ['Draft', 'PendingApproval', 'Sent', 'Approved', 'Rejected'].map((status) => ({
    label: TO_QUOTATION_LABEL[status] ?? status,
    value: quotationRows.filter((row) => row.status === status).length,
    tone: funnelColors[status],
  }));
  const funnelMax = Math.max(1, ...quotationFunnel.map((step) => step.value));

  const notifications: Row[] = [];
  if (pendingQuotations > 0) {
    notifications.push({
      id: 'quotations-pending',
      icon: '⌁',
      tone: 'warning',
      text: `${pendingQuotations} báo giá đang chờ xử lý.`,
      time: 'Cập nhật theo hệ thống',
    });
  }
  if (deviceRows.length > 0) {
    notifications.push({
      id: 'devices-due',
      icon: '◷',
      tone: 'danger',
      text: `${deviceRows.length} thiết bị của khách hàng phụ trách sắp đến hạn.`,
      time: 'Cập nhật theo ngày hạn',
    });
  }

  return {
    salesProfile: {
      name: String(profile.full_name ?? ''),
      code: String(profile.id ?? ''),
      email: String(profile.email ?? ''),
      phone: String(profile.phone ?? ''),
      department: 'Kinh doanh',
      assignedCustomers,
      quarterAchieved,
      quarterTarget: quarterAchieved,
    },
    salesKpis: [
      {
        key: 'customers',
        icon: '◎',
        tone: 'info',
        label: 'Doanh nghiệp phụ trách',
        value: String(assignedCustomers),
        hint: 'Theo phân công khách hàng',
      },
      {
        key: 'quotations',
        icon: '⌁',
        tone: 'warning',
        label: 'Báo giá chờ xử lý',
        value: String(pendingQuotations),
        hint: `${quotationRows.filter((row) => row.status === 'PendingApproval').length} chờ duyệt`,
      },
      {
        key: 'contracts',
        icon: '▤',
        tone: 'success',
        label: 'Hợp đồng hiệu lực',
        value: String(activeContracts),
        hint: 'Trong danh sách hợp đồng gần đây',
      },
      {
        key: 'devices',
        icon: '◷',
        tone: 'danger',
        label: 'Thiết bị sắp đến hạn',
        value: String(deviceRows.length),
        hint: 'Trong 30 ngày tới',
        hintTone: 'warning',
      },
    ],
    recentServiceRequests: requestRows.map((row) => ({
      id: withCode('SR', row.request_code, row.id),
      customer: String(row.company_name ?? ''),
      createdAt: toISODate(row.created_at),
      deviceCount: toInt(row.devices),
      serviceField: String(row.services ?? ''),
      locationType: String(row.location_type ?? 'In-lab'),
      ...requestStatus(String(row.status)),
      progress: requestStatus(String(row.status)).label,
      estimatedValue: toNumber(row.amount),
    })),
    pendingQuotations: quotationRows
      .filter((row) => ['Draft', 'PendingApproval', 'Sent'].includes(String(row.status)))
      .map((row) => ({
        id: withCode('BG', '', row.id),
        requestRef: withCode('SR', row.request_code, ''),
        customer: String(row.company_name ?? ''),
        subtotal: toNumber(row.subtotal),
        discountAmount: toNumber(row.discount_amount),
        travelFee: toNumber(row.travel_fee),
        totalAmount: toNumber(row.total_amount),
        ...quotationStatus(String(row.status)),
        expiryDate: toISODate(row.estimated_completion_date),
      })),
    activeContracts: contractRows.map((row) => ({
      id: String(row.id),
      contractCode: String(row.contract_code ?? ''),
      customer: String(row.company_name ?? ''),
      title: String(row.title ?? ''),
      contractValue: toNumber(row.total_amount),
      committedYears: toInt(row.committed_years),
      paymentTermDays: toInt(row.payment_term_days),
      creditLimit: toNumber(row.credit_limit),
      ...contractStatus(String(row.status)),
      hint: '',
    })),
    expiringCustomerDevices: deviceRows.map((row) => ({
      id: String(row.id),
      name: String(row.name ?? ''),
      model: String(row.model ?? ''),
      serial: String(row.serial_number ?? ''),
      customer: String(row.company_name ?? ''),
      serviceKind: row.is_group2 ? 'Kiểm định nhóm 2' : 'Hiệu chuẩn',
      isGroup2: Boolean(row.is_group2),
      nextDueDate: toISODate(row.next_due_date),
      tone: daysBetween(row.next_due_date) < 0 ? 'danger' : 'warning',
    })),
    serviceFieldDistribution,
    quotationFunnel,
    quotationFunnelMax: funnelMax,
    salesNotifications: notifications,
  };
};

const TO_QUOTATION_LABEL: Record<string, string> = {
  Draft: 'Nháp',
  PendingApproval: 'Chờ duyệt',
  Sent: 'Đã gửi',
  Approved: 'Đã duyệt',
  Rejected: 'Từ chối',
};

const quotationStatus = (status: string): { status: string; tone: string } => ({
  status: TO_QUOTATION_LABEL[status] ?? status,
  tone:
    status === 'Approved'
      ? 'success'
      : status === 'PendingApproval'
        ? 'warning'
        : status === 'Rejected'
          ? 'danger'
          : 'info',
});

const buildWarehouseDashboard = async (accountId?: number) => {
  const [accountRows, txRows, inventoryRows, inWarehouseRows, workOrderRows, deviceStatusRows, weeklyRows] =
    await Promise.all([
      query(
        `SELECT a.full_name, a.email, a.phone FROM accounts a WHERE a.id = $1 LIMIT 1`,
        [accountId ?? -1],
      ),
      query(
        `SELECT wt.id, wt.type, wt.transaction_at, wt.condition_note,
                d.name AS device_name, d.model, d.serial_number,
                c.company_name, a.full_name AS handler_name,
                sr.request_code
         FROM warehouse_transactions wt
         JOIN devices d ON d.id = wt.device_id
         LEFT JOIN customers c ON c.id = d.customer_id
         LEFT JOIN accounts a ON a.id = wt.handled_by
         LEFT JOIN service_request_items sri ON sri.id = wt.service_request_item_id
         LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
         ORDER BY wt.id DESC LIMIT 6`,
      ),
      query(
        `SELECT
                COUNT(*) FILTER (WHERE type = 'Inbound')::int AS total_inbound,
                COUNT(*) FILTER (WHERE type = 'Outbound')::int AS total_outbound,
                COUNT(*) FILTER (WHERE type = 'Inbound' AND transaction_at >= CURRENT_DATE)::int AS today_inbound,
                COUNT(*) FILTER (WHERE type = 'Outbound' AND transaction_at >= CURRENT_DATE)::int AS today_outbound
         FROM warehouse_transactions`,
      ),
      query(
        `SELECT d.id, d.name, d.model, d.serial_number, d.customer_id,
                c.company_name, wt.transaction_at, wt.condition_note,
                s.seal_code, ct.certificate_no, ct.status AS certificate_status
         FROM devices d
         JOIN customers c ON c.id = d.customer_id
         JOIN LATERAL (
           SELECT type, transaction_at, condition_note FROM warehouse_transactions w
            WHERE w.device_id = d.id ORDER BY w.id DESC LIMIT 1
         ) wt ON TRUE
         LEFT JOIN seals s ON s.device_id = d.id
         LEFT JOIN certificates ct ON ct.id = s.certificate_id
         WHERE wt.type = 'Inbound'
         ORDER BY wt.transaction_at ASC LIMIT 6`,
      ),
      query(
        `SELECT wo.id, wo.status, wo.created_at, d.name AS device_name, d.model, d.serial_number,
                c.company_name, a.full_name AS technician_name, st.name AS service_name
         FROM work_orders wo
         JOIN work_order_assignments woa ON woa.work_order_id = wo.id
         JOIN service_request_items sri ON sri.id = woa.service_request_item_id
         JOIN devices d ON d.id = sri.device_id
         LEFT JOIN customers c ON c.id = d.customer_id
         LEFT JOIN accounts a ON a.id = woa.technician_id
         LEFT JOIN service_types st ON st.id = sri.service_type_id
         WHERE wo.status IN ('Assigned', 'InProgress')
         ORDER BY wo.id DESC LIMIT 6`,
      ),
      query(
        `SELECT status, COUNT(*)::int AS total FROM devices GROUP BY status ORDER BY status`,
      ),
      query(
        `SELECT TO_CHAR(transaction_at, 'YYYY-MM-DD') AS day, type, COUNT(*)::int AS total
         FROM warehouse_transactions
         WHERE transaction_at >= NOW() - INTERVAL '7 days'
         GROUP BY 1, 2 ORDER BY 1`,
      ),
    ]);

  const account = accountRows[0] ?? {};
  const inventory = inventoryRows[0] ?? {};
  const totalInbound = toInt(inventory.total_inbound);
  const totalOutbound = toInt(inventory.total_outbound);
  const inWarehouse = Math.max(0, totalInbound - totalOutbound);
  const deviceTone: Record<string, string> = {
    Active: 'success',
    ExpiringSoon: 'warning',
    Expired: 'danger',
    InRepair: 'info',
  };
  const statusLabels: Record<string, string> = {
    Active: 'Còn hạn',
    ExpiringSoon: 'Sắp hết hạn',
    Expired: 'Quá hạn',
    InRepair: 'Đang sửa chữa',
  };
  const weeklyMap = new Map<string, { inbound: number; outbound: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().slice(0, 10);
    weeklyMap.set(dayKey, { inbound: 0, outbound: 0 });
  }
  weeklyRows.forEach((row) => {
    const dayKey = String(row.day);
    const entry = weeklyMap.get(dayKey) ?? { inbound: 0, outbound: 0 };
    if (row.type === 'Inbound') entry.inbound += toInt(row.total);
    else entry.outbound += toInt(row.total);
    weeklyMap.set(dayKey, entry);
  });
  const weeklyThroughput = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, entry]) => ({
      label: day.slice(5),
      value: entry.inbound + entry.outbound,
      displayValue: `${entry.inbound}/${entry.outbound}`,
    }));

  const notifications: Row[] = [];
  if (toInt(inventory.today_inbound) > 0 || toInt(inventory.today_outbound) > 0) {
    notifications.push({
      id: 'today-throughput',
      icon: '↻',
      tone: 'info',
      text: `Hôm nay: ${toInt(inventory.today_inbound)} lần nhập kho · ${toInt(inventory.today_outbound)} lần xuất kho.`,
      time: 'Hôm nay',
    });
  }
  const longStaying = inWarehouseRows.filter(
    (row) => Math.abs(daysBetween(row.transaction_at)) > 7,
  );
  if (longStaying.length > 0) {
    notifications.push({
      id: 'long-stay',
      icon: '!',
      tone: 'warning',
      text: `${longStaying.length} thiết bị nằm trong kho trên 7 ngày.`,
      time: 'Cập nhật theo giao dịch',
    });
  }
  if (notifications.length === 0) {
    notifications.push(
      {
        id: 'wh-status-ok',
        icon: '✓',
        tone: 'success',
        text: 'Hệ thống kho vận đang hoạt động ổn định theo tiêu chuẩn ISO/IEC 17025.',
        time: 'Hôm nay',
      },
      {
        id: 'wh-ready-inbound',
        icon: '📦',
        tone: 'info',
        text: 'Sẵn sàng tiếp nhận thiết bị gửi đo In-lab từ khách hàng hoặc đơn vị vận chuyển.',
        time: 'Sẵn sàng',
      },
    );
  }

  return {
    warehouseProfile: {
      warehouseName: 'Kho thiết bị',
      location: 'Hệ thống ISOCAL',
      name: String(account.full_name ?? ''),
      code: String(account.id ?? ''),
      email: String(account.email ?? ''),
      phone: String(account.phone ?? ''),
      occupiedSlots: inWarehouse,
      totalSlots: inWarehouse,
    },
    warehouseKpis: [
      {
        key: 'inbound',
        icon: '↓',
        tone: 'success',
        label: 'Lượt nhập kho',
        value: String(totalInbound),
        hint: `${toInt(inventory.today_inbound)} lượt hôm nay`,
      },
      {
        key: 'outbound',
        icon: '↑',
        tone: 'info',
        label: 'Lượt xuất kho',
        value: String(totalOutbound),
        hint: `${toInt(inventory.today_outbound)} lượt hôm nay`,
      },
      {
        key: 'inWarehouse',
        icon: '▤',
        tone: 'warning',
        label: 'Thiết bị đang trong kho',
        value: String(inWarehouse),
        hint: 'Nhập kho trừ xuất kho',
      },
      {
        key: 'toLab',
        icon: '⌁',
        tone: 'warning',
        label: 'Công việc chờ Lab',
        value: String(workOrderRows.length),
        hint: 'Work order Assigned / InProgress gần nhất',
      },
    ],
    recentWarehouseTransactions: txRows.map((row) => ({
      id: String(row.id),
      type: String(row.type),
      device: String(row.device_name ?? ''),
      model: String(row.model ?? ''),
      serial: String(row.serial_number ?? ''),
      customer: String(row.company_name ?? ''),
      serviceRequestRef: String(row.request_code ?? '—'),
      conditionNote: String(row.condition_note ?? ''),
      handledBy: String(row.handler_name ?? ''),
      transactionAt: relativeTime(row.transaction_at),
      tone: row.type === 'Inbound' ? 'success' : 'info',
    })),
    readyToReturnDevices: inWarehouseRows.map((row) => {
      const shelfMatch = String(row.condition_note ?? '').match(/Vị trí lưu kho:\s*([^.;\n]+)/i);
      const shelf = shelfMatch ? shelfMatch[1].trim() : 'Kệ A-02';
      return {
        id: String(row.id),
        device: String(row.name ?? ''),
        model: String(row.model ?? ''),
        serial: String(row.serial_number ?? ''),
        customer: String(row.company_name ?? ''),
        shelfLocation: shelf,
        certificateNo: String(row.certificate_no ?? 'CAL-2026-0012'),
        sealCode: String(row.seal_code ?? 'SEAL-0128'),
        paymentStatus: row.certificate_status === 'Released' ? 'Đã thanh toán' : 'Chờ thanh toán',
        daysInWarehouse: Math.abs(daysBetween(row.transaction_at)),
      };
    }),
    pendingLabTransfer: workOrderRows.map((row) => ({
      id: String(row.id),
      device: String(row.device_name ?? ''),
      model: String(row.model ?? ''),
      serial: String(row.serial_number ?? ''),
      customer: String(row.company_name ?? ''),
      serviceKind: String(row.service_name ?? ''),
      inboundTime: toISODate(row.created_at),
      assignedTech: String(row.technician_name ?? ''),
      shelfLocation: '—',
    })),
    warehouseStatusDistribution: deviceStatusRows.map((row) => ({
      label: statusLabels[String(row.status)] ?? String(row.status),
      value: toInt(row.total),
      tone: deviceTone[String(row.status)] ?? 'info',
    })),
    warehouseStatusMax: Math.max(1, ...deviceStatusRows.map((row) => toInt(row.total))),
    weeklyThroughput,
    warehouseNotifications: notifications,
  };
};

const buildReviewerDashboard = async () => {
  const [workOrderRows, sealRows, standardRows, procedureRows, reviewRows, attentionRows] =
    await Promise.all([
      query(
        `SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'Open')::int AS open,
                COUNT(*) FILTER (WHERE status = 'Assigned')::int AS assigned,
                COUNT(*) FILTER (WHERE status = 'InProgress')::int AS in_progress,
                COUNT(*) FILTER (WHERE status = 'Done')::int AS done
         FROM work_orders`,
      ),
      query(
        `SELECT
                COUNT(*) FILTER (WHERE status = 'Active')::int AS active,
                COUNT(*) FILTER (WHERE status = 'Active' AND due_date <= CURRENT_DATE + INTERVAL '60 days')::int AS due_soon
         FROM seals`,
      ),
      query(
        `SELECT
                COUNT(*) FILTER (WHERE status = 'Active')::int AS active,
                COUNT(*) FILTER (WHERE status = 'Active' AND calibration_expiry <= CURRENT_DATE + INTERVAL '30 days')::int AS expiring,
                (SELECT name FROM master_standards WHERE status = 'Active'
                  ORDER BY calibration_expiry ASC LIMIT 1) AS name,
                (SELECT calibration_expiry FROM master_standards WHERE status = 'Active'
                  ORDER BY calibration_expiry ASC LIMIT 1) AS calibration_expiry
         FROM master_standards`,
      ),
      query(
        `SELECT (SELECT COUNT(*)::int FROM calibration_procedures WHERE status = 'Draft') AS total,
                (SELECT st.name FROM calibration_procedures cp
                   LEFT JOIN service_types st ON st.id = cp.service_type_id
                  WHERE cp.status = 'Draft' ORDER BY cp.id DESC LIMIT 1) AS name`,
      ),
      query("SELECT COUNT(*)::int AS total FROM calibration_records WHERE review_status = 'Pending'"),
      query(
        `SELECT cr.id, cr.review_status, cr.submitted_at,
                d.name AS device_name, a.full_name AS technician_name
         FROM calibration_records cr
         JOIN service_request_items sri ON sri.id = cr.service_request_item_id
         JOIN devices d ON d.id = sri.device_id
         LEFT JOIN accounts a ON a.id = cr.technician_id
         ORDER BY cr.submitted_at DESC NULLS LAST LIMIT 1`,
      ),
    ]);

  const workOrders = workOrderRows[0] ?? {};
  const seals = sealRows[0] ?? {};
  const standards = standardRows[0] ?? {};
  const attention: Row[] = [];
  if (standards.expiring > 0 && standards.name) {
    attention.push({
      id: 'standard-expiring',
      text: `${String(standards.name)} · hạn ${toISODate(standards.calibration_expiry)}`,
      tone: 'warning',
    });
  }
  if (toInt(procedureRows[0]?.total) > 0) {
    attention.push({
      id: 'procedure-draft',
      text: `${String(procedureRows[0]?.name ?? 'Quy trình')} · cần hoàn thiện và phát hành`,
      tone: 'info',
    });
  }
  if (attentionRows.length > 0) {
    attention.push({
      id: 'latest-review',
      text: `Hồ sơ ${withCode('CR', '', attentionRows[0].id)} · ${String(attentionRows[0].device_name ?? '')} · chờ soát xét`,
      tone: 'info',
    });
  }

  return {
    reviewer: {
      workOrdersRunning:
        toInt(workOrders.open) + toInt(workOrders.assigned) + toInt(workOrders.in_progress),
      workOrdersNote: `Open ${toInt(workOrders.open)} · Assigned ${toInt(workOrders.assigned)} · InProgress ${toInt(workOrders.in_progress)}`,
      sealsDueSoon: toInt(seals.due_soon),
      sealsActive: toInt(seals.active),
      standardsExpiring: toInt(standards.expiring),
      standardsActive: toInt(standards.active),
      pendingRecords: toInt(reviewRows[0]?.total),
      procedureDrafts: toInt(procedureRows[0]?.total),
      unreadCount: 0,
      attention,
    },
  };
};

export const getDashboardOverview = async (
  user: AuthUser,
  requestedRole?: string,
): Promise<Record<string, unknown>> => {
  const role = requestedRole
    ? normalizeRole(requestedRole)
    : normalizeRole(user.role);
  const accountId = resolveUserId(user);

  if (
    role === 'warehouse' ||
    role === 'warehousestaff' ||
    role === 'headofwarehouse' ||
    role === 'headwarehouse'
  ) {
    return buildWarehouseDashboard(accountId);
  }
  if (role === 'customer') {
    return buildCustomerDashboard(await resolveCustomerId(user));
  }
  if (role === 'admin' || role === 'ceo') {
    return buildAdminDashboard();
  }
  if (role === 'accountant') {
    return buildAccountantDashboard();
  }
  if (role === 'sales' || role === 'headsales') {
    return buildSalesDashboard(accountId);
  }
  if (
    role === 'reviewer' ||
    role === 'headtechnician' ||
    role === 'headoftech' ||
    role === 'labmanager' ||
    role === 'technician'
  ) {
    return buildReviewerDashboard();
  }
  return {};
};
