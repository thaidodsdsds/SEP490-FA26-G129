import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from './providers.jsx';
import { getRoleDashboardPath } from './role-routing.js';

function RoleDashboardGate({ dashboardPath, children }) {
  const { session } = useAppContext();
  const location = useLocation();
  const content = children ?? <Outlet />;

  if (!session.isAuthenticated) return content;

  const landingPath = getRoleDashboardPath(session.user);
  if (landingPath === dashboardPath) return content;

  return <Navigate replace state={{ from: location }} to={landingPath || '/internal'} />;
}

export default RoleDashboardGate;
