"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Role, Organization, getOrgById } from "@/data/mock-data";

interface AuthState {
  isLoggedIn: boolean;
  role: Role | null;
  orgId: string | null;
  userName: string | null;
}

interface AuthContextType extends AuthState {
  organization: Organization | undefined;
  login: (role: Role, orgId: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_NAMES: Record<Role, string> = {
  super_admin: "Sarah Chen",
  lab_manager: "Dr. James Rivera",
  lab_employee: "Lab Staff",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    isLoggedIn: false,
    role: null,
    orgId: null,
    userName: null,
  });

  const login = useCallback((role: Role, orgId: string | null) => {
    setAuth({
      isLoggedIn: true,
      role,
      orgId,
      userName: USER_NAMES[role],
    });
  }, []);

  const logout = useCallback(() => {
    setAuth({ isLoggedIn: false, role: null, orgId: null, userName: null });
  }, []);

  const organization = auth.orgId ? getOrgById(auth.orgId) : undefined;

  return (
    <AuthContext.Provider value={{ ...auth, organization, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
