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

export const adminProfile = {
  updatedAt: addDays(0),
  updatedTime: '09:30',
  accountCount: 86,
  activeAccountCount: 79,
  lockedAccountCount: 7,
  customerCount: 34,
  roleCount: 8,
  alertCount: 3,
};

export const adminKpis = [
  {
    key: 'accounts',
    icon: '◉',
    tone: 'info',
    label: 'Tổng tài khoản',
    value: '86',
    hint: '79 hoạt động · 7 bị khóa',
  },
  {
    key: 'customers',
    icon: '◎',
    tone: 'success',
    label: 'Khách hàng doanh nghiệp',
    value: '34',
    hint: '+3 trong tháng 10',
    hintTone: 'success',
  },
  {
    key: 'orders',
    icon: '⌁',
    tone: 'warning',
    label: 'Đơn dịch vụ đang xử lý',
    value: '26',
    hint: '7 đơn chờ phân công',
  },
  {
    key: 'alerts',
    icon: '!',
    tone: 'danger',
    label: 'Cảnh báo cần xử lý',
    value: '3',
    hint: '2 chuẩn sắp hết hạn · 1 webhook lỗi',
    hintTone: 'danger',
  },
];

export const roleSummary = [
  {
    role: 'Quản trị hệ thống',
    code: 'Admin',
    accounts: 3,
    scope: 'Toàn hệ thống',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Kế toán',
    code: 'Accountant',
    accounts: 4,
    scope: 'Tài chính & công nợ',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Kinh doanh',
    code: 'Sales',
    accounts: 8,
    scope: 'Khách hàng & báo giá',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Kỹ thuật viên',
    code: 'Technician',
    accounts: 14,
    scope: 'Công việc kỹ thuật',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Soát xét',
    code: 'Reviewer',
    accounts: 4,
    scope: 'Phê duyệt hồ sơ',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Ký số',
    code: 'Signatory',
    accounts: 2,
    scope: 'Chứng nhận & hợp đồng',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Kho',
    code: 'Warehouse',
    accounts: 3,
    scope: 'Vật tư & tem',
    status: 'Hoạt động',
    tone: 'success',
  },
  {
    role: 'Khách hàng',
    code: 'Customer',
    accounts: 48,
    scope: 'Phạm vi công ty',
    status: 'Hoạt động',
    tone: 'success',
  },
];

export const recentLogins = [
  {
    id: 'login-1',
    name: 'Nguyễn Minh Quân',
    email: 'quan.nm@isocal.vn',
    role: 'Kỹ thuật viên',
    date: addDays(0),
    time: '09:42',
    client: 'Chrome · 10.10.2.18',
    status: 'Thành công',
    tone: 'success',
  },
  {
    id: 'login-2',
    name: 'Trần Thu Hà',
    email: 'ha.tt@isocal.vn',
    role: 'Kế toán',
    date: addDays(0),
    time: '09:35',
    client: 'Edge · 10.10.1.42',
    status: 'Thành công',
    tone: 'success',
  },
  {
    id: 'login-3',
    name: 'Lê Hoàng Nam',
    email: 'nam.lh@isocal.vn',
    role: 'Kinh doanh',
    date: addDays(0),
    time: '09:12',
    client: 'Chrome · 10.10.3.7',
    status: 'Thành công',
    tone: 'success',
  },
  {
    id: 'login-4',
    name: 'Phạm Thanh Mai',
    email: 'mai.pt@isocal.vn',
    role: 'Quản trị hệ thống',
    date: addDays(0),
    time: '08:58',
    client: 'Firefox · 10.10.0.5',
    status: 'Thành công',
    tone: 'success',
  },
  {
    id: 'login-5',
    name: 'Đỗ Văn Bình',
    email: 'binh.dv@isocal.vn',
    role: 'Kỹ thuật viên',
    date: addDays(0),
    time: '08:41',
    client: 'Chrome · 10.10.4.22',
    status: 'Thất bại',
    tone: 'danger',
  },
  {
    id: 'login-6',
    name: 'Nguyễn Thu Hằng',
    email: 'hang.nt@minhlong.vn',
    role: 'Khách hàng',
    date: addDays(0),
    time: '08:30',
    client: 'Safari · 113.161.42.8',
    status: 'Thành công',
    tone: 'success',
  },
];

export const activityLog = [
  {
    id: 'act-1',
    icon: '↻',
    tone: 'info',
    text: 'Nguyễn Minh Quân cập nhật kết quả đo cho hồ sơ CR-2026-058.',
    time: '09:42',
  },
  {
    id: 'act-2',
    icon: '✓',
    tone: 'success',
    text: 'Trần Thu Hà xác nhận thanh toán GD-2026-0341.',
    time: '09:30',
  },
  {
    id: 'act-3',
    icon: '+',
    tone: 'info',
    text: 'Phạm Thanh Mai tạo tài khoản nội bộ cho nhân sự mới.',
    time: '09:15',
  },
  {
    id: 'act-4',
    icon: '⤓',
    tone: 'success',
    text: 'Hệ thống sao lưu cơ sở dữ liệu thành công.',
    time: '08:55',
  },
  {
    id: 'act-5',
    icon: '!',
    tone: 'danger',
    text: 'Webhook VNPay trả về lỗi xác thực chữ ký.',
    time: '08:40',
  },
  {
    id: 'act-6',
    icon: '◎',
    tone: 'info',
    text: 'Lê Hoàng Nam gửi báo giá BG-2026-092 cho khách hàng.',
    time: '08:22',
  },
];

export const systemHealth = [
  {
    label: 'API nghiệp vụ',
    detail: '99,98% uptime · phản hồi 120 ms',
    status: 'Ổn định',
    tone: 'success',
  },
  {
    label: 'Cơ sở dữ liệu',
    detail: 'Kết nối bình thường · 12 ms',
    status: 'Ổn định',
    tone: 'success',
  },
  {
    label: 'Sao lưu gần nhất',
    detail: 'Hôm nay · 02:00',
    status: 'Thành công',
    tone: 'success',
  },
  {
    label: 'Email & thông báo',
    detail: 'Không có hàng đợi lỗi',
    status: 'Ổn định',
    tone: 'success',
  },
  {
    label: 'Lưu trữ hồ sơ',
    detail: 'Dung lượng 68% · còn 32%',
    status: 'Ổn định',
    tone: 'success',
  },
  {
    label: 'Webhook thanh toán',
    detail: '1 giao dịch lỗi xác thực chữ ký',
    status: 'Cần xem',
    tone: 'warning',
  },
  {
    label: 'Danh mục & quy trình',
    detail: '2 chuẩn sắp hết hạn · 18 dịch vụ · 27 quy trình',
    status: 'Cần xem',
    tone: 'warning',
  },
  {
    label: 'Chứng thư số',
    detail: 'Hiệu lực đến 12/12/2027',
    status: 'Hoạt động',
    tone: 'success',
  },
];
