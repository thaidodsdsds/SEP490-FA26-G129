import { NavLink, Outlet } from 'react-router-dom';

function InternalLayout() {
  return (
    <div className="layout-shell internal-layout">
      <header className="topbar">
        <NavLink className="brand" to="/internal">ISOCAL</NavLink>
        <nav className="nav">
          <NavLink end to="/internal">Tổng quan</NavLink>
          <NavLink to="/internal/head-of-tech">Reviewer</NavLink>
          <NavLink to="/internal/technician">Kỹ thuật viên</NavLink>
          <NavLink to="/internal/settings">Cài đặt</NavLink>
        </nav>
        <span className="topbar-badge"><span className="topbar-status-dot" /> Khu vực demo</span>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default InternalLayout;
