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

export const customerProfile = {
  companyName: 'Công ty TNHH Thiết bị Minh Long',
  taxCode: '0312456789',
  industry: 'Thiết bị điện – điện tử',
  address: 'Lô B12, KCN Tân Bình, TP. Hồ Chí Minh',
  contractCode: '2026/012',
  contractExpiry: addDays(210),
  accountCount: 4,
};

export const customerKpis = [
  {
    key: 'devices',
    icon: '▤',
    tone: 'info',
    label: 'Tổng thiết bị',
    value: '128',
    hint: '6 thiết bị thêm trong 30 ngày',
  },
  {
    key: 'due',
    icon: '◷',
    tone: 'warning',
    label: 'Sắp đến hạn (≤ 30 ngày)',
    value: '14',
    hint: '3 thiết bị đã quá hạn',
    hintTone: 'danger',
  },
  {
    key: 'orders',
    icon: '⌁',
    tone: 'info',
    label: 'Đơn đang xử lý',
    value: '7',
    hint: '2 đơn chờ phân công',
  },
];

export const dueBuckets = [
  { label: 'Đã hết hạn', value: 3, tone: 'danger' },
  { label: '≤ 30 ngày', value: 14, tone: 'warning' },
  { label: '31 – 90 ngày', value: 27, tone: 'info' },
  { label: '> 90 ngày', value: 84, tone: 'success' },
];

export const orderStatus = [
  { label: 'Mới', value: 4, color: '#7a8fa6' },
  { label: 'Đã báo giá', value: 3, color: '#d99a3d' },
  { label: 'Đang thực hiện', value: 7, color: '#2f7f9e' },
  { label: 'Hoàn tất', value: 21, color: '#4c9f70' },
  { label: 'Đã huỷ', value: 1, color: '#c25b5b' },
];

export const recentOrders = [
  {
    id: 'SR-2026-058',
    createdAt: addDays(-3),
    devices: 6,
    service: 'Hiệu chuẩn + Kiểm định',
    status: 'Đang thực hiện',
    tone: 'info',
    done: 4,
  },
  {
    id: 'SR-2026-057',
    createdAt: addDays(-6),
    devices: 3,
    service: 'Hiệu chuẩn',
    status: 'Đã báo giá',
    tone: 'warning',
    done: 0,
  },
  {
    id: 'SR-2026-056',
    createdAt: addDays(-9),
    devices: 12,
    service: 'Kiểm định',
    status: 'Hoàn tất',
    tone: 'success',
    done: 12,
  },
  {
    id: 'SR-2026-055',
    createdAt: addDays(-13),
    devices: 2,
    service: 'Hiệu chuẩn',
    status: 'Chờ xác nhận',
    tone: 'neutral',
    done: 0,
  },
  {
    id: 'SR-2026-054',
    createdAt: addDays(-18),
    devices: 8,
    service: 'Hiệu chuẩn',
    status: 'Hoàn tất',
    tone: 'success',
    done: 8,
  },
];

export const dueDevices = [
  {
    id: 'dev-1',
    name: 'Đồng hồ vạn năng',
    model: 'Fluke 289',
    serial: 'FL-289-10482',
    lastCalibratedAt: addDays(-364),
    nextDueDate: addDays(1),
    status: 'Sắp đến hạn',
    tone: 'warning',
  },
  {
    id: 'dev-2',
    name: 'Máy hiện sóng',
    model: 'Tektronix MDO3024',
    serial: 'TEK-3024-7741',
    lastCalibratedAt: addDays(-410),
    nextDueDate: addDays(-46),
    status: 'Quá hạn',
    tone: 'danger',
  },
  {
    id: 'dev-3',
    name: 'Cân bàn điện tử',
    model: 'Mettler Toledo BBA231',
    serial: 'MT-BBA-88201',
    lastCalibratedAt: addDays(-358),
    nextDueDate: addDays(7),
    status: 'Sắp đến hạn',
    tone: 'warning',
  },
  {
    id: 'dev-4',
    name: 'Nhiệt ẩm kế điện tử',
    model: 'Testo 608-H2',
    serial: 'TS-608-39017',
    lastCalibratedAt: addDays(-310),
    nextDueDate: addDays(55),
    status: 'Còn hạn',
    tone: 'success',
  },
  {
    id: 'dev-5',
    name: 'Công tơ điện 3 pha',
    model: 'Landis+Gyr E450',
    serial: 'LG-E450-56023',
    lastCalibratedAt: addDays(-458),
    nextDueDate: addDays(-90),
    status: 'Quá hạn',
    tone: 'danger',
  },
];

export const quotations = [
  {
    id: 'BG-2026-091',
    sentAt: addDays(-3),
    expiresAt: addDays(4),
    amount: 32500000,
  },
  {
    id: 'BG-2026-089',
    sentAt: addDays(-7),
    expiresAt: addDays(0),
    amount: 18200000,
  },
  {
    id: 'BG-2026-086',
    sentAt: addDays(-12),
    expiresAt: addDays(2),
    amount: 35800000,
  },
];

export const certificates = [
  {
    id: 'CN-2026-0142',
    device: 'Cân phân tích',
    issuedAt: addDays(-39),
    expiresAt: addDays(326),
    sealCode: 'TEM-2026-0142',
    status: 'Hiệu lực',
    tone: 'success',
  },
  {
    id: 'CN-2026-0138',
    device: 'Nhiệt ẩm kế điện tử',
    issuedAt: addDays(-50),
    expiresAt: addDays(315),
    sealCode: 'TEM-2026-0138',
    status: 'Hiệu lực',
    tone: 'success',
  },
  {
    id: 'CN-2026-0121',
    device: 'Đồng hồ vạn năng',
    issuedAt: addDays(-93),
    expiresAt: addDays(2),
    sealCode: 'TEM-2026-0121',
    status: 'Sắp hết hạn',
    tone: 'warning',
  },
];

export const invoices = [
  {
    id: 'HD-2026-078',
    issuedAt: addDays(-11),
    amount: 24500000,
    dueAt: addDays(4),
    status: 'Chưa thanh toán',
    tone: 'warning',
  },
  {
    id: 'HD-2026-071',
    issuedAt: addDays(-31),
    amount: 18300000,
    dueAt: addDays(-16),
    status: 'Quá hạn',
    tone: 'danger',
  },
  {
    id: 'HD-2026-065',
    issuedAt: addDays(-67),
    amount: 12000000,
    dueAt: addDays(-52),
    status: 'Đã thanh toán',
    tone: 'success',
  },
];

export const debtSummary = {
  total: 42800000,
  overdue: 18300000,
  unpaidCount: 2,
  overdueCount: 1,
};

export const notifications = [
  {
    id: 'notice-1',
    icon: '✓',
    tone: 'success',
    text: 'Đơn SR-2026-058 đã hoàn tất 4/6 thiết bị.',
    time: '2 giờ trước',
  },
  {
    id: 'notice-2',
    icon: '◷',
    tone: 'warning',
    text: 'Báo giá BG-2026-089 hết hạn trong hôm nay.',
    time: '5 giờ trước',
  },
  {
    id: 'notice-3',
    icon: '!',
    tone: 'danger',
    text: 'Máy hiện sóng Tektronix MDO3024 đã quá hạn hiệu chuẩn 46 ngày.',
    time: '1 ngày trước',
  },
  {
    id: 'notice-4',
    icon: '◎',
    tone: 'info',
    text: 'Chứng nhận CN-2026-0142 đã được phát hành và có thể tải về.',
    time: '3 ngày trước',
  },
];
