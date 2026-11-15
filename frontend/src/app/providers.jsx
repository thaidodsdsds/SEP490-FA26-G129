import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccountRole, getRoleDashboardPath } from './role-routing.js';
import SessionExpiredModal from '../components/auth/SessionExpiredModal.jsx';

const AppContext = createContext(null);

/**
 * Decode a JWT payload without verifying the signature.
 * Used only to restore UI session from localStorage on page load.
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Try to restore a user session from a stored JWT token.
 * Returns { user, expiredOnLoad }
 */
function restoreSessionFromStorage() {
  const token = localStorage.getItem('isocal_token');
  if (!token) return { user: null, expiredOnLoad: false };
  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.removeItem('isocal_token');
    return { user: null, expiredOnLoad: false };
  }
  // Check expiry
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    localStorage.removeItem('isocal_token');
    return { user: null, expiredOnLoad: true };
  }
  return { user: payload, expiredOnLoad: false };
}

export function AppProviders({ children }) {
  const [initialState] = useState(() => restoreSessionFromStorage());
  const [user, setUser] = useState(initialState.user);
  const [isSessionExpired, setIsSessionExpired] = useState(initialState.expiredOnLoad);

  useEffect(() => {
    const handleExpiredEvent = () => {
      setIsSessionExpired(true);
      setUser(null);
    };

    window.addEventListener('isocal:session-expired', handleExpiredEvent);
    return () => {
      window.removeEventListener('isocal:session-expired', handleExpiredEvent);
    };
  }, []);

  const startSession = (account) => {
    if (!account || typeof account !== 'object') {
      throw new Error('Không thể tạo phiên đăng nhập: thông tin tài khoản không hợp lệ.');
    }
    if (!getAccountRole(account)) {
      throw new Error('Không thể tạo phiên đăng nhập: tài khoản chưa có thông tin Role.');
    }
    const dashboardPath = getRoleDashboardPath(account);
    if (!dashboardPath) {
      throw new Error(`Chưa cấu hình dashboard cho Role "${getAccountRole(account)}".`);
    }
    setIsSessionExpired(false);
    setUser(account);
    return dashboardPath;
  };

  const endSession = () => {
    localStorage.removeItem('isocal_token');
    setUser(null);
    setIsSessionExpired(false);
  };

  const clearExpiredModal = () => {
    setIsSessionExpired(false);
  };

  const session = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user) && !isSessionExpired,
    isExpired: isSessionExpired,
    role: getAccountRole(user) || 'public',
  }), [user, isSessionExpired]);

  const value = useMemo(
    () => ({ session, startSession, endSession, clearExpiredModal }),
    [session],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <SessionExpiredModal
        isOpen={isSessionExpired}
        onConfirm={clearExpiredModal}
        user={user}
      />
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
