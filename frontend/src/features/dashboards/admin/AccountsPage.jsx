import { useCallback, useEffect, useRef, useState } from 'react';
import PageHeader from '../../../components/ui/PageHeader.jsx';
import SectionCard from '../../../components/ui/SectionCard.jsx';
import StatusBadge from '../../../components/ui/StatusBadge.jsx';
import Toast from '../../../components/ui/Toast.jsx';
import {
  listAccounts,
  listRoles,
  lockAccount,
  unlockAccount,
} from '../../../services/admin-service.js';
import AccountFormModal from './AccountFormModal.jsx';

/* ─── Mock data fallback (demo) ───────────────────────────────────── */
const MOCK_ACCOUNTS = [
  {
    id: 1, full_name: 'Phạm Thanh Mai', email: 'mai.pt@isocal.vn', phone: '0901234567',
    role: { id: 1, name: 'Admin' }, role_id: 1, customer_id: null, customer_name: null,
    is_2fa_enabled: true, failed_login_attempts: 0, is_locked: false,
  },
  {
    id: 2, full_name: 'Trần Thu Hà', email: 'ha.tt@isocal.vn', phone: '0912345678',
    role: { id: 2, name: 'Accountant' }, role_id: 2, customer_id: null, customer_name: null,
    is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false,
  },
  {
    id: 3, full_name: 'Lê Hoàng Nam', email: 'nam.lh@isocal.vn', phone: '0923456789',
    role: { id: 3, name: 'Sales' }, role_id: 3, customer_id: null, customer_name: null,
    is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false,
  },
  {
    id: 4, full_name: 'Nguyễn Minh Quân', email: 'quan.nm@isocal.vn', phone: '0934567890',
    role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,
    is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true,
  },
  {
    id: 5, full_name: 'Đỗ Văn Bình', email: 'binh.dv@isocal.vn', phone: null,
    role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,
    is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true,
  },
  {
    id: 6, full_name: 'Nguyễn Thu Hằng', email: 'hang.nt@minhlong.vn', phone: '0945678901',
    role: { id: 7, name: 'Customer' }, role_id: 7, customer_id: 1, customer_name: 'Công ty Minh Long',
    is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false,
  },
  {
    id: 7, full_name: 'Võ Thanh Tùng', email: 'tung.vt@anphat.vn', phone: '0956789012',
    role: { id: 7, name: 'Customer' }, role_id: 7, customer_id: 2, customer_name: 'Công ty An Phát',
    is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false,
  },
];

const MOCK_ROLES = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Accountant' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'Technician' },
  { id: 5, name: 'Reviewer' },
  { id: 6, name: 'Warehouse' },
  { id: 7, name: 'Customer' },
];

/* ─── Component ──────────────────────────────────────────────────── */
function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', account?: {} }

  // Filters
  const [filterType, setFilterType] = useState('');      // '' | 'internal' | 'customer'
  const [filterLocked, setFilterLocked] = useState('');  // '' | 'true' | 'false'
  const [search, setSearch] = useState('');
  const searchRef = useRef('');

  const notify = (message, tone = 'success') => setToast({ message, tone });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [accs, rls] = await Promise.all([
        listAccounts({ type: filterType, locked: filterLocked, search: searchRef.current }),
        listRoles(),
      ]);
      setAccounts(accs);
      setRoles(rls);
    } catch {
      // Fallback to mock data for demo
      let filtered = MOCK_ACCOUNTS;
      if (filterType === 'internal') filtered = filtered.filter((a) => !a.customer_id);
      else if (filterType === 'customer') filtered = filtered.filter((a) => a.customer_id);
      if (filterLocked === 'true') filtered = filtered.filter((a) => a.is_locked);
      else if (filterLocked === 'false') filtered = filtered.filter((a) => !a.is_locked);
      const q = searchRef.current.toLowerCase();
      if (q) filtered = filtered.filter((a) => a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
      setAccounts(filtered);
      setRoles(MOCK_ROLES);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterLocked]);

  useEffect(() => { load(); }, [load]);

  // Dismiss toast automatically
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSearch = (e) => {
    searchRef.current = e.target.value;
    setSearch(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const handleLockToggle = async (account) => {
    try {
      if (account.is_locked) {
        await unlockAccount(account.id);
        notify(`Đã mở khoá tài khoản ${account.full_name}.`);
      } else {
        await lockAccount(account.id);
        notify(`Đã khoá tài khoản ${account.full_name}.`, 'warning');
      }
      await load();
    } catch {
      // Demo mode: toggle locally
      setAccounts((prev) => prev.map((a) =>
        a.id === account.id ? { ...a, is_locked: !a.is_locked, failed_login_attempts: a.is_locked ? 0 : 5 } : a,
      ));
      notify(account.is_locked ? `Đã mở khoá ${account.full_name}.` : `Đã khoá ${account.full_name}.`, account.is_locked ? 'success' : 'warning');
    }
  };

  const handleModalSave = async () => {
    setModal(null);
    await load();
    notify('Lưu thành công.');
  };

  // Stats
  const total = accounts.length;
  const lockedCount = accounts.filter((a) => a.is_locked).length;
  const twoFaCount = accounts.filter((a) => a.is_2fa_enabled).length;

  return (
    <div className="dash-page">
      <PageHeader
        actions={(
          <button
            className="button button-primary"
            id="btn-add-account"
            onClick={() => setModal({ mode: 'add' })}
            type="button"
          >
            + Thêm tài khoản
          </button>
        )}
        description="Quản lý toàn bộ tài khoản nội bộ và khách hàng trong hệ thống."
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Danh sách tài khoản"
      />

      {/* Quick stats */}
      <section aria-label="Thống kê nhanh" className="admin-stat-row">
        <div className="admin-stat-chip">
          <span className="admin-stat-num">{total}</span>
          <span className="admin-stat-label">Tổng tài khoản</span>
        </div>
        <div className="admin-stat-chip danger">
          <span className="admin-stat-num">{lockedCount}</span>
          <span className="admin-stat-label">Bị khoá</span>
        </div>
        <div className="admin-stat-chip info">
          <span className="admin-stat-num">{twoFaCount}</span>
          <span className="admin-stat-label">Bật 2FA</span>
        </div>
        <div className="admin-stat-chip success">
          <span className="admin-stat-num">{total - lockedCount}</span>
          <span className="admin-stat-label">Hoạt động</span>
        </div>
      </section>

      <SectionCard title="Danh sách tài khoản" subtitle="Tìm kiếm, lọc và quản lý tài khoản hệ thống">
        {/* Filters */}
        <div className="admin-filter-bar">
          <form className="admin-search-form" onSubmit={handleSearchSubmit}>
            <input
              className="admin-search-input"
              id="account-search"
              onChange={handleSearch}
              placeholder="Tìm theo tên hoặc email…"
              type="search"
              value={search}
            />
            <button className="button button-secondary admin-search-btn" type="submit">Tìm</button>
          </form>
          <div className="admin-filter-chips">
            {[['', 'Tất cả'], ['internal', 'Nội bộ'], ['customer', 'Khách hàng']].map(([val, label]) => (
              <button
                className={`admin-chip${filterType === val ? ' active' : ''}`}
                key={val}
                onClick={() => { setFilterType(val); }}
                type="button"
              >
                {label}
              </button>
            ))}
            <span className="admin-chip-divider" />
            {[['', 'Mọi trạng thái'], ['false', 'Hoạt động'], ['true', 'Bị khoá']].map(([val, label]) => (
              <button
                className={`admin-chip${filterLocked === val ? ' active' : ''}`}
                key={val}
                onClick={() => setFilterLocked(val)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading">
              <span className="admin-spinner" />
              Đang tải…
            </div>
          ) : accounts.length === 0 ? (
            <div className="admin-empty">Không có tài khoản phù hợp.</div>
          ) : (
            <table className="admin-table" aria-label="Danh sách tài khoản">
              <thead>
                <tr>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Loại</th>
                  <th scope="col">2FA</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>
                      <div className="admin-cell-user">
                        <span className="admin-avatar">
                          {acc.full_name.trim().split(' ').slice(-2).map((p) => p[0]).join('').toUpperCase()}
                        </span>
                        <div>
                          <span className="admin-cell-name">{acc.full_name}</span>
                          <span className="admin-cell-sub">{acc.email}</span>
                          {acc.phone && <span className="admin-cell-sub">{acc.phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-role-tag">{acc.role?.name ?? '—'}</span>
                    </td>
                    <td>
                      {acc.customer_id
                        ? (
                          <div>
                            <span className="admin-type-badge customer">Khách hàng</span>
                            {acc.customer_name && <span className="admin-cell-sub">{acc.customer_name}</span>}
                          </div>
                        )
                        : <span className="admin-type-badge internal">Nội bộ</span>}
                    </td>
                    <td>
                      <StatusBadge tone={acc.is_2fa_enabled ? 'success' : 'neutral'}>
                        {acc.is_2fa_enabled ? 'Bật' : 'Tắt'}
                      </StatusBadge>
                    </td>
                    <td>
                      <StatusBadge tone={acc.is_locked ? 'danger' : 'success'}>
                        {acc.is_locked ? 'Bị khoá' : 'Hoạt động'}
                      </StatusBadge>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-action-btn"
                          id={`btn-edit-${acc.id}`}
                          onClick={() => setModal({ mode: 'edit', account: acc })}
                          type="button"
                        >
                          Sửa
                        </button>
                        <button
                          className={`admin-action-btn${acc.is_locked ? ' unlock' : ' lock'}`}
                          id={`btn-lock-${acc.id}`}
                          onClick={() => handleLockToggle(acc)}
                          type="button"
                        >
                          {acc.is_locked ? 'Mở khoá' : 'Khoá'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SectionCard>

      {modal && (
        <AccountFormModal
          account={modal.account}
          mode={modal.mode}
          onClose={() => setModal(null)}
          onSave={handleModalSave}
          roles={roles}
        />
      )}

      <Toast onDismiss={() => setToast(null)} toast={toast} />
    </div>
  );
}

export default AccountsPage;
