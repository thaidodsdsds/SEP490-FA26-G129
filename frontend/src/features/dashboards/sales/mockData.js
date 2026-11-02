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

export const salesProfile = {
  name: 'Nguyễn Hoàng Nam',
  code: 'SL-104',
  role: 'Nhân viên Kinh doanh (Sales)',
  department: 'Phòng Phát triển Kinh doanh & Dịch vụ B2B',
  phone: '0908 123 456',
  email: 'nam.nh@isocal.vn',
  assignedCustomers: 42,
  quarterTarget: 2_500_000_000,
  quarterAchieved: 1_870_000_000,
};

export const salesKpis = [
  {
    key: 'customers',
    icon: '◎',
    tone: 'info',
    label: 'Doanh nghiệp quản lý',
    value: '42',
    hint: '+4 khách hàng mới tháng này',
    hintTone: 'success',
  },
  {
    key: 'serviceRequests',
    icon: '▤',
    tone: 'warning',
    label: 'Yêu cầu dịch vụ mới',
    value: '14',
    hint: '3 đơn cần hoàn thiện báo giá',
    hintTone: 'warning',
  },
  {
    key: 'pendingQuotations',
    icon: '₫',
    tone: 'info',
    label: 'Báo giá chờ phản hồi',
    value: '6',
    hint: 'Tổng giá trị ~345.8 tr',
    hintTone: 'info',
  },
  {
    key: 'pendingContracts',
    icon: '⌁',
    tone: 'success',
    label: 'Hợp đồng chờ CEO ký số',
    value: '3',
    hint: 'Cam kết 1.85 tỷ · Đã duyệt điều khoản',
    hintTone: 'success',
  },
];

export const recentServiceRequests = [
  {
    id: 'SR-2026-088',
    customer: 'Công ty TNHH Chế tạo Cơ khí Nam Phát',
    deviceCount: 6,
    serviceField: 'Độ dài – Dung tích & Khối lượng',
    locationType: 'In-lab',
    status: 'New',
    tone: 'info',
    createdAt: addDays(-1),
    estimatedValue: 24_500_000,
    progress: 'Chờ lập báo giá',
  },
  {
    id: 'SR-2026-085',
    customer: 'Nhà máy Điện tử SamVina Hải Phòng',
    deviceCount: 22,
    serviceField: 'Điện – Điện tử – Tần số',
    locationType: 'On-site',
    status: 'Quoted',
    tone: 'warning',
    createdAt: addDays(-3),
    estimatedValue: 78_000_000,
    progress: 'Đã gửi báo giá, chờ khách duyệt',
  },
  {
    id: 'SR-2026-082',
    customer: 'Bệnh viện Đa khoa Quốc tế Hoàn Vũ',
    deviceCount: 9,
    serviceField: 'Hóa học – Y tế & Nhiệt độ',
    locationType: 'On-site',
    status: 'Confirmed',
    tone: 'success',
    createdAt: addDays(-5),
    estimatedValue: 46_200_000,
    progress: 'Đã duyệt báo giá → Đang tạo WorkOrder',
  },
  {
    id: 'SR-2026-079',
    customer: 'Công ty CP Nhựa Rạng Đông',
    deviceCount: 14,
    serviceField: 'Khối lượng – Lực & Áp suất',
    locationType: 'In-lab',
    status: 'InProgress',
    tone: 'info',
    createdAt: addDays(-8),
    estimatedValue: 52_000_000,
    progress: 'Kỹ thuật viên đang đo kiểm tại Lab',
  },
  {
    id: 'SR-2026-074',
    customer: 'Tập đoàn Dệt may Việt Long',
    deviceCount: 18,
    serviceField: 'Dệt may – Da giày & Nhiệt độ',
    locationType: 'In-lab',
    status: 'Completed',
    tone: 'success',
    createdAt: addDays(-14),
    estimatedValue: 64_800_000,
    progress: 'Đã phát hành Certificate & Seal',
  },
];

export const pendingQuotations = [
  {
    id: 'QT-2026-061',
    requestRef: 'SR-2026-085',
    customer: 'Nhà máy Điện tử SamVina Hải Phòng',
    subtotal: 82_000_000,
    discountAmount: 8_000_000,
    travelFee: 4_000_000,
    totalAmount: 78_000_000,
    sentDate: addDays(-2),
    expiryDate: addDays(12),
    status: 'Sent',
    tone: 'warning',
  },
  {
    id: 'QT-2026-059',
    requestRef: 'SR-2026-081',
    customer: 'Công ty Cổ phần Sữa Ba Vì',
    subtotal: 115_000_000,
    discountAmount: 11_500_000,
    travelFee: 2_500_000,
    totalAmount: 106_000_000,
    sentDate: addDays(-4),
    expiryDate: addDays(10),
    status: 'Sent',
    tone: 'warning',
  },
  {
    id: 'QT-2026-056',
    requestRef: 'SR-2026-077',
    customer: 'Công ty Dược phẩm TW1 - Pharbaco',
    subtotal: 94_000_000,
    discountAmount: 4_000_000,
    travelFee: 0,
    totalAmount: 90_000_000,
    sentDate: addDays(-7),
    expiryDate: addDays(7),
    status: 'Sent',
    tone: 'warning',
  },
  {
    id: 'QT-2026-054',
    requestRef: 'SR-2026-075',
    customer: 'Nhà máy Bao bì Á Châu',
    subtotal: 38_500_000,
    discountAmount: 0,
    travelFee: 1_500_000,
    totalAmount: 40_000_000,
    sentDate: addDays(-9),
    expiryDate: addDays(5),
    status: 'Draft',
    tone: 'neutral',
  },
];

export const activeContracts = [
  {
    id: 'CT-01',
    contractCode: 'HD-2026/014',
    customer: 'Tập đoàn Điện tử V-Tech',
    title: 'Hiệu chuẩn & Kiểm định trọn gói thiết bị nhà máy năm 2026-2028',
    contractValue: 850_000_000,
    committedYears: 2,
    paymentTermDays: 30,
    creditLimit: 250_000_000,
    status: 'PendingApproval',
    tone: 'warning',
    hint: 'Chờ CEO ký số (DigitalSignature)',
  },
  {
    id: 'CT-02',
    contractCode: 'HD-2026/012',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    title: 'Hiệu chuẩn định kỳ thiết bị phân tích và đo lường điện',
    contractValue: 450_000_000,
    committedYears: 1,
    paymentTermDays: 45,
    creditLimit: 120_000_000,
    status: 'Active',
    tone: 'success',
    hint: 'Đã kích hoạt · Đã thanh toán đợt 1',
  },
  {
    id: 'CT-03',
    contractCode: 'HD-2026/010',
    customer: 'Nhà máy Thực phẩm An Phú',
    title: 'Hợp đồng kiểm định cân điện tử và hiệu chuẩn tủ nhiệt',
    contractValue: 550_000_000,
    committedYears: 3,
    paymentTermDays: 30,
    creditLimit: 150_000_000,
    status: 'Active',
    tone: 'success',
    hint: 'Hiệu lực đến 2029',
  },
  {
    id: 'CT-04',
    contractCode: 'HD-2026/008',
    customer: 'Công ty Cổ phần Cơ khí Quang Minh',
    title: 'Bảo trì chuẩn và kiểm định thiết bị áp suất - lực',
    contractValue: 320_000_000,
    committedYears: 1,
    paymentTermDays: 15,
    creditLimit: 80_000_000,
    status: 'Approved',
    tone: 'info',
    hint: 'CEO đã duyệt · Chờ kế toán xác nhận phí đợt 1',
  },
];

export const expiringCustomerDevices = [
  {
    id: 'DEV-109',
    name: 'Máy hiện sóng 4 kênh',
    model: 'Tektronix MDO3024',
    serial: 'TEK-3024-7741',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    nextDueDate: addDays(12),
    isGroup2: false,
    serviceKind: 'Hiệu chuẩn',
    status: 'Sắp đến hạn',
    tone: 'warning',
  },
  {
    id: 'DEV-114',
    name: 'Công tơ điện tử 3 pha',
    model: 'Landis+Gyr E450',
    serial: 'LG-E450-56023',
    customer: 'Công ty Điện lực Đông Thành',
    nextDueDate: addDays(8),
    isGroup2: true,
    serviceKind: 'Kiểm định (Nhóm 2)',
    status: 'Bắt buộc kiểm định',
    tone: 'danger',
  },
  {
    id: 'DEV-120',
    name: 'Cân bàn điện tử 150kg',
    model: 'Mettler Toledo BBA231',
    serial: 'MT-BBA-88201',
    customer: 'Nhà máy Thực phẩm An Phú',
    nextDueDate: addDays(18),
    isGroup2: true,
    serviceKind: 'Kiểm định (Nhóm 2)',
    status: 'Sắp đến hạn',
    tone: 'warning',
  },
  {
    id: 'DEV-128',
    name: 'Đồng hồ vạn năng số 6.5 Digit',
    model: 'Fluke 8846A',
    serial: 'FLK-8846-9921',
    customer: 'Công ty Cổ phần Cơ khí Quang Minh',
    nextDueDate: addDays(-4),
    isGroup2: false,
    serviceKind: 'Hiệu chuẩn',
    status: 'Đã quá hạn',
    tone: 'danger',
  },
];

export const serviceFieldDistribution = [
  { label: 'Điện – Điện tử', value: 38, tone: 'info', displayValue: '38%' },
  { label: 'Khối lượng – Lực', value: 24, tone: 'success', displayValue: '24%' },
  { label: 'Độ dài – Dung tích', value: 16, tone: 'warning', displayValue: '16%' },
  { label: 'Nhiệt độ – Độ ẩm', value: 12, tone: 'info', displayValue: '12%' },
  { label: 'Áp suất & Khác', value: 10, tone: 'neutral', displayValue: '10%' },
];

export const quotationFunnel = [
  { label: 'Tạo báo giá (Draft)', value: 18, tone: 'neutral' },
  { label: 'Đã gửi khách (Sent)', value: 12, tone: 'warning' },
  { label: 'Khách duyệt (Approved)', value: 9, tone: 'info' },
  { label: 'Kích hoạt WorkOrder', value: 8, tone: 'success' },
];

export const salesNotifications = [
  {
    id: 'SN-01',
    icon: '✓',
    tone: 'success',
    text: 'Khách hàng Công ty Hoàn Vũ đã duyệt Báo giá QT-2026-052 trị giá 46.2 tr.',
    time: '25 phút trước',
  },
  {
    id: 'SN-02',
    icon: '✎',
    tone: 'info',
    text: 'CEO đã ký số phê duyệt Hợp đồng HD-2026/008 (Quang Minh). WorkOrder WO-018 tự động khởi tạo.',
    time: '2 giờ trước',
  },
  {
    id: 'SN-03',
    icon: '⚠',
    tone: 'warning',
    text: '4 thiết bị đo lường Nhóm 2 của Khách hàng Điện lực Đông Thành sắp quá hạn kiểm định pháp lý.',
    time: 'Hôm nay · 08:30',
  },
];
