import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import { listRoles, listAccounts } from '../../../services/admin-service.js';
import RoleFormModal from './RoleFormModal.jsx';

/* ─── Permission matrix definition ──────────────────────────────── */
export const PERMISSION_MODULES = [
  {
    module: 'Tài khoản',
    key: 'accounts',
    actions: ['Xem danh sách', 'Thêm mới', 'Chỉnh sửa', 'Khoá / Mở khoá'],
  },
  {
    module: 'Vai trò & Quyền',
    key: 'roles',
    actions: ['Xem danh sách', 'Thêm mới', 'Chỉnh sửa'],
  },
  {
    module: 'Khách hàng',
    key: 'customers',
    actions: ['Xem danh sách', 'Thêm mới', 'Chỉnh sửa'],
  },
  {
    module: 'Yêu cầu dịch vụ',
    key: 'service_requests',
    actions: ['Xem danh sách', 'Tạo mới', 'Cập nhật trạng thái', 'Huỷ'],
  },
  {
    module: 'Báo giá',
    key: 'quotations',
    actions: ['Xem', 'Tạo mới', 'Phê duyệt', 'Từ chối'],
  },
  {
    module: 'Kho vật tư',
    key: 'warehouse',
    actions: ['Xem tồn kho', 'Xuất / Nhập', 'Duyệt phiếu'],
  },
  {
    module: 'Danh mục dịch vụ',
    key: 'service_types',
    actions: ['Xem', 'Thêm mới', 'Chỉnh sửa', 'Vô hiệu hoá'],
  },
  {
    module: 'Nhật ký hệ thống',
    key: 'audit_log',
    actions: ['Xem nhật ký'],
  },
  {
    module: 'Cấu hình hệ thống',
    key: 'settings',
    actions: ['Xem', 'Chỉnh sửa'],
  },
];

/* Default permissions per role (demo) */
const DEFAULT_PERMS = {
  Admin: { accounts: [0,1,2,3], roles: [0,1,2], customers: [0,1,2], service_requests: [0,1,2,3], quotations: [0,1,2,3], warehouse: [0,1,2], service_types: [0,1,2,3], audit_log: [0], settings: [0,1] },
  Accountant: { service_requests: [0], quotations: [0,1,2,3], customers: [0] },
  Sales: { customers: [0,1,2], service_requests: [0,1,2], quotations: [0,1] },
  Technician: { service_requests: [0,2], warehouse: [0,1] },
  Reviewer: { service_requests: [0,2], quotations: [0,2,3], service_types: [0] },
  Warehouse: { warehouse: [0,1,2], service_requests: [0] },
  Customer: { service_requests: [0,1] },
};

const MOCK_ROLES = [
  { id: 1, name: 'Admin', account_count: 3 },
  { id: 2, name: 'Accountant', account_count: 4 },
  { id: 3, name: 'Sales', account_count: 8 },
  { id: 4, name: 'Technician', account_count: 14 },
  { id: 5, name: 'Reviewer', account_count: 4 },
  { id: 6, name: 'Warehouse', account_count: 3 },
  { id: 7, name: 'Customer', account_count: 48 },
];

/* ─── Component ──────────────────────────────────────────────────── */
function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (message, tone = 'success') => setToast({ message, tone });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rls = await listRoles();
      setRoles(rls);
      if (rls.length > 0) setSelectedRole((prev) => rls.find((r) => r.id === prev?.id) ?? rls[0]);
    } catch {
      setRoles(MOCK_ROLES);
      if (!selectedRole) setSelectedRole(MOCK_ROLES[0]);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const permissions = selectedRole ? (DEFAULT_PERMS[selectedRole.name] ?? {}) : {};

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <button
            className="button button-primary"
            id="btn-add-role"
            onClick={() => setModal({ mode: 'add' })}
            type="button"
          >
            + Thêm vai trò
          </button>
        )}
        description="Xem và cấu hình vai trò, ma trận quyền truy cập cho từng nhóm người dùng."
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Vai trò & Phân quyền"
      />

      <div className="admin-roles-layout">
        {/* Left: Role list */}
        <SectionCard subtitle={`${roles.length} vai trò trong hệ thống`} title="Danh sách vai trò">
          {loading ? (
            <div className="admin-loading"><span className="admin-spinner" />Đang tải…</div>
          ) : (
            <ul className="admin-role-list">
              {roles.map((role) => (
                <li className={`admin-role-item${selectedRole?.id === role.id ? ' active' : ''}`} key={role.id}>
                  <button
                    className="admin-role-item-btn"
                    id={`role-btn-${role.id}`}
                    onClick={() => setSelectedRole(role)}
                    type="button"
                  >
                    <span className="admin-role-icon">{role.name[0]}</span>
                    <div className="admin-role-item-info">
                      <strong>{role.name}</strong>
                      <small>{role.account_count ?? 0} tài khoản</small>
                    </div>
                    <span className="admin-role-chevron">›</span>
                  </button>
                  <button
                    className="admin-role-edit-btn"
                    id={`role-edit-${role.id}`}
                    onClick={() => setModal({ mode: 'edit', role })}
                    title="Sửa vai trò"
                    type="button"
                  >
                    ✎
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Right: Permission matrix */}
        <SectionCard
          action={selectedRole && (
            <button
              className="dash-btn-xs"
              id={`btn-edit-perms-${selectedRole?.id}`}
              onClick={() => setModal({ mode: 'edit', role: selectedRole })}
              type="button"
            >
              Chỉnh sửa quyền
            </button>
          )}
          subtitle={selectedRole ? `Ma trận quyền cho vai trò "${selectedRole.name}"` : 'Chọn một vai trò để xem quyền'}
          title="Ma trận quyền"
        >
          {!selectedRole ? (
            <div className="admin-empty">Chọn một vai trò ở bên trái để xem ma trận quyền.</div>
          ) : (
            <div className="admin-perm-matrix-wrap">
              <table className="admin-perm-matrix" aria-label={`Ma trận quyền vai trò ${selectedRole.name}`}>
                <thead>
                  <tr>
                    <th className="admin-perm-module-col" scope="col">Phân hệ</th>
                    <th className="admin-perm-actions-col" scope="col">Quyền được gán</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_MODULES.map((mod) => {
                    const granted = permissions[mod.key] ?? [];
                    return (
                      <tr key={mod.key}>
                        <td>
                          <span className="admin-perm-module-name">{mod.module}</span>
                        </td>
                        <td>
                          <div className="admin-perm-actions">
                            {mod.actions.map((action, idx) => (
                              <span
                                className={`admin-perm-action${granted.includes(idx) ? ' granted' : ' denied'}`}
                                key={action}
                              >
                                {granted.includes(idx) ? '✓' : '✗'} {action}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {modal && (
        <RoleFormModal
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); notify('Lưu vai trò thành công.'); }}
          role={modal.role}
          roles={roles}
        />
      )}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default RolesPage;
