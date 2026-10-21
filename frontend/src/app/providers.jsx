import { createContext, useContext, useMemo, useState } from 'react';
import { getAccountRole, getRoleDashboardPath } from './role-routing.js';

const AppContext = createContext(null);

export function AppProviders({ children }) {
  const [user, setUser] = useState(null);

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

  const endSession = () => setUser(null);
  const session = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    role: getAccountRole(user) || 'public',
  }), [user]);
  const value = useMemo(() => ({ session, startSession, endSession }), [session]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);
