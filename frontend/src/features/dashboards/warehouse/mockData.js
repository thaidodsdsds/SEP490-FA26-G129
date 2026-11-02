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

export const warehouseProfile = {
  name: 'Trần Văn Khoa',
  code: 'WH-02',
  role: 'Nhân viên Kho vận (Warehouse Staff)',
  warehouseName: 'Kho Thiết bị Đo lường Kỹ thuật — ISOCAL Trung tâm',
  location: 'Khu Kỹ thuật & Đo kiểm — Tầng 1, Nhà B',
  totalSlots: 160,
  occupiedSlots: 118,
  phone: '0912 345 678',
};

export const warehouseKpis = [
  {
    key: 'inStock',
    icon: '▣',
    tone: 'info',
    label: 'Thiết bị đang lưu kho',
    value: '38',
    hint: '42 vị trí kệ đang trống',
    hintTone: 'info',
  },
  {
    key: 'todayInbound',
    icon: '↓',
    tone: 'success',
    label: 'Phiếu nhập kho hôm nay',
    value: '9',
    hint: 'Đã hoàn tất kiểm tra ngoại quan ban đầu',
    hintTone: 'success',
  },
  {
    key: 'readyToReturn',
    icon: '↑',
    tone: 'warning',
    label: 'Sẵn sàng xuất trả khách',
    value: '12',
    hint: 'Đã có Giấy chứng nhận & dán Tem Seal',
    hintTone: 'warning',
  },
  {
    key: 'overdueStorage',
    icon: '⚠',
    tone: 'danger',
    label: 'Lưu kho quá hạn (> 7 ngày)',
    value: '2',
    hint: 'Cần liên hệ khách hàng đến nhận',
    hintTone: 'danger',
  },
];

export const recentWarehouseTransactions = [
  {
    id: 'TX-2026-118',
    type: 'Inbound',
    typeLabel: 'Nhập kho',
    device: 'Máy hiện sóng số 4 kênh',
    model: 'Tektronix MDO3024',
    serial: 'TEK-3024-7741',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    serviceRequestRef: 'SR-2026-088',
    conditionNote: 'Ngoại quan nguyên vẹn, đi kèm 2 que đo P6139B và cáp nguồn tiêu chuẩn.',
    photoUrl: '/storage/warehouse/receipt-118.jpg',
    handledBy: 'Trần Văn Khoa',
    transactionAt: `${addDays(0)} · 09:15`,
    tone: 'info',
  },
  {
    id: 'TX-2026-117',
    type: 'Inbound',
    typeLabel: 'Nhập kho',
    device: 'Cân phân tích điện tử 4 số lẻ',
    model: 'Sartorius Entris II',
    serial: 'SAR-224I-3301',
    customer: 'Công ty Dược phẩm TW1 - Pharbaco',
    serviceRequestRef: 'SR-2026-086',
    conditionNote: 'Lồng kính chắn gió bị rạn góc phải phía trên; khách hàng đã xác nhận biên bản tình trạng vật lý ban đầu.',
    photoUrl: '/storage/warehouse/receipt-117.jpg',
    handledBy: 'Trần Văn Khoa',
    transactionAt: `${addDays(0)} · 08:30`,
    tone: 'warning',
  },
  {
    id: 'TX-2026-116',
    type: 'Outbound',
    typeLabel: 'Xuất kho',
    device: 'Đồng hồ vạn năng số 6.5 Digit',
    model: 'Keysight 34461A',
    serial: 'KEY-34461-8812',
    customer: 'Nhà máy Điện tử SamVina',
    serviceRequestRef: 'SR-2026-079',
    conditionNote: 'Đã dán tem kiểm định ISOCAL-KD-0824, kèm Giấy chứng nhận bản cứng và biên bản bàn giao thiết bị.',
    photoUrl: '/storage/warehouse/delivery-116.jpg',
    handledBy: 'Trần Văn Khoa',
    transactionAt: `${addDays(-1)} · 16:40`,
    tone: 'success',
  },
  {
    id: 'TX-2026-115',
    type: 'Inbound',
    typeLabel: 'Nhập kho',
    device: 'Áp kế số áp suất cao',
    model: 'Fluke 700G31',
    serial: 'FLK-700G-4412',
    customer: 'Công ty CP Nhựa Rạng Đông',
    serviceRequestRef: 'SR-2026-082',
    conditionNote: 'Máy có vết trầy nhẹ ở mặt bảo vệ màn hình, hoạt động bật nguồn tốt.',
    photoUrl: '/storage/warehouse/receipt-115.jpg',
    handledBy: 'Trần Văn Khoa',
    transactionAt: `${addDays(-1)} · 14:10`,
    tone: 'info',
  },
  {
    id: 'TX-2026-114',
    type: 'Outbound',
    typeLabel: 'Xuất kho',
    device: 'Nhiệt ẩm kế tự ghi đa kênh',
    model: 'Testo 175-H1',
    serial: 'TST-175-9921',
    customer: 'Tập đoàn Dệt may Việt Long',
    serviceRequestRef: 'SR-2026-074',
    conditionNote: 'Bàn giao thiết bị cho đơn vị chuyển phát nhanh Viettel Post theo yêu cầu của khách hàng.',
    photoUrl: '/storage/warehouse/delivery-114.jpg',
    handledBy: 'Trần Văn Khoa',
    transactionAt: `${addDays(-2)} · 10:20`,
    tone: 'success',
  },
];

export const readyToReturnDevices = [
  {
    id: 'RT-01',
    device: 'Máy phân tích phổ tần số',
    model: 'Rohde & Schwarz FPH',
    serial: 'RS-FPH-1092',
    customer: 'Tập đoàn Viễn thông Viettel',
    certificateNo: 'ISOCAL-CERT-2026-0419',
    sealCode: 'SEAL-2026-9021',
    shelfLocation: 'Kệ A2 · Hàng 3 · Vị trí 12',
    status: 'Hoàn tất đo kiểm',
    paymentStatus: 'Đã thanh toán',
    daysInWarehouse: 2,
    tone: 'success',
  },
  {
    id: 'RT-02',
    device: 'Bộ chuẩn nguồn đo đa năng',
    model: 'Fluke 5502A',
    serial: 'FLK-5502-3310',
    customer: 'Công ty Cổ phần Cơ khí Quang Minh',
    certificateNo: 'ISOCAL-CERT-2026-0412',
    sealCode: 'SEAL-2026-9014',
    shelfLocation: 'Kệ B1 · Hàng 1 · Vị trí 04',
    status: 'Hoàn tất đo kiểm',
    paymentStatus: 'Chờ thanh toán',
    daysInWarehouse: 3,
    tone: 'warning',
  },
  {
    id: 'RT-03',
    device: 'Thước cặp điện tử 0–300mm',
    model: 'Mitutoyo 500-197-30',
    serial: 'MIT-500-7712',
    customer: 'Công ty TNHH Chế tạo Cơ khí Nam Phát',
    certificateNo: 'ISOCAL-CERT-2026-0408',
    sealCode: 'SEAL-2026-8998',
    shelfLocation: 'Kệ C3 · Hàng 2 · Vị trí 08',
    status: 'Hoàn tất đo kiểm',
    paymentStatus: 'Đã thanh toán',
    daysInWarehouse: 8,
    tone: 'danger',
    overdueNotice: 'Đã thông báo lần 2 · Quá 7 ngày',
  },
  {
    id: 'RT-04',
    device: 'Công tơ điện 3 pha công nghiệp',
    model: 'Landis+Gyr E450',
    serial: 'LG-E450-56023',
    customer: 'Công ty Điện lực Đông Thành',
    certificateNo: 'ISOCAL-CERT-2026-0399',
    sealCode: 'SEAL-2026-8977',
    shelfLocation: 'Kệ A1 · Hàng 2 · Vị trí 06',
    status: 'Hoàn tất kiểm định',
    paymentStatus: 'Đã thanh toán',
    daysInWarehouse: 1,
    tone: 'success',
  },
];

export const pendingLabTransfer = [
  {
    id: 'PL-01',
    device: 'Lực kế điện tử 50kN',
    model: 'Shimadzu AGS-X',
    serial: 'SHM-AGS-5521',
    customer: 'Công ty Nhựa Rạng Đông',
    inboundTime: 'Hôm nay · 08:45',
    assignedTech: 'Lê Thu Hà',
    serviceKind: 'Hiệu chuẩn (KHOILUONG)',
    initialCondition: 'Đạt kiểm tra ban đầu · Không trầy xước',
    shelfLocation: 'Khu chờ Lab · Bàn tiếp nhận 2',
    tone: 'info',
  },
  {
    id: 'PL-02',
    device: 'Máy đo nồng độ khí đa chỉ tiêu',
    model: 'Riken Keiki GX-2009',
    serial: 'RK-GX-8831',
    customer: 'Nhà máy Hóa chất Miền Bắc',
    inboundTime: 'Hôm nay · 09:30',
    assignedTech: 'Nguyễn Minh Quân',
    serviceKind: 'Hiệu chuẩn (HOA)',
    initialCondition: 'Đầy đủ ống lấy mẫu và sạc pin',
    shelfLocation: 'Khu chờ Lab · Bàn tiếp nhận 1',
    tone: 'info',
  },
];

export const warehouseStatusDistribution = [
  { label: 'Chờ chuyển vào Lab', value: 8, tone: 'neutral' },
  { label: 'Đang đo kiểm tại Lab', value: 16, tone: 'info' },
  { label: 'Đã xong chờ xuất trả', value: 12, tone: 'success' },
  { label: 'Lưu kho quá hạn (>7 ngày)', value: 2, tone: 'danger' },
];

export const weeklyThroughput = [
  { label: 'Thứ 2', value: 14, displayValue: '14 lượt' },
  { label: 'Thứ 3', value: 18, displayValue: '18 lượt' },
  { label: 'Thứ 4', value: 12, displayValue: '12 lượt' },
  { label: 'Thứ 5', value: 22, displayValue: '22 lượt' },
  { label: 'Thứ 6', value: 16, displayValue: '16 lượt' },
  { label: 'Thứ 7', value: 9, displayValue: '9 lượt' },
  { label: 'CN', value: 0, displayValue: 'Nghỉ' },
];

export const warehouseNotifications = [
  {
    id: 'WN-01',
    icon: '⚠',
    tone: 'danger',
    text: 'Cảnh báo: Thiết bị Thước cặp Mitutoyo (Cty Nam Phát) đã lưu kho 8 ngày sau hiệu chuẩn. Cần gửi email nhắc lấy.',
    time: '35 phút trước',
  },
  {
    id: 'WN-02',
    icon: '✓',
    tone: 'success',
    text: 'Phòng Lab đã bàn giao 4 thiết bị kèm Certificate & Seal ra khu vực chờ xuất trả khách.',
    time: '1 giờ trước',
  },
  {
    id: 'WN-03',
    icon: '↓',
    tone: 'info',
    text: 'Tiếp nhận kiện hàng In-lab mới từ Đơn vị Vận chuyển (SR-2026-089) gồm 3 thiết bị điện tử.',
    time: 'Hôm nay · 09:40',
  },
];
