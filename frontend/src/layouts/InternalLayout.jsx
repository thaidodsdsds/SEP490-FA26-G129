import { NavLink, Outlet } from 'react-router-dom';

function InternalLayout() {
  return (
    <div className="layout-shell internal-layout">
      <header className="topbar">
        <NavLink className="brand" to="/internal">ISOCAL</NavLink>
        <nav className="nav">
          <NavLink to="/internal">Tổng quan</NavLink>
          <NavLink to="/internal/customers">Khách hàng</NavLink>
          <NavLink to="/internal/settings">Cài đặt</NavLink>
        </nav>
        <span className="topbar-badge">Khu vực nội bộ</span>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default InternalLayout;
