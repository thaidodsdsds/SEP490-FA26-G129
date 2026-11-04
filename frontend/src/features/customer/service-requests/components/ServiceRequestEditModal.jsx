import { useEffect, useState } from 'react';
import { extractApiErrorMessage, updateServiceRequestApi } from '../../../../services/service-request-service.js';

function ServiceRequestEditModal({ isOpen, onClose, onSuccess, serviceRequest }) {
  const [locationType, setLocationType] = useState('In-lab');
  const [preferredDate, setPreferredDate] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [accessoriesNote, setAccessoriesNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (serviceRequest) {
      setLocationType(serviceRequest.location_type || 'In-lab');
      setPreferredDate(serviceRequest.preferred_date || '');
      setSpecialNotes(serviceRequest.special_notes || '');
      setAccessoriesNote(serviceRequest.accessories_note || '');
      setError('');
    }
  }, [serviceRequest]);

  if (!isOpen || !serviceRequest) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const payload = {
        location_type: locationType,
        preferred_date: preferredDate ? preferredDate.trim() : null,
        special_notes: specialNotes ? specialNotes.trim() : null,
        accessories_note: accessoriesNote ? accessoriesNote.trim() : null,
      };

      const updated = await updateServiceRequestApi(serviceRequest.id, payload);
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Không thể lưu thay đổi. Vui lòng kiểm tra lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sr-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="sr-edit-title">
      <div className="sr-modal-box sr-modal-box--wide">
        <div className="sr-modal-header">
          <div>
            <h3 id="sr-edit-title">Chỉnh sửa phiếu yêu cầu</h3>
            <p>Mã phiếu: <strong>{serviceRequest.request_code || `#${serviceRequest.id}`}</strong></p>
          </div>
          <button
            aria-label="Đóng"
            className="sr-modal-close-btn"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="sr-modal-body">
            {error && <div className="csr-inline-error">{error}</div>}

            <div className="sr-edit-grid">
              <label className="csr-field">
                <span>Hình thức thực hiện</span>
                <select
                  disabled={submitting}
                  onChange={(e) => setLocationType(e.target.value)}
                  value={locationType}
                >
                  <option value="In-lab">Tại phòng Lab ISOCAL (In-lab)</option>
                  <option value="On-site">Tận nơi tại Nhà máy (On-site)</option>
                </select>
              </label>

              <label className="csr-field">
                <span>
                  {locationType === 'In-lab' ? 'Ngày dự kiến gửi thiết bị' : 'Ngày mong muốn thực hiện'}
                </span>
                <input
                  disabled={submitting}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  type="date"
                  value={preferredDate}
                />
              </label>
            </div>

            <label className="csr-field" style={{ marginTop: '12px' }}>
              <span>Điểm hiệu chuẩn / Yêu cầu kỹ thuật cụ thể</span>
              <textarea
                disabled={submitting}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="VD: Hiệu chuẩn tại các điểm nhiệt độ 20°C, 25°C, 30°C; xuất chứng nhận song ngữ Việt – Anh..."
                rows={3}
                value={specialNotes}
              />
            </label>

            <label className="csr-field" style={{ marginTop: '12px' }}>
              <span>Phụ kiện đi kèm khi bàn giao (dây đo, nguồn, đầu dò...)</span>
              <textarea
                disabled={submitting}
                onChange={(e) => setAccessoriesNote(e.target.value)}
                placeholder="VD: 01 bộ que đo Fluke TL175, 01 túi đựng máy, 01 adapter nguồn 24VDC..."
                rows={3}
                value={accessoriesNote}
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
              Hủy bỏ
            </button>
            <button
              className="button button-primary"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceRequestEditModal;

