import { NavLink, Outlet } from 'react-router-dom';
import { useAppContext } from '../app/providers.jsx';
import { getUserInitials } from '../app/role-routing.js';

function RoleDashboardLayout({ role, description, links, initials, name }) {
  const { session } = useAppContext();
  const displayName = session.user?.full_name || session.user?.name || name;
  const displayInitials = getUserInitials(session.user, initials);

  return (
    <div className="role-dashboard-shell">
      <header className="role-dashboard-topbar">
        <NavLink aria-label="ISOCAL — về khu vực nội bộ" className="role-dashboard-brand" to="/internal">
          ISO<span>CAL</span>
        </NavLink>
        <div className="role-dashboard-context">
          <span className="role-context-dot" />
          <span>{role}</span>
        </div>
        <div className="role-user">
          <span className="role-user-avatar">{displayInitials}</span>
          <span className="role-user-details"><strong>{displayName}</strong><small>{session.role === 'public' ? role : session.role}</small></span>
        </div>
      </header>
      <div className="role-dashboard-body">
        <aside aria-label={`Điều hướng ${role}`} className="role-dashboard-sidebar">
          <div className="role-sidebar-intro">
            <span className="role-sidebar-eyebrow">KHÔNG GIAN LÀM VIỆC</span>
            <strong>{role}</strong>
            <p>{description}</p>
          </div>
          <nav className="role-sidebar-nav">
            <span className="role-sidebar-label">MENU</span>
            {links.map((link) => (
              <NavLink
                className={({ isActive }) => `role-nav-link${isActive ? ' role-nav-link-active' : ''}`}
                end
                key={link.to}
                to={link.to}
              >
                <span aria-hidden="true">{link.icon}</span>
                {link.label}
              </NavLink>
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
