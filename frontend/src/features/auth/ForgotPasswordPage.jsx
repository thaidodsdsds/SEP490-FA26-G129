import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordApi } from '../../services/auth-service.js';
import '../../styles/auth.css';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPasswordApi(email.trim());
      setSent(true);
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-container">
        {/* Left brand panel */}
        <div className="auth-brand">
          <h1 className="auth-brand__logo">ISOCAL</h1>
          <h2 className="auth-brand__headline">Calibration &amp; Verification for a More Accurate World</h2>
          <p className="auth-brand__desc">
            Manage calibration and verification services from request to certificate,
            with trust and transparency.
          </p>
          <div className="auth-illustration">Calibration equipment illustration</div>
        </div>

        {/* Right form card */}
        <div className="auth-card">
          <Link to="/login" className="auth-back-link">← Back to login</Link>

          <h2 className="auth-title">Forgot your password?</h2>
          <p className="auth-subtitle">
            Enter your email address and we&apos;ll send you a link
            to reset your password.
          </p>

          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          {sent ? (
            <div className="auth-success">
              <span>✓</span> Reset link sent! Check your inbox (and spam folder).
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">✉</span>
                <input
                  id="forgot-email"
                  type="email"
                  className="auth-input"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {/* Send reset link button */}
              <button
                id="forgot-password-btn"
                type="submit"
                className="auth-btn-primary"
                disabled={loading || !email.trim()}
              >
                {loading ? <span className="auth-spinner" /> : null}
                {loading ? 'Sending...' : 'Send reset link →'}
              </button>
            </form>
          )}

          <p className="auth-divider" style={{ marginTop: 20 }}>
            <Link to="/login" className="auth-link">Remember your password? Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
