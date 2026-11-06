import { useState } from 'react';
import { createCustomerAccountApi } from '../../../services/customer-service.js';

export default function CustomerAccountModal({ isOpen, customerId, onClose, onSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Isocal@123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim()) {
      setError('Họ và tên và Email là thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const created = await createCustomerAccountApi(customerId, {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password: password.trim() || 'Isocal@123',
      });
      onSuccess?.(created, 'Tạo tài khoản người dùng thành công!');
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        'Không thể tạo tài khoản. Vui lòng kiểm tra lại thông tin.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sales-cust-modal-backdrop" onClick={onClose}>
      <div className="sales-cust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sales-cust-modal-header">
          <h3 className="sales-cust-modal-title">Thêm tài khoản người dùng cho khách hàng</h3>
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
                Họ và tên <span className="required">*</span>
              </label>
              <input
                type="text"
                className="sales-cust-form-input"
                placeholder="VD: Trần Văn Bình"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="sales-cust-form-group">
              <label className="sales-cust-form-label">
                Email đăng nhập <span className="required">*</span>
              </label>
              <input
                type="email"
                className="sales-cust-form-input"
                placeholder="VD: binh.tran@congty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="sales-cust-grid-2">
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Số điện thoại</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: 0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Mật khẩu khởi tạo</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="Mặc định: Isocal@123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: '0.82rem',
                color: '#1e40af',
                lineHeight: 1.45,
              }}
            >
              ℹ Tài khoản sẽ được cấp quyền <strong>Khách hàng (Customer)</strong> để truy cập cổng thông tin tra cứu thiết bị, xem báo giá và gửi yêu cầu dịch vụ.
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
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

