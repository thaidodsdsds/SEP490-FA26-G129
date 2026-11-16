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
  const storedUserRaw = localStorage.getItem('isocal_user');
  let storedUser = null;
  if (storedUserRaw) {
    try {
      storedUser = JSON.parse(storedUserRaw);
    } catch {
      storedUser = null;
    }
  }

  if (!token) {
    // Support offline mobile technician session where user authenticated in offline mode
    if (storedUser && typeof window !== 'undefined' && window.location.pathname.startsWith('/mobile')) {
      return { user: storedUser, expiredOnLoad: false };
    }
    return { user: null, expiredOnLoad: false };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    localStorage.removeItem('isocal_token');
    return { user: storedUser || null, expiredOnLoad: false };
  }
  // Check expiry
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    // On mobile offline app, keep user session alive for offline field work
    if (storedUser && typeof window !== 'undefined' && window.location.pathname.startsWith('/mobile')) {
      return { user: { ...payload, ...storedUser }, expiredOnLoad: false };
    }
    localStorage.removeItem('isocal_token');
    localStorage.removeItem('isocal_user');
    return { user: null, expiredOnLoad: true };
  }

  const fullUser = storedUser ? { ...payload, ...storedUser } : payload;
  return { user: fullUser, expiredOnLoad: false };
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
    try {
      localStorage.setItem('isocal_user', JSON.stringify(account));
    } catch {
      // ignore
    }
    return dashboardPath;
  };

  const endSession = () => {
    localStorage.removeItem('isocal_token');
    localStorage.removeItem('isocal_user');
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
