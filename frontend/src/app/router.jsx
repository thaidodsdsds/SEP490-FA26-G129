import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import CustomerLayout from '../layouts/CustomerLayout.jsx';
import AccountantLayout from '../layouts/AccountantLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import HeadOfTechLayout from '../layouts/HeadOfTechLayout.jsx';
import TechnicianLayout from '../layouts/TechnicianLayout.jsx';
import CustomerDashboardPage from '../features/dashboards/customer/CustomerDashboardPage.jsx';
import AccountantDashboardPage from '../features/dashboards/accountant/AccountantDashboardPage.jsx';
import AdminDashboardPage from '../features/dashboards/admin/AdminDashboardPage.jsx';
import SalesDashboardPage from '../features/dashboards/sales/SalesDashboardPage.jsx';
import ServiceRequestCreatePage from '../features/sales/service-requests/ServiceRequestCreatePage.jsx';
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
import ProfilePage from '../features/profile/ProfilePage.jsx';

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
      { path: 'profile', element: <ProfilePage /> },
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
      { path: 'profile', element: <ProfilePage /> },
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
      { path: 'profile', element: <ProfilePage /> },
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
      { path: 'service-requests/new', element: <ServiceRequestCreatePage /> },
      { path: 'profile', element: <ProfilePage /> },
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
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
];

const legacyRoutes = [
  { path: '/customer', element: <Navigate replace to="/internal/customer" /> },
];

const internalRoutes = [
  {
    path: '/internal',
    element: <InternalDashboardLanding />,
  },
  {
    path: '/internal/head-of-tech',
    element: <HeadOfTechLayout />,
    children: [
      {
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
      },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  {
    path: '/internal/technician',
    element: <TechnicianLayout />,
    children: [
      {
        index: true,
        element: (
          <RoleDashboardGate dashboardPath="/internal/technician">
            <TechnicianPage />
          </RoleDashboardGate>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
    ],
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
  const dashboardPath = destination && destination !== '/internal' ? destination : '/login';
  return <Navigate replace to={dashboardPath} />;
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

export function AppRouter() {
  return <RouterProvider router={router} />;
}
