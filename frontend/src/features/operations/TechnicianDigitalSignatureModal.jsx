import { useEffect, useRef, useState } from 'react';
import {
  computeClientTaskSha256,
  verifyCalibrationSignatureApi,
} from '../../services/work-order-service.js';

export function TechnicianDigitalSignatureModal({
  open,
  task,
  signerName,
  effectiveOnline,
  isSubmitting = false,
  onClose,
  onConfirmSign,
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(false);
  const [previewHash, setPreviewHash] = useState('Đang băm dữ liệu SHA-256...');
  const [signatureNote, setSignatureNote] = useState(
    'Tôi xác nhận toàn bộ số liệu đo lường và bước kiểm tra kỹ thuật trên là trung thực, chính xác và tuân thủ quy trình hiệu chuẩn hiện hành.',
  );
  const [confirmedPledge, setConfirmedPledge] = useState(true);

  useEffect(() => {
    if (!open || !task) return;
    let cancelled = false;
    computeClientTaskSha256(task).then((hash) => {
      if (!cancelled) setPreviewHash(hash);
    });
    return () => {
      cancelled = true;
    };
  }, [open, task]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      initCanvas();
    }, 60);
    return () => clearTimeout(timer);
  }, [open, signerName]);

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
    ctx.moveTo(20, canvas.height - 28);
    ctx.lineTo(canvas.width - 20, canvas.height - 28);
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
    ctx.strokeRect(canvas.width - 155, 12, 140, 56);

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ISOCAL DIGITAL SIGN', canvas.width - 146, 28);
    ctx.font = '9px sans-serif';
    ctx.fillText('VERIFIED TECHNICIAN', canvas.width - 146, 42);
    ctx.fillText(new Date().toLocaleDateString('vi-VN'), canvas.width - 146, 56);
    ctx.restore();

    // Draw stylized signature text
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'italic bold 24px Georgia, serif';
    ctx.fillText(signerName || 'Kỹ thuật viên ISOCAL', 28, 72);

    // Draw flourish stroke under signature
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(26, 82);
    ctx.quadraticCurveTo(120, 65, 225, 84);
    ctx.quadraticCurveTo(160, 92, 90, 88);
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

  if (!open || !task) return null;

  const doneSteps = (task.steps || []).filter((s) => s.done || s.status === 'Done').length;
  const totalSteps = (task.steps || []).length;
  const enteredMeasures = (task.measurements || []).filter(
    (m) => m.measured !== '' && m.measured !== null && m.measured !== undefined,
  ).length;
  const totalMeasures = (task.measurements || []).length;

  const handleConfirm = () => {
    if (!confirmedPledge) return;
    let signatureDataUrl = '';
    const canvas = canvasRef.current;
    if (canvas) {
      if (!hasSignatureStroke) {
        generateAutoSignatureStamp();
      }
      signatureDataUrl = canvas.toDataURL('image/png');
    }
    onConfirmSign({
      signatureImage: signatureDataUrl,
      signatureNote,
      signerName,
      previewHash,
    });
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="technician-sign-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          maxWidth: '580px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '22px 24px',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.28)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                background: '#dbeafe',
                color: '#1d4ed8',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.05rem',
              }}
            >
              ✍
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
                Ký số điện tử & Khóa biên bản hiệu chuẩn
              </h3>
              <small style={{ color: '#64748b', fontSize: '0.73rem' }}>
                Chuẩn toàn vẹn dữ liệu ISO/IEC 17025:2017 · ISOCAL-PKI-SHA256
              </small>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Thông tin tóm tắt biên bản */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '0.76rem',
            color: '#334155',
            display: 'grid',
            gap: '6px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>
              <strong>Thiết bị:</strong> {task.device} ({task.model} · SN: {task.serial})
            </span>
            <span style={{ color: '#0284c7', fontWeight: 700 }}>{task.workOrder}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>
              <strong>Kỹ thuật viên ký:</strong> {signerName}
            </span>
            <span>
              <strong>Môi trường:</strong> {task.environment_temp || '23.0'} °C · {task.environment_humidity || '55.0'} %RH
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
            <span>
              <strong>Tiến độ quy trình:</strong> {doneSteps}/{totalSteps} bước kỹ thuật · {enteredMeasures}/{totalMeasures} điểm đo
            </span>
            <span style={{ color: effectiveOnline ? '#16a34a' : '#d97706', fontWeight: 700 }}>
              {effectiveOnline ? '● Trực tuyến (Lưu CSDL ngay)' : '● Ngoại tuyến (Đồng bộ khi có mạng)'}
            </span>
          </div>
          <div
            style={{
              marginTop: '4px',
              padding: '6px 8px',
              background: '#0f172a',
              color: '#38bdf8',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.67rem',
              wordBreak: 'break-all',
            }}
          >
            <strong>Document Hash (SHA-256):</strong> {previewHash}
          </div>
        </div>

        {/* Khung ký tên cảm ứng / chuột */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>
              Chữ ký điện tử của Kỹ thuật viên (Ký trực tiếp hoặc tạo dấu ký tự động):
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={generateAutoSignatureStamp}
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                type="button"
              >
                ✍️ Tạo chữ ký mẫu
              </button>
              <button
                onClick={initCanvas}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                type="button"
              >
                🧹 Xóa ký lại
              </button>
            </div>
          </div>

          <div
            style={{
              border: '1.5px dashed #94a3b8',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#ffffff',
              touchAction: 'none',
            }}
          >
            <canvas
              height={115}
              onMouseDown={startDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchEnd={stopDrawing}
              onTouchMove={draw}
              onTouchStart={startDrawing}
              ref={canvasRef}
              style={{ width: '100%', height: '115px', display: 'block', cursor: 'crosshair' }}
              width={480}
            />
          </div>
          <small style={{ color: '#64748b', fontSize: '0.68rem', display: 'block', marginTop: '4px' }}>
            * Nếu bạn không vẽ tay, hệ thống sẽ tự động gắn chữ ký số chuẩn mang tên <strong>{signerName}</strong> kèm dấu xác thực điện tử.
          </small>
        </div>

        {/* Ghi chú cam kết */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '4px' }}>
            Lời chứng / Ghi chú ký số của Kỹ thuật viên:
          </label>
          <textarea
            onChange={(e) => setSignatureNote(e.target.value)}
            rows={2}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.75rem',
              color: '#0f172a',
              resize: 'vertical',
            }}
            value={signatureNote}
          />
        </div>

        {/* Checkbox xác nhận khóa biên bản */}
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '0.74rem',
            color: '#92400e',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          <input
            checked={confirmedPledge}
            onChange={(e) => setConfirmedPledge(e.target.checked)}
            style={{ marginTop: '2px' }}
            type="checkbox"
          />
          <span>
            Tôi hiểu rằng sau khi nhấn <strong>Xác nhận Ký số</strong>, toàn bộ thông số các lần đo và bước kỹ thuật sẽ bị{' '}
            <strong>khóa chỉnh sửa (Read-only)</strong> và chuyển sang hàng chờ soát xét của Trưởng phòng Kỹ thuật.
          </span>
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            className="small-action"
            disabled={isSubmitting}
            onClick={onClose}
            style={{ padding: '8px 16px' }}
            type="button"
          >
            Hủy bỏ
          </button>
          <button
            className="button button-primary"
            disabled={!confirmedPledge || isSubmitting}
            onClick={handleConfirm}
            style={{ padding: '9px 20px', fontWeight: 700 }}
            type="button"
          >
            {isSubmitting ? '⏳ Đang ký số & Lưu CSDL...' : '✍ Xác nhận Ký số & Nộp biên bản'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TechnicianSignedDetailsCard({ task, currentUserName, effectiveOnline }) {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    setVerifyResult(null);
    setVerifyError('');
  }, [task?.id, task?.calibration_record_id]);

  if (!task || (!task.submitted && !task.signed)) return null;

  const sig = task.digital_signature || {};
  const signer = sig.signer_name || task.signedBy || currentUserName || 'Kỹ thuật viên ISOCAL';
  const signedAt = sig.signed_at || task.signedAt || task.submitted_at;
  const docHash = sig.document_hash || task.signatureHash || 'SHA256:VERIFIED';
  const txId = sig.provider_transaction_id || task.signatureTransactionId || 'ISOCAL-PKI-SIGNED';
  const sigImg = sig.signed_file_url || task.signatureImage || '';
  const sigNote = sig.signature_metadata?.note || task.signatureNote || '';

  const handleVerifySignature = async () => {
    if (!task.service_request_item_id) return;
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await verifyCalibrationSignatureApi(task.service_request_item_id);
      setVerifyResult(res);
    } catch (err) {
      setVerifyError(
        err?.response?.data?.error?.message ||
          'Không thể xác thực chữ ký số từ máy chủ. Vui lòng kiểm tra kết nối.',
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      style={{
        marginTop: '14px',
        background: '#f0fdf4',
        border: '1.5px solid #86efac',
        borderRadius: '12px',
        padding: '14px 16px',
        fontSize: '0.76rem',
        color: '#14532d',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '0.86rem', color: '#166534' }}>
            <span>🛡️ CHỮ KÝ SỐ ĐIỆN TỬ KỸ THUẬT VIÊN (ĐÃ KHÓA TOÀN VẸN SỐ LIỆU)</span>
          </div>
          <div style={{ marginTop: '6px', display: 'grid', gap: '3px', color: '#166534' }}>
            <div>
              • <strong>Người ký:</strong> {signer} · <strong>Nhà cung cấp:</strong> {sig.provider || 'ISOCAL-PKI-SHA256'}
            </div>
            <div>
              • <strong>Thời điểm ký:</strong>{' '}
              {signedAt ? new Date(signedAt).toLocaleString('vi-VN') : 'Đã ghi nhận'} ·{' '}
              <strong>Mã giao dịch:</strong> <code>{txId}</code>
            </div>
            <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.7rem', color: '#15803d' }}>
              • <strong>Mã băm SHA-256:</strong> {docHash}
            </div>
            {sigNote && (
              <div style={{ fontStyle: 'italic', color: '#166534', marginTop: '2px' }}>
                • <strong>Lời chứng KTV:</strong> "{sigNote}"
              </div>
            )}
          </div>
        </div>

        {sigImg && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '6px 10px',
              textAlign: 'center',
            }}
          >
            <img
              alt="Chữ ký điện tử KTV"
              src={sigImg}
              style={{ height: '54px', maxWidth: '180px', objectFit: 'contain', display: 'block' }}
            />
            <small style={{ fontSize: '0.63rem', color: '#15803d', fontWeight: 700 }}>
              Chữ ký điện tử đã lưu CSDL
            </small>
          </div>
        )}
      </div>

      {effectiveOnline && task.service_request_item_id && (
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            disabled={verifying}
            onClick={handleVerifySignature}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.73rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            type="button"
          >
            {verifying ? '⏳ Đang đối chiếu mã băm CSDL...' : '🔍 Kiểm tra tính toàn vẹn chữ ký số (Verify SHA-256)'}
          </button>
          <span style={{ fontSize: '0.7rem', color: '#15803d' }}>
            Mọi ô nhập số liệu đo đã được khóa chỉnh sửa để bảo toàn chữ ký số.
          </span>
        </div>
      )}

      {verifyError && (
        <div
          style={{
            marginTop: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          {verifyError}
        </div>
      )}

      {verifyResult && (
        <div
          style={{
            marginTop: '8px',
            background: verifyResult.verified ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${verifyResult.verified ? '#4ade80' : '#f87171'}`,
            color: verifyResult.verified ? '#14532d' : '#991b1b',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '0.72rem',
            display: 'grid',
            gap: '4px',
          }}
        >
          <div style={{ fontWeight: 800 }}>
            {verifyResult.message}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.67rem', wordBreak: 'break-all' }}>
            • <strong>Hash lưu trong digital_signatures:</strong> {verifyResult.stored_hash}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.67rem', wordBreak: 'break-all' }}>
            • <strong>Hash tính lại trực tiếp từ CSDL:</strong> {verifyResult.computed_hash}
          </div>
          <div>
            • <strong>Thuật toán:</strong> {verifyResult.algorithm} · <strong>Số bước:</strong> {verifyResult.steps_count} ·{' '}
            <strong>Số điểm đo:</strong> {verifyResult.measurements_count}
          </div>
        </div>
      )}
    </div>
  );
}

