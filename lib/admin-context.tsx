"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminContextValue = {
  adminName: string;
  setAdminName: (name: string) => void;
  signOut: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({
  initialName,
  onSignOut,
  children,
}: {
  initialName: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const [adminName, setAdminNameState] = useState(initialName);

  const setAdminName = useCallback((name: string) => {
    setAdminNameState(name);
  }, []);

  const value = useMemo(
    () => ({ adminName, setAdminName, signOut: onSignOut }),
    [adminName, setAdminName, onSignOut],
  );

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return ctx;
}
