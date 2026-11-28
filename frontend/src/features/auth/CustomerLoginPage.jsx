import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { loginApi, verify2FAApi, resend2FAApi } from '../../services/auth-service.js';
import isocalLogo from '../../assets/isocal_logo.png';
import loginBg from '../../assets/login_bg.jpg';
import '../../styles/auth.css';
import '../../styles/auth-status.css';

function ShieldCheckIcon({ size = 32, filled = false }) {
  if (filled) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1.06 13.54L7.4 12l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41-5.64 5.66z" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function LoginBrandPanel() {
  return (
    <div className="auth-brand auth-brand--login">
      <div className="auth-brand__logo-wrap">
        <img src={isocalLogo} alt="ISOCAL" className="auth-brand__logo" />
        <p className="auth-brand__tagline">HIỆU CHUẨN • KIỂM ĐỊNH • TIN CẬY</p>
      </div>

      <h1 className="auth-brand__headline">
        Hiệu chuẩn &amp; Kiểm định
        <br />
        vì một{' '}
        <span className="auth-brand__highlight">
          Thế giới Chính xác hơn
          <svg
            className="auth-brand__underline"
            viewBox="0 0 280 14"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M3 10.5C75 2.5 195 2.2 277 9.5"
              stroke="#2b7cf6"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </h1>

      <p className="auth-brand__desc">
        Quản lý toàn diện dịch vụ hiệu chuẩn và kiểm định thiết bị đo lường, từ tiếp nhận yêu cầu
        đến cấp chứng nhận, minh bạch và đáng tin cậy.
      </p>

      
    </div>
  );
}

export function CustomerLoginPage() {
  const { startSession } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const registered = Boolean(location.state?.registered);

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const reasonParam = searchParams.get('reason') || location.state?.reason;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ── 2FA state ─────────────────────────────────────────────────────────
  const [is2faStep, setIs2faStep] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginApi(email.trim(), password);

      // Check if 2FA is required for this account
      if (res.require_2fa) {
        setTwoFactorToken(res.two_factor_token);
        setMaskedEmail(res.email_masked);
        setIs2faStep(true);
        setOtp('');
        setResendSuccess('');
        setResendCooldown(60);
        return;
      }

      const { token, account } = res;

      localStorage.setItem('isocal_token', token);
      const dashboardPath = startSession(account);
      const targetDestination = redirectParam || location.state?.from || dashboardPath;
      navigate(targetDestination, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError('Vui lòng nhập mã xác thực OTP.');
      return;
    }
    setError('');
    setResendSuccess('');
    setLoading(true);
    try {
      const { token, account } = await verify2FAApi({
        two_factor_token: twoFactorToken,
        otp: otp.trim(),
      });

      localStorage.setItem('isocal_token', token);
      const dashboardPath = startSession(account);
      const targetDestination = redirectParam || location.state?.from || dashboardPath;
      navigate(targetDestination, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Mã OTP không chính xác hoặc đã hết hạn.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setResendSuccess('');
    setLoading(true);
    try {
      const res = await resend2FAApi({ two_factor_token: twoFactorToken });
      setTwoFactorToken(res.two_factor_token);
      setResendSuccess('Đã gửi lại mã OTP mới đến email của bạn.');
      setResendCooldown(60);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setIs2faStep(false);
    setOtp('');
    setError('');
    setResendSuccess('');
  };

  return (
    <div
      className="auth-shell auth-shell--login"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="auth-container auth-container--login">
        <LoginBrandPanel />

        <div className="auth-card auth-card--login">
          <div className="auth-card__badge" aria-hidden="true">
            <ShieldCheckIcon size={32} />
          </div>

          <h2 className="auth-title">
            {is2faStep ? 'Xác thực hai yếu tố (2FA)' : 'Chào mừng trở lại'}
          </h2>
          <p className="auth-subtitle">
            {is2faStep ? (
              <>
                Nhập mã xác thực OTP 6 chữ số đã được gửi đến <strong>{maskedEmail}</strong>
              </>
            ) : (
              'Đăng nhập vào tài khoản ISOCAL của bạn'
            )}
          </p>

          {!is2faStep && reasonParam === 'session_expired' && (
            <div className="auth-notice-banner auth-notice-banner--warning">
              <span className="auth-notice-banner-icon" aria-hidden="true">⌛</span>
              <div className="auth-notice-banner-body">
                <strong>Phiên đăng nhập đã hết hạn</strong>
                Phiên làm việc trước đó của bạn đã kết thúc để đảm bảo an toàn bảo mật. Vui lòng đăng nhập lại để tiếp tục.
              </div>
            </div>
          )}

          {!is2faStep && reasonParam === 'unauthenticated' && (
            <div className="auth-notice-banner auth-notice-banner--info">
              <span className="auth-notice-banner-icon" aria-hidden="true">🔒</span>
              <div className="auth-notice-banner-body">
                <strong>Yêu cầu đăng nhập</strong>
                Vui lòng đăng nhập tài khoản để truy cập trang bạn vừa yêu cầu.
              </div>
            </div>
          )}

          {registered && !is2faStep && (
            <div className="auth-success" style={{ marginBottom: 16 }}>
              <span>✓</span>
              <span>Tài khoản đã được tạo thành công. Bạn có thể đăng nhập ngay.</span>
            </div>
          )}

          {resendSuccess && (
            <div className="auth-success" style={{ marginBottom: 16 }}>
              <span>✓</span>
              <span>{resendSuccess}</span>
            </div>
          )}

          {error && (
            <div className="auth-error" id="customer-login-error" style={{ marginBottom: 16 }}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {is2faStep ? (
            <form className="auth-form" onSubmit={handleVerify2fa} noValidate>
              <div className="auth-input-wrapper">
                <input
                  id="customer-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="auth-input auth-otp-input auth-input--otp"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                />
              </div>

              <button
                id="customer-verify-2fa-btn"
                type="submit"
                className="auth-btn-primary"
                disabled={loading || otp.length !== 6}
                style={{ marginTop: 8 }}
              >
                {loading ? <span className="auth-spinner" /> : null}
                {loading ? 'Đang xác thực...' : 'Xác nhận đăng nhập →'}
              </button>

              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="auth-link"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: resendCooldown > 0 ? 'default' : 'pointer',
                    fontSize: 13,
                    color: resendCooldown > 0 ? '#8fa3c2' : '#1b60d8',
                  }}
                >
                  {resendCooldown > 0
                    ? `Gửi lại mã OTP sau ${resendCooldown}s`
                    : 'Chưa nhận được mã? Gửi lại mã OTP'}
                </button>

                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="auth-btn-secondary"
                  style={{ height: 44, fontSize: 13.5 }}
                >
                  ← Quay lại đăng nhập
                </button>
              </div>

              <div className="auth-info-box" style={{ marginTop: 16 }}>
                <span className="auth-info-box__icon">
                  <ShieldCheckIcon size={16} filled />
                </span>
                <span className="auth-info-box__text">
                  Tài khoản của bạn yêu cầu xác thực 2 lớp bảo mật (2FA).
                  Mã OTP có hiệu lực trong vòng 5 phút. Vui lòng kiểm tra hộp thư đến hoặc thư rác (Spam).
                </span>
              </div>
            </form>
          ) : (
            <>
              <form className="auth-form" onSubmit={handleSubmit} noValidate>
                {/* Email */}
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <MailIcon />
                  </span>
                  <input
                    id="customer-email"
                    type="email"
                    className="auth-input"
                    placeholder="Địa chỉ email hoặc tên đăng nhập"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">
                    <LockIcon />
                  </span>
                  <input
                    id="customer-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input auth-input--password"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
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

                {/* Remember me / Forgot */}
                <div className="auth-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Ghi nhớ đăng nhập
                  </label>
                  <Link to="/forgot-password" className="auth-link">
                    Quên mật khẩu?
                  </Link>
                </div>

                {/* Login button */}
                <button
                  id="customer-login-btn"
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? <span className="auth-spinner" /> : <LoginIcon />}
                  <span>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                  {!loading && <span aria-hidden="true">→</span>}
                </button>
              </form>

              {/* Divider + register */}
              <div className="auth-divider-line">
                <span>Chưa có tài khoản?</span>
              </div>
              <Link to="/register" style={{ textDecoration: 'none', display: 'block' }}>
                <button id="create-account-btn" type="button" className="auth-btn-secondary">
                  <UserPlusIcon />
                  <span>Tạo tài khoản mới</span>
                </button>
              </Link>

              
            </>
          )}
        </div>
      </div>
    </div>
  );
}
