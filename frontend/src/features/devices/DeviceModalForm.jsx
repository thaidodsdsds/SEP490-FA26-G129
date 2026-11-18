import { useEffect, useState } from 'react';
import { createDeviceApi, updateDeviceApi } from '../../services/device-service.js';

export default function DeviceModalForm({
  isOpen,
  device = null, // null for create, object for edit
  role = 'customer',
  onClose,
  onSuccess,
}) {
  const isEdit = Boolean(device?.id);
  const isCustomerRole = role?.toLowerCase() === 'customer';
  const isSalesRole = role?.toLowerCase() === 'sales';

  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [measuringRange, setMeasuringRange] = useState('');
  const [isGroup2, setIsGroup2] = useState(false);
  const [nextDueDate, setNextDueDate] = useState('');
  const [status, setStatus] = useState('Active');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationNotice, setVerificationNotice] = useState(false);

  useEffect(() => {
    if (device) {
      setName(device.name || '');
      setModel(device.model || '');
      setManufacturer(device.manufacturer || '');
      setSerialNumber(device.serial_number || '');
      setInternalCode(device.internal_code || '');
      setMeasuringRange(device.measuring_range || '');
      setIsGroup2(Boolean(device.is_group2));
      setNextDueDate(device.next_due_date ? String(device.next_due_date).slice(0, 10) : '');
      setStatus(device.status || 'Active');
      setVerificationNotice(false);
    } else {
      setName('');
      setModel('');
      setManufacturer('');
      setSerialNumber('');
      setInternalCode('');
      setMeasuringRange('');
      setIsGroup2(false);
      setNextDueDate('');
      setStatus('Active');
      setVerificationNotice(false);
    }
    setError('');
  }, [device, isOpen]);

  if (!isOpen) return null;

  // Cảnh báo nếu khách hàng thay đổi serial_number
  const handleSerialChange = (val) => {
    setSerialNumber(val);
    if (isEdit && isCustomerRole && val !== (device?.serial_number || '')) {
      setVerificationNotice(true);
    } else {
      setVerificationNotice(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSalesRole && isEdit) {
      setError('Bộ phận Kinh doanh (Sales) chỉ có quyền xem chi tiết, không được phép chỉnh sửa.');
      return;
    }

    if (!name.trim()) {
      setError('Tên thiết bị là bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          name: name.trim(),
          model: model.trim() || null,
          manufacturer: manufacturer.trim() || null,
          serial_number: serialNumber.trim() || null,
          measuring_range: measuringRange.trim() || null,
          is_group2: isGroup2,
        };

        // Chỉ cho phép cập nhật hạn & trạng thái nếu không phải khách hàng
        if (!isCustomerRole) {
          payload.next_due_date = nextDueDate || null;
          payload.status = status;
        }

        const res = await updateDeviceApi(device.id, payload);
        const msg = res?.verification_message || 'Cập nhật thông tin thiết bị thành công!';
        onSuccess?.(res, msg);
        onClose();
      } else {
        const payload = {
          name: name.trim(),
          model: model.trim() || null,
          manufacturer: manufacturer.trim() || null,
          serial_number: serialNumber.trim() || null,
          internal_code: internalCode.trim() || null,
          measuring_range: measuringRange.trim() || null,
          is_group2: isGroup2,
        };

        if (!isCustomerRole) {
          payload.next_due_date = nextDueDate || null;
          payload.status = status;
        }

        const res = await createDeviceApi(payload);
        onSuccess?.(res, 'Đăng ký thiết bị mới thành công! Mã nội bộ đã được cấp.');
        onClose();
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Có lỗi xảy ra khi lưu thiết bị. Vui lòng kiểm tra lại.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="device-modal-backdrop" onClick={onClose}>
      <div className="device-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="device-modal-header">
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
            {isEdit ? 'Chỉnh sửa thông tin thiết bị' : 'Đăng ký thiết bị mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="device-modal-body">
            {error && (
              <div className="alert-warning" style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
                ⚠ {error}
              </div>
            )}

            {verificationNotice && (
              <div className="alert-warning">
                ℹ <strong>Lưu ý xác minh:</strong> Thay đổi Số Serial hoặc thông số kỹ thuật cốt lõi sẽ cần nhân viên kỹ thuật ISOCAL xác minh lại trước khi áp dụng hiệu chuẩn tiếp theo.
              </div>
            )}

            {isEdit && (
              <div className="form-group">
                <label>Mã quản lý nội bộ (Internal Code)</label>
                <input
                  type="text"
                  className="form-control"
                  value={internalCode}
                  disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed', fontWeight: 600 }}
                />
                <span className="form-helper">Mã định danh duy nhất do hệ thống cấp và bảo vệ.</span>
              </div>
            )}

            {!isEdit && (
              <div className="form-group">
                <label>Mã quản lý nội bộ (Tùy chọn)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Để trống để hệ thống tự sinh mã TB-XXXXXX"
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                />
                <span className="form-helper">
                  💡 Nếu thiết bị chưa có mã hoặc thiếu số Serial, hệ thống sẽ tự động cấp mã chuẩn.
                </span>
              </div>
            )}

            <div className="form-group">
              <label>
                Tên thiết bị <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Đồng hồ so điện tử, Cân phân tích 4 số lẻ..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: ID-C112XB"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Hãng sản xuất</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Mitutoyo, Fluke, WIKA..."
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Số Serial (Serial Number)</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: MT-110293 (Nếu có)"
                value={serialNumber}
                onChange={(e) => handleSerialChange(e.target.value)}
              />
              <span className="form-helper">
                Nếu thiết bị không có số serial khắc sẵn trên thân, hệ thống sẽ tự sinh internal_code để quản lý tem và hồ sơ đo.
              </span>
            </div>

            <div className="form-group">
              <label>Dải đo / Độ phân giải</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: 0 - 150 mm / 0.01 mm, -1 đến 25 bar..."
                value={measuringRange}
                onChange={(e) => setMeasuringRange(e.target.value)}
              />
            </div>

            {/* Checkbox Thiết bị Nhóm 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                background: isGroup2 ? '#fefce8' : '#f8fafc',
                border: isGroup2 ? '1px solid #fef08a' : '1px solid #e2e8f0',
                borderRadius: '8px',
              }}
            >
              <input
                type="checkbox"
                id="is_group2"
                checked={isGroup2}
                onChange={(e) => setIsGroup2(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="is_group2" style={{ cursor: 'pointer', fontSize: '0.88rem', margin: 0 }}>
                <strong>Thiết bị thuộc Danh mục Phương tiện đo Nhóm 2</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  Theo Luật Đo lường Việt Nam, thiết bị nhóm 2 định lượng hàng hóa, y tế, an toàn môi trường bắt buộc phải kiểm định định kỳ theo quy chuẩn QCVN.
                </p>
              </label>
            </div>

            {/* Trạng thái và Hạn hiệu chuẩn - Phân quyền rõ ràng */}
            {isCustomerRole ? (
              <div className="alert-info">
                🔒 <strong>Hạn hiệu chuẩn & Trạng thái tem:</strong> Khách hàng không chỉnh sửa trực tiếp ngày hiệu chuẩn và hạn đến hạn. Các thông tin này sẽ được ISOCAL tự động cập nhật sau mỗi chu kỳ kiểm chuẩn thành công.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label>Hạn hiệu chuẩn kế tiếp (next_due_date)</label>
                  <input
                    type="date"
                    className="form-control"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Trạng thái thiết bị</label>
                  <select
                    className="form-control"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Active">Hoạt động (Active)</option>
                    <option value="ExpiringSoon">Sắp đến hạn (ExpiringSoon)</option>
                    <option value="Expired">Quá hạn (Expired)</option>
                    <option value="InRepair">Đang sửa chữa (InRepair)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="device-modal-footer">
            <button
              type="button"
              className="devices-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="devices-btn-primary"
              disabled={loading || (isSalesRole && isEdit)}
            >
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

