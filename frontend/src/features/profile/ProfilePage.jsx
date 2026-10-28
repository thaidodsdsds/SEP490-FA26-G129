import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { getProfileApi, updateProfileApi, changePasswordApi } from '../../services/profile-service.js';

/* ─── helpers ─────────────────────────────────────────────────────── */
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(-2).map((p) => p[0]).join('').toUpperCase() || '?';
}

function roleLabel(role) {
  const map = {
    customer: 'Khách hàng',
    admin: 'Quản trị viên',
    accountant: 'Kế toán',
    sales: 'Kinh doanh',
    warehouse: 'Kho vận',
    warehousestaff: 'Nhân viên kho',
    technician: 'Kỹ thuật viên',
    reviewer: 'Trưởng phòng kỹ thuật',
  };
  return map[String(role).toLowerCase()] || role;
}

/* ─── Toast ────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`dash-toast${type === 'success' ? ' success' : type === 'error' ? ' error' : ''}`}>
      <span>{type === 'success' ? '✓' : '!'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button aria-label="Đóng thông báo" onClick={onClose} type="button">×</button>
    </div>
  );
}

/* ─── ProfilePage ───────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { session, endSession } = useAppContext();
  const navigate = useNavigate();
  const isCustomer = String(session.user?.role ?? '').toLowerCase() === 'customer'
    || session.user?.customer_id != null;

  // profile state
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // edit form
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone: '' });
  const [saving, setSaving] = useState(false);

  // password form
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwSaving, setPwSaving] = useState(false);

  // toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  /* Fetch profile */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    getProfileApi()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setFormData({ full_name: data.full_name || '', phone: data.phone || '' });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setFetchError(err?.response?.data?.message || 'Không thể tải hồ sơ.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /* Edit handlers */
  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      showToast('Họ tên không được để trống.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProfileApi(formData);
      setProfile((prev) => ({ ...prev, full_name: updated.full_name, phone: updated.phone }));
      setEditMode(false);
      showToast('Cập nhật hồ sơ thành công!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Cập nhật thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* Password handlers */
  const handlePwChange = (e) => {
    const { name, value } = e.target;
    setPwForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) {
      showToast('Mật khẩu mới phải ít nhất 6 ký tự.', 'error');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      showToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }
    setPwSaving(true);
    try {
      await changePasswordApi({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      showToast('Đổi mật khẩu thành công!');
    } catch (err) {
      showToast(err?.response?.data?.message || 'Đổi mật khẩu thất bại.', 'error');
    } finally {
      setPwSaving(false);
    }
  };

  /* Logout */
  const handleLogout = () => {
    endSession();
    navigate('/login');
  };

  /* ── render ── */
  if (loading) {
    return (
      <div className="profile-page dash-page">
        <div className="profile-loading">
          <span className="profile-spinner" />
          <span>Đang tải hồ sơ…</span>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="profile-page dash-page">
        <div className="profile-fetch-error">
          <span>⚠</span>
          <p>{fetchError}</p>
          <button className="profile-btn profile-btn-secondary" onClick={() => window.location.reload()} type="button">
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const initials = getInitials(profile?.full_name);

  return (
    <div className="profile-page dash-page">
      {/* Header */}
      <div className="profile-header-bar">
        <div>
          <p className="dash-eyebrow">TÀI KHOẢN</p>
          <h1 className="profile-title">Hồ sơ của tôi</h1>
        </div>
        <button
          className="profile-btn profile-btn-danger"
          id="profile-logout-btn"
          onClick={handleLogout}
          type="button"
        >
          <span aria-hidden="true">→</span>
          Đăng xuất
        </button>
      </div>

      {/* Identity card */}
      <div className="profile-identity-card">
        <div className="profile-avatar-wrap">
          <div className="profile-avatar">{initials}</div>
        </div>
        <div className="profile-identity-info">
          <h2 className="profile-name">{profile?.full_name}</h2>
          <span className="profile-role-badge">{roleLabel(profile?.role)}</span>
          {profile?.customer && (
            <p className="profile-company">{profile.customer.company_name}</p>
          )}
        </div>
      </div>

      {/* Basic info */}
      <div className="profile-card">
        <div className="profile-card-head">
          <div>
            <h2 className="profile-card-title">Thông tin cơ bản</h2>
            <p className="profile-card-sub">Họ tên và số điện thoại liên hệ</p>
          </div>
          {!editMode && (
            <button
              className="profile-btn profile-btn-secondary"
              id="profile-edit-btn"
              onClick={() => {
                setFormData({ full_name: profile.full_name || '', phone: profile.phone || '' });
                setEditMode(true);
              }}
              type="button"
            >
              ✏ Chỉnh sửa
            </button>
          )}
        </div>

        {!editMode ? (
          <dl className="profile-dl">
            <div className="profile-dl-row">
              <dt>Họ và tên</dt>
              <dd>{profile?.full_name || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Email</dt>
              <dd>{profile?.email || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Số điện thoại</dt>
              <dd>{profile?.phone || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Vai trò</dt>
              <dd>{roleLabel(profile?.role)}</dd>
            </div>
          </dl>
        ) : (
          <form className="profile-form" id="profile-edit-form" onSubmit={handleSaveProfile}>
            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-full-name">
                Họ và tên <span className="profile-required">*</span>
              </label>
              <input
                autoFocus
                className="profile-input"
                id="profile-full-name"
                name="full_name"
                onChange={handleFieldChange}
                placeholder="Nguyễn Văn A"
                required
                type="text"
                value={formData.full_name}
              />
            </div>
            <div className="profile-field">
              <label className="profile-label" htmlFor="profile-phone">Số điện thoại</label>
              <input
                className="profile-input"
                id="profile-phone"
                name="phone"
                onChange={handleFieldChange}
                placeholder="0901 234 567"
                type="tel"
                value={formData.phone}
              />
            </div>
            <div className="profile-dl-row">
              <dt>Email</dt>
              <dd style={{ color: '#43596b' }}>{profile?.email}</dd>
            </div>
            <div className="profile-form-actions">
              <button
                className="profile-btn profile-btn-secondary"
                disabled={saving}
                onClick={() => setEditMode(false)}
                type="button"
              >
                Hủy
              </button>
              <button
                className="profile-btn profile-btn-primary"
                disabled={saving}
                id="profile-save-btn"
                type="submit"
              >
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Company info — only customers */}
      {isCustomer && profile?.customer && (
        <div className="profile-card">
          <div className="profile-card-head">
            <div>
              <h2 className="profile-card-title">Thông tin công ty</h2>
              <p className="profile-card-sub">Được liên kết khi tạo tài khoản</p>
            </div>
          </div>
          <dl className="profile-dl">
            <div className="profile-dl-row">
              <dt>Tên công ty</dt>
              <dd>{profile.customer.company_name || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Ngành nghề</dt>
              <dd>{profile.customer.industry || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Địa chỉ</dt>
              <dd>{profile.customer.address || '—'}</dd>
            </div>
            <div className="profile-dl-row">
              <dt>Mã số thuế</dt>
              <dd>{profile.customer.tax_code || '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Password — all authenticated users */}
      <div className="profile-card">
        <div className="profile-card-head">
          <div>
            <h2 className="profile-card-title">Đổi mật khẩu</h2>
            <p className="profile-card-sub">Tối thiểu 6 ký tự</p>
          </div>
        </div>
        <form className="profile-form" id="profile-password-form" onSubmit={handleChangePassword}>
          <div className="profile-field">
            <label className="profile-label" htmlFor="profile-cur-pw">
              Mật khẩu hiện tại <span className="profile-required">*</span>
            </label>
            <input
              autoComplete="current-password"
              className="profile-input"
              id="profile-cur-pw"
              name="current_password"
              onChange={handlePwChange}
              required
              type="password"
              value={pwForm.current_password}
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="profile-new-pw">
              Mật khẩu mới <span className="profile-required">*</span>
            </label>
            <input
              autoComplete="new-password"
              className="profile-input"
              id="profile-new-pw"
              name="new_password"
              onChange={handlePwChange}
              required
              type="password"
              value={pwForm.new_password}
            />
          </div>
          <div className="profile-field">
            <label className="profile-label" htmlFor="profile-confirm-pw">
              Xác nhận mật khẩu mới <span className="profile-required">*</span>
            </label>
            <input
              autoComplete="new-password"
              className="profile-input"
              id="profile-confirm-pw"
              name="confirm_password"
              onChange={handlePwChange}
              required
              type="password"
              value={pwForm.confirm_password}
            />
          </div>
          <div className="profile-form-actions">
            <button
              className="profile-btn profile-btn-primary"
              disabled={pwSaving}
              id="profile-change-pw-btn"
              type="submit"
            >
              {pwSaving ? 'Đang xử lý…' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          onClose={() => setToast(null)}
          type={toast.type}
        />
      )}
    </div>
  );
}
