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

/* ─── Mock data — đầy đủ tất cả role ─────────────────────────────── */
const MOCK_ACCOUNTS = [
  // Admin
  { id: 1,  full_name: 'Phạm Thanh Mai',    email: 'mai.pt@isocal.vn',        phone: '0901234567', role: { id: 1, name: 'Admin' },      role_id: 1, customer_id: null, customer_name: null,             is_2fa_enabled: true,  failed_login_attempts: 0, is_locked: false },
  { id: 2,  full_name: 'Nguyễn Quốc Hùng',  email: 'hung.nq@isocal.vn',       phone: '0901234568', role: { id: 1, name: 'Admin' },      role_id: 1, customer_id: null, customer_name: null,             is_2fa_enabled: true,  failed_login_attempts: 0, is_locked: false },
  // Accountant
  { id: 3,  full_name: 'Trần Thu Hà',        email: 'ha.tt@isocal.vn',         phone: '0912345678', role: { id: 2, name: 'Accountant' }, role_id: 2, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 4,  full_name: 'Hoàng Minh Châu',    email: 'chau.hm@isocal.vn',       phone: '0912345679', role: { id: 2, name: 'Accountant' }, role_id: 2, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  // Sales
  { id: 5,  full_name: 'Lê Hoàng Nam',       email: 'nam.lh@isocal.vn',        phone: '0923456789', role: { id: 3, name: 'Sales' },      role_id: 3, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 6,  full_name: 'Bùi Thị Lan',        email: 'lan.bt@isocal.vn',        phone: '0923456790', role: { id: 3, name: 'Sales' },      role_id: 3, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 7,  full_name: 'Vũ Đức Tài',         email: 'tai.vd@isocal.vn',        phone: '0923456791', role: { id: 3, name: 'Sales' },      role_id: 3, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  // Technician
  { id: 8,  full_name: 'Nguyễn Minh Quân',   email: 'quan.nm@isocal.vn',       phone: '0934567890', role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true  },
  { id: 9,  full_name: 'Đỗ Văn Bình',        email: 'binh.dv@isocal.vn',       phone: null,         role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true  },
  { id: 10, full_name: 'Trịnh Công Sơn',     email: 'son.tc@isocal.vn',        phone: '0934567892', role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 11, full_name: 'Phan Văn Đức',       email: 'duc.pv@isocal.vn',        phone: '0934567893', role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 12, full_name: 'Lý Thị Hoa',         email: 'hoa.lt@isocal.vn',        phone: '0934567894', role: { id: 4, name: 'Technician' }, role_id: 4, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  // Reviewer (Head of Tech)
  { id: 13, full_name: 'Cao Minh Trí',       email: 'tri.cm@isocal.vn',        phone: '0945678901', role: { id: 5, name: 'Reviewer' },   role_id: 5, customer_id: null, customer_name: null,             is_2fa_enabled: true,  failed_login_attempts: 0, is_locked: false },
  { id: 14, full_name: 'Đinh Thị Liên',      email: 'lien.dt@isocal.vn',       phone: '0945678902', role: { id: 5, name: 'Reviewer' },   role_id: 5, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  // Warehouse
  { id: 15, full_name: 'Phùng Văn Thắng',    email: 'thang.pv@isocal.vn',      phone: '0956789012', role: { id: 6, name: 'Warehouse' },  role_id: 6, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 16, full_name: 'Đặng Thị Yến',       email: 'yen.dt@isocal.vn',        phone: '0956789013', role: { id: 6, name: 'Warehouse' },  role_id: 6, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 17, full_name: 'Mai Thanh Long',      email: 'long.mt@isocal.vn',       phone: '0956789014', role: { id: 6, name: 'Warehouse' },  role_id: 6, customer_id: null, customer_name: null,             is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true  },
  // Signatory
  { id: 18, full_name: 'Ngô Quý Lâm',        email: 'lam.nq@isocal.vn',        phone: '0967890123', role: { id: 7, name: 'Signatory' },  role_id: 7, customer_id: null, customer_name: null,             is_2fa_enabled: true,  failed_login_attempts: 0, is_locked: false },
  { id: 19, full_name: 'Vương Thị Hương',    email: 'huong.vt@isocal.vn',      phone: '0967890124', role: { id: 7, name: 'Signatory' },  role_id: 7, customer_id: null, customer_name: null,             is_2fa_enabled: true,  failed_login_attempts: 0, is_locked: false },
  // Customer
  { id: 20, full_name: 'Nguyễn Thu Hằng',    email: 'hang.nt@minhlong.vn',     phone: '0978901234', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 1,  customer_name: 'Công ty Minh Long',is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 21, full_name: 'Võ Thanh Tùng',      email: 'tung.vt@anphat.vn',       phone: '0978901235', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 2,  customer_name: 'Công ty An Phát', is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 22, full_name: 'Lê Quang Vinh',      email: 'vinh.lq@techco.vn',       phone: '0978901236', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 3,  customer_name: 'TechCo VN',       is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 23, full_name: 'Đỗ Thị Lan Anh',     email: 'lananh.dt@fpt.vn',        phone: '0978901237', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 4,  customer_name: 'FPT Software',    is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 24, full_name: 'Trương Văn Khoa',    email: 'khoa.tv@viettel.vn',      phone: '0978901238', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 5,  customer_name: 'Viettel Group',   is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 25, full_name: 'Phan Thị Mai Linh',  email: 'mailinh.pt@vingroup.vn',  phone: '0978901239', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 6,  customer_name: 'Vingroup',        is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 26, full_name: 'Hoàng Văn Tân',      email: 'tan.hv@samsung.vn',       phone: null,         role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 7,  customer_name: 'Samsung Việt Nam',is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
  { id: 27, full_name: 'Nguyễn Thị Bích',    email: 'bich.nt@hoa-phat.vn',     phone: '0978901241', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 8,  customer_name: 'Hoà Phát Group',  is_2fa_enabled: false, failed_login_attempts: 5, is_locked: true  },
  { id: 28, full_name: 'Đặng Minh Tuấn',     email: 'tuan.dm@masan.vn',        phone: '0978901242', role: { id: 8, name: 'Customer' },   role_id: 8, customer_id: 9,  customer_name: 'Masan Corp',      is_2fa_enabled: false, failed_login_attempts: 0, is_locked: false },
];

const MOCK_ROLES = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Accountant' },
  { id: 3, name: 'Sales' },
  { id: 4, name: 'Technician' },
  { id: 5, name: 'Reviewer' },
  { id: 6, name: 'Warehouse' },
  { id: 7, name: 'Signatory' },
  { id: 8, name: 'Customer' },
];

const PAGE_SIZE = 10;

/* ─── Pagination component ───────────────────────────────────────── */
function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = page - delta;
  const right = page + delta;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= left && i <= right)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }

  return (
    <div className="admin-pagination">
      <button
        className="admin-page-btn"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
        type="button"
        aria-label="Trang trước"
      >
        ‹
      </button>
      {pages.map((p, idx) =>
        p === '…' ? (
          <span className="admin-page-ellipsis" key={`ellipsis-${idx}`}>…</span>
        ) : (
          <button
            aria-current={p === page ? 'page' : undefined}
            className={`admin-page-btn${p === page ? ' active' : ''}`}
            key={p}
            onClick={() => onPage(p)}
            type="button"
          >
            {p}
          </button>
        ),
      )}
      <button
        className="admin-page-btn"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
        type="button"
        aria-label="Trang tiếp"
      >
        ›
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);

  // Filters
  const [filterType, setFilterType] = useState('');       // '' | 'internal' | 'customer'
  const [filterLocked, setFilterLocked] = useState('');   // '' | 'true' | 'false'
  const [filterRole, setFilterRole] = useState('');       // '' | role_id string
  const [search, setSearch] = useState('');
  const searchRef = useRef('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });

  // All-account stats (unfiltered, for stat chips) — computed from full mock or API summary
  const [stats, setStats] = useState({ total: 0, locked: 0, twoFa: 0, active: 0 });

  const notify = (message, tone = 'success') => setToast({ message, tone });

  /* Apply mock filters + pagination locally */
  const applyMockFilters = useCallback((pg = 1) => {
    let filtered = MOCK_ACCOUNTS;
    if (filterType === 'internal') filtered = filtered.filter((a) => !a.customer_id);
    else if (filterType === 'customer') filtered = filtered.filter((a) => a.customer_id);
    if (filterRole) filtered = filtered.filter((a) => String(a.role_id) === filterRole);
    if (filterLocked === 'true') filtered = filtered.filter((a) => a.is_locked);
    else if (filterLocked === 'false') filtered = filtered.filter((a) => !a.is_locked);
    const q = searchRef.current.toLowerCase().trim();
    if (q) filtered = filtered.filter((a) =>
      a.full_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q),
    );

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(pg, totalPages);
    const sliced = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    setAccounts(sliced);
    setPagination({ total, total_pages: totalPages });
    setPage(safePage);

    // Stats from unfiltered mock
    setStats({
      total: MOCK_ACCOUNTS.length,
      locked: MOCK_ACCOUNTS.filter((a) => a.is_locked).length,
      twoFa: MOCK_ACCOUNTS.filter((a) => a.is_2fa_enabled).length,
      active: MOCK_ACCOUNTS.filter((a) => !a.is_locked).length,
    });
  }, [filterType, filterLocked, filterRole]);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const [data, rls] = await Promise.all([
        listAccounts({
          type: filterType,
          locked: filterLocked,
          search: searchRef.current,
          role_id: filterRole || undefined,
          page: pg,
          limit: PAGE_SIZE,
        }),
        listRoles(),
      ]);
      setAccounts(data.accounts ?? []);
      setPagination(data.pagination ?? { total: 0, total_pages: 1 });
      setPage(pg);
      setRoles(rls);
      // Stats from all accounts (no filter) — could call a separate /stats endpoint
      setStats({
        total: data.pagination?.total ?? data.accounts?.length ?? 0,
        locked: (data.accounts ?? []).filter((a) => a.is_locked).length,
        twoFa: (data.accounts ?? []).filter((a) => a.is_2fa_enabled).length,
        active: (data.accounts ?? []).filter((a) => !a.is_locked).length,
      });
    } catch {
      // Demo fallback
      setRoles(MOCK_ROLES);
      applyMockFilters(pg);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterLocked, filterRole, applyMockFilters]);

  useEffect(() => { load(1); }, [filterType, filterLocked, filterRole]); // reset to page 1 on filter change
  // eslint-disable-next-line react-hooks/exhaustive-deps

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
    load(1);
  };

  const handlePage = (pg) => {
    load(pg);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      await load(page);
    } catch {
      // Demo: toggle locally
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === account.id
            ? { ...a, is_locked: !a.is_locked, failed_login_attempts: a.is_locked ? 0 : 5 }
            : a,
        ),
      );
      notify(
        account.is_locked ? `Đã mở khoá ${account.full_name}.` : `Đã khoá ${account.full_name}.`,
        account.is_locked ? 'success' : 'warning',
      );
    }
  };

  const handleModalSave = async () => {
    setModal(null);
    await load(1);
    notify('Lưu thành công.');
  };

  const roleLabel = roles.find((r) => String(r.id) === filterRole)?.name;

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
        description="Quản lý toàn bộ tài khoản thuộc mọi vai trò có thể đăng nhập vào hệ thống."
        eyebrow="QUẢN TRỊ HỆ THỐNG"
        title="Danh sách tài khoản"
      />

      {/* Quick stats */}
      <section aria-label="Thống kê nhanh" className="admin-stat-row">
        <div className="admin-stat-chip">
          <span className="admin-stat-num">{stats.total}</span>
          <span className="admin-stat-label">Tổng tài khoản</span>
        </div>
        <div className="admin-stat-chip success">
          <span className="admin-stat-num">{stats.active}</span>
          <span className="admin-stat-label">Hoạt động</span>
        </div>
        <div className="admin-stat-chip danger">
          <span className="admin-stat-num">{stats.locked}</span>
          <span className="admin-stat-label">Bị khoá</span>
        </div>
        <div className="admin-stat-chip info">
          <span className="admin-stat-num">{stats.twoFa}</span>
          <span className="admin-stat-label">Bật 2FA</span>
        </div>
      </section>

      <SectionCard
        subtitle={`Hiển thị ${accounts.length} / ${pagination.total} tài khoản${roleLabel ? ` · Vai trò: ${roleLabel}` : ''}`}
        title="Danh sách tài khoản"
      >
        {/* ── Filter bar ── */}
        <div className="admin-filter-bar">
          {/* Search */}
          <form className="admin-search-form" onSubmit={handleSearchSubmit}>
            <input
              className="admin-search-input"
              id="account-search"
              onChange={handleSearch}
              placeholder="Tìm tên hoặc email…"
              type="search"
              value={search}
            />
            <button className="button button-secondary admin-search-btn" type="submit">
              Tìm
            </button>
          </form>

          {/* Role filter dropdown */}
          <select
            aria-label="Lọc theo vai trò"
            className="admin-input admin-select admin-role-select"
            id="filter-role"
            onChange={(e) => { setFilterRole(e.target.value); }}
            value={filterRole}
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>{r.name}</option>
            ))}
          </select>

          {/* Type chips */}
          <div className="admin-filter-chips">
            {[['', 'Tất cả'], ['internal', 'Nội bộ'], ['customer', 'Khách hàng']].map(([val, label]) => (
              <button
                className={`admin-chip${filterType === val ? ' active' : ''}`}
                key={val}
                onClick={() => setFilterType(val)}
                type="button"
              >
                {label}
              </button>
            ))}
            <span className="admin-chip-divider" />
            {[['', 'Mọi TT'], ['false', 'Hoạt động'], ['true', 'Bị khoá']].map(([val, label]) => (
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

        {/* ── Table ── */}
        <div className="admin-table-wrap">
          {loading ? (
            <div className="admin-loading">
              <span className="admin-spinner" />
              Đang tải…
            </div>
          ) : accounts.length === 0 ? (
            <div className="admin-empty">
              Không tìm thấy tài khoản phù hợp.
            </div>
          ) : (
            <table className="admin-table" aria-label="Danh sách tài khoản">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Tài khoản</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Loại</th>
                  <th scope="col">2FA</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc, idx) => (
                  <tr key={acc.id}>
                    <td className="admin-cell-index">
                      {(page - 1) * PAGE_SIZE + idx + 1}
                    </td>
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
                      {acc.customer_id ? (
                        <div>
                          <span className="admin-type-badge customer">Khách hàng</span>
                          {acc.customer_name && (
                            <span className="admin-cell-sub">{acc.customer_name}</span>
                          )}
                        </div>
                      ) : (
                        <span className="admin-type-badge internal">Nội bộ</span>
                      )}
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

        {/* ── Pagination ── */}
        {!loading && pagination.total_pages > 1 && (
          <div className="admin-pagination-bar">
            <span className="admin-pagination-info">
              Trang {page} / {pagination.total_pages} · {pagination.total} tài khoản
            </span>
            <Pagination
              onPage={handlePage}
              page={page}
              totalPages={pagination.total_pages}
            />
          </div>
        )}
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
