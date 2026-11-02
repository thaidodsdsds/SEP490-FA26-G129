import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useAppContext } from '../app/providers.jsx';
import { getUserInitials } from '../app/role-routing.js';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function RoleDashboardLayout({ role, description, links, initials, name }) {
  const { session } = useAppContext();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const toggleRef = useRef(null);
  const sidebarRef = useRef(null);
  const location = useLocation();
  const outlet = useOutlet();
  const displayName = session.user?.full_name || session.user?.name || name;
  const displayInitials = getUserInitials(session.user, initials);

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
          aria-label="ISOCAL — về khu vực nội bộ"
          className="role-dashboard-brand"
          onClick={closeNav}
          to="/internal"
        >
          ISO<span>CAL</span>
        </NavLink>
        <div className="role-dashboard-context">
          <span className="role-context-dot" />
          <span>{role}</span>
        </div>
        <div className="role-user">
          <span className="role-user-avatar">{displayInitials}</span>
          <span className="role-user-details">
            <strong>{displayName}</strong>
            <small>{session.role === 'public' ? role : session.role}</small>
          </span>
        </div>
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
