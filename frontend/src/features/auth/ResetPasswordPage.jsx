import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordApi, verifyResetTokenApi } from '../../services/auth-service.js';
import loginBg from '../../assets/login_bg.jpg';
import { AuthBrandPanel, EyeIcon, LockIcon, ShieldCheckIcon } from './AuthBrandPanel.jsx';
import '../../styles/auth.css';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      setTokenError('Liên kết không chứa mã xác thực hợp lệ.');
      return;
    }

    let isMounted = true;
    verifyResetTokenApi(token)
      .then((data) => {
        if (!isMounted) return;
        setTokenValid(true);
        setUserEmail(data.email || '');
      })
      .catch((err) => {
        if (!isMounted) return;
        setTokenValid(false);
        setTokenError(
          err?.response?.data?.error?.message ||
          'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.'
        );
      })
      .finally(() => {
        if (isMounted) setVerifying(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({ token, password });
      setSuccess(true);
    } catch (err) {
      const msg =
        err?.response?.data?.error?.message ||
        'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.';
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
      <div className="auth-container auth-container--login">
        <AuthBrandPanel />

        {/* Right form card */}
        <div className="auth-card auth-card--login">
          <Link to="/login" className="auth-back-link">← Quay lại đăng nhập</Link>

          <div className="auth-card__badge" aria-hidden="true">
            <ShieldCheckIcon size={32} />
          </div>

          <h2 className="auth-title">Đặt lại mật khẩu mới</h2>
          <p className="auth-subtitle">
            {userEmail
              ? `Tạo mật khẩu mới cho tài khoản ${userEmail}.`
              : 'Vui lòng thiết lập mật khẩu mới có độ dài tối thiểu 6 ký tự.'}
          </p>

          {verifying ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <span
                className="auth-spinner"
                style={{ borderColor: '#1a4ea6', borderTopColor: 'transparent', width: 28, height: 28, display: 'inline-block' }}
              />
              <p style={{ marginTop: 12, color: '#6b83a5', fontSize: 14 }}>
                Đang kiểm tra tính hợp lệ của liên kết...
              </p>
            </div>
          ) : !tokenValid ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="auth-error">
                <span>⚠</span>
                <span>{tokenError}</span>
              </div>
              <div className="auth-info-box">
                <span className="auth-info-box__icon">ℹ</span>
                <span className="auth-info-box__text">
                  Liên kết này có thể đã hết hạn (sau 15 phút) hoặc đã được sử dụng trước đó.
                  Vui lòng yêu cầu gửi lại liên kết mới.
                </span>
              </div>
              <Link to="/forgot-password" className="auth-btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
                Yêu cầu gửi lại liên kết mới →
              </Link>
            </div>
          ) : success ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="auth-success" style={{ lineHeight: 1.5 }}>
                <span>✓</span>
                <div>
                  <strong>Đặt lại mật khẩu thành công!</strong><br />
                  Mật khẩu tài khoản của bạn đã được cập nhật thành công.
                </div>
              </div>
              <Link
                to="/login"
                className="auth-btn-primary"
                style={{ textDecoration: 'none', textAlign: 'center', marginTop: 12 }}
              >
                Đăng nhập ngay →
              </Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="auth-error">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Password */}
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="reset-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input auth-input--password"
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>

              {/* Confirm Password */}
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <LockIcon />
                </span>
                <input
                  id="reset-confirm-password-input"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                id="reset-password-btn"
                type="submit"
                className="auth-btn-primary"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? <span className="auth-spinner" /> : null}
                <span>{loading ? 'Đang cập nhật mật khẩu...' : 'Cập nhật mật khẩu mới'}</span>
                {!loading && <span aria-hidden="true">→</span>}
              </button>
            </form>
          )}

          <p className="auth-divider" style={{ marginTop: 22 }}>
            <Link to="/login" className="auth-link">Quay lại trang Đăng nhập</Link>
          </p>

         
        </div>
      </div>
    </div>
  );
}
