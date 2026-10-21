const today = new Date();

const toISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return toISODate(date);
};

export const accountantProfile = {
  period: 'Tháng 10/2026',
  reconciledAt: addDays(-1),
  customerCount: 34,
  overdueCustomerCount: 5,
  totalReceivable: 1840000000,
};

export const accountantKpis = [
  {
    key: 'receivable',
    icon: '₫',
    tone: 'info',
    label: 'Tổng phải thu',
    value: '1,84 tỷ',
    hint: '34 khách hàng đang có dư nợ',
  },
  {
    key: 'overdue',
    icon: '!',
    tone: 'danger',
    label: 'Công nợ quá hạn',
    value: '286,4 tr',
    hint: '5 khách hàng quá hạn',
    hintTone: 'danger',
  },
  {
    key: 'revenue',
    icon: '↗',
    tone: 'success',
    label: 'Doanh thu tháng 10',
    value: '1,26 tỷ',
    hint: '+18,4% so với tháng 9',
    hintTone: 'success',
  },
  {
    key: 'collection',
    icon: '%',
    tone: 'info',
    label: 'Tỷ lệ thu hồi',
    value: '82%',
    hint: 'Mục tiêu 90%',
    hintTone: 'warning',
  },
];

export const revenueByMonth = [
  { label: 'T5', value: 980, displayValue: '980' },
  { label: 'T6', value: 1050, displayValue: '1.050' },
  { label: 'T7', value: 1120, displayValue: '1.120' },
  { label: 'T8', value: 1080, displayValue: '1.080' },
  { label: 'T9', value: 1060, displayValue: '1.060' },
  { label: 'T10', value: 1260, displayValue: '1.260', tone: 'success' },
];

export const agingBuckets = [
  {
    label: 'Chưa đến hạn',
    value: 1553.6,
    displayValue: '1,55 tỷ',
    color: '#4c9f70',
  },
  {
    label: '1 – 30 ngày',
    value: 120,
    displayValue: '120 tr',
    color: '#2f7f9e',
  },
  {
    label: '31 – 60 ngày',
    value: 86.4,
    displayValue: '86,4 tr',
    color: '#d99a3d',
  },
  {
    label: '61 – 90 ngày',
    value: 50,
    displayValue: '50 tr',
    color: '#e07b39',
  },
  {
    label: '> 90 ngày',
    value: 30,
    displayValue: '30 tr',
    color: '#c25b5b',
  },
];

export const recentInvoices = [
  {
    id: 'HD-2026-112',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    issuedAt: addDays(-3),
    amount: 42500000,
    dueAt: addDays(27),
    status: 'Chưa thanh toán',
    tone: 'warning',
  },
  {
    id: 'HD-2026-109',
    customer: 'Công ty CP Đông Á',
    issuedAt: addDays(-6),
    amount: 68000000,
    dueAt: addDays(24),
    status: 'Chưa thanh toán',
    tone: 'warning',
  },
  {
    id: 'HD-2026-104',
    customer: 'Công ty CP Hòa Phát',
    issuedAt: addDays(-13),
    amount: 52000000,
    dueAt: addDays(17),
    status: 'Đã thanh toán',
    tone: 'success',
  },
  {
    id: 'HD-2026-098',
    customer: 'Công ty CP An Khang',
    issuedAt: addDays(-26),
    amount: 42000000,
    dueAt: addDays(4),
    status: 'Chưa thanh toán',
    tone: 'warning',
  },
  {
    id: 'HD-2026-091',
    customer: 'Công ty TNHH Bình Minh',
    issuedAt: addDays(-39),
    amount: 30000000,
    dueAt: addDays(-9),
    status: 'Quá hạn',
    tone: 'danger',
  },
];

export const pendingPayments = [
  {
    id: 'GD-2026-0341',
    customer: 'Công ty CP Hòa Phát',
    amount: 58500000,
    paidAt: addDays(-1),
    method: 'Chuyển khoản',
  },
  {
    id: 'GD-2026-0340',
    customer: 'Công ty CP An Khang',
    amount: 42000000,
    paidAt: addDays(-1),
    method: 'Chuyển khoản',
  },
  {
    id: 'GD-2026-0338',
    customer: 'Công ty CP Đông Á',
    amount: 30000000,
    paidAt: addDays(-2),
    method: 'Tiền mặt',
  },
  {
    id: 'GD-2026-0336',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    amount: 18000000,
    paidAt: addDays(-3),
    method: 'Chuyển khoản',
  },
];

export const invoicesToIssue = [
  {
    id: 'HS-2026-058',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    completedAt: addDays(-3),
    amount: 32500000,
  },
  {
    id: 'HS-2026-057',
    customer: 'Công ty CP Đông Á',
    completedAt: addDays(-4),
    amount: 18200000,
  },
  {
    id: 'HS-2026-054',
    customer: 'Công ty CP Hòa Phát',
    completedAt: addDays(-6),
    amount: 45000000,
  },
  {
    id: 'HS-2026-049',
    customer: 'Công ty CP An Khang',
    completedAt: addDays(-9),
    amount: 27600000,
  },
];

export const overdueByCustomer = [
  {
    customer: 'Công ty CP Đông Á',
    invoices: 1,
    d1: 68000000,
    d31: 0,
    d61: 0,
    d90: 0,
  },
  {
    customer: 'Công ty CP An Khang',
    invoices: 2,
    d1: 30000000,
    d31: 42000000,
    d61: 0,
    d90: 0,
  },
  {
    customer: 'Công ty CP Hòa Phát',
    invoices: 4,
    d1: 22000000,
    d31: 44400000,
    d61: 20000000,
    d90: 11700000,
  },
  {
    customer: 'Công ty TNHH Bình Minh',
    invoices: 1,
    d1: 0,
    d31: 0,
    d61: 30000000,
    d90: 0,
  },
  {
    customer: 'Công ty TNHH Thiết bị Minh Long',
    invoices: 1,
    d1: 0,
    d31: 0,
    d61: 0,
    d90: 18300000,
  },
];

export const overdueSummary = {
  total: 286400000,
  d1: 120000000,
  d31: 86400000,
  d61: 50000000,
  d90: 30000000,
};

export const creditLimits = [
  {
    customer: 'Công ty CP Hòa Phát',
    used: 512400000,
    limit: 700000000,
  },
  {
    customer: 'Công ty CP Đông Á',
    used: 286400000,
    limit: 350000000,
  },
  {
    customer: 'Công ty CP An Khang',
    used: 198200000,
    limit: 300000000,
  },
  {
    customer: 'Công ty TNHH Bình Minh',
    used: 152000000,
    limit: 250000000,
  },
  {
    customer: 'Công ty TNHH Thiết bị Minh Long',
    used: 42800000,
    limit: 600000000,
  },
];

export const contractDebts = [
  {
    contract: 'HĐ-2026/018',
    customer: 'Công ty CP Hòa Phát',
    value: 850000000,
    collected: 337600000,
    status: 'Đang thực hiện',
    tone: 'info',
  },
  {
    contract: 'HĐ-2026/012',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    value: 320000000,
    collected: 277200000,
    status: 'Sắp tất toán',
    tone: 'success',
  },
  {
    contract: 'HĐ-2026/021',
    customer: 'Công ty CP Đông Á',
    value: 420000000,
    collected: 133600000,
    status: 'Quá hạn',
    tone: 'danger',
  },
  {
    contract: 'HĐ-2026/009',
    customer: 'Công ty CP An Khang',
    value: 300000000,
    collected: 101800000,
    status: 'Đang thực hiện',
    tone: 'info',
  },
];
