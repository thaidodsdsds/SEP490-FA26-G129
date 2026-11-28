import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../../services/auth-service.js';
import loginBg from '../../assets/login_bg.jpg';
import {
  AuthBrandPanel,
  BriefcaseIcon,
  BuildingIcon,
  EyeIcon,
  HashIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UserIcon,
  UserPlusIcon,
} from './AuthBrandPanel.jsx';
import '../../styles/auth.css';

const INDUSTRY_OPTIONS = [
  { value: 'Manufacturing', label: 'Sản xuất công nghiệp' },
  { value: 'Mechanical Engineering', label: 'Cơ khí chế tạo' },
  { value: 'Food Processing', label: 'Chế biến thực phẩm' },
  { value: 'Environmental Services', label: 'Dịch vụ môi trường' },
  { value: 'Medical Equipment', label: 'Thiết bị y tế' },
  { value: 'Other', label: 'Khác' },
];

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  company_name: '',
  tax_code: '',
  industry: '',
  address: '',
};

export function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Vui lòng nhập họ và tên cùng địa chỉ email.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (!form.company_name.trim() || !form.address.trim() || !form.industry) {
      setError('Vui lòng nhập đầy đủ tên doanh nghiệp, lĩnh vực hoạt động và địa chỉ.');
      return;
    }

    setLoading(true);
    try {
      await registerApi({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        company_name: form.company_name.trim(),
        tax_code: form.tax_code.trim() || undefined,
        industry: form.industry,
        address: form.address.trim(),
      });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-shell auth-shell--login"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="auth-container auth-container--login auth-container--register-modern">
        <AuthBrandPanel />

        {/* Right form card */}
        <div className="auth-card auth-card--login auth-card--register">
          {/* <div className="auth-tabs">
            <Link className="auth-tab" to="/login" style={{ textDecoration: 'none' }}>
              Đăng nhập
            </Link>
            <button className="auth-tab active" type="button">
              Đăng ký
            </button>
          </div> */}

          <h2 className="auth-title">Tạo tài khoản mới</h2>
          <p className="auth-subtitle">
            Điền thông tin bên dưới để đăng ký tài khoản khách hàng ISOCAL
          </p>

          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-form-columns">
              {/* Cột 1: Thông tin tài khoản */}
              <div className="auth-form-col">
                <p className="auth-section-label">Thông tin tài khoản</p>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <UserIcon />
                  </span>
                  <input
                    id="register-fullname"
                    type="text"
                    className="auth-input"
                    placeholder="Họ và tên *"
                    value={form.full_name}
                    onChange={handleChange('full_name')}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <MailIcon />
                  </span>
                  <input
                    id="register-email"
                    type="email"
                    className="auth-input"
                    placeholder="Địa chỉ email *"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <PhoneIcon />
                  </span>
                  <input
                    id="register-phone"
                    type="tel"
                    className="auth-input"
                    placeholder="Số điện thoại (không bắt buộc)"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    autoComplete="tel"
                  />
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="register-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input--password"
                    placeholder="Mật khẩu (tối thiểu 6 ký tự) *"
                    value={form.password}
                    onChange={handleChange('password')}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <EyeIcon visible={showPass} />
                  </button>
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="register-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="auth-input auth-input--password"
                    placeholder="Xác nhận mật khẩu *"
                    value={form.confirmPassword}
                    onChange={handleChange('confirmPassword')}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Ẩn mật khẩu xác nhận' : 'Hiện mật khẩu xác nhận'}
                  >
                    <EyeIcon visible={showConfirm} />
                  </button>
                </div>
              </div>

              {/* Cột 2: Thông tin doanh nghiệp */}
              <div className="auth-form-col">
                <p className="auth-section-label">Thông tin doanh nghiệp</p>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <BuildingIcon />
                  </span>
                  <input
                    id="register-company-name"
                    type="text"
                    className="auth-input"
                    placeholder="Tên công ty / doanh nghiệp *"
                    value={form.company_name}
                    onChange={handleChange('company_name')}
                    required
                    autoComplete="organization"
                  />
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <HashIcon />
                  </span>
                  <input
                    id="register-tax-code"
                    type="text"
                    className="auth-input"
                    placeholder="Mã số thuế (không bắt buộc)"
                    value={form.tax_code}
                    onChange={handleChange('tax_code')}
                  />
                </div>

                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <BriefcaseIcon />
                  </span>
                  <select
                    id="register-industry"
                    className="auth-input auth-select"
                    value={form.industry}
                    onChange={handleChange('industry')}
                    required
                  >
                    <option value="">Chọn lĩnh vực hoạt động *</option>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="auth-input-wrapper auth-input-wrapper--textarea">
                  <span className="auth-input-icon auth-input-icon--top">
                    <MapPinIcon />
                  </span>
                  <textarea
                    id="register-address"
                    className="auth-input auth-textarea"
                    placeholder="Địa chỉ doanh nghiệp *"
                    value={form.address}
                    onChange={handleChange('address')}
                    required
                    rows={3}
                    autoComplete="street-address"
                  />
                </div>
              </div>
            </div>

            <div className="auth-register-actions">
              <button
                id="register-submit-btn"
                type="submit"
                className="auth-btn-primary"
                disabled={loading}
              >
                {loading ? <span className="auth-spinner" /> : <UserPlusIcon />}
                <span>{loading ? 'Đang tạo tài khoản...' : 'Đăng ký tài khoản'}</span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </div>
          </form>

          <div className="auth-register-footer">
            <span className="auth-register-login-hint">
              Đã có tài khoản?{' '}
              <Link to="/login" className="auth-link">
                Đăng nhập ngay
              </Link>
            </span>
            <div className="auth-security-footer">
              <ShieldCheckIcon size={15} filled />
              <span>Bảo mật bởi ISOCAL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
