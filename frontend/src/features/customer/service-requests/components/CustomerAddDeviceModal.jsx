import { useState } from 'react';

const initialFormState = {
  name: '',
  manufacturer: '',
  model: '',
  serial_number: '',
  internal_code: '',
  measuring_range: '',
  next_due_date: '',
  is_group2: false,
};

function CustomerAddDeviceModal({ onAddDevice, onCancel, submitting, serverError }) {
  const [formData, setFormData] = useState(initialFormState);
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên thiết bị đo lường.');
      return;
    }

    const ok = await onAddDevice({
      name: formData.name.trim(),
      manufacturer: formData.manufacturer.trim() || null,
      model: formData.model.trim() || null,
      serial_number: formData.serial_number.trim() || null,
      internal_code: formData.internal_code.trim() || null,
      measuring_range: formData.measuring_range.trim() || null,
      next_due_date: formData.next_due_date || null,
      is_group2: Boolean(formData.is_group2),
    });

    if (ok) {
      setFormData(initialFormState);
    }
  };

  return (
    <div className="csr-add-device-panel" role="region" aria-label="Khai báo thiết bị mới">
      <div className="csr-add-device-header">
        <div>
          <h3>+ Khai báo thiết bị mới của đơn vị</h3>
          <p>Thiết bị được lưu trực tiếp vào cơ sở dữ liệu công ty và tự động tích chọn vào phiếu yêu cầu này.</p>
        </div>
      </div>

      <div className="csr-add-device-grid">
        <label className="csr-field csr-field--span2">
          <span>Tên thiết bị đo lường <b>*</b></span>
          <input
            autoFocus
            disabled={submitting}
            onChange={(event) => handleChange('name', event.target.value)}
            placeholder="VD: Đồng hồ vạn năng số, Cân phân tích điện tử, Nhiệt ẩm kế..."
            type="text"
            value={formData.name}
          />
        </label>

        <label className="csr-field">
          <span>Hãng sản xuất (manufacturer)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('manufacturer', event.target.value)}
            placeholder="VD: Fluke, Mettler Toledo, WIKA..."
            type="text"
            value={formData.manufacturer}
          />
        </label>

        <label className="csr-field">
          <span>Model / Kiểu máy</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('model', event.target.value)}
            placeholder="VD: 289, BBA231, MDO3024..."
            type="text"
            value={formData.model}
          />
        </label>

        <label className="csr-field">
          <span>Số Serial (S/N)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('serial_number', event.target.value)}
            placeholder="VD: FL-289-20941"
            type="text"
            value={formData.serial_number}
          />
        </label>

        <label className="csr-field">
          <span>Mã quản lý nội bộ (để trống sẽ tự sinh)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('internal_code', event.target.value)}
            placeholder="VD: QC-DMM-08"
            type="text"
            value={formData.internal_code}
          />
        </label>

        <label className="csr-field">
          <span>Dải đo (measuring_range)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('measuring_range', event.target.value)}
            placeholder="VD: 0 – 1000V, 0 – 150kg..."
            type="text"
            value={formData.measuring_range}
          />
        </label>

        <label className="csr-field">
          <span>Hạn hiệu chuẩn tiếp theo (next_due_date)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleChange('next_due_date', event.target.value)}
            type="date"
            value={formData.next_due_date}
          />
        </label>
      </div>

      <label className="csr-checkbox-row">
        <input
          checked={formData.is_group2}
          disabled={submitting}
          onChange={(event) => handleChange('is_group2', event.target.checked)}
          type="checkbox"
        />
        <span>
          <strong>Phương tiện đo Nhóm 2</strong> (thuộc danh mục bắt buộc Kiểm định nhà nước về đo lường / an toàn lao động)
        </span>
      </label>

      {(error || serverError) && (
        <p className="csr-inline-error" role="alert">
          {error || serverError}
        </p>
      )}

      <div className="csr-add-device-actions">
        <button
          className="button button-secondary"
          disabled={submitting}
          onClick={onCancel}
          type="button"
        >
          Hủy bỏ
        </button>
        <button
          className="button button-primary"
          disabled={submitting}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? 'Đang lưu thiết bị...' : 'Lưu & Chọn thiết bị này'}
        </button>
      </div>
    </div>
  );
}

export default CustomerAddDeviceModal;
