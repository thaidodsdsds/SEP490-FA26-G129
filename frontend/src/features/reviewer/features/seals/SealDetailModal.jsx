import { useEffect, useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import Modal from '../../shared/Modal.jsx';
import StatusPill from '../../shared/StatusPill.jsx';
import { getSealQrBlobApi } from '../../../../services/seal-service.js';

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Không thể tải dữ liệu.';

const RESULT_LABEL = {
  Pass: 'Đạt',
  Fail: 'Không đạt',
};

const daysText = (days) => {
  if (days === null || days === undefined || Number.isNaN(Number(days))) return '—';
  const value = Number(days);
  if (value < 0) return `Quá hạn ${Math.abs(value)} ngày`;
  if (value === 0) return 'Hết hạn hôm nay';
  return `Còn ${value} ngày`;
};

const daysColor = (seal) => {
  if (!seal) return '#64748b';
  if (seal.status === 'Revoked') return '#b91c1c';
  if (seal.status === 'Expired' || (seal.days_remaining !== null && seal.days_remaining < 0)) {
    return '#b91c1c';
  }
  if (seal.is_expiring_soon) return '#b45309';
  return '#047857';
};

const bannerTheme = (seal) => {
  if (!seal) return { background: '#f8fafc', border: '#e2e8f0', color: '#334155' };
  if (seal.status === 'Revoked') return { background: '#fef2f2', border: '#fecaca', color: '#991b1b' };
  if (seal.status === 'Expired') return { background: '#fef2f2', border: '#fecaca', color: '#991b1b' };
  if (seal.status === 'PendingPayment') return { background: '#fffbeb', border: '#fde68a', color: '#92400e' };
  if (seal.is_expiring_soon) return { background: '#fffbeb', border: '#fde68a', color: '#92400e' };
  return { background: '#f0fdf4', border: '#bbf7d0', color: '#166534' };
};

const bannerTitle = (seal) => {
  if (!seal) return 'Tem hiệu chuẩn';
  if (seal.status === 'Revoked') return '⛔ Tem đã bị thu hồi';
  if (seal.status === 'Expired') return '⚠ Tem đã hết hạn';
  if (seal.status === 'PendingPayment') return '◷ Tem đang chờ thanh toán';
  if (seal.is_expiring_soon) return '◷ Tem sắp hết hạn';
  return '✓ Tem đang hiệu lực';
};

function SealDetailModal({
  seal,
  loading,
  error,
  onClose,
  onOpenPdf,
  onOpenCertificatePdf,
  pdfLoading,
  certificatePdfLoading,
}) {
  const [qrUrl, setQrUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState('');

  const sealId = seal?.id;

  useEffect(() => {
    if (!sealId) return undefined;

    let objectUrl = '';
    let cancelled = false;
    setQrLoading(true);
    setQrError('');
    setQrUrl('');

    getSealQrBlobApi(sealId)
      .then((blobData) => {
        if (cancelled) return;
        const blob =
          blobData instanceof Blob ? blobData : new Blob([blobData], { type: 'image/png' });
        const typedBlob = new Blob([blob], { type: 'image/png' });
        objectUrl = URL.createObjectURL(typedBlob);
        setQrUrl(objectUrl);
      })
      .catch((qrLoadError) => {
        if (!cancelled) setQrError(errorMessage(qrLoadError));
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sealId]);

  const theme = bannerTheme(seal);
  const revocations = seal?.revocations ?? [];
  const verificationLogs = seal?.verification?.recent ?? [];

  return (
    <Modal
      eyebrow={seal?.seal_code || 'Calibration seal'}
      onClose={onClose}
      title={loading ? 'Đang tải chi tiết tem' : 'Chi tiết tem hiệu chuẩn'}
    >
      {loading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
          Đang tải dữ liệu tem từ máy chủ...
        </div>
      ) : error ? (
        <p className="reviewer-inline-error" role="alert">
          {error}
        </p>
      ) : seal ? (
        <>
          <div
            style={{
              background: theme.background,
              border: `1px solid ${theme.border}`,
              borderRadius: '8px',
              padding: '12px 16px',
              color: theme.color,
              fontSize: '0.82rem',
              marginBottom: '14px',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.88rem', marginBottom: '2px' }}>
              {bannerTitle(seal)}
            </strong>
            <span>
              {seal.seal_code} · {seal.status_label || seal.status} · {daysText(seal.days_remaining)}
              {seal.due_date_formatted ? ` (hạn ${seal.due_date_formatted})` : ''}
              {seal.revocation?.reason ? ` · Lý do: ${seal.revocation.reason}` : ''}
            </span>
          </div>

          <div className="review-record-summary">
            <div>
              <small>Mã tem</small>
              <strong>{seal.seal_code}</strong>
            </div>
            <div>
              <small>Trạng thái</small>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StatusPill>{seal.status}</StatusPill>
                <span>{seal.status_label || seal.status}</span>
              </strong>
            </div>
            <div>
              <small>Ngày hiệu chuẩn</small>
              <strong>{seal.cal_date_formatted || '—'}</strong>
            </div>
            <div>
              <small>Hạn hiệu lực</small>
              <strong style={{ color: daysColor(seal) }}>
                {seal.due_date_formatted || '—'} · {daysText(seal.days_remaining)}
              </strong>
            </div>
            <div>
              <small>Thiết bị</small>
              <strong>{seal.device_name || '—'}</strong>
            </div>
            <div>
              <small>Mã quản lý · Serial</small>
              <strong>
                {seal.internal_code || '—'}
                {seal.serial_number ? ` · ${seal.serial_number}` : ''}
              </strong>
            </div>
            <div>
              <small>Khách hàng</small>
              <strong>{seal.customer_name || '—'}</strong>
            </div>
            <div>
              <small>Chứng nhận</small>
              <strong>{seal.certificate_no || '—'}</strong>
            </div>
            <div>
              <small>Người ký phát hành</small>
              <strong>{seal.signer_name || '—'}</strong>
            </div>
            <div>
              <small>Ngày phát hành tem</small>
              <strong>{seal.issued_at_formatted || '—'}</strong>
            </div>
            <div>
              <small>Dịch vụ · Quy trình</small>
              <strong>
                {seal.service_name || '—'}
                {seal.procedure_version ? ` · ${seal.procedure_version}` : ''}
              </strong>
            </div>
            <div>
              <small>Kết quả hiệu chuẩn</small>
              <strong>{RESULT_LABEL[seal.result_status] || seal.result_status || '—'}</strong>
            </div>
          </div>

          <h3 className="modal-subheading" style={{ marginTop: '16px' }}>
            Mã QR tra cứu công khai
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '16px',
              alignItems: 'center',
              padding: '13px',
              border: '1px solid #e2e8f0',
              borderRadius: '9px',
              background: '#f8fafc',
            }}
          >
            <div
              style={{
                width: '176px',
                height: '176px',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: '#ffffff',
                overflow: 'hidden',
              }}
            >
              {qrLoading ? (
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Đang tạo QR...</span>
              ) : qrUrl ? (
                <img
                  alt={`Mã QR tra cứu tem ${seal.seal_code}`}
                  src={qrUrl}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <span style={{ padding: '12px', fontSize: '0.7rem', color: '#b91c1c', textAlign: 'center' }}>
                  {qrError || 'Không có mã QR'}
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: '0 0 6px', color: '#475569', fontSize: '0.76rem' }}>
                Quét mã QR trên tem để mở trang tra cứu công khai. Trang tra cứu hiển thị trạng thái hiệu lực,
                thiết bị và chứng nhận liên kết.
              </p>
              <code
                style={{
                  display: 'block',
                  padding: '8px 10px',
                  borderRadius: '7px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#0369a1',
                  fontSize: '0.68rem',
                  wordBreak: 'break-all',
                }}
              >
                {seal.verify_url || '—'}
              </code>
              <small style={{ display: 'block', marginTop: '7px', color: '#64748b', fontSize: '0.67rem' }}>
                QR này được in trên tem PDF (khổ A6) và tách biệt khỏi file chứng nhận đã ký số.
              </small>
            </div>
          </div>

          <h3 className="modal-subheading" style={{ marginTop: '16px' }}>
            Lịch sử tra cứu ({seal.verification?.total ?? verificationLogs.length})
          </h3>
          <DataTable
            columns={[
              {
                key: 'verified_at',
                label: 'Thời gian',
                render: (row) => row.verified_at_formatted || '—',
              },
              {
                key: 'result',
                label: 'Kết quả',
                render: (row) => <StatusPill>{row.verification_result}</StatusPill>,
              },
              {
                key: 'source_ip',
                label: 'Địa chỉ IP',
                render: (row) => row.source_ip || '—',
              },
              {
                key: 'user_agent',
                label: 'Thiết bị / trình duyệt',
                render: (row) => (
                  <span style={{ fontSize: '0.67rem', color: '#475569', wordBreak: 'break-all' }}>
                    {row.user_agent || '—'}
                  </span>
                ),
              },
            ]}
            empty="Chưa có lượt tra cứu nào được ghi nhận cho tem này."
            rows={verificationLogs}
          />

          {revocations.length > 0 ? (
            <>
              <h3 className="modal-subheading" style={{ marginTop: '16px' }}>
                Yêu cầu thu hồi ({revocations.length})
              </h3>
              <DataTable
                columns={[
                  {
                    key: 'requested',
                    label: 'Yêu cầu',
                    render: (row) => (
                      <div>
                        <span style={{ display: 'block' }}>{row.requested_by_name || '—'}</span>
                        <small style={{ color: '#64748b' }}>{row.created_at_formatted || '—'}</small>
                      </div>
                    ),
                  },
                  {
                    key: 'reason',
                    label: 'Lý do',
                    render: (row) => (
                      <span style={{ fontSize: '0.7rem', color: '#334155' }}>{row.reason || '—'}</span>
                    ),
                  },
                  {
                    key: 'status',
                    label: 'Trạng thái',
                    render: (row) => <StatusPill>{row.status}</StatusPill>,
                  },
                  {
                    key: 'decision',
                    label: 'Quyết định',
                    render: (row) => (
                      <div>
                        <span style={{ display: 'block' }}>
                          {row.decided_by_name || (row.status === 'Pending' ? 'Chờ quyết định' : '—')}
                        </span>
                        <small style={{ color: '#64748b' }}>
                          {row.decided_at_formatted && row.decided_at_formatted !== '—'
                            ? row.decided_at_formatted
                            : ''}
                          {row.decision_note ? ` · ${row.decision_note}` : ''}
                        </small>
                      </div>
                    ),
                  },
                ]}
                empty="Chưa có yêu cầu thu hồi nào."
                rows={revocations}
              />
            </>
          ) : null}

          <p className="mock-note">
            <strong>Lưu ý:</strong> tem PDF khổ A6 có QR được phát hành riêng sau khi chứng nhận đã ký. File chứng
            nhận đã ký số được giữ nguyên để bảo toàn giá trị pháp lý và hash chữ ký.
          </p>

          <div className="modal-actions" style={{ marginTop: '18px' }}>
            <button className="button button-secondary" onClick={onClose} type="button">
              Đóng
            </button>
            <button
              className="button button-secondary"
              disabled={certificatePdfLoading}
              onClick={() => onOpenCertificatePdf(seal)}
              type="button"
            >
              {certificatePdfLoading ? 'Đang tải chứng nhận...' : '⤓ Chứng nhận PDF'}
            </button>
            <button
              className="button button-primary"
              disabled={pdfLoading}
              onClick={() => onOpenPdf(seal)}
              type="button"
            >
              {pdfLoading ? 'Đang tải tem...' : '⤓ In tem PDF (A6)'}
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  );
}

export default SealDetailModal;
