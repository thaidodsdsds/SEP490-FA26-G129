import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../../services/auth-service.js';
import '../../styles/auth.css';

export function RegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await registerApi(form.full_name.trim(), form.email.trim(), form.password);
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const msg = err?.response?.data?.error?.message || 'Registration failed. Please try again.';
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
          <h2 className="auth-brand__headline">Accurate Measurements for a Safer Tomorrow</h2>
          <p className="auth-brand__desc">
            Calibration and verification services for measuring equipment.
            Trusted by businesses and industries.
          </p>
          <div className="auth-illustration">Calibration equipment illustration</div>
        </div>

        {/* Right form card */}
        <div className="auth-card">
          {/* Tabs */}
          <div className="auth-tabs">
            <Link className="auth-tab" to="/login">Customer Login</Link>
            <button className="auth-tab active" type="button">Register</button>
          </div>

          <h2 className="auth-title">Create your account</h2>
          <p className="auth-subtitle">Fill in the information below to get started.</p>

          {error && (
            <div className="auth-error" style={{ marginBottom: 16 }}>
              <span>⚠</span> {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {/* Full name */}
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">👤</span>
              <input
                id="register-fullname"
                type="text"
                className="auth-input"
                placeholder="Full name"
                value={form.full_name}
                onChange={handleChange('full_name')}
                required
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">✉</span>
              <input
                id="register-email"
                type="email"
                className="auth-input"
                placeholder="Email address"
                value={form.email}
                onChange={handleChange('email')}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-password"
                type={showPass ? 'text' : 'password'}
                className="auth-input"
                placeholder="Password"
                value={form.password}
                onChange={handleChange('password')}
                required
                autoComplete="new-password"
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

            {/* Confirm password */}
            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🔒</span>
              <input
                id="register-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                className="auth-input"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={handleChange('confirmPassword')}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>

            {/* Register button */}
            <button
              id="register-submit-btn"
              type="submit"
              className="auth-btn-primary"
              disabled={loading}
            >
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? 'Creating account...' : 'Register →'}
            </button>
          </form>

          <p className="auth-divider" style={{ marginTop: 20 }}>
            <Link to="/login" className="auth-link">Already have an account? Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
