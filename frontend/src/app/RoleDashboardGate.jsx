import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from './providers.jsx';
import { getRoleDashboardPath } from './role-routing.js';

function RoleDashboardGate({ dashboardPath, children }) {
  const { session } = useAppContext();
  const location = useLocation();

  if (!session.isAuthenticated) return children;

  const landingPath = getRoleDashboardPath(session.user);
  if (landingPath === dashboardPath) return children;

  return <Navigate replace state={{ from: location }} to={landingPath || '/internal'} />;
}

export default RoleDashboardGate;
