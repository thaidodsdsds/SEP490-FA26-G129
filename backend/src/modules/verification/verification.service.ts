import dataSource from '../../database/dataSource.js';
import { ERROR_CODES } from '../../common/constants.js';
import { AppError } from '../../common/errors.js';

export type VerificationResult = 'Valid' | 'Invalid' | 'Expired' | 'Revoked';

export interface SealVerificationResponse {
  seal_code: string;
  result: VerificationResult;
  message: string;
  verified_at: string;
  seal: {
    id: number;
    seal_code: string;
    status: string;
    cal_date: string | null;
    due_date: string | null;
    issued_at: Date | null;
    certificate_no: string;
    device: {
      name: string;
      model: string | null;
      manufacturer: string | null;
      serial_number: string | null;
    } | null;
  } | null;
}

interface SealLookupRow {
  id: number;
  seal_code: string;
  status: string;
  cal_date: string | null;
  due_date: string | null;
  issued_at: Date | null;
  certificate_no: string;
  device_name: string;
  model: string | null;
  manufacturer: string | null;
  serial_number: string | null;
  is_overdue: boolean;
  has_signed_revocation: boolean;
}

const RESULT_MESSAGES: Record<VerificationResult, string> = {
  Valid: 'Tem hợp lệ. Thiết bị đã hiệu chuẩn/kiểm định và còn trong hạn.',
  Invalid: 'Mã tem không hợp lệ hoặc tem chưa được kích hoạt (chờ thanh toán).',
  Expired: 'Tem đã hết hạn hiệu chuẩn/kiểm định.',
  Revoked: 'Tem đã bị thu hồi. Vui lòng liên hệ ISOCAL để được hỗ trợ.',
};

/**
 * Tra cứu công khai theo seal_code. Chỉ đọc CSDL (SRS v1.5 - NFR Hiệu năng):
 * quyết định trạng thái từ Seal.status, Seal.due_date và SealRevocation đã ký.
 */
export const verifySealByCode = async (
  sealCode: string,
): Promise<SealVerificationResponse> => {
  const code = sealCode.trim();
  if (!code) {
    throw new AppError('Mã tem không được để trống.', 400, ERROR_CODES.VALIDATION_ERROR);
  }
  if (code.length > 50) {
    throw new AppError('Mã tem không hợp lệ.', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const rows = await dataSource.query(
    `SELECT
       s.id,
       s.seal_code,
       s.status,
       to_char(s.cal_date, 'YYYY-MM-DD') AS cal_date,
       to_char(s.due_date, 'YYYY-MM-DD') AS due_date,
       s.issued_at,
       cert.certificate_no,
       d.name AS device_name,
       d.model,
       d.manufacturer,
       d.serial_number,
       (s.due_date < CURRENT_DATE) AS is_overdue,
       EXISTS (
         SELECT 1
         FROM seal_revocations r
         WHERE r.seal_id = s.id
           AND r.status = 'Approved'
           AND EXISTS (
             SELECT 1
             FROM digital_signatures ds
             WHERE ds.seal_revocation_id = r.id
               AND ds.purpose = 'SealRevocation'
               AND ds.status = 'Signed'
           )
       ) AS has_signed_revocation
     FROM seals s
     JOIN certificates cert ON cert.id = s.certificate_id
     JOIN devices d ON d.id = s.device_id
     WHERE s.seal_code = $1
     LIMIT 1`,
    [code],
  );

  const row: SealLookupRow | undefined = Array.isArray(rows) ? rows[0] : undefined;

  if (!row) {
    return {
      seal_code: code,
      result: 'Invalid',
      message: RESULT_MESSAGES.Invalid,
      verified_at: new Date().toISOString(),
      seal: null,
    };
  }

  let result: VerificationResult = 'Invalid';
  if (row.has_signed_revocation || row.status === 'Revoked') {
    result = 'Revoked';
  } else if (row.status === 'Expired' || row.is_overdue) {
    result = 'Expired';
  } else if (row.status === 'Active') {
    result = 'Valid';
  }

  return {
    seal_code: row.seal_code,
    result,
    message: RESULT_MESSAGES[result],
    verified_at: new Date().toISOString(),
    seal: {
      id: Number(row.id),
      seal_code: row.seal_code,
      status: row.status,
      cal_date: row.cal_date,
      due_date: row.due_date,
      issued_at: row.issued_at,
      certificate_no: row.certificate_no,
      device: {
        name: row.device_name,
        model: row.model,
        manufacturer: row.manufacturer,
        serial_number: row.serial_number,
      },
    },
  };
};

export interface RecordVerificationLogInput {
  sealId: number | null;
  sealCode: string;
  result: VerificationResult;
  sourceIp: string | null;
  userAgent: string | null;
}

/** Ghi nhiều log trong 1 câu query (dùng cho flush theo batch). */
export const recordVerificationLogs = async (
  inputs: RecordVerificationLogInput[],
): Promise<void> => {
  if (inputs.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];

  for (const input of inputs) {
    const offset = params.length;
    values.push(
      `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`,
    );
    params.push(
      input.sealId,
      input.sealCode.slice(0, 50),
      input.result,
      input.sourceIp?.slice(0, 45) ?? null,
      input.userAgent?.slice(0, 255) ?? null,
    );
  }

  await dataSource.query(
    `INSERT INTO seal_verification_logs
       (seal_id, seal_code, verification_result, source_ip, user_agent)
     VALUES ${values.join(', ')}`,
    params,
  );
};

/** Ghi 1 log (giữ lại cho các luồng không đi qua hàng đợi). */
export const recordVerificationLog = async (
  input: RecordVerificationLogInput,
): Promise<void> => recordVerificationLogs([input]);
