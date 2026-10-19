import { createContext, useContext, useMemo, useState } from 'react';

const AppContext = createContext(null);

export function AppProviders({ children }) {
  const [session] = useState({
    user: null,
    isAuthenticated: false,
    role: 'public',
  });

  const value = useMemo(() => ({ session }), [session]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useAppContext = () => useContext(AppContext);
