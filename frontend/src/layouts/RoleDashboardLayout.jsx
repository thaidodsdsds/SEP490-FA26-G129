import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAppContext } from '../app/providers.jsx';
import { getRoleDashboardPath, getUserInitials } from '../app/role-routing.js';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ─── Nav helpers ─────────────────────────────────────────────── */
const matchesPath = (to, pathname) =>
  Boolean(to) && (pathname === to || pathname.startsWith(`${to}/`));

const getGroupId = (link, index) => link.id ?? `group-${index}`;

// Nhóm chứa route hiện tại (chọn link khớp dài nhất để tránh nhầm với route gốc)
const findActiveGroupId = (links, pathname) => {
  let activeId = null;
  let activeLength = -1;

  links.forEach((link, index) => {
    if (!Array.isArray(link.children)) return;
    const groupId = getGroupId(link, index);
    link.children.forEach((child) => {
      if (!matchesPath(child.to, pathname)) return;
      if (child.to.length > activeLength) {
        activeLength = child.to.length;
        activeId = groupId;
      }
    });
  });

  return activeId;
};

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
  const toggleRef = useRef(null);
  const sidebarRef = useRef(null);
  const location = useLocation();
  const outlet = useOutlet();
  const displayName = session.user?.full_name || session.user?.name || name;
  const displayInitials = getUserInitials(session.user, initials);
  const dashboardPath = getRoleDashboardPath(session.user) || '/login';
  const roleName = session.role === 'public' ? role : session.role;

  const navLinks = links ?? [];
  const activeGroupId = findActiveGroupId(navLinks, location.pathname);
  const [openGroupId, setOpenGroupId] = useState(activeGroupId);
  const [lastActiveGroupId, setLastActiveGroupId] = useState(activeGroupId);

  // Khi đổi route, tự mở nhóm chứa trang đang xem (không dùng effect để tránh render 2 lần)
  if (activeGroupId !== lastActiveGroupId) {
    setLastActiveGroupId(activeGroupId);
    setOpenGroupId(activeGroupId);
  }

  useEffect(() => {
    if (!isNavOpen) return undefined;

    const sidebar = sidebarRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFirstItem = () => {
      const focusable = sidebar?.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusable?.length) focusable[0].focus();
      else sidebar?.focus();
    };
    const frame = requestAnimationFrame(focusFirstItem);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsNavOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;

      const focusable = Array.from(sidebar.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute('disabled') && element.offsetParent !== null);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === sidebar)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isNavOpen]);

  const closeNav = () => setIsNavOpen(false);

  const handleLogout = () => {
    endSession();
    navigate('/login');
  };

  return (
    <div className="role-dashboard-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <header className="role-dashboard-topbar">
        <button
          aria-controls="role-dashboard-nav"
          aria-expanded={isNavOpen}
          aria-label={isNavOpen ? 'Đóng menu điều hướng' : 'Mở menu điều hướng'}
          className="role-menu-toggle"
          onClick={() => setIsNavOpen((open) => !open)}
          ref={toggleRef}
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
        <aside
          aria-label={`Điều hướng ${role}`}
          className="role-dashboard-sidebar"
          id="role-dashboard-nav"
          ref={sidebarRef}
          tabIndex={-1}
        >
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
            {navLinks.map((link, index) => {
              if (Array.isArray(link.children)) {
                const groupId = getGroupId(link, index);
                const sublistId = `role-nav-sublist-${groupId}`;
                const isOpen = openGroupId === groupId;
                const hasActiveChild = link.children.some((child) => matchesPath(child.to, location.pathname));

                return (
                  <div
                    className={`role-nav-group${hasActiveChild ? ' role-nav-group-active' : ''}`}
                    key={groupId}
                  >
                    <button
                      aria-controls={sublistId}
                      aria-expanded={isOpen}
                      className="role-nav-link role-nav-group-toggle"
                      onClick={() => setOpenGroupId((current) => (current === groupId ? null : groupId))}
                      type="button"
                    >
                      <span aria-hidden="true">{link.icon}</span>
                      {link.label}
                      <span aria-hidden="true" className="role-nav-chevron">▾</span>
                    </button>
                    <div className="role-nav-sublist" hidden={!isOpen} id={sublistId} role="group">
                      {link.children.map((child) => (
                        <NavLink
                          className={({ isActive }) => `role-nav-link role-nav-link-child${isActive ? ' role-nav-link-active' : ''}`}
                          end
                          key={child.to}
                          onClick={closeNav}
                          title={child.label}
                          to={child.to}
                        >
                          <span aria-hidden="true" className="role-nav-dot" />
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                );
              }

              return link.soon ? (
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
              );
            })}
          </nav>
          <div className="role-sidebar-footer">
            <span className="demo-indicator" />
            Demo · Dữ liệu mẫu
          </div>
        </aside>
        <main className="role-dashboard-content" id="main-content" tabIndex={-1}>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="role-page-transition"
              exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] } }}
              initial={{ opacity: 0, y: 6 }}
              key={location.pathname}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default RoleDashboardLayout;
