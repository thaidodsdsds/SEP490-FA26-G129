import crypto from 'node:crypto';
import dataSource from '../../database/dataSource.js';
import { AppError } from '../../common/errors.js';
import { ERROR_CODES } from '../../common/constants.js';
import { ensureUploadedUrl } from '../uploads/uploads.service.js';

export interface ReviewQueueFilter {
  status?: string; // 'Pending' | 'Approved' | 'Rejected' | 'all'
  query?: string;
  page?: number;
  limit?: number;
}

export interface ReviewInput {
  action: 'Approve' | 'Reject';
  reject_reason?: string;
  comment?: string;
  signature_image?: string;
}

const formatDateTime = (dateVal: any): string => {
  if (!dateVal) return 'Chưa ghi nhận';
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const getReviewQueue = async (filters: ReviewQueueFilter = {}) => {
  const statusFilter = filters.status || 'Pending';
  const q = (filters.query || '').trim().toLowerCase();

  // 1. Query calibration records
  let sql = `
    SELECT
      cr.id as raw_id,
      cr.service_request_item_id,
      cr.procedure_id,
      cr.technician_id,
      cr.environment_temp,
      cr.environment_humidity,
      cr.result_status,
      cr.review_status,
      cr.submitted_at,
      cr.reject_reason,
      cr.reviewed_at,
      cr.reviewer_id,
      reviewer.full_name as reviewer_name,
      d.id as device_id,
      d.name as device_name,
      d.model,
      d.serial_number,
      c.id as customer_id,
      c.company_name as customer_name,
      tech.full_name as technician_name,
      tech.email as technician_email,
      tech.phone as technician_phone,
      cp.version as procedure_version,
      cp.environment_requirement,
      st.id as service_type_id,
      st.name as service_type_name,
      st.standard_code as service_type_code,
      wo.id as work_order_id,
      CONCAT('WO-', LPAD(wo.id::text, 4, '0')) as work_order_code,
      ms.id as standard_id,
      ms.name as standard_name,
      ms.serial_number as standard_serial,
      rev_sig.signed_file_url as reviewer_signature_url,
      rev_sig.document_hash as reviewer_document_hash,
      COALESCE(wo.contract_id, rev_sig.contract_id) as linked_contract_id
    FROM calibration_records cr
    LEFT JOIN service_request_items sri ON sri.id = cr.service_request_item_id
    LEFT JOIN devices d ON d.id = sri.device_id
    LEFT JOIN service_requests sr ON sr.id = sri.service_request_id
    LEFT JOIN customers c ON c.id = sr.customer_id
    LEFT JOIN accounts tech ON tech.id = cr.technician_id
    LEFT JOIN accounts reviewer ON reviewer.id = cr.reviewer_id
    LEFT JOIN calibration_procedures cp ON cp.id = cr.procedure_id
    LEFT JOIN service_types st ON st.id = cp.service_type_id
    LEFT JOIN LATERAL (
      SELECT woa.id, woa.work_order_id, woa.master_standard_id
      FROM work_order_assignments woa
      WHERE woa.service_request_item_id = cr.service_request_item_id
      ORDER BY woa.id DESC
      LIMIT 1
    ) woa ON true
    LEFT JOIN work_orders wo ON wo.id = woa.work_order_id
    LEFT JOIN masterstandard ms ON ms.id = woa.master_standard_id
    LEFT JOIN LATERAL (
      SELECT ds.id, ds.document_hash, ds.signed_file_url, ds.contract_id
      FROM digital_signatures ds
      WHERE ds.calibration_record_id = cr.id AND ds.purpose = 'TechnicalReview'
      ORDER BY ds.id DESC
      LIMIT 1
    ) rev_sig ON true
    WHERE 1=1
  `;

  const params: any[] = [];

  if (statusFilter !== 'all') {
    params.push(statusFilter);
    sql += ` AND cr.review_status = $${params.length}`;
  }

  sql += ` ORDER BY cr.submitted_at DESC NULLS LAST, cr.id DESC`;

  const rows = await dataSource.query(sql, params);
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  // 2. Fetch all measurement details for these records
  const recordIds = rows.map((r) => r.raw_id);
  const measurementRows = await dataSource.query(
    `SELECT
      md.id,
      md.calibration_record_id,
      md.test_point_id,
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
      pp.name as parameter_name,
      pp.unit as parameter_unit
    FROM measurement_details md
    LEFT JOIN procedure_test_points ptp ON ptp.id = md.test_point_id
    LEFT JOIN procedure_parameters pp ON pp.id = ptp.parameter_id
    WHERE md.calibration_record_id = ANY($1)
    ORDER BY ptp.point_no ASC, md.repeat_no ASC, md.id ASC`,
    [recordIds],
  );

  const measurementsMap = new Map<number, any[]>();
  for (const m of measurementRows) {
    const list = measurementsMap.get(m.calibration_record_id) || [];
    const unit = m.parameter_unit || '';
    const pointLabel = m.parameter_name
      ? `${m.parameter_name} (Điểm ${m.point_no}: ${Number(m.nominal_value)} ${unit})`
      : `Điểm ${m.point_no}: ${Number(m.nominal_value)} ${unit}`;

    list.push({
      id: m.id,
      point: pointLabel,
      point_no: m.point_no,
      repeat_no: m.repeat_no,
      nominal: `${Number(m.nominal_value)} ${unit}`.trim(),
      tolerance: m.tolerance !== null ? `±${Number(m.tolerance)} ${unit}`.trim() : '—',
      reference: `${Number(m.reference_value)} ${unit}`.trim(),
      measured: `${Number(m.measured_value)} ${unit}`.trim(),
      deviation: `${Number(m.deviation) > 0 ? '+' : ''}${Number(m.deviation)} ${unit}`.trim(),
      uncertainty: `±${Number(m.uncertainty)} ${unit}`.trim(),
      result: m.pass_fail ? 'Pass' : 'Fail',
      pass_fail: m.pass_fail,
    });
    measurementsMap.set(m.calibration_record_id, list);
  }

  // 3. Map into UI-ready records matching ReviewQueuePage & ReviewModal
  const records = rows.map((r) => {
    // Environment condition check
    let envStatus = 'Trong giới hạn';
    const envReq = r.environment_requirement;
    if (envReq) {
      if (
        envReq.temperature_c &&
        r.environment_temp !== null &&
        r.environment_temp !== undefined
      ) {
        const temp = Number(r.environment_temp);
        if (
          temp < Number(envReq.temperature_c.min) ||
          temp > Number(envReq.temperature_c.max)
        ) {
          envStatus = 'Ngoài giới hạn';
        }
      }
      if (
        envReq.humidity_percent &&
        r.environment_humidity !== null &&
        r.environment_humidity !== undefined
      ) {
        const hum = Number(r.environment_humidity);
        if (
          hum < Number(envReq.humidity_percent.min) ||
          hum > Number(envReq.humidity_percent.max)
        ) {
          envStatus = 'Ngoài giới hạn';
        }
      }
    }

    const envStr = `${
      r.environment_temp !== null && r.environment_temp !== undefined
        ? `${Number(r.environment_temp)}°C`
        : '—'
    } / ${
      r.environment_humidity !== null && r.environment_humidity !== undefined
        ? `${Number(r.environment_humidity)}% RH`
        : '—'
    }`;

    const deviceFull = `${r.device_name || 'Thiết bị chưa đặt tên'}${
      r.model ? ` · Model: ${r.model}` : ''
    }${r.serial_number ? ` (SN: ${r.serial_number})` : ''}`;

    const procedureFull = r.service_type_name
      ? `Quy trình ${r.service_type_name}${
          r.procedure_version ? ` (${r.procedure_version})` : ''
        }`
      : `Quy trình #${r.procedure_id}`;

    const standardFull = r.standard_name
      ? `${r.standard_name}${
          r.standard_serial ? ` (SN: ${r.standard_serial})` : ''
        }`
      : 'Chưa chỉ định chuẩn';

    return {
      id: `CR-${r.raw_id}`,
      raw_id: Number(r.raw_id),
      service_request_item_id: Number(r.service_request_item_id),
      device: deviceFull,
      device_name: r.device_name,
      model: r.model,
      serial: r.serial_number,
      customer: r.customer_name || 'Khách hàng chưa cập nhật',
      customer_id: r.customer_id,
      technician: r.technician_name || 'KTV chưa chỉ định',
      technician_id: r.technician_id,
      technician_phone: r.technician_phone,
      technician_email: r.technician_email,
      type: r.service_type_name || 'Hiệu chuẩn',
      procedure: procedureFull,
      procedure_id: r.procedure_id,
      standard: standardFull,
      environment: envStr,
      environmentStatus: envStatus,
      result_status: r.result_status || 'Pass',
      status: r.review_status,
      submittedAt: formatDateTime(r.submitted_at),
      submitted_at_raw: r.submitted_at,
      reviewedAt: formatDateTime(r.reviewed_at),
      reviewed_at_raw: r.reviewed_at,
      reviewer_name: r.reviewer_name,
      reviewer_signature_url: r.reviewer_signature_url || null,
      reviewer_document_hash: r.reviewer_document_hash || null,
      contract_id: r.linked_contract_id ? Number(r.linked_contract_id) : null,
      reject_reason: r.reject_reason || null,
      work_order_code: r.work_order_code,
      measurements: measurementsMap.get(r.raw_id) || [],
    };
  });

  // Client search query filtering
  if (q) {
    return records.filter(
      (item) =>
        item.id.toLowerCase().includes(q) ||
        item.device.toLowerCase().includes(q) ||
        item.customer.toLowerCase().includes(q) ||
        item.technician.toLowerCase().includes(q) ||
        item.procedure.toLowerCase().includes(q) ||
        (item.work_order_code && item.work_order_code.toLowerCase().includes(q)),
    );
  }

  return records;
};

export const getCalibrationRecordDetail = async (recordId: number) => {
  const records = await getReviewQueue({ status: 'all' });
  const found = records.find((r) => r.raw_id === Number(recordId));
  if (!found) {
    throw new AppError(
      `Không tìm thấy hồ sơ hiệu chuẩn với ID #${recordId}`,
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  // Also query review logs history
  const logs = await dataSource.query(
    `SELECT
      rl.id,
      rl.action,
      rl.reject_reason,
      rl.comment,
      rl.created_at,
      a.full_name as reviewer_name,
      a.email as reviewer_email
    FROM review_logs rl
    LEFT JOIN accounts a ON a.id = rl.reviewer_id
    WHERE rl.calibration_record_id = $1
    ORDER BY rl.created_at DESC`,
    [recordId],
  );

  return {
    ...found,
    review_logs: (Array.isArray(logs) ? logs : []).map((l) => ({
      id: l.id,
      action: l.action,
      reject_reason: l.reject_reason,
      comment: l.comment,
      reviewer_name: l.reviewer_name,
      reviewer_email: l.reviewer_email,
      created_at: l.created_at,
      createdAtFormatted: formatDateTime(l.created_at),
    })),
  };
};

export const reviewCalibrationRecord = async (
  recordId: number,
  reviewerId: number,
  input: ReviewInput,
) => {
  const { action, reject_reason, comment } = input;

  if (action !== 'Approve' && action !== 'Reject') {
    throw new AppError(
      'Hành động soát xét không hợp lệ. Chỉ chấp nhận Approve hoặc Reject.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  if (action === 'Reject' && (!reject_reason || !reject_reason.trim())) {
    throw new AppError(
      'Vui lòng nhập lý do từ chối (reject_reason) khi Reject hồ sơ để lưu ReviewLog.',
      400,
      ERROR_CODES.VALIDATION_ERROR,
    );
  }

  const existingRows = await dataSource.query(
    `SELECT id, service_request_item_id, review_status FROM calibration_records WHERE id = $1`,
    [recordId],
  );

  if (!Array.isArray(existingRows) || existingRows.length === 0) {
    throw new AppError(
      `Không tìm thấy hồ sơ hiệu chuẩn #${recordId}`,
      404,
      ERROR_CODES.NOT_FOUND,
    );
  }

  const calRecord = existingRows[0];
  const sriId = calRecord.service_request_item_id;
  const now = new Date();

  const newStatus = action === 'Approve' ? 'Approved' : 'Rejected';
  const cleanReason = action === 'Reject' ? reject_reason!.trim() : null;
  const cleanComment = comment ? comment.trim() : null;

  // Use a database transaction to ensure atomicity
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Update calibration_records
    await queryRunner.query(
      `UPDATE calibration_records
       SET
         review_status = $1,
         reviewed_at = $2,
         reviewer_id = $3,
         reject_reason = $4
       WHERE id = $5`,
      [newStatus, now, reviewerId, cleanReason, recordId],
    );

    // 2. Insert into review_logs
    await queryRunner.query(
      `INSERT INTO review_logs (
         calibration_record_id,
         reviewer_id,
         action,
         reject_reason,
         comment,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [recordId, reviewerId, action, cleanReason, cleanComment, now],
    );

    // 3. Update service_request_items, work_order_assignments & digital_signatures
    if (action === 'Approve') {
      // Find reviewer's name
      const reviewerRows = await queryRunner.query(
        `SELECT full_name FROM accounts WHERE id = $1`,
        [reviewerId],
      );
      const reviewerName = reviewerRows?.[0]?.full_name || 'Reviewer';

      // Find linked contract_id from work_order_assignments & work_orders OR quotations/contracts
      const contractRows = await queryRunner.query(
        `SELECT COALESCE(
           wo.contract_id,
           (
             SELECT c.id
             FROM contracts c
             JOIN quotations q ON q.id = c.quotation_id
             JOIN service_requests sr ON sr.id = q.service_request_id
             JOIN service_request_items sri ON sri.service_request_id = sr.id
             WHERE sri.id = $1
             ORDER BY c.id DESC
             LIMIT 1
           )
         ) as contract_id
         FROM (SELECT 1) dummy
         LEFT JOIN work_order_assignments woa ON woa.service_request_item_id = $1
         LEFT JOIN work_orders wo ON wo.id = woa.work_order_id
         ORDER BY wo.contract_id NULLS LAST
         LIMIT 1`,
        [sriId],
      );
      const linkedContractId =
        contractRows?.[0]?.contract_id ? Number(contractRows[0].contract_id) : null;

      // Ensure uploaded signature image
      let uploadedSignatureUrl: string | null = null;
      if (input.signature_image) {
        try {
          uploadedSignatureUrl = await ensureUploadedUrl(
            String(input.signature_image),
            'signatures',
            `review_sig_${recordId}_${Date.now()}`,
          );
        } catch (uploadErr) {
          console.warn('[CalibrationRecord] Could not upload signature image, saving direct string:', uploadErr);
          uploadedSignatureUrl = input.signature_image;
        }
      }

      // Record Reviewer Digital Signature (TechnicalReview)
      const canonicalStr = `ISOCAL:CALIBRATION_RECORD:${recordId}:APPROVED_BY:${reviewerId}:${now.toISOString()}`;
      const docHash = crypto.createHash('sha256').update(canonicalStr).digest('hex');
      const sigValue = crypto.createHash('sha256').update(`${docHash}:${reviewerId}:${now.getTime()}`).digest('hex');

      try {
        await queryRunner.query(
          `INSERT INTO digital_signatures (
             contract_id,
             calibration_record_id,
             purpose,
             signer_id,
             signer_name,
             provider,
             provider_transaction_id,
             document_hash,
             signature_value,
             signature_metadata,
             signed_file_url,
             status,
             signed_at
           ) VALUES (
             $1,
             $2,
             'TechnicalReview',
             $3,
             $4,
             'ISOCAL-PKI-SHA256',
             $5,
             $6,
             $7,
             $8::jsonb,
             $9,
             'Signed',
             $10
           )`,
          [
            linkedContractId,
            recordId,
            reviewerId,
            reviewerName,
            `TX-REV-${recordId}-${now.getTime()}`,
            docHash,
            sigValue,
            JSON.stringify({
              purpose: 'TechnicalReview',
              contract_id: linkedContractId,
              reviewer_id: reviewerId,
              reviewer_name: reviewerName,
              record_id: recordId,
              approved_at: now.toISOString(),
              comment: cleanComment || 'Soát xét hồ sơ đo kiểm đạt chuẩn ISO/IEC 17025',
            }),
            uploadedSignatureUrl || input.signature_image || null,
            now,
          ],
        );
      } catch (sigErr) {
        console.warn('Digital signature creation warning:', sigErr);
      }

      // Update service_request_items: 'Done' complies with CHECK ("status" IN ('Pending', 'Inspected', 'Done', 'Rejected'))
      await queryRunner.query(
        `UPDATE service_request_items
         SET status = 'Done'
         WHERE id = $1`,
        [sriId],
      );

      // Update work_order_assignments: 'Done' complies with CHECK ("status" IN ('Assigned', 'InProgress', 'Done', 'Cancelled'))
      await queryRunner.query(
        `UPDATE work_order_assignments
         SET status = 'Done'
         WHERE service_request_item_id = $1`,
        [sriId],
      );
    } else {
      // When rejected: keep original calibration_records intact, update service_request_items to 'Rejected'
      await queryRunner.query(
        `UPDATE service_request_items
         SET status = 'Rejected'
         WHERE id = $1`,
        [sriId],
      );

      // KTV can re-calibrate on a new session
      await queryRunner.query(
        `UPDATE work_order_assignments
         SET status = 'InProgress'
         WHERE service_request_item_id = $1`,
        [sriId],
      );
    }

    await queryRunner.commitTransaction();
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }

  return {
    success: true,
    record_id: recordId,
    review_status: newStatus,
    action,
    reject_reason: cleanReason,
    reviewed_at: now,
  };
};
