import { NavLink, Outlet } from 'react-router-dom';

function PublicLayout() {
  return (
    <div className="layout-shell public-layout">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <header className="topbar">
        <div className="brand">ISOCAL</div>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/login">Login</NavLink>
        </nav>
      </header>
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
