import { useEffect, useRef, useState } from 'react';
import DataTable from '../../shared/DataTable.jsx';
import Modal from '../../shared/Modal.jsx';

function ReviewModal({ record, onClose, onApprove, onReject, error }) {
  const [twoFactorVerified, setTwoFactorVerified] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewerComment, setReviewerComment] = useState('');

  // Signature canvas states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);

  const isPending = record.status === 'Pending';
  const isApproved = record.status === 'Approved';
  const isRejected = record.status === 'Rejected';

  const previewHash = `ISOCAL:CALIBRATION_RECORD:${record.raw_id || record.id}:SHA256:VERIFIED_REVIEW`;

  useEffect(() => {
    if (!isPending) return;
    const timer = setTimeout(() => {
      initCanvas();
    }, 60);
    return () => clearTimeout(timer);
  }, [isPending]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Draw subtle baseline
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(16, canvas.height - 24);
    ctx.lineTo(canvas.width - 16, canvas.height - 24);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasSignatureStroke(false);
  };

  const generateAutoSignatureStamp = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initCanvas();

    // Draw digital stamp box
    ctx.save();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width - 156, 12, 142, 58);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ISOCAL DIGITAL SIGN', canvas.width - 146, 28);
    ctx.font = '9px sans-serif';
    ctx.fillText('VERIFIED REVIEWER', canvas.width - 146, 43);
    ctx.fillText(new Date().toLocaleDateString('vi-VN'), canvas.width - 146, 58);
    ctx.restore();

    // Draw stylized signature text
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic bold 22px Georgia, serif';
    const signerLabel = record.reviewer_name || 'Trưởng phòng Kỹ thuật';
    ctx.fillText(signerLabel, 24, 70);

    // Draw flourish stroke under signature
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(22, 80);
    ctx.quadraticCurveTo(120, 64, 220, 82);
    ctx.quadraticCurveTo(160, 90, 86, 86);
    ctx.stroke();
    ctx.restore();

    setHasSignatureStroke(true);
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignatureStroke(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
  };

  const handleApproveClick = async () => {
    if (!twoFactorVerified) return;
    setSubmitting(true);
    try {
      let signatureDataUrl = '';
      const canvas = canvasRef.current;
      if (canvas) {
        if (!hasSignatureStroke) {
          generateAutoSignatureStamp();
        }
        signatureDataUrl = canvas.toDataURL('image/png');
      }
      await onApprove({
        signature_image: signatureDataUrl,
        comment: reviewerComment,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onReject(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      eyebrow={record.id}
      onClose={onClose}
      title={isPending ? 'Soát xét hồ sơ đo (CalibrationRecord)' : 'Chi tiết hồ sơ hiệu chuẩn'}
    >
      {/* ─── Outcome Banner if already reviewed ─────────────────── */}
      {isApproved && (
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#166534',
            marginBottom: '16px',
            fontSize: '0.82rem',
          }}
        >
          <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '2px' }}>
            ✓ Hồ sơ đã được phê duyệt (Approved)
          </strong>
          <div>
            {record.reviewer_name ? `Người duyệt: ${record.reviewer_name} · ` : ''}
            Thời điểm duyệt: {record.reviewedAt || 'Đã ghi nhận'}
          </div>
          {record.contract_id && (
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#15803d' }}>
              Hợp đồng liên kết: <strong>HD-{String(record.contract_id).padStart(4, '0')}</strong> (Khóa mã định danh chữ ký)
            </div>
          )}
          {record.reviewer_signature_url && (
            <div style={{ marginTop: '10px' }}>
              <small style={{ color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                Chữ ký số &amp; Con dấu phê duyệt:
              </small>
              <img
                src={record.reviewer_signature_url}
                alt="Reviewer Digital Signature"
                style={{
                  maxHeight: '75px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  background: '#ffffff',
                  padding: '4px 8px',
                }}
              />
            </div>
          )}
        </div>
      )}

      {isRejected && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '12px 16px',
            borderRadius: '8px',
            color: '#991b1b',
            marginBottom: '16px',
            fontSize: '0.82rem',
          }}
        >
          <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '2px' }}>
            ✕ Hồ sơ đã bị từ chối (Rejected)
          </strong>
          <div>
            {record.reviewer_name ? `Người soát xét: ${record.reviewer_name} · ` : ''}
            Thời điểm: {record.reviewedAt || 'Đã ghi nhận'}
          </div>
          {record.reject_reason && (
            <div style={{ marginTop: '6px', fontWeight: 600 }}>
              Lý do từ chối: <span style={{ fontWeight: 400 }}>{record.reject_reason}</span>
            </div>
          )}
        </div>
      )}

      {/* ─── Record Metadata Summary ────────────────────────────── */}
      <div className="review-record-summary">
        <div>
          <small>Thiết bị</small>
          <strong>{record.device}</strong>
        </div>
        <div>
          <small>Khách hàng</small>
          <strong>{record.customer}</strong>
        </div>
        <div>
          <small>Kỹ thuật viên · Trình lúc</small>
          <strong>
            {record.technician} · {record.submittedAt}
          </strong>
        </div>
        <div>
          <small>Dịch vụ &amp; Quy trình</small>
          <strong>
            {record.type} · {record.procedure}
          </strong>
        </div>
        <div>
          <small>Chuẩn đối chứng sử dụng</small>
          <strong>{record.standard || 'Chưa chỉ định'}</strong>
        </div>
        <div>
          <small>Điều kiện môi trường</small>
          <strong>
            {record.environment} · {record.environmentStatus}
          </strong>
        </div>
      </div>

      {/* ─── Measurement Details Table ──────────────────────────── */}
      <div
        style={{
          marginTop: '16px',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 className="modal-subheading" style={{ margin: 0 }}>
          Chi tiết các điểm đo (MeasurementDetail)
        </h3>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.68rem',
            fontWeight: 700,
            background: record.result_status === 'Pass' ? '#dcfce7' : '#fee2e2',
            color: record.result_status === 'Pass' ? '#15803d' : '#b91c1c',
          }}
        >
          Kết quả tổng thể: {record.result_status === 'Pass' ? 'ĐẠT (PASS)' : 'KHÔNG ĐẠT (FAIL)'}
        </span>
      </div>

      <DataTable
        columns={[
          { key: 'point', label: 'Điểm đo & Danh định' },
          { key: 'tolerance', label: 'Dung sai cho phép' },
          { key: 'reference', label: 'Giá trị chuẩn' },
          { key: 'measured', label: 'Giá trị đo' },
          { key: 'deviation', label: 'Độ lệch' },
          { key: 'uncertainty', label: 'Độ KĐB' },
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
                  background: row.result === 'Pass' ? '#dcfce7' : '#fee2e2',
                  color: row.result === 'Pass' ? '#166534' : '#991b1b',
                }}
              >
                {row.result}
              </span>
            ),
          },
        ]}
        empty="Chưa có điểm đo nào được ghi nhận."
        rows={record.measurements || []}
      />

      {/* ─── Review Form (Only when Pending) ────────────────────── */}
      {isPending ? (
        <form className="reject-form" onSubmit={handleRejectSubmit}>
          {/* Digital Signature Pad for Reviewer */}
          <div
            style={{
              marginTop: '16px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  color: '#1e293b',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>✍</span> Ký số điện tử &amp; Đóng dấu kiểm duyệt (Reviewer)
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={generateAutoSignatureStamp}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '3px 9px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Tự động vẽ chữ ký mẫu và con dấu kiểm định"
                >
                  ⚡ Tự động tạo chữ ký mẫu
                </button>
                <button
                  type="button"
                  onClick={initCanvas}
                  style={{
                    background: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                  }}
                >
                  🗑 Xóa vẽ lại
                </button>
              </div>
            </div>

            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <canvas
                ref={canvasRef}
                width={520}
                height={110}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                style={{
                  width: '100%',
                  height: '110px',
                  display: 'block',
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '6px',
                fontSize: '0.67rem',
                color: '#64748b',
              }}
            >
              <span>Vẽ bằng chuột/cảm ứng hoặc bấm "Tự động tạo chữ ký mẫu"</span>
              <span style={{ fontFamily: 'monospace', color: '#475569' }}>
                Hash: {previewHash.slice(0, 32)}...
              </span>
            </div>
          </div>

          <div style={{ marginTop: '14px' }}>
            <label htmlFor="reject-reason" style={{ display: 'block', marginBottom: '4px' }}>
              Lý do Reject <span style={{ color: '#ef4444' }}>* Chỉ bắt buộc khi Từ chối (Reject)</span>
            </label>
            <textarea
              id="reject-reason"
              name="reason"
              placeholder="Ví dụ: Sai lệch đo vượt dung sai cho phép, môi trường đo vượt ngưỡng chuẩn ISO/IEC 17025..."
              rows="2"
            />
          </div>

          {error && (
            <p className="reviewer-inline-error" role="alert" style={{ marginTop: '8px' }}>
              {error}
            </p>
          )}

          <label className="two-factor-confirm" style={{ marginTop: '12px' }}>
            <input
              checked={twoFactorVerified}
              onChange={(event) => setTwoFactorVerified(event.target.checked)}
              type="checkbox"
            />
            Tôi xác nhận hồ sơ đo lường, quy trình hiệu chuẩn và tính toán độ không đảm bảo đo đạt chuẩn ISO/IEC 17025.
          </label>

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button
              className="button button-secondary"
              disabled={submitting}
              onClick={onClose}
              type="button"
            >
              Đóng
            </button>
            <button className="button button-danger" disabled={submitting} type="submit">
              {submitting ? 'Đang xử lý...' : '✕ Reject & yêu cầu đo lại'}
            </button>
            <button
              className="button button-primary"
              disabled={!twoFactorVerified || submitting}
              onClick={handleApproveClick}
              type="button"
            >
              {submitting ? 'Đang xử lý...' : '✓ Approve & Ký số điện tử'}
            </button>
          </div>
        </form>
      ) : (
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="button button-secondary" onClick={onClose} type="button">
            Đóng
          </button>
        </div>
      )}
    </Modal>
  );
}

export default ReviewModal;
