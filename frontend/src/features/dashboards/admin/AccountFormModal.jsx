import { useEffect, useRef, useState } from 'react';
import { createAccount, updateAccount } from '../../../services/admin-service.js';

/**
 * Modal for Add / Edit account.
 * Props:
 *   mode     – 'add' | 'edit'
 *   account  – existing account object (edit mode)
 *   roles    – array of { id, name }
 *   onSave   – callback when saved successfully
 *   onClose  – callback to close modal
 */
function AccountFormModal({ mode, account, roles, onSave, onClose }) {
  const isEdit = mode === 'edit';

  const [form, setForm] = useState({
    full_name: account?.full_name ?? '',
    email: account?.email ?? '',
    phone: account?.phone ?? '',
    password: '',
    role_id: account?.role_id ?? '',
    is_2fa_enabled: account?.is_2fa_enabled ?? false,
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const firstFieldRef = useRef(null);

  // Focus first field on open, close on Escape
  useEffect(() => {
    firstFieldRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Họ tên không được trống.';
    if (!isEdit && !form.email.trim()) errs.email = 'Email không được trống.';
    if (!isEdit && !form.password) errs.password = 'Mật khẩu không được trống.';
    if (!isEdit && form.password && form.password.length < 6) errs.password = 'Mật khẩu phải ít nhất 6 ký tự.';
    if (!form.role_id) errs.role_id = 'Vui lòng chọn vai trò.';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');
    try {
      if (isEdit) {
        await updateAccount(account.id, {
          full_name: form.full_name.trim(),
          phone: form.phone.trim() || null,
          role_id: Number(form.role_id),
          is_2fa_enabled: form.is_2fa_enabled,
          ...(form.password ? { password: form.password } : {}),
        });
      } else {
        await createAccount({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          password: form.password,
          role_id: Number(form.role_id),
          is_2fa_enabled: form.is_2fa_enabled,
        });
      }
      onSave();
    } catch (err) {
      setApiError(err.message || 'Đã xảy ra lỗi khi lưu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-labelledby="account-modal-title"
      aria-modal="true"
      className="admin-modal-backdrop"
      role="dialog"
    >
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title" id="account-modal-title">
            {isEdit ? 'Chỉnh sửa tài khoản' : 'Thêm tài khoản mới'}
          </h2>
          <button
            aria-label="Đóng"
            className="admin-modal-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <form className="admin-modal-body" onSubmit={handleSubmit} noValidate>
          {apiError && <div className="admin-form-api-error">{apiError}</div>}

          <div className="admin-form-row two">
            <div className="admin-field">
              <label className="admin-label" htmlFor="af-full-name">
                Họ và tên <span className="admin-required">*</span>
              </label>
              <input
                className={`admin-input${errors.full_name ? ' error' : ''}`}
                id="af-full-name"
                onChange={set('full_name')}
                placeholder="Nguyễn Văn A"
                ref={firstFieldRef}
                type="text"
                value={form.full_name}
              />
              {errors.full_name && <span className="admin-field-error">{errors.full_name}</span>}
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="af-phone">Số điện thoại</label>
              <input
                className="admin-input"
                id="af-phone"
                onChange={set('phone')}
                placeholder="09xxxxxxxx"
                type="tel"
                value={form.phone}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="admin-form-row">
              <div className="admin-field">
                <label className="admin-label" htmlFor="af-email">
                  Email <span className="admin-required">*</span>
                </label>
                <input
                  className={`admin-input${errors.email ? ' error' : ''}`}
                  id="af-email"
                  onChange={set('email')}
                  placeholder="email@isocal.vn"
                  type="email"
                  value={form.email}
                />
                {errors.email && <span className="admin-field-error">{errors.email}</span>}
              </div>
            </div>
          )}

          <div className="admin-form-row two">
            <div className="admin-field">
              <label className="admin-label" htmlFor="af-password">
                {isEdit ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}
              </label>
              <input
                autoComplete="new-password"
                className={`admin-input${errors.password ? ' error' : ''}`}
                id="af-password"
                onChange={set('password')}
                placeholder={isEdit ? '••••••••' : 'Tối thiểu 6 ký tự'}
                type="password"
                value={form.password}
              />
              {errors.password && <span className="admin-field-error">{errors.password}</span>}
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="af-role">
                Vai trò <span className="admin-required">*</span>
              </label>
              <select
                className={`admin-input admin-select${errors.role_id ? ' error' : ''}`}
                id="af-role"
                onChange={set('role_id')}
                value={form.role_id}
              >
                <option value="">— Chọn vai trò —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {errors.role_id && <span className="admin-field-error">{errors.role_id}</span>}
            </div>
          </div>

          <div className="admin-field">
            <label className="admin-toggle-row" htmlFor="af-2fa">
              <span className="admin-label" style={{ margin: 0 }}>Bật xác thực 2 bước (2FA)</span>
              <span className="admin-toggle-wrap">
                <input
                  checked={form.is_2fa_enabled}
                  className="admin-toggle-input"
                  id="af-2fa"
                  onChange={set('is_2fa_enabled')}
                  type="checkbox"
                />
                <span className="admin-toggle-track">
                  <span className="admin-toggle-thumb" />
                </span>
              </span>
            </label>
            <span className="admin-field-hint">
              Khi bật, người dùng sẽ cần nhập mã OTP mỗi lần đăng nhập.
            </span>
          </div>

          <div className="admin-modal-footer">
            <button
              className="button button-secondary"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Huỷ
            </button>
            <button
              className="button button-primary"
              disabled={saving}
              id="btn-account-save"
              type="submit"
            >
              {saving ? 'Đang lưu…' : (isEdit ? 'Lưu thay đổi' : 'Tạo tài khoản')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AccountFormModal;
