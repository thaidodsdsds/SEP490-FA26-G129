import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/providers.jsx';
import { getRoleDashboardPath, getUserInitials } from '../app/role-routing.js';

/* ─── UserDropdown ─────────────────────────────────────────────── */
function UserDropdown({ displayName, displayInitials, roleName, profilePath, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <div className="role-user" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Tùy chọn tài khoản"
        className="role-user-btn"
        id="user-menu-btn"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="role-user-avatar">{displayInitials}</span>
        <span className="role-user-details">
          <strong>{displayName}</strong>
          <small>{roleName}</small>
        </span>
        <span aria-hidden="true" className="role-user-chevron">▼</span>
      </button>

      {open && (
        <div className="role-user-dropdown" role="menu">
          <div className="role-user-dropdown-header">
            <strong>{displayName}</strong>
            <small>{roleName}</small>
          </div>
          <div className="role-user-dropdown-menu">
            <NavLink
              className="role-user-dropdown-item"
              id="user-menu-profile"
              onClick={() => setOpen(false)}
              role="menuitem"
              to={profilePath}
            >
              <span className="role-user-dropdown-item-icon" aria-hidden="true">👤</span>
              Hồ sơ của tôi
            </NavLink>
            <div className="role-user-dropdown-divider" />
            <button
              className="role-user-dropdown-item danger"
              id="user-menu-logout"
              onClick={() => { setOpen(false); onLogout(); }}
              role="menuitem"
              type="button"
            >
              <span className="role-user-dropdown-item-icon" aria-hidden="true">→</span>
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RoleDashboardLayout ─────────────────────────────────────── */
function RoleDashboardLayout({ role, description, links, initials, name, profilePath }) {
  const { session, endSession } = useAppContext();
  const navigate = useNavigate();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const displayName = session.user?.full_name || session.user?.name || name;
  const displayInitials = getUserInitials(session.user, initials);
  const dashboardPath = getRoleDashboardPath(session.user) || '/login';
  const roleName = session.role === 'public' ? role : session.role;

  useEffect(() => {
    if (!isNavOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsNavOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNavOpen]);

  const closeNav = () => setIsNavOpen(false);

  const handleLogout = () => {
    endSession();
    navigate('/login');
  };

  return (
    <div className="role-dashboard-shell">
      <header className="role-dashboard-topbar">
        <button
          aria-controls="role-dashboard-nav"
          aria-expanded={isNavOpen}
          aria-label="Mở menu điều hướng"
          className="role-menu-toggle"
          onClick={() => setIsNavOpen(true)}
          type="button"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <NavLink
          aria-label="ISOCAL — về trang tổng quan"
          className="role-dashboard-brand"
          onClick={closeNav}
          to={dashboardPath}
        >
          ISO<span>CAL</span>
        </NavLink>
        <div className="role-dashboard-context">
          <span className="role-context-dot" />
          <span>{role}</span>
        </div>
        <UserDropdown
          displayInitials={displayInitials}
          displayName={displayName}
          onLogout={handleLogout}
          profilePath={profilePath || '/profile'}
          roleName={roleName}
        />
      </header>
      <div className={`role-dashboard-body${isNavOpen ? ' nav-open' : ''}`}>
        <button
          aria-label="Đóng menu điều hướng"
          className="role-nav-backdrop"
          onClick={closeNav}
          tabIndex={isNavOpen ? 0 : -1}
          type="button"
        />
        <aside aria-label={`Điều hướng ${role}`} className="role-dashboard-sidebar" id="role-dashboard-nav">
          <button
            aria-label="Đóng menu"
            className="role-nav-close"
            onClick={closeNav}
            type="button"
          >
            ×
          </button>
          <div className="role-sidebar-intro">
            <span className="role-sidebar-eyebrow">KHÔNG GIAN LÀM VIỆC</span>
            <strong>{role}</strong>
            <p>{description}</p>
          </div>
          <nav className="role-sidebar-nav">
            <span className="role-sidebar-label">MENU</span>
            {links.map((link) => (
              link.soon ? (
                <span className="role-nav-link role-nav-link-soon" key={`${link.to}-${link.label}`}>
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                  <small className="role-nav-soon">Sắp có</small>
                </span>
              ) : (
                <NavLink
                  className={({ isActive }) => `role-nav-link${isActive ? ' role-nav-link-active' : ''}`}
                  end
                  key={link.to}
                  onClick={closeNav}
                  to={link.to}
                >
                  <span aria-hidden="true">{link.icon}</span>
                  {link.label}
                </NavLink>
              )
            ))}
          </nav>
          <div className="role-sidebar-footer">
            <span className="demo-indicator" />
            Demo · Dữ liệu mẫu
          </div>
        </aside>
        <main className="role-dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RoleDashboardLayout;
