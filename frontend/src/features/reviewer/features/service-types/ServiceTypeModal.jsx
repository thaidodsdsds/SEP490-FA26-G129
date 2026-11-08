import { useEffect, useState } from 'react';
import {
  ALLOWED_FIELDS,
  ALLOWED_KINDS,
} from '../../../../services/procedure-service.js';

const FIELD_LABELS = {
  DIEN: 'Điện – Điện tử – Tần số',
  KHOILUONG: 'Khối lượng – Lực',
  DODAI: 'Độ dài – Dung tích',
  APSUAT: 'Áp suất – Lưu lượng',
  NHIET: 'Nhiệt độ – Độ ẩm',
  HOA: 'Hóa học – Y tế – Môi trường',
  QUANG: 'Quang học – Âm thanh',
  DET: 'Dệt may – Da giày – Thực phẩm',
};

function ServiceTypeModal({ isOpen, onClose, onSave, editingItem }) {
  const [formData, setFormData] = useState({
    name: '',
    kind: 'Calibration',
    field: 'DIEN',
    standard_code: '',
    measuring_range: '',
    description: '',
    status: 'Active',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        kind: editingItem.kind || 'Calibration',
        field: editingItem.field || 'DIEN',
        standard_code: editingItem.standard_code || '',
        measuring_range: editingItem.measuring_range || '',
        description: editingItem.description || '',
        status: editingItem.status || 'Active',
      });
    } else {
      setFormData({
        name: '',
        kind: 'Calibration',
        field: 'DIEN',
        standard_code: '',
        measuring_range: '',
        description: '',
        status: 'Active',
      });
    }
    setError('');
  }, [editingItem, isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên loại dịch vụ.');
      return;
    }
    if (!formData.standard_code.trim()) {
      setError('Vui lòng nhập mã quy trình / tiêu chuẩn tham chiếu.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await onSave({
        ...formData,
        name: formData.name.trim(),
        standard_code: formData.standard_code.trim(),
        measuring_range: formData.measuring_range.trim() || null,
        description: formData.description.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Có lỗi xảy ra khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-labelledby="service-type-modal-title"
      aria-modal="true"
      className="admin-modal-backdrop"
      role="dialog"
      style={{ zIndex: 1000 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="admin-modal" style={{ maxWidth: 620, width: '100%', margin: '0 auto' }}>
        <div className="admin-modal-header">
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>
              DANH MỤC DỊCH VỤ (ISO/IEC 17025)
            </span>
            <h2 className="admin-modal-title" id="service-type-modal-title" style={{ fontSize: '1.15rem' }}>
              {editingItem ? `Chỉnh sửa: ${editingItem.name}` : 'Thêm loại dịch vụ mới'}
            </h2>
          </div>
          <button
            aria-label="Đóng"
            className="admin-modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{ background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: '0.84rem' }}>
              {error}
            </div>
          )}

          {/* Tên dịch vụ */}
          <div className="admin-field">
            <label className="admin-label">
              Tên loại dịch vụ <span className="admin-required">*</span>
            </label>
            <input
              className="admin-input"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Hiệu chuẩn đồng hồ vạn năng số (Digital Multimeter)"
            />
          </div>

          {/* Loại hình & Lĩnh vực */}
          <div className="admin-form-row two">
            <div className="admin-field" style={{ flex: 1 }}>
              <label className="admin-label">
                Loại hình dịch vụ <span className="admin-required">*</span>
              </label>
              <select
                className="admin-input admin-select"
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value })}
              >
                <option value="Calibration">Hiệu chuẩn (Calibration)</option>
                <option value="Verification">Kiểm định (Verification)</option>
                <option value="Repair">Sửa chữa / Bảo dưỡng (Repair)</option>
              </select>
            </div>

            <div className="admin-field" style={{ flex: 1 }}>
              <label className="admin-label">
                Lĩnh vực đo lường (1 trong 8) <span className="admin-required">*</span>
              </label>
              <select
                className="admin-input admin-select"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              >
                {Object.entries(FIELD_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mã quy trình & Trạng thái */}
          <div className="admin-form-row two">
            <div className="admin-field" style={{ flex: 1 }}>
              <label className="admin-label">
                Mã quy trình / Tiêu chuẩn kỹ thuật <span className="admin-required">*</span>
              </label>
              <input
                className="admin-input"
                required
                value={formData.standard_code}
                onChange={(e) => setFormData({ ...formData, standard_code: e.target.value })}
                placeholder="VD: ĐLVN 99:2020 hoặc ISOCAL-HC-DIEN-01"
              />
            </div>

            <div className="admin-field" style={{ flex: 1 }}>
              <label className="admin-label">
                Trạng thái hoạt động
              </label>
              <select
                className="admin-input admin-select"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active (Đang hoạt động)</option>
                <option value="Inactive">Inactive (Tạm ngừng)</option>
              </select>
            </div>
          </div>

          {/* Phạm vi đo */}
          <div className="admin-field">
            <label className="admin-label">
              Phạm vi đo áp dụng (Measuring Range)
            </label>
            <input
              className="admin-input"
              value={formData.measuring_range}
              onChange={(e) => setFormData({ ...formData, measuring_range: e.target.value })}
              placeholder="VD: DCV: 0 – 1000V; ACV: 0 – 750V; R: đến 100 MΩ"
            />
          </div>

          {/* Mô tả kỹ thuật */}
          <div className="admin-field">
            <label className="admin-label">
              Mô tả kỹ thuật / Căn cứ đo lường
            </label>
            <textarea
              className="admin-input"
              rows={3}
              style={{ fontFamily: 'inherit', resize: 'vertical' }}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ghi chú chi tiết về căn cứ kỹ thuật, chuẩn đối chứng đề xuất, yêu cầu an toàn phòng đo..."
            />
          </div>

          {/* Footer nút hành động */}
          <div className="admin-modal-footer" style={{ marginTop: 8 }}>
            <button
              className="button button-secondary"
              onClick={onClose}
              type="button"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              className="button button-primary"
              disabled={saving}
              type="submit"
            >
              {saving ? 'Đang lưu...' : (editingItem ? 'Cập nhật' : 'Tạo dịch vụ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceTypeModal;
export { FIELD_LABELS };
