"use client";

import { useSession, signOut } from "next-auth/react";
import { createContext, useContext, ReactNode } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  role: string | null;
  orgId: string | null;
  userName: string | null;
  userId: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const isLoggedIn = status === "authenticated" && !!session?.user;
  const user = session?.user as { id: string; name?: string | null; role: string; orgId: string | null } | undefined;

  const logout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        role: user?.role ?? null,
        orgId: user?.orgId ?? null,
        userName: user?.name ?? null,
        userId: user?.id ?? null,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getRoleName(role: string): string {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "lab_manager": return "Lab Manager";
    case "lab_employee": return "Lab Employee";
    default: return role;
  }
}
