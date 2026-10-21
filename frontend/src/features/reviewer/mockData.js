export const serviceTypes = [
  { id: 'ST-001', name: 'Đồng hồ vạn năng', kind: 'Hiệu chuẩn', field: 'Điện – Điện tử – Tần số', standardCode: 'ISOCAL-HC-DIEN-01', status: 'Active', procedures: 2 },
  { id: 'ST-002', name: 'Máy hiện sóng', kind: 'Hiệu chuẩn', field: 'Điện – Điện tử – Tần số', standardCode: 'ISOCAL-HC-DIEN-02', status: 'Active', procedures: 2 },
  { id: 'ST-003', name: 'Công tơ điện', kind: 'Kiểm định', field: 'Điện – Điện tử – Tần số', standardCode: 'ISOCAL-KD-DIEN-05', status: 'Active', procedures: 1 },
  { id: 'ST-004', name: 'Cân bàn điện tử', kind: 'Hiệu chuẩn', field: 'Khối lượng – Lực', standardCode: 'ISOCAL-HC-KHOILUONG-02', status: 'Active', procedures: 1 },
  { id: 'ST-005', name: 'Nhiệt ẩm kế', kind: 'Hiệu chuẩn', field: 'Nhiệt độ – Độ ẩm', standardCode: 'ISOCAL-HC-NHIET-01', status: 'Inactive', procedures: 0 },
];

export const initialProcedures = [
  {
    id: 'PR-001',
    serviceType: 'Đồng hồ vạn năng',
    code: 'ISOCAL-HC-DIEN-01',
    version: 'V1.0',
    effectiveFrom: '2026-06-01',
    status: 'Active',
    environment: '20–26 °C; RH 30–70 %',
    requiredEquipment: 'Calibrator Fluke 5522A',
    steps: [
      { no: 1, instruction: 'Kiểm tra ngoại quan và thông tin thiết bị', evidence: false },
      { no: 2, instruction: 'Ổn định thiết bị và ghi nhận môi trường', evidence: false },
      { no: 3, instruction: 'Đo điện áp DC tại các điểm kiểm tra', evidence: true },
    ],
    parameters: [
      { name: 'Điện áp DC', unit: 'V', repeat: 3, method: 'mean', points: 3 },
    ],
  },
  {
    id: 'PR-002',
    serviceType: 'Máy hiện sóng',
    code: 'ISOCAL-HC-DIEN-02',
    version: 'V1.1',
    effectiveFrom: '2026-09-15',
    status: 'Active',
    environment: '20–26 °C; RH 30–70 %',
    requiredEquipment: 'Calibrator Fluke 5522A',
    steps: [
      { no: 1, instruction: 'Kiểm tra ngoại quan và đầu đo', evidence: false },
      { no: 2, instruction: 'Cài đặt thiết bị theo quy trình', evidence: false },
      { no: 3, instruction: 'Kiểm tra độ chính xác biên độ', evidence: true },
    ],
    parameters: [
      { name: 'Biên độ Vpp', unit: 'V', repeat: 3, method: 'mean', points: 4 },
      { name: 'Thời gian cơ sở', unit: 'ms', repeat: 3, method: 'mean', points: 3 },
    ],
  },
  {
    id: 'PR-003',
    serviceType: 'Công tơ điện',
    code: 'ISOCAL-KD-DIEN-05',
    version: 'V1.0',
    effectiveFrom: '2026-07-01',
    status: 'Active',
    environment: '20–26 °C; RH 30–70 %',
    requiredEquipment: 'Bộ tải chuẩn công tơ',
    steps: [
      { no: 1, instruction: 'Kiểm tra tình trạng và thông tin công tơ', evidence: false },
      { no: 2, instruction: 'Kiểm tra khởi động và chế độ đo', evidence: false },
      { no: 3, instruction: 'Đo sai số tại các mức tải kiểm định', evidence: true },
    ],
    parameters: [
      { name: 'Sai số tại các mức tải', unit: '%', repeat: 3, method: 'mean', points: 3 },
    ],
  },
  {
    id: 'PR-004',
    serviceType: 'Cân bàn điện tử',
    code: 'ISOCAL-HC-KHOILUONG-02',
    version: 'V1.0',
    effectiveFrom: '2026-05-20',
    status: 'Draft',
    environment: '18–28 °C; mặt đặt cân bằng',
    requiredEquipment: 'Bộ quả cân chuẩn F2',
    steps: [
      { no: 1, instruction: 'Kiểm tra vị trí lắp đặt và tình trạng cân', evidence: false },
      { no: 2, instruction: 'Kiểm tra điểm 0 và độ lặp lại', evidence: true },
    ],
    parameters: [
      { name: 'Sai số chỉ thị', unit: 'kg', repeat: 3, method: 'mean', points: 5 },
    ],
  },
  {
    id: 'PR-005',
    serviceType: 'Đồng hồ vạn năng',
    code: 'ISOCAL-HC-DIEN-01',
    version: 'V0.9',
    effectiveFrom: '2025-11-01',
    status: 'Obsolete',
    environment: '20–26 °C; RH 30–70 %',
    requiredEquipment: 'Calibrator Fluke 5522A',
    steps: [{ no: 1, instruction: 'Quy trình phiên bản cũ', evidence: false }],
    parameters: [{ name: 'Điện áp DC', unit: 'V', repeat: 3, method: 'mean', points: 2 }],
  },
];

export const initialReviewRecords = [
  {
    id: 'CR-2026-041',
    workOrder: 'WO-2026-014',
    device: 'Máy hiện sóng · Tektronix MDO3024',
    serial: 'TEK-3024-7741',
    customer: 'Công ty TNHH Thiết bị Minh Long',
    service: 'Hiệu chuẩn biên độ và thời gian',
    type: 'Hiệu chuẩn',
    procedure: 'ISOCAL-HC-DIEN-02 · V1.1',
    technician: 'Nguyễn Minh Quân',
    submittedAt: '21/10/2026 · 10:15',
    environment: '23.1 °C · 48 %RH',
    environmentStatus: 'Đạt yêu cầu',
    standard: 'Calibrator Fluke 5522A',
    status: 'Pending',
    measurements: [
      { point: '1 Vpp · 1 kHz', reference: '1.000 V', measured: '0.998 V', deviation: '-0.002 V', uncertainty: '0.006 V', result: 'Đạt' },
      { point: '5 Vpp · 1 kHz', reference: '5.000 V', measured: '5.024 V', deviation: '+0.024 V', uncertainty: '0.012 V', result: 'Đạt' },
    ],
  },
  {
    id: 'CR-2026-039',
    workOrder: 'WO-2026-015',
    device: 'Công tơ điện 3 pha · Landis+Gyr E450',
    serial: 'LG-E450-56023',
    customer: 'Công ty Điện lực Đông Thành',
    service: 'Kiểm định công tơ điện',
    type: 'Kiểm định',
    procedure: 'ISOCAL-KD-DIEN-05 · V1.0',
    technician: 'Nguyễn Minh Quân',
    submittedAt: '21/10/2026 · 09:42',
    environment: '24.0 °C · 52 %RH',
    environmentStatus: 'Đạt yêu cầu',
    standard: 'Bộ tải chuẩn công tơ',
    status: 'Pending',
    measurements: [
      { point: '5 A · cosφ=1', reference: '0.000 %', measured: '+0.42 %', deviation: '+0.42 %', uncertainty: '0.20 %', result: 'Đạt' },
      { point: '20 A · cosφ=1', reference: '0.000 %', measured: '+1.24 %', deviation: '+1.24 %', uncertainty: '0.22 %', result: 'Không đạt' },
    ],
  },
  {
    id: 'CR-2026-035',
    workOrder: 'WO-2026-012',
    device: 'Cân bàn điện tử · Mettler Toledo BBA231',
    serial: 'MT-BBA-88201',
    customer: 'Nhà máy Thực phẩm An Phú',
    service: 'Hiệu chuẩn khối lượng',
    type: 'Hiệu chuẩn',
    procedure: 'ISOCAL-HC-KHOILUONG-02 · V1.0',
    technician: 'Lê Thu Hà',
    submittedAt: '20/10/2026 · 16:20',
    environment: '27.5 °C · Mặt đặt cân cân bằng',
    environmentStatus: 'Cần xác minh',
    standard: 'Bộ quả cân chuẩn F2',
    status: 'Pending',
    measurements: [
      { point: '10 kg', reference: '10.000 kg', measured: '10.012 kg', deviation: '+0.012 kg', uncertainty: '0.004 kg', result: 'Trong dung sai' },
      { point: '50 kg', reference: '50.000 kg', measured: '50.031 kg', deviation: '+0.031 kg', uncertainty: '0.010 kg', result: 'Trong dung sai' },
    ],
  },
];

export const masterStandards = [
  { id: 'MS-001', name: 'Calibrator Fluke 5522A', serial: '5522A-781240', accuracy: 'Class 0.01', expiry: '2027-04-18', status: 'Active', field: 'Điện – Điện tử' },
  { id: 'MS-002', name: 'Bộ quả cân chuẩn F2', serial: 'F2-SET-2024-09', accuracy: 'F2', expiry: '2026-11-02', status: 'Active', field: 'Khối lượng – Lực' },
  { id: 'MS-003', name: 'Buồng nhiệt ẩm ESPEC', serial: 'SH-262-1190', accuracy: '±0.3 °C', expiry: '2026-10-25', status: 'Active', field: 'Nhiệt độ – Độ ẩm' },
  { id: 'MS-004', name: 'Bộ tải chuẩn công tơ', serial: 'MTE-S3-9033', accuracy: 'Class 0.05', expiry: '2026-10-20', status: 'Expired', field: 'Điện – Điện tử' },
];

export const certificates = [
  { id: 'CERT-2026-033', record: 'CR-2026-033', device: 'Đồng hồ vạn năng · Fluke 289', customer: 'Công ty TNHH Thiết bị Minh Long', service: 'Hiệu chuẩn', procedure: 'ISOCAL-HC-DIEN-01 · V1.0', status: 'PendingPayment', issuedAt: '20/10/2026' },
  { id: 'CERT-2026-031', record: 'CR-2026-031', device: 'Nhiệt ẩm kế · Testo 608-H2', customer: 'Trung tâm Y tế Đông Thành', service: 'Hiệu chuẩn', procedure: 'ISOCAL-HC-NHIET-01 · V1.2', status: 'Released', issuedAt: '18/10/2026' },
  { id: 'CERT-2026-028', record: 'CR-2026-028', device: 'Công tơ điện · Landis+Gyr E450', customer: 'Công ty Điện lực Đông Thành', service: 'Kiểm định', procedure: 'ISOCAL-KD-DIEN-05 · V1.0', status: 'Released', issuedAt: '15/10/2026' },
];

export const seals = [
  { id: 'SEAL-2026-033', code: 'ISO-26-D1F8A2', device: 'Đồng hồ vạn năng · Fluke 289', serial: 'FL-289-10482', certificate: 'CERT-2026-033', calDate: '20/10/2026', dueDate: '20/10/2027', status: 'PendingPayment' },
  { id: 'SEAL-2026-031', code: 'ISO-26-A7B302', device: 'Nhiệt ẩm kế · Testo 608-H2', serial: 'TS-608-39017', certificate: 'CERT-2026-031', calDate: '18/10/2026', dueDate: '18/10/2027', status: 'Active' },
  { id: 'SEAL-2026-028', code: 'ISO-26-9E110C', device: 'Công tơ điện · Landis+Gyr E450', serial: 'LG-E450-56023', certificate: 'CERT-2026-028', calDate: '15/10/2026', dueDate: '15/10/2027', status: 'Revoked' },
  { id: 'SEAL-2025-104', code: 'ISO-25-11DA09', device: 'Cân bàn điện tử · Mettler Toledo', serial: 'MT-BBA-88201', certificate: 'CERT-2025-104', calDate: '12/10/2025', dueDate: '12/10/2026', status: 'Expired' },
];

export const sealVerificationLogs = [
  { id: 1, code: 'ISO-26-A7B302', result: 'Valid', verifiedAt: '21/10/2026 · 11:02', sourceIp: '203.0.113.24' },
  { id: 2, code: 'ISO-26-9E110C', result: 'Revoked', verifiedAt: '21/10/2026 · 10:48', sourceIp: '198.51.100.17' },
  { id: 3, code: 'ISO-25-11DA09', result: 'Expired', verifiedAt: '21/10/2026 · 09:20', sourceIp: '203.0.113.46' },
  { id: 4, code: 'ISO-26-A7B302', result: 'Valid', verifiedAt: '20/10/2026 · 16:32', sourceIp: '192.0.2.63' },
];

export const digitalSignatures = [
  { id: 'DS-109', purpose: 'CertificateRelease', reference: 'CERT-2026-033', signer: 'Trần Đức Long', hash: '7a8b...c21f', transaction: 'VNPT-DS-20261020-109', status: 'Signed', signedAt: '20/10/2026 · 15:12' },
  { id: 'DS-108', purpose: 'MeasurementSign', reference: 'CR-2026-041', signer: 'Nguyễn Minh Quân', hash: 'd23e...1a90', transaction: 'VNPT-DS-20261021-108', status: 'Signed', signedAt: '21/10/2026 · 10:14' },
  { id: 'DS-107', purpose: 'SealRevocation', reference: 'SEAL-2026-028', signer: 'Trần Đức Long', hash: '10fa...8b46', transaction: 'VNPT-DS-20261019-107', status: 'Signed', signedAt: '19/10/2026 · 16:05' },
  { id: 'DS-106', purpose: 'ContractApproval', reference: 'HD-2026/018', signer: 'Trần Đức Long', hash: '98bb...f621', transaction: 'VNPT-DS-20261018-106', status: 'Failed', signedAt: '—' },
];

export const chats = [
  { id: 'CHAT-042', subject: 'Sai số tại điểm tải 20 A', customer: 'Công ty Điện lực Đông Thành', type: 'CalibrationDispute', participants: 'Reviewer, Nguyễn Minh Quân', unread: 2, latest: 'Cần kiểm tra lại độ ổn định tải trước khi kết luận.' },
  { id: 'CHAT-039', subject: 'Bổ sung ảnh tình trạng thiết bị', customer: 'Nhà máy Thực phẩm An Phú', type: 'ServiceRequestDiscussion', participants: 'Reviewer, Sales, Khách hàng', unread: 0, latest: 'Khách hàng đã gửi ảnh bổ sung.' },
  { id: 'CHAT-031', subject: 'Trao đổi hỗ trợ hồ sơ', customer: 'Trung tâm Y tế Đông Thành', type: 'CustomerSupport', participants: 'Reviewer, Khách hàng', unread: 1, latest: 'Xin cho biết thời gian phát hành chứng chỉ.' },
];

export const notifications = [
  { id: 'NT-301', type: 'Review', title: 'Có 3 hồ sơ đo đang chờ soát xét', time: '5 phút trước', read: false },
  { id: 'NT-300', type: 'Procedure', title: 'Quy trình cân bàn V1.0 chờ phát hành', time: '34 phút trước', read: false },
  { id: 'NT-298', type: 'DueDate', title: 'Chuẩn Fluke 5522A sắp đến hạn hiệu chuẩn', time: 'Hôm nay, 08:00', read: true },
];

export const warehouseTransactions = [
  { id: 'WH-2031', type: 'Inbound', device: 'Đồng hồ vạn năng · Fluke 289', serial: 'FL-289-10482', workOrder: 'WO-2026-014', condition: 'Vỏ nguyên vẹn, đủ phụ kiện', handledBy: 'Phạm Quốc Bảo', time: '21/10/2026 · 08:42' },
  { id: 'WH-2028', type: 'Outbound', device: 'Nhiệt ẩm kế · Testo 608-H2', serial: 'TS-608-39017', workOrder: 'WO-2026-010', condition: 'Đã bàn giao, có biên bản', handledBy: 'Phạm Quốc Bảo', time: '20/10/2026 · 16:10' },
];
