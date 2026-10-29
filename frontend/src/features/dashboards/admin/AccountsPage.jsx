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

  // All-account stats (unfiltered, for stat chips)
  const [stats, setStats] = useState({ total: 0, locked: 0, twoFa: 0, active: 0 });

  const notify = (message, tone = 'success') => setToast({ message, tone });

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
      const accs = data.accounts ?? [];
      setAccounts(accs);
      setPagination(data.pagination ?? { total: 0, total_pages: 1 });
      setPage(pg);
      setRoles(rls);
      setStats({
        total: data.pagination?.total ?? accs.length,
        locked: accs.filter((a) => a.is_locked).length,
        twoFa: accs.filter((a) => a.is_2fa_enabled).length,
        active: accs.filter((a) => !a.is_locked).length,
      });
    } catch (err) {
      notify(err?.message || 'Không thể tải dữ liệu từ server.', 'danger');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterLocked, filterRole]);

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
