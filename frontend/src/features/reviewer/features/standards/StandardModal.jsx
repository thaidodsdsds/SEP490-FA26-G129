import { useState } from 'react';
import Modal from '../../shared/Modal.jsx';

function StandardModal({ standard, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: standard?.name || '',
    serial_number: standard?.serial_number || standard?.serial || '',
    accuracy_class: standard?.accuracy_class || standard?.accuracy || '',
    calibration_expiry: standard?.calibration_expiry ? standard.calibration_expiry.slice(0, 10) : '2027-10-21',
    status: standard?.status || 'Active',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Tên chuẩn đối chứng không được để trống.');
      return;
    }
    if (!formData.serial_number.trim()) {
      setError('Số serial không được để trống.');
      return;
    }
    if (!formData.calibration_expiry) {
      setError('Vui lòng chọn hạn hiệu chuẩn.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({
        name: formData.name.trim(),
        serial_number: formData.serial_number.trim(),
        accuracy_class: formData.accuracy_class.trim() || null,
        calibration_expiry: formData.calibration_expiry,
        status: formData.status,
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu chuẩn đo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      eyebrow="MASTER STANDARD (ISO/IEC 17025)"
      title={standard ? `Cập nhật chuẩn: ${standard.name}` : 'Thêm chuẩn đối chứng mới'}
      onClose={onClose}
    >
      <form className="reviewer-form" onSubmit={handleSubmit}>
        {error && <div className="reviewer-alert reviewer-alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <label>
          Tên thiết bị chuẩn / Mẫu chuẩn đối chứng <span style={{ color: 'red' }}>*</span>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ví dụ: Fluke 5522A Multi-Product Calibrator"
            required
          />
        </label>

        <div className="form-grid-two">
          <label>
            Số Serial (S/N) <span style={{ color: 'red' }}>*</span>
            <input
              name="serial_number"
              value={formData.serial_number}
              onChange={handleChange}
              placeholder="Ví dụ: FLK-5522A-9921"
              required
            />
          </label>
          <label>
            Cấp chính xác / Độ không đảm bảo đo
            <input
              name="accuracy_class"
              value={formData.accuracy_class}
              onChange={handleChange}
              placeholder="Ví dụ: 0.01% hoặc ±0.05 °C"
            />
          </label>
        </div>

        <div className="form-grid-two">
          <label>
            Hạn hiệu chuẩn (Calibration Expiry) <span style={{ color: 'red' }}>*</span>
            <input
              name="calibration_expiry"
              type="date"
              value={formData.calibration_expiry}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Trạng thái hoạt động
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Active">Active (Sẵn sàng)</option>
              <option value="Inactive">Inactive (Tạm ngừng)</option>
              <option value="Expired">Expired (Đã hết hạn)</option>
            </select>
          </label>
        </div>

        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: 6, fontSize: '0.85rem', color: '#475569', marginTop: 8 }}>
          <strong>Lưu ý ISO/IEC 17025:</strong> Thiết bị chuẩn phải còn hiệu lực kiểm định/hiệu chuẩn tại thời điểm thực hiện phép đo. Nếu hạn chuẩn nhỏ hơn ngày kết thúc phân công công việc, hệ thống sẽ chặn phân công kỹ thuật viên.
        </div>

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="button button-secondary" onClick={onClose} type="button" disabled={saving}>
            Hủy
          </button>
          <button className="button button-primary" type="submit" disabled={saving}>
            {saving ? 'Đang lưu...' : (standard ? 'Lưu cập nhật' : 'Tạo mới chuẩn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default StandardModal;
