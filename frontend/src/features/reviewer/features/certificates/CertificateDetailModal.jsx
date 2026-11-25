import { useEffect, useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import Modal from '../../shared/Modal.jsx';
import StatusPill from '../../shared/StatusPill.jsx';

const numberText = (value, unit) => {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value);
  const text = Number.isNaN(numeric)
    ? String(value)
    : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(numeric);
  return unit ? `${text} ${unit}` : text;
};

function CertificateDetailModal({
  certificate,
  loading,
  error,
  onClose,
  onOpenPdf,
  onSign,
  canSign,
  signing,
  pdfLoading,
}) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setConfirmed(false);
  }, [certificate?.id]);

  const measurements = certificate?.measurements ?? [];
  const signatures = certificate?.signatures ?? [];
  const isReleased = certificate?.status === 'Released';
  const isPendingPayment = certificate?.status === 'PendingPayment';
  const statusLabel = isReleased
    ? '✓ Chứng nhận đã phát hành (Released)'
    : isPendingPayment
      ? '⏳ Chứng nhận chờ thanh toán (PendingPayment)'
      : '◷ Chứng nhận đang ở bản nháp (Draft)';

  return (
    <Modal
      eyebrow={certificate?.certificate_no || 'Certificate'}
      onClose={onClose}
      title={loading ? 'Đang tải chi tiết chứng nhận' : 'Chi tiết chứng nhận hiệu chuẩn'}
    >
      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
          Đang tải dữ liệu chứng nhận từ máy chủ...
        </div>
      ) : error ? (
        <p className="reviewer-inline-error" role="alert">
          {error}
        </p>
      ) : certificate ? (
        <>
          <div
            style={{
              background: isReleased ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${isReleased ? '#bbf7d0' : '#fed7aa'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              color: isReleased ? '#166534' : '#9a3412',
              fontSize: '0.82rem',
              marginBottom: '14px',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '2px' }}>
              {statusLabel}
            </strong>
            {isReleased ? (
              <span>
                {certificate.release_signature?.signer_name
                  ? `Ký bởi ${certificate.release_signature.signer_name} · `
                  : ''}
                {certificate.issued_at_formatted || 'Đã ghi nhận thời điểm phát hành'} · Giao dịch{' '}
                {certificate.release_signature?.provider_transaction_id || '—'}
              </span>
            ) : (
              <span>Bản PDF hiện tại chưa có chữ ký phát hành. Ký số để chuyển trạng thái sang Released.</span>
            )}
          </div>

          <div className="review-record-summary">
            <div>
              <small>Số chứng nhận</small>
              <strong>{certificate.certificate_no}</strong>
            </div>
            <div>
              <small>Hồ sơ hiệu chuẩn</small>
              <strong>
                {certificate.record_code}
                {certificate.result_status ? ` · ${certificate.result_status}` : ''}
              </strong>
            </div>
            <div>
              <small>Thiết bị</small>
              <strong>{certificate.device || '—'}</strong>
            </div>
            <div>
              <small>Khách hàng</small>
              <strong>{certificate.customer_name || '—'}</strong>
            </div>
            <div>
              <small>Dịch vụ &amp; Quy trình</small>
              <strong>{certificate.procedure || certificate.service_name || '—'}</strong>
            </div>
            <div>
              <small>Chuẩn đo lường</small>
              <strong>
                {certificate.standard_name || '—'}
                {certificate.standard_serial ? ` (SN: ${certificate.standard_serial})` : ''}
              </strong>
            </div>
            <div>
              <small>Điều kiện môi trường</small>
              <strong>{certificate.environment}</strong>
            </div>
            <div>
              <small>Kỹ thuật viên · Soát xét</small>
              <strong>
                {certificate.technician_name || '—'} · {certificate.reviewer_name || '—'}
              </strong>
            </div>
            <div>
              <small>Ngày thực hiện · Soát xét</small>
              <strong>
                {certificate.submitted_at
                  ? new Date(certificate.submitted_at).toLocaleDateString('vi-VN')
                  : '—'}
                {' · '}
                {certificate.reviewed_at
                  ? new Date(certificate.reviewed_at).toLocaleDateString('vi-VN')
                  : '—'}
              </strong>
            </div>
            <div>
              <small>Hợp đồng liên kết</small>
              <strong>{certificate.contract_code || '—'}</strong>
            </div>
          </div>

          <h3 className="modal-subheading" style={{ marginTop: '16px' }}>
            Kết quả đo kiểm ({measurements.length} điểm)
          </h3>
          <DataTable
            columns={[
              {
                key: 'point',
                label: 'Điểm đo',
                render: (row) => (
                  <span>
                    {row.parameter_name || '—'}
                    {row.point_no !== null && row.point_no !== undefined ? ` · Điểm ${row.point_no}` : ''}
                  </span>
                ),
              },
              {
                key: 'nominal',
                label: 'Danh định',
                render: (row) => numberText(row.nominal_value, row.unit),
              },
              {
                key: 'tolerance',
                label: 'Dung sai',
                render: (row) =>
                  row.tolerance !== null && row.tolerance !== undefined
                    ? `±${numberText(row.tolerance, row.unit)}`
                    : '—',
              },
              {
                key: 'measured',
                label: 'Giá trị đo',
                render: (row) => numberText(row.measured_value, row.unit),
              },
              {
                key: 'deviation',
                label: 'Sai lệch',
                render: (row) => numberText(row.deviation, row.unit),
              },
              {
                key: 'uncertainty',
                label: 'Độ KĐB',
                render: (row) =>
                  row.uncertainty !== null && row.uncertainty !== undefined
                    ? `±${numberText(row.uncertainty, row.unit)}`
                    : '—',
              },
              {
                key: 'result',
                label: 'Đánh giá',
                render: (row) => (
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.67rem',
                      fontWeight: 700,
                      background: row.pass_fail === false ? '#fee2e2' : '#dcfce7',
                      color: row.pass_fail === false ? '#991b1b' : '#166534',
                    }}
                  >
                    {row.pass_fail === false ? 'Không đạt' : 'Đạt'}
                  </span>
                ),
              },
            ]}
            empty="Chưa có điểm đo nào được ghi nhận."
            rows={measurements}
          />

          <h3 className="modal-subheading" style={{ marginTop: '16px' }}>
            Chữ ký số (DigitalSignature)
          </h3>
          <DataTable
            columns={[
              { key: 'purpose', label: 'Mục đích' },
              {
                key: 'signer',
                label: 'Người ký',
                render: (row) => (
                  <span>
                    {row.signer_name || '—'}
                    {row.signer_role ? (
                      <small style={{ display: 'block', color: '#64748b' }}>{row.signer_role}</small>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'transaction',
                label: 'Giao dịch',
                render: (row) => row.provider_transaction_id || row.provider || '—',
              },
              {
                key: 'signed_at',
                label: 'Thời gian ký',
                render: (row) => row.signed_at_formatted || '—',
              },
              {
                key: 'hash',
                label: 'Document hash',
                render: (row) => (
                  <code style={{ fontSize: '0.66rem', wordBreak: 'break-all' }}>{row.document_hash || '—'}</code>
                ),
              },
              {
                key: 'status',
                label: 'Trạng thái',
                render: (row) => <StatusPill>{row.status}</StatusPill>,
              },
            ]}
            empty="Chưa có chữ ký số nào cho chứng nhận này."
            rows={signatures}
          />

          {canSign && !isReleased && certificate.can_sign ? (
            <label className="two-factor-confirm" style={{ marginTop: '14px' }}>
              <input
                checked={confirmed}
                disabled={signing}
                onChange={(event) => setConfirmed(event.target.checked)}
                type="checkbox"
              />
              Tôi xác nhận hồ sơ đo, kết quả kiểm tra và thông tin chứng nhận đã chính xác trước khi ký phát hành.
            </label>
          ) : null}

          <div className="modal-actions" style={{ marginTop: '18px' }}>
            <button className="button button-secondary" onClick={onClose} type="button">
              Đóng
            </button>
            <button
              className="button button-secondary"
              disabled={pdfLoading}
              onClick={() => onOpenPdf(certificate)}
              type="button"
            >
              {pdfLoading ? 'Đang tải PDF...' : '⤓ Xem / In PDF'}
            </button>
            {canSign && !isReleased && certificate.can_sign ? (
              <button
                className="button button-primary"
                disabled={!confirmed || signing}
                onClick={onSign}
                type="button"
              >
                {signing ? 'Đang ký...' : '✍ Ký phát hành (Released)'}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </Modal>
  );
}

export default CertificateDetailModal;
