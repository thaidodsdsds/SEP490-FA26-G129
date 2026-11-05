import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '../../app/providers.jsx';
import { getAccountRole, isCustomerAccount } from '../../app/role-routing.js';
import AuthRequiredState from './AuthRequiredState.jsx';
import AccessDeniedState from './AccessDeniedState.jsx';

const normalizeRole = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function ProtectedRoute({ allowedRoles = [], portalType = 'auto', children }) {
  const { session, endSession } = useAppContext();
  const location = useLocation();

  // 1. Kiểm tra trạng thái đăng nhập
  if (!session.isAuthenticated || !session.user) {
    const hint =
      portalType !== 'auto'
        ? portalType
        : location.pathname.includes('/internal/customer')
          ? 'customer'
          : 'staff';

    return (
      <AuthRequiredState
        portalHint={hint}
        targetPath={location.pathname + location.search}
      />
    );
  }

  // 2. Kiểm tra phân quyền vai trò (Role-based access control)
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const rawRole = getAccountRole(session.user);
    const userRole = normalizeRole(rawRole);
    const isCustomer = isCustomerAccount(session.user);

    const isAuthorized = allowedRoles.some((allowed) => {
      const targetRole = normalizeRole(allowed);
      if (targetRole === 'customer') {
        return isCustomer;
      }
      if (targetRole === 'admin' && (userRole === 'admin' || userRole.includes('quantri'))) {
        return true;
      }
      if (userRole === 'admin' || userRole.includes('quantri')) {
        // Quản trị viên có quyền truy cập các phân hệ nội bộ nhân viên
        return targetRole !== 'customer';
      }
      return userRole === targetRole || userRole.includes(targetRole);
    });

    if (!isAuthorized) {
      return (
        <AccessDeniedState
          allowedRoles={allowedRoles}
          onLogout={() => {
            endSession();
            window.location.href = isCustomer ? '/login' : '/staff-login';
          }}
          targetPath={location.pathname}
          user={session.user}
          userRole={session.role || rawRole}
        />
      );
    }
  }

  return children ?? <Outlet />;
}

export default ProtectedRoute;

