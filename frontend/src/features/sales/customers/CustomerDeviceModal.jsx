import { useState } from 'react';
import { createCustomerDeviceApi } from '../../../services/customer-service.js';

export default function CustomerDeviceModal({ isOpen, customerId, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [measuringRange, setMeasuringRange] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [status, setStatus] = useState('Active');
  const [isGroup2, setIsGroup2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Tên thiết bị là bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        model: model.trim() || null,
        manufacturer: manufacturer.trim() || null,
        serial_number: serialNumber.trim() || null,
        measuring_range: measuringRange.trim() || null,
        next_due_date: nextDueDate || null,
        status,
        is_group2: isGroup2,
      };

      const created = await createCustomerDeviceApi(customerId, payload);
      onSuccess?.(created, 'Thêm thiết bị mới thành công!');
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        'Không thể thêm thiết bị. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sales-cust-modal-backdrop" onClick={onClose}>
      <div className="sales-cust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sales-cust-modal-header">
          <h3 className="sales-cust-modal-title">Đăng ký thiết bị mới cho khách hàng</h3>
          <button type="button" className="sales-cust-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="sales-cust-modal-body">
            {error && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: 8,
                  fontSize: '0.85rem',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <div className="sales-cust-form-group">
              <label className="sales-cust-form-label">
                Tên thiết bị / Phương tiện đo <span className="required">*</span>
              </label>
              <input
                type="text"
                className="sales-cust-form-input"
                placeholder="VD: Đồng hồ vạn năng, Cân phân tích, Thước kẹp điện tử..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="sales-cust-grid-2">
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Hãng sản xuất</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: Fluke, Mitutoyo, Mettler Toledo"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </div>

              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Model / Ký hiệu</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: 87V, 500-196-30"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>
            </div>

            <div className="sales-cust-grid-2">
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Số Serial (S/N)</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: FL-2024-99881"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                />
              </div>

              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Dải đo hoạt động</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: (0 ~ 1000) V, (0 ~ 150) mm"
                  value={measuringRange}
                  onChange={(e) => setMeasuringRange(e.target.value)}
                />
              </div>
            </div>

            <div className="sales-cust-grid-2">
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Hạn hiệu chuẩn kế tiếp</label>
                <input
                  type="date"
                  className="sales-cust-form-input"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                />
              </div>

              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Trạng thái thiết bị</label>
                <select
                  className="sales-cust-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Active">Hoạt động (Active)</option>
                  <option value="ExpiringSoon">Sắp đến hạn (Expiring Soon)</option>
                  <option value="Expired">Hết hạn hiệu chuẩn (Expired)</option>
                  <option value="InRepair">Đang sửa chữa (In Repair)</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 4 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isGroup2}
                  onChange={(e) => setIsGroup2(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#1a4ea6' }}
                />
                Thiết bị thuộc Danh mục phương tiện đo Nhóm 2 (Bắt buộc kiểm định nhà nước)
              </label>
            </div>
          </div>

          <div className="sales-cust-modal-footer">
            <button
              type="button"
              className="sales-cust-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="sales-cust-btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang thêm...' : 'Thêm thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

