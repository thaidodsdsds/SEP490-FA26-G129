import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { loginApi } from '../../services/auth-service.js';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, account } = await loginApi(email.trim(), password);

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

  return (
    <div className="auth-shell">
      <div className="auth-container">
        <AuthBrandPanel
          headline="Calibration &amp; Verification for a More Accurate World"
          desc="Manage calibration and verification services for measuring equipment, from request to certificate. Trusted by businesses and industries."
        />

        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <button className="auth-tab active" type="button">Customer Login</button>
            <Link className="auth-tab" to="/staff-login">Staff Login</Link>
          </div>

          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-subtitle">Sign in to your ISOCAL customer account</p>

          {reasonParam === 'session_expired' && (
            <div className="auth-notice-banner auth-notice-banner--warning">
              <span className="auth-notice-banner-icon" aria-hidden="true">⌛</span>
              <div className="auth-notice-banner-body">
                <strong>Phiên đăng nhập đã hết hạn</strong>
                Phiên làm việc trước đó của bạn đã kết thúc để đảm bảo an toàn bảo mật. Vui lòng đăng nhập lại để tiếp tục.
              </div>
            </div>
          )}

          {reasonParam === 'unauthenticated' && (
            <div className="auth-notice-banner auth-notice-banner--info">
              <span className="auth-notice-banner-icon" aria-hidden="true">🔒</span>
              <div className="auth-notice-banner-body">
                <strong>Yêu cầu đăng nhập</strong>
                Vui lòng đăng nhập tài khoản Khách hàng để truy cập trang bạn vừa yêu cầu.
              </div>
            </div>
          )}

          {registered && (
            <div className="auth-success" style={{ marginBottom: 16 }}>
              <span>✓</span> Account created successfully. You can log in now.
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
        </div>
      </div>
    </div>
  );
}
