import crypto from 'node:crypto';
import dataSource from '../../database/dataSource.js';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';
import {
  buildSealVerifyUrl,
  generateSealPdfBuffer,
  generateSealQrPng,
  type SealStickerData,
} from './seal-pdf.service.js';

export interface SealActor {
  id: number;
  full_name?: string | null;
  role?: string | null;
  customer_id?: number | null;
}

export interface SealListFilter {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateSealInput {
  certificate_id: number;
  due_date?: string | null;
}

export interface CreateRevocationInput {
  reason: string;
  note?: string | null;
}

export interface DecideRevocationInput {
  decision: string;
  decision_note?: string | null;
}

interface SealRow {
  id: number;
  seal_code: string;
  status: string;
  cal_date: string;
  due_date: string;
  issued_at: Date;
  created_at: Date;
  device_id: number;
  device_name: string;
  model: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  internal_code: string;
  measuring_range: string | null;
  customer_id: number;
  customer_name: string;
  customer_address: string | null;
  customer_tax_code: string | null;
  device_next_due_date: string | null;
  certificate_id: number;
  certificate_no: string;
  certificate_status: string;
  certificate_issued_at: Date | null;
  certificate_file_url: string | null;
  calibration_record_id: number;
  service_name: string | null;
  service_code: string | null;
  procedure_version: string | null;
  result_status: string | null;
  technician_name: string | null;
  reviewer_name: string | null;
  signer_name: string | null;
  signed_at: Date | null;
  signature_transaction_id: string | null;
  days_remaining: number | null;
  revocation_id: number | null;
  revocation_status: string | null;
  revocation_reason: string | null;
  revocation_created_at: Date | null;
}

const SEAL_STATUS_LABELS: Record<string, string> = {
  Active: 'Đang hiệu lực',
  PendingPayment: 'Chờ thanh toán',
  Expired: 'Hết hạn',
  Revoked: 'Đã thu hồi',
};

const SEAL_SELECT = `
  SELECT
    s.id,
    s.seal_code,
    s.status,
    to_char(s.cal_date, 'YYYY-MM-DD') AS cal_date,
    to_char(s.due_date, 'YYYY-MM-DD') AS due_date,
    s.issued_at,
    s.created_at,
    d.id AS device_id,
    d.name AS device_name,
    d.model,
    d.manufacturer,
    d.serial_number,
    d.internal_code,
    d.measuring_range,
    d.customer_id,
    c.company_name AS customer_name,
    c.address AS customer_address,
    c.tax_code AS customer_tax_code,
    to_char(d.next_due_date, 'YYYY-MM-DD') AS device_next_due_date,
    cert.id AS certificate_id,
    cert.certificate_no,
    cert.status AS certificate_status,
    cert.issued_at AS certificate_issued_at,
    cert.file_url AS certificate_file_url,
    cr.id AS calibration_record_id,
    cr.result_status,
    st.name AS service_name,
    st.standard_code AS service_code,
    cp.version AS procedure_version,
    tech.full_name AS technician_name,
    reviewer.full_name AS reviewer_name,
    release_sig.signer_name,
    release_sig.signed_at,
    release_sig.provider_transaction_id AS signature_transaction_id,
    (s.due_date - CURRENT_DATE) AS days_remaining,
    rev.id AS revocation_id,
    rev.status AS revocation_status,
    rev.reason AS revocation_reason,
    rev.created_at AS revocation_created_at
  FROM seals s
  JOIN devices d ON d.id = s.device_id
  JOIN customers c ON c.id = d.customer_id
  JOIN certificates cert ON cert.id = s.certificate_id
  JOIN calibration_records cr ON cr.id = cert.calibration_record_id
  LEFT JOIN calibration_procedures cp ON cp.id = cr.procedure_id
  LEFT JOIN service_types st ON st.id = cp.service_type_id
  LEFT JOIN accounts tech ON tech.id = cr.technician_id
  LEFT JOIN accounts reviewer ON reviewer.id = cr.reviewer_id
  LEFT JOIN LATERAL (
    SELECT ds.signer_name, ds.signed_at, ds.provider_transaction_id
    FROM digital_signatures ds
    WHERE ds.certificate_id = cert.id
      AND ds.purpose = 'CertificateRelease'
    ORDER BY ds.id DESC
    LIMIT 1
  ) release_sig ON true
  LEFT JOIN LATERAL (
    SELECT r.id, r.status, r.reason, r.created_at
    FROM seal_revocations r
    WHERE r.seal_id = s.id
    ORDER BY r.id DESC
    LIMIT 1
  ) rev ON true
`;

const formatDate = (value: Date | string | null | undefined): string => {
  if (!value) return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
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

const mapSealRow = (row: SealRow) => {
  const daysRemaining =
    row.days_remaining === null || row.days_remaining === undefined
      ? null
      : Number(row.days_remaining);

  const deviceParts = [row.device_name];
  if (row.model) deviceParts.push(`Model: ${row.model}`);
  if (row.serial_number) deviceParts.push(`SN: ${row.serial_number}`);

  return {
    id: Number(row.id),
    seal_code: row.seal_code,
    code: row.seal_code,
    status: row.status,
    status_label: SEAL_STATUS_LABELS[row.status] ?? row.status,
    cal_date: row.cal_date,
    due_date: row.due_date,
    cal_date_formatted: formatDate(row.cal_date),
    due_date_formatted: formatDate(row.due_date),
    issued_at: row.issued_at,
    issued_at_formatted: formatDateTime(row.issued_at),
    created_at: row.created_at,
    days_remaining: daysRemaining,
    is_expired: row.status === 'Expired' || (daysRemaining !== null && daysRemaining < 0),
    is_expiring_soon:
      row.status === 'Active' &&
      daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining <= 30,
    device_id: Number(row.device_id),
    device_name: row.device_name,
    device: deviceParts.filter(Boolean).join(' · '),
    model: row.model,
    manufacturer: row.manufacturer,
    serial_number: row.serial_number,
    internal_code: row.internal_code,
    measuring_range: row.measuring_range,
    device_next_due_date: row.device_next_due_date,
    customer_id: Number(row.customer_id),
    customer_name: row.customer_name,
    customer: row.customer_name,
    customer_address: row.customer_address,
    customer_tax_code: row.customer_tax_code,
    certificate_id: Number(row.certificate_id),
    certificate_no: row.certificate_no,
    certificate_status: row.certificate_status,
    certificate_issued_at: row.certificate_issued_at,
    certificate_file_url: row.certificate_file_url,
    record_id: Number(row.calibration_record_id),
    record_code: `CR-${row.calibration_record_id}`,
    service_name: row.service_name,
    service_code: row.service_code,
    procedure_version: row.procedure_version,
    result_status: row.result_status,
    technician_name: row.technician_name,
    reviewer_name: row.reviewer_name,
    signer_name: row.signer_name,
    signed_at: row.signed_at,
    signed_at_formatted: formatDateTime(row.signed_at),
    signature_transaction_id: row.signature_transaction_id,
    revocation: row.revocation_id
      ? {
          id: Number(row.revocation_id),
          status: row.revocation_status,
          reason: row.revocation_reason,
          created_at: row.revocation_created_at,
          created_at_formatted: formatDateTime(row.revocation_created_at),
        }
      : null,
    verify_url: buildSealVerifyUrl(row.seal_code),
  };
};

const applyCustomerScope = (
  where: string[],
  params: unknown[],
  actor?: SealActor,
) => {
  if (actor?.role && String(actor.role).toLowerCase() === 'customer') {
    params.push(actor.customer_id ?? 0);
    where.push(`d.customer_id = $${params.length}`);
  }
};

/**
 * FR-F8: tem Active quá due_date phải tự động chuyển Expired.
 * FR-D6: khi tem hết hiệu lực, thiết bị cũng phải phản ánh trạng thái Expired
 * nếu không còn tem Active/PendingPayment nào khác.
 */
export const expireOverdueSeals = async (): Promise<void> => {
  await dataSource.query(
    `UPDATE seals
     SET status = 'Expired'
     WHERE status = 'Active'
       AND due_date < CURRENT_DATE`,
  );

  await dataSource.query(
    `UPDATE devices d
     SET status = 'Expired'
     WHERE d.status IN ('Active', 'ExpiringSoon')
       AND EXISTS (
         SELECT 1
         FROM seals s
         WHERE s.device_id = d.id
           AND s.status = 'Expired'
           AND s.due_date < CURRENT_DATE
       )
       AND NOT EXISTS (
         SELECT 1
         FROM seals s
         WHERE s.device_id = d.id
           AND s.status IN ('Active', 'PendingPayment')
       )`,
  );

  await dataSource.query(
    `UPDATE devices d
     SET status = 'ExpiringSoon'
     WHERE d.status = 'Active'
       AND EXISTS (
         SELECT 1
         FROM seals s
         WHERE s.device_id = d.id
           AND s.status = 'Active'
           AND s.due_date >= CURRENT_DATE
           AND s.due_date <= (CURRENT_DATE + INTERVAL '30 days')
       )`,
  );
};

const buildWhere = (
  filters: SealListFilter,
  actor: SealActor | undefined,
  includeStatus: boolean,
) => {
  const where: string[] = [];
  const params: unknown[] = [];

  const status = (filters.status || 'all').trim();
  if (includeStatus && status && status !== 'all') {
    if (status === 'ExpiringSoon') {
      where.push(
        `s.status = 'Active'
         AND s.due_date >= CURRENT_DATE
         AND s.due_date <= (CURRENT_DATE + INTERVAL '30 days')`,
      );
    } else {
      params.push(status);
      where.push(`s.status = $${params.length}`);
    }
  }

  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    params.push(`%${q}%`);
    where.push(`(
      LOWER(s.seal_code) LIKE $${params.length}
      OR LOWER(COALESCE(d.name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.serial_number, '')) LIKE $${params.length}
      OR LOWER(COALESCE(d.internal_code, '')) LIKE $${params.length}
      OR LOWER(COALESCE(c.company_name, '')) LIKE $${params.length}
      OR LOWER(COALESCE(cert.certificate_no, '')) LIKE $${params.length}
    )`);
  }

  applyCustomerScope(where, params, actor);

  return {
    whereSql: where.length > 0 ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
};

export const listSeals = async (
  filters: SealListFilter = {},
  actor?: SealActor,
) => {
  await expireOverdueSeals();

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(filters.limit) || 20));
  const offset = (page - 1) * limit;

  const filtered = buildWhere(filters, actor, true);
  const base = buildWhere(filters, actor, false);

  const countRows = await dataSource.query(
    `SELECT COUNT(*)::int AS total
     FROM seals s
     JOIN devices d ON d.id = s.device_id
     JOIN customers c ON c.id = d.customer_id
     JOIN certificates cert ON cert.id = s.certificate_id
     ${filtered.whereSql}`,
    filtered.params,
  );

  const summaryRows = await dataSource.query(
    `SELECT s.status, COUNT(*)::int AS count
     FROM seals s
     JOIN devices d ON d.id = s.device_id
     JOIN customers c ON c.id = d.customer_id
     JOIN certificates cert ON cert.id = s.certificate_id
     ${base.whereSql}
     GROUP BY s.status`,
    base.params,
  );

  const expiringRows = await dataSource.query(
    `SELECT COUNT(*)::int AS count
     FROM seals s
     JOIN devices d ON d.id = s.device_id
     JOIN customers c ON c.id = d.customer_id
     JOIN certificates cert ON cert.id = s.certificate_id
     ${base.whereSql ? `${base.whereSql} AND` : 'WHERE'}
       s.status = 'Active'
       AND s.due_date >= CURRENT_DATE
       AND s.due_date <= (CURRENT_DATE + INTERVAL '30 days')`,
    base.params,
  );

  const rows = await dataSource.query(
    `${SEAL_SELECT}
     ${filtered.whereSql}
     ORDER BY
       CASE s.status
         WHEN 'Active' THEN 0
         WHEN 'PendingPayment' THEN 1
         WHEN 'Expired' THEN 2
         ELSE 3
       END,
       s.due_date ASC,
       s.id DESC
     LIMIT $${filtered.params.length + 1} OFFSET $${filtered.params.length + 2}`,
    [...filtered.params, limit, offset],
  );

  const total = Number(countRows?.[0]?.total ?? 0);
  const summary: Record<string, number> = {};
  for (const item of Array.isArray(summaryRows) ? summaryRows : []) {
    summary[item.status] = Number(item.count);
  }

  return {
    items: (Array.isArray(rows) ? rows : []).map((row) =>
      mapSealRow(row as SealRow),
    ),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      total,
      active: summary.Active ?? 0,
      pending_payment: summary.PendingPayment ?? 0,
      expired: summary.Expired ?? 0,
      revoked: summary.Revoked ?? 0,
      expiring_soon: Number(expiringRows?.[0]?.count ?? 0),
    },
  };
};

const loadSealRow = async (
  sealId: number,
  actor?: SealActor,
): Promise<SealRow> => {
  if (!Number.isInteger(sealId) || sealId <= 0) {
    throw new AppError('Mã tem không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const where: string[] = ['s.id = $1'];
  const params: unknown[] = [sealId];
  applyCustomerScope(where, params, actor);

  const rows = await dataSource.query(
    `${SEAL_SELECT} WHERE ${where.join(' AND ')} LIMIT 1`,
    params,
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError(
      `Không tìm thấy tem #${sealId}.`,
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  return rows[0] as SealRow;
};

const loadRevocations = async (sealId: number) => {
  const rows = await dataSource.query(
    `SELECT
       r.id,
       r.seal_id,
       r.reason,
       r.status,
       r.requested_by,
       r.decided_by,
       r.decided_at,
       r.decision_note,
       r.created_at,
       requester.full_name AS requested_by_name,
       decider.full_name AS decided_by_name,
       sig.id AS signature_id,
       sig.provider_transaction_id AS signature_transaction_id,
       sig.document_hash AS signature_document_hash,
       sig.signer_name AS signature_signer_name,
       sig.signed_at AS signature_signed_at
     FROM seal_revocations r
     LEFT JOIN accounts requester ON requester.id = r.requested_by
     LEFT JOIN accounts decider ON decider.id = r.decided_by
     LEFT JOIN LATERAL (
       SELECT
         ds.id,
         ds.provider_transaction_id,
         ds.document_hash,
         ds.signer_name,
         ds.signed_at
       FROM digital_signatures ds
       WHERE ds.seal_revocation_id = r.id
         AND ds.purpose = 'SealRevocation'
         AND ds.status = 'Signed'
       ORDER BY ds.id DESC
       LIMIT 1
     ) sig ON true
     WHERE r.seal_id = $1
     ORDER BY r.id DESC`,
    [sealId],
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: Number(row.id),
    seal_id: Number(row.seal_id),
    reason: row.reason,
    status: row.status,
    requested_by: Number(row.requested_by),
    requested_by_name: row.requested_by_name,
    decided_by: row.decided_by !== null ? Number(row.decided_by) : null,
    decided_by_name: row.decided_by_name,
    decided_at: row.decided_at,
    decided_at_formatted: formatDateTime(row.decided_at),
    decision_note: row.decision_note,
    signature: row.signature_id
      ? {
          id: Number(row.signature_id),
          transaction_id: row.signature_transaction_id,
          document_hash: row.signature_document_hash,
          signer_name: row.signature_signer_name,
          signed_at: row.signature_signed_at,
          signed_at_formatted: formatDateTime(row.signature_signed_at),
        }
      : null,
    created_at: row.created_at,
    created_at_formatted: formatDateTime(row.created_at),
  }));
};

const loadVerificationLogs = async (sealId: number) => {
  const rows = await dataSource.query(
    `SELECT id, seal_code, verification_result, source_ip, user_agent, verified_at
     FROM seal_verification_logs
     WHERE seal_id = $1
     ORDER BY verified_at DESC, id DESC
     LIMIT 20`,
    [sealId],
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: Number(row.id),
    seal_code: row.seal_code,
    verification_result: row.verification_result,
    source_ip: row.source_ip,
    user_agent: row.user_agent,
    verified_at: row.verified_at,
    verified_at_formatted: formatDateTime(row.verified_at),
  }));
};

export interface VerificationLogFilter {
  q?: string;
  page?: number;
  limit?: number;
}

/** Danh sách lượt tra cứu công khai cho màn hình nội bộ (Admin, Reviewer). */
export const listVerificationLogs = async (filter: VerificationLogFilter) => {
  const q = filter.q?.trim() ?? '';
  const page =
    Number.isInteger(filter.page) && Number(filter.page) > 0 ? Number(filter.page) : 1;
  const requestedLimit = Number(filter.limit);
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 200)
      : 50;
  const offset = (page - 1) * limit;

  const params: unknown[] = [];
  const conditions: string[] = [];
  if (q) {
    params.push(`%${q}%`);
    conditions.push(
      `(l.seal_code ILIKE $${params.length} OR l.source_ip ILIKE $${params.length} OR l.verification_result ILIKE $${params.length})`,
    );
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await dataSource.query(
    `SELECT COUNT(*)::int AS total
     FROM seal_verification_logs l
     ${where}`,
    params,
  );
  const total = Number(Array.isArray(countRows) ? countRows[0]?.total ?? 0 : 0);

  const rows = await dataSource.query(
    `SELECT
       l.id,
       l.seal_id,
       l.seal_code,
       l.verification_result,
       l.source_ip,
       l.user_agent,
       l.verified_at,
       s.status AS seal_status
     FROM seal_verification_logs l
     LEFT JOIN seals s ON s.id = l.seal_id
     ${where}
     ORDER BY l.verified_at DESC, l.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset],
  );

  return {
    items: (Array.isArray(rows) ? rows : []).map((row) => ({
      id: Number(row.id),
      seal_id: row.seal_id === null || row.seal_id === undefined ? null : Number(row.seal_id),
      seal_code: row.seal_code,
      verification_result: row.verification_result,
      source_ip: row.source_ip,
      user_agent: row.user_agent,
      verified_at: row.verified_at,
      verified_at_formatted: formatDateTime(row.verified_at),
      seal_status: row.seal_status ?? null,
    })),
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

export const getSealDetail = async (sealId: number, actor?: SealActor) => {
  await expireOverdueSeals();

  const row = await loadSealRow(sealId, actor);
  const mapped = mapSealRow(row);
  const revocations = await loadRevocations(sealId);
  const verificationLogs = await loadVerificationLogs(sealId);
  const pendingRevocation =
    revocations.find((revocation) => revocation.status === 'Pending') ?? null;

  return {
    ...mapped,
    revocations,
    pending_revocation: pendingRevocation,
    verification: {
      total: verificationLogs.length,
      last_verified_at:
        verificationLogs.length > 0 ? verificationLogs[0].verified_at : null,
      last_verified_at_formatted:
        verificationLogs.length > 0
          ? verificationLogs[0].verified_at_formatted
          : '—',
      recent: verificationLogs,
    },
    can_revoke:
      (mapped.status === 'Active' || mapped.status === 'Expired') &&
      !pendingRevocation,
  };
};

export const listEligibleCertificates = async () => {
  const rows = await dataSource.query(
    `SELECT
       cert.id AS certificate_id,
       cert.certificate_no,
       cert.status AS certificate_status,
       cert.issued_at AS certificate_issued_at,
       cert.file_url AS certificate_file_url,
       cr.id AS calibration_record_id,
       cr.result_status,
       d.id AS device_id,
       d.name AS device_name,
       d.model,
       d.serial_number,
       d.internal_code,
       d.measuring_range,
       c.id AS customer_id,
       c.company_name AS customer_name,
       st.name AS service_name,
       st.standard_code AS service_code,
       cp.version AS procedure_version,
       release_sig.signer_name,
       release_sig.signed_at,
       to_char(
         (COALESCE(cr.reviewed_at, cr.submitted_at, cert.issued_at)
           AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
         'YYYY-MM-DD'
       ) AS default_cal_date,
       to_char(
         ((COALESCE(cr.reviewed_at, cr.submitted_at, cert.issued_at)
           AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + INTERVAL '12 months')::date,
         'YYYY-MM-DD'
       ) AS default_due_date
     FROM certificates cert
     JOIN calibration_records cr ON cr.id = cert.calibration_record_id
     LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
     LEFT JOIN devices d ON d.id = sri.device_id
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN calibration_procedures cp ON cp.id = cr.procedure_id
     LEFT JOIN service_types st ON st.id = cp.service_type_id
     LEFT JOIN LATERAL (
       SELECT ds.signer_name, ds.signed_at
       FROM digital_signatures ds
       WHERE ds.certificate_id = cert.id
         AND ds.purpose = 'CertificateRelease'
         AND ds.status = 'Signed'
       ORDER BY ds.id DESC
       LIMIT 1
     ) release_sig ON true
     WHERE cert.status = 'Released'
       AND release_sig.signed_at IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM seals s WHERE s.certificate_id = cert.id
       )
     ORDER BY cert.issued_at DESC NULLS LAST, cert.id DESC`,
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    certificate_id: Number(row.certificate_id),
    certificate_no: row.certificate_no,
    certificate_status: row.certificate_status,
    certificate_issued_at: row.certificate_issued_at,
    certificate_issued_at_formatted: formatDateTime(row.certificate_issued_at),
    certificate_file_url: row.certificate_file_url,
    record_id: Number(row.calibration_record_id),
    record_code: `CR-${row.calibration_record_id}`,
    result_status: row.result_status,
    device_id: row.device_id !== null ? Number(row.device_id) : null,
    device_name: row.device_name,
    model: row.model,
    serial_number: row.serial_number,
    internal_code: row.internal_code,
    measuring_range: row.measuring_range,
    customer_id: row.customer_id !== null ? Number(row.customer_id) : null,
    customer_name: row.customer_name,
    service_name: row.service_name,
    service_code: row.service_code,
    procedure_version: row.procedure_version,
    signer_name: row.signer_name,
    signed_at: row.signed_at,
    signed_at_formatted: formatDateTime(row.signed_at),
    default_cal_date: row.default_cal_date,
    default_due_date: row.default_due_date,
    default_due_date_formatted: formatDate(row.default_due_date),
  }));
};

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const nextSealCode = async (queryRunner: {
  query: (sql: string, params?: unknown[]) => Promise<unknown>;
}): Promise<string> => {
  await queryRunner.query(`SELECT pg_advisory_xact_lock(918273646)`);

  const year = String(new Date().getFullYear()).slice(-2);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `ISO-${year}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const rows = (await queryRunner.query(
      `SELECT 1 FROM seals WHERE seal_code = $1 LIMIT 1`,
      [code],
    )) as unknown[];
    if (!Array.isArray(rows) || rows.length === 0) return code;
  }

  throw new AppError(
    'Không thể sinh mã tem duy nhất, vui lòng thử lại.',
    500,
    ERROR_CODES.INTERNAL_ERROR,
  );
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { code?: string }).code === '23505';

export const createSeal = async (input: CreateSealInput, actor: SealActor) => {
  const certificateId = Number(input.certificate_id);
  if (!Number.isInteger(certificateId) || certificateId <= 0) {
    throw new AppError(
      'Vui lòng chọn chứng nhận hợp lệ (certificate_id).',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  await expireOverdueSeals();

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  let sealId: number;

  try {
    const certificateRows = await queryRunner.query(
      `SELECT
         cert.id,
         cert.certificate_no,
         cert.status,
         COALESCE(cr.reviewed_at, cr.submitted_at, cert.issued_at) AS cal_source,
         d.id AS device_id
       FROM certificates cert
       JOIN calibration_records cr ON cr.id = cert.calibration_record_id
       LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
       LEFT JOIN devices d ON d.id = sri.device_id
       WHERE cert.id = $1
       FOR UPDATE OF cert`,
      [certificateId],
    );

    if (!Array.isArray(certificateRows) || certificateRows.length === 0) {
      throw new AppError(
        `Không tìm thấy chứng nhận #${certificateId}.`,
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    const certificate = certificateRows[0];

    if (certificate.status !== 'Released') {
      throw new AppError(
        `Chứng nhận ${certificate.certificate_no} chưa được phát hành (trạng thái hiện tại: ${certificate.status}). Chỉ cấp tem cho chứng nhận đã phát hành.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const signatureRows = await queryRunner.query(
      `SELECT id
       FROM digital_signatures
       WHERE certificate_id = $1
         AND purpose = 'CertificateRelease'
         AND status = 'Signed'
       LIMIT 1`,
      [certificateId],
    );

    if (!Array.isArray(signatureRows) || signatureRows.length === 0) {
      throw new AppError(
        `Chứng nhận ${certificate.certificate_no} chưa có chữ ký số phát hành hợp lệ, không thể cấp tem.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    if (!certificate.device_id) {
      throw new AppError(
        `Chứng nhận ${certificate.certificate_no} không gắn với thiết bị nào, không thể cấp tem.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const existingRows = await queryRunner.query(
      `SELECT id, seal_code FROM seals WHERE certificate_id = $1 LIMIT 1`,
      [certificateId],
    );

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      throw new AppError(
        `Chứng nhận ${certificate.certificate_no} đã có tem ${existingRows[0].seal_code}.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const dateRows = await queryRunner.query(
      `SELECT
         to_char(
           (COALESCE($1::timestamptz, NOW()) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
           'YYYY-MM-DD'
         ) AS cal_date,
         to_char(
           ((COALESCE($1::timestamptz, NOW()) AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
             + INTERVAL '12 months')::date,
           'YYYY-MM-DD'
         ) AS due_date`,
      [certificate.cal_source],
    );

    const calDate = String(dateRows[0].cal_date);
    const requestedDueDate = input.due_date ? String(input.due_date).trim() : null;
    let dueDate = String(dateRows[0].due_date);

    if (requestedDueDate) {
      if (!isValidIsoDate(requestedDueDate)) {
        throw new AppError(
          'Hạn hiệu lực của tem không hợp lệ (định dạng YYYY-MM-DD).',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }
      if (requestedDueDate < calDate) {
        throw new AppError(
          'Hạn hiệu lực của tem phải sau hoặc bằng ngày hiệu chuẩn.',
          400,
          ERROR_CODES.VALIDATION_ERROR,
        );
      }
      dueDate = requestedDueDate;
    }

    const sealCode = await nextSealCode(queryRunner);

    const inserted = await queryRunner.query(
      `INSERT INTO seals (
         device_id,
         certificate_id,
         seal_code,
         cal_date,
         due_date,
         status,
         issued_at,
         created_at
       ) VALUES ($1, $2, $3, $4::date, $5::date, 'Active', NOW(), NOW())
       RETURNING id`,
      [certificate.device_id, certificateId, sealCode, calDate, dueDate],
    );

    sealId = Number(inserted[0].id);

    await queryRunner.query(
      `UPDATE devices
       SET next_due_date = $2::date,
           status = CASE
             WHEN status = 'InRepair' THEN status
             WHEN $2::date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'ExpiringSoon'
             ELSE 'Active'
           END
       WHERE id = $1`,
      [certificate.device_id, dueDate],
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    if (isUniqueViolation(error)) {
      throw new AppError(
        'Tem cho chứng nhận này đã tồn tại, vui lòng tải lại danh sách.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
    throw error;
  } finally {
    await queryRunner.release();
  }

  return getSealDetail(sealId, actor);
};

const readRequiredText = (
  value: unknown,
  label: string,
  maxLength = 2000,
): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(
      `Vui lòng nhập ${label}.`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
  if (text.length > maxLength) {
    throw new AppError(
      `${label} không được vượt quá ${maxLength} ký tự.`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
  return text;
};

const readOptionalText = (
  value: unknown,
  label: string,
  maxLength = 2000,
): string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw new AppError(
      `${label} không hợp lệ.`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
  const text = value.trim();
  if (!text) return null;
  if (text.length > maxLength) {
    throw new AppError(
      `${label} không được vượt quá ${maxLength} ký tự.`,
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }
  return text;
};

const resolveSealSignerName = async (
  actor: SealActor,
): Promise<string | null> => {
  if (actor.full_name) return actor.full_name;
  const rows = await dataSource.query(
    `SELECT full_name FROM accounts WHERE id = $1 LIMIT 1`,
    [actor.id],
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0].full_name : null;
};

/**
 * FR-F9: tạo yêu cầu thu hồi tem. Tem chỉ đổi trạng thái sau khi có quyết định
 * được ký số bởi một người khác người yêu cầu.
 */
export const requestSealRevocation = async (
  sealId: number,
  input: CreateRevocationInput,
  actor: SealActor,
) => {
  const reason = readRequiredText(input.reason, 'lý do thu hồi');
  const note = readOptionalText(input.note, 'ghi chú');
  const fullReason = note ? `${reason} — ${note}` : reason;

  await expireOverdueSeals();

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const sealRows = await queryRunner.query(
      `SELECT id, seal_code, status FROM seals WHERE id = $1 FOR UPDATE`,
      [sealId],
    );

    if (!Array.isArray(sealRows) || sealRows.length === 0) {
      throw new AppError(
        `Không tìm thấy tem #${sealId}.`,
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    const seal = sealRows[0];
    if (seal.status !== 'Active' && seal.status !== 'Expired') {
      throw new AppError(
        `Tem ${seal.seal_code} đang ở trạng thái ${seal.status}, không thể yêu cầu thu hồi.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const pendingRows = await queryRunner.query(
      `SELECT id FROM seal_revocations
       WHERE seal_id = $1 AND status = 'Pending'
       LIMIT 1`,
      [sealId],
    );

    if (Array.isArray(pendingRows) && pendingRows.length > 0) {
      throw new AppError(
        `Tem ${seal.seal_code} đã có yêu cầu thu hồi đang chờ quyết định.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    await queryRunner.query(
      `INSERT INTO seal_revocations (
         seal_id,
         requested_by,
         reason,
         status,
         created_at
       ) VALUES ($1, $2, $3, 'Pending', NOW())`,
      [sealId, actor.id, fullReason],
    );

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }

  return getSealDetail(sealId, actor);
};

/**
 * FR-F9: quyết định thu hồi tem. Mọi quyết định đều được ký số và lưu vào
 * digital_signatures với purpose = 'SealRevocation'.
 */
export const decideSealRevocation = async (
  sealId: number,
  revocationId: number,
  input: DecideRevocationInput,
  actor: SealActor,
) => {
  const decision = typeof input.decision === 'string' ? input.decision.trim() : '';
  if (decision !== 'Approved' && decision !== 'Rejected') {
    throw new AppError(
      'Quyết định không hợp lệ (chấp nhận Approved hoặc Rejected).',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const decisionNote = readOptionalText(
    input.decision_note,
    'ghi chú quyết định',
  );

  await expireOverdueSeals();

  const signerName = await resolveSealSignerName(actor);
  const signedAt = new Date();
  const snapshot = {
    seal_revocation_id: revocationId,
    seal_id: sealId,
    decision,
    decided_by: actor.id,
    decided_at: signedAt.toISOString(),
  };
  const documentHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(snapshot))
    .digest('hex');
  const signatureValue = crypto
    .createHash('sha256')
    .update(`${documentHash}:${actor.id}:${signedAt.getTime()}`)
    .digest('hex');
  const transactionId = `REV-${new Date().getFullYear()}-${crypto
    .randomBytes(4)
    .toString('hex')
    .toUpperCase()}`;

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const lockedRows = await queryRunner.query(
      `SELECT
         r.id,
         r.seal_id,
         r.status,
         r.requested_by,
         r.reason,
         s.seal_code,
         s.device_id,
         s.status AS seal_status
       FROM seal_revocations r
       JOIN seals s ON s.id = r.seal_id
       WHERE r.id = $1 AND r.seal_id = $2
       FOR UPDATE OF r, s`,
      [revocationId, sealId],
    );

    if (!Array.isArray(lockedRows) || lockedRows.length === 0) {
      throw new AppError(
        `Không tìm thấy yêu cầu thu hồi #${revocationId} của tem #${sealId}.`,
        404,
        ERROR_CODES.NOT_FOUND,
      );
    }

    const revocation = lockedRows[0];

    if (Number(revocation.requested_by) === Number(actor.id)) {
      throw new AppError(
        'Người duyệt phải khác người đã gửi yêu cầu thu hồi.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    if (revocation.status !== 'Pending') {
      throw new AppError(
        `Yêu cầu thu hồi này đã được xử lý (${revocation.status}).`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    if (decision === 'Approved' && revocation.seal_status === 'Revoked') {
      throw new AppError(
        `Tem ${revocation.seal_code} đã bị thu hồi.`,
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    const signatureRows = await queryRunner.query(
      `SELECT id FROM digital_signatures
       WHERE seal_revocation_id = $1 AND purpose = 'SealRevocation'
       LIMIT 1`,
      [revocationId],
    );

    if (Array.isArray(signatureRows) && signatureRows.length > 0) {
      throw new AppError(
        'Yêu cầu thu hồi này đã có chữ ký số quyết định.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }

    await queryRunner.query(
      `INSERT INTO digital_signatures (
         seal_revocation_id,
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
       ) VALUES ($1, 'SealRevocation', $2, $3, 'ISOCAL-PKI-SHA256',
         $4, $5, $6, $7::jsonb, 'Signed', $8, $8)`,
      [
        revocationId,
        actor.id,
        signerName,
        transactionId,
        documentHash,
        signatureValue,
        JSON.stringify({
          purpose: 'SealRevocation',
          seal_revocation_id: revocationId,
          seal_id: sealId,
          seal_code: revocation.seal_code,
          decision,
          reason: revocation.reason,
          snapshot_hash: documentHash,
          signed_at: signedAt.toISOString(),
        }),
        signedAt,
      ],
    );

    await queryRunner.query(
      `UPDATE seal_revocations
       SET status = $3,
           decided_by = $4,
           decided_at = $5,
           decision_note = $6
       WHERE id = $1 AND seal_id = $2`,
      [
        revocationId,
        sealId,
        decision,
        actor.id,
        signedAt,
        decisionNote,
      ],
    );

    if (decision === 'Approved') {
      await queryRunner.query(
        `UPDATE seals SET status = 'Revoked' WHERE id = $1`,
        [sealId],
      );

      // Không có trạng thái "Recalled" trên devices; InRepair là trạng thái
      // đưa thiết bị ra khỏi vận hành để kiểm tra/đo lại. Chỉ thu hồi thiết bị
      // nếu không còn tem Active/PendingPayment khác.
      await queryRunner.query(
        `UPDATE devices d
         SET status = 'InRepair'
         WHERE d.id = $1
           AND d.status <> 'InRepair'
           AND NOT EXISTS (
             SELECT 1
             FROM seals s
             WHERE s.device_id = d.id
               AND s.id <> $2
               AND s.status IN ('Active', 'PendingPayment')
           )`,
        [revocation.device_id, sealId],
      );
    }

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    if (isUniqueViolation(error)) {
      throw new AppError(
        'Yêu cầu thu hồi này đã có chữ ký số quyết định.',
        409,
        ERROR_CODES.CONFLICT,
      );
    }
    throw error;
  } finally {
    await queryRunner.release();
  }

  return getSealDetail(sealId, actor);
};

const toStickerData = (detail: Awaited<ReturnType<typeof getSealDetail>>): SealStickerData => ({
  seal_code: detail.seal_code,
  status: detail.status,
  status_label: detail.status_label,
  cal_date_formatted: detail.cal_date_formatted,
  due_date_formatted: detail.due_date_formatted,
  issued_at_formatted: detail.issued_at_formatted,
  device_name: detail.device_name,
  model: detail.model,
  serial_number: detail.serial_number,
  internal_code: detail.internal_code,
  measuring_range: detail.measuring_range,
  customer_name: detail.customer_name,
  customer_address: detail.customer_address,
  certificate_no: detail.certificate_no,
  service_name: detail.service_name,
  service_code: detail.service_code,
  procedure_version: detail.procedure_version,
  verify_url: detail.verify_url,
});

export const getSealQr = async (sealId: number, actor?: SealActor) => {
  const detail = await getSealDetail(sealId, actor);
  return {
    seal_code: detail.seal_code,
    verify_url: detail.verify_url,
    buffer: await generateSealQrPng(detail.seal_code),
  };
};

export const getSealPdf = async (sealId: number, actor?: SealActor) => {
  const detail = await getSealDetail(sealId, actor);
  const buffer = await generateSealPdfBuffer(toStickerData(detail));

  return {
    fileName: `seal-${detail.seal_code}.pdf`,
    buffer,
  };
};
