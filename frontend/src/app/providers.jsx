import { createContext, useContext, useMemo, useState } from 'react';
import { getAccountRole, getRoleDashboardPath } from './role-routing.js';

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
 * Returns the decoded account payload, or null if invalid/expired.
 */
function restoreSessionFromStorage() {
  const token = localStorage.getItem('isocal_token');
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  // Check expiry
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    localStorage.removeItem('isocal_token');
    return null;
  }
  return payload; // { id, email, role, customer_id }
}

export function AppProviders({ children }) {
  const [user, setUser] = useState(() => restoreSessionFromStorage());

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
    setUser(account);
    return dashboardPath;
  };

  const endSession = () => {
    localStorage.removeItem('isocal_token');
    setUser(null);
  };

  const session = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    role: getAccountRole(user) || 'public',
  }), [user]);
  const value = useMemo(() => ({ session, startSession, endSession }), [session]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);

