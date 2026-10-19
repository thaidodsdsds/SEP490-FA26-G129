import { Link, Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import InternalLayout from '../layouts/InternalLayout.jsx';
import CustomerManagementPage from '../features/customers/CustomerManagementPage.jsx';

const publicRoutes = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
];

const customerRoutes = [
  {
    path: '/customer',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <CustomerDashboardPage /> },
      { path: 'profile', element: <CustomerProfilePage /> },
    ],
  },
];

const internalRoutes = [
  {
    path: '/internal',
    element: <InternalLayout />,
    children: [
      { index: true, element: <InternalDashboardPage /> },
      { path: 'customers', element: <CustomerManagementPage /> },
      { path: 'settings', element: <InternalSettingsPage /> },
    ],
  },
];

const router = createBrowserRouter([
  ...publicRoutes,
  ...customerRoutes,
  ...internalRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
]);

function HomePage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">NỀN TẢNG QUẢN LÝ HIỆU CHUẨN</p>
      <h1>ISOCAL</h1>
      <p>Quản lý khách hàng và các quy trình dịch vụ hiệu chuẩn trong một nơi.</p>
      <Link className="button button-primary home-cta" to="/internal/customers">
        Mở quản lý khách hàng
      </Link>
    </section>
  );
}

function LoginPage() {
  return (
    <section className="page-panel">
      <h2>Login</h2>
      <p>This is a placeholder for future authentication flows.</p>
    </section>
  );
}

function CustomerDashboardPage() {
  return (
    <section className="page-panel">
      <h2>Customer Dashboard</h2>
      <p>Placeholder for customer-facing workflows.</p>
    </section>
  );
}

function CustomerProfilePage() {
  return (
    <section className="page-panel">
      <h2>Customer Profile</h2>
      <p>Placeholder for customer account details.</p>
    </section>
  );
}

function InternalDashboardPage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">KHU VỰC NỘI BỘ</p>
      <h1>Xin chào!</h1>
      <p>Chọn chức năng để bắt đầu quản lý hoạt động của ISOCAL.</p>
      <Link className="button button-primary home-cta" to="/internal/customers">
        Đi đến quản lý khách hàng
      </Link>
    </section>
  );
}

function InternalSettingsPage() {
  return (
    <section className="page-panel">
      <h2>System Settings</h2>
      <p>Placeholder for configuration and administration pages.</p>
    </section>
  );
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
