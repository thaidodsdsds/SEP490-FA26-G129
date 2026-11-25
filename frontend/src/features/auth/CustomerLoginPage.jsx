import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { loginApi, verify2FAApi, resend2FAApi } from '../../services/auth-service.js';
import { isCustomerAccount } from '../../app/role-routing.js';
import isocalLogo from '../../assets/isocal_logo.png';
import calibrationIllustration from '../../assets/calibration_illustration.png';
import '../../styles/auth.css';
import '../../styles/auth-status.css';

function AuthBrandPanel({ headline, desc }) {
  return (
    <div className="auth-brand">
      <img src={isocalLogo} alt="ISOCAL" className="auth-brand__logo" />
      <h2 className="auth-brand__headline">{headline}</h2>
      <p className="auth-brand__desc">{desc}</p>
      <div className="auth-illustration">
        <img src={calibrationIllustration} alt="Calibration equipment" />
      </div>
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

      // ── Portal access check ──────────────────────────────────────────
      // This portal is ONLY for customer accounts.
      // Staff/internal accounts must use the Staff Login portal.
      if (!isCustomerAccount(account)) {
        setError(
          'Tài khoản này không phải tài khoản khách hàng. '
          + 'Vui lòng đăng nhập qua cổng Nhân viên (Staff Login).',
        );
        return; // do NOT store token or start session
      }
      // ────────────────────────────────────────────────────────────────

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

      if (!isCustomerAccount(account)) {
        setError(
          'Tài khoản này không phải tài khoản khách hàng. '
          + 'Vui lòng đăng nhập qua cổng Nhân viên (Staff Login).',
        );
        return;
      }

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
    <div className="auth-shell">
      <div className="auth-container">
        <AuthBrandPanel
          headline="Calibration &amp; Verification for a More Accurate World"
          desc="Manage calibration and verification services for measuring equipment, from request to certificate. Trusted by businesses and industries."
        />

        <div className="auth-card">
          {/* Tabs */}
          {!is2faStep && (
            <div className="auth-tabs">
              <button className="auth-tab active" type="button">Customer Login</button>
              <Link className="auth-tab" to="/staff-login">Staff Login</Link>
            </div>
          )}

          <h2 className="auth-title">
            {is2faStep ? 'Xác thực hai yếu tố (2FA)' : 'Welcome back'}
          </h2>
          <p className="auth-subtitle">
            {is2faStep ? (
              <>
                Nhập mã xác thực OTP 6 chữ số đã được gửi đến <strong>{maskedEmail}</strong>
              </>
            ) : (
              'Sign in to your ISOCAL customer account'
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
                Vui lòng đăng nhập tài khoản Khách hàng để truy cập trang bạn vừa yêu cầu.
              </div>
            </div>
          )}

          {registered && !is2faStep && (
            <div className="auth-success" style={{ marginBottom: 16 }}>
              <span>✓</span> Account created successfully. You can log in now.
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
              {/* Suggest staff portal if wrong portal */}
              {error.includes('Staff Login') && (
                <Link
                  className="auth-link"
                  style={{ display: 'block', marginTop: 6, fontWeight: 700 }}
                  to="/staff-login"
                >
                  → Đến trang Staff Login
                </Link>
              )}
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
                  className="auth-input auth-otp-input"
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

              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
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
                    color: resendCooldown > 0 ? '#8fa3c2' : '#2563eb',
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
                  style={{ height: 42, fontSize: 13.5 }}
                >
                  ← Quay lại đăng nhập
                </button>
              </div>

              <div className="auth-info-box" style={{ marginTop: 20 }}>
                <span className="auth-info-box__icon">🛡</span>
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
                  <span className="auth-input-icon">✉</span>
                  <input
                    id="customer-email"
                    type="email"
                    className="auth-input"
                    placeholder="Email or username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Password */}
                <div className="auth-input-wrapper">
                  <span className="auth-input-icon">🔒</span>
                  <input
                    id="customer-password"
                    type={showPass ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? '🙈' : '👁'}
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
                    Remember me
                  </label>
                  <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
                </div>

                {/* Login button */}
                <button
                  id="customer-login-btn"
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading}
                >
                  {loading ? <span className="auth-spinner" /> : null}
                  {loading ? 'Signing in...' : 'Log in →'}
                </button>
              </form>

              {/* Divider + register */}
              <p className="auth-divider" style={{ marginTop: 20, marginBottom: 12 }}>
                Don&apos;t have an account?
              </p>
              <Link to="/register" style={{ textDecoration: 'none', display: 'block' }}>
                <button id="create-account-btn" type="button" className="auth-btn-secondary">
                  👤 Create an account
                </button>
              </Link>
              <p className="auth-divider" style={{ marginTop: 14, fontSize: 12 }}>
                Customer accounts can be registered from this portal.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
