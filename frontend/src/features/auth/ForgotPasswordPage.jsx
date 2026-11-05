import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../services/auth-service.js';
import isocalLogo from '../../assets/isocal_logo.png';
import calibrationIllustration from '../../assets/calibration_illustration.png';
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
    <div className="auth-shell">
      <div className="auth-container">
        {/* Left brand panel */}
        <div className="auth-brand">
          <img src={isocalLogo} alt="ISOCAL" className="auth-brand__logo" />
          <h2 className="auth-brand__headline">Hiệu chuẩn &amp; Kiểm định cho Thế giới Chính xác hơn</h2>
          <p className="auth-brand__desc">
            Quản trị toàn diện quy trình dịch vụ từ yêu cầu báo giá đến cấp chứng nhận,
            minh bạch và tin cậy.
          </p>
          <div className="auth-illustration">
            <img src={calibrationIllustration} alt="Thiết bị hiệu chuẩn ISOCAL" />
          </div>
        </div>

        {/* Right form card */}
        <div className="auth-card">
          <Link to="/login" className="auth-back-link">← Quay lại đăng nhập</Link>

          <h2 className="auth-title">Quên mật khẩu?</h2>
          <p className="auth-subtitle">
            Nhập địa chỉ email đăng ký tài khoản của bạn. Hệ thống sẽ gửi thư kèm liên kết hướng dẫn đặt lại mật khẩu thật về hòm thư của bạn.
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
                <span className="auth-input-icon">✉</span>
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
                {loading ? 'Đang gửi email...' : 'Gửi liên kết đặt lại mật khẩu →'}
              </button>
            </form>
          )}

          <p className="auth-divider" style={{ marginTop: 24 }}>
            <Link to="/login" className="auth-link">Bạn đã nhớ mật khẩu? Đăng nhập ngay</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
