import crypto from 'node:crypto';
import dataSource from '../../database/dataSource.js';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import {
  saveCertificatePdf,
  type CertificatePdfData,
  type CertificatePdfMeasurement,
} from './certificate-pdf.service.js';

export interface CertificateActor {
  id: number;
  full_name?: string | null;
  role?: string | null;
  customer_id?: number | null;
}

export interface CertificateListFilter {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

interface CertificateRow {
  id: number;
  certificate_no: string;
  status: string;
  file_url: string | null;
  issued_at: Date | null;
  created_at: Date;
  calibration_record_id: number;
  result_status: string | null;
  review_status: string;
  environment_temp: string | null;
  environment_humidity: string | null;
  submitted_at: Date | null;
  reviewed_at: Date | null;
  device_id: number | null;
  device_name: string | null;
  model: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  internal_code: string | null;
  measuring_range: string | null;
  customer_id: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_tax_code: string | null;
  service_name: string | null;
  service_code: string | null;
  procedure_id: number | null;
  procedure_version: string | null;
  technician_name: string | null;
  reviewer_name: string | null;
  standard_name: string | null;
  standard_serial: string | null;
  contract_id: number | null;
  contract_code: string | null;
  seal_id: number | null;
  seal_code: string | null;
  seal_status: string | null;
  seal_cal_date: string | null;
  seal_due_date: string | null;
  signature_count: number | string;
  signer_name: string | null;
  released_at: Date | null;
}

const CERTIFICATE_SELECT = `
  SELECT
    cert.id,
    cert.certificate_no,
    cert.status,
    cert.file_url,
    cert.issued_at,
    cert.created_at,
    cert.calibration_record_id,
    cr.result_status,
    cr.review_status,
    cr.environment_temp,
    cr.environment_humidity,
    cr.submitted_at,
    cr.reviewed_at,
    d.id AS device_id,
    d.name AS device_name,
    d.model,
    d.manufacturer,
    d.serial_number,
    d.internal_code,
    d.measuring_range,
    c.id AS customer_id,
    c.company_name AS customer_name,
    c.address AS customer_address,
    c.tax_code AS customer_tax_code,
    st.name AS service_name,
    st.standard_code AS service_code,
    cp.id AS procedure_id,
    cp.version AS procedure_version,
    tech.full_name AS technician_name,
    reviewer.full_name AS reviewer_name,
    ms.name AS standard_name,
    ms.serial_number AS standard_serial,
    ct.id AS contract_id,
    ct.contract_code,
    s.id AS seal_id,
    s.seal_code,
    s.status AS seal_status,
    s.cal_date AS seal_cal_date,
    s.due_date AS seal_due_date,
    (
      SELECT COUNT(*)::int
      FROM digital_signatures ds
      WHERE ds.certificate_id = cert.id
        AND ds.purpose = 'CertificateRelease'
    ) AS signature_count,
    release_sig.signer_name,
    release_sig.signed_at AS released_at
  FROM certificates cert
  JOIN calibration_records cr ON cr.id = cert.calibration_record_id
  LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
  LEFT JOIN devices d ON d.id = sri.device_id
  LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
  LEFT JOIN customers c ON c.id = sr.customer_id
  LEFT JOIN calibration_procedures cp ON cp.id = cr.procedure_id
  LEFT JOIN service_types st ON st.id = cp.service_type_id
  LEFT JOIN accounts tech ON tech.id = cr.technician_id
  LEFT JOIN accounts reviewer ON reviewer.id = cr.reviewer_id
  LEFT JOIN seals s ON s.certificate_id = cert.id
  LEFT JOIN LATERAL (
    SELECT woa.work_order_id, woa.master_standard_id
    FROM work_order_assignments woa
    WHERE woa.service_request_item_id = cr.service_request_item_id
    ORDER BY woa.id DESC
    LIMIT 1
  ) woa ON true
  LEFT JOIN work_orders wo ON wo.id = woa.work_order_id
  LEFT JOIN masterstandard ms ON ms.id = woa.master_standard_id
  LEFT JOIN contracts ct ON ct.id = wo.contract_id
  LEFT JOIN LATERAL (
    SELECT ds.signer_name, ds.signed_at
    FROM digital_signatures ds
    WHERE ds.certificate_id = cert.id
      AND ds.purpose = 'CertificateRelease'
    ORDER BY ds.id DESC
    LIMIT 1
  ) release_sig ON true
`;

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const formatDateTime = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const mapCertificateRow = (row: CertificateRow) => {
  const deviceParts = [row.device_name];
  if (row.model) deviceParts.push(`Model: ${row.model}`);
  if (row.serial_number) deviceParts.push(`SN: ${row.serial_number}`);

  return {
    id: Number(row.id),
    certificate_no: row.certificate_no,
    status: row.status,
    file_url: row.file_url,
    issued_at: row.issued_at,
    issued_at_formatted: formatDateTime(row.issued_at),
    created_at: row.created_at,
    created_at_formatted: formatDateTime(row.created_at),
    record_id: Number(row.calibration_record_id),
    record_code: `CR-${row.calibration_record_id}`,
    review_status: row.review_status,
    result_status: row.result_status,
    environment_temp: row.environment_temp,
    environment_humidity: row.environment_humidity,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    device_id: row.device_id,
    device_name: row.device_name,
    device: deviceParts.filter(Boolean).join(' · '),
    model: row.model,
    manufacturer: row.manufacturer,
    serial_number: row.serial_number,
    internal_code: row.internal_code,
    measuring_range: row.measuring_range,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    customer: row.customer_name,
    customer_address: row.customer_address,
    customer_tax_code: row.customer_tax_code,
    service_name: row.service_name,
    service_code: row.service_code,
    service: row.service_name,
    procedure_id: row.procedure_id,
    procedure_version: row.procedure_version,
    procedure: row.service_name
      ? `Quy trình ${row.service_name}${
          row.procedure_version ? ` (${row.procedure_version})` : ''
        }`
      : '—',
    technician_name: row.technician_name,
    reviewer_name: row.reviewer_name,
    standard_name: row.standard_name,
    standard_serial: row.standard_serial,
    contract_id: row.contract_id,
    contract_code: row.contract_code,
    signature_count: Number(row.signature_count || 0),
    signer_name: row.signer_name,
    released_at: row.released_at,
    released_at_formatted: formatDateTime(row.released_at),
    seal: row.seal_id
      ? {
          id: Number(row.seal_id),
          seal_code: row.seal_code,
          status: row.seal_status,
          cal_date: row.seal_cal_date,
          due_date: row.seal_due_date,
        }
      : null,
  };
};

const applyCustomerScope = (
  where: string[],
  params: unknown[],
  actor?: CertificateActor,
) => {
  if (actor?.role && String(actor.role).toLowerCase() === 'customer') {
    params.push(actor.customer_id ?? 0);
    where.push(`c.id = $${params.length}`);
  }
};

// Admin/CEO chỉ làm việc với chứng thư mà HeadTech đã soát xét (Approved).
const applyAdminReviewScope = (
  where: string[],
  actor?: CertificateActor,
  pendingOnly = false,
) => {
  const role = String(actor?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'ceo') return;

  where.push(`cr.review_status = 'Approved'`);
  where.push(
    `EXISTS (
       SELECT 1 FROM accounts review_acc
       JOIN roles review_role ON review_role.id = review_acc.role_id
       WHERE review_acc.id = cr.reviewer_id
         AND LOWER(review_role.name) = 'headtechnician'
     )`,
  );

  // Danh sách Admin chỉ chứa bản HeadTech vừa duyệt chờ ký; bản Released không còn trong queue.
  if (pendingOnly) {
    where.push(`cert.status IN ('Draft', 'PendingPayment')`);
  }
};

export const listCertificates = async (
  filters: CertificateListFilter = {},
  actor?: CertificateActor,
) => {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: unknown[] = [];

  const status = (filters.status || 'all').trim();
  if (status && status !== 'all') {
    params.push(status);
    where.push(`cert.status = $${params.length}`);
  }

  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    params.push(`%${q}%`);
    where.push(`(
      LOWER(cert.certificate_no) LIKE $${params.length}
      OR LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.serial_number, '')) LIKE $${params.length}
      OR LOWER(COALESCE(c.company_name, '')) LIKE $${params.length}
    )`);
  }

  applyCustomerScope(where, params, actor);
  applyAdminReviewScope(where, actor, true);

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRows = await dataSource.query(
    `SELECT COUNT(*)::int AS total
     FROM certificates cert
     JOIN calibration_records cr ON cr.id = cert.calibration_record_id
     LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
     LEFT JOIN devices d ON d.id = sri.device_id
     LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
     LEFT JOIN customers c ON c.id = sr.customer_id
     ${whereSql}`,
    params,
  );

  const summaryRows = await dataSource.query(
    `SELECT cert.status, COUNT(*)::int AS count
     FROM certificates cert
     JOIN calibration_records cr ON cr.id = cert.calibration_record_id
     LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
     LEFT JOIN devices d ON d.id = sri.device_id
     LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
     LEFT JOIN customers c ON c.id = sr.customer_id
     ${whereSql}
     GROUP BY cert.status`,
    params,
  );

  const rows = await dataSource.query(
    `${CERTIFICATE_SELECT}
     ${whereSql}
     ORDER BY cert.created_at DESC, cert.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  const total = Number(countRows?.[0]?.total ?? 0);
  const summary: Record<string, number> = {};
  for (const item of Array.isArray(summaryRows) ? summaryRows : []) {
    summary[item.status] = Number(item.count);
  }

  return {
    items: (Array.isArray(rows) ? rows : []).map((row) =>
      mapCertificateRow(row as CertificateRow),
    ),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      total,
      draft: summary.Draft ?? 0,
      pending_payment: summary.PendingPayment ?? 0,
      released: summary.Released ?? 0,
    },
  };
};

const loadCertificateRow = async (
  certificateId: number,
  actor?: CertificateActor,
): Promise<CertificateRow> => {
  if (!Number.isInteger(certificateId) || certificateId <= 0) {
    throw new AppError(
      'Mã chứng nhận không hợp lệ.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const where: string[] = ['cert.id = $1'];
  const params: unknown[] = [certificateId];
  applyCustomerScope(where, params, actor);
  applyAdminReviewScope(where, actor);

  const rows = await dataSource.query(
    `${CERTIFICATE_SELECT} WHERE ${where.join(' AND ')} LIMIT 1`,
    params,
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError(
      `Không tìm thấy chứng nhận #${certificateId}.`,
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  return rows[0] as CertificateRow;
};

const loadMeasurements = async (calibrationRecordId: number) => {
  const rows = await dataSource.query(
    `SELECT
      md.id,
      md.repeat_no,
      md.measured_value,
      md.reference_value,
      md.deviation,
      md.uncertainty,
      md.pass_fail,
      ptp.point_no,
      ptp.nominal_value,
      ptp.tolerance,
      ptp.max_uncertainty,
      pp.name AS parameter_name,
      pp.unit
    FROM measurement_details md
    LEFT JOIN procedure_test_points ptp ON ptp.id = md.test_point_id
    LEFT JOIN procedure_parameters pp ON pp.id = ptp.parameter_id
    WHERE md.calibration_record_id = $1
    ORDER BY pp.id ASC NULLS LAST, ptp.point_no ASC NULLS LAST, md.repeat_no ASC NULLS LAST, md.id ASC`,
    [calibrationRecordId],
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: Number(row.id),
    parameter_name: row.parameter_name,
    unit: row.unit,
    point_no: row.point_no !== null ? Number(row.point_no) : null,
    repeat_no: row.repeat_no !== null ? Number(row.repeat_no) : null,
    nominal_value: row.nominal_value,
    tolerance: row.tolerance,
    max_uncertainty: row.max_uncertainty,
    measured_value: row.measured_value,
    reference_value: row.reference_value,
    deviation: row.deviation,
    uncertainty: row.uncertainty,
    pass_fail: row.pass_fail,
    result: row.pass_fail === false ? 'Fail' : 'Pass',
  }));
};

const loadSignatures = async (certificateId: number) => {
  const rows = await dataSource.query(
    `SELECT
      ds.id,
      ds.purpose,
      ds.signer_id,
      ds.signer_name,
      ds.provider,
      ds.provider_transaction_id,
      ds.document_hash,
      ds.signed_file_url,
      ds.status,
      ds.signed_at,
      ds.signature_metadata,
      a.full_name AS account_name,
      a.email AS account_email,
      r.name AS account_role
    FROM digital_signatures ds
    LEFT JOIN accounts a ON a.id = ds.signer_id
    LEFT JOIN roles r ON r.id = a.role_id
    WHERE ds.certificate_id = $1
    ORDER BY ds.id ASC`,
    [certificateId],
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: Number(row.id),
    purpose: row.purpose,
    signer_id: Number(row.signer_id),
    signer_name: row.signer_name || row.account_name || '',
    signer_email: row.account_email,
    signer_role: row.account_role,
    provider: row.provider,
    provider_transaction_id: row.provider_transaction_id,
    document_hash: row.document_hash,
    signed_file_url: row.signed_file_url,
    status: row.status,
    signed_at: row.signed_at,
    signed_at_formatted: formatDateTime(row.signed_at),
    metadata: row.signature_metadata,
  }));
};

export const getCertificateDetail = async (
  certificateId: number,
  actor?: CertificateActor,
) => {
  const row = await loadCertificateRow(certificateId, actor);
  const mapped = mapCertificateRow(row);
  const measurements = await loadMeasurements(mapped.record_id);
  const signatures = await loadSignatures(certificateId);

  return {
    ...mapped,
    measurements,
    signatures,
    release_signature:
      signatures.find((signature) => signature.purpose === 'CertificateRelease') ??
      null,
    can_sign: mapped.status !== 'Released',
    environment: `${
      row.environment_temp !== null && row.environment_temp !== undefined
        ? `${Number(row.environment_temp)}°C`
        : '—'
    } / ${
      row.environment_humidity !== null && row.environment_humidity !== undefined
        ? `${Number(row.environment_humidity)}% RH`
        : '—'
    }`,
  };
};

export const listEligibleCalibrationRecords = async () => {
  const rows = await dataSource.query(
    `SELECT
      cr.id AS calibration_record_id,
      cr.submitted_at,
      cr.reviewed_at,
      cr.result_status,
      cr.environment_temp,
      cr.environment_humidity,
      d.id AS device_id,
      d.name AS device_name,
      d.model,
      d.serial_number,
      d.internal_code,
      c.id AS customer_id,
      c.company_name AS customer_name,
      st.name AS service_name,
      st.standard_code AS service_code,
      cp.version AS procedure_version,
      tech.full_name AS technician_name,
      reviewer.full_name AS reviewer_name,
      ct.id AS contract_id,
      ct.contract_code
    FROM calibration_records cr
    LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
    LEFT JOIN devices d ON d.id = sri.device_id
    LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
    LEFT JOIN customers c ON c.id = sr.customer_id
    LEFT JOIN calibration_procedures cp ON cp.id = cr.procedure_id
    LEFT JOIN service_types st ON st.id = cp.service_type_id
    LEFT JOIN accounts tech ON tech.id = cr.technician_id
    LEFT JOIN accounts reviewer ON reviewer.id = cr.reviewer_id
    LEFT JOIN LATERAL (
      SELECT woa.work_order_id
      FROM work_order_assignments woa
      WHERE woa.service_request_item_id = cr.service_request_item_id
      ORDER BY woa.id DESC
      LIMIT 1
    ) woa ON true
    LEFT JOIN work_orders wo ON wo.id = woa.work_order_id
    LEFT JOIN contracts ct ON ct.id = wo.contract_id
    WHERE cr.review_status = 'Approved'
      AND COALESCE(cr.result_status, 'Pass') <> 'Fail'
      AND NOT EXISTS (
        SELECT 1 FROM certificates cert WHERE cert.calibration_record_id = cr.id
      )
    ORDER BY cr.reviewed_at DESC NULLS LAST, cr.id DESC`,
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    record_id: Number(row.calibration_record_id),
    record_code: `CR-${row.calibration_record_id}`,
    submitted_at: row.submitted_at,
    submitted_at_formatted: formatDateTime(row.submitted_at),
    reviewed_at: row.reviewed_at,
    reviewed_at_formatted: formatDateTime(row.reviewed_at),
    result_status: row.result_status,
    environment_temp: row.environment_temp,
    environment_humidity: row.environment_humidity,
    device_id: row.device_id,
    device_name: row.device_name,
    model: row.model,
    serial_number: row.serial_number,
    internal_code: row.internal_code,
    customer_id: row.customer_id,
    customer_name: row.customer_name,
    service_name: row.service_name,
    service_code: row.service_code,
    procedure_version: row.procedure_version,
    technician_name: row.technician_name,
    reviewer_name: row.reviewer_name,
    contract_id: row.contract_id,
    contract_code: row.contract_code,
  }));
};

const nextCertificateNo = async (queryRunner: {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
}): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `CN-${year}-`;

  const rows = (await queryRunner.query(
    `SELECT certificate_no
     FROM certificates
     WHERE certificate_no LIKE $1`,
    [`${prefix}%`],
  )) as Array<{ certificate_no: string }>;

  // Chỉ xét các mã có đuôi là số (CN-<year>-0001). Bỏ qua mã test như CN-2026-TEST-02
  // để không trả về CN-2026-0001 bị trùng khi sort chuỗi.
  let maxSequence = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const suffix = String(row.certificate_no).slice(prefix.length);
    if (/^\d+$/.test(suffix)) {
      maxSequence = Math.max(maxSequence, Number(suffix));
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
};

export const issueCertificate = async (
  input: { calibration_record_id: number },
  actor: CertificateActor,
) => {
  const recordId = Number(input.calibration_record_id);

  if (!Number.isInteger(recordId) || recordId <= 0) {
    throw new AppError(
      'Vui lòng chọn hồ sơ hiệu chuẩn hợp lệ (calibration_record_id).',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const recordRows = await dataSource.query(
    `SELECT id, review_status, result_status
     FROM calibration_records
     WHERE id = $1
     LIMIT 1`,
    [recordId],
  );

  if (!Array.isArray(recordRows) || recordRows.length === 0) {
    throw new AppError(
      `Không tìm thấy hồ sơ hiệu chuẩn #${recordId}.`,
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  const record = recordRows[0];

  if (record.review_status !== 'Approved') {
    throw new AppError(
      `Hồ sơ hiệu chuẩn #${recordId} chưa được duyệt (trạng thái hiện tại: ${record.review_status}). Chỉ cấp chứng nhận cho hồ sơ đã duyệt.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  if (record.result_status === 'Fail') {
    throw new AppError(
      `Hồ sơ hiệu chuẩn #${recordId} không đạt (Fail) nên không thể cấp chứng nhận.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const existingRows = await dataSource.query(
    `SELECT id, certificate_no FROM certificates WHERE calibration_record_id = $1 LIMIT 1`,
    [recordId],
  );

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    throw new AppError(
      `Hồ sơ hiệu chuẩn #${recordId} đã có chứng nhận ${existingRows[0].certificate_no}.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let certificateId: number;

  try {
    // Khóa tuần tự để tránh trùng số chứng nhận khi nhiều yêu cầu đồng thời
    await queryRunner.query(`SELECT pg_advisory_xact_lock(918273645)`);

    const certificateNo = await nextCertificateNo(queryRunner);

    const inserted = await queryRunner.query(
      `INSERT INTO certificates (
         calibration_record_id,
         certificate_no,
         status,
         created_at
       ) VALUES ($1, $2, 'Draft', NOW())
       RETURNING id`,
      [recordId, certificateNo],
    );

    certificateId = Number(inserted[0].id);
    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  const detail = await getCertificateDetail(certificateId, actor);
  const pdf = await saveCertificatePdf(await buildCertificatePdfData(detail));

  await dataSource.query(`UPDATE certificates SET file_url = $1 WHERE id = $2`, [
    pdf.fileUrl,
    certificateId,
  ]);

  return getCertificateDetail(certificateId, actor);
};

const resolveSignerName = async (
  actor: CertificateActor,
): Promise<string | null> => {
  if (actor.full_name) return actor.full_name;
  const rows = await dataSource.query(
    `SELECT full_name FROM accounts WHERE id = $1 LIMIT 1`,
    [actor.id],
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0].full_name : null;
};

export const signCertificate = async (
  certificateId: number,
  actor: CertificateActor,
) => {
  const detail = await getCertificateDetail(certificateId, actor);

  if (!detail.can_sign) {
    throw new AppError(
      `Chứng nhận ${detail.certificate_no} đã được phát hành, không thể ký lại.`,
      409,
      ERROR_CODES.CONFLICT,
    );
  }

  const signerName = await resolveSignerName(actor);
  const signedAt = new Date();

  const snapshot = {
    certificate_id: detail.id,
    certificate_no: detail.certificate_no,
    calibration_record_id: detail.record_id,
    device_id: detail.device_id,
    customer_id: detail.customer_id,
    service_name: detail.service_name,
    procedure_version: detail.procedure_version,
    result_status: detail.result_status,
    measurements: detail.measurements.map(
      (measurement: { point_no: number | null; nominal_value: unknown; measured_value: unknown; pass_fail: boolean | null }) => ({
        point_no: measurement.point_no,
        nominal_value: measurement.nominal_value,
        measured_value: measurement.measured_value,
        pass_fail: measurement.pass_fail,
      }),
    ),
    released_at: signedAt.toISOString(),
  };

  const documentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(snapshot))
    .digest('hex');
  const signatureValue = crypto
    .createHash('sha256')
    .update(`${documentHash}:${actor.id}:${signedAt.getTime()}`)
    .digest('hex');
  const transactionId = `CERT-${new Date().getFullYear()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const lockedRows = await queryRunner.query(
      `SELECT id, status FROM certificates WHERE id = $1 FOR UPDATE`,
      [certificateId],
    );

    if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
      throw new AppError(
        `Không tìm thấy chứng nhận #${certificateId}.`,
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    if (lockedRows[0].status === 'Released') {
      throw new AppError(
        `Chứng nhận ${detail.certificate_no} đã được phát hành, không thể ký lại.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const duplicateRows = await queryRunner.query(
      `SELECT id FROM digital_signatures
       WHERE certificate_id = $1 AND purpose = 'CertificateRelease'
       LIMIT 1`,
      [certificateId],
    );

    if (Array.isArray(duplicateRows) && duplicateRows.length > 0) {
      throw new AppError(
        `Chứng nhận ${detail.certificate_no} đã có chữ ký phát hành.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    await queryRunner.query(
      `INSERT INTO digital_signatures (
         contract_id,
         calibration_record_id,
         certificate_id,
         purpose,
         signer_id,
         signer_name,
         provider,
         provider_transaction_id,
         document_hash,
         signature_value,
         signature_metadata,
         status,
         signed_at,
         created_at
       ) VALUES (
         $1, $2, $3, 'CertificateRelease', $4, $5,
         'ISOCAL-PKI-SHA256', $6, $7, $8, $9::jsonb, 'Signed', $10, $10
       )`,
      [
        detail.contract_id,
        detail.record_id,
        certificateId,
        actor.id,
        signerName,
        transactionId,
        documentHash,
        signatureValue,
        JSON.stringify({
          purpose: 'CertificateRelease',
          certificate_id: certificateId,
          certificate_no: detail.certificate_no,
          calibration_record_id: detail.record_id,
          snapshot_hash: documentHash,
          signed_at: signedAt.toISOString(),
        }),
        signedAt,
      ],
    );

    await queryRunner.query(
      `UPDATE certificates
       SET status = 'Released', issued_at = $2
       WHERE id = $1`,
      [certificateId, signedAt],
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  const updatedDetail = await getCertificateDetail(certificateId, actor);
  const pdf = await saveCertificatePdf(
    await buildCertificatePdfData(updatedDetail),
  );

  await dataSource.query(
    `UPDATE certificates SET file_url = $1 WHERE id = $2`,
    [pdf.fileUrl, certificateId],
  );
  await dataSource.query(
    `UPDATE digital_signatures
     SET document_hash = $1, signed_file_url = $2
     WHERE certificate_id = $3 AND purpose = 'CertificateRelease'`,
    [pdf.hash, pdf.fileUrl, certificateId],
  );

  return getCertificateDetail(certificateId, actor);
};

const loadCompanyProfile = async () => {
  const rows = await dataSource.query(
    `SELECT name, address, phone, tax_code
     FROM company_profiles
     WHERE is_default = true
     ORDER BY id ASC
     LIMIT 1`,
  );

  if (Array.isArray(rows) && rows.length > 0) {
    return {
      name: rows[0].name as string,
      address: (rows[0].address as string | null) ?? null,
      phone: (rows[0].phone as string | null) ?? null,
      tax_code: (rows[0].tax_code as string | null) ?? null,
    };
  }

  return {
    name: 'CÔNG TY CỔ PHẦN ISOCAL',
    address: null,
    phone: null,
    tax_code: null,
  };
};

const buildCertificatePdfData = async (
  detail: Awaited<ReturnType<typeof getCertificateDetail>>,
): Promise<CertificatePdfData> => {
  const company = await loadCompanyProfile();

  const measurements: CertificatePdfMeasurement[] = detail.measurements.map(
    (measurement: {
      parameter_name: string | null;
      unit: string | null;
      point_no: number | null;
      nominal_value: unknown;
      tolerance: unknown;
      repeat_no: number | null;
      measured_value: unknown;
      reference_value: unknown;
      deviation: unknown;
      uncertainty: unknown;
      pass_fail: boolean | null;
    }) => ({
      parameter_name: measurement.parameter_name,
      unit: measurement.unit,
      point_no: measurement.point_no,
      nominal_value: measurement.nominal_value as string | number | null,
      tolerance: measurement.tolerance as string | number | null,
      repeat_no: measurement.repeat_no,
      measured_value: measurement.measured_value as string | number | null,
      reference_value: measurement.reference_value as string | number | null,
      deviation: measurement.deviation as string | number | null,
      uncertainty: measurement.uncertainty as string | number | null,
      pass_fail: measurement.pass_fail,
    }),
  );

  const releaseSignature = detail.release_signature;

  return {
    certificate: {
      id: detail.id,
      certificate_no: detail.certificate_no,
      status: detail.status,
      issued_at: detail.issued_at,
      created_at: detail.created_at,
    },
    company,
    customer: {
      name: detail.customer_name,
      address: detail.customer_address,
      tax_code: detail.customer_tax_code,
    },
    device: {
      name: detail.device_name,
      model: detail.model,
      manufacturer: detail.manufacturer,
      serial_number: detail.serial_number,
      internal_code: detail.internal_code,
      measuring_range: detail.measuring_range,
    },
    calibration: {
      record_id: detail.record_id,
      service_name: detail.service_name,
      service_code: detail.service_code,
      procedure_version: detail.procedure_version,
      result_status: detail.result_status,
      environment_temp: detail.environment_temp,
      environment_humidity: detail.environment_humidity,
      submitted_at: detail.submitted_at,
      reviewed_at: detail.reviewed_at,
      technician_name: detail.technician_name,
      reviewer_name: detail.reviewer_name,
      standard_name: detail.standard_name,
      standard_serial: detail.standard_serial,
    },
    measurements,
    signature: releaseSignature
      ? {
          signer_name: releaseSignature.signer_name,
          signed_at: releaseSignature.signed_at,
          provider_transaction_id: releaseSignature.provider_transaction_id,
          document_hash: releaseSignature.document_hash,
        }
      : null,
  };
};

export const getCertificatePdf = async (
  certificateId: number,
  actor?: CertificateActor,
) => {
  const detail = await getCertificateDetail(certificateId, actor);
  const pdf = await saveCertificatePdf(await buildCertificatePdfData(detail));

  if (detail.file_url !== pdf.fileUrl) {
    await dataSource.query(`UPDATE certificates SET file_url = $1 WHERE id = $2`, [
      pdf.fileUrl,
      certificateId,
    ]);
  }

  return {
    absolutePath: pdf.absolutePath,
    fileName: `certificate-${detail.certificate_no}.pdf`,
    fileUrl: pdf.fileUrl,
  };
};

export const findCertificateIdByCalibrationRecord = async (
  calibrationRecordId: number,
): Promise<number | null> => {
  const rows = await dataSource.query(
    `SELECT id FROM certificates WHERE calibration_record_id = $1 LIMIT 1`,
    [calibrationRecordId],
  );
  return Array.isArray(rows) && rows.length > 0 ? Number(rows[0].id) : null;
};

export const formatCertificateDate = formatDate;
