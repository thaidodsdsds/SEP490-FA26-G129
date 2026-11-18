import { useState } from 'react';
import { cancelServiceRequestApi, extractApiErrorMessage } from '../../../../services/service-request-service.js';

function ServiceRequestCancelModal({ isOpen, onClose, onSuccess, serviceRequest }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !serviceRequest) return null;

  const handleConfirmCancel = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await cancelServiceRequestApi(serviceRequest.id, reason.trim() || undefined);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể hủy phiếu yêu cầu. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sr-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sr-cancel-title">
      <div className="sr-modal-box sr-modal-box--danger">
        <div className="sr-modal-header">
          <div className="sr-modal-danger-icon" aria-hidden="true">⚠️</div>
          <div>
            <h3 id="sr-cancel-title">Xác nhận hủy phiếu yêu cầu</h3>
            <p>Mã phiếu: <strong>{serviceRequest.request_code || `#${serviceRequest.id}`}</strong></p>
          </div>
        </div>

        <div className="sr-modal-body">
          <p className="sr-modal-desc">
            Bạn có chắc chắn muốn hủy phiếu yêu cầu này không? Hành động này sẽ chuyển trạng thái đơn sang <strong>Đã hủy</strong> và dừng tiến trình báo giá/xử lý.
          </p>

          {error && <div className="csr-inline-error">{error}</div>}

          <label className="csr-field">
            <span>Lý do hủy yêu cầu (Tùy chọn)</span>
            <textarea
              disabled={submitting}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Thay đổi kế hoạch sản xuất, thiết bị đang bận dùng, chọn sai loại dịch vụ..."
              rows={3}
              value={reason}
            />
          </label>
        </div>

        <div className="sr-modal-actions">
          <button
            className="button button-secondary"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            Đóng / Giữ lại đơn
          </button>
          <button
            className="button button-danger"
            disabled={submitting}
            onClick={handleConfirmCancel}
            type="button"
          >
            {submitting ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServiceRequestCancelModal;

