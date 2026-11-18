const today = new Date();

const addDaysToISO = (days) => {
  const target = new Date(today);
  target.setDate(target.getDate() + days);
  return target.toISOString().slice(0, 10);
};

export const customerCompanyInfo = {
  id: 1,
  company_name: 'Công ty TNHH Thiết bị Minh Long',
  tax_code: '0312456789',
  industry: 'Sản xuất thiết bị điện – điện tử công nghiệp',
  address: 'Lô B12, Đường số 4, KCN Tân Bình, TP. Hồ Chí Minh',
  contact_person: 'Lê Thu Hà · Phòng QA/QC',
  contact_phone: '0988 234 567',
};

export const SERVICE_FIELDS = [
  { key: 'ALL', label: 'Tất cả lĩnh vực' },
  { key: 'DIEN', label: 'Điện – Điện tử' },
  { key: 'KHOILUONG', label: 'Khối lượng' },
  { key: 'NHIET', label: 'Nhiệt – Độ ẩm' },
  { key: 'APSUAT', label: 'Áp suất' },
];

export const availableCustomerServiceTypes = [
  {
    id: 1,
    name: 'Hiệu chuẩn đồng hồ vạn năng số',
    kind: 'Calibration',
    field: 'DIEN',
    field_label: 'Điện – Điện tử',
    standard_code: 'ĐLVN 142:2004',
    measuring_range: 'DC/AC 0 – 1000V, 0 – 10A',
    turnaround_days: '3–5 ngày',
    is_valid: true,
  },
  {
    id: 2,
    name: 'Hiệu chuẩn máy hiện sóng số (Oscilloscope)',
    kind: 'Calibration',
    field: 'DIEN',
    field_label: 'Điện – Điện tử',
    standard_code: 'ĐLVN 156:2005',
    measuring_range: 'Băng thông đến 500 MHz, 4 kênh',
    turnaround_days: '4–6 ngày',
    is_valid: true,
  },
  {
    id: 3,
    name: 'Kiểm định công tơ điện xoay chiều 3 pha',
    kind: 'Verification',
    field: 'DIEN',
    field_label: 'Điện – Điện tử',
    standard_code: 'ĐLVN 39:2012',
    measuring_range: '3×220/380V, cấp chính xác 0.5S – 1',
    turnaround_days: '3–5 ngày',
    is_valid: true,
  },
  {
    id: 4,
    name: 'Hiệu chuẩn cân bàn điện tử công nghiệp',
    kind: 'Calibration',
    field: 'KHOILUONG',
    field_label: 'Khối lượng',
    standard_code: 'ĐLVN 15:2009',
    measuring_range: '0 – 300 kg (cấp III)',
    turnaround_days: '2–4 ngày',
    is_valid: true,
  },
  {
    id: 5,
    name: 'Kiểm định cân bàn điện tử nhóm 2',
    kind: 'Verification',
    field: 'KHOILUONG',
    field_label: 'Khối lượng',
    standard_code: 'ĐLVN 14:2009',
    measuring_range: '0 – 300 kg (bắt buộc nhóm 2)',
    turnaround_days: '3–5 ngày',
    is_valid: true,
  },
  {
    id: 6,
    name: 'Hiệu chuẩn nhiệt ẩm kế điện tử',
    kind: 'Calibration',
    field: 'NHIET',
    field_label: 'Nhiệt – Độ ẩm',
    standard_code: 'ĐLVN 276:2015',
    measuring_range: '-20°C ÷ 70°C · 10% ÷ 95%RH',
    turnaround_days: '3–4 ngày',
    is_valid: true,
  },
  {
    id: 7,
    name: 'Kiểm định áp kế lò xo / áp kế vi sai',
    kind: 'Verification',
    field: 'APSUAT',
    field_label: 'Áp suất',
    standard_code: 'ĐLVN 08:2011',
    measuring_range: '0 – 250 bar',
    turnaround_days: '2–3 ngày',
    is_valid: true,
  },
];

export const initialCustomerDevices = [
  {
    id: 101,
    name: 'Máy hiện sóng số 4 kênh 200MHz',
    manufacturer: 'Tektronix',
    model: 'MDO3024',
    serial_number: 'TEK-3024-7741',
    internal_code: 'QC-OSC-01',
    is_group2: false,
    next_due_date: addDaysToISO(-12),
    recommended_field: 'DIEN',
    recommended_service_ids: [2],
  },
  {
    id: 102,
    name: 'Đồng hồ vạn năng chuẩn True-RMS',
    manufacturer: 'Fluke',
    model: '289',
    serial_number: 'FL-289-10482',
    internal_code: 'QC-DMM-04',
    is_group2: false,
    next_due_date: addDaysToISO(5),
    recommended_field: 'DIEN',
    recommended_service_ids: [1],
  },
  {
    id: 103,
    name: 'Cân bàn điện tử đóng gói 150kg',
    manufacturer: 'Mettler Toledo',
    model: 'BBA231',
    serial_number: 'MT-BBA-88201',
    internal_code: 'WH-SCL-02',
    is_group2: true,
    next_due_date: addDaysToISO(14),
    recommended_field: 'KHOILUONG',
    recommended_service_ids: [4, 5],
  },
  {
    id: 104,
    name: 'Công tơ điện xoay chiều 3 pha tổng',
    manufacturer: 'Landis+Gyr',
    model: 'E450',
    serial_number: 'LG-E450-56023',
    internal_code: 'FAC-EM-01',
    is_group2: true,
    next_due_date: addDaysToISO(-28),
    recommended_field: 'DIEN',
    recommended_service_ids: [3],
  },
  {
    id: 105,
    name: 'Nhiệt ẩm kế phòng sạch SMT',
    manufacturer: 'Testo',
    model: '608-H2',
    serial_number: 'TS-608-39017',
    internal_code: 'SMT-TH-09',
    is_group2: false,
    next_due_date: addDaysToISO(65),
    recommended_field: 'NHIET',
    recommended_service_ids: [6],
  },
  {
    id: 106,
    name: 'Đồng hồ đo áp suất đường khí nén',
    manufacturer: 'WIKA',
    model: '232.50',
    serial_number: 'WK-232-9912',
    internal_code: 'UTL-PR-03',
    is_group2: true,
    next_due_date: addDaysToISO(22),
    recommended_field: 'APSUAT',
    recommended_service_ids: [7],
  },
];

/**
 * Tính toán tình trạng hạn hiệu chuẩn của thiết bị để hỗ trợ khách hàng ưu tiên chọn nhanh
 */
export const evaluateDeviceDueState = (nextDueDate) => {
  if (!nextDueDate) {
    return { code: 'NONE', label: 'Chưa có lịch hẹn', daysLeft: null, isUrgent: false };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(`${nextDueDate}T00:00:00`);
  const diffDays = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      code: 'OVERDUE',
      label: `Quá hạn ${Math.abs(diffDays)} ngày`,
      daysLeft: diffDays,
      isUrgent: true,
    };
  }
  if (diffDays <= 30) {
    return {
      code: 'DUE_SOON',
      label: diffDays === 0 ? 'Đến hạn hôm nay' : `Còn ${diffDays} ngày`,
      daysLeft: diffDays,
      isUrgent: true,
    };
  }
  return {
    code: 'VALID',
    label: `Còn ${diffDays} ngày`,
    daysLeft: diffDays,
    isUrgent: false,
  };
};

