import { Link, Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import AccountantLayout from '../layouts/AccountantLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import InternalLayout from '../layouts/InternalLayout.jsx';
import HeadOfTechLayout from '../layouts/HeadOfTechLayout.jsx';
import TechnicianLayout from '../layouts/TechnicianLayout.jsx';
import CustomerDashboardPage from '../features/dashboards/customer/CustomerDashboardPage.jsx';
import AccountantDashboardPage from '../features/dashboards/accountant/AccountantDashboardPage.jsx';
import AdminDashboardPage from '../features/dashboards/admin/AdminDashboardPage.jsx';
import SalesDashboardPage from '../features/dashboards/sales/SalesDashboardPage.jsx';
import WarehouseDashboardPage from '../features/dashboards/warehouse/WarehouseDashboardPage.jsx';
import SalesLayout from '../layouts/SalesLayout.jsx';
import WarehouseLayout from '../layouts/WarehouseLayout.jsx';
import HeadOfTechPage from '../features/operations/HeadOfTechPage.jsx';

import ReviewerWorkspaceProvider from '../features/reviewer/ReviewerWorkspaceProvider.jsx';
import ReviewerDashboardPage from '../features/reviewer/pages/dashboard/ReviewerDashboardPage.jsx';
import WorkOrdersPage from '../features/reviewer/features/work-orders/WorkOrdersPage.jsx';
import AssignmentsPage from '../features/reviewer/features/assignments/AssignmentsPage.jsx';
import ServiceTypesPage from '../features/reviewer/features/service-types/ServiceTypesPage.jsx';
import ProceduresPage from '../features/reviewer/features/procedures/ProceduresPage.jsx';
import StandardsPage from '../features/reviewer/features/standards/StandardsPage.jsx';
import ReviewQueuePage from '../features/reviewer/features/review-queue/ReviewQueuePage.jsx';
import DriftPage from '../features/reviewer/features/drift/DriftPage.jsx';
import CertificatesPage from '../features/reviewer/features/certificates/CertificatesPage.jsx';
import SealsPage from '../features/reviewer/features/seals/SealsPage.jsx';
import VerificationLogsPage from '../features/reviewer/features/verification-logs/VerificationLogsPage.jsx';
import SignaturesPage from '../features/reviewer/features/signatures/SignaturesPage.jsx';
import ChatPage from '../features/reviewer/features/chat/ChatPage.jsx';
import NotificationsPage from '../features/reviewer/features/notifications/NotificationsPage.jsx';
import WarehousePage from '../features/reviewer/features/warehouse/WarehousePage.jsx';
import TechnicianPage from '../features/operations/TechnicianPage.jsx';
import { useAppContext } from './providers.jsx';
import { getRoleDashboardPath } from './role-routing.js';
import RoleDashboardGate from './RoleDashboardGate.jsx';

// Auth pages
import { CustomerLoginPage } from '../features/auth/CustomerLoginPage.jsx';
import { StaffLoginPage } from '../features/auth/StaffLoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage.jsx';

const publicRoutes = [
  // Standalone auth pages — no wrapping layout, each manages its own shell
  { path: '/login', element: <CustomerLoginPage /> },
  { path: '/staff-login', element: <StaffLoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicLandingPage /> },
    ],
  },
];

const customerRoutes = [
  {
    path: '/internal/customer',
    element: <CustomerLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/customer">
            <CustomerDashboardPage />
          </RoleDashboardGate>
        ),
      },
    ],
  },
];

const accountantRoutes = [
  {
    path: '/internal/accountant',
    element: <AccountantLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/accountant">
            <AccountantDashboardPage />
          </RoleDashboardGate>
        ),
      },
    ],
  },
];

const adminRoutes = [
  {
    path: '/internal/admin',
    element: <AdminLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/admin">
            <AdminDashboardPage />
          </RoleDashboardGate>
        ),
      },
    ],
  },
];

const salesRoutes = [
  {
    path: '/internal/sales',
    element: <SalesLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/sales">
            <SalesDashboardPage />
          </RoleDashboardGate>
        ),
      },
    ],
  },
];

const warehouseRoutes = [
  {
    path: '/internal/warehouse',
    element: <WarehouseLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/warehouse">
            <WarehouseDashboardPage />
          </RoleDashboardGate>
        ),
      },
    ],
  },
];

const legacyRoutes = [
  { path: '/customer', element: <Navigate replace to="/internal/customer" /> },
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
      element: (
        <RoleDashboardGate dashboardPath="/internal/head-of-tech">
          <ReviewerWorkspaceProvider />
        </RoleDashboardGate>
      ),
      children: [
        { index: true, element: <ReviewerDashboardPage /> },
        { path: 'work-orders', element: <WorkOrdersPage /> },
        { path: 'assignments', element: <AssignmentsPage /> },
        { path: 'service-types', element: <ServiceTypesPage /> },
        { path: 'procedures', element: <ProceduresPage /> },
        { path: 'standards', element: <StandardsPage /> },
        { path: 'review-queue', element: <ReviewQueuePage /> },
        { path: 'drift', element: <DriftPage /> },
        { path: 'certificates', element: <CertificatesPage /> },
        { path: 'seals', element: <SealsPage /> },
        { path: 'verification-logs', element: <VerificationLogsPage /> },
        { path: 'signatures', element: <SignaturesPage /> },
        { path: 'chat', element: <ChatPage /> },
        { path: 'notifications', element: <NotificationsPage /> },
        { path: 'warehouse', element: <WarehousePage /> },
      ],
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
  ...legacyRoutes,
  ...customerRoutes,
  ...accountantRoutes,
  ...adminRoutes,
  ...salesRoutes,
  ...warehouseRoutes,
  ...internalRoutes,
  { path: '*', element: <Navigate to="/" replace /> },
]);

function PublicLandingPage() {
  const { session } = useAppContext();
  const destination = getRoleDashboardPath(session.user);
  // If logged in, go to dashboard; otherwise redirect to login page
  return destination ? <Navigate replace to={destination} /> : <Navigate replace to="/login" />;
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

// LoginPage removed — replaced by CustomerLoginPage at /login route

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
          <strong>Reviewer (Head of Tech)</strong>
          <span>Dashboard Reviewer: quản lý Work Order, quy trình, soát xét và vận hành phòng kỹ thuật.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/technician">
          <span className="shortcut-icon" aria-hidden="true">⌁</span>
          <strong>Công việc kỹ thuật viên</strong>
          <span>Thực hiện kiểm tra, nhập kết quả đo và trình hồ sơ soát xét.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/customer">
          <span className="shortcut-icon" aria-hidden="true">◎</span>
          <strong>Tổng quan khách hàng</strong>
          <span>Theo dõi thiết bị, đơn dịch vụ, báo giá, chứng nhận và công nợ.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/accountant">
          <span className="shortcut-icon" aria-hidden="true">₫</span>
          <strong>Tổng quan kế toán</strong>
          <span>Theo dõi doanh thu, hoá đơn, thanh toán và công nợ khách hàng.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/sales">
          <span className="shortcut-icon" aria-hidden="true">💼</span>
          <strong>Tổng quan kinh doanh (Sales)</strong>
          <span>Quản lý quan hệ khách hàng, lập báo giá, soạn thảo hợp đồng cam kết và tiếp nhận dịch vụ.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/warehouse">
          <span className="shortcut-icon" aria-hidden="true">▣</span>
          <strong>Tổng quan kho vận (Warehouse)</strong>
          <span>Tiếp nhận thiết bị In-lab, kiểm tra tình trạng vật lý ban đầu và xuất trả bàn giao.</span>
        </Link>
        <Link className="shortcut-card" to="/internal/admin">
          <span className="shortcut-icon" aria-hidden="true">⚙</span>
          <strong>Tổng quan quản trị</strong>
          <span>Tài khoản, vai trò, danh mục và tình trạng vận hành hệ thống.</span>
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
