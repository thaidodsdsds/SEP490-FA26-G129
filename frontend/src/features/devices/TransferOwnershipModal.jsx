import { useEffect, useState } from 'react';
import { listCustomersDetailedApi } from '../../services/customer-service.js';
import { transferDeviceOwnershipApi } from '../../services/device-service.js';

export default function TransferOwnershipModal({
  isOpen,
  device,
  onClose,
  onSuccess,
}) {
  const [customers, setCustomers] = useState([]);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewCustomerId('');
      setTransferReason('');
      setNotes('');
      setError('');
      setLoadingCustomers(true);

      listCustomersDetailedApi({ limit: 100 })
        .then((res) => {
          setCustomers(res?.customers || []);
        })
        .catch(() => {
          setError('Không thể tải danh sách khách hàng để chuyển nhượng.');
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [isOpen]);

  if (!isOpen || !device) return null;

  // Filter out the current customer from selection
  const eligibleCustomers = customers.filter(
    (c) => Number(c.id) !== Number(device.customer_id),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newCustomerId) {
      setError('Vui lòng chọn khách hàng tiếp nhận quyền sở hữu mới.');
      return;
    }

    if (!transferReason.trim()) {
      setError('Lý do chuyển giao quyền sở hữu là bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const res = await transferDeviceOwnershipApi(device.id, {
        new_customer_id: Number(newCustomerId),
        transfer_reason: transferReason.trim(),
        notes: notes.trim() || null,
      });

      onSuccess?.(
        res,
        res?.message || 'Chuyển quyền sở hữu thiết bị thành công!',
      );
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Không thể chuyển quyền sở hữu thiết bị. Vui lòng kiểm tra lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="device-modal-backdrop" onClick={onClose}>
      <div className="device-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="device-modal-header">
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
            🔄 Chuyển quyền sở hữu thiết bị (Transfer Ownership)
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
              <div
                className="alert-warning"
                style={{
                  background: '#fef2f2',
                  borderColor: '#fca5a5',
                  color: '#b91c1c',
                }}
              >
                ⚠ {error}
              </div>
            )}

            {/* Target Device Summary */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                fontSize: '0.86rem',
              }}
            >
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
                  Thiết bị chuyển giao
                </span>
                <strong style={{ color: '#0f172a' }}>{device.name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
                  Mã nội bộ
                </span>
                <span className="badge-code">{device.internal_code}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
                  Số Serial
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                  {device.serial_number || 'Chưa có serial'}
                </span>
              </div>
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>
                  Chủ sở hữu hiện tại
                </span>
                <strong style={{ color: '#b45309' }}>
                  {device.customer?.company_name || `Khách hàng #${device.customer_id}`}
                </strong>
              </div>
            </div>

            {/* New Customer Selector */}
            <div className="form-group">
              <label>
                Khách hàng tiếp nhận quyền sở hữu mới <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="form-control"
                value={newCustomerId}
                onChange={(e) => setNewCustomerId(e.target.value)}
                disabled={loadingCustomers || loading}
                required
              >
                <option value="">
                  {loadingCustomers ? 'Đang tải danh sách khách hàng...' : '-- Chọn doanh nghiệp nhận sở hữu --'}
                </option>
                {eligibleCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} (MST: {c.tax_code || 'Chưa có'})
                  </option>
                ))}
              </select>
              <span className="form-helper">
                Chủ sở hữu hiện tại sẽ được tự động chuyển thành chủ sở hữu trước trong hồ sơ lịch sử.
              </span>
            </div>

            {/* Transfer Reason */}
            <div className="form-group">
              <label>
                Lý do chuyển giao quyền sở hữu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Mua bán chuyển nhượng, Sáp nhập chi nhánh, Bàn giao tài sản thanh lý..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                required
              />
            </div>

            {/* Notes / Legal reference */}
            <div className="form-group">
              <label>Ghi chú & Hồ sơ căn cứ (Số HĐ / Biên bản bàn giao)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="VD: Căn cứ Biên bản bàn giao tài sản số BB-2026/089 ký ngày 05/11/2026 giữa hai bên..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="alert-info">
              ℹ <strong>Lưu ý xác thực:</strong> Thao tác này sẽ ghi nhận vào bảng{' '}
              <code>DeviceOwnershipHistory</code>, cập nhật quyền sở hữu trong hệ thống và chỉ có nhân viên nội bộ (Sales, Admin) được quyền thực hiện.
            </div>
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
              disabled={loading || !newCustomerId || !transferReason.trim()}
              style={{ background: '#d97706', borderColor: '#d97706' }}
            >
              {loading ? 'Đang chuyển quyền...' : '🔄 Xác nhận chuyển sở hữu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
