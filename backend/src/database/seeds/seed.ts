import bcrypt from 'bcryptjs';
import dataSource from '../dataSource.js';

type QueryFn = (sql: string, parameters?: unknown[]) => Promise<unknown>;
type Row = Record<string, unknown>;

const DAY_MS = 86_400_000;

const dayOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

const todayAt = (hour: number): Date => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
};

const quarterStart = (): Date => {
  const date = new Date();
  date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
  date.setHours(12, 0, 0, 0);
  return date;
};

const reviewedThisQuarter = (daysBack: number): Date =>
  new Date(Math.max(Date.now() - daysBack * DAY_MS, quarterStart().getTime() + DAY_MS));

const makeInserter =
  (query: QueryFn) =>
  async (
    table: string,
    columns: readonly string[],
    rows: readonly Row[],
    conflictColumns: readonly string[] = ['id'],
  ): Promise<void> => {
    if (rows.length === 0) return;

    const values: unknown[] = [];
    const placeholders = rows
      .map(
        (row) =>
          `(${columns
            .map((column) => {
              values.push(row[column] ?? null);
              return `$${values.length}`;
            })
            .join(', ')})`,
      )
      .join(',\n');

    const escapedColumns = columns.map((column) => `"${column}"`).join(', ');
    const escapedConflict = conflictColumns.map((column) => `"${column}"`).join(', ');
    const updates = columns
      .filter((column) => column !== 'id' && !conflictColumns.includes(column))
      .map((column) => `"${column}" = EXCLUDED."${column}"`)
      .join(', ');

    const conflictClause = updates
      ? `ON CONFLICT (${escapedConflict}) DO UPDATE SET ${updates}`
      : `ON CONFLICT (${escapedConflict}) DO NOTHING`;

    await query(
      `INSERT INTO "${table}" (${escapedColumns}) VALUES\n${placeholders}\n${conflictClause}`,
      values,
    );
  };

const getRows = async <T>(query: QueryFn, sql: string, params: unknown[] = []): Promise<T[]> =>
  (await query(sql, params)) as T[];

const resetSequences = async (query: QueryFn, tables: readonly string[]): Promise<void> => {
  for (const table of tables) {
    await query(
      `SELECT setval(
         pg_get_serial_sequence('"${table}"', 'id'),
         COALESCE((SELECT MAX("id") FROM "${table}"), 1)
       )`,
    );
  }
};

const seed = async (query: QueryFn): Promise<void> => {
  const insert = makeInserter(query);

  await query(`INSERT INTO "roles" ("name") VALUES ('Warehouse') ON CONFLICT ("name") DO NOTHING`);

  const roleNameList = [
    'Admin',
    'Sales',
    'Accountant',
    'Technician',
    'HeadTechnician',
    'Customer',
    'Warehouse',
  ];
  const roleRows = await getRows<{ id: number; name: string }>(
    query,
    `SELECT "id", "name" FROM "roles" WHERE "name" = ANY($1::varchar[])`,
    [roleNameList],
  );
  const roles = Object.fromEntries(roleRows.map((row) => [row.name, row.id])) as Record<
    string,
    number
  >;

  const passwordHash = await bcrypt.hash('Isocal@123', 10);

  await insert(
    'service_types',
    ['id', 'name', 'kind', 'field', 'standard_code', 'measuring_range', 'status'],
    [
      { id: 1, name: 'Hiệu chuẩn Điện – Điện tử – Tần số', kind: 'Calibration', field: 'DIEN', standard_code: 'HC-DIEN', measuring_range: 'Điện áp AC/DC, dòng điện, tần số', status: 'Active' },
      { id: 2, name: 'Hiệu chuẩn Khối lượng – Lực', kind: 'Calibration', field: 'KHOILUONG', standard_code: 'HC-KHOILUONG', measuring_range: 'Khối lượng, lực, độ cứng', status: 'Active' },
      { id: 3, name: 'Hiệu chuẩn Độ dài – Dung tích', kind: 'Calibration', field: 'DODAI', standard_code: 'HC-DODAI', measuring_range: 'Kích thước, độ dài, dung tích', status: 'Active' },
      { id: 4, name: 'Hiệu chuẩn Áp suất – Lưu lượng', kind: 'Calibration', field: 'APSUAT', standard_code: 'HC-APSUAT', measuring_range: 'Áp suất âm, dương, lưu lượng', status: 'Active' },
      { id: 5, name: 'Hiệu chuẩn Nhiệt độ – Độ ẩm', kind: 'Calibration', field: 'NHIET', standard_code: 'HC-NHIET', measuring_range: '-80 đến 1200 °C, 5 - 98 %RH', status: 'Active' },
      { id: 6, name: 'Hiệu chuẩn Hóa học – Y tế – Môi trường', kind: 'Calibration', field: 'HOA', standard_code: 'HC-HOA', measuring_range: 'pH, EC, quang phổ, nồng độ khí', status: 'Active' },
      { id: 7, name: 'Hiệu chuẩn Quang học – Âm thanh', kind: 'Calibration', field: 'QUANG', standard_code: 'HC-QUANG', measuring_range: 'Độ rọi, độ đục, mức áp suất âm thanh', status: 'Active' },
      { id: 8, name: 'Hiệu chuẩn Thiết bị Dệt may – Da giày', kind: 'Calibration', field: 'DET', standard_code: 'HC-DET', measuring_range: 'Độ bền, độ co giãn, độ ẩm vật liệu', status: 'Active' },
    ],
  );

  await insert(
    'customers',
    ['id', 'company_name', 'tax_code', 'address', 'industry', 'created_at'],
    [
      { id: 101, company_name: 'Sai Gon Instrument JSC', tax_code: '0311222333', address: 'Quan 7, Ho Chi Minh City', industry: 'Electronics', created_at: daysAgo(180) },
      { id: 102, company_name: 'Hanoi Lab Equipment Co., Ltd.', tax_code: '0102233444', address: 'Cau Giay, Hanoi', industry: 'Laboratory Equipment', created_at: daysAgo(150) },
      { id: 103, company_name: 'Can Tho Food Quality Center', tax_code: '1803344555', address: 'Ninh Kieu, Can Tho', industry: 'Food Testing', created_at: daysAgo(120) },
      { id: 104, company_name: 'Da Nang Calibration Services', tax_code: '0404455666', address: 'Hai Chau, Da Nang', industry: 'Calibration Services', created_at: daysAgo(90) },
    ],
  );

  await insert(
    'accounts',
    ['id', 'role_id', 'customer_id', 'full_name', 'email', 'phone', 'password_hash', 'is_2fa_enabled', 'failed_login_attempts'],
    [
      { id: 101, role_id: roles.Warehouse, customer_id: null, full_name: 'Tran Van Kho (Warehouse Manager)', email: 'warehouse.manager@isocal.com', phone: '0901000101', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 102, role_id: roles.Warehouse, customer_id: null, full_name: 'Pham Thi Kho (Warehouse Staff)', email: 'warehouse.staff@isocal.com', phone: '0901000102', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 103, role_id: roles.Sales, customer_id: null, full_name: 'Do Thi Thu (Sales)', email: 'sale3@isocal.com', phone: '0901000103', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 104, role_id: roles.Sales, customer_id: null, full_name: 'Tai khoan bi khoa (demo)', email: 'locked.demo@isocal.com', phone: '0901000104', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 5 },
      { id: 105, role_id: roles.Customer, customer_id: 2, full_name: 'Nguyen Van Son', email: 'son@vietnamprecision.com', phone: '0911000105', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 106, role_id: roles.Customer, customer_id: 3, full_name: 'Le Thi Ngoc', email: 'ngoc@mekongfood.com', phone: '0911000106', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 107, role_id: roles.Customer, customer_id: 5, full_name: 'Trinh Van Hieu', email: 'hieu@danangmedical.com', phone: '0911000107', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 108, role_id: roles.Technician, customer_id: null, full_name: 'Hoang Van Thanh (Technician)', email: 'technician2@isocal.com', phone: '0901000108', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 109, role_id: roles.Accountant, customer_id: null, full_name: 'Vo Thi Thu (Accountant)', email: 'accountant2@isocal.com', phone: '0901000109', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 110, role_id: roles.HeadTechnician, customer_id: null, full_name: 'Bui Van Reviewer', email: 'reviewer@isocal.com', phone: '0901000110', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 111, role_id: roles.Admin, customer_id: null, full_name: 'Demo Administrator', email: 'admin.demo@isocal.com', phone: '0901000111', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 112, role_id: roles.Customer, customer_id: 6, full_name: 'Dang Thi BTC', email: 'btc.demo@fpt.edu.vn', phone: '0911000112', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 113, role_id: roles.Customer, customer_id: 101, full_name: 'Contact SG Instrument', email: 'contact@sginstrument.com', phone: '0911000113', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 114, role_id: roles.Customer, customer_id: 102, full_name: 'Contact Hanoi Lab', email: 'contact@hanoilab.com', phone: '0911000114', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 115, role_id: roles.Customer, customer_id: 103, full_name: 'Contact Can Tho Food', email: 'contact@canthofood.com', phone: '0911000115', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
      { id: 116, role_id: roles.Customer, customer_id: 104, full_name: 'Contact Da Nang Calibration', email: 'contact@dncalibration.com', phone: '0911000116', password_hash: passwordHash, is_2fa_enabled: false, failed_login_attempts: 0 },
    ],
    ['email'],
  );

  const accountRows = await getRows<{ id: number; email: string }>(
    query,
    `SELECT "id", "email" FROM "accounts"
     WHERE "email" = ANY($1::varchar[])`,
    [
      [
        'sale@isocal.com',
        'sale2@isocal.com',
        'head.sales@isocal.com',
        'sale3@isocal.com',
      ],
    ],
  );
  const accountIds = Object.fromEntries(
    accountRows.map((row) => [row.email, row.id]),
  ) as Record<string, number>;
  const primarySalesId = accountIds['sale@isocal.com'];
  const secondarySalesId = accountIds['sale2@isocal.com'];
  const headSalesId = accountIds['head.sales@isocal.com'];
  const thirdSalesId = accountIds['sale3@isocal.com'];

  await query(
    `UPDATE "customers"
     SET "assigned_sales_id" = $1, "assigned_by" = $2, "assigned_at" = NOW()
     WHERE "id" IN (5, 6, 102)`,
    [headSalesId, headSalesId],
  );
  await query(
    `UPDATE "customers"
     SET "assigned_sales_id" = $1, "assigned_by" = $2, "assigned_at" = NOW()
     WHERE "id" IN (104)`,
    [secondarySalesId, headSalesId],
  );
  await query(
    `UPDATE "customers"
     SET "assigned_sales_id" = $1, "assigned_by" = $2, "assigned_at" = NOW()
     WHERE "id" IN (103)`,
    [thirdSalesId, headSalesId],
  );
  await query(
    `UPDATE "customers"
     SET "assigned_sales_id" = $1, "assigned_by" = $2, "assigned_at" = NOW()
     WHERE "id" = 101`,
    [secondarySalesId, headSalesId],
  );

  await insert(
    'devices',
    ['id', 'customer_id', 'name', 'model', 'manufacturer', 'serial_number', 'internal_code', 'measuring_range', 'is_group2', 'next_due_date', 'status'],
    [
      { id: 101, customer_id: 1, name: 'Máy hiện sóng số 100 MHz', model: 'TBS1104', manufacturer: 'Tektronix', serial_number: 'DEMO-SN-101', internal_code: 'DEMO-TB-101', measuring_range: '100 MHz, 1 GS/s', is_group2: false, next_due_date: dayOffset(10), status: 'ExpiringSoon' },
      { id: 102, customer_id: 1, name: 'Cân kỹ thuật 220 g', model: 'MS204S', manufacturer: 'Mettler Toledo', serial_number: 'DEMO-SN-102', internal_code: 'DEMO-TB-102', measuring_range: '0 - 220 g / 0.1 mg', is_group2: true, next_due_date: dayOffset(200), status: 'Active' },
      { id: 103, customer_id: 1, name: 'Thước cặp điện tử 150 mm', model: '530-104', manufacturer: 'Mitutoyo', serial_number: 'DEMO-SN-103', internal_code: 'DEMO-TB-103', measuring_range: '0 - 150 mm / 0.01 mm', is_group2: false, next_due_date: dayOffset(-20), status: 'Expired' },
      { id: 104, customer_id: 2, name: 'Áp kế chuẩn số', model: 'DPI 104', manufacturer: 'Druck', serial_number: 'DEMO-SN-104', internal_code: 'DEMO-TB-104', measuring_range: '0 - 70 bar', is_group2: true, next_due_date: dayOffset(15), status: 'ExpiringSoon' },
      { id: 105, customer_id: 2, name: 'Máy đo pH phòng thí nghiệm', model: 'FiveEasy F20', manufacturer: 'Mettler Toledo', serial_number: 'DEMO-SN-105', internal_code: 'DEMO-TB-105', measuring_range: '-2.00 đến 20.00 pH', is_group2: false, next_due_date: dayOffset(260), status: 'Active' },
      { id: 106, customer_id: 3, name: 'Nhiệt ẩm kế môi trường', model: 'testo 625', manufacturer: 'Testo', serial_number: 'DEMO-SN-106', internal_code: 'DEMO-TB-106', measuring_range: '-10 đến 60 °C', is_group2: true, next_due_date: dayOffset(45), status: 'Active' },
      { id: 107, customer_id: 4, name: 'Máy đo độ rọi', model: 'TES-1332A', manufacturer: 'TES', serial_number: 'DEMO-SN-107', internal_code: 'DEMO-TB-107', measuring_range: '0 - 200000 Lux', is_group2: false, next_due_date: dayOffset(25), status: 'ExpiringSoon' },
      { id: 108, customer_id: 5, name: 'Máy đo độ ẩm ngũ cốc', model: 'GM510', manufacturer: 'Bennett', serial_number: 'DEMO-SN-108', internal_code: 'DEMO-TB-108', measuring_range: '6 - 40 % moisture', is_group2: false, next_due_date: dayOffset(140), status: 'Active' },
      { id: 109, customer_id: 6, name: 'Đồng hồ vạn năng True-RMS', model: 'F17B+', manufacturer: 'Fluke', serial_number: 'DEMO-SN-109', internal_code: 'DEMO-TB-109', measuring_range: '0 - 1000 V / 10 A', is_group2: false, next_due_date: dayOffset(5), status: 'ExpiringSoon' },
      { id: 110, customer_id: 101, name: 'Cân phân tích 4 số lẻ', model: 'QUINTIX124', manufacturer: 'Sartorius', serial_number: 'DEMO-SN-110', internal_code: 'DEMO-TB-110', measuring_range: '0 - 120 g / 0.1 mg', is_group2: true, next_due_date: dayOffset(60), status: 'Active' },
      { id: 111, customer_id: 102, name: 'Thước panme đo ngoài', model: '293-240-30', manufacturer: 'Mitutoyo', serial_number: 'DEMO-SN-111', internal_code: 'DEMO-TB-111', measuring_range: '0 - 25 mm / 0.001 mm', is_group2: false, next_due_date: dayOffset(-5), status: 'Expired' },
      { id: 112, customer_id: 103, name: 'Nhiệt kế hồng ngoại', model: '62 Max+', manufacturer: 'Fluke', serial_number: 'DEMO-SN-112', internal_code: 'DEMO-TB-112', measuring_range: '-30 đến 650 °C', is_group2: false, next_due_date: dayOffset(90), status: 'InRepair' },
      { id: 113, customer_id: 104, name: 'Áp kế màng inox', model: '232.50', manufacturer: 'WIKA', serial_number: 'DEMO-SN-113', internal_code: 'DEMO-TB-113', measuring_range: '0 - 16 bar', is_group2: true, next_due_date: dayOffset(120), status: 'Active' },
    ],
  );

  await insert(
    'master_standards',
    ['id', 'name', 'serial_number', 'accuracy_class', 'calibration_expiry', 'status'],
    [
      { id: 101, name: 'Calibrator Fluke 5522A (demo)', serial_number: 'DEMO-MS-5522A', accuracy_class: '0.005 %', calibration_expiry: dayOffset(12), status: 'Active' },
      { id: 102, name: 'Bộ quả cân chuẩn F1 demo', serial_number: 'DEMO-MS-F1', accuracy_class: 'Class F1', calibration_expiry: dayOffset(210), status: 'Active' },
      { id: 103, name: 'Bộ căn mẫu độ dài demo', serial_number: 'DEMO-MS-GAUGE', accuracy_class: 'Grade 0', calibration_expiry: dayOffset(24), status: 'Active' },
      { id: 104, name: 'Áp kế chuẩn Fluke 700G demo', serial_number: 'DEMO-MS-700G', accuracy_class: '0.05 % FS', calibration_expiry: dayOffset(-10), status: 'Expired' },
      { id: 105, name: 'Bộ ghi nhiệt độ đa kênh demo', serial_number: 'DEMO-MS-TEMP', accuracy_class: '±0.1 °C', calibration_expiry: dayOffset(365), status: 'Active' },
      { id: 106, name: 'Bộ tải chuẩn công tơ demo', serial_number: 'DEMO-MS-LOAD', accuracy_class: '0.02 %', calibration_expiry: dayOffset(90), status: 'Active' },
    ],
  );

  await insert(
    'masterstandard',
    ['id', 'name', 'serial_number', 'accuracy_class', 'calibration_expiry', 'status'],
    [
      { id: 101, name: 'Chuẩn đo dài demo', serial_number: 'DEMO-MST-101', accuracy_class: 'Grade 0', calibration_expiry: dayOffset(400), status: 'Active' },
      { id: 102, name: 'Chuẩn áp suất demo', serial_number: 'DEMO-MST-102', accuracy_class: '0.02 %', calibration_expiry: dayOffset(500), status: 'Active' },
      { id: 103, name: 'Chuẩn điện demo', serial_number: 'DEMO-MST-103', accuracy_class: '0.005 %', calibration_expiry: dayOffset(600), status: 'Active' },
      { id: 104, name: 'Chuẩn khối lượng demo', serial_number: 'DEMO-MST-104', accuracy_class: 'Class F1', calibration_expiry: dayOffset(700), status: 'Active' },
    ],
  );

  await insert(
    'calibration_procedures',
    ['id', 'service_type_id', 'version', 'environment_requirement', 'required_equipment', 'effective_from', 'status'],
    [
      { id: 101, service_type_id: 1, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
      { id: 102, service_type_id: 2, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
      { id: 103, service_type_id: 3, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
      { id: 104, service_type_id: 4, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
      { id: 105, service_type_id: 5, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
      { id: 106, service_type_id: 6, version: 'DEMO-V1', environment_requirement: null, required_equipment: null, effective_from: dayOffset(0), status: 'Draft' },
    ],
  );

  await insert(
    'service_requests',
    ['id', 'request_code', 'customer_id', 'created_by', 'location_type', 'preferred_date', 'special_notes', 'status', 'created_at'],
    [
      { id: 101, request_code: 'SR-DEMO-101', customer_id: 1, created_by: 7, location_type: 'In-lab', preferred_date: dayOffset(7), special_notes: 'Yêu cầu hiệu chuẩn định kỳ', status: 'New', created_at: daysAgo(2) },
      { id: 102, request_code: 'SR-DEMO-102', customer_id: 1, created_by: 7, location_type: 'On-site', preferred_date: dayOffset(12), special_notes: 'Kiểm tra thiết bị sau sửa chữa', status: 'Quoted', created_at: daysAgo(5) },
      { id: 103, request_code: 'SR-DEMO-103', customer_id: 2, created_by: 105, location_type: 'In-lab', preferred_date: dayOffset(9), special_notes: null, status: 'Confirmed', created_at: daysAgo(10) },
      { id: 104, request_code: 'SR-DEMO-104', customer_id: 2, created_by: 105, location_type: 'In-lab', preferred_date: dayOffset(20), special_notes: null, status: 'InProgress', created_at: daysAgo(15) },
      { id: 105, request_code: 'SR-DEMO-105', customer_id: 3, created_by: 106, location_type: 'On-site', preferred_date: dayOffset(-5), special_notes: null, status: 'Completed', created_at: daysAgo(30) },
      { id: 106, request_code: 'SR-DEMO-106', customer_id: 4, created_by: secondarySalesId, location_type: 'In-lab', preferred_date: dayOffset(14), special_notes: null, status: 'New', created_at: daysAgo(1) },
      { id: 107, request_code: 'SR-DEMO-107', customer_id: 101, created_by: 113, location_type: 'In-lab', preferred_date: dayOffset(11), special_notes: null, status: 'Quoted', created_at: daysAgo(3) },
      { id: 108, request_code: 'SR-DEMO-108', customer_id: 102, created_by: 114, location_type: 'On-site', preferred_date: dayOffset(18), special_notes: null, status: 'Confirmed', created_at: daysAgo(6) },
      { id: 109, request_code: 'SR-DEMO-109', customer_id: 103, created_by: 115, location_type: 'In-lab', preferred_date: dayOffset(16), special_notes: null, status: 'New', created_at: daysAgo(4) },
      { id: 110, request_code: 'SR-DEMO-110', customer_id: 104, created_by: 116, location_type: 'In-lab', preferred_date: dayOffset(-2), special_notes: null, status: 'Completed', created_at: daysAgo(40) },
      { id: 111, request_code: 'SR-DEMO-111', customer_id: 101, created_by: 113, location_type: 'In-lab', preferred_date: dayOffset(13), special_notes: null, status: 'Quoted', created_at: daysAgo(2) },
      { id: 112, request_code: 'SR-DEMO-112', customer_id: 102, created_by: 114, location_type: 'On-site', preferred_date: dayOffset(17), special_notes: null, status: 'New', created_at: daysAgo(1) },
    ],
  );

  await insert(
    'service_request_items',
    ['id', 'service_request_id', 'device_id', 'service_type_id', 'status'],
    [
      { id: 101, service_request_id: 101, device_id: 101, service_type_id: 1, status: 'Pending' },
      { id: 102, service_request_id: 101, device_id: 102, service_type_id: 2, status: 'Pending' },
      { id: 103, service_request_id: 102, device_id: 103, service_type_id: 3, status: 'Inspected' },
      { id: 104, service_request_id: 103, device_id: 104, service_type_id: 4, status: 'Pending' },
      { id: 105, service_request_id: 103, device_id: 105, service_type_id: 6, status: 'Done' },
      { id: 106, service_request_id: 104, device_id: 105, service_type_id: 6, status: 'Done' },
      { id: 107, service_request_id: 105, device_id: 106, service_type_id: 5, status: 'Done' },
      { id: 108, service_request_id: 106, device_id: 107, service_type_id: 7, status: 'Pending' },
      { id: 109, service_request_id: 107, device_id: 110, service_type_id: 2, status: 'Inspected' },
      { id: 110, service_request_id: 108, device_id: 111, service_type_id: 3, status: 'Pending' },
      { id: 111, service_request_id: 109, device_id: 112, service_type_id: 4, status: 'Pending' },
      { id: 112, service_request_id: 110, device_id: 113, service_type_id: 5, status: 'Done' },
      { id: 113, service_request_id: 111, device_id: 110, service_type_id: 2, status: 'Pending' },
      { id: 114, service_request_id: 112, device_id: 111, service_type_id: 3, status: 'Pending' },
    ],
  );

  const approvedQuotationDates = [
    reviewedThisQuarter(10),
    reviewedThisQuarter(5),
    reviewedThisQuarter(2),
    reviewedThisQuarter(1),
  ];

  await insert(
    'quotations',
    ['id', 'service_request_id', 'subtotal', 'discount_amount', 'travel_fee', 'total_amount', 'estimated_completion_date', 'status', 'created_by', 'head_sales_reviewed_by', 'head_sales_reviewed_at', 'head_sales_decision', 'customer_responded_at', 'sales_submission_note', 'submission_count'],
    [
      { id: 101, service_request_id: 101, subtotal: 1200000, discount_amount: 0, travel_fee: 0, total_amount: 1200000, estimated_completion_date: dayOffset(21), status: 'Approved', created_by: primarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: approvedQuotationDates[0], head_sales_decision: 'Approved', customer_responded_at: daysAgo(9), sales_submission_note: 'Đã duyệt demo', submission_count: 1 },
      { id: 102, service_request_id: 102, subtotal: 450000, discount_amount: 0, travel_fee: 0, total_amount: 450000, estimated_completion_date: dayOffset(18), status: 'PendingApproval', created_by: primarySalesId, head_sales_reviewed_by: null, head_sales_reviewed_at: null, head_sales_decision: null, customer_responded_at: null, sales_submission_note: 'Chờ trưởng phòng duyệt', submission_count: 1 },
      { id: 103, service_request_id: 103, subtotal: 780000, discount_amount: 0, travel_fee: 0, total_amount: 780000, estimated_completion_date: dayOffset(14), status: 'Sent', created_by: secondarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: daysAgo(8), head_sales_decision: 'Approved', customer_responded_at: daysAgo(7), sales_submission_note: null, submission_count: 1 },
      { id: 104, service_request_id: 104, subtotal: 920000, discount_amount: 0, travel_fee: 0, total_amount: 920000, estimated_completion_date: dayOffset(25), status: 'Approved', created_by: secondarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: approvedQuotationDates[1], head_sales_decision: 'Approved', customer_responded_at: daysAgo(4), sales_submission_note: null, submission_count: 1 },
      { id: 105, service_request_id: 105, subtotal: 300000, discount_amount: 0, travel_fee: 0, total_amount: 300000, estimated_completion_date: dayOffset(10), status: 'Draft', created_by: primarySalesId, head_sales_reviewed_by: null, head_sales_reviewed_at: null, head_sales_decision: null, customer_responded_at: null, sales_submission_note: null, submission_count: 0 },
      { id: 106, service_request_id: 106, subtotal: 150000, discount_amount: 0, travel_fee: 0, total_amount: 150000, estimated_completion_date: dayOffset(12), status: 'Rejected', created_by: secondarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: daysAgo(2), head_sales_decision: 'Rejected', customer_responded_at: null, sales_submission_note: 'Khách hàng tạm dừng', submission_count: 2 },
      { id: 107, service_request_id: 107, subtotal: 1500000, discount_amount: 0, travel_fee: 0, total_amount: 1500000, estimated_completion_date: dayOffset(28), status: 'Approved', created_by: secondarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: approvedQuotationDates[2], head_sales_decision: 'Approved', customer_responded_at: daysAgo(1), sales_submission_note: null, submission_count: 1 },
      { id: 108, service_request_id: 108, subtotal: 2100000, discount_amount: 0, travel_fee: 0, total_amount: 2100000, estimated_completion_date: dayOffset(35), status: 'Approved', created_by: headSalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: approvedQuotationDates[2], head_sales_decision: 'Approved', customer_responded_at: daysAgo(2), sales_submission_note: null, submission_count: 1 },
      { id: 109, service_request_id: 109, subtotal: 650000, discount_amount: 0, travel_fee: 0, total_amount: 650000, estimated_completion_date: dayOffset(19), status: 'PendingApproval', created_by: thirdSalesId, head_sales_reviewed_by: null, head_sales_reviewed_at: null, head_sales_decision: null, customer_responded_at: null, sales_submission_note: null, submission_count: 1 },
      { id: 110, service_request_id: 110, subtotal: 880000, discount_amount: 0, travel_fee: 0, total_amount: 880000, estimated_completion_date: dayOffset(22), status: 'Approved', created_by: secondarySalesId, head_sales_reviewed_by: headSalesId, head_sales_reviewed_at: approvedQuotationDates[3], head_sales_decision: 'Approved', customer_responded_at: daysAgo(6), sales_submission_note: null, submission_count: 1 },
      { id: 111, service_request_id: 111, subtotal: 740000, discount_amount: 0, travel_fee: 0, total_amount: 740000, estimated_completion_date: dayOffset(24), status: 'PendingApproval', created_by: secondarySalesId, head_sales_reviewed_by: null, head_sales_reviewed_at: null, head_sales_decision: null, customer_responded_at: null, sales_submission_note: 'Chờ phê duyệt demo', submission_count: 1 },
      { id: 112, service_request_id: 112, subtotal: 960000, discount_amount: 0, travel_fee: 0, total_amount: 960000, estimated_completion_date: dayOffset(29), status: 'Draft', created_by: headSalesId, head_sales_reviewed_by: null, head_sales_reviewed_at: null, head_sales_decision: null, customer_responded_at: null, sales_submission_note: null, submission_count: 0 },
    ],
  );

  await insert(
    'quotation_line_items',
    ['id', 'quotation_id', 'service_request_item_id', 'description', 'unit_price', 'discount_amount'],
    [
      { id: 101, quotation_id: 101, service_request_item_id: 101, description: 'Hiệu chuẩn máy hiện sóng 100 MHz', unit_price: 1200000, discount_amount: 0 },
      { id: 102, quotation_id: 102, service_request_item_id: 103, description: 'Hiệu chuẩn thước cặp điện tử', unit_price: 450000, discount_amount: 0 },
      { id: 103, quotation_id: 103, service_request_item_id: 104, description: 'Hiệu chuẩn áp kế chuẩn số', unit_price: 780000, discount_amount: 0 },
      { id: 104, quotation_id: 104, service_request_item_id: 106, description: 'Hiệu chuẩn máy đo pH', unit_price: 920000, discount_amount: 0 },
      { id: 105, quotation_id: 105, service_request_item_id: 107, description: 'Hiệu chuẩn nhiệt ẩm kế', unit_price: 300000, discount_amount: 0 },
      { id: 106, quotation_id: 106, service_request_item_id: 108, description: 'Hiệu chuẩn máy đo độ rọi', unit_price: 150000, discount_amount: 0 },
      { id: 107, quotation_id: 107, service_request_item_id: 109, description: 'Hiệu chuẩn cân phân tích', unit_price: 1500000, discount_amount: 0 },
      { id: 108, quotation_id: 108, service_request_item_id: 110, description: 'Hiệu chuẩn thước panme đo ngoài', unit_price: 2100000, discount_amount: 0 },
      { id: 109, quotation_id: 109, service_request_item_id: 111, description: 'Hiệu chuẩn nhiệt kế hồng ngoại', unit_price: 650000, discount_amount: 0 },
      { id: 110, quotation_id: 110, service_request_item_id: 112, description: 'Hiệu chuẩn áp kế màng inox', unit_price: 880000, discount_amount: 0 },
      { id: 111, quotation_id: 111, service_request_item_id: 113, description: 'Hiệu chuẩn cân phân tích định kỳ', unit_price: 740000, discount_amount: 0 },
      { id: 112, quotation_id: 112, service_request_item_id: 114, description: 'Hiệu chuẩn thước panme tại khách hàng', unit_price: 960000, discount_amount: 0 },
    ],
  );

  const contractColumns = ['id', 'contract_code', 'contract_type', 'quotation_id', 'customer_id', 'title', 'sign_date', 'start_date', 'end_date', 'duration_days', 'location', 'subtotal', 'discount_amount', 'travel_fee', 'tax_amount', 'total_amount', 'payment_term_days', 'status', 'party_a_name', 'party_b_name', 'created_by', 'submitted_at', 'approved_by', 'approved_at', 'liquidated_by', 'liquidated_at', 'committed_years', 'credit_limit', 'notes', 'created_at'];
  await insert(
    'contracts',
    contractColumns,
    [
      { id: 101, contract_code: 'HD-DEMO-101', contract_type: 'Service', quotation_id: 101, customer_id: 1, title: 'Hợp đồng hiệu chuẩn thiết bị điện tử', sign_date: dayOffset(-145), start_date: dayOffset(-140), end_date: dayOffset(60), duration_days: 365, location: 'Phòng Lab ISOCAL', subtotal: 1200000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 1200000, payment_term_days: 30, status: 'Signed', party_a_name: 'ABC Calibration Company', party_b_name: 'ISOCAL', created_by: primarySalesId, submitted_at: daysAgo(148), approved_by: headSalesId, approved_at: daysAgo(146), liquidated_by: null, liquidated_at: null, committed_years: 1, credit_limit: 50000000, notes: 'Dữ liệu demo cho dashboard', created_at: daysAgo(150) },
      { id: 102, contract_code: 'HD-DEMO-102', contract_type: 'Service', quotation_id: 110, customer_id: 104, title: 'Hợp đồng hiệu chuẩn áp kế', sign_date: dayOffset(-95), start_date: dayOffset(-90), end_date: dayOffset(-20), duration_days: 365, location: 'Phòng Lab ISOCAL', subtotal: 880000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 880000, payment_term_days: 30, status: 'Approved', party_a_name: 'Da Nang Calibration Services', party_b_name: 'ISOCAL', created_by: secondarySalesId, submitted_at: daysAgo(98), approved_by: headSalesId, approved_at: daysAgo(96), liquidated_by: null, liquidated_at: null, committed_years: 1, credit_limit: 20000000, notes: 'Hợp đồng quá hạn demo', created_at: daysAgo(100) },
      { id: 103, contract_code: 'HD-DEMO-103', contract_type: 'Service', quotation_id: 104, customer_id: 2, title: 'Hợp đồng hiệu chuẩn thiết bị phòng thí nghiệm', sign_date: dayOffset(-65), start_date: dayOffset(-60), end_date: dayOffset(-45), duration_days: 180, location: 'Tại khách hàng', subtotal: 920000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 920000, payment_term_days: 45, status: 'Approved', party_a_name: 'Vietnam Precision Engineering Co., Ltd.', party_b_name: 'ISOCAL', created_by: secondarySalesId, submitted_at: daysAgo(68), approved_by: headSalesId, approved_at: daysAgo(66), liquidated_by: null, liquidated_at: null, committed_years: 1, credit_limit: 30000000, notes: 'Hợp đồng quá hạn demo', created_at: daysAgo(70) },
      { id: 104, contract_code: 'HD-DEMO-104', contract_type: 'Service', quotation_id: null, customer_id: 3, title: 'Hợp đồng dịch vụ hiệu chuẩn định kỳ', sign_date: dayOffset(-115), start_date: dayOffset(-110), end_date: dayOffset(-10), duration_days: 365, location: 'Phòng Lab ISOCAL', subtotal: 500000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 500000, payment_term_days: 30, status: 'Liquidated', party_a_name: 'Mekong Food Processing JSC', party_b_name: 'ISOCAL', created_by: primarySalesId, submitted_at: daysAgo(118), approved_by: headSalesId, approved_at: daysAgo(116), liquidated_by: 109, liquidated_at: daysAgo(5), committed_years: 1, credit_limit: 10000000, notes: 'Hợp đồng đã tất toán demo', created_at: daysAgo(120) },
      { id: 105, contract_code: 'HD-DEMO-105', contract_type: 'Framework', quotation_id: null, customer_id: 5, title: 'Hợp đồng khung hiệu chuẩn thiết bị y tế', sign_date: dayOffset(-25), start_date: dayOffset(-20), end_date: dayOffset(120), duration_days: 365, location: 'Tại khách hàng', subtotal: 1100000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 1100000, payment_term_days: 30, status: 'Signed', party_a_name: 'Da Nang Medical Equipment Co., Ltd.', party_b_name: 'ISOCAL', created_by: primarySalesId, submitted_at: daysAgo(28), approved_by: headSalesId, approved_at: daysAgo(26), liquidated_by: null, liquidated_at: null, committed_years: 2, credit_limit: 40000000, notes: 'Hợp đồng khung demo', created_at: daysAgo(30) },
      { id: 106, contract_code: 'HD-DEMO-106', contract_type: 'Service', quotation_id: null, customer_id: 101, title: 'Hợp đồng hiệu chuẩn thiết bị đo', sign_date: dayOffset(-85), start_date: dayOffset(-80), end_date: dayOffset(-100), duration_days: 365, location: 'Phòng Lab ISOCAL', subtotal: 1800000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 1800000, payment_term_days: 60, status: 'Signed', party_a_name: 'Sai Gon Instrument JSC', party_b_name: 'ISOCAL', created_by: secondarySalesId, submitted_at: daysAgo(88), approved_by: headSalesId, approved_at: daysAgo(86), liquidated_by: null, liquidated_at: null, committed_years: 1, credit_limit: 15000000, notes: 'Hợp đồng quá hạn demo', created_at: daysAgo(90) },
      { id: 107, contract_code: 'HD-DEMO-107', contract_type: 'Service', quotation_id: null, customer_id: 102, title: 'Hợp đồng hiệu chuẩn thiết bị phòng Lab', sign_date: null, start_date: dayOffset(30), end_date: dayOffset(200), duration_days: 365, location: 'Phòng Lab ISOCAL', subtotal: 2000000, discount_amount: 0, travel_fee: 0, tax_amount: 0, total_amount: 2000000, payment_term_days: 30, status: 'Draft', party_a_name: 'Hanoi Lab Equipment Co., Ltd.', party_b_name: 'ISOCAL', created_by: primarySalesId, submitted_at: null, approved_by: null, approved_at: null, liquidated_by: null, liquidated_at: null, committed_years: 1, credit_limit: 25000000, notes: 'Hợp đồng nháp demo', created_at: daysAgo(15) },
    ],
  );

  await insert(
    'work_orders',
    ['id', 'contract_id', 'quotation_id', 'status', 'created_at'],
    [
      { id: 101, contract_id: 101, quotation_id: 101, status: 'Assigned', created_at: daysAgo(3) },
      { id: 102, contract_id: null, quotation_id: 102, status: 'Open', created_at: daysAgo(2) },
      { id: 103, contract_id: 103, quotation_id: 104, status: 'InProgress', created_at: daysAgo(10) },
      { id: 104, contract_id: null, quotation_id: 107, status: 'Done', created_at: daysAgo(20) },
      { id: 105, contract_id: 106, quotation_id: null, status: 'Assigned', created_at: daysAgo(5) },
      { id: 106, contract_id: null, quotation_id: 108, status: 'InProgress', created_at: daysAgo(1) },
    ],
  );

  await insert(
    'work_order_assignments',
    ['id', 'work_order_id', 'service_request_item_id', 'technician_id', 'master_standard_id', 'assigned_by', 'scheduled_start', 'scheduled_end', 'status'],
    [
      { id: 101, work_order_id: 101, service_request_item_id: 101, technician_id: 4, master_standard_id: 101, assigned_by: 5, scheduled_start: daysAgo(2), scheduled_end: daysAgo(-1), status: 'InProgress' },
      { id: 102, work_order_id: 101, service_request_item_id: 102, technician_id: 108, master_standard_id: 104, assigned_by: 5, scheduled_start: daysAgo(1), scheduled_end: daysAgo(-2), status: 'Assigned' },
      { id: 103, work_order_id: 103, service_request_item_id: 104, technician_id: 4, master_standard_id: 102, assigned_by: 5, scheduled_start: daysAgo(9), scheduled_end: daysAgo(-1), status: 'InProgress' },
      { id: 104, work_order_id: 103, service_request_item_id: 106, technician_id: 108, master_standard_id: 102, assigned_by: 5, scheduled_start: daysAgo(8), scheduled_end: daysAgo(-1), status: 'Done' },
      { id: 105, work_order_id: 105, service_request_item_id: 109, technician_id: 4, master_standard_id: 103, assigned_by: 5, scheduled_start: daysAgo(4), scheduled_end: daysAgo(-1), status: 'Assigned' },
      { id: 106, work_order_id: 106, service_request_item_id: 110, technician_id: 108, master_standard_id: 101, assigned_by: 5, scheduled_start: daysAgo(1), scheduled_end: daysAgo(-2), status: 'InProgress' },
      { id: 107, work_order_id: 102, service_request_item_id: 103, technician_id: 4, master_standard_id: 101, assigned_by: 5, scheduled_start: daysAgo(2), scheduled_end: daysAgo(-1), status: 'Assigned' },
      { id: 108, work_order_id: 104, service_request_item_id: 107, technician_id: 4, master_standard_id: 104, assigned_by: 5, scheduled_start: daysAgo(19), scheduled_end: daysAgo(17), status: 'Done' },
    ],
  );

  await insert(
    'initial_inspections',
    ['id', 'service_request_item_id', 'result', 'defect_note', 'customer_written_consent', 'customer_consent_status', 'inspected_by', 'inspected_at'],
    [
      { id: 101, service_request_item_id: 101, result: 'Pass', defect_note: null, customer_written_consent: true, customer_consent_status: 'Approved', inspected_by: 5, inspected_at: daysAgo(3) },
      { id: 102, service_request_item_id: 103, result: 'Fail', defect_note: 'Vỏ thiết bị có vết xước nhẹ', customer_written_consent: false, customer_consent_status: 'Rejected', inspected_by: 110, inspected_at: daysAgo(6) },
      { id: 103, service_request_item_id: 104, result: 'Pass', defect_note: null, customer_written_consent: true, customer_consent_status: 'Approved', inspected_by: 5, inspected_at: daysAgo(11) },
      { id: 104, service_request_item_id: 109, result: 'Pass', defect_note: null, customer_written_consent: true, customer_consent_status: 'Approved', inspected_by: 110, inspected_at: daysAgo(4) },
    ],
    ['service_request_item_id'],
  );

  await insert(
    'calibration_records',
    ['id', 'service_request_item_id', 'procedure_id', 'technician_id', 'environment_temp', 'environment_humidity', 'result_status', 'review_status', 'submitted_at', 'reject_reason', 'reviewed_at', 'reviewer_id'],
    [
      { id: 101, service_request_item_id: 101, procedure_id: 101, technician_id: 4, environment_temp: 22.5, environment_humidity: 55, result_status: 'Pass', review_status: 'Pending', submitted_at: daysAgo(2), reject_reason: null, reviewed_at: null, reviewer_id: null },
      { id: 102, service_request_item_id: 102, procedure_id: 102, technician_id: 108, environment_temp: 22, environment_humidity: 54, result_status: 'Pass', review_status: 'Approved', submitted_at: daysAgo(10), reject_reason: null, reviewed_at: daysAgo(9), reviewer_id: 110 },
      { id: 103, service_request_item_id: 107, procedure_id: 103, technician_id: 4, environment_temp: 23, environment_humidity: 58, result_status: 'Fail', review_status: 'Rejected', submitted_at: daysAgo(15), reject_reason: 'Sai số vượt dung sai cho phép', reviewed_at: daysAgo(14), reviewer_id: 110 },
      { id: 104, service_request_item_id: 104, procedure_id: 104, technician_id: 4, environment_temp: 21.5, environment_humidity: 52, result_status: 'Pass', review_status: 'Pending', submitted_at: daysAgo(1), reject_reason: null, reviewed_at: null, reviewer_id: null },
      { id: 105, service_request_item_id: 105, procedure_id: 105, technician_id: 108, environment_temp: 22, environment_humidity: 56, result_status: 'Pass', review_status: 'Approved', submitted_at: daysAgo(20), reject_reason: null, reviewed_at: daysAgo(19), reviewer_id: 5 },
      { id: 106, service_request_item_id: 106, procedure_id: 106, technician_id: 4, environment_temp: 21, environment_humidity: 50, result_status: 'Pass', review_status: 'Pending', submitted_at: daysAgo(3), reject_reason: null, reviewed_at: null, reviewer_id: null },
      { id: 107, service_request_item_id: 109, procedure_id: 101, technician_id: 108, environment_temp: 22.8, environment_humidity: 53, result_status: 'Pass', review_status: 'Approved', submitted_at: daysAgo(7), reject_reason: null, reviewed_at: daysAgo(6), reviewer_id: 110 },
      { id: 108, service_request_item_id: 110, procedure_id: 102, technician_id: 4, environment_temp: 23.2, environment_humidity: 57, result_status: 'Pass', review_status: 'Pending', submitted_at: daysAgo(0.25), reject_reason: null, reviewed_at: null, reviewer_id: null },
      { id: 109, service_request_item_id: 103, procedure_id: 103, technician_id: 4, environment_temp: 22.3, environment_humidity: 55, result_status: 'Pass', review_status: 'Approved', submitted_at: daysAgo(4), reject_reason: null, reviewed_at: daysAgo(3), reviewer_id: 110 },
    ],
  );

  await insert(
    'review_logs',
    ['id', 'calibration_record_id', 'reviewer_id', 'action', 'reject_reason', 'comment', 'created_at'],
    [
      { id: 101, calibration_record_id: 102, reviewer_id: 110, action: 'Approve', reject_reason: null, comment: 'Hồ sơ đạt yêu cầu', created_at: daysAgo(9) },
      { id: 102, calibration_record_id: 103, reviewer_id: 110, action: 'Reject', reject_reason: 'Sai số vượt dung sai cho phép', comment: 'Đề nghị hiệu chỉnh lại', created_at: daysAgo(14) },
      { id: 103, calibration_record_id: 105, reviewer_id: 5, action: 'Approve', reject_reason: null, comment: 'Đã soát xét', created_at: daysAgo(19) },
      { id: 104, calibration_record_id: 107, reviewer_id: 110, action: 'Approve', reject_reason: null, comment: 'Đủ điều kiện cấp chứng nhận', created_at: daysAgo(6) },
      { id: 105, calibration_record_id: 109, reviewer_id: 110, action: 'Approve', reject_reason: null, comment: 'Đạt sau kiểm tra lại', created_at: daysAgo(3) },
    ],
  );

  await insert(
    'certificates',
    ['id', 'calibration_record_id', 'certificate_no', 'status', 'file_url', 'issued_at', 'created_at'],
    [
      { id: 101, calibration_record_id: 102, certificate_no: 'CN-DEMO-101', status: 'Released', file_url: '/demo/certificates/CN-DEMO-101.pdf', issued_at: daysAgo(9), created_at: daysAgo(9) },
      { id: 102, calibration_record_id: 105, certificate_no: 'CN-DEMO-102', status: 'Released', file_url: '/demo/certificates/CN-DEMO-102.pdf', issued_at: daysAgo(19), created_at: daysAgo(19) },
      { id: 103, calibration_record_id: 107, certificate_no: 'CN-DEMO-103', status: 'PendingPayment', file_url: '/demo/certificates/CN-DEMO-103.pdf', issued_at: daysAgo(6), created_at: daysAgo(6) },
      { id: 104, calibration_record_id: 106, certificate_no: 'CN-DEMO-104', status: 'PendingPayment', file_url: null, issued_at: null, created_at: daysAgo(3) },
      { id: 105, calibration_record_id: 101, certificate_no: 'CN-DEMO-105', status: 'Draft', file_url: null, issued_at: null, created_at: daysAgo(2) },
      { id: 106, calibration_record_id: 108, certificate_no: 'CN-DEMO-106', status: 'PendingPayment', file_url: null, issued_at: null, created_at: daysAgo(0.25) },
      { id: 107, calibration_record_id: 109, certificate_no: 'CN-DEMO-107', status: 'Released', file_url: '/demo/certificates/CN-DEMO-107.pdf', issued_at: daysAgo(3), created_at: daysAgo(3) },
    ],
  );

  await insert(
    'seals',
    ['id', 'device_id', 'certificate_id', 'seal_code', 'cal_date', 'due_date', 'status', 'issued_at', 'created_at'],
    [
      { id: 101, device_id: 102, certificate_id: 101, seal_code: 'SEAL-DEMO-101', cal_date: dayOffset(-9), due_date: dayOffset(25), status: 'Active', issued_at: daysAgo(9), created_at: daysAgo(9) },
      { id: 102, device_id: 105, certificate_id: 102, seal_code: 'SEAL-DEMO-102', cal_date: dayOffset(-19), due_date: dayOffset(300), status: 'Active', issued_at: daysAgo(19), created_at: daysAgo(19) },
      { id: 103, device_id: 110, certificate_id: 103, seal_code: 'SEAL-DEMO-103', cal_date: dayOffset(-6), due_date: dayOffset(365), status: 'PendingPayment', issued_at: daysAgo(6), created_at: daysAgo(6) },
      { id: 104, device_id: 105, certificate_id: 104, seal_code: 'SEAL-DEMO-104', cal_date: dayOffset(-380), due_date: dayOffset(-15), status: 'Expired', issued_at: daysAgo(380), created_at: daysAgo(380) },
      { id: 105, device_id: 101, certificate_id: 105, seal_code: 'SEAL-DEMO-105', cal_date: dayOffset(-2), due_date: dayOffset(180), status: 'Active', issued_at: daysAgo(2), created_at: daysAgo(2) },
      { id: 106, device_id: 111, certificate_id: 106, seal_code: 'SEAL-DEMO-106', cal_date: dayOffset(-5), due_date: dayOffset(45), status: 'Active', issued_at: daysAgo(5), created_at: daysAgo(5) },
      { id: 107, device_id: 103, certificate_id: 107, seal_code: 'SEAL-DEMO-107', cal_date: dayOffset(-3), due_date: dayOffset(200), status: 'Active', issued_at: daysAgo(3), created_at: daysAgo(3) },
    ],
  );

  await insert(
    'warehouse_transactions',
    ['id', 'device_id', 'service_request_item_id', 'type', 'condition_note', 'photo_url', 'handled_by', 'transaction_at'],
    [
      { id: 101, device_id: 101, service_request_item_id: 101, type: 'Inbound', condition_note: 'Thiết bị nhập kho chờ hiệu chuẩn', photo_url: null, handled_by: 101, transaction_at: daysAgo(6) },
      { id: 102, device_id: 101, service_request_item_id: 101, type: 'Outbound', condition_note: 'Chuyển sang Lab', photo_url: null, handled_by: 102, transaction_at: daysAgo(5) },
      { id: 103, device_id: 103, service_request_item_id: 103, type: 'Inbound', condition_note: 'Thiết bị chờ trả khách', photo_url: null, handled_by: 101, transaction_at: daysAgo(4) },
      { id: 104, device_id: 104, service_request_item_id: 104, type: 'Inbound', condition_note: 'Nhập kho kiểm tra', photo_url: null, handled_by: 101, transaction_at: daysAgo(3) },
      { id: 105, device_id: 104, service_request_item_id: 104, type: 'Outbound', condition_note: 'Xuất kho giao kỹ thuật viên', photo_url: null, handled_by: 102, transaction_at: daysAgo(2) },
      { id: 106, device_id: 107, service_request_item_id: 108, type: 'Inbound', condition_note: 'Thiết bị đo độ rọi nhập kho', photo_url: null, handled_by: 101, transaction_at: daysAgo(1) },
      { id: 107, device_id: 108, service_request_item_id: null, type: 'Outbound', condition_note: 'Giao trả khách hàng', photo_url: null, handled_by: 102, transaction_at: todayAt(7) },
      { id: 108, device_id: 109, service_request_item_id: 109, type: 'Inbound', condition_note: 'Nhận thiết bị từ khách', photo_url: null, handled_by: 101, transaction_at: todayAt(8) },
      { id: 109, device_id: 110, service_request_item_id: 110, type: 'Outbound', condition_note: 'Chuyển sang khu đo lường', photo_url: null, handled_by: 102, transaction_at: todayAt(9) },
      { id: 110, device_id: 111, service_request_item_id: 111, type: 'Inbound', condition_note: 'Thiết bị chờ đánh giá', photo_url: null, handled_by: 101, transaction_at: daysAgo(7) },
      { id: 111, device_id: 112, service_request_item_id: 112, type: 'Outbound', condition_note: 'Xuất kho thiết bị đang sửa', photo_url: null, handled_by: 102, transaction_at: daysAgo(6) },
      { id: 112, device_id: 113, service_request_item_id: null, type: 'Inbound', condition_note: 'Nhập kho thiết bị mới', photo_url: null, handled_by: 101, transaction_at: daysAgo(2) },
    ],
  );

  await resetSequences(query, [
    'roles',
    'service_types',
    'customers',
    'accounts',
    'devices',
    'master_standards',
    'masterstandard',
    'calibration_procedures',
    'service_requests',
    'service_request_items',
    'quotations',
    'quotation_line_items',
    'contracts',
    'work_orders',
    'work_order_assignments',
    'initial_inspections',
    'calibration_records',
    'review_logs',
    'certificates',
    'seals',
    'warehouse_transactions',
  ]);
};

const main = async (): Promise<void> => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  try {
    await dataSource.transaction((manager) =>
      seed((sql, parameters) => manager.query(sql, parameters)),
    );
    console.log('Dashboard demo seed hoàn tất: dữ liệu mẫu đã được làm mới (id 101+).');
  } finally {
    await dataSource.destroy();
  }
};

void main().catch((error: unknown) => {
  console.error('Seed thất bại:', error);
  process.exitCode = 1;
});
