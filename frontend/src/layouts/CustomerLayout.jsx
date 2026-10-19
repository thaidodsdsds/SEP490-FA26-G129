import { NavLink, Outlet } from 'react-router-dom';

function CustomerLayout() {
  return (
    <div className="layout-shell customer-layout">
      <aside className="sidebar">
        <h3>Customer Portal</h3>
        <nav className="nav nav-column">
          <NavLink to="/customer">Dashboard</NavLink>
          <NavLink to="/customer/profile">Profile</NavLink>
        </nav>
      </aside>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}

export default CustomerLayout;
