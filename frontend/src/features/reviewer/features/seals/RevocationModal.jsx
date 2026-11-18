import { useState } from 'react';
import Modal from '../../shared/Modal.jsx';

const REASONS = [
  'Sai sót nghiêm trọng trên kết quả',
  'Thiết bị cần thu hồi để đo lại',
  'Seal phát hành nhầm thông tin',
  'Khác',
];

const errorMessage = (error) =>
  error?.response?.data?.error?.message || error?.message || 'Không thể gửi quyết định.';

function RevocationModal({
  seal,
  mode = 'request',
  pending,
  canDecide = true,
  submitting = false,
  onClose,
  onSubmit,
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [localSubmitting, setLocalSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isDecision = mode === 'decision';
  const pendingRequest = pending || seal?.pending_revocation || null;
  const busy = localSubmitting || submitting;
  const deviceLabel = [seal?.device_name || seal?.device, seal?.internal_code, seal?.serial_number]
    .filter(Boolean)
    .join(' · ');

  const submit = async (decision) => {
    if (busy || !onSubmit) return;

    if (!isDecision && !reason) {
      setError('Vui lòng chọn lý do thu hồi.');
      return;
    }

    if (isDecision && !canDecide) {
      setError('Bạn là người gửi yêu cầu này. Cần một người khác ký quyết định.');
      return;
    }

    setLocalSubmitting(true);
    setError('');
    try {
      if (isDecision) {
        await onSubmit({ decision, decision_note: decisionNote });
      } else {
        await onSubmit({ reason, note });
      }
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setLocalSubmitting(false);
    }
  };

  return (
    <Modal
      eyebrow={seal?.seal_code || 'Calibration seal'}
      onClose={onClose}
      title={isDecision ? 'Ký quyết định thu hồi tem' : 'Yêu cầu thu hồi tem'}
    >
      <div className="modal-hint">
        {isDecision ? (
          <>
            Quyết định sẽ được <strong>ký số</strong> và lưu vào lịch sử tem. Phê duyệt sẽ chuyển tem sang{' '}
            <strong>Revoked</strong> và đưa thiết bị ra khỏi vận hành để đo lại.
          </>
        ) : (
          <>
            Yêu cầu sẽ được chuyển đến người có thẩm quyền để ký quyết định. Tem{' '}
            <strong>chưa đổi trạng thái</strong> trước khi quyết định được ký số.
          </>
        )}
      </div>

      <div className="revocation-device">
        <strong>{deviceLabel || '—'}</strong>
        <span>
          {seal?.certificate_no || seal?.certificate || '—'} · {seal?.customer_name || '—'}
        </span>
      </div>

      {isDecision ? (
        <div className="reviewer-form">
          <div
            style={{
              margin: '12px 0',
              padding: '12px 14px',
              borderRadius: '9px',
              border: '1px solid #fde68a',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: '0.76rem',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem' }}>
              ◷ Yêu cầu đang chờ ký quyết định
            </strong>
            <span style={{ display: 'block' }}>
              <strong>Lý do:</strong> {pendingRequest?.reason || '—'}
            </span>
            <span style={{ display: 'block' }}>
              <strong>Người yêu cầu:</strong>{' '}
              {pendingRequest?.requested_by_name || `#${pendingRequest?.requested_by ?? '—'}`}
            </span>
            <span style={{ display: 'block' }}>
              <strong>Thời gian gửi:</strong> {pendingRequest?.created_at_formatted || '—'}
            </span>
          </div>

          {!canDecide ? (
            <p className="reviewer-inline-error" role="alert">
              Bạn là người gửi yêu cầu này. Hệ thống yêu cầu người duyệt khác người yêu cầu.
            </p>
          ) : null}

          <label>
            Ghi chú quyết định
            <textarea
              disabled={busy || !canDecide}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="Nhận xét về lý do thu hồi, hướng xử lý thiết bị..."
              rows="3"
              value={decisionNote}
            />
          </label>

          {error ? (
            <p className="reviewer-inline-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions">
            <button className="button button-secondary" disabled={busy} onClick={onClose} type="button">
              Hủy
            </button>
            <button
              className="button button-secondary"
              disabled={busy || !canDecide}
              onClick={() => submit('Rejected')}
              type="button"
            >
              ✗ Từ chối
            </button>
            <button
              className="button button-danger"
              disabled={busy || !canDecide}
              onClick={() => submit('Approved')}
              type="button"
            >
              {busy ? 'Đang ký...' : '✓ Ký thu hồi'}
            </button>
          </div>
        </div>
      ) : (
        <form
          className="reviewer-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit('Approved');
          }}
        >
          <label>
            Lý do thu hồi <span className="required-star">*</span>
            <select onChange={(event) => setReason(event.target.value)} required value={reason}>
              <option disabled value="">Chọn lý do</option>
              {REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ghi chú
            <textarea
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Bổ sung mã lỗi, thông tin cần đối soát..."
              rows="3"
              value={note}
            />
          </label>

          {error ? (
            <p className="reviewer-inline-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="modal-actions">
            <button className="button button-secondary" disabled={busy} onClick={onClose} type="button">
              Hủy
            </button>
            <button className="button button-danger" disabled={busy} type="submit">
              {busy ? 'Đang gửi...' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default RevocationModal;
