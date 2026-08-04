import { createContext, useContext, type ReactNode } from "react";
import { trpc } from "../lib/trpc";

interface AdminSession {
  id: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  admin: AdminSession | null | undefined;
  isLoading: boolean;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = trpc.auth.me.useQuery();

  return (
    <AuthContext.Provider value={{ admin: data, isLoading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
