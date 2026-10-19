import { useState } from 'react';
import { createCustomer } from './customers.api.js';
import './customers.css';

const initialForm = { name: '', email: '', phone: '' };

const getRequestErrorMessage = (error) => {
  if (error.response) {
    return error.response.data?.error?.message
      || `Máy chủ trả về lỗi ${error.response.status}. Vui lòng thử lại.`;
  }

  if (error.request) {
    return 'Không nhận được phản hồi từ máy chủ. Hãy kiểm tra backend và kết nối mạng.';
  }

  return error.message || 'Không thể tạo khách hàng. Vui lòng thử lại.';
};

function CustomerManagementPage() {
  const [form, setForm] = useState(initialForm);
  const [createdCustomers, setCreatedCustomers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const customer = await createCustomer({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      });

      setCreatedCustomers((customers) => [customer, ...customers]);
      setForm(initialForm);
      setSuccessMessage(`Đã tạo khách hàng ${customer.name} thành công.`);
    } catch (error) {
      setErrorMessage(getRequestErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="customers-heading">
        <div>
          <p className="eyebrow">DỮ LIỆU KHÁCH HÀNG</p>
          <h1>Quản lý khách hàng</h1>
          <p className="customers-subtitle">
            Tạo hồ sơ khách hàng để sử dụng trong các quy trình dịch vụ tiếp theo.
          </p>
        </div>
        <div className="customers-count" aria-label={`${createdCustomers.length} khách hàng vừa tạo`}>
          <span>{createdCustomers.length}</span>
          <small>vừa tạo</small>
        </div>
      </div>

      <div className="customers-grid">
        <section className="customer-card">
          <div className="card-heading">
            <div>
              <span className="step-label">THÔNG TIN HỒ SƠ</span>
              <h2>Tạo khách hàng mới</h2>
            </div>
            <span className="card-icon" aria-hidden="true">+</span>
          </div>

          <form className="customer-form" onSubmit={handleSubmit}>
            <label htmlFor="customer-name">
              Họ và tên <span className="required-mark">*</span>
            </label>
            <input
              autoComplete="name"
              id="customer-name"
              name="name"
              onChange={updateField}
              placeholder="Ví dụ: Nguyễn Văn An"
              required
              value={form.name}
            />

            <label htmlFor="customer-email">
              Email <span className="required-mark">*</span>
            </label>
            <input
              autoComplete="email"
              id="customer-email"
              name="email"
              onChange={updateField}
              placeholder="ten@congty.vn"
              required
              type="email"
              value={form.email}
            />
            <p className="field-hint">Email được dùng để nhận diện khách hàng và không được trùng.</p>

            <label htmlFor="customer-phone">Số điện thoại</label>
            <input
              autoComplete="tel"
              id="customer-phone"
              minLength={8}
              name="phone"
              onChange={updateField}
              placeholder="Ví dụ: 0901234567"
              type="tel"
              value={form.phone}
            />
            <p className="field-hint">Không bắt buộc; nếu nhập cần có ít nhất 8 ký tự.</p>

            {errorMessage && (
              <div className="form-message form-message-error" role="alert">
                <strong>Chưa thể tạo khách hàng</strong>
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="form-message form-message-success" role="status">
                {successMessage}
              </div>
            )}

            <button className="button button-primary submit-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Đang lưu...' : 'Tạo hồ sơ khách hàng'}
            </button>
          </form>
        </section>

        <section className="customer-card recent-card">
          <div className="card-heading">
            <div>
              <span className="step-label">PHIÊN LÀM VIỆC NÀY</span>
              <h2>Khách hàng vừa tạo</h2>
            </div>
          </div>

          {createdCustomers.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" aria-hidden="true">◎</span>
              <strong>Chưa có hồ sơ mới</strong>
              <p>Khách hàng bạn tạo thành công sẽ xuất hiện tại đây trong phiên hiện tại.</p>
            </div>
          ) : (
            <ul className="customer-list">
              {createdCustomers.map((customer) => (
                <li className="customer-list-item" key={customer.id}>
                  <span className="customer-avatar" aria-hidden="true">
                    {customer.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="customer-list-details">
                    <strong>{customer.name}</strong>
                    <span>{customer.email}</span>
                    {customer.phone && <span>{customer.phone}</span>}
                  </span>
                  <span className="customer-status">Đã tạo</span>
                </li>
              ))}
            </ul>
          )}

          <div className="api-note">
            Danh sách này chỉ lưu trong giao diện của phiên hiện tại. Backend hiện hỗ trợ tạo khách hàng;
            API đọc danh sách chưa được triển khai.
          </div>
        </section>
      </div>
    </div>
  );
}

export default CustomerManagementPage;
