import { useState } from 'react';
import { INITIAL_NEW_DEVICE } from '../constants.js';

function AddDevicePanel({
  customerName,
  submitting,
  errorMessage,
  onCancel,
  onCreateDevice,
}) {
  const [formData, setFormData] = useState(INITIAL_NEW_DEVICE);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim() || submitting) return;

    const success = await onCreateDevice({
      name: formData.name.trim(),
      manufacturer: formData.manufacturer.trim() || null,
      model: formData.model.trim() || null,
      serial_number: formData.serial_number.trim() || null,
      internal_code: formData.internal_code.trim() || null,
      measuring_range: formData.measuring_range.trim() || null,
      is_group2: Boolean(formData.is_group2),
    });

    if (success) {
      setFormData(INITIAL_NEW_DEVICE);
    }
  };

  return (
    <div className="sr-new-device">
      <div className="sr-new-device-heading">
        <div>
          <strong>Thêm thiết bị mới cho {customerName}</strong>
          <p>Thiết bị sẽ được lưu trực tiếp vào danh mục của khách hàng và tự động chọn vào phiếu yêu cầu.</p>
        </div>
      </div>

      <div className="sr-new-device-grid">
        <label className="sr-field">
          <span>Tên thiết bị <b>*</b></span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            placeholder="VD: Đồng hồ vạn năng số"
            required
            value={formData.name}
          />
        </label>

        <label className="sr-field">
          <span>Hãng sản xuất</span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('manufacturer', event.target.value)}
            placeholder="VD: Fluke, Mitutoyo, Tektronix..."
            value={formData.manufacturer}
          />
        </label>

        <label className="sr-field">
          <span>Model / Kiểu</span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('model', event.target.value)}
            placeholder="VD: 289, MDO3024..."
            value={formData.model}
          />
        </label>

        <label className="sr-field">
          <span>Số Serial (S/N)</span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('serial_number', event.target.value)}
            placeholder="VD: FL-289-20041 (Không bắt buộc)"
            value={formData.serial_number}
          />
        </label>

        <label className="sr-field">
          <span>Mã quản lý nội bộ</span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('internal_code', event.target.value)}
            placeholder="Bỏ trống để hệ thống tự sinh (TB-...)"
            value={formData.internal_code}
          />
        </label>

        <label className="sr-field">
          <span>Phạm vi đo</span>
          <input
            disabled={submitting}
            onChange={(event) => handleFieldChange('measuring_range', event.target.value)}
            placeholder="VD: 0 - 1000 V"
            value={formData.measuring_range}
          />
        </label>
      </div>

      <label className="sr-checkbox-inline">
        <input
          checked={formData.is_group2}
          disabled={submitting}
          onChange={(event) => handleFieldChange('is_group2', event.target.checked)}
          type="checkbox"
        />
        <span>Thiết bị thuộc danh mục phương tiện đo nhóm 2 (bắt buộc kiểm định nhà nước)</span>
      </label>

      {errorMessage && (
        <p className="sr-inline-error" role="alert">
          {errorMessage}
        </p>
      )}

      <div className="sr-new-device-actions">
        <button
          className="button button-secondary"
          disabled={submitting}
          onClick={onCancel}
          type="button"
        >
          Hủy
        </button>
        <button
          className="button button-primary"
          disabled={!formData.name.trim() || submitting}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? 'Đang lưu thiết bị...' : '+ Lưu & chọn thiết bị'}
        </button>
      </div>
    </div>
  );
}

export default AddDevicePanel;

