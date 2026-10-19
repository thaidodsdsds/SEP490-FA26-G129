import { NavLink, Outlet } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="layout-shell public-layout">
      <header className="topbar">
        <div className="brand">ISOCAL</div>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/login">Login</NavLink>
        </nav>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
