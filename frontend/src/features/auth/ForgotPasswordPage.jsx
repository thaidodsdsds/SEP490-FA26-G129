import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../services/auth-service.js';
import loginBg from '../../assets/login_bg.jpg';
import { AuthBrandPanel, MailIcon, ShieldCheckIcon } from './AuthBrandPanel.jsx';
import '../../styles/auth.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const targetEmail = email.trim();
    try {
      await forgotPasswordApi(targetEmail);
      setSentEmail(targetEmail);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSentEmail('');
    setEmail('');
    setError('');
  };

  return (
    <div
      className="auth-shell auth-shell--login"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="auth-container auth-container--login">
        <AuthBrandPanel />

        {/* Right form card */}
        <div className="auth-card auth-card--login">
          <Link to="/login" className="auth-back-link">← Quay lại đăng nhập</Link>

          <div className="auth-card__badge" aria-hidden="true">
            <ShieldCheckIcon size={32} />
          </div>

          <h2 className="auth-title">Quên mật khẩu?</h2>
          <p className="auth-subtitle">
            Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ gửi thư kèm liên kết hướng dẫn đặt lại mật khẩu về hòm thư của bạn.
          </p>

          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {sentEmail ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="auth-success" style={{ lineHeight: 1.5 }}>
                <span>✓</span>
                <div>
                  Liên kết đặt lại mật khẩu đã được gửi đến: <br />
                  <strong>{sentEmail}</strong>
                </div>
              </div>

              <div className="auth-info-box">
                <span className="auth-info-box__icon">ℹ</span>
                <span className="auth-info-box__text">
                  Vui lòng kiểm tra hộp thư đến (Inbox) hoặc thư mục <strong>Spam / Thư rác</strong>.
                  Liên kết chỉ có hiệu lực trong vòng <strong>15 phút</strong>.
                </span>
              </div>

              <button
                type="button"
                className="auth-btn-secondary"
                onClick={handleResetForm}
                style={{ marginTop: 8 }}
              >
                Gửi lại hoặc nhập email khác
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <MailIcon />
                </span>
                <input
                  id="forgot-email"
                  type="email"
                  className="auth-input"
                  placeholder="Nhập địa chỉ email của bạn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <button
                id="forgot-password-btn"
                type="submit"
                className="auth-btn-primary"
                disabled={loading || !email.trim()}
              >
                {loading ? <span className="auth-spinner" /> : null}
                <span>{loading ? 'Đang gửi email...' : 'Gửi liên kết đặt lại mật khẩu'}</span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>
          )}

          <p className="auth-divider" style={{ marginTop: 22 }}>
            <Link to="/login" className="auth-link">Bạn đã nhớ mật khẩu? Đăng nhập ngay</Link>
          </p>

          <div className="auth-security-footer">
            <ShieldCheckIcon size={15} filled />
            <span>Dữ liệu của bạn được bảo mật bởi ISOCAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
