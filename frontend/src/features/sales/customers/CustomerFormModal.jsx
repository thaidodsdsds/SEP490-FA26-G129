import { useEffect, useState } from 'react';
import { createCustomerApi, updateCustomerApi } from '../../../services/customer-service.js';

const COMMON_INDUSTRIES = [
  'Sản xuất & Chế tạo (Manufacturing)',
  'Cơ khí chính xác (Mechanical Engineering)',
  'Điện & Điện tử (Electronics)',
  'Y tế & Thiết bị y tế (Medical Equipment)',
  'Chế biến thực phẩm (Food Processing)',
  'Dược phẩm & Mỹ phẩm (Pharmaceuticals)',
  'Hóa chất & Vật liệu (Chemicals)',
  'Dầu khí & Năng lượng (Oil & Energy)',
  'Môi trường & Xử lý nước (Environmental)',
  'Dệt may & Da giày (Textiles)',
  'Khác (Other)',
];

export default function CustomerFormModal({ isOpen, customer, onClose, onSuccess }) {
  const isEdit = Boolean(customer?.id);

  const [companyName, setCompanyName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [industry, setIndustry] = useState(COMMON_INDUSTRIES[0]);
  const [address, setAddress] = useState('');

  // Initial contact person fields (for create mode)
  const [withContact, setWithContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactPassword, setContactPassword] = useState('Isocal@123');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (customer) {
        setCompanyName(customer.company_name || '');
        setTaxCode(customer.tax_code || '');
        setIndustry(customer.industry || COMMON_INDUSTRIES[0]);
        setAddress(customer.address || '');
        setWithContact(false);
      } else {
        setCompanyName('');
        setTaxCode('');
        setIndustry(COMMON_INDUSTRIES[0]);
        setAddress('');
        setWithContact(false);
        setContactName('');
        setContactEmail('');
        setContactPhone('');
        setContactPassword('Isocal@123');
      }
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Vui lòng nhập tên doanh nghiệp / khách hàng.');
      return;
    }
    if (!address.trim()) {
      setError('Vui lòng nhập địa chỉ trụ sở.');
      return;
    }
    if (!industry.trim()) {
      setError('Vui lòng chọn hoặc nhập lĩnh vực hoạt động.');
      return;
    }

    if (!isEdit && withContact) {
      if (!contactName.trim() || !contactEmail.trim()) {
        setError('Vui lòng điền họ tên và email người liên hệ.');
        return;
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        const payload = {
          company_name: companyName.trim(),
          tax_code: taxCode.trim() || null,
          industry: industry.trim(),
          address: address.trim(),
        };
        const updated = await updateCustomerApi(customer.id, payload);
        onSuccess?.(updated, 'Cập nhật thông tin khách hàng thành công!');
      } else {
        const payload = {
          company_name: companyName.trim(),
          tax_code: taxCode.trim() || null,
          industry: industry.trim(),
          address: address.trim(),
          ...(withContact
            ? {
                contact_person: {
                  full_name: contactName.trim(),
                  email: contactEmail.trim(),
                  phone: contactPhone.trim() || null,
                  password: contactPassword.trim() || 'Isocal@123',
                },
              }
            : {}),
        };
        const created = await createCustomerApi(payload);
        onSuccess?.(created, 'Thêm mới khách hàng thành công!');
      }
      onClose();
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        'Không thể lưu thông tin khách hàng. Vui lòng kiểm tra lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sales-cust-modal-backdrop" onClick={onClose}>
      <div className="sales-cust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sales-cust-modal-header">
          <h3 className="sales-cust-modal-title">
            {isEdit ? 'Chỉnh sửa thông tin khách hàng' : 'Thêm mới khách hàng doanh nghiệp'}
          </h3>
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

            {/* Tên công ty */}
            <div className="sales-cust-form-group">
              <label className="sales-cust-form-label">
                Tên doanh nghiệp / Đơn vị <span className="required">*</span>
              </label>
              <input
                type="text"
                className="sales-cust-form-input"
                placeholder="VD: Công ty TNHH Cơ khí Chính xác ABC"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="sales-cust-grid-2">
              {/* Mã số thuế */}
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">Mã số thuế (MST)</label>
                <input
                  type="text"
                  className="sales-cust-form-input"
                  placeholder="VD: 0312345678"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                />
              </div>

              {/* Lĩnh vực */}
              <div className="sales-cust-form-group">
                <label className="sales-cust-form-label">
                  Lĩnh vực hoạt động <span className="required">*</span>
                </label>
                <select
                  className="sales-cust-form-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  {COMMON_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="sales-cust-form-group">
              <label className="sales-cust-form-label">
                Địa chỉ trụ sở / nhà xưởng <span className="required">*</span>
              </label>
              <textarea
                className="sales-cust-form-textarea"
                placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            {/* Tạo kèm tài khoản (chỉ khi tạo mới) */}
            {!isEdit && (
              <div style={{ marginTop: 8 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                    fontSize: '0.86rem',
                    fontWeight: 650,
                    color: '#1a4ea6',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={withContact}
                    onChange={(e) => setWithContact(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1a4ea6' }}
                  />
                  Tạo tài khoản đăng nhập ban đầu cho khách hàng
                </label>

                {withContact && (
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: 16,
                      marginTop: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div className="sales-cust-grid-2">
                      <div className="sales-cust-form-group">
                        <label className="sales-cust-form-label">
                          Họ và tên người đại diện <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          className="sales-cust-form-input"
                          placeholder="VD: Nguyễn Văn A"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </div>
                      <div className="sales-cust-form-group">
                        <label className="sales-cust-form-label">
                          Email đăng nhập <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          className="sales-cust-form-input"
                          placeholder="VD: contact@doanhnghiep.vn"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sales-cust-grid-2">
                      <div className="sales-cust-form-group">
                        <label className="sales-cust-form-label">Số điện thoại</label>
                        <input
                          type="text"
                          className="sales-cust-form-input"
                          placeholder="VD: 0912345678"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                      </div>
                      <div className="sales-cust-form-group">
                        <label className="sales-cust-form-label">Mật khẩu khởi tạo</label>
                        <input
                          type="text"
                          className="sales-cust-form-input"
                          placeholder="Mặc định: Isocal@123"
                          value={contactPassword}
                          onChange={(e) => setContactPassword(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sales-cust-modal-footer">
            <button
              type="button"
              className="sales-cust-btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="sales-cust-btn-primary"
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo khách hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

