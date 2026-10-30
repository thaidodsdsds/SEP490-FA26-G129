import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../../services/auth-service.js';
import '../../styles/auth.css';

const INDUSTRY_OPTIONS = [
  'Manufacturing',
  'Mechanical Engineering',
  'Food Processing',
  'Environmental Services',
  'Medical Equipment',
  'Other',
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
      setError('Full name and email are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!form.company_name.trim() || !form.address.trim() || !form.industry) {
      setError('Company name, industry, and address are required.');
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
      const msg = err?.response?.data?.error?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-container auth-container--register">
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
            <p className="auth-section-label">Account</p>

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

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">📞</span>
              <input
                id="register-phone"
                type="tel"
                className="auth-input"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={handleChange('phone')}
                autoComplete="tel"
              />
            </div>

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
                aria-label={showConfirm ? 'Hide confirm password' : 'Show password'}
              >
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>

            <p className="auth-section-label">Company information</p>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">🏢</span>
              <input
                id="register-company-name"
                type="text"
                className="auth-input"
                placeholder="Company name"
                value={form.company_name}
                onChange={handleChange('company_name')}
                required
                autoComplete="organization"
              />
            </div>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">#</span>
              <input
                id="register-tax-code"
                type="text"
                className="auth-input"
                placeholder="Tax code (optional)"
                value={form.tax_code}
                onChange={handleChange('tax_code')}
              />
            </div>

            <div className="auth-input-wrapper">
              <span className="auth-input-icon">▾</span>
              <select
                id="register-industry"
                className="auth-input auth-select"
                value={form.industry}
                onChange={handleChange('industry')}
                required
              >
                <option value="">Select industry</option>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="auth-input-wrapper auth-input-wrapper--textarea">
              <span className="auth-input-icon auth-input-icon--top">📍</span>
              <textarea
                id="register-address"
                className="auth-input auth-textarea"
                placeholder="Address"
                value={form.address}
                onChange={handleChange('address')}
                required
                rows={3}
                autoComplete="street-address"
              />
            </div>

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
