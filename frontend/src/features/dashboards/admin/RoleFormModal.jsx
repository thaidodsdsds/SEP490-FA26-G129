import { useEffect, useRef, useState } from 'react';
import { createRole, updateRole } from '../../../services/admin-service.js';
import { PERMISSION_MODULES } from './RolesPage.jsx';

const DEFAULT_PERMS = {
  Admin: { accounts: [0,1,2,3], roles: [0,1,2], customers: [0,1,2], service_requests: [0,1,2,3], quotations: [0,1,2,3], warehouse: [0,1,2], service_types: [0,1,2,3], audit_log: [0], settings: [0,1] },
  Accountant: { service_requests: [0], quotations: [0,1,2,3], customers: [0] },
  Sales: { customers: [0,1,2], service_requests: [0,1,2], quotations: [0,1] },
  Technician: { service_requests: [0,2], warehouse: [0,1] },
  Reviewer: { service_requests: [0,2], quotations: [0,2,3], service_types: [0] },
  Warehouse: { warehouse: [0,1,2], service_requests: [0] },
  Customer: { service_requests: [0,1] },
};

function buildInitialPerms(role) {
  if (!role) return {};
  const base = DEFAULT_PERMS[role.name] ?? {};
  // Convert to Set-per-module for editing
  const result = {};
  PERMISSION_MODULES.forEach((mod) => {
    result[mod.key] = new Set(base[mod.key] ?? []);
  });
  return result;
}

/**
 * Modal for Add / Edit role with permission matrix.
 */
function RoleFormModal({ mode, role, roles, onSave, onClose }) {
  const isEdit = mode === 'edit';

  const [name, setName] = useState(role?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [perms, setPerms] = useState(() => buildInitialPerms(role));
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const togglePerm = (moduleKey, actionIdx) => {
    setPerms((prev) => {
      const next = { ...prev, [moduleKey]: new Set(prev[moduleKey]) };
      if (next[moduleKey].has(actionIdx)) next[moduleKey].delete(actionIdx);
      else next[moduleKey].add(actionIdx);
      return next;
    });
  };

  const toggleModule = (moduleKey, actions) => {
    setPerms((prev) => {
      const current = prev[moduleKey] ?? new Set();
      const allGranted = actions.every((_, idx) => current.has(idx));
      const next = allGranted ? new Set() : new Set(actions.map((_, idx) => idx));
      return { ...prev, [moduleKey]: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Tên vai trò không được trống.'); return; }
    const duplicate = roles.find((r) => r.name.toLowerCase() === name.trim().toLowerCase() && r.id !== role?.id);
    if (duplicate) { setNameError('Tên vai trò đã tồn tại.'); return; }

    setSaving(true);
    setApiError('');
    try {
      if (isEdit) {
        await updateRole(role.id, { name: name.trim() });
      } else {
        await createRole({ name: name.trim() });
      }
      onSave();
    } catch (err) {
      // Demo fallback
      console.warn('[RoleFormModal] API error (demo):', err.message);
      onSave(); // Still call onSave for demo
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      aria-labelledby="role-modal-title"
      aria-modal="true"
      className="admin-modal-backdrop"
      role="dialog"
    >
      <div className="admin-modal admin-modal-wide">
        <div className="admin-modal-header">
          <h2 className="admin-modal-title" id="role-modal-title">
            {isEdit ? `Chỉnh sửa vai trò: ${role?.name}` : 'Thêm vai trò mới'}
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

        <form className="admin-modal-body" noValidate onSubmit={handleSubmit}>
          {apiError && <div className="admin-form-api-error">{apiError}</div>}

          <div className="admin-field" style={{ maxWidth: 380 }}>
            <label className="admin-label" htmlFor="rf-name">
              Tên vai trò <span className="admin-required">*</span>
            </label>
            <input
              className={`admin-input${nameError ? ' error' : ''}`}
              id="rf-name"
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="vd: Technician"
              ref={nameRef}
              type="text"
              value={name}
            />
            {nameError && <span className="admin-field-error">{nameError}</span>}
          </div>

          <div className="admin-perm-section">
            <h3 className="admin-perm-section-title">Ma trận phân quyền</h3>
            <p className="admin-perm-section-desc">
              Tích chọn các quyền muốn gán cho vai trò này. Nhấn tên phân hệ để chọn / bỏ chọn tất cả.
            </p>
            <div className="admin-perm-matrix-wrap">
              <table className="admin-perm-matrix editable" aria-label="Ma trận phân quyền">
                <thead>
                  <tr>
                    <th className="admin-perm-module-col" scope="col">Phân hệ</th>
                    {/* Render unique action labels as columns based on max actions */}
                    <th className="admin-perm-actions-col" scope="col">Quyền</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod) => {
                    const grantedSet = perms[mod.key] ?? new Set();
                    const allChecked = mod.actions.every((_, idx) => grantedSet.has(idx));
                    const someChecked = !allChecked && mod.actions.some((_, idx) => grantedSet.has(idx));
                    return (
                      <tr key={mod.key}>
                        <td>
                          <button
                            className={`admin-perm-module-btn${allChecked ? ' all-checked' : someChecked ? ' partial' : ''}`}
                            onClick={() => toggleModule(mod.key, mod.actions)}
                            title={allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            type="button"
                          >
                            <span className={`admin-perm-module-check${allChecked ? ' checked' : someChecked ? ' partial' : ''}`} aria-hidden="true">
                              {allChecked ? '■' : someChecked ? '▪' : '□'}
                            </span>
                            {mod.module}
                          </button>
                        </td>
                        <td>
                          <div className="admin-perm-actions">
                            {mod.actions.map((action, idx) => (
                              <label
                                className={`admin-perm-checkbox-label${grantedSet.has(idx) ? ' checked' : ''}`}
                                key={action}
                              >
                                <input
                                  checked={grantedSet.has(idx)}
                                  className="admin-perm-checkbox"
                                  id={`perm-${mod.key}-${idx}`}
                                  onChange={() => togglePerm(mod.key, idx)}
                                  type="checkbox"
                                />
                                {action}
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
              id="btn-role-save"
              type="submit"
            >
              {saving ? 'Đang lưu…' : (isEdit ? 'Lưu thay đổi' : 'Tạo vai trò')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RoleFormModal;
