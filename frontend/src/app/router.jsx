import { Link, Navigate, RouterProvider, createBrowserRouter, useLocation } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import InternalLayout from '../layouts/InternalLayout.jsx';
import HeadOfTechLayout from '../layouts/HeadOfTechLayout.jsx';
import TechnicianLayout from '../layouts/TechnicianLayout.jsx';
import HeadOfTechPage from '../features/operations/HeadOfTechPage.jsx';
import TechnicianPage from '../features/operations/TechnicianPage.jsx';
import { useAppContext } from './providers.jsx';
import { getRoleDashboardPath } from './role-routing.js';
import RoleDashboardGate from './RoleDashboardGate.jsx';

const publicRoutes = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicLandingPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
];

const customerRoutes = [
  {
    path: '/customer',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <RoleDashboardGate dashboardPath="/customer"><CustomerDashboardPage /></RoleDashboardGate> },
      { path: 'profile', element: <RoleDashboardGate dashboardPath="/customer"><CustomerProfilePage /></RoleDashboardGate> },
    ],
  },
];

const internalRoutes = [
  {
    path: '/internal',
    element: <InternalLayout />,
    children: [
      { index: true, element: <InternalDashboardLanding /> },
      { path: 'settings', element: <InternalSettingsPage /> },
    ],
  },
  {
    path: '/internal/head-of-tech',
    element: <HeadOfTechLayout />,
    children: [{
      index: true,
      element: (
        <RoleDashboardGate dashboardPath="/internal/head-of-tech">
          <HeadOfTechPage />
        </RoleDashboardGate>
      ),
    }],
  },
  {
    path: '/internal/technician',
    element: <TechnicianLayout />,
    children: [{
      index: true,
      element: (
        <RoleDashboardGate dashboardPath="/internal/technician">
          <TechnicianPage />
        </RoleDashboardGate>
      ),
    }],
  },
];

const router = createBrowserRouter([
  ...publicRoutes,
  ...customerRoutes,
  ...internalRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
]);

function PublicLandingPage() {
  const { session } = useAppContext();
  const destination = getRoleDashboardPath(session.user);
  return destination ? <Navigate replace to={destination} /> : <HomePage />;
}

function InternalDashboardLanding() {
  const { session } = useAppContext();
  const destination = getRoleDashboardPath(session.user);
  return destination && destination !== '/internal'
    ? <Navigate replace to={destination} />
    : <InternalDashboardPage />;
}

function HomePage() {
  return (
    <section className="page-panel">
      <p className="eyebrow">NỀN TẢNG QUẢN LÝ HIỆU CHUẨN</p>
      <h1>ISOCAL</h1>
      <p>Quản lý các quy trình dịch vụ hiệu chuẩn trong một nơi.</p>
    </section>
  );
}

function LoginPage() {
  const { session } = useAppContext();
  const location = useLocation();
  const destination = getRoleDashboardPath(session.user);
  if (destination) return <Navigate replace to={destination} />;

  return (
    <section className="page-panel">
      <p className="eyebrow">TRUY CẬP HỆ THỐNG</p>
      <h2>Đăng nhập ISOCAL</h2>
      <p>
        Luồng xác thực đang chờ tích hợp. Khi API đăng nhập trả về tài khoản kèm Role,
        gọi <code>startSession(account)</code> rồi điều hướng theo Role; dashboard sẽ được chọn tự động.
      </p>
      {location.state?.from?.pathname && (
        <p className="login-return-note">
          Sau khi đăng nhập, bạn sẽ quay lại khu vực phù hợp với quyền tài khoản.
        </p>
      )}
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
    <div className="internal-home">
      <section className="page-panel internal-welcome">
        <p className="eyebrow">KHU VỰC NỘI BỘ</p>
        <h1>Xin chào!</h1>
        <p>Chọn không gian làm việc để bắt đầu quản lý hoạt động hiệu chuẩn và kiểm định.</p>
      </section>
      <div className="internal-shortcuts">
        <Link className="shortcut-card" to="/internal/head-of-tech">
          <span className="shortcut-icon" aria-hidden="true">↗</span>
          <strong>Điều phối kỹ thuật</strong>
          <span>Phân công công việc, chuẩn đối chứng và lịch hẹn cho từng thiết bị.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/technician">
          <span className="shortcut-icon" aria-hidden="true">⌁</span>
          <strong>Công việc kỹ thuật viên</strong>
          <span>Thực hiện kiểm tra, nhập kết quả đo và trình hồ sơ soát xét.</span>
        </Link>
      </div>
      <p className="home-demo-note">Các màn hình nghiệp vụ hiện dùng dữ liệu mẫu, chưa kết nối backend.</p>
    </div>
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
